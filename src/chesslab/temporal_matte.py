"""Three-frame foreground proposals, separate from measured training alpha.

A pixel must disagree with BOTH bracketing views, which suppresses a piece present only
before or only after a move. Review proposals, never automatic coverage labels.
"""

from __future__ import annotations

import json
import math
from datetime import UTC, datetime
from pathlib import Path

import cv2
import numpy as np

from . import config
from .labeling import _profile_for_session, read_log, read_session_meta, usable_board
from .sessions import session_dir
from .temporal_flags import load_flags, source_stamp


def exposure_offset(cur, ref):
    """Per-channel median of the difference on every 8th pixel — the full median cost 14 s/run."""
    return np.median((cur[::8, ::8] - ref[::8, ::8]).reshape(-1, 3), axis=0)


def difference(current, reference):
    """Reject global additive exposure changes; tolerate one-pixel edge shifts."""
    cur = cv2.GaussianBlur(current.astype(np.float32), (0, 0), 1.)
    ref = cv2.GaussianBlur(reference.astype(np.float32), (0, 0), 1.)
    residual = np.mean(np.abs(cur - ref - exposure_offset(cur, ref)), axis=2)
    return cv2.erode(residual, np.ones((3, 3), np.uint8))


def alpha_proposal(before, current, after, *, low=config.TEMPORAL_MATTE_LOW,
                   high=config.TEMPORAL_MATTE_HIGH, method="local",
                   min_area=config.TEMPORAL_MATTE_MIN_AREA, grow=config.TEMPORAL_MATTE_GROW):
    """Alpha from the local fit I = t * B + foreground (t from cov/var), or the raw difference.

    The fit closes the checkerboard holes of a raw diff mask; shadows and moving pieces
    can still satisfy it, so this remains a proposal.
    """
    if before.shape != current.shape or after.shape != current.shape:
        raise ValueError("Three-frame masks require the same rectified raster geometry")
    if not 0 <= low < high:
        raise ValueError("Require 0 <= low < high")
    strength = np.minimum(difference(current, before), difference(current, after))
    diff_alpha = np.clip((strength - low) / (high - low), 0., 1.)
    if method == "difference":
        return diff_alpha
    if method != "local":
        raise ValueError("Matte method must be local or difference")
    cur = current.astype(np.float32)
    # A region belongs to either endpoint of the move, not their average. Decide per
    # neighbourhood: per pixel, the hand itself picks whichever endpoint it resembles.
    backgrounds = []
    errors = []
    for image in (before, after):
        ref = image.astype(np.float32)
        offset = exposure_offset(cur, ref)
        backgrounds.append(ref + offset)
        errors.append(cv2.boxFilter(np.mean(np.abs(cur - ref - offset), axis=2), -1, (31, 31)))
    bg = np.where((errors[0] <= errors[1])[..., None], backgrounds[0], backgrounds[1])

    def mean(image):
        return cv2.boxFilter(image, -1, (61, 61), normalize=True)

    mean_b, mean_i = mean(bg), mean(cur)
    variance = np.maximum(0., np.sum(mean(bg * bg) - mean_b * mean_b, axis=2))
    covariance = np.sum(mean(bg * cur) - mean_b * mean_i, axis=2)
    local = np.clip(1. - covariance / np.maximum(variance, 64.), 0., 1.)
    # The fit is only a transmission when 0 <= t <= 1 on a textured patch. Flat
    # patches cannot identify it, and t > 1 (a bright hand over a dark piece
    # varied MORE than the board) punched holes into opaque arms — measured
    # 2026-09-11 on 009564: strength 99 at the holes against 49 on the arm.
    valid = (variance >= 64.) & (covariance <= variance)
    local = np.where(valid, local, diff_alpha)
    support = cv2.dilate((strength > low).astype(np.uint8), np.ones((21, 21), np.uint8))
    return solid_blobs(local * support, min_area=min_area, grow=grow)


def enclosed(mask):
    """Pixels outside [mask] that no path reaches from the border: its holes."""
    outside = np.pad(~mask, 1, constant_values=True).astype(np.uint8)
    cv2.floodFill(outside, None, (0, 0), 2)
    return outside[1:-1, 1:-1] == 1


