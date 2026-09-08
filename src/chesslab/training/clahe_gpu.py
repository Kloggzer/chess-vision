"""CLAHE als Batch-Operation, nachgebaut nach `cv::CLAHE`. UNBENUTZT (2026-09-07):

der Kern trifft cv2 auf 1 Graustufe, der ganze Operator nur auf 80 — bei clipLimit 2.0 kippt
ein Rundungsfehler die LUT der Kachel, und das Geraet rechnet `Imgproc.createCLAHE`."""

from __future__ import annotations

import torch

#: `cv::CLAHE` rechnet auf 8-Bit-L; 256 Bins sind Teil des Operators, kein Parameter.
BINS = 256


def _tile_hist(lum: torch.Tensor, tile: int) -> tuple[torch.Tensor, int]:
    """Je Kachel ein 256-Bin-Histogramm: `(N, tile*tile, 256)` und die Kachelflaeche."""
    n, h, w = lum.shape
    th, tw = h // tile, w // tile
    # (N, ty, tx, th, tw) -> (N, ty*tx, th*tw): jede Kachel als eigene Zeile.
    cells = lum.view(n, tile, th, tile, tw).permute(0, 1, 3, 2, 4).reshape(n, tile * tile, th * tw)
    hist = torch.zeros(n, tile * tile, BINS, device=lum.device, dtype=torch.float32)
    hist.scatter_add_(2, cells.long(), torch.ones_like(cells, dtype=torch.float32))
    return hist, th * tw


