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
from .session_store.paths import session_dir
from .sessions import NothingToDo, missing_source_frames


def park_frames_session(session_id: str) -> dict:
    """Move the source frames of every boarded row to `data/_parked/frames/<session>/`.

    The decode is scratch: 3.3 MB per frame against the board's 115 KB, and the session tree stood
    at 82 GB for 12.7 GB of video. Parked, not deleted, and only where the board is actually on
    disk — a frame whose fit failed keeps its source. The video regenerates either.
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
    """Score every cell against its own ply interval's settled board — measure only, drop nothing.

    A hand is not the whole danger: during a move something HAPPENS on the board, and a square that
    already holds the piece the next move puts there still carries the old FEN's label. The
    exporter's `unknown_squares` covers only the next move's footprint; this covers any cell whose
    pixels stopped matching the position they are labelled with.
    """
    from collections import defaultdict
    from concurrent.futures import ProcessPoolExecutor

    from .labeling import _profile_for_session, read_matte, read_session_meta, usable_board
    from .realgames.boards import POOL_WORKERS
    from .realgames.position import SETTLE_MIN_FRAMES, interval_moves, settle_for_ply

    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir)
    prof = _profile_for_session(read_session_meta(sdir), None)
    for r in rows:
        for key in ("settle_dev", "settle_seen", "settle_left"):
            r.pop(key, None)

    by_ply: dict[object, list[dict]] = defaultdict(list)
    # `usable_board`, nicht nur "Datei da": `settle_for_ply` schneidet mit `crop_square` unter der
    # Skala des PROFILS, ein Brett in einer anderen tastet es an ganz anderen Stellen ab — und die
    # Zahl landet als `settle_dev` im Log und steuert die Strittig-Lane.
    for r in rows:
        if usable_board(r, prof) and (sdir / r["board"]).is_file():
            by_ply[r.get("ply")].append(r)
    matte = read_matte(sdir)
    plies = [ply for ply, rs in by_ply.items() if len(rs) >= SETTLE_MIN_FRAMES]
    # NUR die gemessenen Stems: ein `.get(stem, {})` gab jedem Frame einen Schluessel, womit
    # `settle_for_ply`s `unmeasured` per Konstruktion leer war und ein nie gemattetes Hand-Brett
    # als "gemessen, nichts verdeckt" in die gesetzte Stellung einging.
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
    backup = backup_log(sdir / "log.jsonl")
    _write_log(sdir, rows)
    return {"session_id": session_id, "scored": len(scored), "of": len(rows),
            "plies": len(jobs), "too_short": short, "backup": backup,
            "left": sum(len(g["left"]) for g in scored.values()),
            "intervals": len(checks), "unseen": sum(1 for c in checks if not c["seen"])}


def write_boards_session(session_id: str) -> dict:
    """Cut every row's stored board from its frame, under the row's CURRENT quad.

    The export writes these as it fits (`realgames.boards.fit_rows_to_grid`); this is the retrofit for
    the sessions that predate the store, and the repair for any step that moves a quad afterwards
    (`autofix`, `adopt`) — a board warped with a quad the log no longer holds is a crop cut wrong.
    """
    from concurrent.futures import ProcessPoolExecutor

    from .labeling import _profile_for_session, read_session_meta
    from .realgames.boards import POOL_MIN_ROWS, POOL_WORKERS, board_from_frame, straighten_boards
    from .realgames.progress import PROGRESS_EVERY
    from .session_store.boards import BOARD_KEYS
    from .session_store.log import mark_export

    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir, under_export=True)
    prof = _profile_for_session(read_session_meta(sdir), None)
    # The pop below is unconditional, so without this the verb clears every pointer and then writes
    # none back: a parked session loses its store in the log while the boards sit on disk, and the
    # slice error that follows names THIS command as the repair.
    if (why := missing_source_frames(sdir, rows)):
        return {"session_id": session_id, "error": why}
    todo = [r for r in rows if r.get("corners") and r.get("frame")]
    # Only the rows this run rewrites: popping over ALL of them left a corner-less row without its
    # `board` while the webp stayed on disk, and every reader downstream is log-driven.
    # Aufgehoben VOR dem Pop: eine Zeile, deren Brett sich nicht neu schneiden laesst, bekommt
    # ihren alten Zeiger zurueck. Ohne das liegt das `.webp` da und kein log-getriebener Leser
    # findet es je wieder — die Zeile sieht aus wie eine ohne Brett.
    kept = [{k: r[k] for k in BOARD_KEYS if k in r} for r in todo]
    for r in todo:
        for key in BOARD_KEYS:
            r.pop(key, None)
    jobs = [(sdir, r["frame"], r["corners"], prof, bool(r.get("dirty"))) for r in todo]
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
    missing = len(jobs) - written
    # A fresh warp is bowed again, so the store's one straightening has to follow the rewrite —
    # otherwise this repair would quietly hand the cutters a board nobody pulls straight any more.
    # Der Flag ist laut `straighten_boards` das EINZIGE zwischen einem abgebrochenen Lauf und
    # einem zweimal gezogenen Store — also muss er unterwegs auf die Platte, nicht erst am Ende.
    backup = backup_log(sdir / "log.jsonl")
    # `mattes=False`: die Bretter sind frisch (gebogen) aus den Frames geschnitten, die Matten
    # daneben liegen vom vorigen Lauf schon gerade — sie ein zweites Mal zu ziehen verschiebt sie.
    with mark_export(sdir):
        pulled = straighten_boards(sdir, rows, checkpoint=lambda: _write_log(sdir, rows),
                                   mattes=False)
        _write_log(sdir, rows)
    return {"session_id": session_id, "written": written, "of": len(rows),
            "missing": missing, "backup": backup, "straightened": pulled["straightened"]}


def rewarp_boards_session(session_id: str) -> dict:
    """Rebuild a store FROM ITS VIDEO, straight, in one resample — the good retrofit.

    `straighten_boards_session` is the other one: it works on boards whose frames are gone and pays
    a second resample for it. Where the video still exists this is strictly better (+57 % Laplacian
    energy in the finished crop, measured 2026-08-21), because the optics and the mesh fold into
    the same map the warp already builds.
    """
    from .calibration import LensModel
    from .labeling import _profile_for_session, read_session_meta
    from .realgames.boards import rewarp_boards
    from .realgames.decode import detect_rotation, stream_frames
    from .session_store.log import mark_export
    from .session_store.recording import game_dir, video_path

    sdir, _archived = session_dir(session_id)
    rows = read_log(sdir, under_export=True)
    name = session_id[3:] if session_id.startswith("rg-") else session_id
    candidate = game_dir(name) / "candidate.json"
    if not candidate.is_file():
        raise NothingToDo(f"{session_id}: no candidate.json — nothing says how it was warped")
    video = video_path(name)
    todo = [r for r in rows if r.get("corners") and r.get("frame")]
    wanted = {int(Path(r["frame"]).stem) for r in todo}
    rotate = detect_rotation(video, json.loads(candidate.read_text(encoding="utf-8")), wanted)
    prof = _profile_for_session(read_session_meta(sdir), None)
    # `lens.json` beside the recording, if `:desktop undistort` ever wrote one. No recording carries
    # it today and none needs to — a blind A/B could not tell the corrected boards apart — but the
    # optics fold into the same map for free, so a receipt that IS there is honoured.
    receipt = game_dir(name) / "lens.json"
    lens = LensModel.from_receipt(
        json.loads(receipt.read_text(encoding="utf-8")) if receipt.is_file() else None)
    backup = backup_log(sdir / "log.jsonl")
    # Von hier bis zum Log-Schreiben sind die Bretter neu und das Log alt; der Marker ist das
    # Einzige, was das danach noch sieht (`straighten_boards_session` liest ihn).
    with mark_export(sdir):
        done = rewarp_boards(sdir, todo, prof, frames=stream_frames(video, todo, rotate), lens=lens)
        _write_log(sdir, rows)
    return {"session_id": session_id, "of": len(rows), "backup": backup,
            "lens": lens is not None, **done}


def straighten_boards_session(session_id: str) -> dict:
    """Pull an EXISTING store straight, from the boards themselves — no frames, no re-decode.

    The retrofit for every session written before the store carried its own straightening. It
    needs nothing but `boards/` and the rows' `grid_lines`, which is the point: the source frames
    are deliberately gone. Idempotent through `board_straightened`, so running it twice cannot
    correct twice.
    """
    from .realgames.boards import straighten_boards
    from .session_store.log import mark_export

    sdir, _archived = session_dir(session_id)
    # Der Marker heisst: Bretter neu, Log alt. Dann fehlt `board_straightened` auf Brettern, die
    # schon gerade auf der Platte liegen — und dieser Aufruf zoege sie ein zweites Mal (16 px auf
    # 400). `session rewarp` schneidet sie aus dem Video neu und raeumt den Marker mit auf.
    if export_interrupted(sdir):
        raise NothingToDo(
            f"{session_id}: an export was interrupted ({EXPORT_MARKER}) — the boards may already "
            f"be straight while the log does not say so. Re-run the export or `session rewarp`.")
    rows = read_log(sdir)
    backup = backup_log(sdir / "log.jsonl")
    # Backed up FIRST and rewritten as it goes: the boards are being overwritten in place, and a
    # run that dies with the flags unwritten would leave a later run to correct them twice.
    with mark_export(sdir):
        done = straighten_boards(sdir, rows, checkpoint=lambda: _write_log(sdir, rows))
        _write_log(sdir, rows)
    return {"session_id": session_id, "of": len(rows), "backup": backup, **done}
