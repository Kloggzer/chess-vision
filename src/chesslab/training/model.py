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
    """Größte Gruppenzahl <= 8, die `channels` teilt (GroupNorm braucht einen Teiler).

    The cap of 8 is this project's own and was never varied; GroupNorm's paper uses G=32 by default
    and reports the method insensitive to G across 64…2 (docs/references.md#wu-2018).
    """
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
    46-node `InstanceNormalization` decomposition (ONNX has no GroupNorm op; instance
    normalisation is docs/references.md#ulyanov-2016). Measured on the real graph: 573 nodes and
    30.6 ms per 64 crops against 124 nodes and 6.5 ms once the norms fold — **4.7x**.

    Deriving the same arithmetic from `var_mean` and friends sidesteps that one kernel and nothing
    else. It SUBCLASSES `nn.BatchNorm2d` on purpose: parameters, buffers and the state dict stay
    byte-identical to the stock module, which is what lets `stock_batchnorm` swap a real one back in
    for export. In eval mode the two agree exactly (max |diff| 0.0), so the swap is not an
    approximation — the trained weights ARE stock BatchNorm weights.
    """

    def forward(self, x):
        # fp32 throughout, whatever autocast handed us. Under AMP `x` is fp16 and a variance
        # reduction over 256*H*W activations leaves the fp16 range: the first real run came back
        # with 12 of 5344 `running_var` entries at +inf, and eval collapsed (val_acc 0.91 -> 0.65)
        # while the training loss fell happily on batch statistics. Stock BatchNorm keeps its
        # statistics in fp32 for exactly this reason; deriving the arithmetic by hand means
        # inheriting that obligation too.
        xf = x.float()
        if self.training:
            var, mean = torch.var_mean(xf, dim=(0, 2, 3), unbiased=False, keepdim=True)
            if self.track_running_stats:
                n = xf.numel() / xf.shape[1]
                with torch.no_grad():
                    m = self.momentum if self.momentum is not None else 0.1
                    self.running_mean.mul_(1 - m).add_(m * mean.flatten())
                    # Running variance is the UNBIASED estimate, as `nn.BatchNorm2d` stores it.
                    self.running_var.mul_(1 - m).add_(m * var.flatten() * n / (n - 1))
                    self.num_batches_tracked += 1
        else:
            mean = self.running_mean.view(1, -1, 1, 1).float()
            var = self.running_var.view(1, -1, 1, 1).float()
        y = (xf - mean) * torch.rsqrt(var + self.eps)
        out = y * self.weight.view(1, -1, 1, 1).float() + self.bias.view(1, -1, 1, 1).float()
        return out.to(x.dtype)


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
    """Normalization layer. groupnorm works around the MIOpen/HIPRTC batch-norm bug on ROCm-Windows.

    The three options are three published positions: BatchNorm (docs/references.md#ioffe-2015),
    GroupNorm, whose statistic does not depend on the batch (docs/references.md#wu-2018), and no
    normalizer at all (docs/references.md#brock-2021 — though that paper's method is adaptive
    gradient clipping, which `norm="none"` does NOT do; it is a bare ablation, not that method).

    Which one ships is settled by measurement here, not by the literature, and BOTH currently ship
    as bundled Android assets — the model the device runs is BatchNorm.
    specs/25-normalization-endgame/STATUS.md excluded BatchNorm; specs/32-normalization-on-clean-
    geometry/STATUS.md re-opened it on the re-aligned corpus and at a rate BatchNorm can use, and
    that is the pack with the current table. The learning rate is the whole reason: every
    comparison in specs/25 ran at the GroupNorm recipe's rate, and tolerating larger rates is
    exactly what BatchNorm is claimed to buy (docs/references.md#bjorck-2018). At its own rate it
    is phantom-free. So never rank normalizers at a single learning rate — sweep it per normalizer,
    or the comparison measures the rate rather than the norm.
    """
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


def _create_timm_model(backbone: str, pretrained: bool, num_classes: int,
                       in_chans: int = 3) -> nn.Module:
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
    # `in_chans` is timm's own knob: it rebuilds the stem for the channel count and, with
    # pretrained weights, sums/repeats the stem kernel across the new fan-in. A run that feeds a
    # non-RGB representation (`--input-repr`) records the name in its config.json, and every
    # consumer derives the count from it — the stem is the ONE place a mismatch is silent.
    return timm.create_model(resolved, pretrained=pretrained, num_classes=num_classes,
                             in_chans=in_chans)


class SmallCNN(nn.Module):
    """Compact conv net: 4 conv blocks (norm+ReLU+MaxPool), global avg pool, linear -> classes.

    The global average pool is what makes the net size-agnostic, so one set of weights can be
    served at 80, 96 or 128 px — the one-level degenerate case of spatial pyramid pooling
    (docs/references.md#he-2014). Without it, `--scales` would not be possible.
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


#: Trunk-Leiter fuer die Geschwindigkeitsfrage: (Breiten, Patch-Stride). Der Stem ist eine
#: Patchify-Faltung statt zweier dichter 3x3 — die kosten in `mnv4_035` die Haelfte aller MACs,
#: und ein entzerrter Zellcrop braucht keine ImageNet-Kantenbank. Messwerte: `docs/`-Bericht.
#: Dritter Eintrag: auf wie viel die Zelle am Ende gepoolt wird. 1 ist der Global-Average-Pool,
#: 2 haelt ein 2x2-Raster - der einzige Architekturkandidat mit Bezug zur gemessenen Fehlermechanik
#: (Blickrichtung IN der Zelle, `docs/plan-98/00-plan.md`).
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

    Der Global-Average-Pool haelt ihn groessenagnostisch, wie `SmallCNN`; `num_classes=0` gibt
    die Merkmale heraus, was `boardnet.build_trunk` fuer die Kopf-Varianten braucht.
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
        # `pool > 1` haelt die Zelle raeumlich aufgeloest, statt sie zu einem Vektor zu mitteln.
        # Die Projektion zurueck auf `widths[-1]` ist Absicht: Kopf, Export und Metriken sehen
        # dieselbe Breite, der Arm unterscheidet sich also nur in dieser einen Stelle.
        self.pool = pool
        self.proj = nn.Linear(widths[-1] * pool * pool, widths[-1]) if pool > 1 else nn.Identity()
        self.head = nn.Linear(widths[-1], num_classes) if num_classes else nn.Identity()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        feat = self.body(self.stem(x))
        # Adaptiv, damit der Trunk groessenagnostisch bleibt - 80 px liefert 3x3, 128 px 4x4.
        flat = (feat.mean((2, 3)) if self.pool == 1
                else self.proj(F.adaptive_avg_pool2d(feat, self.pool).flatten(1)))
        return self.head(flat)



def _retune_stem(m: nn.Module, in_chans: int) -> None:
    """Rebuild a torchvision MobileNetV3's first convolution for `in_chans` inputs, in place.

    timm does this itself (`create_model(in_chans=…)`); torchvision has no such knob. Pretrained
    stem weights are SUMMED over the RGB fan-in and rescaled, which is what timm does too — the
    stem's response to a grey image is then unchanged.
    """
    if in_chans == 3:
        return
    old = m.features[0][0]
    new = nn.Conv2d(in_chans, old.out_channels, old.kernel_size, old.stride, old.padding,
                    bias=old.bias is not None)
    with torch.no_grad():
        # Die Summe wird auf die Kanaele VERTEILT, nicht mit 3 skaliert: `repeat` legt sie
        # `in_chans`-mal an, ein Graubild bekam sonst exakt die dreifache Antwort.
        w = old.weight.sum(dim=1, keepdim=True) / in_chans
        new.weight.copy_(w.repeat(1, in_chans, 1, 1))
        if old.bias is not None:
            new.bias.copy_(old.bias)
    m.features[0][0] = new


def build_model(backbone: str, num_classes: int, pretrained: bool = False,
                norm: str = "batchnorm", head: str = "combined",
                in_chans: int = 3, board_width: int = 128,
                board_layers: int = 2) -> nn.Module:
    """One flat head over the class list; `head` is kept as an argument so a wrong value fails
    loudly rather than silently building something else.

    `in_chans` follows the run's input representation (`torch_data.INPUT_REPRS`); it is 3 for the
    plain RGB crop and e.g. 2 for `gray+sobel`.
    """
    if head != "combined":
        raise ValueError(f"unknown head {head!r} — the model builds one flat head.")
    # `cellnet` und die BoardNet-Truenke kennen kein `norm`. Still BatchNorm zu bauen schrieb
    # `"norm": "groupnorm"` in die config.json eines Modells, in dem nichts eines ist.
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
        if norm == "groupnorm":     # ROCm-Windows: MobileNet batch-norm -> groupnorm, otherwise MIOpen crash
            _convert_bn_to_gn(m)
        elif norm != "none":
            _convert_bn_to_primitive(m)
        return m
    # Nur der LADEVORGANG steht unter dem Auffangnetz: spannte es auch ueber die
    # Norm-Umbauten, kam ein Fehler DARIN als "Backbone unbekannt" heraus.
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
    """Warm-start [model] from [checkpoint]: adopt every tensor that fits, skip the rest.

    Returns `(adopted, skipped)`. Skipping is the POINT: the head has a different class count
    whenever the corpus gained a class (13 -> 14 when `occluded` arrived), and a strict load dies
    on exactly that — which is how `scripts/lr_range_test.py` came to be unusable against the base
    model while `train` warm-started from it fine.

    IS the timm model. Matching keys verbatim across that boundary adopts ZERO tensors and warm
    starts from nothing, which reads as a bad result rather than a bug — so both spellings are
    tried.
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
    """A run's weights: `best.pt`, else `last.pt`, else None — the order every caller wants.

    [prefer] names another checkpoint of the same run first (`swa.pt`, `best_piece.pt`). It is
    not the default order on purpose: the training writes all of them, prints their scores side
    by side and picks NO winner, so preferring one here would decide that silently — and the
    temperature in `model_card.json` was fitted on `best.pt`.
    """
    from pathlib import Path

    d = Path(run_dir)
    for name in ((prefer,) if prefer else ()) + ("best.pt", "last.pt"):
        if (d / name).is_file():
            return d / name
    return None
