"""Session-/Review-Router: /api/sessions*, /api/review, /api/corrections, /api/reslice, /api/slice"""

from __future__ import annotations

from fastapi import APIRouter, Body, HTTPException, Query

from ..util import _img_url, _manifest

router = APIRouter()


@router.get("/api/sessions")
def sessions():
    by_session: dict[str, set] = {}
    for r in _manifest():
        by_session.setdefault(r["session_id"], set()).add(str(r["frame"]))
    return [{"session_id": sid, "frames": sorted(frames), "n_frames": len(frames)}
            for sid, frames in sorted(by_session.items())]


@router.get("/api/sessions/manage")
def sessions_manage():
    """Alle aufgenommenen Sessions (aktiv + archiviert) mit Eckdaten für die Verwaltung."""
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
    crops = sum(1 for r in _manifest() if r.get("session_id") == sid)
    if rc != 0:
        raise HTTPException(400, f"Slicing für '{sid}' fehlgeschlagen.")
    return {"ok": True, "session": sid, "crops": crops}


@router.get("/api/review")
def review(session: str, frame: str, run: str | None = Query(None)):
    rows = [r for r in _manifest() if r["session_id"] == session and str(r["frame"]) == str(frame)]
    if not rows:
        raise HTTPException(404, "keine Crops für diese Session/Frame (erst slicen?)")
    rows.sort(key=lambda r: r["square"])
    preds = []
    if run:
        try:
            from ..app import labeling_predict

            preds = labeling_predict(run, rows)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(500, f"Inferenz fehlgeschlagen: {e}")
    cells = []
    for i, r in enumerate(rows):
        p = preds[i] if i < len(preds) else {}
        pred = p.get("pred_label")
        cells.append({
            "square": r["square"], "square_color": r["square_color"],
            "url": _img_url(r["path"]), "label": r["label"],
            "pred_label": pred, "confidence": p.get("confidence"),
            "disagree": bool(pred and pred != r["label"]),
        })
    return {"session": session, "frame": frame, "run": run, "fen": rows[0]["fen"], "cells": cells}


@router.post("/api/corrections")
def corrections(items: list[dict] = Body(...)):
    from ... import config
    from ... import labeling as labeling_mod

    for it in items:
        if it.get("label") not in config.CLASSES:
            raise HTTPException(400, f"ungültiges Label {it.get('label')!r}")
        if not all(k in it for k in ("session_id", "frame", "square")):
            raise HTTPException(400, "session_id/frame/square erforderlich")
    n = labeling_mod.upsert_corrections(items, config.DATA.corrections)
    return {"ok": True, "applied": len(items), "total_corrections": n}


@router.post("/api/reslice")
def reslice(session: str = Query(...), pad_up: float | None = Query(None),
            pad_side: float | None = Query(None)):
    from ... import labeling as labeling_mod

    rc = labeling_mod.run_slice(session=session, pad_up=pad_up, pad_side=pad_side)
    crops = sum(1 for r in _manifest() if r.get("session_id") == session)
    return {"ok": rc == 0, "session": session, "crops": crops}


@router.post("/api/slice")
def slice_all(pad_up: float | None = Body(None), pad_side: float | None = Body(None)):
    from ... import labeling as labeling_mod

    rc = labeling_mod.run_slice(slice_all=True, pad_up=pad_up, pad_side=pad_side)
    return {"ok": rc == 0}
