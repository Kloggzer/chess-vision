"""Die Brett-Verben einer Session: `settle-scan`, `boards`, `rewarp`, `straighten`, `park-frames`."""

from __future__ import annotations

import json
from pathlib import Path

from . import config
from .session_store.log import (
    EXPORT_MARKER,
    _write_log,
    backup_log,
    export_interrupted,
    read_log,
    write_interval_checks,
)
from .session_store.names import CANDIDATE_FILE, log_path
from .session_store.paths import session_dir
from .sessions import NothingToDo, missing_source_frames


def park_frames_session(session_id: str) -> dict:
    """Move the source frames of every boarded row to `data/_parked/frames/<session>/` (3.3 MB each
    against the board's 115 KB). Parked, not deleted; a frame whose fit failed stays.
    """
    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir)
    dest = config.DATA.root / "_parked" / "frames" / session_id
    moved, freed = 0, 0
    for r in rows:
        board = r.get("board")
        frame = sdir / r["frame"] if r.get("frame") else None
        if not board or not (sdir / board).is_file() or frame is None or not frame.is_file():
            continue
        dest.mkdir(parents=True, exist_ok=True)
        freed += frame.stat().st_size
        frame.replace(dest / frame.name)
        moved += 1
    return {"session_id": session_id, "moved": moved, "of": len(rows),
            "freed_mb": round(freed / 1024**2, 1), "parked_to": str(dest)}


def next_touches_of(ply: object, by_ply: dict) -> list[str]:
    """The squares the NEXT ply moves — from the intervals' own FENs, so castling needs no case."""
    from .realgames.timeline import changed_squares

    if not isinstance(ply, int):
        return []
    later = [p for p in by_ply if isinstance(p, int) and p > ply]
    if not later:
        return []
    return changed_squares(by_ply[ply][0].get("fen"), by_ply[min(later)][0].get("fen"))


def settle_scan_session(session_id: str) -> dict:
    """Score every cell against its ply interval's settled board — measure only, drop nothing.

    A square that already holds the next move's piece still carries the old FEN label; this
    covers any cell whose pixels stopped matching its position.
    """
    from collections import defaultdict
    from concurrent.futures import ProcessPoolExecutor

    from .labeling import _profile_for_session, usable_board
    from .realgames.boards import POOL_WORKERS
    from .realgames.position import SETTLE_MIN_FRAMES, interval_moves, settle_for_ply
    from .session_store.matte import read_matte
    from .session_store.paths import read_session_meta

    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir)
    prof = _profile_for_session(read_session_meta(sdir), None)
    for r in rows:
        for key in ("settle_dev", "settle_seen", "settle_left"):
            r.pop(key, None)

    by_ply: dict[object, list[dict]] = defaultdict(list)
    # `usable_board`: `settle_for_ply` schneidet unter der Skala des PROFILS, ein Brett anderer
    # Groesse tastete ganz andere Stellen ab — und steuert die Strittig-Lane.
    for r in rows:
        if usable_board(r, prof) and (sdir / r["board"]).is_file():
            by_ply[r.get("ply")].append(r)
    matte = read_matte(sdir)
    plies = [ply for ply, rs in by_ply.items() if len(rs) >= SETTLE_MIN_FRAMES]
    # NUR die gemessenen Stems: sonst ging ein nie gemattetes Hand-Brett als "gemessen, nichts
    # verdeckt" in die gesetzte Stellung ein.
    jobs = [(sdir, by_ply[ply], prof,
             {stem: matte[stem] for r in by_ply[ply]
              if (stem := Path(r["frame"]).stem) in matte},
             next_touches_of(ply, by_ply))
            for ply in plies]
    short = sum(len(rs) for rs in by_ply.values() if len(rs) < SETTLE_MIN_FRAMES)

    if len(jobs) > 1:
        with ProcessPoolExecutor(max_workers=POOL_WORKERS) as pool:
            parts = list(pool.map(settle_for_ply, jobs))
    else:
        parts = [settle_for_ply(j) for j in jobs]
    scored = {stem: got for part in parts for stem, got in (part.get("scores") or {}).items()}
    refs = {int(ply): part["ref"] for ply, part in zip(plies, parts, strict=True)
            if part.get("ref") is not None and ply is not None}

    for r in rows:
        got = scored.get(Path(r["frame"]).stem)
        if got is not None:
            r["settle_dev"], r["settle_seen"] = got["dev"], got["seen"]
            if got["left"]:
                r["settle_left"] = got["left"]
    fens = {int(ply): by_ply[ply][0]["fen"] for ply in plies if ply is not None}
    checks = interval_moves(refs, fens)
    write_interval_checks(sdir, checks)
    backup = backup_log(log_path(sdir))
    _write_log(sdir, rows)
    return {"session_id": session_id, "scored": len(scored), "of": len(rows),
            "plies": len(jobs), "too_short": short, "backup": backup,
            "left": sum(len(g["left"]) for g in scored.values()),
            "intervals": len(checks), "unseen": sum(1 for c in checks if not c["seen"])}