def _clip_and_redistribute(hist: torch.Tensor, limit: int) -> torch.Tensor:
    """`cv::CLAHE`s Umverteilung: gleichmaessig, den Rest reihum mit fester Schrittweite."""
    clipped = hist.clamp(max=float(limit))
    excess = (hist - clipped).sum(dim=-1)
    batch = torch.floor(excess / BINS)
    out = clipped + batch.unsqueeze(-1)
    residual = (excess - batch * BINS).long()
    # OpenCV: `step = max(BINS // residual, 1)`, dann `for i in range(0, BINS, step)` bis der Rest
    # aufgebraucht ist. Vektorisiert: Bin i bekommt +1, wenn i durch step teilbar ist und sein
    # Rang unter dem Rest liegt.
    step = torch.clamp(BINS // residual.clamp(min=1), min=1)
    idx = torch.arange(BINS, device=hist.device).view(1, 1, BINS)
    on_step = (idx % step.unsqueeze(-1)) == 0
    rank = torch.cumsum(on_step.long(), dim=-1) - 1
    out = out + (on_step & (rank < residual.unsqueeze(-1)) & (residual.unsqueeze(-1) > 0)).float()
    return out


def _luts(hist: torch.Tensor, area: int) -> torch.Tensor:
    """Kumulierte Summe mal `255/Flaeche`, auf 0..255 gesaettigt — die LUT je Kachel."""
    return torch.clamp(torch.round(torch.cumsum(hist, dim=-1) * (255.0 / area)), 0, 255)


def _interpolate(lum: torch.Tensor, lut: torch.Tensor, tile: int) -> torch.Tensor:
    """Bilinear zwischen den vier naechsten Kachel-LUTs, wie `cv::CLAHE::apply`."""
    n, h, w = lum.shape
    th, tw = h // tile, w // tile
    ys = torch.arange(h, device=lum.device, dtype=torch.float32) / th - 0.5
    xs = torch.arange(w, device=lum.device, dtype=torch.float32) / tw - 0.5
    y0 = torch.floor(ys).clamp(0, tile - 1).long()
    x0 = torch.floor(xs).clamp(0, tile - 1).long()
    y1 = (y0 + 1).clamp(max=tile - 1)
    x1 = (x0 + 1).clamp(max=tile - 1)
    wy = (ys - torch.floor(ys)).clamp(0, 1).view(h, 1)
    wx = (xs - torch.floor(xs)).clamp(0, 1).view(1, w)
    # Aussen keine Extrapolation: dort, wo geklemmt wurde, muss das Gewicht auf die Kachel fallen.
    wy = torch.where((ys < 0) | (ys > tile - 1), torch.zeros_like(ys), ys - torch.floor(ys)).view(h, 1)
    wx = torch.where((xs < 0) | (xs > tile - 1), torch.zeros_like(xs), xs - torch.floor(xs)).view(1, w)

    flat = lum.reshape(n, -1).long()
    def take(ty, tx):
        cell = (ty.view(h, 1) * tile + tx.view(1, w)).reshape(-1).expand(n, -1)
        return torch.gather(lut.reshape(n, tile * tile, BINS), 1,
                            cell.unsqueeze(-1).expand(-1, -1, BINS)).gather(2, flat.unsqueeze(-1)).squeeze(-1)

    a = take(y0, x0).view(n, h, w)
    b = take(y0, x1).view(n, h, w)
    c = take(y1, x0).view(n, h, w)
    d = take(y1, x1).view(n, h, w)
    top = a + (b - a) * wx
    bot = c + (d - c) * wx
    return top + (bot - top) * wy


def clahe_l(lum: torch.Tensor, clip: float, tile: int) -> torch.Tensor:
    """CLAHE auf einem `(N, H, W)`-L-Kanal in 0..255 (float). Gibt float in 0..255 zurueck."""
    hist, area = _tile_hist(lum.round().clamp(0, 255), tile)
    limit = max(1, int(round(clip * area / BINS)))
    lut = _luts(_clip_and_redistribute(hist, limit), area)
    return _interpolate(lum.round().clamp(0, 255), lut, tile)


#: sRGB -> XYZ (D65), die Matrix, die `cv::cvtColor` fuer `COLOR_RGB2LAB` benutzt.
_M = ((0.412453, 0.357580, 0.180423),
      (0.212671, 0.715160, 0.072169),
      (0.019334, 0.119193, 0.950227))
_WHITE = (0.950456, 1.0, 1.088754)


def _srgb_to_linear(c: torch.Tensor) -> torch.Tensor:
    return torch.where(c > 0.04045, ((c + 0.055) / 1.055).clamp_min(0).pow(2.4), c / 12.92)


def _linear_to_srgb(c: torch.Tensor) -> torch.Tensor:
    return torch.where(c > 0.0031308, 1.055 * c.clamp_min(0).pow(1 / 2.4) - 0.055, c * 12.92)


def rgb_to_lab8(rgb: torch.Tensor) -> torch.Tensor:
    """`(N,3,H,W)` in 0..255 -> cv2s 8-Bit-Lab in 0..255, als float."""
    lin = _srgb_to_linear(rgb / 255.0)
    m = torch.tensor(_M, device=rgb.device, dtype=rgb.dtype)
    xyz = torch.einsum("ij,njhw->nihw", m, lin)
    xyz = xyz / torch.tensor(_WHITE, device=rgb.device, dtype=rgb.dtype).view(1, 3, 1, 1)
    f = torch.where(xyz > 0.008856, xyz.clamp_min(0).pow(1 / 3), 7.787 * xyz + 16.0 / 116.0)
    x, y, z = f[:, 0], f[:, 1], f[:, 2]
    lightness = torch.where(xyz[:, 1] > 0.008856, 116.0 * y - 16.0, 903.3 * xyz[:, 1])
    return torch.stack([lightness * 255.0 / 100.0, 500.0 * (x - y) + 128.0,
                        200.0 * (y - z) + 128.0], dim=1)


def lab8_to_rgb(lab: torch.Tensor) -> torch.Tensor:
    """Die Rueckrichtung; `(N,3,H,W)` in 0..255."""
    lightness = lab[:, 0] * 100.0 / 255.0
    fy = (lightness + 16.0) / 116.0
    fx = fy + (lab[:, 1] - 128.0) / 500.0
    fz = fy - (lab[:, 2] - 128.0) / 200.0
    f = torch.stack([fx, fy, fz], dim=1)
    xyz = torch.where(f > 0.206893, f.clamp_min(0).pow(3), (f - 16.0 / 116.0) / 7.787)
    xyz = xyz * torch.tensor(_WHITE, device=lab.device, dtype=lab.dtype).view(1, 3, 1, 1)
    inv = torch.linalg.inv(torch.tensor(_M, device=lab.device, dtype=torch.float64)).to(lab.dtype)
    lin = torch.einsum("ij,njhw->nihw", inv, xyz)
    return (_linear_to_srgb(lin) * 255.0).clamp(0, 255)


def clahe_rgb(rgb: torch.Tensor, clip: float, tile: int) -> torch.Tensor:
    """Der ganze Operator wie `torch_data._Clahe`: RGB -> Lab, CLAHE auf L, zurueck."""
    lab = rgb_to_lab8(rgb).round().clamp(0, 255)
    lab = torch.cat([clahe_l(lab[:, 0], clip, tile).unsqueeze(1), lab[:, 1:]], dim=1)
    return lab8_to_rgb(lab)