def solid_blobs(alpha, *, min_area=config.TEMPORAL_MATTE_MIN_AREA,
                grow=config.TEMPORAL_MATTE_GROW):
    """A hand has no holes and is not a speckle: fill enclosed gaps, drop small islands."""
    solid = (alpha > .5).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(solid, connectivity=8)
    keep = np.isin(labels, [i for i in range(1, count)
                            if stats[i, cv2.CC_STAT_AREA] >= min_area * alpha.size])
    holes = enclosed(keep)
    # Dips inside the blob (piece texture under the hand) close to their surroundings;
    # a uniform translucent blur is left at its own level.
    # Rect kernels: separable, so 51 px costs what 5 px does; ellipses cost 20 s per run.
    closed = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, np.ones((51, 51), np.uint8))
    filled = np.where(keep | holes, np.maximum(alpha, closed), alpha)
    # The core of a blob is one level — its upper quantile — and only the rim keeps a gradient.
    # Assigned per component of the FILLED silhouette, so a wide hole gets it too.
    level = np.zeros_like(alpha)
    _, filled_labels = cv2.connectedComponents((keep | holes).astype(np.uint8), connectivity=8)
    for i in np.unique(filled_labels[keep]):
        component = filled_labels == i
        level[component] = np.quantile(alpha[component & keep], .8)
    # The blob grows by [grow] px: a moving hand's blurred rim differs too little from the
    # plate to pass `low`, so the measured edge sits inside the real one.
    disc = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1, 2 * grow + 1))
    body = cv2.dilate((keep | holes).astype(np.uint8), disc)
    # Smooth the outline itself: blur the silhouette and re-threshold, which rounds
    # jagged edges without moving the boundary on average.
    square = np.ones((21, 21), np.uint8)
    body = cv2.morphologyEx(cv2.morphologyEx(body, cv2.MORPH_OPEN, square), cv2.MORPH_CLOSE, square)
    body = cv2.GaussianBlur(body.astype(np.float32), (0, 0), 12.) > .5
    body |= enclosed(body)
    level = cv2.dilate(level, np.ones((2 * grow + 31, 2 * grow + 31), np.uint8))
    filled = np.where(body, np.maximum(filled, level), 0.)
    return cv2.GaussianBlur(filled, (0, 0), 3.)


def refine_edges(image, alpha, *, inner=15, outer=20, scale=.5):
    """Closed-form matting (Levin 2008) pulls the rim onto the image's own edge.

    Trimap from our silhouette: core in by [inner] = foreground, band out by [outer] =
    unknown. Solved at [scale]: the solver is the cost, a 2-px rim on a 116-px cell is not.
    """
    from pymatting import estimate_alpha_cf

    body = (alpha > .5).astype(np.uint8)
    if not body.any():
        return alpha
    disc = cv2.getStructuringElement
    core = cv2.erode(body, disc(cv2.MORPH_ELLIPSE, (2 * inner + 1, 2 * inner + 1)))
    reach = cv2.dilate(body, disc(cv2.MORPH_ELLIPSE, (2 * outer + 1, 2 * outer + 1)))
    trimap = np.where(core == 1, 1., np.where(reach == 1, .5, 0.)).astype(np.float32)
    h, w = alpha.shape
    size = (max(1, round(w * scale)), max(1, round(h * scale)))
    small = cv2.resize(trimap, size, interpolation=cv2.INTER_NEAREST)
    rgb = cv2.resize(cv2.cvtColor(image, cv2.COLOR_BGR2RGB), size, interpolation=cv2.INTER_AREA)
    fine = estimate_alpha_cf(rgb.astype(np.float64) / 255., small.astype(np.float64))
    out = cv2.resize(np.clip(fine, 0., 1.).astype(np.float32), (w, h), interpolation=cv2.INTER_LINEAR)
    return np.where(trimap == .5, out, trimap)


