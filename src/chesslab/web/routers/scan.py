"""Scanner-Router: /api/scan/* — Turntable-Aufnahme + 3D-Modell-Vorbereitung (v2: meshprep in-process)."""

from __future__ import annotations

import json
import logging
import re
import subprocess
import threading
from pathlib import Path

import numpy as np
from fastapi import APIRouter, Body, File, Form, HTTPException, UploadFile
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


# --- Mesh-Upload (fertige .obj/.glb/.gltf Dateien hochladen) --------------------------

_MESH_EXTENSIONS = {".obj", ".glb", ".gltf"}
_TEXTURE_EXTENSIONS = {".png", ".jpg", ".jpeg"}
_SAFE_NAME = re.compile(r"^[a-zA-Z0-9_-]+$")


@router.post("/api/scan/upload")
async def scan_upload(
    name: str = Form(...),
    mesh: UploadFile = File(...),
    texture: UploadFile | None = File(None),
):
    """Mesh-Datei + optionale Textur hochladen (bereits freigestelltes Einzelstück).

    Schreibt einen ``.clean``-Marker damit die UI ``isolate=False`` vorschlägt.
    """
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

    # Marker: uploaded meshes are pre-isolated
    (d / ".clean").touch()
    return {"ok": True, "dir": name, "mesh": mesh_path.name,
            "texture": tex_path.name if tex_path else None,
            "clean": True}


# --- 3D-Modell-Vorbereitung (Scan → renderfertige Figur, headless Blender) -------------

@router.get("/api/scan/models")
def scan_models():
    """Scan-Ordner mit Mesh (rekonstruiert) + bereits vorbereitete Figuren auflisten."""
    from ...scan_discover import _pick_texture, pick_mesh

    scans = []
    if SCANS_ROOT.is_dir():
        for d in sorted(p for p in SCANS_ROOT.iterdir() if p.is_dir()):
            mesh_path = pick_mesh(d)
            photos = sum(1 for _ in d.glob("[0-9]*.jpg"))
            if mesh_path is None and photos == 0:
                continue                        # leerer/irrelevanter Ordner
            tex = _pick_texture(d)
            scans.append({"dir": d.name,
                          "mesh": mesh_path.name if mesh_path else None,
                          "texture": tex.name if tex else None,
                          "photos": photos,
                          "clean": (d / ".clean").exists()})
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
    if r.get("proc") is not None and hasattr(r["proc"], "poll") and r["proc"].poll() is None:
        jobs["reconstruct"] = r.get("dir")
    # prepare läuft jetzt als Thread (kein .poll()) → is_alive() bzw. state
    pproc = pp.get("proc")
    if pp.get("state") == "running" or (pproc is not None and getattr(pproc, "is_alive", lambda: False)()):
        jobs["prepare"] = pp.get("dir")
    return {"scans": scans, "pieces": pieces, "jobs": jobs}


@router.post("/api/scan/prepare")
def scan_prepare(dir: str = Body(...), piece: str = Body(...),
                 target_tris: int = Body(20000), smooth_iters: int = Body(10),
                 plane_eps: float | None = Body(None),
                 plate_diameter_mm: float | None = Body(None),
                 fill_holes: bool = Body(True),
                 isolate: bool = Body(True)):
    """`chesslab synth prepare` für EINEN Scan-Ordner starten (v2: meshprep in-process, async per Thread)."""
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
        raise HTTPException(404, f"kein Mesh in scans/{dir} — erst in RealityScan rekonstruieren/exportieren.")
    item = ScanItem(name=piece, obj=obj_path, tex=_pick_texture(d))
    out = _repo_root() / "synth_pieces"
    (out / f"{piece}.src").write_text(dir, encoding="utf-8")  # Figur ↔ Quell-Scan verknüpfen

    eps = plane_eps if plane_eps is not None else 0.1     # meshprep default

    PREPARE.update(proc=None, piece=piece, dir=dir, log=None, state="running", error=None)

    def _run():
        try:
            prepare_scan(item, out, target_tris=target_tris, plane_eps=eps,
                         plate_diameter_mm=plate_diameter_mm, fill_holes=fill_holes,
                         smooth_iters=smooth_iters, make_preview=True,
                         isolate=isolate)
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

