"""Settle-Messung am Video: ab welchem Frame zeigt das Bild den naechsten Zug."""

from __future__ import annotations

from concurrent.futures import ProcessPoolExecutor
from contextlib import closing, nullcontext
from functools import partial
from pathlib import Path

from ..labeling import crops_for_frame
from ..recording import Recording
from ..work_audit import record_interval
from .timeline import changed_squares

#: How far back a commit's settle point is looked for, and how far ahead the "after" anchor sits.
SETTLE_BACK, SETTLE_AHEAD = 180, 40


#: Below this mean absolute difference the two anchors are the same picture — the square carries no
#: visible change and no settle point can be found for it.
SETTLE_MIN_DELTA = 8.0


def measure_settle(video: Path, candidate: dict, profile,
                   rotate: int | None = None,
                   workers: int = 1, executor=None) -> dict[int, dict[str, int]]:
    """`ply -> {square: the frame from which the image already shows the move}`.

    The engine commits on QUIET: the image leads the commit by up to 4.6 s (1.8 s p90), so a
    fixed margin is the wrong instrument. Nearest-neighbour between two anchors; alike anchors
    report nothing. [rotate] is applied before cropping: the quad lives in the rotated view."""
    quad = candidate["geometry"]["corners"]
    moves = candidate["moves"]
    out: dict[int, dict[str, int]] = {}
    jobs = []
    for i, move in enumerate(moves):
        before = moves[i - 1].get("fen_after") if i else candidate.get("start_fen")
        touched = changed_squares(before, move.get("fen_after"))
        commit = int(move["frame"])
        if not touched or commit < SETTLE_BACK:
            continue
        lo, hi = commit - SETTLE_BACK, commit + SETTLE_AHEAD
        record_interval("settle windows", video.resolve(), lo, hi)
        jobs.append({"move": move, "touched": touched, "commit": commit, "lo": lo, "hi": hi})

    clusters: list[list[dict]] = []
    for job in sorted(jobs, key=lambda item: item["lo"]):
        if not clusters or job["lo"] > max(item["hi"] for item in clusters[-1]) + 1:
            clusters.append([job])
        else:
            clusters[-1].append(job)

    for cluster in clusters:
        record_interval("video frames", video.resolve(),
                        min(job["lo"] for job in cluster), max(job["hi"] for job in cluster))
    if workers > 1 and len(jobs) > 1:
        return _settle_parallel(jobs, video=video, quad=quad, profile=profile,
                                rotate=rotate, workers=workers, executor=executor)
    # Disjoint windows in one segment share their forward decode, including the run-up.
    recording = Recording(video)
    grouped: dict[int, list[dict]] = {}
    for cluster in clusters:
        base = recording.segment_base(min(job["lo"] for job in cluster))
        grouped.setdefault(base, []).extend(cluster)
    clusters = list(grouped.values())
    fn = partial(settle_cluster, video=video, quad=quad, profile=profile, rotate=rotate)
    parts = [fn(c) for c in clusters]
    for part in parts:
        for ply, squares_seen in part.items():
            out.setdefault(ply, {}).update(squares_seen)
    return out


def _settle_requests(jobs, *, anchors=False):
    requested: dict[int, set[str]] = {}
    for job in jobs:
        indices = (job["lo"], job["hi"]) if anchors else range(job["lo"], job["hi"] + 1)
        for idx in indices:
            requested.setdefault(idx, set()).update(job["touched"])
    return [(idx, tuple(sorted(squares))) for idx, squares in sorted(requested.items())]


def _settle_frames(requests, *, video, quad, profile, rotate):
    """Decode only requested small crops, walking forward from an exact segment boundary."""
    import numpy as np

    if not requests:
        return
    wanted = dict(requests)
    last = max(wanted)
    with closing(Recording(video).take(wanted, rotate)) as stream:
        for idx, frame in stream:
            squares = wanted[idx]
            crops = crops_for_frame(frame, quad, profile, out_size=(48, 48), squares=squares)
            yield idx, {sq: crop.astype(np.int16) for sq, crop in zip(squares, crops, strict=True)}
            if idx >= last:
                break


