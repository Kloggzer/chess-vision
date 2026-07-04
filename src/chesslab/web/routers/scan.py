"""Scan router: /api/scan/* — Mesh-Upload + 3D-Vorbereitung (meshprep in-process)."""

from __future__ import annotations

import json
import logging
import re
import threading
from pathlib import Path

from fastapi import APIRouter, Body, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response, StreamingResponse

from ..camera import mjpeg
from ..scan import SCANNER, SCANS_ROOT
from ..state import LockedState

router = APIRouter()
log = logging.getLogger("chesslab.web")

PREPARE = LockedState(proc=None, piece=None, variant=None, dir=None, log=None,
                      state="idle", error=None)
_PIECE = re.compile(r"^[wb]?[PNBRQK]$")
_VARIANT = re.compile(r"^[A-Za-z0-9_-]+$")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def _piece_dir(piece: str, variant: str) -> Path:
    """Validated ``synth_pieces/<piece>/`` dir, with a checked variant stem.

    Raises 404 on a bad piece name and 400 on a path-unsafe variant.
    """
    if not _PIECE.match(piece):
        raise HTTPException(404, "unbekannte Figur")
    if not _VARIANT.match(variant):
        raise HTTPException(400, f"ungültige Variante: {variant!r}")
    return _repo_root() / "synth_pieces" / piece


# --- Turntable-Foto-Aufnahme (Capture) -------------------------------------------

@router.get("/api/scan/status")
def scan_status():
    return SCANNER.status()


@router.post("/api/scan/open")
def scan_open(source: str = Body(...), width: int = Body(2880), height: int = Body(2160),
              capture: str = Body("")):
    try:
        return SCANNER.open(source, width, height, capture_source=capture)
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
        # New layout: one folder per canonical piece, one file-set per variant.
        for d in sorted(p for p in pdir.iterdir() if p.is_dir()):
            for o in sorted(d.glob("*.obj")):
                stem = o.stem  # variant slot, e.g. "v1"
                rep = d / f"{stem}_report.json"
                src = d / f"{stem}.src"
                pieces.append({
                    "piece": d.name,
                    "variant": stem,
                    "id": f"{d.name}/{stem}",
                    "source_dir": src.read_text(encoding="utf-8").strip() if src.exists() else None,
                    "has_preview": (d / f"{stem}_preview.png").exists(),
                    "has_clay": (d / f"{stem}_preview_clay.png").exists(),
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
    from ...scan_discover import (
        ScanItem,
        _pick_texture,
        is_bare_piece,
        next_variant,
        parse_piece_name,
        pick_mesh,
    )

    parsed = parse_piece_name(piece)
    if parsed is None:
        raise HTTPException(400, f"ungültiger Figurenname {piece!r} (P/N/B/R/Q/K, optional "
                                 "w/b-Präfix, optionaler Varianten-Suffix wie wP2 / wP_glas)")
    canonical, variant = parsed
    state = PREPARE.get("state")
    if state == "running":
        raise HTTPException(409, "es läuft bereits eine Vorbereitung.")
    d = SCANS_ROOT / dir
    obj_path = pick_mesh(d)
    if obj_path is None:
        raise HTTPException(404, f"kein Mesh in scans/{dir} — erst hochladen.")
    out = _repo_root() / "synth_pieces"
    piece_folder = out / canonical
    piece_folder.mkdir(parents=True, exist_ok=True)
    # A bare name ("wP") means "add a new version" → take the next free slot instead
    # of clobbering v1.  An explicit suffix ("wP2") targets that exact slot.
    if is_bare_piece(piece):
        variant = next_variant(piece_folder)
    item = ScanItem(name=canonical, obj=obj_path, tex=_pick_texture(d), variant=variant)
    (piece_folder / f"{variant}.src").write_text(dir, encoding="utf-8")

    PREPARE.update(proc=None, piece=canonical, variant=variant, dir=dir, log=None,
                   state="running", error=None)

    def _run():
        try:
            prepare_scan(item, out, make_preview=True)
            PREPARE.update(state="done")
        except Exception as exc:
            PREPARE.update(state="failed", error=str(exc))
            log.exception("synth prepare fehlgeschlagen: %s/%s", canonical, variant)

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    PREPARE.update(proc=t)
    log.info("synth prepare gestartet (meshprep): %s -> %s/%s", dir, canonical, variant)
    return {"ok": True, "piece": canonical, "variant": variant, "pipeline": "meshprep"}


@router.get("/api/scan/prepare/status")
def scan_prepare_status():
    from ...scan_discover import assess_report, load_report

    s = PREPARE.snapshot()
    proc, piece, variant = s.get("proc"), s.get("piece"), s.get("variant") or "v1"
    is_running = proc is not None and proc.is_alive() if hasattr(proc, "is_alive") else False
    if is_running:
        state = "running"
    elif proc is not None:
        state = s.get("state", "done")
        PREPARE.update(state=state)
    else:
        state = s.get("state", "idle")
    out = {"state": state, "piece": piece, "variant": variant, "dir": s.get("dir")}
    if piece and state in ("done", "failed"):
        report = load_report(_repo_root() / "synth_pieces" / piece, variant)
        if report:
            level, msgs = assess_report(report)
            out.update(report=report, level=level, messages=msgs,
                       center_component_frac=report.get("center_component_frac"))
        err = s.get("error")
        if state == "failed" and err:
            out["log_tail"] = str(err)[-500:]
    return out


@router.get("/api/scan/prepare/preview/{piece}/{variant}")
def scan_prepare_preview(piece: str, variant: str, kind: str = "textured"):
    """Vorschau einer vorbereiteten Figur-Variante. kind=textured|clay."""
    pdir = _piece_dir(piece, variant)
    stem = f"{variant}_preview" + ("_clay" if kind == "clay" else "")
    p = pdir / f"{stem}.png"
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


@router.delete("/api/scan/piece/{piece}/{variant}")
def piece_delete(piece: str, variant: str):
    """Eine vorbereitete Figur-Variante löschen (obj + mtl + Textur + Previews + Report)."""
    pdir = _piece_dir(piece, variant)
    removed = []
    for suffix in (".obj", ".mtl", ".png", "_preview.png", "_preview_clay.png",
                   "_report.json", ".src"):
        p = pdir / f"{variant}{suffix}"
        if p.exists():
            p.unlink()
            removed.append(p.name)
    if not removed:
        raise HTTPException(404, f"Figur '{piece}/{variant}' nicht gefunden.")
    # Prune the piece folder once its last variant is gone.
    if pdir.is_dir() and not any(pdir.iterdir()):
        pdir.rmdir()
    log.info("Figur-Variante gelöscht: %s/%s (%s)", piece, variant, ", ".join(removed))
    return {"ok": True, "piece": piece, "variant": variant, "removed": removed}


# --- 3D-Modell-Dateien für den Viewer -----------------------------------------

@router.get("/api/scan/model/{piece}/{variant}.obj")
def piece_obj(piece: str, variant: str):
    p = _piece_dir(piece, variant) / f"{variant}.obj"
    if not p.exists():
        raise HTTPException(404, "kein Mesh")
    return FileResponse(str(p), media_type="text/plain")


@router.get("/api/scan/model/{piece}/{variant}.png")
def piece_tex(piece: str, variant: str):
    p = _piece_dir(piece, variant) / f"{variant}.png"
    if not p.exists():
        return Response(status_code=204)
    return FileResponse(str(p), media_type="image/png")
