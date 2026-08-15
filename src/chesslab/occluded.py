"""Occluded proposals from pixel truth — the one producer that is not circular.

Inside a CONFIRMED interval the position is known, so the interval's own quiet frames define what
every cell looks like when nothing is in front of it. A dirty frame's cell is scored against that
reference and against nothing else: no model output enters this file anywhere (specs/53 phase 02 —
the model's own reads are the circularity this producer exists to avoid).

Shadows are the named false positive. A shadow darkens a cell but keeps its structure, an occluder
replaces the content — so the structural channel is a 3x3 CENSUS mismatch, invariant under monotone
brightness change, and the second channel is the escape from the interval's own colour gamut (a
hand matches no square on the board). Both are the engine's arithmetic (`Census.kt`, `Gamut.kt`).

Three metric decisions, each measured on the real sessions before it was made:

- **The reference is K quiet SAMPLES, not one median patch.** Census against a median is not the
  comparison it looks like — the median is denoised and a single frame is not, so sensor noise
  alone put quiet cells 14-61 raw census units from their own median, several times the engine's
  occluder threshold. Sample-against-sample is symmetric in noise. The COLOUR reference stays the
  per-cell median of those samples: a mean over ~16k pixels has no such asymmetry.
- **Second-smallest, never the minimum** (ViBe's consensus rule): one quiet sample that happens to
  resemble the occluder must not clear a cell on its own.
- **Each cell brings its own floor**, from the same leave-one-out comparisons — a global constant
  cannot serve a board with a specular highlight in one corner and a cast shadow across another.

And one about the samples themselves: they come from a WINDOW of intervals, not one — see
`quiet_pool`, where the measurement that forced it is recorded.
"""

from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from pathlib import Path

import cv2
import numpy as np

from . import config
from . import grid_occlusion as grid
from .calibration import load_profile
from .labeling import all_squares, crops_for_frame, read_log, read_session_meta
from .state import GameState

# From engine (phase 02, never re-tune). FLOOR of each channel's per-cell scale, not verdict.
OCCL_CENSUS_THR = 24.0
COLOR_THR = 1.5
CENSUS_SCALE = 255.0 / 8.0
COV_REGULARIZER = 4.0
MIN_GAMUT_SQUARES = 8  # `Gamut.kt` MIN_USABLE_SQUARES

SAMPLES = 3  # Quiet frames drawn per interval; `quiet_pool` spans 2*SPAN+1 of them, so K <= 21.
SPAN = 3
FULL = 2.0  # A channel saturates at FULL x the cell's own worst quiet excursion above its floor.

# The grid channel (grid_occlusion.py). Scores by missing-edge count: the hand's CORE erases all
# four grooves of a square, its rim two — the same staffelung the tracker's veto measured. The
# +-DEADZONE_FRAMES fringe inherits the nearest hand frame's squares at DEADZONE_SCORE: the
# sensor is blind to the motion-blurred entry/exit (measured on 003957 ply 8: 1 frame in, 2 out),
# so those cells sit between `lo` and `hi` — never auto-occluded, never silently clean, a human
# decides (the user's call, 2026-08-10).
GRID_SCORE_BY_EDGES = {2: 0.5, 3: 0.7, 4: 0.85}
DEADZONE_FRAMES = 3
DEADZONE_SCORE = 0.35

# Row-major 3x3 scan skipping the centre — `Census.kt`'s bit order.
_OFFSETS = ((-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1))
_POPCOUNT8 = np.array([bin(i).count("1") for i in range(256)], dtype=np.uint8)


