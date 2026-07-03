"""Scan router: /api/scan/* — Mesh-Upload + 3D-Vorbereitung (meshprep in-process)."""

from __future__ import annotations

import json
import logging
import re
import threading
from pathlib import Path

from fastapi import APIRouter, Body, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response

from ..state import LockedState

router = APIRouter()
log = logging.getLogger("chesslab.web")

# scans/ liegt auf Repo-Ebene (neben data/)
SCANS_ROOT = Path(__file__).resolve().parents[3] / "scans"

PREPARE = LockedState(proc=None, piece=None, dir=None, log=None, state="idle", error=None)
_PIECE = re.compile(r"^[wb]?[PNBRQK]$")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


# --- Mesh-Upload ---------------------------------------------------------------

_MESH_EXTENSIONS = {".obj", ".glb", ".gltf"}
_TEXTURE_EXTENSIONS = {".png", ".jpg", ".jpeg"}
_SAFE_NAME = re.compile(r"^[a-zA-Z0-9_-]+$")


@router.post("/api/scan/upload")
async def scan_upload(
    name: str = Form(...),
    mesh: UploadFile = File(...),
    texture: UploadFile | None = File(None),
):
    """Mesh-Datei + optionale Textur hochladen (bereits freigestelltes Einzelstück)."""
    if not _SAFE_NAME.match(name):
        raise HTTPException(400, f"Name {name!r} enthält ungültige Zeichen (nur a-Z, 0-9, _, -).")
    mesh_ext = Path(mesh.filename or "").suffix.lower()
    if mesh_ext not in _MESH_EXTENSIONS:
        raise HTTPException(400, f"Mesh-Format {mesh_ext} nicht unterstützt ({sorted(_MESH_EXTENSIONS)}).")

    d = SCANS_ROOT / name
    d.mkdir(parents=True, exist_ok=True)
    mesh_data = await mesh.read()
    mesh_path = d / f"mesh_{name}{mesh_ext}"
    mesh_path.write_bytes(mesh_data)
    log.info("upload mesh: %s (%d bytes)", mesh_path, len(mesh_data))

    tex_path: Path | None = None
    if texture is not None:
        tex_ext = Path(texture.filename or "").suffix.lower()
        if tex_ext not in _TEXTURE_EXTENSIONS:
            raise HTTPException(400, f"Textur-Format {tex_ext} nicht unterstützt ({sorted(_TEXTURE_EXTENSIONS)}).")
        tex_data = await texture.read()
        tex_path = d / f"mesh_{name}_diffuse{tex_ext}"
        tex_path.write_bytes(tex_data)
        log.info("upload texture: %s (%d bytes)", tex_path, len(tex_data))

    return {"ok": True, "dir": name, "mesh": mesh_path.name,
            "texture": tex_path.name if tex_path else None}


# --- 3D-Modell-Vorbereitung ----------------------------------------------------

@router.get("/api/scan/models")
def scan_models():
    """Scan-Ordner mit Mesh + bereits vorbereitete Figuren auflisten."""
    from ...scan_discover import _pick_texture, pick_mesh

    scans = []
    if SCANS_ROOT.is_dir():
        for d in sorted(p for p in SCANS_ROOT.iterdir() if p.is_dir()):
            mesh_path = pick_mesh(d)
            photos = sum(1 for _ in d.glob("[0-9]*.jpg"))
            if mesh_path is None and photos == 0:
                continue
            tex = _pick_texture(d)
            scans.append({"dir": d.name,
                          "mesh": mesh_path.name if mesh_path else None,
                          "texture": tex.name if tex else None,
                          "photos": photos,
                          "clean": True})
    pieces = []
    pdir = _repo_root() / "synth_pieces"
    if pdir.is_dir():
        for o in sorted(pdir.glob("*.obj")):
            rep = pdir / f"{o.stem}_report.json"
            src = pdir / f"{o.stem}.src"
            pieces.append({"piece": o.stem,
                           "source_dir": src.read_text(encoding="utf-8").strip() if src.exists() else None,
                           "has_preview": (pdir / f"{o.stem}_preview.png").exists(),
                           "has_clay": (pdir / f"{o.stem}_preview_clay.png").exists(),
                           "report": json.loads(rep.read_text(encoding="utf-8")) if rep.exists() else None})
    pp = PREPARE.snapshot()
    jobs = {}
    pproc = pp.get("proc")
    if pp.get("state") == "running" or (pproc is not None and getattr(pproc, "is_alive", lambda: False)()):
        jobs["prepare"] = pp.get("dir")
    return {"scans": scans, "pieces": pieces, "jobs": jobs}


@router.post("/api/scan/prepare")
def scan_prepare(dir: str = Body(...), piece: str = Body(...)):
    """Vorbereitung für EINEN Scan-Ordner starten (meshprep in-process)."""
    from ...meshprep import prepare_scan
    from ...scan_discover import ScanItem, _pick_texture, pick_mesh

    if not _PIECE.match(piece):
        raise HTTPException(400, f"ungültiger Figurenname {piece!r} (P/N/B/R/Q/K, optional w/b-Präfix)")
    state = PREPARE.get("state")
    if state == "running":
        raise HTTPException(409, "es läuft bereits eine Vorbereitung.")
    d = SCANS_ROOT / dir
    obj_path = pick_mesh(d)
    if obj_path is None:
        raise HTTPException(404, f"kein Mesh in scans/{dir} — erst hochladen.")
    item = ScanItem(name=piece, obj=obj_path, tex=_pick_texture(d))
    out = _repo_root() / "synth_pieces"
    (out / f"{piece}.src").write_text(dir, encoding="utf-8")

    PREPARE.update(proc=None, piece=piece, dir=dir, log=None, state="running", error=None)

    def _run():
        try:
            prepare_scan(item, out, make_preview=True)
            PREPARE.update(state="done")
        except Exception as exc:
            PREPARE.update(state="failed", error=str(exc))
            log.exception("synth prepare fehlgeschlagen: %s", piece)

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    PREPARE.update(proc=t)
    log.info("synth prepare gestartet (meshprep): %s -> %s", dir, piece)
    return {"ok": True, "piece": piece, "pipeline": "meshprep"}


@router.get("/api/scan/prepare/status")
def scan_prepare_status():
    from ...scan_discover import assess_report, load_report

    s = PREPARE.snapshot()
    proc, piece = s.get("proc"), s.get("piece")
    is_running = proc is not None and proc.is_alive() if hasattr(proc, "is_alive") else False
    if is_running:
        state = "running"
    elif proc is not None:
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
                       center_component_frac=report.get("center_component_frac"))
        err = s.get("error")
        if state == "failed" and err:
            out["log_tail"] = str(err)[-500:]
    return out


@router.get("/api/scan/prepare/preview/{piece}")
def scan_prepare_preview(piece: str, variant: str = "textured"):
    """Vorschau einer vorbereiteten Figur. variant=textured|clay."""
    if not _PIECE.match(piece):
        raise HTTPException(404, "unbekannte Figur")
    stem = f"{piece}_preview" + ("_clay" if variant == "clay" else "")
    p = _repo_root() / "synth_pieces" / f"{stem}.png"
    if not p.exists():
        return Response(status_code=204)
    return FileResponse(str(p), media_type="image/png")


# --- Löschen -------------------------------------------------------------------

def _safe_seg(name: str) -> str:
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


# --- 3D-Modell-Dateien für den Viewer -----------------------------------------

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
