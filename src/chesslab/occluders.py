"""Occluder plates: hands and arms cut free of their backdrop, as RGBA tiles with an alpha mask.

The second layer of the 2.5D composite, so per-cell occlusion carries an exact coverage fraction
instead of a human's yes/no. Recipe and measurements: `docs/occluder-plates.md`.
"""
from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

#: Wo die MASKE gemessen wird — der Plate ist eine Hintergrundschätzung, und 4K kostet dafür das
#: Vierfache an Speicher für dieselbe Farbe. Die PIXEL werden seit 2026-08-23 in Quellauflösung
#: geschnitten: vorher erbten sie diese Sparmaßnahme und wurden beim Compositing wieder 2x
#: hochgezogen — gemessen 13 % weniger Hochfrequenz im Pretrain als im echten Datensatz.
WORK_SIZE = (1920, 1080)
#: Frames the temporal median runs over. The arm has to be off any given pixel in most of them.
PLATE_FRAMES = 48
#: Where the guided alpha is cut and how wide the remaining ramp is. Raising CUT eats into the
#: subject (measured: 0.74 clips fingertips); the ramp is what keeps a motion-blurred edge soft.
EDGE_CUT, EDGE_SOFT = 0.58, 0.30
#: A shadow only takes light away and never drops this far — anything darker is an object, which is
#: how a black sleeve stops being mistaken for the shade beside it.
SHADOW_FLOOR = 0.45
#: Divisor for the silhouettes the novelty test compares. See `silhouette`.
NOVELTY_SCALE = 8


@dataclass(frozen=True)
class Plate:
    """The empty backdrop, the region of it that counts as stage, and where its chroma stops."""

    median: np.ndarray
    stage: np.ndarray
    chroma_cut: float


def _box(x: np.ndarray, r: int) -> np.ndarray:
    return cv2.boxFilter(x, -1, (2 * r + 1, 2 * r + 1))


def guided(guide: np.ndarray, src: np.ndarray, r: int = 8, eps: float = 1e-3) -> np.ndarray:
    """Edge-aware smoothing (He et al. 2010): pulls a blocky mask onto the image's own edges."""
    g = guide.astype(np.float32) / 255.0
    mg, ms = _box(g, r), _box(src, r)
    a = (_box(g * g, r) - mg * mg + eps)
    a = (_box(g * src, r) - mg * ms) / a
    return _box(a, r) * g + _box(ms - a * mg, r)


def drop_specks(mask: np.ndarray, min_area: int) -> np.ndarray:
    """Components below `min_area` in BOTH directions: dust in the matte and pinholes in it."""
    out = mask.copy()
    for invert in (False, True):
        m = cv2.bitwise_not(out) if invert else out
        n, lab, stats, _ = cv2.connectedComponentsWithStats(m, 8)
        small = [i for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] < min_area]
        if small:
            out = np.where(np.isin(lab, small), 255 if invert else 0, out).astype(np.uint8)
    return out


def work_size(cap: cv2.VideoCapture) -> tuple[int, int]:
    """Working resolution with the source's aspect kept — a portrait clip squashed into a landscape
    box distorts every tile that comes out of it."""
    w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    long_side = max(WORK_SIZE)
    return (long_side, max(1, round(h * long_side / w))) if w >= h \
        else (max(1, round(w * long_side / h)), long_side)


def _sample(cap: cv2.VideoCapture, n_frames: int, size: tuple[int, int]) -> np.ndarray:
    idx = np.linspace(0, n_frames - 1, PLATE_FRAMES).astype(int)
    stack = np.empty((len(idx), size[1], size[0], 3), np.uint8)
    for k, i in enumerate(idx):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(i))
        ok, f = cap.read()
        stack[k] = cv2.resize(f, size, interpolation=cv2.INTER_AREA) if ok else 0
    return stack


def read_plate(cap: cv2.VideoCapture, n_frames: int, size: tuple[int, int] | None = None,
               refine: bool = True) -> np.ndarray:
    """The empty backdrop: the per-pixel median over the clip, refined against a GLOBAL reference.

    A hand parked for over half the clip becomes the median there, and judging the refinement
    per-pixel would then keep the skin and discard the backdrop.
    """
    size = size or work_size(cap)
    stack = _sample(cap, n_frames, size)
    med = np.median(stack, axis=0).astype(np.float32)
    if not refine:
        return med

    chroma = med.astype(np.float32) + 1.0
    chroma /= chroma.sum(2)[..., None]
    ref = np.median(chroma.reshape(-1, 3), axis=0).reshape(1, 1, 3) * 255.0
    keep = np.stack([chroma_distance(f, np.broadcast_to(ref, med.shape)) < 0.10 for f in stack])
    out = med.copy()
    for y in range(0, size[1], 128):                       # banded: a float32 stack of 4K is GBs
        band, mask = stack[:, y:y + 128].astype(np.float32), keep[:, y:y + 128, :, None]
        band[~np.broadcast_to(mask, band.shape)] = np.nan
        with np.errstate(invalid="ignore"):
            got = np.nanmedian(band, axis=0)
        out[y:y + 128] = np.where(np.isnan(got), out[y:y + 128], got)
    return out