def census_codes(gray: np.ndarray) -> np.ndarray:
    """3x3 census codes — port of `Census.censusTransform`, same bit order.

    Bit `b` is set iff the centre is strictly brighter than neighbour `b`; the deadband is 0 and
    stays 0 (`CENSUS_EPS`), because any eps > 0 breaks the monotone-brightness invariance that
    makes this channel blind to shadow. Padding is BORDER_REPLICATE, never a wrap.
    """
    pad = cv2.copyMakeBorder(gray, 1, 1, 1, 1, cv2.BORDER_REPLICATE).astype(np.int16)
    h, w = gray.shape[:2]
    centre = pad[1 : 1 + h, 1 : 1 + w]
    out = np.zeros((h, w), dtype=np.uint8)
    for bit, (dy, dx) in enumerate(_OFFSETS):
        out |= (centre > pad[1 + dy : 1 + dy + h, 1 + dx : 1 + dx + w]).astype(np.uint8) << bit
    return out


def census_mismatch(a: np.ndarray, b: np.ndarray) -> float:
    """Mean Hamming distance of two code patches, scaled to 0..255 — `perSquareCensusChange`."""
    return float(_POPCOUNT8[np.bitwise_xor(a, b)].mean()) * CENSUS_SCALE


def second_smallest(values: list[float]) -> float:
    """The 2nd-smallest value — ViBe's ">= 2 close samples", so one lucky sample decides nothing."""
    return sorted(values)[1] if len(values) > 1 else min(values, default=0.0)


def color_feature(bgr: np.ndarray) -> np.ndarray:
    """`[mean Lab a*, mean Lab b*, mean HSV S]` — `Gamut.kt`'s squareFeature.

    L* is dropped there and here: that is what makes the colour channel survive exposure and
    shadow, and it is why the two channels do not measure the same thing twice.
    """
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    return np.array([lab[:, :, 1].mean(), lab[:, :, 2].mean(), hsv[:, :, 1].mean()])


def gamut_inv_cov(feats: np.ndarray) -> np.ndarray | None:
    """Inverse regularized sample covariance of the clean features — `colorGamutFromFeatures`."""
    if len(feats) < MIN_GAMUT_SQUARES:
        return None
    cov = np.cov(np.asarray(feats, dtype=float).T) + COV_REGULARIZER * np.eye(3)
    try:
        return np.linalg.inv(cov)
    except np.linalg.LinAlgError:
        return None


def gamut_escape(feature: np.ndarray, feats: np.ndarray, inv_cov: np.ndarray | None) -> float:
    """Mahalanobis distance (sigma) to the NEAREST clean square, never to the mean.

    A piece arriving somewhere resembles the same piece elsewhere on the board; a hand, sleeve or
    arm resembles none. `occlusionColorSquares` / `nearestMahalanobis`.
    """
    if inv_cov is None:
        return 0.0
    d = np.asarray(feats, dtype=float) - np.asarray(feature, dtype=float)
    return float(np.sqrt(max(np.min(np.einsum("ij,jk,ik->i", d, inv_cov, d)), 0.0)))


def quiet_band(values: list[float]) -> tuple[float, float]:
    """`(floor, excursion)` of a cell's own quiet channel values — its median and worst outlier."""
    floor = float(np.median(values))
    return floor, float(max(values)) - floor


def band_score(value: float, band: tuple[float, float], min_scale: float) -> float:
    """One channel in [0, 1]: how far past its own quiet noise this cell sits."""
    return float(np.clip((value - band[0]) / (FULL * max(band[1], min_scale)), 0.0, 1.0))


def cell_score(structural: float, chroma: float) -> float:
    """The two channels as one number in [0, 1] — higher is more occluder-like.

    A probabilistic OR, because the engine ORs the same two facts (`isOccluder`: structured OR
    chroma outlier), and a soft OR keeps a cell half-convincing on both — which is the whole
    point of emitting a score instead of a boolean.
    """
    return 1.0 - (1.0 - structural) * (1.0 - chroma)


def frame_cells(session_dir: Path, row: dict, profile) -> list[np.ndarray]:
    """The 64 BGR crops of one logged row — through `crops_for_frame`, the slice's own path."""
    path = session_dir / row["frame"]
    frame = cv2.imread(str(path))
    if frame is None:
        raise FileNotFoundError(f"frame not readable: {path}")
    return crops_for_frame(frame, row["corners"], profile)


