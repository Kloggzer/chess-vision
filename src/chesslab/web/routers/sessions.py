"""Session/Review router: /api/sessions*, /api/reslice, /api/slice"""

from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import FileResponse, Response

router = APIRouter()


def _crop_count(sid: str) -> int:
    from ... import config
    from ...manifest_cache import session_crop_count

    return session_crop_count(config.DATA.manifests / "squares.jsonl", sid)


def _review_session_dir(sid: str) -> tuple[Path, bool]:
    from ... import config
    from ... import sessions as sessions_mod

    try:
        safe_sid = sessions_mod._safe_id(sid)
    except ValueError as e:
        raise HTTPException(400, str(e))
    active = config.DATA.sessions / safe_sid
    if active.exists():
        return active, False
    archived = config.DATA.sessions_archive / safe_sid
    if archived.exists():
        return archived, True
    raise HTTPException(404, f"Session '{safe_sid}' not found.")


def _review_log(sdir: Path) -> list[dict]:
    log_path = sdir / "log.jsonl"
    if not log_path.exists():
        raise HTTPException(404, f"Session '{sdir.name}' has no log.jsonl.")
    rows: list[dict] = []
    for line in log_path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    if not rows:
        raise HTTPException(404, f"Session '{sdir.name}' has no captured frames.")
    return rows


def _review_entry(sid: str, idx: int) -> tuple[Path, bool, list[dict], int, dict]:
    sdir, archived = _review_session_dir(sid)
    rows = _review_log(sdir)
    clamped = max(0, min(idx, len(rows) - 1))
    return sdir, archived, rows, clamped, rows[clamped]


def _frame_path(sdir: Path, entry: dict) -> Path:
    rel = str(entry.get("frame") or "")
    if not rel:
        raise HTTPException(404, "Log entry has no frame path.")
    path = (sdir / rel).resolve()
    root = sdir.resolve()
    if root not in path.parents and path != root:
        raise HTTPException(400, "Invalid frame path in session log.")
    if not path.exists():
        raise HTTPException(404, f"Frame '{rel}' not found.")
    return path


def _review_profile(sdir: Path):
    import yaml

    from ... import calibration, config

    meta_path = sdir / "session.yaml"
    meta = yaml.safe_load(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    profile_name = (meta or {}).get("profile")
    if profile_name:
        try:
            return calibration.load_profile(profile_name)
        except FileNotFoundError:
            pass
    return calibration.CalibrationProfile(
        profile=profile_name or "review",
        camera_index=-1,
        frame_size=(0, 0),
        board_size=config.DEFAULT_BOARD_SIZE,
        image_corners=[[0.0, 0.0], [float(config.DEFAULT_BOARD_SIZE), 0.0],
                       [float(config.DEFAULT_BOARD_SIZE), float(config.DEFAULT_BOARD_SIZE)],
                       [0.0, float(config.DEFAULT_BOARD_SIZE)]],
        homography=calibration.compute_homography(
            [[0.0, 0.0], [float(config.DEFAULT_BOARD_SIZE), 0.0],
             [float(config.DEFAULT_BOARD_SIZE), float(config.DEFAULT_BOARD_SIZE)],
             [0.0, float(config.DEFAULT_BOARD_SIZE)]],
            config.DEFAULT_BOARD_SIZE,
        ),
        white_pov=True,
        crop=calibration.CropParams.default(config.DEFAULT_BOARD_SIZE),
    )


def _review_overlay_jpeg(sdir: Path, entry: dict) -> bytes | None:
    import chess
    import cv2

    from ...calibration import warp_from_corners
    from ...move_tracker.tracker import square_center

    corners = entry.get("corners")
    fen = entry.get("fen")
    if not corners or not fen:
        return None
    frame = cv2.imread(str(_frame_path(sdir, entry)))
    if frame is None:
        raise HTTPException(404, "Frame could not be read.")
    prof = _review_profile(sdir)
    img = warp_from_corners(frame, prof, corners)
    bs = prof.board_size
    cell = bs / 8.0
    for i in range(9):
        p = int(i * cell)
        cv2.line(img, (p, 0), (p, bs), (0, 180, 0), 1)
        cv2.line(img, (0, p), (bs, p), (0, 180, 0), 1)
    try:
        board = chess.Board(fen)
    except ValueError as e:
        raise HTTPException(400, f"Invalid FEN in session log: {e}")
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if not piece:
            continue
        sq = chess.square_name(square)
        cx, cy = square_center(sq, bs, prof.white_pov)
        ch = piece.symbol()
        col = (245, 245, 245) if piece.color == chess.WHITE else (25, 25, 25)
        halo = (25, 25, 25) if piece.color == chess.WHITE else (235, 235, 235)
        cv2.putText(img, ch, (cx - 8, cy + 8), cv2.FONT_HERSHEY_SIMPLEX, 0.8, halo, 4, cv2.LINE_AA)
        cv2.putText(img, ch, (cx - 8, cy + 8), cv2.FONT_HERSHEY_SIMPLEX, 0.8, col, 2, cv2.LINE_AA)
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 86])
    return buf.tobytes() if ok else None


@router.get("/api/sessions")
def sessions():
    from ... import config
    from ...manifest_cache import manifest_stats

    frames_by = manifest_stats(config.DATA.manifests / "squares.jsonl")["frames_by_session"]
    return [{"session_id": sid, "frames": frames, "n_frames": len(frames)}
            for sid, frames in sorted(frames_by.items())]


@router.get("/api/sessions/manage")
def sessions_manage():
    """List all recorded sessions (active + archived) with key data for management."""
    from ... import sessions as sessions_mod

    return sessions_mod.list_sessions()


