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
    """Groesste Gruppenzahl <= 8, die `channels` teilt (GroupNorm braucht einen Teiler); die 8 wurde
    nie variiert.
    """
    g = min(8, channels)
    while g > 1 and channels % g:
        g -= 1
    return g


class PrimitiveBatchNorm2d(nn.BatchNorm2d):
    """BatchNorm2d computed from primitives, so MIOpen's broken training kernel is never reached.

    ROCm-Windows cannot compile `MIOpenBatchNormFwdTrainSpatial` (no C++ headers for HIPRTC ->
    `miopenStatusUnknownError`). Subclasses `nn.BatchNorm2d`, so the state dict is stock and
    export swaps it back."""

    def forward(self, x):
        # fp32 throughout: under AMP a variance over 256*H*W fp16 activations overflows — 12
        # `running_var` entries went +inf and eval collapsed while the loss looked fine.
        xf = x.float()
        if self.training:
            var, mean = torch.var_mean(xf, dim=(0, 2, 3), unbiased=False, keepdim=True)
            if self.track_running_stats:
                n = xf.numel() / xf.shape[1]
                with torch.no_grad():
                    self.num_batches_tracked += 1
                    # `momentum=None` ist bei `nn.BatchNorm2d` der KUMULATIVE Mittelwert
                    # (1/num_batches_tracked).
                    m = self.momentum if self.momentum is not None else 1.0 / float(self.num_batches_tracked)
                    self.running_mean.mul_(1 - m).add_(m * mean.flatten())
                    # Running variance is the UNBIASED estimate, as `nn.BatchNorm2d` stores it.
                    self.running_var.mul_(1 - m).add_(m * var.flatten() * n / (n - 1))
        elif self.track_running_stats:
            mean = self.running_mean.view(1, -1, 1, 1).float()
            var = self.running_var.view(1, -1, 1, 1).float()
        else:
            # Ohne laufende Statistik misst auch die Auswertung am Batch, wie `nn.BatchNorm2d`.
            var, mean = torch.var_mean(xf, dim=(0, 2, 3), unbiased=False, keepdim=True)
        y = (xf - mean) * torch.rsqrt(var + self.eps)
        if self.weight is None:
            return y.to(x.dtype)
        out = y * self.weight.view(1, -1, 1, 1).float() + self.bias.view(1, -1, 1, 1).float()
        return out.to(x.dtype)


def _batchnorm_kernel_works() -> bool:
    """Can this build run the stock BatchNorm TRAINING kernel? Keyed off `torch.version.hip`: a
    runtime probe lies, because MIOpen serves small shapes from cache while real shapes need the
    failing compile.
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
    """THE BatchNorm factory: stock where the kernel works, primitives where it does not — a
    property of the machine, not of the experiment.
    """
    return nn.BatchNorm2d(channels) if _batchnorm_kernel_works() else PrimitiveBatchNorm2d(channels)


def stock_batchnorm(module: nn.Module) -> nn.Module:
    """Replace every [PrimitiveBatchNorm2d] with the stock module in place, for EXPORT: only the
    stock one folds into the preceding convolution.
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
    """Normalization layer: batchnorm, groupnorm (works around the MIOpen bug), or none (a bare
    ablation).

    Settled by measurement, and only per learning rate: at a shared rate the comparison measures
    the rate, not the norm (specs/32)."""
    if norm == "groupnorm":
        return nn.GroupNorm(num_groups=_gn_groups(channels), num_channels=channels)
    if norm == "none":
        return nn.Identity()
    return batchnorm2d(channels)


def _gn_replacement(bn: nn.BatchNorm2d) -> nn.Module:
    """GroupNorm standing in for `bn`, keeping what `bn` did AFTER normalising: timm's
    `BatchNormAct2d` carries the activation, and swapping it whole deleted every ReLU of the
    shipped export.
    """
    gn = nn.GroupNorm(_gn_groups(bn.num_features), bn.num_features)
    tail = [m for m in (getattr(bn, "drop", None), getattr(bn, "act", None)) if m is not None]
    return nn.Sequential(gn, *tail) if tail else gn


def _primitive_bn_replacement(bn: nn.BatchNorm2d) -> nn.Module:
    """[PrimitiveBatchNorm2d] standing in for `bn`, with the same `BatchNormAct2d` trap as
    `_gn_replacement`.
    """
    out = PrimitiveBatchNorm2d(bn.num_features, eps=bn.eps, momentum=bn.momentum,
                               affine=bn.affine, track_running_stats=bn.track_running_stats)
    want = out.state_dict()
    out.load_state_dict({k: v for k, v in bn.state_dict().items() if k in want})
    tail = [m for m in (getattr(bn, "drop", None), getattr(bn, "act", None)) if m is not None]
    return nn.Sequential(out, *tail) if tail else out


