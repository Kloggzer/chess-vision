"""Die Frame-Phasen des Exports in zusammenhaengenden Abschnitten auf Prozessen."""

from __future__ import annotations

from concurrent.futures import ProcessPoolExecutor, wait
from contextlib import nullcontext
from functools import partial
from pathlib import Path

from ..calibration import load_profile
from .boards import FIT_FAILED, FIT_KEPT, FIT_SOURCE, fit_rows_to_grid, rewarp_boards
from .decode import stream_frames
from .mesh import meshes_for_boards

#: Prozesse für die beiden Frame-Phasen. Vier, nicht mehr: jeder Worker hält Frames von 11 MB und
#: importiert cv2/numpy für sich, und die Abstürze dieser Maschine sind Speicher. 1 nimmt den
#: seriellen Weg; dass mehr dasselbe ergeben, halten `plan_chunks` und `merge_fit_stats` eigene
#: Tests (der hier frueher genannte `test_parallel_export_matches_serial` hat nie existiert).
EXPORT_WORKERS = 4


#: Unter so vielen Zeilen je Worker zahlt sich ein Prozess nicht: er kostet Start (~3 s auf
#: Windows) und den Vorlauf ab seiner Segmentgrenze.
MIN_CHUNK = 40


def plan_chunks(rows: list[dict], workers: int) -> list[list[dict]]:
    """Contiguous stretches of the recording, one per worker — never interleaved.

    Each chunk pays its own walk from the segment holding its first frame, so cutting by index
    keeps that at one partial segment per worker; a round-robin split would make every one of them
    walk the whole recording.
    """
    ordered = sorted(rows, key=lambda r: int(Path(r["frame"]).stem))
    if workers <= 1 or len(ordered) < 2 * MIN_CHUNK:
        return [ordered]
    n = min(workers, len(ordered) // MIN_CHUNK)
    size = -(-len(ordered) // n)
    return [ordered[i:i + size] for i in range(0, len(ordered), size)]


class ChunkProgress:
    """A worker's only way to say how far it is; the parent owns the single progress line.

    A closure cannot be handed to a process — this carries the manager's proxies, which can.
    """

    def __init__(self, counter, lock):
        self.counter, self.lock = counter, lock

    def __call__(self, n: int) -> None:
        with self.lock:
            self.counter.value += n


def _fit_chunk(rows: list[dict], progress, *, video: Path, profile_name: str, rotate) -> dict:
    """Worker: the very same `fit_rows_to_grid`, on one stretch, with its own decoder."""
    return fit_rows_to_grid(rows, load_profile(profile_name),
                            frames=stream_frames(video, rows, rotate), progress=progress)


def _warp_chunk(rows: list[dict], progress, *, session_dir: Path, video: Path, profile_name: str,
                rotate, meshes, lens) -> tuple[dict, list[dict]]:
    """Worker: `rewarp_boards` on one stretch, with the SESSION's mesh handed in from the parent."""
    made = rewarp_boards(session_dir, rows, load_profile(profile_name),
                         frames=stream_frames(video, rows, rotate), lens=lens, meshes=meshes,
                         progress=progress)
    return made, rows


def run_chunked(fn, chunks: list[list[dict]], total: int, label: str, *, executor=None) -> list:
    """Run one phase over its chunks and print ONE bar for all of them.

    Returns the workers' results in chunk order. A single chunk runs in THIS process — no pool, no
    pickling — which is both the small-session path and the reference the equivalence test uses.
    """
    import multiprocessing as mp

    if len(chunks) == 1:
        return [fn(chunks[0], None)]
    with mp.Manager() as manager:
        progress = ChunkProgress(manager.Value("i", 0), manager.Lock())
        with (nullcontext(executor) if executor is not None
              else ProcessPoolExecutor(max_workers=len(chunks))) as pool:
            futures = [pool.submit(fn, chunk, progress) for chunk in chunks]
            while True:
                done, _ = wait(futures, timeout=2.0)
                over = len(done) == len(futures)
                seen = total if over else min(progress.counter.value, total)
                print(f"  {label} {seen}/{total} frames "
                      f"({len(done)}/{len(chunks)} Abschnitte)", flush=True)
                if over:
                    break
            return [f.result() for f in futures]


def merge_fit_stats(parts: list[dict]) -> dict:
    """One phase's numbers out of the chunks', identical to what one serial pass would report.

    The spread (`median`, `max`) is recomputed from the rows, not averaged from the parts: every
    fitted row carries its own `align_worst_px`, so the merge is the same sorted list the serial
    run built — an average of medians would not be.
    """
    rows = [row for part in parts for row in part["arrived"]]
    # Nur GEMESSENE, wie der serielle Lauf: ein FIT_FAILED-Row behaelt das `align_worst_px`, das
    # `carry_repaired_geometry` vom letzten Export uebernahm, und `--workers 4` meldete damit eine
    # andere Streuung als `--workers 1` auf derselben Aufnahme.
    worsts = sorted(row["align_worst_px"] for row in rows
                    if "align_worst_px" in row and row.get("corners_source") != FIT_FAILED)
    merged = {key: sum(part[key] for part in parts)
              for key in (FIT_SOURCE, FIT_KEPT, FIT_FAILED, "mesh", "hands", "late")}
    return {**merged, "arrived": rows,
            "median": worsts[len(worsts) // 2] if worsts else None,
            "max": worsts[-1] if worsts else None}


def fit_rows_parallel(rows: list[dict], profile_name: str, *, video: Path, rotate,
                      workers: int, executor=None) -> dict:
    """`fit_rows_to_grid` over the recording in stretches. Same numbers, same row order."""
    chunks = plan_chunks(rows, workers)
    fn = partial(_fit_chunk, video=video, profile_name=profile_name, rotate=rotate)
    return merge_fit_stats(run_chunked(fn, chunks, len(rows), "grid fit", executor=executor))


def rewarp_parallel(session_dir: Path, rows: list[dict], profile_name: str, *, video: Path,
                    rotate, lens, workers: int, executor=None) -> tuple[dict, list[dict]]:
    """`rewarp_boards` in stretches, all of them straightened with the SESSION's one mesh.

    The mesh is pooled here and handed down: a chunk pooling its own would straighten its boards
    against a different measurement than its neighbour's, and the seam would be invisible.
    """
    chunks = plan_chunks(rows, workers)
    fn = partial(_warp_chunk, session_dir=session_dir, video=video, profile_name=profile_name,
                 rotate=rotate, meshes=meshes_for_boards(rows), lens=lens)
    parts = run_chunked(fn, chunks, len(rows), "board cut", executor=executor)
    made = {key: sum(part[key] for part, _ in parts) for key in ("rewarped", "no_mesh", "no_frame")}
    return made, [row for _, chunk in parts for row in chunk]