def bracketing(rows, target, *, max_gap_s=config.TEMPORAL_MATTE_MAX_GAP_S,
               peers=config.TEMPORAL_MATTE_PEERS):
    """Nearest clean neighbour each side, plus up to [peers] frames of its interval.

    The nearest one must be close in time with at most one move between; the rest
    share its ply and FEN, so the board is static and their median is a cleaner plate.
    """
    def index(row):
        return int(row["frame"].rsplit("/", 1)[-1].rsplit("\\", 1)[-1].split(".")[0])

    try:
        here = index(target)
        clean = [r for r in rows if r["board"].replace("\\", "/").rsplit("/", 2)[-2] == "boards"]
        before = [r for r in clean if index(r) < here]
        after = [r for r in clean if index(r) > here]
        if not before or not after:
            return None
        left, right = max(before, key=index), min(after, key=index)
        t = datetime.fromisoformat(target["ts"])
        gaps = ((t - datetime.fromisoformat(left["ts"])).total_seconds(),
                (datetime.fromisoformat(right["ts"]) - t).total_seconds())
        if not all(0 < g <= max_gap_s for g in gaps):
            return None
        if not 0 <= right["ply"] - left["ply"] <= 1 or not left["ply"] <= target["ply"] <= right["ply"]:
            return None
        sides = []
        for anchor, side in ((left, before), (right, after)):
            same = [r for r in side if (r["ply"], r["fen"]) == (anchor["ply"], anchor["fen"])]
            same.sort(key=lambda r: abs(index(r) - index(anchor)))
            sides.append(same[:max(1, peers)])
    # TODO: This broad fallback hides corrupt frame metadata as ordinary missing evidence.
    except (KeyError, TypeError, ValueError):
        return None
    return tuple(sides)


def read_board(recording, board, cache=None):
    if cache is not None and board in cache:
        return cache[board]
    image = cv2.imread(str(recording / board))
    if cache is not None:
        cache[board] = image
    return image


def plate(recording, rows, cache=None):
    """Per-pixel median of clean views: sensor noise and blur average out, the board stays.

    [cache] maps the tuple of board paths to the plate — frames of one interval share it.
    """
    key = tuple(r["board"] for r in rows)
    if cache is not None and key in cache:
        return cache[key]
    images = [read_board(recording, r["board"], cache) for r in rows]
    result = None
    if all(image is not None for image in images) and len({i.shape for i in images}) == 1:
        result = np.median(np.stack(images), axis=0).astype(np.uint8)
    if cache is not None:
        cache[key] = result
    return result


def propose_frame(recording, target, compatible, directory, *, low, high, method, max_gap_s,
                  peers, refine, rgba, device, cache):
    stem = Path(target["frame"]).stem
    row = {"frame": stem, "kind": "proposal", "method": method, "low": low, "high": high}
    pair = bracketing(compatible, target, max_gap_s=max_gap_s, peers=peers)
    if pair is None:
        return {**row, "skipped": "no suitable bracketing clean views"}
    before, after = pair
    images = [plate(recording, before, cache), read_board(recording, target["board"], cache),
              plate(recording, after, cache)]
    if any(image is None for image in images):
        return {**row, "skipped": "unreadable board"}
    if device != "cpu" and method == "local":
        from .temporal_matte_gpu import propose_alpha

        alpha = propose_alpha(*images, low=low, high=high, refine=refine, device=device)
    else:
        alpha = alpha_proposal(*images, low=low, high=high, method=method)
        if refine:
            alpha = refine_edges(images[1], alpha)
    mask = np.rint(alpha * 255).astype(np.uint8)
    # Alpha is 8-bit grey: PNG is lossless in 6 ms; lossless webp took 200 ms and comes back
    # as three channels. The RGBA view is a viewing aid, so it is optional and lossy.
    files = [(f"{stem}.alpha.png", mask, [cv2.IMWRITE_PNG_COMPRESSION, 1])]
    if rgba:
        view = cv2.cvtColor(images[1], cv2.COLOR_BGR2BGRA)
        view[..., 3] = mask
        files.append((f"{stem}.rgba.webp", view, [cv2.IMWRITE_WEBP_QUALITY, 90]))
    for filename, image, flags in files:
        if not cv2.imwrite(str(directory / filename), image, flags):
            raise OSError(f"Cannot write {directory / filename}")
    return {**row, "before": [Path(r["frame"]).stem for r in before],
            "after": [Path(r["frame"]).stem for r in after],
            "alpha": f"{stem}.alpha.png", "rgba": f"{stem}.rgba.webp" if rgba else None,
            "fraction_above_half": float(np.mean(alpha > .5))}


