"""Scanner-Router: /api/scan/* — Turntable-Aufnahme + 3D-Modell-Vorbereitung (v2: meshprep in-process)."""

from __future__ import annotations

import json
import logging
import re
import subprocess
import threading
from pathlib import Path

from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import FileResponse, Response

from ..camera import mjpeg
from ..scan import SCANNER, SCANS_ROOT
from ..state import LockedState

router = APIRouter()
log = logging.getLogger("chesslab.web")

# Vorbereitungs-Job (ein Lauf gleichzeitig, Muster wie TRAIN): `chesslab synth prepare`
# jetzt in-process über meshprep.prepare_scan() in einem Hintergrund-Thread.
# `dir` = Quell-Scan (für Per-Karte-Status).
PREPARE = LockedState(proc=None, piece=None, dir=None, log=None, state="idle", error=None)
# Rekonstruktions-Job (RealityScan headless, ein Lauf gleichzeitig).
RECON = LockedState(proc=None, dir=None, log=None, state="idle")
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
    from ...scan_discover import _pick_texture

    scans = []
    if SCANS_ROOT.is_dir():
        for d in sorted(p for p in SCANS_ROOT.iterdir() if p.is_dir()):
            objs = sorted(d.glob("*.obj"))
            glbs = sorted([*d.glob("*.glb"), *d.glob("*.gltf")])
            photos = sum(1 for _ in d.glob("[0-9]*.jpg"))
            if not objs and not glbs and photos == 0:
                continue                        # leerer/irrelevanter Ordner
            mesh = (objs or glbs)
            tex = _pick_texture(d)
            scans.append({"dir": d.name, "mesh": mesh[0].name if mesh else None,
                          "texture": tex.name if tex else None, "photos": photos})
    pieces = []
    pdir = _repo_root() / "synth_pieces"
    if pdir.is_dir():
        for o in sorted(pdir.glob("*.obj")):
            rep = pdir / f"{o.stem}_report.json"
            src = pdir / f"{o.stem}.src"          # Quell-Scan-Ordner (beim Vorbereiten geschrieben)
            pieces.append({"piece": o.stem,
                           "source_dir": src.read_text(encoding="utf-8").strip() if src.exists() else None,
                           "has_preview": (pdir / f"{o.stem}_preview.png").exists(),
                           "has_clay": (pdir / f"{o.stem}_preview_clay.png").exists(),
                           "report": json.loads(rep.read_text(encoding="utf-8")) if rep.exists() else None})
    # Aktuell laufende Jobs (für Per-Karte-Status im UI)
    r, pp = RECON.snapshot(), PREPARE.snapshot()
    jobs = {}
    if r.get("proc") is not None and r["proc"].poll() is None:
        jobs["reconstruct"] = r.get("dir")
    if pp.get("proc") is not None and pp["proc"].poll() is None:
        jobs["prepare"] = pp.get("dir")
    return {"scans": scans, "pieces": pieces, "jobs": jobs}


