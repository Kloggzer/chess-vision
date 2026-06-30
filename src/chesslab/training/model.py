"""Stufe 5 — Modell. Zwei wählbare Backbones, gleicher 13-Klassen-Kopf."""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


def _gn_groups(channels: int) -> int:
    """Größte Gruppenzahl <= 8, die `channels` teilt (GroupNorm braucht einen Teiler)."""
    g = min(8, channels)
    while g > 1 and channels % g:
        g -= 1
    return g


def _norm_layer(norm: str, channels: int) -> nn.Module:
    """Normalisierungs-Layer. groupnorm umgeht den MIOpen/HIPRTC-BatchNorm-Bug auf ROCm-Windows."""
    if norm == "groupnorm":
        return nn.GroupNorm(num_groups=_gn_groups(channels), num_channels=channels)
    if norm == "none":
        return nn.Identity()
    return nn.BatchNorm2d(channels)


def _convert_bn_to_gn(module: nn.Module) -> nn.Module:
    """Alle BatchNorm2d (z.B. in torchvision-Backbones) durch GroupNorm ersetzen — sonst crasht
    MIOpen auf ROCm-Windows (`miopenStatusUnknownError`). Pretrained-Gewichte des Rumpfs bleiben,
    nur die Norm-Statistik wird neu (GN hat keine running stats)."""
    for name, child in module.named_children():
        if isinstance(child, nn.BatchNorm2d):
            setattr(module, name, nn.GroupNorm(_gn_groups(child.num_features), child.num_features))
        else:
            _convert_bn_to_gn(child)
    return module