@router.get("/api/sessions/{sid}/review")
def session_review(sid: str, idx: int = Query(0)):
    """Return one review step: real frame URL + chess.svg board URL for the logged FEN."""
    _sdir, archived, rows, clamped, entry = _review_entry(sid, idx)
    safe_sid = quote(sid, safe="")
    return {
        "session_id": sid,
        "archived": archived,
        "index": clamped,
        "count": len(rows),
        "entry": {
            "frame": entry.get("frame"),
            "ply": entry.get("ply"),
            "fen": entry.get("fen"),
            "move_san": entry.get("move_san"),
            "ts": entry.get("ts"),
            "unusable": bool(entry.get("unusable")),
        },
        "frame_url": f"/api/sessions/{safe_sid}/frame/{clamped}",
        "overlay_url": f"/api/sessions/{safe_sid}/overlay/{clamped}",
        "overlay_available": bool(entry.get("corners") and entry.get("fen")),
        "board_url": f"/api/sessions/{safe_sid}/board/{clamped}",
    }


@router.get("/api/sessions/{sid}/frame/{idx}")
def session_frame(sid: str, idx: int):
    sdir, _archived, _rows, _clamped, entry = _review_entry(sid, idx)
    return FileResponse(_frame_path(sdir, entry))


@router.get("/api/sessions/{sid}/overlay/{idx}")
def session_overlay(sid: str, idx: int):
    sdir, _archived, _rows, _clamped, entry = _review_entry(sid, idx)
    jpg = _review_overlay_jpeg(sdir, entry)
    if jpg is None:
        return FileResponse(_frame_path(sdir, entry))
    return Response(jpg, media_type="image/jpeg")


@router.get("/api/sessions/{sid}/board/{idx}")
def session_board(sid: str, idx: int):
    import chess
    import chess.svg

    _sdir, _archived, _rows, _clamped, entry = _review_entry(sid, idx)
    fen = entry.get("fen")
    if not fen:
        raise HTTPException(404, "Log entry has no FEN.")
    try:
        board = chess.Board(fen)
    except ValueError as e:
        raise HTTPException(400, f"Invalid FEN in session log: {e}")
    return Response(chess.svg.board(board, size=560), media_type="image/svg+xml")


@router.post("/api/sessions/{sid}/archive")
def session_archive(sid: str):
    from ... import sessions as sessions_mod

    try:
        return sessions_mod.archive_session(sid)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.post("/api/sessions/{sid}/restore")
def session_restore(sid: str):
    from ... import sessions as sessions_mod

    try:
        return sessions_mod.restore_session(sid)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except FileExistsError as e:
        raise HTTPException(409, str(e))


@router.post("/api/sessions/{sid}/reviewed")
def session_set_reviewed(sid: str, reviewed: bool = Body(..., embed=True)):
    """Mark a session reviewed / not-reviewed so the UI can hide it from the NEW list."""
    from ... import sessions as sessions_mod

    try:
        return sessions_mod.set_session_reviewed(sid, reviewed)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.delete("/api/sessions/{sid}")
def session_delete(sid: str):
    from ... import sessions as sessions_mod

    try:
        return sessions_mod.delete_session(sid)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.post("/api/sessions/{sid}/trim")
def session_trim(sid: str, keep_frames: int = Body(..., embed=True)):
    from ... import sessions as sessions_mod

    try:
        return sessions_mod.trim_session(sid, keep_frames)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.post("/api/sessions/{sid}/flag/{idx}")
def session_flag_unusable(sid: str, idx: int, unusable: bool = Body(..., embed=True)):
    """Toggle the 'unusable' flag on a single frame in the session log."""
    sdir, _archived = _review_session_dir(sid)
    log_path = sdir / "log.jsonl"
    if not log_path.exists():
        raise HTTPException(404, f"Session '{sid}' has no log.jsonl.")
    lines = log_path.read_text(encoding="utf-8").splitlines()
    if idx < 0 or idx >= len(lines):
        raise HTTPException(400, f"Index {idx} out of range (0–{len(lines) - 1}).")
    entry = json.loads(lines[idx])
    entry["unusable"] = unusable
    lines[idx] = json.dumps(entry, ensure_ascii=False, default=str)
    log_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return {"ok": True, "session_id": sid, "index": idx, "unusable": unusable}


@router.post("/api/sessions/{sid}/slice")
def session_slice(sid: str, pad_up: float | None = Query(None), pad_side: float | None = Query(None)):
    from ... import labeling as labeling_mod
    from ... import sessions as sessions_mod

    rc = labeling_mod.run_slice(session=sid, pad_up=pad_up, pad_side=pad_side)
    crops = _crop_count(sid)
    if rc != 0:
        raise HTTPException(400, f"Slicing for '{sid}' failed.")
    # Slicing a session implies the user has accepted it → mark reviewed so it drops out of the
    # NEW list. Best-effort: a bookkeeping failure must not fail the slice itself.
    try:
        sessions_mod.set_session_reviewed(sid, True)
    except (ValueError, FileNotFoundError):
        pass
    return {"ok": True, "session": sid, "crops": crops}


@router.post("/api/reslice")
def reslice(session: str = Query(...), pad_up: float | None = Query(None),
            pad_side: float | None = Query(None)):
    from ... import labeling as labeling_mod

    rc = labeling_mod.run_slice(session=session, pad_up=pad_up, pad_side=pad_side)
    crops = _crop_count(session)
    return {"ok": rc == 0, "session": session, "crops": crops}


@router.post("/api/slice")
def slice_all(pad_up: float | None = Body(None), pad_side: float | None = Body(None)):
    from ... import labeling as labeling_mod

    rc = labeling_mod.run_slice(slice_all=True, pad_up=pad_up, pad_side=pad_side)
    return {"ok": rc == 0}
