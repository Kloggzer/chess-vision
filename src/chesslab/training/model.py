"""Stufe 5 — Modell. Zwei wählbare Backbones, gleicher 13-Klassen-Kopf."""

from __future__ import annotations

import torch
import torch.nn as nn


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


def build_model(backbone: str, num_classes: int, pretrained: bool = False,
                norm: str = "batchnorm") -> nn.Module:
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
