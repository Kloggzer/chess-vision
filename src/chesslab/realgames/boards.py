"""Grid-Fit je Frame und die Bretter: aus dem Video gerade schneiden oder nachtraeglich ziehen."""

from __future__ import annotations

from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

import cv2

from ..session_store.boards import BOARD_ENCODE, BOARD_KEYS, MATTE_ENCODE, write_board
from ..session_store.names import MATTE_DIR
from .mesh import grid_line_fracs, meshes_for_boards
from .progress import PROGRESS_EVERY, say_progress

#: Fitted, fit could not beat the inherited quad, grid unreadable: three values, because the middle
#: case is common (167 of 637 rows) and is no failure.
FIT_SOURCE, FIT_KEPT, FIT_FAILED = "export-fit", "export-fit-kept", "export-fit-failed"


#: Encoder threads while the decoder walks on: the webp encode is 73 % of this phase and `imwrite`
#: drops the GIL. Four, not more — a frame in flight is 11 MB, and the crashes here are memory.
BOARD_WRITERS = 4


#: Processes for a per-frame pass: 12 gives 5.05x, 16 only 5.23x. THREADS plateau at 1.9x (numpy
#: plus Python, the GIL is the wall). A 40-frame run measures pool start-up, not this.
POOL_WORKERS = 12


POOL_MIN_ROWS = 32


def board_from_frame(job: tuple[Path, str, list, object, bool]) -> dict | None:
    """One frame -> one board, for the retrofit pool: only paths cross the process boundary."""
    session_dir, frame_rel, corners, profile, dirty = job
    frame = cv2.imread(str(session_dir / frame_rel))
    if frame is None:
        return None
    return write_board(session_dir, Path(frame_rel).stem, frame, corners, profile, dirty)


#: How often `straighten_boards` persists the rows: a run dying between write and flag leaves boards
#: straight on disk that a later run would pull a SECOND time.
STRAIGHTEN_CHECKPOINT = 50


def rewarp_boards(session_dir: Path, rows: list[dict], profile, *,
                  frames: Iterator[tuple[dict, Any]], lens=None, meshes=None, progress=None) -> dict:
    """Write every board FROM ITS FRAME, straight, in one resample; `straighten_boards` is for
    stores without frames and pays a second resample (-57 % Laplacian energy).
    """
    # A chunk must never pool its OWN mesh, or four workers straighten with four different meshes.
    meshes = meshes_for_boards(rows) if meshes is None else meshes
    done = {"rewarped": 0, "no_mesh": 0, "no_frame": 0}
    with ThreadPoolExecutor(max_workers=BOARD_WRITERS) as pool:
        pending: dict[Any, dict] = {}

        def collect(keep: int) -> None:
            """Fold finished writes back into their rows, never more than `keep` still in flight."""
            while len(pending) > keep:
                for future in as_completed(list(pending)):
                    pending.pop(future).update(future.result())
                    break

        for seen, (row, frame) in enumerate(frames, 1):
            # Die Karte liest das aus dem Log (`lib/progress.ts`); ohne die Zeile steht der Schritt
            # minutenlang stumm.
            say_progress(progress, seen, f"  board cut {seen}/{len(rows)} frames")
            if frame is None:
                done["no_frame"] += 1
                continue
            mesh = meshes.get(int(Path(row["frame"]).stem))
            done["no_mesh"] += mesh is None
            for key in BOARD_KEYS:
                row.pop(key, None)
            pending[pool.submit(write_board, session_dir, Path(row["frame"]).stem, frame,
                                row["corners"], profile, bool(row.get("dirty")), mesh, lens)] = row
            done["rewarped"] += 1
            collect(BOARD_WRITERS)
        collect(0)
    return done


def straighten_boards(session_dir: Path, rows: list[dict], checkpoint=None,
                      *, mattes: bool = True) -> dict:
    """Pull every stored board straight ONCE, so every cut afterwards is a plain rectangle. Rows
    without board or mesh are left alone: raw is honest, twice-corrected is not.

    `mattes=False` when only the boards are freshly bowed (a second pull bends the alphas 16 px).
    `checkpoint()` persists the rows every `STRAIGHTEN_CHECKPOINT` boards."""
    from ..calibration import straighten_board

    meshes = meshes_for_boards(rows)
    done = {"straightened": 0, "already": 0, "no_mesh": 0, "no_board": 0, "mattes": 0}
    for seen, row in enumerate(rows, 1):
        if seen % PROGRESS_EVERY == 0:
            print(f"  straighten {seen}/{len(rows)} frames", flush=True)
        if row.get("board_straightened"):
            done["already"] += 1
            continue
        rel = row.get("board")
        board = None if not rel else cv2.imread(str(session_dir / rel))
        if board is None:
            done["no_board"] += 1
            continue
        mesh = meshes.get(int(Path(row["frame"]).stem))
        if mesh is None:
            done["no_mesh"] += 1
            continue
        bs, border = int(row["board_size"]), int(row["board_border"])
        # Ungeprueft setzte der naechste Block `board_straightened` auf ein noch gebogenes Brett.
        if not cv2.imwrite(str(session_dir / rel),
                           straighten_board(board, mesh, bs, border), BOARD_ENCODE):
            raise OSError(f"could not write straightened board {session_dir / rel}")
        # A matte IS the board raster, so it is pulled with it; corrected ones are hand-made and
        # never redone. `<stem>.*` darf keine gestapelten `<stem>.tmp.webp` von `close_seams`
        # einsammeln.
        for matte in (sorted(p for p in (session_dir / MATTE_DIR).glob(f"{Path(rel).stem}.*")
                             if p.suffixes[-2:] != [".tmp", ".webp"]) if mattes else ()):
            alpha = cv2.imread(str(matte), cv2.IMREAD_UNCHANGED)
            if alpha is not None:
                if not cv2.imwrite(str(matte), straighten_board(alpha, mesh, bs, border),
                                   MATTE_ENCODE):
                    raise OSError(f"could not write straightened matte {matte}")
                done["mattes"] += 1
        row["board_straightened"] = True
        done["straightened"] += 1
        if checkpoint is not None and done["straightened"] % STRAIGHTEN_CHECKPOINT == 0:
            checkpoint()
    return done


