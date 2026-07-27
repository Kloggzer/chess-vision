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


class PrimitiveBatchNorm2d(nn.BatchNorm2d):
    """BatchNorm2d computed from primitives, so MIOpen's broken training kernel is never reached.

    ROCm-Windows cannot compile `MIOpenBatchNormFwdTrainSpatial` — the wheel ships no C++ standard
    library headers for HIPRTC, so any fresh compile of it dies with `miopenStatusUnknownError`.
    The project's answer used to be GroupNorm, which works but costs dearly at inference: GroupNorm
    normalises per SAMPLE, so it cannot be folded into the preceding convolution and exports as a
    46-node `InstanceNormalization` decomposition. Measured on the real graph: 573 nodes and
    30.6 ms per 64 crops against 124 nodes and 6.5 ms once the norms fold — **4.7x**.

    Deriving the same arithmetic from `var_mean` and friends sidesteps that one kernel and nothing
    else. It SUBCLASSES `nn.BatchNorm2d` on purpose: parameters, buffers and the state dict stay
    byte-identical to the stock module, which is what lets `stock_batchnorm` swap a real one back in
    for export. In eval mode the two agree exactly (max |diff| 0.0), so the swap is not an
    approximation — the trained weights ARE stock BatchNorm weights.
    """

    def forward(self, x):
        if self.training:
            var, mean = torch.var_mean(x, dim=(0, 2, 3), unbiased=False, keepdim=True)
            if self.track_running_stats:
                n = x.numel() / x.shape[1]
                with torch.no_grad():
                    m = self.momentum if self.momentum is not None else 0.1
                    self.running_mean.mul_(1 - m).add_(m * mean.flatten())
                    # Running variance is the UNBIASED estimate, as `nn.BatchNorm2d` stores it.
                    self.running_var.mul_(1 - m).add_(m * var.flatten() * n / (n - 1))
                    self.num_batches_tracked += 1
        else:
            mean = self.running_mean.view(1, -1, 1, 1)
            var = self.running_var.view(1, -1, 1, 1)
        y = (x - mean) * torch.rsqrt(var + self.eps)
        return y * self.weight.view(1, -1, 1, 1) + self.bias.view(1, -1, 1, 1)


def _batchnorm_kernel_works() -> bool:
    """Can this build run the stock BatchNorm TRAINING kernel?

    Keyed off `torch.version.hip`, not off a runtime probe. A probe is what I tried first and it
    lies: MIOpen caches compiled kernels per configuration, so a tiny `BatchNorm2d(2)` succeeds
    from cache while the real training shapes need a fresh compile — which is the thing that
    fails. The probe reported "healthy" and the run then died inside `F.batch_norm` minutes later.

    A ROCm build is therefore assumed unable, which costs a little training throughput and
    guarantees the run finishes. Inference is unaffected either way: `stock_batchnorm` puts the
    real module back for export, and the weights are identical.
    """
    global _BN_KERNEL_OK
    if _BN_KERNEL_OK is None:
        _BN_KERNEL_OK = torch.version.hip is None
        if not _BN_KERNEL_OK:
            print("[INFO] ROCm build — training through PrimitiveBatchNorm2d "
                  "(identical weights, folds to stock BatchNorm at export).")
    return _BN_KERNEL_OK


_BN_KERNEL_OK: bool | None = None


def batchnorm2d(channels: int) -> nn.BatchNorm2d:
    """THE BatchNorm factory: stock where the kernel works, primitives where it does not.

    The choice is made here rather than by the caller — it is a property of the machine, not of
    the experiment, and asking the user to know it is asking them to know a MIOpen bug.
    """
    return nn.BatchNorm2d(channels) if _batchnorm_kernel_works() else PrimitiveBatchNorm2d(channels)


def stock_batchnorm(module: nn.Module) -> nn.Module:
    """Replace every [PrimitiveBatchNorm2d] with the stock module, in place, for EXPORT.

    The exporter folds an eval-mode `nn.BatchNorm2d` into the preceding convolution; it cannot fold
    the primitive arithmetic, which would ship as ~40 loose nodes per norm. The state dict is
    identical, so this is a re-wrapping, not a conversion.
    """
    for name, child in module.named_children():
        if isinstance(child, PrimitiveBatchNorm2d):
            stock = nn.BatchNorm2d(child.num_features, eps=child.eps, momentum=child.momentum,
                                   affine=child.affine, track_running_stats=child.track_running_stats)
            stock.load_state_dict(child.state_dict())
            stock.train(child.training)
            setattr(module, name, stock)
        else:
            stock_batchnorm(child)
    return module