def _convert_bn_to_primitive(module: nn.Module) -> nn.Module:
    """Swap every BatchNorm2d for the primitive one where the stock training kernel is broken; else
    a no-op.
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
    """Replace all BatchNorm2d with GroupNorm (MIOpen crashes on ROCm-Windows); body weights stay,
    only the norm statistics are new.
    """
    for name, child in module.named_children():
        if isinstance(child, nn.BatchNorm2d):
            setattr(module, name, _gn_replacement(child))
        else:
            _convert_bn_to_gn(child)
    return module


def _resolve_timm_backbone(backbone: str) -> str:
    return _TIMM_BACKBONE_ALIASES.get(backbone, backbone)


def _create_timm_model(backbone: str, pretrained: bool, num_classes: int,
                       in_chans: int = 3) -> nn.Module:
    import timm

    resolved = _resolve_timm_backbone(backbone)
    if resolved != backbone:
        print(f"[INFO] Backbone alias '{backbone}' -> '{resolved}'.")
    if pretrained and not timm.is_model_pretrained(resolved):
        # Variants without pretrained weights make timm's HF fetch retry forever here (looks like a
        # hang). Random init is fine: the synth curriculum IS the pretraining.
        print(f"[INFO] '{resolved}' has no pretrained weights — random init.")
        pretrained = False
    # timm's `in_chans` rebuilds the stem for the channel count; the stem is the ONE place a channel
    # mismatch is silent.
    return timm.create_model(resolved, pretrained=pretrained, num_classes=num_classes,
                             in_chans=in_chans)


class SmallCNN(nn.Module):
    """Compact conv net: 4 conv blocks, global average pool, linear head. The pool makes it
    size-agnostic, which `--scales` needs.
    """

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


#: Trunk-Leiter: (Breiten, Patch-Stride, Pool). Patchify-Stem statt zweier dichter 3x3, die in
#: `mnv4_035` die Haelfte der MACs kosten. Pool 2 haelt ein 2x2-Raster (Blickrichtung IN der Zelle).
CELLNET_PRESETS = {
    "cellnet_p4":    ((32, 64, 64, 128, 128, 192), 4, 1),
    "cellnet_p4g2":  ((32, 64, 64, 128, 128, 192), 4, 2),
    "cellnet_p4w":   ((32, 64, 96, 160, 192, 256), 4, 1),
    "cellnet_p8":    ((24, 48, 64, 96, 128, 192), 8, 1),
    "cellnet_p8w":   ((32, 64, 96, 160, 192, 256), 8, 1),
}


def _dw_pw(c_in: int, c_out: int, stride: int) -> nn.Sequential:
    return nn.Sequential(
        nn.Conv2d(c_in, c_in, 3, stride, 1, groups=c_in, bias=False), batchnorm2d(c_in),
        nn.ReLU(inplace=True),
        nn.Conv2d(c_in, c_out, 1, bias=False), batchnorm2d(c_out), nn.ReLU(inplace=True))


class CellNet(nn.Module):
    """Elf Faltungen statt 46, Patchify-Stem, sonst DW/PW — auf Geschwindigkeit ausgelegt.
    `num_classes=0` gibt die Merkmale fuer `boardnet.build_trunk` heraus.
    """

    def __init__(self, widths: tuple[int, ...], patch: int, num_classes: int,
                 in_chans: int = 3, pool: int = 1) -> None:
        super().__init__()
        self.stem = nn.Sequential(nn.Conv2d(in_chans, widths[0], patch, patch, bias=False),
                                  batchnorm2d(widths[0]), nn.ReLU(inplace=True))
        strides = (2, 1, 2, 1, 2)[:len(widths) - 1]
        self.body = nn.Sequential(*[_dw_pw(a, b, s) for a, b, s
                                    in zip(widths[:-1], widths[1:], strides, strict=True)])
        self.num_features = widths[-1]
        # Die Projektion zurueck auf `widths[-1]` ist Absicht: Kopf, Export und Metriken sehen
        # dieselbe Breite.
        self.pool = pool
        self.proj = nn.Linear(widths[-1] * pool * pool, widths[-1]) if pool > 1 else nn.Identity()
        self.head = nn.Linear(widths[-1], num_classes) if num_classes else nn.Identity()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        feat = self.body(self.stem(x))
        # Adaptiv, damit der Trunk groessenagnostisch bleibt.
        flat = (feat.mean((2, 3)) if self.pool == 1
                else self.proj(F.adaptive_avg_pool2d(feat, self.pool).flatten(1)))
        return self.head(flat)



def _retune_stem(m: nn.Module, in_chans: int) -> None:
    """Rebuild a torchvision MobileNetV3's first convolution for `in_chans` inputs, in place,
    summing the pretrained RGB fan-in like timm does.
    """
    if in_chans == 3:
        return
    old = m.features[0][0]
    new = nn.Conv2d(in_chans, old.out_channels, old.kernel_size, old.stride, old.padding,
                    bias=old.bias is not None)
    with torch.no_grad():
        # VERTEILT, nicht mit 3 skaliert: sonst bekam ein Graubild exakt die dreifache Antwort.
        w = old.weight.sum(dim=1, keepdim=True) / in_chans
        new.weight.copy_(w.repeat(1, in_chans, 1, 1))
        if old.bias is not None:
            new.bias.copy_(old.bias)
    m.features[0][0] = new


def build_model(backbone: str, num_classes: int, pretrained: bool = False,
                norm: str = "batchnorm", head: str = "combined",
                in_chans: int = 3, board_width: int = 128,
                board_layers: int = 2) -> nn.Module:
    """One flat head over the class list; a wrong `head` fails loudly. `in_chans` follows the run's
    input representation.
    """
    if head != "combined":
        raise ValueError(f"unknown head {head!r} — the model builds one flat head.")
    # `cellnet` und die BoardNet-Truenke kennen kein `norm`; still BatchNorm zu bauen schrieb eine
    # falsche `"norm"` in die config.json.
    if norm != "batchnorm" and (backbone in CELLNET_PRESETS
                                or backbone.startswith(("board:", "boardattn:"))):
        raise ValueError(f"{backbone} baut immer BatchNorm — `--norm {norm}` waere eine Luege "
                         f"in der config.json")
    if backbone.startswith(("board:", "boardattn:")):
        from .boardnet import BoardNet, build_trunk

        attention = backbone.startswith("boardattn:")
        trunk_name = backbone.split(":", 1)[1]
        trunk, feat = build_trunk(trunk_name, in_chans=in_chans,
                                  pretrained=pretrained and trunk_name != "smallcnn")
        return BoardNet(trunk, feat, num_classes, board_width=board_width,
                        board_layers=board_layers, attention=attention)
    if backbone == "smallcnn":
        return SmallCNN(num_classes, in_channels=in_chans, norm=norm)
    if backbone in CELLNET_PRESETS:
        widths, patch, pool = CELLNET_PRESETS[backbone]
        return CellNet(widths, patch, num_classes, in_chans=in_chans, pool=pool)
    if backbone == "mobilenet_v3_small":
        from torchvision import models

        weights = models.MobileNet_V3_Small_Weights.IMAGENET1K_V1 if pretrained else None
        m = models.mobilenet_v3_small(weights=weights)
        _retune_stem(m, in_chans)
        in_f = m.classifier[-1].in_features
        m.classifier[-1] = nn.Linear(in_f, num_classes)
        if norm == "groupnorm":
            _convert_bn_to_gn(m)
        elif norm != "none":
            _convert_bn_to_primitive(m)
        return m
    # Nur der LADEVORGANG unter dem Auffangnetz, sonst kam ein Fehler der Norm-Umbauten als
    # "Backbone unbekannt" heraus.
    try:
        print(f"[INFO] Versuche Backbone '{backbone}' über timm zu laden...")
        m = _create_timm_model(backbone, pretrained=pretrained, num_classes=num_classes,
                               in_chans=in_chans)
    except Exception as e:
        raise ValueError(
            f"unknown backbone {backbone!r}. "
            f"Es ist weder intern registriert noch über timm ladbar. Fehler: {e}"
        )
    if norm == "groupnorm":
        _convert_bn_to_gn(m)
    elif norm != "none":
        _convert_bn_to_primitive(m)
    return m


def adopt_weights(model, checkpoint, device: str = "cpu") -> tuple[int, int]:
    """Warm-start [model] from [checkpoint]: adopt what fits, skip the rest. -> (adopted, skipped)

    The head changes with the class count. Wrapped and bare models spell keys differently, and a
    verbatim match adopted ZERO tensors silently, so both spellings are tried.
    """
    import torch

    sd = torch.load(checkpoint, map_location=device)
    msd = model.state_dict()

    def candidates(k: str) -> list[str]:
        """Beide Schreibweisen jeder Huelle, plus die Umbenennung des Kopfs in `BoardNet`."""
        out = [k]
        out.extend(k[len(w):] if k.startswith(w) else w + k for w in ("_mobile.", "trunk."))
        out.extend("cell_head." + k[len(h):] for h in ("classifier.", "head.") if k.startswith(h))
        return out

    keep = {}
    for k, v in sd.items():
        for cand in candidates(k):
            if cand in msd and msd[cand].shape == v.shape:
                keep[cand] = v
                break
    model.load_state_dict(keep, strict=False)
    return len(keep), len(sd) - len(keep)


def checkpoint_of(run_dir, prefer: str | None = None):
    """A run's weights: `best.pt`, else `last.pt`, else None. [prefer] goes first; not the default,
    because training picks no winner and the temperature was fitted on `best.pt`.
    """
    from pathlib import Path

    d = Path(run_dir)
    for name in ((prefer,) if prefer else ()) + ("best.pt", "last.pt"):
        if (d / name).is_file():
            return d / name
    return None
