"""Three-frame foreground proposals, separate from measured training alpha: a pixel must disagree
with BOTH bracketing views. Review proposals, never automatic coverage labels.
"""

from __future__ import annotations

import json
import math
from datetime import UTC, datetime
from pathlib import Path

import cv2
import numpy as np

from . import config, locks, provenance
from .ioutil import read_jsonl, stamp_of, write_atomic, write_rows, write_rows_guarded
from .labeling import _profile_for_session, usable_board
from .matte_publish import publish, stage, staging
from .session_store.log import read_log_rows
from .session_store.matte import measured_coverage, read_matte
from .session_store.names import BOARD_DIR, MATTE_DIR, MATTE_FILE
from .session_store.paths import read_session_meta, session_dir
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
    """Alpha from the local fit I = t * B + foreground, or the raw difference; closes the
    checkerboard holes of a raw diff. Shadows and moving pieces still fit, so a proposal only.
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
    # A region belongs to either endpoint of the move, not their average: decided per neighbourhood.
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
    # Only 0 <= t <= 1 on a textured patch is a transmission; t > 1 (bright hand over dark piece)
    # punched holes into opaque arms.
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
    # Rect kernels are separable, so 51 px costs what 5 px does; ellipses cost 20 s per run.
    closed = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, np.ones((51, 51), np.uint8))
    filled = np.where(keep | holes, np.maximum(alpha, closed), alpha)
    # The core of a blob is one level (its upper quantile), per component of the FILLED silhouette.
    level = np.zeros_like(alpha)
    _, filled_labels = cv2.connectedComponents((keep | holes).astype(np.uint8), connectivity=8)
    for i in np.unique(filled_labels[keep]):
        component = filled_labels == i
        level[component] = np.quantile(alpha[component & keep], .8)
    # A moving hand's blurred rim differs too little from the plate to pass `low`, so the blob
    # grows.
    disc = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1, 2 * grow + 1))
    body = cv2.dilate((keep | holes).astype(np.uint8), disc)
    square = np.ones((21, 21), np.uint8)
    body = cv2.morphologyEx(cv2.morphologyEx(body, cv2.MORPH_OPEN, square), cv2.MORPH_CLOSE, square)
    body = cv2.GaussianBlur(body.astype(np.float32), (0, 0), 12.) > .5
    body |= enclosed(body)
    level = cv2.dilate(level, np.ones((2 * grow + 31, 2 * grow + 31), np.uint8))
    filled = np.where(body, np.maximum(filled, level), 0.)
    return cv2.GaussianBlur(filled, (0, 0), 3.)


def refine_edges(image, alpha, *, inner=15, outer=20, scale=.5):
    """Closed-form matting (Levin 2008) pulls the rim onto the image's own edge; solved at [scale],
    because the solver is the cost.
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
    """Nearest clean neighbour each side (at most one move between), plus up to [peers] frames of
    its interval, whose median is a cleaner plate.
    """
    def index(row):
        return int(row["frame"].rsplit("/", 1)[-1].rsplit("\\", 1)[-1].split(".")[0])

    # Eine Zeile OHNE Brett ist der gewoehnliche Fall; ein kaputtes `ts` oder fehlendes `ply` ist
    # Schaden und darf nicht wie "kein Nachbar" aussehen.
    try:
        here = index(target)
        clean = [r for r in rows if Path(str(r.get("board", ""))).parent.name == BOARD_DIR]
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
    except (KeyError, TypeError, ValueError) as e:
        raise ValueError(f"frame {target.get('frame')}: corrupt metadata ({e})") from e
    return tuple(sides)


def read_board(recording, board, cache=None):
    if cache is not None and board in cache:
        return cache[board]
    image = cv2.imread(str(recording / board))
    if cache is not None:
        cache[board] = image
    return image


def plate(recording, rows, cache=None):
    """Per-pixel median of clean views. [cache] maps the tuple of board paths to the plate."""
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
    # PNG: lossless in 6 ms; lossless webp took 200 ms and came back as three channels.
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


