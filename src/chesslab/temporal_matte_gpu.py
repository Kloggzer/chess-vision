"""The three-frame fit on the GPU: same recipe as `temporal_matte`, torch instead of cv2.

Statistically the same, not bit-identical (border handling): 10 ms against 230 on the CPU.
The rim stays closed-form on the CPU — a guided filter was 60x faster but visibly worse.
"""

from __future__ import annotations

from . import config


def box(x, r):
    """Box mean over (2r+1)² via integral image: O(1) per pixel, any radius. x: (C,H,W)."""
    import torch
    import torch.nn.functional as F

    def integral(t):
        s = F.pad(t, (r + 1, r, r + 1, r)).cumsum(1).cumsum(2)
        k = 2 * r + 1
        return s[:, k:, k:] - s[:, :-k, k:] - s[:, k:, :-k] + s[:, :-k, :-k]

    return integral(x) / integral(torch.ones(1, *x.shape[1:], device=x.device))


def gauss(x, sigma):
    import torch
    import torch.nn.functional as F

    k = int(3 * sigma) * 2 + 1
    t = torch.arange(k, device=x.device, dtype=x.dtype) - k // 2
    w = torch.exp(-t ** 2 / (2 * sigma ** 2))
    channels = x.shape[0]
    w = (w / w.sum()).view(1, 1, 1, k).repeat(channels, 1, 1, 1)
    x = F.conv2d(F.pad(x[None], (k // 2, k // 2, 0, 0), mode="reflect"), w, groups=channels)
    x = F.conv2d(F.pad(x, (0, 0, k // 2, k // 2), mode="reflect"), w.transpose(2, 3), groups=channels)
    return x[0]


def exposure_offset(cur, ref):
    return (cur[:, ::8, ::8] - ref[:, ::8, ::8]).reshape(3, -1).median(1).values[:, None, None]


def difference(cur, ref):
    import torch.nn.functional as F

    c, r = gauss(cur, 1.), gauss(ref, 1.)
    residual = (c - r - exposure_offset(c, r)).abs().mean(0, keepdim=True)
    return -F.max_pool2d(-residual[None], 3, 1, 1)[0]


def alpha_fit(before, cur, after, *, low, high):
    """`temporal_matte.alpha_proposal`'s local fit, before `solid_blobs`. Tensors (3,H,W)."""
    import torch
    import torch.nn.functional as F

    strength = torch.minimum(difference(cur, before), difference(cur, after))
    diff_alpha = ((strength - low) / (high - low)).clamp(0, 1)
    backgrounds = [ref + exposure_offset(cur, ref) for ref in (before, after)]
    errors = [box((cur - bg).abs().mean(0, keepdim=True), 15) for bg in backgrounds]
    bg = torch.where(errors[0] <= errors[1], backgrounds[0], backgrounds[1])
    mean_b, mean_i = box(bg, 30), box(cur, 30)
    variance = (box(bg * bg, 30) - mean_b * mean_b).sum(0, keepdim=True).clamp(min=0)
    covariance = (box(bg * cur, 30) - mean_b * mean_i).sum(0, keepdim=True)
    local = (1 - covariance / variance.clamp(min=64.)).clamp(0, 1)
    local = torch.where((variance >= 64.) & (covariance <= variance), local, diff_alpha)
    support = F.max_pool2d((strength > low).float()[None], 21, 1, 10)[0]
    return (local * support)[0]


def propose_alpha(before, current, after, *, low=config.TEMPORAL_MATTE_LOW,
                  high=config.TEMPORAL_MATTE_HIGH, refine=True, device="cuda"):
    """uint8 BGR boards in, float32 alpha (H,W) out."""
    import torch

    from .temporal_matte import refine_edges, solid_blobs

    def to_tensor(image):
        return torch.from_numpy(image).to(device).permute(2, 0, 1).float()

    b, c, a = (to_tensor(image) for image in (before, current, after))
    alpha = solid_blobs(alpha_fit(b, c, a, low=low, high=high).cpu().numpy())
    return refine_edges(current, alpha) if refine else alpha