def interval_reference(pool_cells: list[list[np.ndarray]], keep: list[list[bool]]) -> dict:
    """What this interval's cells look like when nothing is in front of them.

    Per cell: its samples' census codes, their MEDIAN colour feature, and each channel's quiet
    band from the leave-one-out comparisons among the same samples. `keep[r][i]` says whether
    pool row `r` may serve cell `i` — see `quiet_pool` for why the pool reaches past the interval
    and why the label has to match before it may.
    """
    stacks = [[c[i] for r, c in enumerate(pool_cells) if keep[r][i]] for i in range(64)]
    codes = [[census_codes(cv2.cvtColor(c, cv2.COLOR_BGR2GRAY)) for c in s] for s in stacks]
    samples = [[color_feature(c) for c in s] for s in stacks]
    feats = np.array([np.median(s, axis=0) for s in samples])
    inv_cov = gamut_inv_cov(feats)
    structural, chroma = [], []
    for i, cell in enumerate(codes):
        loo = [
            [census_mismatch(c, o) for j, o in enumerate(cell) if j != k]
            for k, c in enumerate(cell)
        ]
        structural.append(quiet_band([second_smallest(v) for v in loo]))
        chroma.append(quiet_band([gamut_escape(f, feats, inv_cov) for f in samples[i]]))
    return {
        "codes": codes,
        "feats": feats,
        "inv_cov": inv_cov,
        "structural": structural,
        "chroma": chroma,
    }


def score_cells(reference: dict, cells: list[np.ndarray]) -> list[float]:
    """One score per cell of a dirty frame against the interval reference."""
    out = []
    for i, crop in enumerate(cells):
        codes = census_codes(cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY))
        mismatch = second_smallest([census_mismatch(r, codes) for r in reference["codes"][i]])
        escape = gamut_escape(color_feature(crop), reference["feats"], reference["inv_cov"])
        structural = band_score(mismatch, reference["structural"][i], OCCL_CENSUS_THR)
        out.append(cell_score(structural, band_score(escape, reference["chroma"][i], COLOR_THR)))
    return out


def grid_channel(session_dir: Path, intervals: dict, profile) -> dict[str, dict[str, float]]:
    """Per dirty frame stem: the grid-groove channel's per-square scores.

    A hand frame (adjacent-pair rule, `grid_occlusion.hand_squares`) scores its flagged squares
    by missing-edge count; the +-DEADZONE_FRAMES fringe inherits the nearest hand frame's squares
    at DEADZONE_SCORE. Only dirty rows are read — the blurred entry/exit is motion-dirty by
    construction, so the fringe never hides inside a quiet interval.
    """
    dirty = sorted(
        (r for b in intervals.values() for r in b["dirty"]),
        key=lambda r: int(Path(r["frame"]).stem),
    )
    pad = grid.crop_border_px(profile)
    hands: dict[int, dict[str, int]] = {}
    for row in dirty:
        frame = cv2.imread(str(session_dir / row["frame"]))
        if frame is None:
            continue
        warped = grid.warp_padded(frame, row["corners"], profile, pad)
        gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY).astype(np.float32)
        edges = grid.missing_edges(gray, profile.board_size, pad, white_pov=profile.white_pov)
        squares = grid.hand_squares(edges)
        if squares:
            hands[int(Path(row["frame"]).stem)] = {s: edges[s] for s in squares}
    scores: dict[str, dict[str, float]] = {}
    for row in dirty:
        n = int(Path(row["frame"]).stem)
        if n in hands:
            scores[Path(row["frame"]).stem] = {
                s: GRID_SCORE_BY_EDGES[min(e, 4)] for s, e in hands[n].items()
            }
            continue
        near = next(
            (hands[m] for d in range(1, DEADZONE_FRAMES + 1) for m in (n - d, n + d) if m in hands),
            None,
        )
        if near is not None:
            scores[Path(row["frame"]).stem] = dict.fromkeys(near, DEADZONE_SCORE)
    return scores


