"""Stage 5 — Brettkontext: derselbe Zellen-Trunk, plus eine Korrektur ueber die 8x8-Nachbarschaft.

Billig, weil der Trunk 64x laeuft und der Kopf EINMAL je Brett: gemessen 29,5 MMAC gegen die
427,5 des Trunks, also +6,9 %.
"""

from __future__ import annotations

import torch
import torch.nn as nn
from torch.nn.attention import SDPBackend, sdpa_kernel

from .model import batchnorm2d

#: Zellreihenfolge `a1,b1,..,h1,a2,..,h8` — `geometry/Crops.kt:allSquares`, NICHT die Eckenordnung.
BOARD_SIDE = 8
CELLS = BOARD_SIDE * BOARD_SIDE
_FILES = "abcdefgh"


def square_index(square: str) -> int:
    """`a1` -> 0, `h1` -> 7, `a2` -> 8, `h8` -> 63."""
    return (int(square[1]) - 1) * BOARD_SIDE + _FILES.index(square[0])


class BoardHead(nn.Module):
    """Korrektur je Zelle aus 5x5 Nachbarfeldern; der 1x1 vorne drosselt 1 280 auf 128 Kanaele
    und die dichten 3x3 damit von 94 auf 29 MMAC je Brett. Der letzte 1x1 ist NULL-initialisiert,
    gibt frisch gebaut also exakt 0 zurueck — ein Warmstart aus `best-mix-s42` verliert nichts.
    """

    def __init__(self, feat: int, out_width: int, width: int = 128, layers: int = 2) -> None:
        super().__init__()
        body: list[nn.Module] = [nn.Conv2d(feat, width, 1, bias=False),
                                 batchnorm2d(width), nn.ReLU(inplace=True)]
        for _ in range(layers):
            body += [nn.Conv2d(width, width, 3, padding=1, bias=False),
                     batchnorm2d(width), nn.ReLU(inplace=True)]
        self.body = nn.Sequential(*body)
        self.out = nn.Conv2d(width, out_width, 1)
        nn.init.zeros_(self.out.weight)
        nn.init.zeros_(self.out.bias)

    def forward(self, tokens: torch.Tensor) -> torch.Tensor:
        b = tokens.shape[0]
        grid = tokens.transpose(1, 2).reshape(b, -1, BOARD_SIDE, BOARD_SIDE)
        return self.out(self.body(grid)).flatten(2).transpose(1, 2)


class BoardAttentionHead(nn.Module):
    """Selbstaufmerksamkeit ueber die 64 Zellen: zwei 3x3 reichen 5x5 Felder weit, hier sieht
    jede Zelle alle 64. OHNE Positionskodierung — absolute Feldkennung ist die Abkuerzung, die
    bei 80 px 0,16 gekostet hat; sie kommt als eigener Arm. Ausgang null-initialisiert.
    """

    def __init__(self, feat: int, out_width: int, width: int = 128, layers: int = 2,
                 heads: int = 4, mlp_ratio: int = 2) -> None:
        super().__init__()
        self.proj = nn.Linear(feat, width)
        self.blocks = nn.ModuleList()
        for _ in range(layers):
            self.blocks.append(nn.ModuleDict({
                "n1": nn.LayerNorm(width),
                "attn": nn.MultiheadAttention(width, heads, batch_first=True),
                "n2": nn.LayerNorm(width),
                "mlp": nn.Sequential(nn.Linear(width, width * mlp_ratio), nn.GELU(),
                                     nn.Linear(width * mlp_ratio, width)),
            }))
        self.out = nn.Linear(width, out_width)
        nn.init.zeros_(self.out.weight)
        nn.init.zeros_(self.out.bias)

    def forward(self, tokens: torch.Tensor) -> torch.Tensor:
        # MATH statt der schnellen SDPA-Kerne: auf torch 2.13.0+rocm10.0.0 vergiftet
        # `nn.MultiheadAttention` sonst den HIP-Kontext, und der naechste Kernelstart stirbt mit
        # `hipErrorInvalidValue` — asynchron, also irgendwo hinter der Aufmerksamkeit. 64 Token
        # zu 128 Kanaelen sind zu klein, als dass der Referenzpfad hier etwas kosten wuerde.
        with sdpa_kernel([SDPBackend.MATH]):
            x = self.proj(tokens)
            for b in self.blocks:
                h = b["n1"](x)
                x = x + b["attn"](h, h, h, need_weights=False)[0]
                x = x + b["mlp"](b["n2"](x))
            return self.out(x)


class BoardNet(nn.Module):
    """Trunk je Zelle + Brettkorrektur. Eingang `(B, 64, C, H, W)`, Ausgang `(B*64, out_width)`.

    Der flache Ausgang ist Absicht: `OcclusionLoss`, die Metriken und der Export sehen genau die
    Form, die das Per-Zell-Modell liefert, und `Observations.kt` braucht nur ein Umsortieren.
    """

    def __init__(self, trunk: nn.Module, feat: int, out_width: int,
                 board_width: int = 128, board_layers: int = 2, attention: bool = False) -> None:
        super().__init__()
        self.trunk = trunk
        self.cell_head = nn.Linear(feat, out_width)
        head = BoardAttentionHead if attention else BoardHead
        self.board = head(feat, out_width, board_width, board_layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if x.dim() != 5 or x.shape[1] != CELLS:
            raise ValueError(f"BoardNet erwartet (B, {CELLS}, C, H, W), bekam {tuple(x.shape)}")
        b = x.shape[0]
        feat = self.trunk(x.flatten(0, 1))
        tokens = feat.view(b, CELLS, -1)
        return self.cell_head(feat) + self.board(tokens).reshape(b * CELLS, -1)


def build_trunk(backbone: str, in_chans: int = 3, pretrained: bool = False) -> tuple[nn.Module, int]:
    """Ein Backbone OHNE Klassifikator plus seine Merkmalsbreite."""
    from .model import (
        CELLNET_PRESETS,
        CellNet,
        SmallCNN,
        _convert_bn_to_primitive,
        _create_timm_model,
    )

    if backbone in CELLNET_PRESETS:
        widths, patch = CELLNET_PRESETS[backbone]
        return CellNet(widths, patch, 0, in_chans=in_chans), widths[-1]
    if backbone == "smallcnn":
        m = SmallCNN(1, in_channels=in_chans)
        feat = m.head.in_features
        m.head = nn.Identity()
        return m, feat
    if backbone == "mobilenet_v3_small":
        from torchvision import models

        from .model import _retune_stem

        weights = models.MobileNet_V3_Small_Weights.IMAGENET1K_V1 if pretrained else None
        m = models.mobilenet_v3_small(weights=weights)
        _retune_stem(m, in_chans)
        feat = m.classifier[-1].in_features
        m.classifier[-1] = nn.Identity()
        return _convert_bn_to_primitive(m), feat
    m = _create_timm_model(backbone, pretrained=pretrained, num_classes=0, in_chans=in_chans)
    # Breite aus einem Trockenlauf, nicht aus `num_features`: timm meldet dort die Breite VOR
    # `conv_head`, geliefert werden aber dessen 1 280 Kanaele.
    was_training = m.training
    m.eval()
    with torch.no_grad():
        feat = m(torch.zeros(1, in_chans, 64, 64)).shape[1]
    m.train(was_training)
    return _convert_bn_to_primitive(m), feat