@router.post("/api/scan/prepare")
def scan_prepare(dir: str = Body(...), piece: str = Body(...),
                 target_tris: int = Body(20000), smooth_iters: int = Body(10),
                 plane_eps: float | None = Body(None),
                 plate_diameter_mm: float | None = Body(None),
                 fill_holes: bool = Body(True)):
    """`chesslab synth prepare` für EINEN Scan-Ordner starten (v2: meshprep in-process, async per Thread)."""
    from ...meshprep import prepare_scan
    from ...scan_discover import ScanItem, _pick_texture

    if not _PIECE.match(piece):
        raise HTTPException(400, f"ungültiger Figurenname {piece!r} (P/N/B/R/Q/K, optional w/b-Präfix)")
    state = PREPARE.get("state")
    if state == "running":
        raise HTTPException(409, "es läuft bereits eine Vorbereitung.")
    d = SCANS_ROOT / dir
    objs = sorted([*d.glob("*.obj"), *d.glob("*.glb"), *d.glob("*.gltf")])
    if not objs:
        raise HTTPException(404, f"kein Mesh in scans/{dir} — erst in RealityScan rekonstruieren/exportieren.")
    item = ScanItem(name=piece, obj=objs[0], tex=_pick_texture(d))
    out = _repo_root() / "synth_pieces"
    (out / f"{piece}.src").write_text(dir, encoding="utf-8")  # Figur ↔ Quell-Scan verknüpfen

    eps = plane_eps if plane_eps is not None else 0.1     # meshprep default

    PREPARE.update(proc=None, piece=piece, dir=dir, log=None, state="running", error=None)

    def _run():
        try:
            prepare_scan(item, out, target_tris=target_tris, plane_eps=eps,
                         plate_diameter_mm=plate_diameter_mm, fill_holes=fill_holes,
                         smooth_iters=smooth_iters, make_preview=True)
            PREPARE.update(state="done")
        except Exception as exc:
            PREPARE.update(state="failed", error=str(exc))
            log.exception("synth prepare fehlgeschlagen: %s", piece)

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    PREPARE.update(proc=t)  # Thread als "proc" ablegen, damit isnull check funktioniert
    log.info("synth prepare gestartet (v2 meshprep): %s -> %s", dir, piece)
    return {"ok": True, "piece": piece, "pipeline": "meshprep"}


@router.get("/api/scan/prepare/status")
def scan_prepare_status():
    from ...scan_discover import assess_report, load_report

    s = PREPARE.snapshot()
    proc, piece = s.get("proc"), s.get("piece")
    # proc is now a threading.Thread (not a subprocess.Popen)
    is_running = proc is not None and proc.is_alive() if hasattr(proc, "is_alive") else False
    if is_running:
        state = "running"
    elif proc is not None:
        # Thread finished — state already set by the worker
        state = s.get("state", "done")
        PREPARE.update(state=state)
    else:
        state = s.get("state", "idle")
    out = {"state": state, "piece": piece, "dir": s.get("dir")}
    if piece and state in ("done", "failed"):
        report = load_report(_repo_root() / "synth_pieces", piece)
        if report:
            level, msgs = assess_report(report)
            out.update(report=report, level=level, messages=msgs,
                       center_component_frac=report.get("center_component_frac"),
                       scale_mm_per_unit=report.get("scale_mm_per_unit"))
        err = s.get("error")
        if state == "failed" and err:
            out["log_tail"] = str(err)[-500:]
    return out


@router.get("/api/scan/prepare/preview/{piece}")
def scan_prepare_preview(piece: str, variant: str = "textured"):
    """Vorschau einer vorbereiteten Figur. variant=textured|clay (clay zeigt die reine
    Geometrie — Bumps/Löcher ohne Textur-Ablenkung)."""
    if not _PIECE.match(piece):
        raise HTTPException(404, "unbekannte Figur")
    stem = f"{piece}_preview" + ("_clay" if variant == "clay" else "")
    p = _repo_root() / "synth_pieces" / f"{stem}.png"
    if not p.exists():
        return Response(status_code=204)
    return FileResponse(str(p), media_type="image/png")


# --- Photogrammetrie: RealityScan headless anstoßen ------------------------------------

@router.post("/api/scan/reconstruct")
def scan_reconstruct(dir: str = Body(..., embed=True)):
    """RealityScan headless auf einem Scan-Ordner starten (align → Mesh + Textur → .obj export)."""
    from ... import config

    exe = config.find_realityscan()
    if not exe:
        raise HTTPException(400, "RealityScan nicht gefunden — CHESSLAB_REALITYSCAN setzen "
                                 "(Pfad zur RealityScan.exe).")
    proc = RECON.get("proc")
    if proc is not None and proc.poll() is None:
        raise HTTPException(409, "es läuft bereits eine Rekonstruktion.")
    d = SCANS_ROOT / dir
    n_photos = sum(1 for _ in d.glob("[0-9]*.jpg"))
    if n_photos < 20:
        raise HTTPException(400, f"nur {n_photos} Fotos in scans/{dir} — für Photogrammetrie zu wenig "
                                 "(mind. ~20, besser 60+).")
    out_obj = (d / f"mesh_{dir.lower()}.obj").resolve()  # absolut, damit RealityScan nicht in sein Arbeitsverzeichnis exportiert
    cmd = [exe, "-headless", "-addFolder", str(d), "-align", "-setReconstructionRegionAuto",
           "-calculateNormalModel", "-calculateTexture", "-exportSelectedModel", str(out_obj), "-quit"]
    log_path = d / "_reconstruct.log"
    log_fh = open(log_path, "w", encoding="utf-8")
    p = subprocess.Popen(cmd, stdout=log_fh, stderr=subprocess.STDOUT)
    log_fh.close()   # Kind hält sein eigenes dupliziertes Handle (Windows-Sperre)
    RECON.update(proc=p, dir=dir, log=log_path, state="running")
    log.info("RealityScan gestartet: %s (%d Fotos)", dir, n_photos)
    return {"ok": True, "dir": dir, "photos": n_photos, "cmd": " ".join(cmd)}