def _propose_chunk(recording, targets, compatible, directory, options):
    cache = {}
    return [propose_frame(recording, t, compatible, directory, cache=cache, **options) for t in targets]


def propose_session(session_id, *, frames=None, low=config.TEMPORAL_MATTE_LOW,
                    high=config.TEMPORAL_MATTE_HIGH,
                    max_gap_s=config.TEMPORAL_MATTE_MAX_GAP_S, method="local",
                    peers=config.TEMPORAL_MATTE_PEERS, refine=True, rgba=False, workers=1,
                    device="cpu"):
    if method not in {"local", "difference"}:
        raise ValueError("Matte method must be local or difference")
    if not all(math.isfinite(v) for v in (low, high, max_gap_s)) or not 0 <= low < high or max_gap_s <= 0:
        raise ValueError("Require finite 0 <= low < high and positive max-gap-s")
    recording, _ = session_dir(session_id)
    stamp = source_stamp(recording)
    profile = _profile_for_session(read_session_meta(recording), None)
    entries = read_log(recording)
    # Candidates are filtered by coverage; ours must not count, or an adopted frame drops out
    # of the next run and `adopt` then deletes its own row (650 -> 631 on 00-39-57).
    flags, stale = load_flags(recording, session_id, entries, sam_matte(recording))
    if stale:
        raise ValueError("Temporal scan is stale; run session temporal-scan first")
    wanted = set(frames) if frames is not None else {f["frame"] for f in flags}
    compatible = [r for r in entries if usable_board(r, profile) and r.get("board_straightened")]
    targets = [r for r in compatible if Path(r["frame"]).stem in wanted]
    directory = config.DATA.reports / "temporal-mattes" / recording.name / method
    directory.mkdir(parents=True, exist_ok=True)
    options = {"low": low, "high": high, "method": method, "max_gap_s": max_gap_s,
               "peers": peers, "refine": refine, "rgba": rgba, "device": device}
    workers = max(1, min(workers, len(targets) or 1))
    # Contiguous chunks, never round-robin: neighbours of one interval share a plate cache.
    bounds = [len(targets) * i // workers for i in range(workers + 1)]
    chunks = [targets[bounds[i]:bounds[i + 1]] for i in range(workers)]
    if workers == 1:
        result = _propose_chunk(recording, targets, compatible, directory, options)
    else:
        from concurrent.futures import ProcessPoolExecutor

        with ProcessPoolExecutor(workers) as pool:
            parts = pool.map(_propose_chunk, [recording] * workers, chunks, [compatible] * workers,
                             [directory] * workers, [options] * workers)
            result = [row for part in parts for row in part]
    result = [{"frame": r["frame"], "session_id": session_id, **r} for r in result]
    if source_stamp(recording) != stamp:
        raise RuntimeError("Source changed during matting; proposals must be regenerated")
    report = directory / "proposals.jsonl"
    temp = report.with_suffix(".jsonl.tmp")
    temp.write_text("".join(json.dumps(r) + "\n" for r in result), encoding="utf-8")
    temp.replace(report)
    metadata = {"source": stamp, "max_gap_s": max_gap_s, "method": method, "peers": peers,
                "refine": refine, "device": device, "low": low, "high": high,
                "training_alpha_updated": False}
    (directory / "proposals.meta.json").write_text(json.dumps(metadata), encoding="utf-8")
    return {"path": report, "proposed": sum(r.get("alpha") is not None for r in result),
            "skipped": sum("skipped" in r for r in result), "requested": len(wanted)}


def sam_matte(recording):
    """`read_matte` without our own rows: coverage SAM (or the pen) measured, nothing else."""
    path = recording / "matte.jsonl"
    if not path.is_file():
        return {}
    rows = (json.loads(s) for s in path.read_text(encoding="utf-8").splitlines() if s.strip())
    return {r["frame"]: r["coverage"] for r in rows
            if r.get("coverage") and r.get("source") not in ("temporal", "upsert")}


def adopt_proposals(session_id, *, method="local"):
    """Proposals with a hand become matte rows, the way SAM's do — for frames SAM never cut.

    SAM's rows and files are never touched; our own (`source: temporal`) are replaced whole,
    so a rerun refreshes them. The matte lane lists the frame for the same human check.
    """
    from .calibration import load_profile
    from .labeling import MATTE_DIRTY
    from .matte import coverage_of

    recording, _ = session_dir(session_id)
    directory = config.DATA.reports / "temporal-mattes" / recording.name / method
    report = directory / "proposals.jsonl"
    if not report.is_file():
        raise FileNotFoundError(f"{session_id}: no proposals — run session temporal-mattes first")
    require_fresh_proposals(directory, recording)
    profile = load_profile(read_session_meta(recording)["profile"])
    entries = {Path(r["frame"]).stem: r for r in read_log(recording)}
    matte_path = recording / "matte.jsonl"
    lines = matte_path.read_text(encoding="utf-8").splitlines() if matte_path.is_file() else []
    kept_lines = [s for s in lines if s.strip() and json.loads(s).get("source") != "temporal"]
    ours = {json.loads(s)["frame"] for s in lines if s.strip()} - {json.loads(s)["frame"] for s in kept_lines}
    have = {json.loads(s)["frame"] for s in kept_lines}
    (recording / "mattes").mkdir(exist_ok=True)
    adopted, empty, kept = 0, 0, 0
    fresh = []
    for row in (json.loads(s) for s in report.read_text(encoding="utf-8").splitlines() if s.strip()):
        stem, entry = row["frame"], entries.get(row["frame"])
        if not row.get("alpha") or entry is None:
            continue
        # A file without any row is ours: SAM writes row and file together and leaves no
        # orphans (0 in six untouched sessions, 2026-09-11); an aborted adopt does.
        if stem in have:
            kept += 1
            continue
        target = recording / "mattes" / f"{stem}.webp"
        alpha = cv2.imread(str(directory / row["alpha"]), cv2.IMREAD_GRAYSCALE)
        coverage = coverage_of(alpha.astype(np.float32) / 255., entry, profile)
        if max(coverage.values()) <= MATTE_DIRTY:
            empty += 1
            continue
        if not cv2.imwrite(str(target), alpha):
            raise OSError(f"Cannot write matte for {stem}")
        fresh.append(json.dumps({"frame": stem, "ply": entry.get("ply"),
                                 "dirty_reason": entry.get("dirty_reason"), "source": "temporal",
                                 "concepts": {"temporal": round(row["fraction_above_half"], 4)},
                                 "coverage": coverage,
                                 "cells_over_half": sum(v > .5 for v in coverage.values())}))
        adopted += 1
    temp = matte_path.with_suffix(".jsonl.tmp")
    temp.write_text("".join(s + "\n" for s in kept_lines + fresh), encoding="utf-8")
    temp.replace(matte_path)
    return {"path": matte_path, "adopted": adopted, "empty": empty, "kept_sam": kept,
            "replaced": len(ours)}


def require_fresh_proposals(directory, recording) -> None:
    """Die Vorschlaege muessen zu der Quelle passen, aus der sie entstanden sind.

    `upsert_proposals` ersetzt GANZE Frames; ein veralteter Satz stempelt sonst Alphas von
    vorgestern auf den Korpus.
    """
    metadata_path = directory / "proposals.meta.json"
    if not metadata_path.is_file():
        return
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if metadata.get("source") != source_stamp(recording):
        raise RuntimeError("Proposal source changed; proposals must be regenerated")


def upsert_proposals(session_id, *, method="local", solid=.5):
    """Where SAM found NOTHING on a frame, temporal's matte replaces it whole — never per cell.

    Motion blur is what SAM misses (459 frames in four sessions, 2026-09-11). SAM's file
    survives as `<stem>.sam.webp`; hand-fixed frames and frames where SAM found a hand stay.
    """
    from .calibration import load_profile
    from .labeling import MATTE_DIRTY
    from .matte import FIXED_SUFFIX, coverage_of

    recording, _ = session_dir(session_id)
    directory = config.DATA.reports / "temporal-mattes" / recording.name / method
    report = directory / "proposals.jsonl"
    if not report.is_file():
        raise FileNotFoundError(f"{session_id}: no proposals — run session temporal-mattes first")
    # Dieselbe Wache wie `adopt_proposals`: hier werden GANZE Frames ersetzt, veraltete Alphas
    # waeren also teurer als dort.
    require_fresh_proposals(directory, recording)
    profile = load_profile(read_session_meta(recording)["profile"])
    entries = {Path(r["frame"]).stem: r for r in read_log(recording)}
    matte_path = recording / "matte.jsonl"
    lines = [s for s in (matte_path.read_text(encoding="utf-8").splitlines()
                         if matte_path.is_file() else []) if s.strip()]
    kept_lines = [s for s in lines if json.loads(s).get("source") not in ("upsert", "merged")]
    replaced = len(lines) - len(kept_lines)
    mattes = recording / "mattes"
    for backup in mattes.glob("*.sam.webp"):
        backup.replace(mattes / backup.name.replace(".sam.webp", ".webp"))
    sam = {}
    for row in (json.loads(s) for s in kept_lines):
        if row.get("coverage") and row.get("source") != "temporal":
            sam[row["frame"]] = row
    stamp_now = datetime.now(UTC).isoformat()
    upserted, found, fixed = 0, 0, 0
    fresh = []
    for row in (json.loads(s) for s in report.read_text(encoding="utf-8").splitlines() if s.strip()):
        stem, entry = row["frame"], entries.get(row["frame"])
        if not row.get("alpha") or entry is None or stem not in sam:
            continue
        if (mattes / f"{stem}{FIXED_SUFFIX}").is_file():
            fixed += 1
            continue
        if max(sam[stem]["coverage"].values(), default=0.) > MATTE_DIRTY:
            found += 1
            continue
        alpha = cv2.imread(str(directory / row["alpha"]), cv2.IMREAD_GRAYSCALE)
        coverage = coverage_of(alpha.astype(np.float32) / 255., entry, profile)
        if max(coverage.values()) <= solid:
            continue
        target = mattes / f"{stem}.webp"
        if target.is_file():
            target.replace(mattes / f"{stem}.sam.webp")
        if not cv2.imwrite(str(target), alpha):
            raise OSError(f"Cannot write matte for {stem}")
        fresh.append(json.dumps({"frame": stem, "ply": entry.get("ply"),
                                 "dirty_reason": entry.get("dirty_reason"), "source": "upsert",
                                 "merged_at": stamp_now,
                                 "concepts": {"temporal": round(row["fraction_above_half"], 4)},
                                 "coverage": coverage,
                                 "cells_over_half": sum(v > .5 for v in coverage.values())}))
        upserted += 1
    temp = matte_path.with_suffix(".jsonl.tmp")
    temp.write_text("".join(s + "\n" for s in kept_lines + fresh), encoding="utf-8")
    temp.replace(matte_path)
    return {"path": matte_path, "upserted": upserted, "sam_found": found, "fixed": fixed,
            "replaced": replaced}


def prune_dead_rows(session_id):
    """Drop a `source: temporal` row once SAM has re-cut the frame: SAM's later row already wins."""
    recording, _ = session_dir(session_id)
    matte_path = recording / "matte.jsonl"
    if not matte_path.is_file():
        return {"path": matte_path, "dropped": 0, "kept": 0}
    lines = [s for s in matte_path.read_text(encoding="utf-8").splitlines() if s.strip()]
    rows = [json.loads(s) for s in lines]
    superseded = set()
    for row in rows:
        if row.get("source") not in ("temporal", "upsert") and row.get("coverage") is not None:
            superseded.add(row["frame"])
    keep = [line for line, row in zip(lines, rows, strict=True)
            if not (row.get("source") == "temporal" and row["frame"] in superseded)]
    if len(keep) != len(lines):
        temp = matte_path.with_suffix(".jsonl.tmp")
        temp.write_text("".join(line + "\n" for line in keep), encoding="utf-8")
        temp.replace(matte_path)
    return {"path": matte_path, "dropped": len(lines) - len(keep), "kept": len(keep)}