def stage_of(median: np.ndarray, erode: int = 61) -> np.ndarray:
    """The backdrop region: the largest area whose CHROMA matches the plate's centre.

    No convex hull — the median is arm-free, so a hull would only swallow a knee or a chair.
    """
    p = median + 1.0
    chroma = p / p.sum(2)[..., None]
    h, w = median.shape[:2]
    ref = np.median(chroma[h // 3:2 * h // 3, w // 3:2 * w // 3].reshape(-1, 3), axis=0)
    m = (np.abs(chroma - ref).sum(2) < 0.05).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (61, 61)))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    m = np.where(lab == big, 255, 0).astype(np.uint8)
    return cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (erode, erode)))


def chroma_distance(frame: np.ndarray, median: np.ndarray) -> np.ndarray:
    """How far each pixel's colour direction has moved from the empty backdrop."""
    f, p = frame.astype(np.float32) + 1.0, median + 1.0
    return np.abs(f / f.sum(2)[..., None] - p / p.sum(2)[..., None]).sum(2)


def chroma_cut_of(cap: cv2.VideoCapture, n_frames: int, median: np.ndarray,
                  stage: np.ndarray, samples: int = 12,
                  size: tuple[int, int] | None = None) -> float:
    """Otsu over the pooled chroma distances — the split comes from the clip, not from a constant.

    A shadow shifts colour further on a saturated backdrop than on a dim one, so the gap between
    it and skin sits in a different place per backdrop (numbers in `docs/occluder-plates.md`).
    """
    size = size or work_size(cap)
    on = stage > 0
    vals = []
    for i in np.linspace(0, n_frames - 1, samples).astype(int):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(i))
        ok, f = cap.read()
        if not ok:
            continue
        d = chroma_distance(cv2.resize(f, size, interpolation=cv2.INTER_AREA), median)
        vals.append(d[on])
    if not vals:
        return 0.05
    q = np.clip(np.concatenate(vals) * (255.0 / 0.8), 0, 255).astype(np.uint8)
    cut, _ = cv2.threshold(q, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return float(np.clip(cut * 0.8 / 255.0, 0.05, 0.40))


def rebalance(frame: np.ndarray, plate: Plate) -> np.ndarray:
    """Undo the camera's own auto-exposure and white-balance against the plate.

    A phone re-balances the moment a warm hand enters, moving the WHOLE backdrop; the per-channel
    median ratio over the stage recovers that gain.
    """
    f = frame.astype(np.float32) + 1.0
    p = plate.median + 1.0
    on = plate.stage > 0
    gain = np.array([np.median(p[..., c][on] / f[..., c][on]) for c in range(3)], np.float32)
    return f * gain


def alpha_of(frame: np.ndarray, plate: Plate) -> np.ndarray:
    """Coverage of `frame` against the plate, 0..1. Shadow is background: a shaded square is still
    readable, and counting it as occlusion rebuilds the over-flagging this pipeline exists to fix."""
    f = rebalance(frame, plate)
    on = plate.stage > 0
    ratio = f.sum(2) / (plate.median + 1.0).sum(2)
    chroma = chroma_distance(frame, plate.median)

    # Added light is background too, the mirror of the shadow rule: a lamp swept the mat late in
    # 230602 and a brightness branch kept the lit backdrop — 88 % of one plate was mat, on a frame
    # with no hand at all. Dropping it costs the two clean clips under 0.2 % of the kept area,
    # because an object brighter than the backdrop AND the same colour as it barely exists.
    fg = ((chroma > plate.chroma_cut) | (ratio < SHADOW_FLOOR)) & on
    shadow = (~fg) & (ratio < 0.85) & on

    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    hard = cv2.morphologyEx(fg.astype(np.uint8) * 255, cv2.MORPH_OPEN, k)
    hard = cv2.morphologyEx(hard, cv2.MORPH_CLOSE,
                            cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21)))
    # CLOSE bridges gaps, and a shadow band lying against a sleeve IS such a gap — it gets annexed
    # after being correctly rejected, and no amount of edge trimming takes it back out.
    hard[shadow] = 0
    hard = drop_specks(hard, max(64, int(0.0002 * on.sum())))

    a = guided(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), hard.astype(np.float32) / 255.0)
    return np.clip((a - EDGE_CUT) / EDGE_SOFT, 0, 1).astype(np.float32)