def propose_session(session_id, *, low=config.TEMPORAL_MATTE_LOW,
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
    entries = read_log_rows(recording)
    # Our coverage must not count, or an adopted frame drops out of the next run and `adopt` deletes
    # its own row.
    flags, stale = load_flags(recording, session_id, entries, sam_matte(recording))
    if stale:
        raise ValueError("Temporal scan is stale; run session temporal-scan first")
    wanted = {f["frame"] for f in flags}
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
    write_rows(report, result)
    metadata = {"source": stamp, "max_gap_s": max_gap_s, "method": method, "peers": peers,
                "refine": refine, "device": device, "low": low, "high": high,
                "training_alpha_updated": False}
    write_proposal_meta(directory / "proposals.meta.json", metadata)
    return {"path": report, "proposed": sum(r.get("alpha") is not None for r in result),
            "skipped": sum("skipped" in r for r in result), "requested": len(wanted)}


def write_proposal_meta(path: Path, metadata: dict) -> None:
    # Atomar: eine halbe Datei liesse `require_fresh_proposals` an einem JSONDecodeError sterben
    # statt an seinem "regenerate them".
    write_atomic(path, json.dumps(metadata))


#: Bewacht: `matte.alpha_worker` haengt parallel an.
_CONTESTED = ("matte.jsonl changed while {what} — the alpha worker is writing it. "
              "Let it finish and run this again; nothing was written.")


def sam_matte(recording):
    """`read_matte` without our own rows: coverage SAM (or the pen) measured, nothing else."""
    return read_matte(recording, skip_sources=("temporal", "upsert"))


def matted_frames(rows: list[dict]) -> set[str]:
    """Welche Frames eine MESSUNG tragen: eine spaetere Absage loescht die fruehere, sonst ging ein
    abgesagtes Frame mit `coverage = 0.0` ins Training.
    """
    return set(measured_coverage(rows))


def adopt_proposals(session_id, *, method="local"):
    """Proposals with a hand become matte rows for frames SAM never cut. SAM's rows and files are
    never touched; our own (`source: temporal`) are replaced whole.
    """
    from .calibration import load_profile
    from .cell_rule import PIECE_VISIBLE_MAX
    from .matte import coverage_of

    recording, _ = session_dir(session_id)
    directory = config.DATA.reports / "temporal-mattes" / recording.name / method
    report = directory / "proposals.jsonl"
    if not report.is_file():
        raise FileNotFoundError(f"{session_id}: no proposals — run session temporal-mattes first")
    require_fresh_proposals(directory, recording)
    profile = load_profile(read_session_meta(recording)["profile"])
    entries = {Path(r["frame"]).stem: r for r in read_log_rows(recording)}
    matte_path = recording / MATTE_FILE
    matte_stamp = stamp_of(matte_path)
    rows_before = read_jsonl(matte_path)
    kept_rows = [r for r in rows_before if r.get("source") != "temporal"]
    ours = {r["frame"] for r in rows_before} - {r["frame"] for r in kept_rows}
    # Wie `sam_matte`: eine Absage ist die JUENGERE Aussage und loescht die fruehere Messung.
    have = matted_frames(kept_rows)
    # Dieselbe Herkunft wie SAMs Zeilen: diese Coverage ist gegen DIESEN Export geschnitten.
    stamp = provenance.source(recording)
    (recording / MATTE_DIR).mkdir(exist_ok=True)
    adopted, empty, kept = 0, 0, 0
    fresh = []
    with staging() as staged:
        for row in read_jsonl(report):
            stem, entry = row["frame"], entries.get(row["frame"])
            if not row.get("alpha") or entry is None:
                continue
            # A file without any row is ours: an aborted adopt leaves orphans.
            if stem in have:
                kept += 1
                continue
            alpha = cv2.imread(str(directory / row["alpha"]), cv2.IMREAD_GRAYSCALE)
            coverage = coverage_of(alpha.astype(np.float32) / 255., entry, profile)
            if max(coverage.values()) <= PIECE_VISIBLE_MAX:
                empty += 1
                continue
            stage(staged, stem, alpha, recording / MATTE_DIR / f"{stem}.webp")
            fresh.append({"frame": stem, "ply": entry.get("ply"),
                          "dirty_reason": entry.get("dirty_reason"), "source": "temporal",
                          **({"_source": stamp} if stamp else {}),
                          "concepts": {"temporal": round(row["fraction_above_half"], 4)},
                          "coverage": coverage,
                          "cells_over_half": sum(v > .5 for v in coverage.values())})
            adopted += 1
        # A SAM row that landed meanwhile makes the frame SAM's: its pixels stay, ours are dropped.
        publish(recording, "adopt",
                lambda: write_rows_guarded(matte_path, kept_rows + fresh, matte_stamp,
                                           what=_CONTESTED.format(what="adopting")),
                staged, _without("temporal"),
                skip=lambda rows: matted_frames([r for r in rows if r.get("source") != "temporal"]))
    return {"path": matte_path, "adopted": adopted, "empty": empty, "kept_sam": kept,
            "replaced": len(ours)}


def _without(source: str):
    """The retraction: our rows of the frames whose alpha could not be placed."""
    return lambda rows, failed: [r for r in rows
                                 if not (r.get("source") == source and r.get("frame") in failed)]


def require_fresh_proposals(directory, recording) -> None:
    """Die Vorschlaege muessen zu ihrer Quelle passen: `upsert_proposals` ersetzt GANZE Frames."""
    metadata_path = directory / "proposals.meta.json"
    if not metadata_path.is_file():
        # `propose_session` schreibt die Vorschlaege VOR der Meta; ohne Stempel keine Adoption.
        raise RuntimeError(f"{directory.name}: proposals carry no source stamp — regenerate them")
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if metadata.get("source") != source_stamp(recording):
        raise RuntimeError("Proposal source changed; proposals must be regenerated")


def upsert_proposals(session_id, *, method="local"):
    """Where SAM found NOTHING, temporal's matte replaces the frame whole — never per cell. Motion
    blur is what SAM misses; its file survives as `<stem>.sam.webp`.
    """
    from .calibration import load_profile
    from .cell_rule import PIECE_VISIBLE_MAX
    from .matte import FIXED_SUFFIX, coverage_of

    recording, _ = session_dir(session_id)
    directory = config.DATA.reports / "temporal-mattes" / recording.name / method
    report = directory / "proposals.jsonl"
    if not report.is_file():
        raise FileNotFoundError(f"{session_id}: no proposals — run session temporal-mattes first")
    # Dieselbe Wache wie `adopt_proposals`; hier werden GANZE Frames ersetzt.
    require_fresh_proposals(directory, recording)
    profile = load_profile(read_session_meta(recording)["profile"])
    entries = {Path(r["frame"]).stem: r for r in read_log_rows(recording)}
    matte_path = recording / MATTE_FILE
    matte_stamp = stamp_of(matte_path)
    rows_before = read_jsonl(matte_path)
    kept_rows = [r for r in rows_before if r.get("source") not in ("upsert", "merged")]
    replaced = len(rows_before) - len(kept_rows)
    mattes = recording / MATTE_DIR
    backups = {p.name.removesuffix(".sam.webp") for p in mattes.glob("*.sam.webp")}
    # SAMs Absage nimmt die fruehere Messung zurueck; sonst zaehlte die alte Zahl als `sam_found`.
    sam = measured_coverage(r for r in kept_rows if r.get("source") != "temporal")
    stamp_now = datetime.now(UTC).isoformat()
    stamp = provenance.source(recording)
    upserted, found, fixed = 0, 0, 0
    fresh = []
    with staging() as staged:
        for row in read_jsonl(report):
            stem, entry = row["frame"], entries.get(row["frame"])
            if not row.get("alpha") or entry is None or stem not in sam:
                continue
            if (mattes / f"{stem}{FIXED_SUFFIX}").is_file():
                fixed += 1
                continue
            if max(sam[stem]["coverage"].values(), default=0.) > PIECE_VISIBLE_MAX:
                found += 1
                continue
            alpha = cv2.imread(str(directory / row["alpha"]), cv2.IMREAD_GRAYSCALE)
            coverage = coverage_of(alpha.astype(np.float32) / 255., entry, profile)
            # Dieselbe Schwelle wie oben, kein zweiter Schnitt.
            if max(coverage.values()) <= PIECE_VISIBLE_MAX:
                continue
            stage(staged, stem, alpha, mattes / f"{stem}.webp")
            fresh.append({"frame": stem, "ply": entry.get("ply"),
                          "dirty_reason": entry.get("dirty_reason"), "source": "upsert",
                          "merged_at": stamp_now,
                          **({"_source": stamp} if stamp else {}),
                          "concepts": {"temporal": round(row["fraction_above_half"], 4)},
                          "coverage": coverage,
                          "cells_over_half": sum(v > .5 for v in coverage.values())})
            upserted += 1

        def write() -> None:
            write_rows_guarded(matte_path, kept_rows + fresh, matte_stamp,
                               what=_CONTESTED.format(what="upserting"))
            # Frueheres Upsert zurueck auf SAMs Alpha; SAMs Datei bleibt `.sam.webp`.
            for stem in backups - staged.keys():
                (mattes / f"{stem}.sam.webp").replace(mattes / f"{stem}.webp")

        def place(stem: str, tmp: Path, target: Path) -> None:
            if stem not in backups and target.is_file():
                target.replace(mattes / f"{stem}.sam.webp")
            tmp.replace(target)

        publish(recording, "upsert", write, staged, _without("upsert"), place=place)
    return {"path": matte_path, "upserted": upserted, "sam_found": found, "fixed": fixed,
            "replaced": replaced}


def pass_inputs(session_id) -> dict:
    """Was der Pass ausser dem Log las: `matte.jsonl` und die Eingaben seines Scans; nach dem
    letzten eigenen Schreiben genommen.
    """
    recording, _ = session_dir(session_id)
    try:
        scan = source_stamp(recording)
    except OSError:
        return {}
    return {"matte": provenance.file_stamp(recording / MATTE_FILE), "scan": scan}


def write_pass_report(session_id, report: dict, inputs: dict | None = None) -> Path:
    """Der Nachweis des Durchlaufs — gestempelt auf die Eingaben, zu denen seine Zahlen gehoeren."""
    recording, _ = session_dir(session_id)
    path = config.DATA.reports / "temporal-mattes" / recording.name / "pass.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    # `chain.ts` vergleicht `_source` und `_inputs`; eine halbe Datei ist kein JSON.
    seen = pass_inputs(session_id) if inputs is None else inputs
    write_atomic(path, json.dumps({**report, "_source": provenance.source(recording),
                                   **({"_inputs": seen} if seen else {})}))
    return path


def prune_dead_rows(session_id):
    """Drop a `source: temporal` row once SAM has re-cut the frame: SAM's later row already wins."""
    from .cell_rule import PIECE_VISIBLE_MAX

    recording, _ = session_dir(session_id)
    matte_path = recording / MATTE_FILE
    if not matte_path.is_file():
        return {"path": matte_path, "dropped": 0, "kept": 0}
    stamp = stamp_of(matte_path)
    rows = read_jsonl(matte_path)
    # `temporal` ist ein Frame, den SAM spaeter schneidet: seine Zeile gewinnt, auch leer. `upsert`
    # existiert, WEIL SAM nichts fand: nur ein Schnitt MIT Verdeckung ueberholt ihn.
    sam = measured_coverage(r for r in rows if r.get("source") not in ("temporal", "upsert"))

    def sam_rows(only_found: bool) -> set[str]:
        # DIESELBE Schwelle, die den Upsert anlegt: `any(...)` liess schon 0,0001 als Fund gelten.
        return {frame for frame, row in sam.items()
                if not only_found or max(row["coverage"].values(), default=0.) > PIECE_VISIBLE_MAX}

    cut, found = sam_rows(False), sam_rows(True)
    keep = [row for row in rows
            if not (row.get("source") == "temporal" and row["frame"] in cut)
            and not (row.get("source") == "upsert" and row["frame"] in found)]
    if len(keep) != len(rows):
        with locks.matte_ledger(recording, "prune"):
            write_rows_guarded(matte_path, keep, stamp, what=_CONTESTED.format(what="pruning"))
    return {"path": matte_path, "dropped": len(rows) - len(keep), "kept": len(keep)}