def rows_by_interval(log: list[dict]) -> dict[int, dict[str, list[dict]]]:
    """`ply -> {"quiet": [...], "dirty": [...]}` — the intervals the exporter wrote."""
    out: dict[int, dict[str, list[dict]]] = {}
    for row in log:
        bucket = out.setdefault(int(row["ply"]), {"quiet": [], "dirty": []})
        bucket["dirty" if row.get("dirty") else "quiet"].append(row)
    return out


def spread(rows: list[dict], k: int) -> list[dict]:
    """At most `k` rows spread evenly over the interval — the ends of it are as informative as
    the middle, and a contiguous head would sample one lighting moment K times."""
    if len(rows) <= k:
        return rows
    return [rows[int(i)] for i in np.linspace(0, len(rows) - 1, k)]


def quiet_pool(intervals: dict, ply: int) -> list[dict]:
    """Quiet rows of this ply AND its `SPAN` neighbours — a quiet window is not a clean one.

    Phase 01's margin declares the middle of an interval hand-free; it is not. Measured on
    `rg-rec-20260808-115912`: whole quiet windows are covered by a resting hand, and a reference
    built from them INVERTS the producer — the clean dirty frames then score highest (0.70-0.88 on
    four hand-checked cells). The neighbours supply the missing clean samples, and `keep` (built
    by the caller) admits a neighbour row only for the cells whose LABEL it shares — which is what
    the confirmed FEN timeline knows and no pixel does. Widening 1 -> 3 fixed the two worst of
    those four outright (0.95 -> 0.00, 0.71 -> 0.00).
    """
    return [
        r
        for p in range(ply - SPAN, ply + SPAN + 1)
        for r in spread(intervals.get(p, {}).get("quiet", []), SAMPLES)
    ]


def proposal_rows(
    session_dir: Path,
    *,
    hi: float,
    progress: bool = True,
    model_dir: Path | None = None,
    grid_on: bool = True,
) -> tuple[list[dict], list[int]]:
    """Every dirty cell of a session as a proposal row, plus the plies that had no reference.

    With [model_dir] a trained model scores the same cells as a SECOND proposer
    (`occluded_model.py` — suggestions for a human, refused on its own training sessions). The
    channels stay in their own columns and `score` is their MAX: any channel seeing an occluder
    is evidence, and a disagreement must stay readable in the file. The model's threshold is the
    same `hi`, which is a judgement — a softmax probability and a pixel mismatch are not the same
    scale — and the calibration table is the way to settle it.

    [grid_on] adds the THIRD channel: the grid-groove hand read (`grid_occlusion.py`), including
    the +-3-frame low-confidence deadzone around each hand.
    """
    meta = read_session_meta(session_dir)
    profile = load_profile(meta["profile"])
    intervals = rows_by_interval(read_log(session_dir))
    grid_scores = grid_channel(session_dir, intervals, profile) if grid_on else {}
    squares = all_squares()
    rows: list[dict] = []
    skipped: list[int] = []
    if model_dir is not None:
        from .occluded_model import check_not_circular

        check_not_circular(model_dir, meta["session_id"])
    for n, (ply, bucket) in enumerate(sorted(intervals.items()), 1):
        pool, dirty = quiet_pool(intervals, ply), bucket["dirty"]
        # Below three samples there is no leave-one-out second-smallest, i.e. no floor at all.
        if len(bucket["quiet"]) < 3 or not dirty:
            skipped.append(ply)
            continue
        labels = GameState(dirty[0]["fen"]).labels()
        keep = [[GameState(r["fen"]).labels()[s] == labels[s] for s in squares] for r in pool]
        reference = interval_reference([frame_cells(session_dir, r, profile) for r in pool], keep)
        for row in dirty:
            cells = frame_cells(session_dir, row, profile)
            scores = score_cells(reference, cells)
            probs = _model_probs(model_dir, cells)
            stem = Path(row["frame"]).stem
            # The exporter marks the squares whose label this frame cannot vouch for — the next
            # move's footprint inside the pre-commit window, where the piece has already moved
            # and the interval FEN has not caught up. No proposal is made about them: the human
            # would be asked "keep empty?" about a square that plainly holds a pawn.
            unknown = set(row.get("unknown_squares") or ())
            gcell = grid_scores.get(stem, {})
            rows += [
                _proposal(meta["session_id"], stem, sq, labels[sq], s, p, hi, gcell.get(sq, 0.0))
                for sq, s, p in zip(squares, scores, probs, strict=True)
                if sq not in unknown
            ]
        if progress:
            print(f"  ply {ply} ({n}/{len(intervals)}): +{64 * len(dirty)} rows")
    return rows, skipped