class SmallCNN(nn.Module):
    """Kompaktes Conv-Netz: 4 Conv-Blöcke (Norm+ReLU+MaxPool), GlobalAvgPool, Linear -> classes."""

    def __init__(self, num_classes: int, in_channels: int = 3, norm: str = "batchnorm") -> None:
        super().__init__()
        chans = [32, 64, 128, 256]
        layers: list[nn.Module] = []
        c_in = in_channels
        for c_out in chans:
            layers += [
                nn.Conv2d(c_in, c_out, 3, padding=1, bias=False),
                _norm_layer(norm, c_out),
                nn.ReLU(inplace=True),
                nn.MaxPool2d(2),
            ]
            c_in = c_out
        self.features = nn.Sequential(*layers)
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.head = nn.Linear(chans[-1], num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = self.pool(x).flatten(1)
        return self.head(x)


_TYPE_ORDER = ("empty", "occluded", "P", "N", "B", "R", "Q", "K")


class FactoredHead(nn.Module):
    """Entkoppelter Kopf: Typ-Kopf (8: empty/occluded/P/N/B/R/Q/K) + Farb-Kopf (2: w/b), additiv zu
    den 14 kombinierten Klassen-Logits (`logit_wP = typ[P] + farbe[w]`; empty/occluded ohne Farbterm).

    Vorteil: `typ[P]` teilt sich über weiße UND schwarze Bauern -> der Typ-Kopf sieht je Typ doppelt
    so viele Beispiele (Pooling). Ausgabe sind GANZ NORMALE 14-Klassen-Logits in `classes`-Reihenfolge,
    daher bleibt alles Nachgelagerte (Loss/Board-Acc/Eval/Inferenz) unverändert.
    """

    def __init__(self, feat_dim: int, classes: list[str]) -> None:
        super().__init__()
        self.type_head = nn.Linear(feat_dim, len(_TYPE_ORDER))
        self.color_head = nn.Linear(feat_dim, 2)
        t_idx, c_idx = [], []
        for cls in classes:
            if cls in ("empty", "occluded"):
                t_idx.append(_TYPE_ORDER.index(cls))
                c_idx.append(-1)
            else:
                t_idx.append(_TYPE_ORDER.index(cls[1]))   # 'wP'->'P'
                c_idx.append(0 if cls[0] == "w" else 1)
        self.register_buffer("t_idx", torch.tensor(t_idx, dtype=torch.long))
        self.register_buffer("c_idx", torch.tensor(c_idx, dtype=torch.long))
        self.register_buffer("c_mask", (self.c_idx >= 0).float())

    def forward(self, feat: torch.Tensor) -> torch.Tensor:
        tl = self.type_head(feat)                                  # [B, 8]
        cl = self.color_head(feat)                                 # [B, 2]
        out = tl.index_select(1, self.t_idx)                       # [B, 14] Typ-Logit je Klasse
        color_term = cl.index_select(1, self.c_idx.clamp(min=0))   # [B, 14]
        return out + color_term * self.c_mask                      # Farbe nur für echte Figuren


class HierarchicalHead(nn.Module):
    """Zweistufiger Kopf (Occupancy→Piece): ein Occupancy-Kopf (2: leer/besetzt) + ein Figuren-Kopf
    (13: die besetzten Klassen, d.h. alle außer `empty`, inkl. `occluded`). Die Ausgabe sind
    **rekonstruierte Log-Wahrscheinlichkeiten** über die 14 `classes` in genau ihrer Reihenfolge:

        out[empty]    = log P(empty)                          = log_softmax(occ)[leer]
        out[piece c]  = log P(besetzt) + log P(c | besetzt)   = log_softmax(occ)[besetzt]
                                                                 + log_softmax(piece)[c]

    Damit gilt `exp(out)` summiert je Zeile zu 1, `softmax(out)=P` (Inferenz unverändert) und
    `CrossEntropyLoss(out, y)` ist exakt die zweistufige Joint-NLL: für `empty`-Ziele hängt der Loss
    nur am Occupancy-Kopf, für besetzte Ziele an beiden — der Figuren-Kopf bekommt also **nur auf
    besetzten Feldern Gradient** (das chesscog-Prinzip), ganz ohne Sonderfall im Trainingsloop.
    """

    def __init__(self, feat_dim: int, classes: list[str]) -> None:
        super().__init__()
        piece_classes = [c for c in classes if c != "empty"]   # 13 besetzte Klassen, Reihenfolge wie classes
        self.occ_head = nn.Linear(feat_dim, 2)                  # [B, 2] leer / besetzt
        self.piece_head = nn.Linear(feat_dim, len(piece_classes))  # [B, 13]
        occ_idx, piece_idx, occ_mask = [], [], []
        for c in classes:
            if c == "empty":
                occ_idx.append(0); piece_idx.append(0); occ_mask.append(0.0)
            else:
                occ_idx.append(1); piece_idx.append(piece_classes.index(c)); occ_mask.append(1.0)
        self.register_buffer("occ_idx", torch.tensor(occ_idx, dtype=torch.long))      # [14] -> {0,1}
        self.register_buffer("piece_idx", torch.tensor(piece_idx, dtype=torch.long))  # [14] -> 0..12
        self.register_buffer("occ_mask", torch.tensor(occ_mask, dtype=torch.float32)) # [14] 0 für empty

    def forward(self, feat: torch.Tensor) -> torch.Tensor:
        occ = F.log_softmax(self.occ_head(feat), dim=1)            # [B, 2]
        pc = F.log_softmax(self.piece_head(feat), dim=1)           # [B, 13]
        occ_term = occ.index_select(1, self.occ_idx)               # [B, 14] log P(leer/besetzt)
        piece_term = pc.index_select(1, self.piece_idx)            # [B, 14] log P(c | besetzt)
        return occ_term + piece_term * self.occ_mask               # [B, 14] Log-Probs


class DecoupledModel(nn.Module):
    """Backbone als Feature-Extraktor + entkoppelter Kopf (`FactoredHead` Typ×Farbe oder
    `HierarchicalHead` Occupancy→Piece). Gibt in jedem Fall 14 Werte pro Feld aus (Logits bzw.
    Log-Probs), sodass alles Nachgelagerte (Loss/Board-Acc/Eval/Inferenz) unverändert bleibt."""

    def __init__(self, backbone: str, classes: list[str], pretrained: bool, norm: str,
                 head: str = "factored") -> None:
        super().__init__()
        if backbone == "smallcnn":
            base = SmallCNN(len(classes), norm=norm)
            self.features, self.pool, self._mobile = base.features, base.pool, None
            feat_dim = 256
        elif backbone == "mobilenet_v3_small":
            from torchvision import models

            weights = models.MobileNet_V3_Small_Weights.IMAGENET1K_V1 if pretrained else None
            m = models.mobilenet_v3_small(weights=weights)
            feat_dim = m.classifier[-1].in_features
            m.classifier[-1] = nn.Identity()           # Modell gibt jetzt Features aus
            if norm == "groupnorm":
                _convert_bn_to_gn(m)
            self._mobile, self.features, self.pool = m, None, None
        else:
            raise ValueError(f"unbekanntes backbone {backbone!r} (smallcnn | mobilenet_v3_small).")
        self.head = HierarchicalHead(feat_dim, classes) if head == "twostage" else FactoredHead(feat_dim, classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        feat = self._mobile(x) if self._mobile is not None else self.pool(self.features(x)).flatten(1)
        return self.head(feat)


def build_model(backbone: str, num_classes: int, pretrained: bool = False,
                norm: str = "batchnorm", head: str = "combined",
                classes: list[str] | None = None) -> nn.Module:
    """`head="combined"`: ein 14-Klassen-Linear-Kopf. `head="factored"`: entkoppelter Typ+Farbe-Kopf.
    `head="twostage"`: zweistufiger Occupancy→Piece-Kopf (`HierarchicalHead`). `factored`/`twostage`
    brauchen die `classes`-Liste für das Index-Mapping."""
    if head in ("factored", "twostage"):
        from .. import config

        return DecoupledModel(backbone, classes or config.CLASSES, pretrained, norm, head=head)
    if head != "combined":
        raise ValueError(f"unbekannter head {head!r} (combined | factored | twostage).")
    if backbone == "smallcnn":
        return SmallCNN(num_classes, norm=norm)
    if backbone == "mobilenet_v3_small":
        from torchvision import models

        weights = models.MobileNet_V3_Small_Weights.IMAGENET1K_V1 if pretrained else None
        m = models.mobilenet_v3_small(weights=weights)
        in_f = m.classifier[-1].in_features
        m.classifier[-1] = nn.Linear(in_f, num_classes)
        if norm == "groupnorm":     # ROCm-Windows: MobileNet-BatchNorm -> GroupNorm, sonst MIOpen-Crash
            _convert_bn_to_gn(m)
        return m
    raise ValueError(f"unbekanntes backbone {backbone!r} (smallcnn | mobilenet_v3_small).")
