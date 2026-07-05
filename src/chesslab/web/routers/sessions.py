"""Session/Review router: /api/sessions*, /api/reslice, /api/slice"""

from __future__ import annotations

from fastapi import APIRouter, Body, HTTPException, Query

router = APIRouter()


def _crop_count(sid: str) -> int:
    from ... import config
    from ...manifest_cache import session_crop_count

    return session_crop_count(config.DATA.manifests / "squares.jsonl", sid)


@router.get("/api/sessions")
def sessions():
    by_session: dict[str, set] = {}
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


@router.delete("/api/sessions/{sid}")
def session_delete(sid: str):
    from ... import sessions as sessions_mod

    try:
        return sessions_mod.delete_session(sid)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.post("/api/sessions/{sid}/slice")
def session_slice(sid: str, pad_up: float | None = Query(None), pad_side: float | None = Query(None)):
    from ... import labeling as labeling_mod

    rc = labeling_mod.run_slice(session=sid, pad_up=pad_up, pad_side=pad_side)
    crops = _crop_count(sid)
    if rc != 0:
        raise HTTPException(400, f"Slicing for '{sid}' failed.")
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
