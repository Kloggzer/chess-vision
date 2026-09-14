"""ColorJitter, Gamma, Blur und Cutout als EINE Batch-Operation auf dem Geraet.

Overhead- statt rechengebunden: gebatcht 66x billiger, aber float statt PILs uint8 — statistisch
dasselbe Rezept, nicht bitgleich (`docs/batch-aug.md`)."""

from __future__ import annotations

from functools import lru_cache

import torch
import torch.nn.functional as F

#: Wie `build_transform` den Blur einhaengt: `T.RandomApply([...], p=0.3)`.
BLUR_P = 0.3
#: Seitenverhaeltnis-Spanne von `torchvision.transforms.RandomErasing`.
ERASE_RATIO = (0.3, 3.3)
#: Ihr Logarithmus, EINMAL: im Rumpf gerechnet ist es ein CPU-Tensor mitten im Graphen, und ohne
#: Host-Compiler kann Inductor den nicht erzeugen. Werte bleiben Bit fuer Bit dieselben.
ERASE_LOG_RATIO = tuple(torch.tensor(ERASE_RATIO).log().tolist())
#: Luminanz nach ITU-R BT.601, dieselbe Gewichtung, die `torchvision` fuer Kontrast und
#: Saettigung nimmt.
GREY = (0.299, 0.587, 0.114)


@lru_cache(maxsize=32)
def _grey_weights(device, dtype):
    """Reuse immutable device constants instead of uploading them every batch."""
    return torch.tensor(GREY, dtype=dtype, device=device).view(1, 3, 1, 1)


def _grey(v: torch.Tensor) -> torch.Tensor:
    w = _grey_weights(v.device, v.dtype)
    return (v * w).sum(dim=1, keepdim=True)


def _contrast(v: torch.Tensor, factor: torch.Tensor) -> torch.Tensor:
    grey = _grey(v).mean(dim=(-2, -1), keepdim=True)
    return (v - grey) * factor + grey


def _saturation(v: torch.Tensor, factor: torch.Tensor) -> torch.Tensor:
    grey = _grey(v)
    return (v - grey) * factor + grey


def _factors(n: int, lo: float, hi: float, device, dtype) -> torch.Tensor:
    return torch.empty(n, 1, 1, 1, device=device, dtype=dtype).uniform_(lo, hi)


def _blur(v: torch.Tensor, sigma: torch.Tensor) -> torch.Tensor:
    """3x3-Gauss mit EIGENEM Sigma je Bild — als gruppierte Faltung, ein Aufruf fuer den Batch."""
    n, c, h, w = v.shape
    off = torch.tensor([-1.0, 0.0, 1.0], device=v.device, dtype=v.dtype).view(1, 3)
    k = torch.exp(-(off**2) / (2 * sigma.view(n, 1) ** 2))
    k = (k / k.sum(dim=1, keepdim=True)).repeat_interleave(c, dim=0)
    flat = v.reshape(1, n * c, h, w)
    # Separabel: erst senkrecht, dann waagerecht. `reflect` ist die Randbehandlung von
    # `torchvision.transforms.GaussianBlur`.
    flat = F.conv2d(F.pad(flat, (0, 0, 1, 1), mode="reflect"),
                    k.view(n * c, 1, 3, 1), groups=n * c)
    flat = F.conv2d(F.pad(flat, (1, 1, 0, 0), mode="reflect"),
                    k.view(n * c, 1, 1, 3), groups=n * c)
    return flat.view(n, c, h, w)


def _erase(v: torch.Tensor, p: float, scale: tuple[float, float]) -> torch.Tensor:
    """Cutout je Bild, vektorisiert. Gefuellt wird mit 0 — im [0,1]-Raum der neutrale Wert, den
    `build_transform` meint, wenn es das Erase VOR die Normalisierung haengt."""
    n, _, h, w = v.shape
    area = h * w * _factors(n, *scale, v.device, v.dtype).view(-1)
    ratio = torch.exp(_factors(n, *ERASE_LOG_RATIO, v.device, v.dtype)).view(-1)
    eh = (area * ratio).sqrt().round().clamp(1, h - 1)
    ew = (area / ratio).sqrt().round().clamp(1, w - 1)
    y0 = (torch.rand(n, device=v.device) * (h - eh + 1)).floor()
    x0 = (torch.rand(n, device=v.device) * (w - ew + 1)).floor()
    rows = torch.arange(h, device=v.device).view(1, h, 1)
    cols = torch.arange(w, device=v.device).view(1, 1, w)
    box = ((rows >= y0.view(n, 1, 1)) & (rows < (y0 + eh).view(n, 1, 1))
           & (cols >= x0.view(n, 1, 1)) & (cols < (x0 + ew).view(n, 1, 1)))
    hit = (torch.rand(n, device=v.device) < p).view(n, 1, 1)
    return v.masked_fill((box & hit).unsqueeze(1), 0.0)