def _settle_compare(requests, *, jobs, video, quad, profile, rotate):
    """Return the latest pre-position match per job/square; no images cross the boundary."""
    import numpy as np

    latest: dict[int, dict[str, int]] = {}
    for idx, cells in _settle_frames(requests, video=video, quad=quad, profile=profile, rotate=rotate):
        for number, job in enumerate(jobs):
            if not job["lo"] <= idx <= job["hi"]:
                continue
            for sq, (pre, post) in job["anchors"].items():
                if float(np.abs(cells[sq] - pre).mean()) < float(np.abs(cells[sq] - post).mean()):
                    latest.setdefault(number, {})[sq] = idx
    return latest


def _settle_anchors(requests, *, video, quad, profile, rotate):
    """Only the small reference crops are returned, never decoded source frames."""
    return dict(_settle_frames(requests, video=video, quad=quad, profile=profile, rotate=rotate))


def _settle_parallel(jobs, *, video, quad, profile, rotate, workers, executor=None):
    """Read anchors once, then balance the comparison frames independently of cluster lengths."""
    import numpy as np

    recording = Recording(video)
    anchor_chunks: dict[int, list] = {}
    for request in _settle_requests(jobs, anchors=True):
        anchor_chunks.setdefault(recording.segment_base(request[0]), []).append(request)
    if not anchor_chunks:
        return {}
    with (nullcontext(executor) if executor is not None
          else ProcessPoolExecutor(max_workers=workers)) as pool:
        anchor_fn = partial(_settle_anchors, video=video, quad=quad, profile=profile, rotate=rotate)
        anchors = {idx: cells for part in pool.map(anchor_fn, anchor_chunks.values())
                   for idx, cells in part.items()}
        valid = []
        for job in sorted(jobs, key=lambda j: j["lo"]):
            lo, hi = job["lo"], job["hi"]
            if lo not in anchors or hi not in anchors:
                continue
            pairs = {sq: (anchors[lo][sq], anchors[hi][sq]) for sq in job["touched"]
                     if float(np.abs(anchors[lo][sq] - anchors[hi][sq]).mean()) >= SETTLE_MIN_DELTA}
            if pairs:
                valid.append({**job, "anchors": pairs, "touched": tuple(pairs)})
        requests = _settle_requests(valid)
        if not requests:
            return {}
        size = -(-len(requests) // workers)
        chunks = [requests[i:i + size] for i in range(0, len(requests), size)]
        fn = partial(_settle_compare, jobs=valid, video=video, quad=quad, profile=profile, rotate=rotate)
        parts = list(pool.map(fn, chunks))
    latest: dict[int, dict[str, int]] = {}
    for part in parts:
        for number, squares in part.items():
            combined = latest.setdefault(number, {})
            for sq, idx in squares.items():
                combined[sq] = max(combined.get(sq, -1), idx)
    out: dict[int, dict[str, int]] = {}
    for number, job in enumerate(valid):
        for sq, idx in latest.get(number, {}).items():
            out.setdefault(int(job["move"]["ply"]), {})[sq] = min(idx + 1, job["commit"])
    return out


def settle_cluster(cluster: list[dict], *, video: Path, quad, profile,
                   rotate) -> dict[int, dict[str, int]]:
    """Serial reference: decode a group once, then scan each job backwards from its anchor."""
    import numpy as np

    out: dict[int, dict[str, int]] = {}
    cells = dict(_settle_frames(_settle_requests(cluster), video=video, quad=quad,
                                profile=profile, rotate=rotate))

    for job in cluster:
        move, touched = job["move"], job["touched"]
        commit, lo, hi = job["commit"], job["lo"], job["hi"]
        if lo not in cells or hi not in cells:
            continue
        for sq in touched:
            pre, post = cells[lo][sq], cells[hi][sq]
            if float(np.abs(pre - post).mean()) < SETTLE_MIN_DELTA:
                continue
            for f in range(hi, lo - 1, -1):
                cell = cells.get(f)
                if cell is None:
                    continue
                if float(np.abs(cell[sq] - pre).mean()) < float(np.abs(cell[sq] - post).mean()):
                    out.setdefault(int(move["ply"]), {})[sq] = min(f + 1, commit)
                    break
    return out
