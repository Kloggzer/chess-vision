"""Scanner-Router: /api/scan/* — Turntable-Aufnahme + 3D-Modell-Vorbereitung (synth prepare)."""

from __future__ import annotations

import json
import logging
import re
import subprocess
import sys
from pathlib import Path

from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import FileResponse, Response

from ..camera import mjpeg
from ..scan import SCANNER, SCANS_ROOT
from ..state import LockedState

router = APIRouter()
log = logging.getLogger("chesslab.web")

# Vorbereitungs-Job (ein Lauf gleichzeitig, Muster wie TRAIN): `chesslab synth prepare`
# als Subprozess, damit Blender das Web nicht blockiert.
PREPARE = LockedState(proc=None, piece=None, log=None, state="idle")
_PIECE = re.compile(r"^[wb]?[PNBRQK]$")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


@router.get("/api/scan/status")
def scan_status():
    return SCANNER.status()


@router.post("/api/scan/open")
def scan_open(source: str = Body(...), width: int = Body(3840), height: int = Body(2160)):
    try:
        return SCANNER.open(source, width, height)
    except Exception as e:  # noqa: BLE001 — Nutzerfehler (Quelle/URL) sauber ans Frontend
        raise HTTPException(400, str(e))


@router.post("/api/scan/config")
def scan_config(crop: list[int] | None = Body(None), interval: float | None = Body(None),
                count: int | None = Body(None), quality: int | None = Body(None),
                out: str | None = Body(None)):
    return SCANNER.configure(crop=crop, interval=interval, count=count, quality=quality, out=out)


@router.post("/api/scan/start")
def scan_start(out: str | None = Body(None, embed=True)):
    try:
        return SCANNER.start(out)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(400, str(e))


@router.post("/api/scan/stop")
def scan_stop():
    return SCANNER.stop()


@router.post("/api/scan/close")
def scan_close():
    SCANNER.close()
    return SCANNER.status()


@router.get("/api/scan/preview.mjpg")
def scan_preview():
    def frames():
        last = -1
        try:
            while True:
                img, fid = SCANNER.preview(last_id=last)
                last = fid
                yield img      # None -> mjpeg wartet kurz (kein neuer Frame, kein Fehlerbild:
                               # der Scanner liefert bewusst nur bei neuen Frames)
        finally:
            log.info("Stream beendet: scan-preview")
    return mjpeg(frames())


# --- 3D-Modell-Vorbereitung (Scan → renderfertige Figur, headless Blender) -------------

@router.get("/api/scan/models")
def scan_models():
    """Scan-Ordner mit Mesh (rekonstruiert) + bereits vorbereitete Figuren auflisten."""
    from ...synth_prepare import _pick_texture

    scans = []
    if SCANS_ROOT.is_dir():
        for d in sorted(p for p in SCANS_ROOT.iterdir() if p.is_dir()):
            objs = sorted(d.glob("*.obj"))
            glbs = sorted([*d.glob("*.glb"), *d.glob("*.gltf")])
            if not objs and not glbs:
                continue                        # noch nicht rekonstruiert (nur Fotos)
            tex = _pick_texture(d)
            scans.append({"dir": d.name, "mesh": (objs or glbs)[0].name,
                          "texture": tex.name if tex else None,
                          "photos": sum(1 for _ in d.glob("[0-9]*.jpg"))})
    pieces = []
    pdir = _repo_root() / "synth_pieces"
    if pdir.is_dir():
        for o in sorted(pdir.glob("*.obj")):
            rep = pdir / f"{o.stem}_report.json"
            pieces.append({"piece": o.stem,
                           "has_preview": (pdir / f"{o.stem}_preview.png").exists(),
                           "report": json.loads(rep.read_text(encoding="utf-8")) if rep.exists() else None})
    return {"scans": scans, "pieces": pieces}


@router.post("/api/scan/prepare")
def scan_prepare(dir: str = Body(...), piece: str = Body(...),
                 target_tris: int = Body(20000), smooth_iters: int = Body(10),
                 keep_radius: float = Body(1.9)):
    """`chesslab synth prepare` für EINEN Scan-Ordner starten (Blender headless, async)."""
    from ... import config
    from ...synth_prepare import ScanItem, _pick_texture, build_isolate_cmd

    if not _PIECE.match(piece):
        raise HTTPException(400, f"ungültiger Figurenname {piece!r} (P/N/B/R/Q/K, optional w/b-Präfix)")
    proc = PREPARE.get("proc")
    if proc is not None and proc.poll() is None:
        raise HTTPException(409, "es läuft bereits eine Vorbereitung.")
    d = SCANS_ROOT / dir
    objs = sorted([*d.glob("*.obj"), *d.glob("*.glb"), *d.glob("*.gltf")])
    if not objs:
        raise HTTPException(404, f"kein Mesh in scans/{dir} — erst in RealityScan rekonstruieren/exportieren.")
    item = ScanItem(name=piece, obj=objs[0], tex=_pick_texture(d))
    out = _repo_root() / "synth_pieces"
    script = _repo_root() / "synth" / "isolate_piece.py"
    cmd = build_isolate_cmd(config.SYNTH.blender_cmd(), script, item, out,
                            target_tris, smooth_iters, keep_radius)
    log_path = out / "_prepare.log"
    log_fh = open(log_path, "w", encoding="utf-8")
    p = subprocess.Popen(cmd, stdout=log_fh, stderr=subprocess.STDOUT)
    log_fh.close()   # Kind hält sein eigenes dupliziertes Handle (Windows-Sperre)
    PREPARE.update(proc=p, piece=piece, log=log_path, state="running")
    log.info("synth prepare gestartet: %s -> %s", dir, piece)
    return {"ok": True, "piece": piece, "cmd": " ".join(cmd)}


@router.get("/api/scan/prepare/status")
def scan_prepare_status():
    from ...synth_prepare import assess_report, load_report

    s = PREPARE.snapshot()
    proc, piece = s.get("proc"), s.get("piece")
    rc = proc.poll() if proc is not None else None
    if proc is not None and rc is None:
        state = "running"
    elif proc is not None:
        state = "done" if rc == 0 else "failed"
        PREPARE.update(state=state)
    else:
        state = s.get("state", "idle")
    out = {"state": state, "piece": piece}
    if piece and state in ("done", "failed"):
        report = load_report(_repo_root() / "synth_pieces", piece)
        if report:
            level, msgs = assess_report(report)
            out.update(report=report, level=level, messages=msgs)
        log_path = s.get("log")
        if state == "failed" and log_path and Path(log_path).exists():
            out["log_tail"] = "\n".join(
                Path(log_path).read_text(encoding="utf-8", errors="replace").splitlines()[-8:])
    return out


@router.get("/api/scan/prepare/preview/{piece}")
def scan_prepare_preview(piece: str):
    if not _PIECE.match(piece):
        raise HTTPException(404, "unbekannte Figur")
    p = _repo_root() / "synth_pieces" / f"{piece}_preview.png"
    if not p.exists():
        return Response(status_code=204)
    return FileResponse(str(p), media_type="image/png")