@router.get("/api/scan/reconstruct/status")
def scan_reconstruct_status():
    s = RECON.snapshot()
    proc, dir_ = s.get("proc"), s.get("dir")
    rc = proc.poll() if proc is not None else None
    if proc is not None and rc is None:
        state = "running"
    elif proc is not None:
        state = "done" if rc == 0 else "failed"
        RECON.update(state=state)
    else:
        state = s.get("state", "idle")
    out = {"state": state, "dir": dir_}
    if dir_ and state in ("done", "failed"):
        d = SCANS_ROOT / dir_
        out["mesh"] = next((p.name for p in sorted(d.glob("*.obj"))), None)
        log_path = s.get("log")
        if state == "failed" and log_path and Path(log_path).exists():
            out["log_tail"] = "\n".join(
                Path(log_path).read_text(encoding="utf-8", errors="replace").splitlines()[-10:])
    return out


# --- Löschen + 3D-Modell-Dateien für den Viewer ---------------------------------------

def _safe_seg(name: str) -> str:
    """Pfad-Segment absichern (kein Traversal)."""
    if not name or "/" in name or "\\" in name or ".." in name:
        raise HTTPException(400, f"ungültiger Name: {name!r}")
    return name


@router.delete("/api/scan/scan/{dir}")
def scan_delete(dir: str):
    """Kompletten Scan-Ordner (Fotos + Mesh) löschen."""
    import shutil

    d = SCANS_ROOT / _safe_seg(dir)
    if not d.is_dir():
        raise HTTPException(404, f"Scan '{dir}' nicht gefunden.")
    shutil.rmtree(d)
    log.info("Scan gelöscht: %s", dir)
    return {"ok": True, "dir": dir}


@router.delete("/api/scan/piece/{piece}")
def piece_delete(piece: str):
    """Vorbereitete Figur löschen (obj + Textur + Previews + Report)."""
    if not _PIECE.match(piece):
        raise HTTPException(400, "ungültiger Figurenname")
    pdir = _repo_root() / "synth_pieces"
    removed = []
    for suffix in (".obj", ".png", "_preview.png", "_preview_clay.png", "_report.json", ".src"):
        p = pdir / f"{piece}{suffix}"
        if p.exists():
            p.unlink()
            removed.append(p.name)
    if not removed:
        raise HTTPException(404, f"Figur '{piece}' nicht gefunden.")
    log.info("Figur gelöscht: %s (%s)", piece, ", ".join(removed))
    return {"ok": True, "piece": piece, "removed": removed}


@router.get("/api/scan/model/{piece}.obj")
def piece_obj(piece: str):
    if not _PIECE.match(piece):
        raise HTTPException(404, "unbekannte Figur")
    p = _repo_root() / "synth_pieces" / f"{piece}.obj"
    if not p.exists():
        raise HTTPException(404, "kein Mesh")
    return FileResponse(str(p), media_type="text/plain")


@router.get("/api/scan/model/{piece}.png")
def piece_tex(piece: str):
    if not _PIECE.match(piece):
        raise HTTPException(404, "unbekannte Figur")
    p = _repo_root() / "synth_pieces" / f"{piece}.png"
    if not p.exists():
        return Response(status_code=204)
    return FileResponse(str(p), media_type="image/png")