def blurred_pairs(cap: cv2.VideoCapture, n_frames: int, stride: int,
                  size: tuple[int, int]) -> Iterator[tuple[np.ndarray, np.ndarray]]:
    """`(klein, Quellauflösung)` je Pose: die Maske wird klein gemessen, die Pixel groß geschnitten.

    Aufeinanderfolgende Frames paarweise gemittelt — ein 60-fps-Clip trägt die halbe
    Bewegungsunschärfe des 30-fps-Aufbaus, in den er kommt, und das Mitteln kauft sie zurück.
    """
    for i in range(0, n_frames - 1, stride):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ok_a, a = cap.read()
        ok_b, b = cap.read()
        if not ok_a:
            continue
        full = a if not ok_b else cv2.addWeighted(a, 0.5, b, 0.5, 0.0)
        yield cv2.resize(full, size, interpolation=cv2.INTER_AREA), full


def silhouette(alpha: np.ndarray) -> np.ndarray:
    """The shape an overlap test needs, at `NOVELTY_SCALE`. Profiled: comparing full-resolution
    masks costs 823 ms once 500 are kept against `alpha_of`'s constant 360, and it keeps growing.
    Measured over 3 160 real plate pairs, the reduction moves IoU by at most 0.006 and flips no
    decision at the 0.85 cut."""
    h, w = alpha.shape
    small = cv2.resize((alpha > 0.5).astype(np.float32), (w // NOVELTY_SCALE, h // NOVELTY_SCALE),
                       interpolation=cv2.INTER_AREA)
    return small > 0.5


def is_novel(silhouettes: np.ndarray, kept: list[np.ndarray], max_iou: float) -> bool:
    """A clip at 60 fps holds a few hundred poses, not a few thousand — near-duplicates only teach
    the net that one hand shape matters more than the others."""
    for prev in kept:
        union = (silhouettes | prev).sum()
        if union and (silhouettes & prev).sum() / union > max_iou:
            return False
    return True


def extract(video: Path, out_dir: Path, stride: int = 2, max_iou: float = 0.85,
            min_cover: float = 0.02, pair_blur: bool = True) -> dict:
    """Cut every distinct pose out of one clip into `out_dir` as RGBA WebP. Returns a summary."""
    cap = cv2.VideoCapture(str(video))
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    if n <= 0:
        return {"video": video.name, "error": "unreadable"}
    size = work_size(cap)
    cap_w = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
    cap_h = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    median = read_plate(cap, n, size)
    stage = stage_of(median)
    plate = Plate(median=median, stage=stage,
                  chroma_cut=chroma_cut_of(cap, n, median, stage, size=size))
    on = plate.stage > 0
    ys, xs = np.nonzero(plate.stage)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1

    out_dir.mkdir(parents=True, exist_ok=True)
    kept: list[np.ndarray] = []
    written = skipped_thin = skipped_dup = 0
    scale = 1.0
    src = (blurred_pairs(cap, n, stride, size) if pair_blur and fps > 45
           else _plain(cap, n, stride, size))
    for i, (frame, full) in enumerate(src):
        a = alpha_of(frame, plate)
        if (a > 0.5).sum() < min_cover * on.sum():
            skipped_thin += 1
            continue
        sil = silhouette(a)
        if not is_novel(sil, kept, max_iou):
            skipped_dup += 1
            continue
        kept.append(sil)
        # Maske klein, Pixel groß: der Kasten kommt aus der Maskenauflösung, geschnitten wird aus
        # dem Quellframe, und nur das Alpha wird hochgezogen — eine weiche Rampe verträgt das.
        scale = full.shape[1] / frame.shape[1]
        by0, by1 = int(round(y0 * scale)), int(round(y1 * scale))
        bx0, bx1 = int(round(x0 * scale)), int(round(x1 * scale))
        alpha = cv2.resize(a[y0:y1, x0:x1], (bx1 - bx0, by1 - by0), interpolation=cv2.INTER_LINEAR)
        rgba = np.dstack([full[by0:by1, bx0:bx1], (alpha * 255).astype(np.uint8)])
        cv2.imwrite(str(out_dir / f"{video.stem}_{i:05d}.webp"), rgba,
                    [cv2.IMWRITE_WEBP_QUALITY, 95])
        written += 1
    cap.release()
    return {"video": video.name, "frames": n, "fps": round(fps, 2), "written": written,
            "skipped_thin": skipped_thin, "skipped_duplicate": skipped_dup,
            "stage_px": int(on.sum()),
            # Was WIRKLICH geschrieben wurde, nicht der Kasten in Maskenkoordinaten.
            "tile": [int(round((x1 - x0) * scale)), int(round((y1 - y0) * scale))],
            # In WELCHER Auflösung die Kachel geschnitten wurde. Deklariert, nicht geraten: der
            # Composite skalierte sie bisher blind um `WORK_SIZE` zurück.
            "source": [int(cap_w), int(cap_h)]}


def _plain(cap: cv2.VideoCapture, n_frames: int, stride: int,
           size: tuple[int, int]) -> Iterator[tuple[np.ndarray, np.ndarray]]:
    for i in range(0, n_frames, stride):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ok, f = cap.read()
        if ok:
            yield cv2.resize(f, size, interpolation=cv2.INTER_AREA), f
