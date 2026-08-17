"""2.5D compositing: occluder plates over a recorded board, with exact per-cell coverage.

Why the occluder goes onto the SOURCE frame, why size is not randomised, and why coverage is cut
by `crops_for_frame`: `docs/occluder-plates.md`.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from .calibration import CalibrationProfile, GridMesh, mesh_from_lines
from .labeling import all_squares, crops_for_frame
from .occluders import WORK_SIZE

#: The occluder clips were shot on the SAME rig as the board, only with the camera moved closer —
#: so the plate already carries the right size and only needs that one distance correction, not a
#: free scale. Set by eye against the board footage; the jitter covers the rest.
RIG_SCALE = 0.60
SCALE_JITTER = (0.85, 1.15)


@dataclass(frozen=True)
class Placement:
    """Where one tile landed, kept so a composite can be reproduced from its manifest row."""

    tile: str
    centre: tuple[int, int]
    scale: float
    angle: float
    flipped: bool


def load_tiles(plate_dir: Path) -> list[Path]:
    return sorted(plate_dir.glob("*.webp"))


def read_tile(path: Path) -> tuple[np.ndarray, np.ndarray]:
    """(bgr, alpha 0..1) of one RGBA plate, cropped to what the alpha actually covers.

    A plate is the whole stage, and the hand may sit in a corner of it — scaling the TILE then
    makes the occluder itself far too small, which is what the first composites showed.
    """
    t = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if t is None or t.shape[2] != 4:
        raise ValueError(f"{path} is not an RGBA plate")
    ys, xs = np.nonzero(t[:, :, 3] > 8)
    if ys.size:
        t = t[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return t[:, :, :3], t[:, :, 3].astype(np.float32) / 255.0


def place(shape: tuple[int, int], tile: np.ndarray, alpha: np.ndarray, native: float,
          rng: np.random.Generator, target: tuple[int, int, int, int]
          ) -> tuple[np.ndarray, np.ndarray, Placement]:
    """Drop one tile onto an empty full-frame layer at a random pose over `target` (x0,y0,x1,y1).

    Position and angle are free — only the occlusion has to be plausible, not the reach. Size is
    not, and the centre is aimed at the board: on 4K it covers a third of the width.
    """
    h, w = shape
    scale = native * float(rng.uniform(*SCALE_JITTER))
    angle = float(rng.uniform(0, 360))
    flip = bool(rng.integers(2))
    if flip:
        tile, alpha = tile[:, ::-1], alpha[:, ::-1]

    m = cv2.getRotationMatrix2D((tile.shape[1] / 2, tile.shape[0] / 2), angle, scale)
    x0, y0, x1, y1 = target
    cx, cy = int(rng.integers(x0, max(x0 + 1, x1))), int(rng.integers(y0, max(y0 + 1, y1)))
    m[0, 2] += cx - tile.shape[1] / 2
    m[1, 2] += cy - tile.shape[0] / 2
    rgb = cv2.warpAffine(tile, m, (w, h), flags=cv2.INTER_LINEAR)
    a = cv2.warpAffine(alpha, m, (w, h), flags=cv2.INTER_LINEAR)
    return rgb, a, Placement(tile="", centre=(cx, cy), scale=scale, angle=angle, flipped=flip)


def over(base: np.ndarray, rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    a = alpha[..., None]
    return (base.astype(np.float32) * (1 - a) + rgb.astype(np.float32) * a).astype(np.uint8)


def mesh_for(frame: np.ndarray, corners, profile: CalibrationProfile) -> GridMesh | None:
    """The board's OWN grid lines, measured on the clean frame before anything is laid over it.

    ArUco only says where the board is; cutting at the nominal eighth bakes in the lens' barrel.
    Measured first, because an occluder covers the very lines the fit reads.
    """
    from .realgames import grid_line_fracs

    return mesh_from_lines(grid_line_fracs(frame, corners, profile.board_size, profile))


def composite_frame(frame: np.ndarray, corners, profile: CalibrationProfile, tiles: list[Path],
                    rng: np.random.Generator, n_tiles: int = 1, rig: float = RIG_SCALE,
                    mesh: GridMesh | None = None
                    ) -> tuple[list[np.ndarray], dict[str, float], list[Placement]]:
    """One board frame with occluders on it: (64 crops, coverage per square, what was placed).

    Coverage is cut by the SAME `crops_for_frame` call as the image, so the label region IS the
    crop region — mesh and pads included.
    """
    h, w = frame.shape[:2]
    # Plates are cut at `occluders.WORK_SIZE`; putting one back into a 4K frame means undoing that
    # downscale first, and only then applying the rig's distance correction.
    native = (max(h, w) / max(WORK_SIZE)) * rig
    pts = np.array(corners, np.float32)
    target = (int(pts[:, 0].min()), int(pts[:, 1].min()),
              int(pts[:, 0].max()), int(pts[:, 1].max()))
    out = frame.copy()
    acc = np.zeros((h, w), np.float32)
    used: list[Placement] = []
    for path in rng.choice(np.array(tiles, dtype=object), size=n_tiles, replace=False):
        rgb, a, p = place((h, w), *read_tile(Path(path)), native=native, rng=rng,
                          target=target)
        out = over(out, rgb, a)
        acc = np.maximum(acc, a)
        used.append(Placement(tile=Path(path).name, centre=p.centre, scale=p.scale,
                              angle=p.angle, flipped=p.flipped))

    if mesh is None:
        mesh = mesh_for(frame, corners, profile)
    crops = crops_for_frame(out, corners, profile, out_size=tuple(profile.crop.out_size), mesh=mesh)
    grey = cv2.cvtColor((acc * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    masks = crops_for_frame(grey, corners, profile, out_size=tuple(profile.crop.out_size), mesh=mesh)
    cov = {sq: float(m.mean()) / 255.0 for sq, m in zip(all_squares(), masks, strict=True)}
    return crops, cov, used


def median_mesh(cap, profile: CalibrationProfile, samples: int = 40) -> GridMesh | None:
    """One mesh for the whole clip: the per-line median of what the frames measure.

    A single frame's fit puts the back-rank lines where the tall pieces are (see
    `sessions._repair_mesh_outliers`), and a turntable clip has no other frame to borrow from.
    """
    from .calibration import detect_board_corners_aruco
    from .realgames import grid_line_fracs

    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fits = []
    for i in np.linspace(0, n - 1, samples).astype(int):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(i))
        ok, frame = cap.read()
        corners = detect_board_corners_aruco(frame) if ok else None
        g = grid_line_fracs(frame, corners, profile.board_size, profile) if corners else None
        if g:
            fits.append(g)
    if not fits:
        return None
    keys = set(fits[0]).intersection(*(set(f) for f in fits))
    return mesh_from_lines({k: [float(np.median([f[k][i] for f in fits])) for i in range(9)]
                            for k in keys})


def labels_of(fen: str) -> dict[str, str]:
    """`square -> class` for a static position, in `config.CLASSES` spelling."""
    import chess

    board = chess.Board(fen)
    out = {}
    for sq in all_squares():
        p = board.piece_at(chess.parse_square(sq))
        out[sq] = ("w" if p.color else "b") + p.symbol().upper() if p else "empty"
    return out


def build_from_video(video: Path, plate_dir: Path, out_root: Path, manifest: Path, fen: str,
                     board_size: int = 1280, out_size: tuple[int, int] = (80, 80),
                     stride: int = 15, tiles_per_frame: tuple[int, int] = (0, 2),
                     seed: int = 42, profile_name: str = "desktop",
                     blocks: int = 6) -> dict:
    """A whole clip into crops with TWO targets per cell: the piece, and how much is covered.

    `blocks` cuts the clip into that many pseudo-sessions, so the session-grouped split has
    something to group BY — and neighbouring rotation angles cannot straddle train and test.
    """
    import json
    from dataclasses import replace

    from .calibration import (
        CropParams,
        compute_homography,
        detect_board_corners_aruco,
        load_profile,
    )
    from .labeling import CROP_ENCODE, CROP_SUFFIX

    tiles = load_tiles(plate_dir)
    if not tiles:
        return {"error": f"no plates in {plate_dir}"}
    base = load_profile(profile_name)
    cap = cv2.VideoCapture(str(video))
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    rng = np.random.default_rng(seed)
    labels = labels_of(fen)
    stem_sid = f"comp-{video.stem}"
    prof = mesh = None
    rows, written, skipped = [], 0, 0

    for idx in range(0, n, stride):
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ok, frame = cap.read()
        corners = detect_board_corners_aruco(frame) if ok else None
        if corners is None:
            skipped += 1
            continue
        if prof is None:
            prof = replace(base, frame_size=(frame.shape[1], frame.shape[0]),
                           board_size=board_size, image_corners=corners,
                           homography=compute_homography(corners, board_size, base.margin),
                           crop=CropParams(cell=board_size / 8, pad_up=base.crop.pad_up,
                                           pad_side=base.crop.pad_side, out_size=out_size))
            mesh = median_mesh(cap, prof)
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ok, frame = cap.read()
        k = int(rng.integers(tiles_per_frame[0], tiles_per_frame[1] + 1))
        if k:
            crops, cov, _ = composite_frame(frame, corners, prof, tiles, rng, n_tiles=k, mesh=mesh)
        else:
            crops = crops_for_frame(frame, corners, prof, out_size=out_size, mesh=mesh)
            cov = dict.fromkeys(all_squares(), 0.0)
        stem = f"{idx:06d}"
        sid = f"{stem_sid}-{min(blocks - 1, idx * blocks // max(1, n)):02d}"
        for sq, crop in zip(all_squares(), crops, strict=True):
            label = labels[sq]
            path = out_root / label / f"{sid}_{stem}_{sq}{CROP_SUFFIX}"
            path.parent.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(path), crop, CROP_ENCODE)
            rows.append({"path": path.as_posix(), "label": label, "coverage": round(cov[sq], 4),
                         "session_id": sid, "frame": stem, "square": sq, "fen": fen,
                         "out_size": list(out_size), "pad_side": prof.crop.pad_side,
                         "pad_up": prof.crop.pad_up})
            written += 1
    cap.release()
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    covered = sum(r["coverage"] > 0.5 for r in rows)
    return {"session_id": stem_sid, "blocks": blocks, "frames": len(rows) // 64, "crops": written, "skipped": skipped,
            "covered_over_half": covered, "share": round(covered / max(1, written), 4)}
