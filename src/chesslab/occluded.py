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
from pathlib import Path

import cv2
import numpy as np

from . import config
from .calibration import load_profile
from .labeling import all_squares, crops_for_frame, read_log, read_session_meta
from .state import GameState

# Copied from the engine, never re-tuned here (phase 02 "Do NOT"). Sources:
#   OCCL_CENSUS_THR — `TrackerConfig.occlCensusThr`, fixture value in
#     android/core-engine/src/test/resources/parity/README.md:124 ("occlCensusThr": 24.0)
#   COLOR_THR       — `TrackerConfig.occlusionColorThr`, same fixture line ("colorThr": 1.5)
#   CENSUS_SCALE    — `Census.kt` CENSUS_SCALE (255/8: mean Hamming in a gray-diff unit)
#   COV_REGULARIZER — `Gamut.kt` COV_REGULARIZER
# Here they are the FLOOR of each channel's per-cell scale, never a verdict: a cell whose quiet
# excursion is implausibly small must not get a hair trigger.
OCCL_CENSUS_THR = 24.0
COLOR_THR = 1.5
CENSUS_SCALE = 255.0 / 8.0
COV_REGULARIZER = 4.0
MIN_GAMUT_SQUARES = 8  # `Gamut.kt` MIN_USABLE_SQUARES

SAMPLES = 3  # Quiet frames drawn per interval; `quiet_pool` spans 2*SPAN+1 of them, so K <= 21.
SPAN = 3
FULL = 2.0  # A channel saturates at FULL x the cell's own worst quiet excursion above its floor.

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
    session_dir: Path, *, hi: float, progress: bool = True, model_dir: Path | None = None
) -> tuple[list[dict], list[int]]:
    """Every dirty cell of a session as a proposal row, plus the plies that had no reference.

    With [model_dir] a trained model scores the same cells as a SECOND proposer
    (`occluded_model.py` — suggestions for a human, refused on its own training sessions). The
    two channels stay in their own columns and `score` is their MAX: either channel seeing an
    occluder is evidence, and a disagreement must stay readable in the file. The model's
    threshold is the same `hi`, which is a judgement — a softmax probability and a pixel
    mismatch are not the same scale — and the calibration table is the way to settle it.
    """
    meta = read_session_meta(session_dir)
    profile = load_profile(meta["profile"])
    intervals = rows_by_interval(read_log(session_dir))
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
            rows += [
                _proposal(meta["session_id"], stem, sq, labels[sq], s, p, hi)
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
) -> dict:
    """One row. `score` is the max of the two channels; both stay readable next to it.

    `probs` is what makes the relabel UI's filter possible ("every board with a cell the model
    reads occluded > 0.1", "every board where the model disagrees with the FEN") — the producer
    cannot know which question a human will ask, so it ships the distribution instead of one
    more threshold. Sparse: classes under `PROB_FLOOR` are omitted.
    """
    model = probs.get("occluded", 0.0)
    score = max(pixel, model)
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
    return row


def write_proposals(path: Path, rows: list[dict], *, hi: float, lo: float) -> Path:
    """Line 1 is the thresholds header, then one proposal per line (entry.md's pinned schema)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        fh.write(json.dumps({"_thresholds": {"hi": hi, "lo": lo}}) + "\n")
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    return path


def propose_occluded(
    name: str, *, hi: float = 0.7, lo: float = 0.3, model_dir: Path | None = None
) -> dict:
    """Score every dirty cell of `data/sessions/rg-<name>/` into `occluded-proposals.jsonl`."""
    session_dir = config.DATA.sessions / f"rg-{name}"
    if not (session_dir / "log.jsonl").exists():
        raise FileNotFoundError(f"{name}: no exported session at {session_dir}")
    rows, skipped = proposal_rows(session_dir, hi=hi, model_dir=model_dir)
    path = write_proposals(
        config.DATA.root / "realgames" / name / "occluded-proposals.jsonl", rows, hi=hi, lo=lo
    )
    return {
        "path": path,
        "rows": rows,
        "occluded": sum(1 for r in rows if r["proposed"] == "occluded"),
        "skipped_plies": skipped,
    }