def _model_probs(model_dir: Path | None, cells: list) -> list[dict[str, float]]:
    """Sparse per-class probabilities per cell, or empty dicts when no model was given."""
    if model_dir is None:
        return [{} for _ in cells]
    from .occluded_model import all_probs, model_classes, sparse

    classes = model_classes(model_dir)
    return [sparse(p, classes) for p in all_probs(model_dir, cells)]


def _proposal(
    session_id: str,
    stem: str,
    square: str,
    fen_label: str,
    pixel: float,
    probs: dict[str, float],
    hi: float,
    grid_score: float = 0.0,
) -> dict:
    """One row. `score` is the max of the channels; each stays readable next to it.

    `probs` is what makes the relabel UI's filter possible ("every board with a cell the model
    reads occluded > 0.1", "every board where the model disagrees with the FEN") — the producer
    cannot know which question a human will ask, so it ships the distribution instead of one
    more threshold. Sparse: classes under `PROB_FLOOR` are omitted. `grid_score` is the groove
    read's say — DEADZONE_SCORE marks the blur fringe, deliberately between `lo` and `hi`.
    """
    model = probs.get("occluded", 0.0)
    score = max(pixel, model, grid_score)
    row = {
        "session_id": session_id,
        "frame": stem,
        "square": square,
        "fen_label": fen_label,
        "proposed": "occluded" if score > hi else "keep",
        "score": round(score, 4),
    }
    if probs:
        row["pixel_score"] = round(pixel, 4)
        row["probs"] = probs
    if grid_score > 0.0:
        row["grid_score"] = round(grid_score, 4)
    return row


CONTROL_MAX = 180  # `lib/proposals.ts` CONTROL_MAX — mirrored so the sidecar's `control` count
# matches the UI stream without re-deriving which rows it sampled (see `stream_counts`).