def write_boards_session(session_id: str) -> dict:
    """Cut every row's stored board from its frame under the row's CURRENT quad — the retrofit, and
    the repair after `autofix`/`adopt` moved a quad.
    """
    from concurrent.futures import ProcessPoolExecutor

    from .labeling import _profile_for_session
    from .realgames.boards import POOL_MIN_ROWS, POOL_WORKERS, board_from_frame, straighten_boards
    from .realgames.progress import PROGRESS_EVERY
    from .session_store.boards import BOARD_KEYS
    from .session_store.log import mark_export
    from .session_store.paths import read_session_meta

    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir, under_export=True)
    prof = _profile_for_session(read_session_meta(sdir), None)
    # Without this the unconditional pop clears every pointer and writes none back, and the slice
    # error names THIS command as the repair.
    if (why := missing_source_frames(sdir, rows)):
        return {"session_id": session_id, "error": why}
    todo = [r for r in rows if r.get("corners") and r.get("frame")]
    # Only the rows this run rewrites, saved BEFORE the pop: a row whose board cannot be recut gets
    # its old pointer back, or no log-driven reader finds the webp again.
    kept = [{k: r[k] for k in BOARD_KEYS if k in r} for r in todo]
    for r in todo:
        for key in BOARD_KEYS:
            r.pop(key, None)
    jobs = [(sdir, r["frame"], r["corners"], prof, bool(r.get("dirty"))) for r in todo]
    backup = backup_log(log_path(sdir))
    # Der Marker deckt schon das Schneiden: ab dem ersten Brett ist das Log alt, und die Frische
    # stat-et keine Bretter (`provenance.inputs_moved`).
    with mark_export(sdir):
        if len(jobs) >= POOL_MIN_ROWS:
            with ProcessPoolExecutor(max_workers=POOL_WORKERS) as pool:
                made = list(pool.map(board_from_frame, jobs, chunksize=4))
        else:
            made = [board_from_frame(j) for j in jobs]
        written = 0
        for r, keys, old in zip(todo, made, kept, strict=True):
            if keys is None:
                r.update(old)
                continue
            r.update(keys)
            written += 1
            if written % PROGRESS_EVERY == 0:
                print(f"  {written}/{len(jobs)} frames", flush=True)
        # Frisch gewarpt ist wieder gebogen; `mattes=False`: die Matten liegen schon gerade.
        pulled = straighten_boards(sdir, rows, checkpoint=lambda: _write_log(sdir, rows),
                                   mattes=False)
        _write_log(sdir, rows)
    missing = len(jobs) - written
    return {"session_id": session_id, "written": written, "of": len(rows),
            "missing": missing, "backup": backup, "straightened": pulled["straightened"]}


def rewarp_boards_session(session_id: str) -> dict:
    """Rebuild a store FROM ITS VIDEO, straight, in one resample: +57 % Laplacian energy against
    straightening stored boards, because optics and mesh fold into the warp's map.
    """
    from .calibration import LensModel
    from .labeling import _profile_for_session
    from .realgames.boards import rewarp_boards
    from .realgames.decode import detect_rotation, stream_frames
    from .session_store.log import mark_export
    from .session_store.paths import read_session_meta
    from .session_store.recording import game_dir, video_path

    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir, under_export=True)
    name = session_id[3:] if session_id.startswith("rg-") else session_id
    candidate = game_dir(name) / CANDIDATE_FILE
    if not candidate.is_file():
        raise NothingToDo(f"{session_id}: no candidate.json — nothing says how it was warped")
    video = video_path(name)
    todo = [r for r in rows if r.get("corners") and r.get("frame")]
    wanted = {int(Path(r["frame"]).stem) for r in todo}
    rotate = detect_rotation(video, json.loads(candidate.read_text(encoding="utf-8")), wanted)
    prof = _profile_for_session(read_session_meta(sdir), None)
    # Honoured if `:desktop undistort` ever wrote one; no recording carries it today.
    receipt = game_dir(name) / "lens.json"
    lens = LensModel.from_receipt(
        json.loads(receipt.read_text(encoding="utf-8")) if receipt.is_file() else None)
    backup = backup_log(log_path(sdir))
    # Bis zum Log-Schreiben sind die Bretter neu und das Log alt; der Marker ist das Einzige, was
    # das danach noch sieht.
    with mark_export(sdir):
        done = rewarp_boards(sdir, todo, prof, frames=stream_frames(video, todo, rotate), lens=lens)
        _write_log(sdir, rows)
    return {"session_id": session_id, "of": len(rows), "backup": backup,
            "lens": lens is not None, **done}


def straighten_boards_session(session_id: str) -> dict:
    """Pull an EXISTING store straight from `boards/` and `grid_lines` alone — no frames, no
    re-decode. Idempotent through `board_straightened`.
    """
    from .realgames.boards import straighten_boards
    from .session_store.log import mark_export

    sdir, _archived = session_dir(session_id)
    # Der Marker heisst: Bretter neu, Log alt; ohne `board_straightened` zoege dieser Aufruf gerade
    # Bretter ein zweites Mal. `session rewarp` schneidet sie aus dem Video neu.
    if export_interrupted(sdir):
        raise NothingToDo(
            f"{session_id}: an export was interrupted ({EXPORT_MARKER}) — the boards may already "
            f"be straight while the log does not say so. Re-run the export or `session rewarp`.")
    rows = read_log(sdir)
    backup = backup_log(log_path(sdir))
    # Backed up FIRST and rewritten as it goes: the boards are overwritten in place.
    with mark_export(sdir):
        done = straighten_boards(sdir, rows, checkpoint=lambda: _write_log(sdir, rows))
        _write_log(sdir, rows)
    return {"session_id": session_id, "of": len(rows), "backup": backup, **done}