def _quat_to_matrix(q: np.ndarray) -> np.ndarray:
    """Quaternion [x, y, z, w] → 3×3 rotation matrix (columns are box axes in world space).

    Standard quaternion rotation formula (Hamilton product convention).
    R = I + 2w·[q_xyz]× + 2·[q_xyz]×²
    """
    x, y, z, w = q[0], q[1], q[2], q[3]
    xx, yy, zz = x * x, y * y, z * z
    xy, xz, yz = x * y, x * z, y * z
    wx, wy, wz = w * x, w * y, w * z
    return np.array([
        [1 - 2 * (yy + zz), 2 * (xy - wz),     2 * (xz + wy)],
        [2 * (xy + wz),     1 - 2 * (xx + zz), 2 * (yz - wx)],
        [2 * (xz - wy),     2 * (yz + wx),     1 - 2 * (xx + yy)],
    ], dtype=np.float64)


def _apply_texture_to_trimesh(mesh, tex_src, max_tex_size: int = 1024):
    """Apply a (possibly downscaled) texture file to a trimesh.Trimesh for GLB export."""
    import trimesh
    from PIL import Image

    # tex_src kann ein Pfad/str, Bytes ODER bereits ein PIL.Image sein (GLB-Extrakt)
    img = tex_src if isinstance(tex_src, Image.Image) else Image.open(tex_src)
    w, h = img.size
    if max(w, h) > max_tex_size:
        ratio = max_tex_size / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

    # trimesh PBRMaterial needs the image for GLB embedding
    material = trimesh.visual.material.PBRMaterial(
        baseColorTexture=img,
        metallicFactor=0.0,
        roughnessFactor=0.7,
    )
    uv = getattr(getattr(mesh, "visual", None), "uv", None)
    if uv is None:
        uv = np.zeros((len(mesh.vertices), 2), dtype=np.float32)
    mesh.visual = trimesh.visual.texture.TextureVisuals(uv=uv, material=material, image=img)


def _write_obj_with_mtl(mesh, obj_path: Path, mtl_name: str):
    """Write OBJ with MTL reference (trimesh doesn't do material references cleanly)."""
    verts = np.asarray(mesh.vertices)
    faces = np.asarray(mesh.faces)
    uv = getattr(getattr(mesh, "visual", None), "uv", None)

    lines = [f"mtllib {mtl_name}", "usemtl material0"]
    for v in verts:
        lines.append(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}")
    if uv is not None:
        for vt in uv:
            lines.append(f"vt {vt[0]:.6f} {vt[1]:.6f}")
    for f in faces:
        if uv is not None and len(uv) >= f.max() + 1:
            lines.append(f"f {f[0]+1}/{f[0]+1} {f[1]+1}/{f[1]+1} {f[2]+1}/{f[2]+1}")
        else:
            lines.append(f"f {f[0]+1} {f[1]+1} {f[2]+1}")
    obj_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


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


# --- OBB-Zuschnitt (3D-Box-Crop): Vorschau + Zuschnitt-Endpunkte ------------------------

_PREVIEW_TRIS = 60000               # Ziel-Dreieckszahl für das decimierte Vorschau-Mesh