def _affine(v: torch.Tensor, tx: torch.Tensor, ty: torch.Tensor, s: torch.Tensor) -> torch.Tensor:
    """`torchvision`s NEAREST-Affine mit 0-Rand, ein Aufruf fuer den Batch — bitgleich geprueft."""
    n, _, h, w = v.shape
    ys = torch.arange(h, device=v.device, dtype=v.dtype).view(1, h, 1) + 0.5
    xs = torch.arange(w, device=v.device, dtype=v.dtype).view(1, 1, w) + 0.5
    cx, cy = w * 0.5, h * 0.5
    xi = (xs - cx - tx.view(n, 1, 1)) / s.view(n, 1, 1) + cx
    yi = (ys - cy - ty.view(n, 1, 1)) / s.view(n, 1, 1) + cy
    grid = torch.stack(((2.0 * xi / w - 1.0).expand(n, h, w),
                        (2.0 * yi / h - 1.0).expand(n, h, w)), dim=-1)
    return F.grid_sample(v, grid, mode="nearest", padding_mode="zeros", align_corners=False)


def _flip(v: torch.Tensor, p: float, dims: tuple[int, ...]) -> torch.Tensor:
    hit = (torch.rand(v.shape[0], device=v.device) < p).view(-1, 1, 1, 1)
    return torch.where(hit, v.flip(dims), v)


class BatchGeometry:
    """Affine und Spiegelungen je BILD, gebatcht — damit die Photometrie wieder DAVOR laeuft.

    Bleibt die Geometrie im Loader, kippt `--batch-aug` die Reihenfolge von `build_transform`:
    beim Blur ist das nicht folgenlos (`docs/batch-aug.md`).
    """

    def __init__(self, policy) -> None:
        self.translate = float(policy.jitter_translate)
        self.scale = float(policy.jitter_scale)
        self.hflip_p = float(getattr(policy, "hflip_p", 0.0))
        self.vflip_p = float(getattr(policy, "vflip_p", 0.0))
        self.rot180_p = float(getattr(policy, "rot180_p", 0.0))
        self.flip_xor_p = float(getattr(policy, "flip_xor_p", 0.0))

    @property
    def active(self) -> bool:
        return bool(self.translate or self.scale or self.hflip_p or self.vflip_p
                    or self.rot180_p or self.flip_xor_p)

    def __call__(self, v: torch.Tensor) -> torch.Tensor:
        n, _, h, w = v.shape
        if self.translate or self.scale:
            # `RandomAffine.get_params` zieht GANZE Pixel; ohne das Runden waere es eine andere
            # Verteilung als die Kette, die hier ersetzt wird.
            mx, my = self.translate * w, self.translate * h
            tx = _factors(n, -mx, mx, v.device, v.dtype).view(-1).round()
            ty = _factors(n, -my, my, v.device, v.dtype).view(-1).round()
            s = _factors(n, 1.0 - self.scale, 1.0 + self.scale, v.device, v.dtype).view(-1)
            v = _affine(v, tx, ty, s)
        if self.hflip_p:
            v = _flip(v, self.hflip_p, (-1,))
        if self.vflip_p:
            v = _flip(v, self.vflip_p, (-2,))
        if self.rot180_p:
            v = _flip(v, self.rot180_p, (-2, -1))
        if self.flip_xor_p:
            # Genau EINE Achse: die zweite Muenze waehlt welche, sie wirft nicht noch einmal ob.
            hit = torch.rand(n, device=v.device) < self.flip_xor_p
            pick = torch.rand(n, device=v.device) < 0.5
            v = torch.where((hit & pick).view(-1, 1, 1, 1), v.flip(-1), v)
            v = torch.where((hit & ~pick).view(-1, 1, 1, 1), v.flip(-2), v)
        return v