def _fit_frame_geometry(frame, corners, profile):
    from ..alignment import improve_quad, reuse_grid_measurements

    if frame is None:
        return None, float("nan"), float("nan"), None
    with reuse_grid_measurements():
        quad, before, after = improve_quad(frame, corners, profile)
        mesh = grid_line_fracs(frame, corners if quad is None else quad, profile.board_size, profile)
    return quad, before, after, mesh


def fit_spread(rows: list[dict]) -> dict:
    """Median and max `align_worst_px` of the rows this pass MEASURED: a `FIT_FAILED` row still
    carries the last export's number.
    """
    worsts = sorted(row["align_worst_px"] for row in rows
                    if "align_worst_px" in row and row.get("corners_source") != FIT_FAILED)
    return {"median": worsts[len(worsts) // 2] if worsts else None,
            "max": worsts[-1] if worsts else None}


def fit_rows_to_grid(rows: list[dict], profile, *,
                     frames: Iterator[tuple[dict, Any]], progress=None) -> dict:
    """Fit every written frame's quad to the board's OWN grid at export time (`frames`: caller's
    choice).

    The candidate's median quad left a recording ~17 px off. Unreadable frames keep their quad as
    [FIT_FAILED]; readable ones get `grid_lines`."""
    from ..calibration import crop_border_px, warp_padded
    from ..grid_occlusion import hand_squares, missing_edges
    from ..imgops import skin_patch

    counts = {FIT_SOURCE: 0, FIT_KEPT: 0, FIT_FAILED: 0}
    meshed, hands, late = 0, 0, 0
    pad = crop_border_px(profile)
    pairs = frames
    seen = []
    for done, (row, frame) in enumerate(pairs, 1):
        seen.append(row)
        say_progress(progress, done, f"  grid fit {done}/{len(rows)} frames, hands on {hands}")
        quad, before, after, mesh = _fit_frame_geometry(frame, row["corners"], profile)
        if quad is not None:
            row["corners"] = [[float(x), float(y)] for x, y in quad]
        row.pop("grid_lines", None)
        if mesh is not None:
            row["grid_lines"] = mesh
            meshed += 1
        # The exporter's `dirty` is a 1 s commit window: 424 of 2 228 frames showed an unflagged
        # hand. The grooves are the witness; only ADDS the flag.
        row.pop("hand_squares", None)
        padded = None if frame is None else warp_padded(frame, profile, row["corners"], pad)
        found = None if padded is None else hand_squares(missing_edges(
            cv2.cvtColor(padded, cv2.COLOR_BGR2GRAY), profile.board_size, pad,
            white_pov=profile.white_pov))
        if found:
            row["hand_squares"] = sorted(found)
        # The groove read needs an adjacent PAIR and misses the hand grazing the outer rank (263 of
        # 7 358 frames); the colour read catches 259 at zero cost on clean frames.
        if found or (padded is not None and skin_patch(
                padded[pad:pad + profile.board_size, pad:pad + profile.board_size],
                profile.board_size / 8.0, profile.crop.pad_side)):
            hands += 1
            if not row.get("dirty"):
                # Scan and fit disagree on this frame: a hand in the clean pool costs more than a
                # missing slot.
                row["dirty"], row["dirty_reason"] = True, "grid-late"
                late += 1
        # Warped STRAIGHT in `rewarp_boards`: a hand frame's mesh comes from neighbours not yet
        # read.
        for key in BOARD_KEYS:
            row.pop(key, None)
        worst = after if quad is not None else before
        source = FIT_SOURCE if quad is not None else (FIT_KEPT if worst == worst else FIT_FAILED)
        row["corners_source"] = source
        counts[source] += 1
        if worst == worst:
            row["align_worst_px"] = round(float(worst), 2)
    return {
        **counts,
        "mesh": meshed,
        "hands": hands,
        "late": late,
        "arrived": seen,
        **fit_spread(seen),
    }
