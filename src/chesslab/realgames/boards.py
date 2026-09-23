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

#: What `corners_source` says about a fitted row, one whose inherited quad the fit could not beat,
#: and one whose grid could not be read at all. Three values and not one "fallback": 167 of
#: 20-48-55's 637 rows are the middle case, and calling those a failure would send a reader looking
#: for damage that is not there.
FIT_SOURCE, FIT_KEPT, FIT_FAILED = "export-fit", "export-fit-kept", "export-fit-failed"


#: Threads encoding boards while the decoder walks on. Measured 2026-09-08: the webp encode is
#: 73 % of this phase (50 ms per 928px board at quality 95) and `cv2.imwrite` drops the GIL, so
#: it overlaps the next decode. Four, not more — a frame in flight is 11 MB and this machine's
#: crashes are memory (`docs/export-decode.md`).
BOARD_WRITERS = 4


#: Processes a per-frame pass uses, and the row count that makes a pool worth its start-up.
#: Measured over 240 frames of 20-19-54 (10.5 MB each): serial 166 ms/frame, then 41.6 / 37.2 /
#: 33.0 / 31.9 at 6 / 8 / 12 / 16 — 12 is 5.05x and 16 only 5.23x, so the last four processes buy
#: 3 %. THREADS plateau at 1.9x: the work is numpy and Python and the GIL is the wall, which is why
#: the CPU sat at 1.6 of 20 cores. (A 40-frame run says 8 saturates — that is pool start-up.)
POOL_WORKERS = 12


POOL_MIN_ROWS = 32


def board_from_frame(job: tuple[Path, str, list, object, bool]) -> dict | None:
    """One frame -> one board, for the retrofit pool: only paths cross the process boundary."""
    session_dir, frame_rel, corners, profile, dirty = job
    frame = cv2.imread(str(session_dir / frame_rel))
    if frame is None:
        return None
    return write_board(session_dir, Path(frame_rel).stem, frame, corners, profile, dirty)


#: How often `straighten_boards` asks its caller to persist the rows. The write is the destructive
#: half and the flag is the only record of it — a run that dies between them leaves boards straight
#: on disk that a later run would pull a SECOND time.
STRAIGHTEN_CHECKPOINT = 50


def rewarp_boards(session_dir: Path, rows: list[dict], profile, *,
                  frames: Iterator[tuple[dict, Any]], lens=None, meshes=None, progress=None) -> dict:
    """Write every board FROM ITS FRAME, straight, in one resample.

    The export's second pass and the retrofit for a store whose video still exists. `straighten_boards`
    exists for the other case — a store with no frames left — and pays a second resample for it
    (+57 % Laplacian energy in the finished crop separates the two, measured 2026-08-21).
    """
    # A chunk must never pool its OWN mesh: `meshes_for_boards` averages over every clean frame
    # of the recording, so four workers would straighten four different boards with four meshes.
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
            # Die Karte liest das aus dem Log (`lib/progress.ts`), im selben `N/M frames`-Muster
            # wie Dekodieren und Grid-Fit. Ohne die Zeile steht der Schritt minutenlang stumm da.
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
    """Pull every stored board straight, once, so every cut afterwards is a plain rectangle.

    This is the ONLY straightening in the pipeline: a board carrying `board_straightened` must
    never be pulled again, and `crop_square` must never be handed a mesh for one. Rows whose board
    is missing, or for which no mesh could be found at all, are counted and left alone — a raw
    board is worse than a straight one but honest, a twice-corrected one is neither.

    `mattes=False`, wenn nur die BRETTER frisch gebogen daliegen: `write_boards_session` schneidet
    sie neu und poppt dabei das Flag, die Alphas daneben sind vom vorigen Lauf schon gezogen.
    Gemessen: ein zweiter Zug verbiegt sie um 16 px auf einem 400-px-Brett, in die Gegenrichtung.

    `checkpoint()`: persist the rows so far. Called every `STRAIGHTEN_CHECKPOINT` boards, because
    the flag is the ONLY thing standing between a killed run and a twice-corrected store.
    """
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
        # Ungeprueft setzte der naechste Block `board_straightened` auf ein Brett, das noch
        # gebogen auf der Platte liegt — und das wird laut Docstring nie wieder angefasst.
        if not cv2.imwrite(str(session_dir / rel),
                           straighten_board(board, mesh, bs, border), BOARD_ENCODE):
            raise OSError(f"could not write straightened board {session_dir / rel}")
        # A matte IS the board raster (952x952 for a 928 board), and `coverage_of` cuts it with the
        # very geometry the crop uses. Leaving it bowed would measure a straight cell against a
        # curved alpha — and the corrected ones are hand-made, so they are pulled, never redone.
        # `<stem>.*` sammelte auch `close_seams`' gestapelte `<stem>.tmp.webp` ein — die zog
        # es gerade und zaehlte sie als Matte. Was danach umgehaengt wird, waere zweimal gezogen.
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