@router.get("/api/scan/preview-mesh/{dir}.glb")
def scan_preview_mesh(dir: str):
    """Decimiertes GLB-Vorschau-Mesh (~60k Triangles) mit eingebetteter Textur.

    Bleibt im natives Koordinatensystem der Quelldatei (Z-up nach _ensure_z_up),
    sodass Box-Koordinaten aus dem Viewer 1:1 auf das Full-Res-Mesh abbilden.
    """
    import io

    import open3d as o3d
    import trimesh

    d = SCANS_ROOT / _safe_seg(dir)
    if not d.is_dir():
        raise HTTPException(404, f"Scan '{dir}' nicht gefunden.")
    from ...scan_discover import _pick_texture, pick_mesh

    src = pick_mesh(d)
    if src is None:
        raise HTTPException(404, f"kein Mesh in scans/{dir}")
    cache = d / "_preview.glb"
    if cache.exists() and cache.stat().st_mtime >= src.stat().st_mtime:
        return FileResponse(str(cache), media_type="model/gltf-binary")

    # Laden (Y-up → Z-up wie in meshprep._load_and_extract)
    loaded = trimesh.load(str(src), force="mesh")
    if isinstance(loaded, trimesh.Scene):
        meshes = list(loaded.geometry.values())
        if not meshes:
            raise RuntimeError(f"No meshes in {src}")
        mesh = max(meshes, key=lambda m: len(m.vertices) if hasattr(m, "vertices") else 0)
    else:
        mesh = loaded
    if not isinstance(mesh, trimesh.Trimesh):
        raise RuntimeError(f"Failed to load Trimesh from {src}")

    # Y-up → Z-up (gleiche Logik wie meshprep)
    from ...meshprep import _ensure_z_up
    mesh = _ensure_z_up(mesh)

    tris_before = len(mesh.faces)
    log.info("preview: loaded %s → %d tris", src.name, tris_before)

    # Textur extrahieren / laden
    tex_img = None
    ext = src.suffix.lower()
    if ext in (".glb", ".gltf"):
        from ...meshprep import _extract_glb_texture
        tex_path = _extract_glb_texture(mesh)
        if tex_path is not None:
            tex_img = tex_path
    elif ext == ".obj":
        tex_path = _pick_texture(d)
        if tex_path is not None:
            tex_img = str(tex_path)

    # Decimate via open3d zu ~60k Triangles
    if tris_before > _PREVIEW_TRIS:
        target = max(_PREVIEW_TRIS, 100)
        o3d_mesh = o3d.geometry.TriangleMesh()
        o3d_mesh.vertices = o3d.utility.Vector3dVector(np.asarray(mesh.vertices, dtype=np.float64))
        o3d_mesh.triangles = o3d.utility.Vector3iVector(np.asarray(mesh.faces, dtype=np.int32))
        o3d_mesh = o3d_mesh.simplify_quadric_decimation(target)
        verts = np.asarray(o3d_mesh.vertices)
        faces = np.asarray(o3d_mesh.triangles)
        decimated = trimesh.Trimesh(vertices=verts, faces=faces, process=False)
        log.info("preview: decimated %d → %d tris", tris_before, len(faces))
    else:
        decimated = mesh

    # Textur anwenden (falls vorhanden)
    if tex_img is not None:
        _apply_texture_to_trimesh(decimated, tex_img)

    # Als self-contained .glb schreiben (embedded texture)
    buf = io.BytesIO()
    decimated.export(buf, file_type="glb")
    cache.write_bytes(buf.getvalue())
    log.info("preview: wrote %s (%.1f MB)", cache, len(buf.getvalue()) / 1e6)
    return Response(content=buf.getvalue(), media_type="model/gltf-binary")


@router.get("/api/scan/preview-info/{dir}")
def scan_preview_info(dir: str):
    """AABB (min/max) des Vorschau-Meshes für die Box-Initialisierung."""
    import trimesh

    d = SCANS_ROOT / _safe_seg(dir)
    if not d.is_dir():
        raise HTTPException(404, f"Scan '{dir}' nicht gefunden.")
    cache = d / "_preview.glb"
    if not cache.exists():
        # Preview noch nicht gebaut → aus dem Full-Res-Mesh ableiten
        from ...scan_discover import pick_mesh
        src = pick_mesh(d)
        if src is None:
            raise HTTPException(404, f"kein Mesh in scans/{dir}")
        loaded = trimesh.load(str(src), force="mesh")
        if isinstance(loaded, trimesh.Scene):
            meshes = list(loaded.geometry.values())
            mesh = max(meshes, key=lambda m: len(m.vertices) if hasattr(m, "vertices") else 0)
        else:
            mesh = loaded
        from ...meshprep import _ensure_z_up
        mesh = _ensure_z_up(mesh)
    else:
        loaded = trimesh.load(str(cache), file_type="glb")
        if isinstance(loaded, trimesh.Scene):
            meshes = list(loaded.geometry.values())
            mesh = max(meshes, key=lambda m: len(m.vertices) if hasattr(m, "vertices") else 0)
        else:
            mesh = loaded
    vmin = mesh.vertices.min(axis=0).tolist()
    vmax = mesh.vertices.max(axis=0).tolist()
    return {"min": vmin, "max": vmax}