def _norm_layer(norm: str, channels: int) -> nn.Module:
    """Normalization layer. groupnorm works around the MIOpen/HIPRTC batch-norm bug on ROCm-Windows."""
    if norm == "groupnorm":
        return nn.GroupNorm(num_groups=_gn_groups(channels), num_channels=channels)
    if norm == "none":
        return nn.Identity()
    return batchnorm2d(channels)


def _gn_replacement(bn: nn.BatchNorm2d) -> nn.Module:
    """GroupNorm standing in for `bn` — keeping whatever `bn` did AFTER normalising.

    timm's `BatchNormAct2d` IS an `nn.BatchNorm2d` subclass and carries the block's
    activation (`.act`, preceded by `.drop`). Swapping the whole module for a bare
    GroupNorm silently deletes that nonlinearity — the shipped export had zero `Relu`
    nodes because of it. A plain `nn.BatchNorm2d` has neither attribute and is replaced
    one-for-one as before.
    """
    gn = nn.GroupNorm(_gn_groups(bn.num_features), bn.num_features)
    tail = [m for m in (getattr(bn, "drop", None), getattr(bn, "act", None)) if m is not None]
    return nn.Sequential(gn, *tail) if tail else gn


def _primitive_bn_replacement(bn: nn.BatchNorm2d) -> nn.Module:
    """[PrimitiveBatchNorm2d] standing in for `bn` — keeping whatever `bn` did AFTER normalising.

    Same trap as `_gn_replacement`: timm's `BatchNormAct2d` IS a `BatchNorm2d` subclass and carries
    the block's activation in `.act` (preceded by `.drop`). Swapping the whole module deletes 30
    ReLUs, which is exactly how every model this project shipped ended up with no nonlinearity.
    """
    out = PrimitiveBatchNorm2d(bn.num_features, eps=bn.eps, momentum=bn.momentum,
                               affine=bn.affine, track_running_stats=bn.track_running_stats)
    want = out.state_dict()
    out.load_state_dict({k: v for k, v in bn.state_dict().items() if k in want})
    tail = [m for m in (getattr(bn, "drop", None), getattr(bn, "act", None)) if m is not None]
    return nn.Sequential(out, *tail) if tail else out


def _convert_bn_to_primitive(module: nn.Module) -> nn.Module:
    """Swap every BatchNorm2d for the primitive one where the stock training kernel is broken.

    A no-op on a working accelerator, so the normal path stays the stock module.
    """
    if _batchnorm_kernel_works():
        return module
    for name, child in module.named_children():
        if isinstance(child, nn.BatchNorm2d) and not isinstance(child, PrimitiveBatchNorm2d):
            setattr(module, name, _primitive_bn_replacement(child))
        else:
            _convert_bn_to_primitive(child)
    return module


def _convert_bn_to_gn(module: nn.Module) -> nn.Module:
    """Replace all BatchNorm2d (e.g. in torchvision backbones) with GroupNorm — otherwise MIOpen
    crashes on ROCm-Windows (`miopenStatusUnknownError`). Pretrained weights of the body remain,
    only the norm statistics are new (GN has no running stats)."""
    for name, child in module.named_children():
        if isinstance(child, nn.BatchNorm2d):
            setattr(module, name, _gn_replacement(child))
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
    if pretrained and not timm.is_model_pretrained(resolved):
        # Some variants (e.g. mobilenetv4_conv_small_035) ship NO pretrained weights — timm's
        # HF fetch then retries forever on this box (looked like a training hang) before
        # raising. Random init is fine here: the synth curriculum IS the pretraining.
        print(f"[INFO] '{resolved}' has no pretrained weights — random init.")
        pretrained = False
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
            elif norm != "none":
                _convert_bn_to_primitive(m)
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
                elif norm != "none":
                    _convert_bn_to_primitive(m)

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
        elif norm != "none":
            _convert_bn_to_primitive(m)
        return m
    try:
        print(f"[INFO] Versuche Backbone '{backbone}' über timm zu laden...")
        m = _create_timm_model(backbone, pretrained=pretrained, num_classes=num_classes)
        if norm == "groupnorm":
            _convert_bn_to_gn(m)
        elif norm != "none":
            _convert_bn_to_primitive(m)
        return m
    except Exception as e:
        raise ValueError(
            f"unknown backbone {backbone!r}. "
            f"Es ist weder intern registriert noch über timm ladbar. Fehler: {e}"
        )
