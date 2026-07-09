"""Stage 5 — Model. Two selectable backbones, same 13-class head."""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F

_TIMM_BACKBONE_ALIASES = {
    # Common shorthand for the 0.35-width MobileNetV4 small variant in timm.
    "mobilenetv4_conv_small_03": "mobilenetv4_conv_small_035",
}


def _gn_groups(channels: int) -> int:
    """Größte Gruppenzahl <= 8, die `channels` teilt (GroupNorm braucht einen Teiler)."""
    g = min(8, channels)
    while g > 1 and channels % g:
        g -= 1
    return g


def _norm_layer(norm: str, channels: int) -> nn.Module:
    """Normalization layer. groupnorm works around the MIOpen/HIPRTC batch-norm bug on ROCm-Windows."""
    if norm == "groupnorm":
        return nn.GroupNorm(num_groups=_gn_groups(channels), num_channels=channels)
    if norm == "none":
        return nn.Identity()
    return nn.BatchNorm2d(channels)


def _convert_bn_to_gn(module: nn.Module) -> nn.Module:
    """Replace all BatchNorm2d (e.g. in torchvision backbones) with GroupNorm — otherwise MIOpen
    crashes on ROCm-Windows (`miopenStatusUnknownError`). Pretrained weights of the body remain,
    only the norm statistics are new (GN has no running stats)."""
    for name, child in module.named_children():
        if isinstance(child, nn.BatchNorm2d):
            setattr(module, name, nn.GroupNorm(_gn_groups(child.num_features), child.num_features))
        else:
            _convert_bn_to_gn(child)
    return module


def _resolve_timm_backbone(backbone: str) -> str:
    return _TIMM_BACKBONE_ALIASES.get(backbone, backbone)


def _timm_feature_dim(model: nn.Module) -> int:
    """Infer the real flattened feature width returned by a timm model.

    Some timm MobileNetV4 variants report ``num_features`` before the conv head
    (e.g. 960) while ``num_classes=0`` returns post-head features (e.g. 1280).
    The head must match the actual forward output, so probe it once on CPU.
    """
    was_training = model.training
    model.eval()
    with torch.no_grad():
        feat = model(torch.zeros(1, 3, 128, 128))
    if was_training:
        model.train()
    return int(feat.flatten(1).shape[1])


def _create_timm_model(backbone: str, pretrained: bool, num_classes: int) -> nn.Module:
    import timm

    resolved = _resolve_timm_backbone(backbone)
    if resolved != backbone:
        print(f"[INFO] Backbone alias '{backbone}' -> '{resolved}'.")
    return timm.create_model(resolved, pretrained=pretrained, num_classes=num_classes)


class SmallCNN(nn.Module):
    """Compact conv net: 4 conv blocks (norm+ReLU+MaxPool), global avg pool, linear -> classes."""

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
    """Decoupled head: type head (8: empty/occluded/P/N/B/R/Q/K) + color head (2: w/b), additive to
    the 14 combined class logits (`logit_wP = type[P] + color[w]`; empty/occluded without color term).

    Advantage: `type[P]` is shared across white AND black pawns -> the type head sees twice
    as many examples per type (pooling). Output is COMPLETELY NORMAL 14-class logits in `classes` order,
    therefore everything downstream (loss/board-acc/eval/inference) remains unchanged.
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
    """Two-stage head (occupancy→piece): an occupancy head (2: empty/occupied) + a piece head
    (13: the occupied classes, i.e. all except `empty`, incl. `occluded`). The output is
    **reconstructed log probabilities** over the 14 `classes` in exactly their order:

        out[empty]    = log P(empty)                          = log_softmax(occ)[empty]
        out[piece c]  = log P(occupied) + log P(c | occupied)  = log_softmax(occ)[occupied]
                                                                 + log_softmax(piece)[c]

    Thus `exp(out)` sums to 1 per row, `softmax(out)=P` (inference unchanged) and
    `CrossEntropyLoss(out, y)` is exactly the two-stage joint NLL: for `empty` targets the loss
    only depends on the occupancy head, for occupied targets on both — the piece head therefore
    receives gradient **only on occupied squares** (the chesscog principle), without any special
    case in the training loop.
    """

    def __init__(self, feat_dim: int, classes: list[str]) -> None:
        super().__init__()
        piece_classes = [c for c in classes if c != "empty"]   # 13 occupied classes, order as classes
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
    """Backbone as feature extractor + decoupled head (`FactoredHead` type×color or
    `HierarchicalHead` occupancy→piece). Outputs 14 values per square in any case (logits or
    log-probs), so everything downstream (loss/board-acc/eval/inference) remains unchanged."""

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
            # Dynamisches Laden von JEDEM MobileNet aus timm
            try:
                print(f"[INFO] Versuche Backbone '{backbone}' über timm zu laden...")

                # Erstellt das Modell ohne den finalen Klassifikations-Head
                m = _create_timm_model(backbone, pretrained=pretrained, num_classes=0)

                # Liest die Feature-Dimension automatisch aus
                feat_dim = _timm_feature_dim(m)

                if norm == "groupnorm":
                    _convert_bn_to_gn(m)

                self._mobile, self.features, self.pool = m, None, None
            except Exception as e:
                raise ValueError(
                    f"unknown backbone {backbone!r}. "
                    f"Es ist weder intern registriert noch über timm ladbar. Fehler: {e}"
                )
                
        self.head = HierarchicalHead(feat_dim, classes) if head == "twostage" else FactoredHead(feat_dim, classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        feat = self._mobile(x) if self._mobile is not None else self.pool(self.features(x)).flatten(1)
        return self.head(feat)


def build_model(backbone: str, num_classes: int, pretrained: bool = False,
                norm: str = "batchnorm", head: str = "combined",
                classes: list[str] | None = None) -> nn.Module:
    """`head="combined"`: a 14-class linear head. `head="factored"`: decoupled type+color head.
    `head="twostage"`: two-stage occupancy→piece head (`HierarchicalHead`). `factored`/`twostage`
    need the `classes` list for the index mapping."""
    if head in ("factored", "twostage"):
        from .. import config

        return DecoupledModel(backbone, classes or config.CLASSES, pretrained, norm, head=head)
    if head != "combined":
        raise ValueError(f"unknown head {head!r} (combined | factored | twostage).")
    if backbone == "smallcnn":
        return SmallCNN(num_classes, norm=norm)
    if backbone == "mobilenet_v3_small":
        from torchvision import models

        weights = models.MobileNet_V3_Small_Weights.IMAGENET1K_V1 if pretrained else None
        m = models.mobilenet_v3_small(weights=weights)
        in_f = m.classifier[-1].in_features
        m.classifier[-1] = nn.Linear(in_f, num_classes)
        if norm == "groupnorm":     # ROCm-Windows: MobileNet batch-norm -> groupnorm, otherwise MIOpen crash
            _convert_bn_to_gn(m)
        return m
    try:
        print(f"[INFO] Versuche Backbone '{backbone}' über timm zu laden...")
        m = _create_timm_model(backbone, pretrained=pretrained, num_classes=num_classes)
        if norm == "groupnorm":
            _convert_bn_to_gn(m)
        return m
    except Exception as e:
        raise ValueError(
            f"unknown backbone {backbone!r}. "
            f"Es ist weder intern registriert noch über timm ladbar. Fehler: {e}"
        )