@router.post("/api/scan/crop")
def scan_crop(
    dir: str = Body(...),
    center: list[float] = Body(...),
    half_extents: list[float] = Body(...),
    quaternion: list[float] = Body(...),
    out_name: str | None = Body(None),
):
    """OBB-Crop des Full-Res-Meshes: beschneiden auf eine orientierte 3D-Box,
    Re-Expression in Box-lokalen Koordinaten (figur aufrecht + zentriert).

    Koordinatensystem: Die Box-Parameter müssen im NATIVEN Mesh-Frame sein
    (Z-up nach _ensure_z_up) — d.h. der Preview-.glb und die Box teilen sich
    dieselbe Welt. Kein Y-up/Z-up-Shuffle nötig.

    Schreibt ``scans/<dir>/cropped.obj``, ``cropped.png``, ``cropped.mtl``
    und einen ``.clean``-Marker.
    """
    import trimesh

    d = SCANS_ROOT / _safe_seg(dir)
    if not d.is_dir():
        raise HTTPException(404, f"Scan '{dir}' nicht gefunden.")
    from ...scan_discover import _pick_texture, pick_mesh

    src = pick_mesh(d)
    if src is None:
        raise HTTPException(404, f"kein Mesh in scans/{dir}")

    center_arr = np.array(center, dtype=np.float64)
    half_ext = np.abs(np.array(half_extents, dtype=np.float64))
    q = np.array(quaternion, dtype=np.float64)  # [x, y, z, w]

    # Rotation aus Quaternion [x, y, z, w] → 3×3 Matrix (Spalten = Box-Achsen in Weltkoordinaten)
    R = _quat_to_matrix(q)

    # Full-Res-Mesh laden (natives Koordinatensystem)
    loaded = trimesh.load(str(src), force="mesh")
    if isinstance(loaded, trimesh.Scene):
        meshes = list(loaded.geometry.values())
        mesh = max(meshes, key=lambda m: len(m.vertices) if hasattr(m, "vertices") else 0)
    else:
        mesh = loaded
    if not isinstance(mesh, trimesh.Trimesh):
        raise RuntimeError(f"Failed to load Trimesh from {src}")

    from ...meshprep import _ensure_z_up
    mesh = _ensure_z_up(mesh)

    faces_total = len(mesh.faces)

    # Jeden Vertex in Box-lokale Koordinaten transformieren
    # local = R^T @ (v - center)
    vertices = np.asarray(mesh.vertices, dtype=np.float64)
    local = (vertices - center_arr) @ R  # (N,3) @ (3,3) → R^T @ v ist v @ R

    # Face behalten wenn centroid (oder alle 3 Vertices) innerhalb half_ext
    face_local = local[mesh.faces]  # (F, 3, 3)
    face_centroids = face_local.mean(axis=1)  # (F, 3)
    inside = np.all(np.abs(face_centroids) <= half_ext, axis=1)
    kept_faces = mesh.faces[inside]
    faces_kept = int(inside.sum())

    if faces_kept == 0:
        raise HTTPException(400, "Keine Faces innerhalb der Box — Box vergrößern/verschieben.")

    log.info("crop %s: kept %d / %d faces", dir, faces_kept, faces_total)

    # Kompaktes Sub-Mesh bauen
    kept_vert_idx = np.unique(kept_faces.flatten())
    old_to_new = {int(vi): ni for ni, vi in enumerate(kept_vert_idx)}
    new_faces = np.array([[old_to_new[vi] for vi in tri] for tri in kept_faces], dtype=np.int32)
    # Re-exprimiere Vertex-Positionen in Box-lokalen Koordinaten
    new_verts = local[kept_vert_idx]

    # UVs + Textur übertragen
    kwargs = {}
    orig_visual = getattr(mesh, "visual", None)
    if orig_visual is not None:
        orig_uv = getattr(orig_visual, "uv", None)
        if orig_uv is not None and len(orig_uv) == len(mesh.vertices):
            kwargs["visual"] = trimesh.visual.texture.TextureVisuals(uv=orig_uv[kept_vert_idx])

    cropped = trimesh.Trimesh(vertices=new_verts, faces=new_faces, process=False, **kwargs)

    # Textur kopieren
    tex = _pick_texture(d)
    tex_ext = (tex or Path("dummy.png")).suffix.lower()
    tex_dst = d / f"cropped{tex_ext}"
    if tex is not None and tex.exists():
        import shutil
        shutil.copy2(tex, tex_dst)
        # MTL schreiben
        mtl = d / "cropped.mtl"
        mtl.write_text(
            f"newmtl material0\n"
            f"map_Kd cropped{tex_ext}\n"
            f"Ka 1 1 1\nKd 1 1 1\nKs 0 0 0\nNs 10\n",
            encoding="utf-8",
        )
        # OBJ schreiben (mit MTL-Referenz)
        _write_obj_with_mtl(cropped, d / "cropped.obj", "cropped.mtl")
    else:
        cropped.export(d / "cropped.obj", file_type="obj")

    (d / ".clean").touch()
    log.info("crop %s: wrote cropped.obj (%d verts, %d faces)", dir,
              len(cropped.vertices), len(cropped.faces))
    return {"ok": True, "path": str(d / "cropped.obj"),
            "faces_kept": faces_kept, "faces_total": faces_total}


# --- 3D-Modell-Dateien für den Viewer ---------------------------------------

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