class BatchPhotometric:
    """Die photometrische Haelfte der Kette, auf normalisierten Batches.

    Je BILD eine eigene Ziehung, nicht je Batch — sonst waere es eine andere Augmentierung."""

    def __init__(self, policy, mean, std, erase: bool = True, from_uint8: bool = False,
                 geometry: BatchGeometry | None = None) -> None:
        # Die Geometrie haengt HIER und nicht beim Aufrufer, damit die Reihenfolge nicht zweimal
        # gewusst werden muss: Photometrie, dann Affine/Flip, dann Rauschen und Cutout.
        self.geometry = geometry
        # Kommt der Batch als uint8, gibt es keine Normalisierung zurueckzurechnen — nur /255.
        self.from_uint8 = from_uint8
        self.noise_std = float(getattr(policy, "noise_std", 0.0)) if erase else 0.0
        # Das Erase MUSS mitkommen: es fuellt mit 0, und wuerde die Photometrie danach laufen,
        # faerbte Kontrast die geloeschte Flaeche und der Blur schmierte sie aus.
        self.erase_p = float(policy.erase_p) if erase else 0.0
        self.erase_scale = tuple(policy.erase_scale)
        self.brightness = float(policy.brightness)
        self.contrast = float(policy.contrast)
        self.saturation = float(policy.color_jitter)
        self.gamma = tuple(policy.gamma)
        self.sigma_max = float(policy.blur_sigma_max)
        self._mean = torch.tensor(mean).view(1, 3, 1, 1)
        self._std = torch.tensor(std).view(1, 3, 1, 1)
        self._n_jitter = sum(bool(v) for v in (self.brightness, self.contrast, self.saturation))
        self._compiled = None
        self._device_norm = {}

    @property
    def active(self) -> bool:
        return bool(self.brightness or self.contrast or self.saturation
                    or self.gamma != (1.0, 1.0) or self.sigma_max > 0.1 or self.erase_p
                    or self.noise_std or self.from_uint8
                    or (self.geometry is not None and self.geometry.active))

    def _jitter(self, v: torch.Tensor, order: list[int] | None = None) -> torch.Tensor:
        n, device, dtype = v.shape[0], v.device, v.dtype
        ops = []
        if self.brightness:
            f = _factors(n, max(0.0, 1 - self.brightness), 1 + self.brightness, device, dtype)
            ops.append(lambda x, f=f: x * f)
        if self.contrast:
            f = _factors(n, max(0.0, 1 - self.contrast), 1 + self.contrast, device, dtype)
            ops.append(lambda x, f=f: _contrast(x, f))
        if self.saturation:
            f = _factors(n, max(0.0, 1 - self.saturation), 1 + self.saturation, device, dtype)
            ops.append(lambda x, f=f: _saturation(x, f))
        # `torchvision.ColorJitter` wuerfelt die Reihenfolge der drei; je Batch statt je Bild ist
        # der einzige Unterschied, und er kostet nichts.
        for i in (self._order(len(ops)) if order is None else order):
            v = ops[i](v).clamp_(0.0, 1.0)
        return v

    @staticmethod
    def _order(n: int) -> list[int]:
        """Die Reihenfolge der Jitter-Operationen — gezogen VOR dem Graphen, weil ein Index aus
        einem Tensor `ops[i]` datenabhaengig macht und `fullgraph` daran bricht."""
        return torch.randperm(n).tolist()

    def compile(self, *, preserve_rng: bool = True) -> None:
        """Experimental fusion: retain eager RNG draws, but arithmetic may round differently.

        Static shapes avoid a host C++ compiler on Windows. Four board batch sizes and six
        jitter orders require more than Dynamo's default eight specializations.
        """
        compiled = torch.compile(self._device, fullgraph=True, dynamic=False,
                                 options={'fallback_random': preserve_rng})
        # Scope the limit to this invocation; do not change the model compiler's settings.
        self._compiled = torch._dynamo.config.patch(recompile_limit=32)(compiled)

    def __call__(self, x: torch.Tensor) -> torch.Tensor:
        if not self.active:
            return x
        # The CPU generator draws this, the augmentation's own factors come from the device one,
        # so hoisting it out of the graph leaves both sequences untouched.
        # CPU factors share the permutation's RNG: preserve their original draw order there.
        order = self._order(self._n_jitter) if x.device.type != "cpu" else None
        if self._compiled is not None:
            # Compile over crops: even a one-board final batch then has a dynamic size >= 64.
            # Otherwise Dynamo specializes the board dimension at 1 and duplicates every order.
            flat = x.flatten(0, 1) if x.dim() == 5 else x
            return self._compiled(flat, order).view_as(x)
        return self._device(x, order)

    def _device(self, x: torch.Tensor, order: list[int] | None) -> torch.Tensor:
        shape = x.shape
        # Der Brettkopf liefert `(B, 64, C, H, W)`; gewuerfelt wird je CROP, wie im Loader.
        v = x.flatten(0, 1) if x.dim() == 5 else x
        # ERST nach float wandeln: mean/std im uint8-dtype des Eingangs zu bilden macht std zu 0.
        if self.from_uint8:
            v = v.float().div_(255.0)
        key = (v.device, v.dtype)
        if key not in self._device_norm:
            self._device_norm[key] = (self._mean.to(v.device, v.dtype),
                                      self._std.to(v.device, v.dtype))
        mean, std = self._device_norm[key]
        if not self.from_uint8:
            v = (v * std + mean).clamp_(0.0, 1.0)
        v = self._jitter(v, order)
        if self.gamma != (1.0, 1.0):
            g = _factors(v.shape[0], self.gamma[0], self.gamma[1], v.device, v.dtype)
            v = v.clamp_min(1e-6).pow(g)
        if self.sigma_max > 0.1:
            sigma = _factors(v.shape[0], 0.1, self.sigma_max, v.device, v.dtype).view(-1)
            hit = torch.rand(v.shape[0], device=v.device) < BLUR_P
            v = torch.where(hit.view(-1, 1, 1, 1), _blur(v, sigma), v)
        if self.geometry is not None and self.geometry.active:
            v = self.geometry(v)
        # Reihenfolge wie in `build_transform`: erst das Rauschen, dann das Cutout — sonst
        # traegt die geloeschte Flaeche Rauschen statt der neutralen 0.
        if self.noise_std:
            hit = (torch.rand(v.shape[0], device=v.device) < 0.5).view(-1, 1, 1, 1)
            v = torch.where(hit, v + torch.randn_like(v) * self.noise_std, v).clamp_(0.0, 1.0)
        if self.erase_p:
            v = _erase(v, self.erase_p, self.erase_scale)
        v = ((v.clamp_(0.0, 1.0) - mean) / std)
        return v.view(shape)