def stream_counts(rows: list[dict], hi: float, lo: float) -> dict[str, int]:
    """Row counts per UI stream — the score predicates of `splitStreams` (`lib/proposals.ts`).

    `control` is the SIZE of `splitStreams`' step-sampled downsample of the below-`lo` rows: that
    count depends only on how many rows are below `lo`, not on their order or which ones get
    picked, so it is safe to reproduce here without the page's score-sorted row list.

    Two DECLARED divergences, both on the page's side: its `confirm` stream narrows to
    `proposed == "occluded"` (the census here is the file's, the stream is the question the page
    asks), and on a file with no `_thresholds` header it falls back to its own DEFAULTS
    (`loadProposals`, hi 0.7 / lo 0.3) instead of the `hi`/`lo` this run was given.
    """
    confirm = sum(1 for r in rows if r["score"] > hi)
    unsure = sum(1 for r in rows if lo <= r["score"] <= hi)
    below = sum(1 for r in rows if r["score"] < lo)
    step = max(1, (below + CONTROL_MAX - 1) // CONTROL_MAX)
    return {"confirm": confirm, "unsure": unsure, "control": (below + step - 1) // step}


def write_proposals(
    path: Path,
    rows: list[dict],
    *,
    hi: float,
    lo: float,
    model: Path | None = None,
    written_at: str | None = None,
) -> Path:
    """Line 1 is the thresholds header, then one proposal per line (entry.md's pinned schema).

    `model`/`written_at` are additive keys inside `_thresholds` — CONCEPT.md 5.3's per-session
    provenance. Its inner shape is unpinned (`lib/proposals.ts:74-80`), so an old reader ignores
    them and a file written before this change still parses.

    Atomic (tmp + `os.replace`) like `write_summary`: truncate-and-write means a crashed run leaves
    a HALF file under the real name, and the app reads that name mtime-keyed without a checksum.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    header = {"hi": hi, "lo": lo, "model": str(model) if model else None, "written_at": written_at}
    tmp = path.with_suffix(path.suffix + ".tmp")
    try:
        with tmp.open("w", encoding="utf-8") as fh:
            fh.write(json.dumps({"_thresholds": header}) + "\n")
            for row in rows:
                fh.write(json.dumps(row, ensure_ascii=False) + "\n")
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)
    return path


def write_summary(
    path: Path, rows: list[dict], *, hi: float, lo: float, model: Path | None, written_at: str
) -> Path:
    """The `occluded-proposals.summary.json` sidecar (CONCEPT.md 6.3, artifact 2).

    `/corpus` needs per-session stream counts on nine sessions at once; this lets it read a few
    hundred bytes instead of parsing 33 MB of proposal rows. Atomic (tmp + `os.replace`): a
    half-written sidecar is worse than a missing one, since a missing one just falls back to
    parsing the jsonl.

    `frames` is the sorted list of distinct stems, not just their count (CONCEPT.md 6.3): the
    progress figure is `|touched ∩ proposal frames|` and needs the SET — a counter alone would
    leave every reader parsing the jsonl anyway, which is the cost this file exists to remove.
    """
    frames = sorted({r["frame"] for r in rows})
    summary = {
        "boards": len(frames),
        "cells": len(rows),
        "frames": frames,
        "by_stream": stream_counts(rows, hi, lo),
        "hi": hi,
        "lo": lo,
        "model": str(model) if model else None,
        "written_at": written_at,
    }
    tmp = path.with_suffix(path.suffix + ".tmp")
    try:
        tmp.write_text(json.dumps(summary) + "\n", encoding="utf-8")
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)
    return path


def propose_occluded(
    name: str,
    *,
    hi: float = 0.7,
    lo: float = 0.3,
    model_dir: Path | None = None,
    grid_on: bool = True,
) -> dict:
    """Score every dirty cell of `data/sessions/rg-<name>/` into `occluded-proposals.jsonl`,
    plus the `occluded-proposals.summary.json` sidecar `/corpus` reads instead (CONCEPT.md 6.3)."""
    session_dir = config.DATA.sessions / f"rg-{name}"
    if not (session_dir / "log.jsonl").exists():
        raise FileNotFoundError(f"{name}: no exported session at {session_dir}")
    rows, skipped = proposal_rows(session_dir, hi=hi, model_dir=model_dir, grid_on=grid_on)
    written_at = datetime.now(UTC).isoformat()
    game_dir = config.DATA.root / "realgames" / name
    path = write_proposals(
        game_dir / "occluded-proposals.jsonl", rows, hi=hi, lo=lo, model=model_dir,
        written_at=written_at,
    )
    summary_path = write_summary(
        game_dir / "occluded-proposals.summary.json", rows, hi=hi, lo=lo, model=model_dir,
        written_at=written_at,
    )
    return {
        "path": path,
        "summary_path": summary_path,
        "rows": rows,
        "occluded": sum(1 for r in rows if r["proposed"] == "occluded"),
        "skipped_plies": skipped,
    }