def fit_rows_to_grid(rows: list[dict], profile, *,
                     frames: Iterator[tuple[dict, Any]], progress=None) -> dict:
    """Fit every written frame's quad to the board's OWN grid, per frame, at export time.

    `frames`: (row, picture) pairs — `stream_frames` or `disk_frames`. Required: which pictures
    to fit is the caller's decision, not a fallback guessed at here.

    The candidate carries one median quad for the whole video, and a median is not a measurement
    of any single frame: rg-2026-08-13-19-34-23 went out with all 137 frames uniformly ~17 px off
    their own grooves, and a hand-run `session scan` + `autofix` afterwards brought it to 2.71 px
    median. That repair is this same fit, so it runs by default instead of being hoped for.

    A frame the fit cannot read — hand over the grid, dark junk — KEEPS the quad it inherited and
    is marked [FIT_FAILED]. Nothing is dropped: those dirty rows are the wanted material.
    `improve_quad` returns nothing unless it improves its own frame, so this can only help.

    Every row also gets its `grid_lines` mesh where all 18 lines were readable, so `slice` cuts at
    the board's own boundaries instead of the nominal eighth (docs/data-pipeline.md §2).
    """
    from ..calibration import crop_border_px, warp_padded
    from ..grid_occlusion import hand_squares, missing_edges
    from ..imgops import skin_patch

    counts = {FIT_SOURCE: 0, FIT_KEPT: 0, FIT_FAILED: 0}
    worsts, meshed, hands, late = [], 0, 0, 0
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
        # The exporter's own `dirty` is a 1 s window around a commit, so a hand that adjusts a
        # piece or crosses the board goes unflagged and its crops reach training under the FEN
        # label (measured 2026-08-16: 424 of 2 228 frames). The grooves are the witness, and the
        # frame is already decoded here. Only ADDS the flag; a commit window stays dirty.
        row.pop("hand_squares", None)
        padded = None if frame is None else warp_padded(frame, profile, row["corners"], pad)
        found = None if padded is None else hand_squares(missing_edges(
            cv2.cvtColor(padded, cv2.COLOR_BGR2GRAY), profile.board_size, pad,
            white_pov=profile.white_pov))
        if found:
            row["hand_squares"] = sorted(found)
        # The groove read needs an adjacent PAIR, so it is blind to the hand that only grazes the
        # outer rank — 263 of 7 358 otherwise open frames (2026-08-16), every one an edge hand.
        # The colour read catches 259 of them at zero cost on 600 clean frames, so it decides the
        # flag alongside; naming the cells stays the grooves' job.
        if found or (padded is not None and skin_patch(
                padded[pad:pad + profile.board_size, pad:pad + profile.board_size],
                profile.board_size / 8.0, profile.crop.pad_side)):
            hands += 1
            if not row.get("dirty"):
                # The scan called this frame clean on the candidate's quad and the fit's own quad
                # disagrees. Rare, and a hand in the clean pool costs more than a missing slot.
                row["dirty"], row["dirty_reason"] = True, "grid-late"
                late += 1
        # No board here any more: it is warped STRAIGHT in `rewarp_boards`, and the mesh a hand
        # frame needs comes from its clean neighbours — none of them known until every row is read.
        for key in BOARD_KEYS:
            row.pop(key, None)
        worst = after if quad is not None else before
        source = FIT_SOURCE if quad is not None else (FIT_KEPT if worst == worst else FIT_FAILED)
        row["corners_source"] = source
        counts[source] += 1
        if worst == worst:
            row["align_worst_px"] = round(float(worst), 2)
            worsts.append(row["align_worst_px"])
    worsts.sort()
    return {
        **counts,
        "mesh": meshed,
        "hands": hands,
        "late": late,
        "arrived": seen,
        "median": worsts[len(worsts) // 2] if worsts else None,
        "max": worsts[-1] if worsts else None,
    }
