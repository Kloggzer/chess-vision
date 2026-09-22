"""Minimal scan preparation: pre-cut OBJ/GLB -> upright, render-ready OBJ + Blender preview.

The user provides already-reduced-and-smoothed OBJs from RealityScan.
This pipeline does NOT decimate, smooth, fill-holes, isolate, or crop -
the input is assumed ready. Only: largest component, upright, clean OBJ export,
and an orthographic Blender preview.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np

from chesslab.scan_discover import ScanItem

if TYPE_CHECKING:
    import trimesh

_log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Pipeline parameters
# ---------------------------------------------------------------------------

_RANSAC_ITERS: int = 500
_RANSAC_TOL_FRAC: float = 0.005


def prepare_scan(
    item: ScanItem,
    out_dir: Path,
    *,
    make_preview: bool = True,
    smooth_iters: int = 0,
) -> dict:
    """Import a scanned piece into the render pipeline.

    Output layout is one folder per canonical piece with one file-set per
    variant: ``<out_dir>/<item.name>/<item.variant>.{obj,mtl,png,_report.json,
    _preview.png,_preview_clay.png}``.  This lets several scans of the same piece
    (e.g. two white pawns, one black) coexist as ``v1``/``v2``/… inside ``wP/``.

    A **verbatim import**: the model the user supplies is copied unchanged and rendered
    as-is — no uprighting, no component filtering, no re-export.

    ``smooth_iters > 0`` (verbatim mode only) additionally runs shrink-free Taubin
    smoothing over the vertices — for raw RealityScan exports whose reconstruction
    noise shows as extreme surface roughness.  Faces/UVs/orientation are untouched;
    only vertex positions relax.
    """
    piece_dir = Path(out_dir) / item.name
    piece_dir.mkdir(parents=True, exist_ok=True)
    stem = item.variant

    if smooth_iters > 0:
        return _import_smoothed(item, piece_dir, stem, smooth_iters,
                                make_preview=make_preview)
    return _import_verbatim(item, piece_dir, stem, make_preview=make_preview)


# ==============================================================================
# Verbatim import (no geometry processing — the default)
# ==============================================================================
def _import_smoothed(item: ScanItem, piece_dir: Path, stem: str, iters: int, *,
                     make_preview: bool) -> dict:
    """Verbatim import + Taubin smoothing (lambda/nu band-pass, no shrinkage).

    Unlike ``process=True`` this does NOT upright, filter components or rescale —
    it is the verbatim path with relaxed vertex positions.  Taubin over Laplacian
    because pure Laplacian smoothing shrinks thin features (knight ears, cross on
    the king); Taubin's negative second pass compensates.
    """
    import trimesh

    # `upright=False`: dieser Zweig ist der VERBATIM-Weg mit entspannten Punkten, und
    # `prepare_scan` verspricht "no uprighting". Sonst haengt die Ausrichtung einer Figur an
    # einem Glaettungsschalter. Gezaehlt 2026-09-16: null der zwoelf Meshes sind so entstanden.
    mesh, tex_img = _load_and_extract(item, upright=False)
    tris = len(mesh.faces)
    _log.info("smoothing %s/%s: %d tris, taubin x%d", item.name, stem, tris, iters)
    # Smooth on a WELDED copy, then map positions back to the original (UV-split) vertices.
    # OBJ exports duplicate every vertex along a UV seam; smoothing the duplicates
    # independently tears the seams open (visible dark crack lines in the render).
    v = np.asarray(mesh.vertices)
    uniq, inv = np.unique(np.round(v, 6), axis=0, return_inverse=True)
    welded = trimesh.Trimesh(vertices=uniq.copy(), faces=inv[np.asarray(mesh.faces)])
    trimesh.smoothing.filter_taubin(welded, lamb=0.5, nu=0.53, iterations=iters)
    mesh.vertices = np.asarray(welded.vertices)[inv]

    tex_dst = piece_dir / f"{stem}.png"
    _write_trimesh_obj(mesh, stem, piece_dir, tex_img, tex_dst)

    report = {"piece": item.name, "variant": stem, "verbatim": True,
              "smooth_iters": int(iters), "tris": int(tris)}
    (piece_dir / f"{stem}_report.json").write_text(json.dumps(report, indent=2),
                                                   encoding="utf-8")
    _log.info("smoothed import -> %s", piece_dir / f"{stem}.obj")

    if make_preview:
        _render_previews(mesh, stem, piece_dir, tex_dst)
    return report


def _import_verbatim(item: ScanItem, piece_dir: Path, stem: str, *, make_preview: bool) -> dict:
    """Place a render-ready model as ``<piece>/<variant>`` WITHOUT touching geometry.

    ``.obj`` → byte-for-byte copy (only the ``mtllib``/``usemtl`` lines are
    normalised so a sibling ``<stem>.mtl`` + ``<stem>.png`` are found).  ``.glb`` →
    a one-off convert-to-OBJ (geometry preserved, texture extracted; still no
    uprighting).  Then a Blender preview of the written file.
    """
    import shutil

    obj_dst = piece_dir / f"{stem}.obj"
    tex_dst = piece_dir / f"{stem}.png"
    ext = item.obj.suffix.lower()

    if ext in (".glb", ".gltf"):
        import trimesh

        loaded = trimesh.load(str(item.obj), force="mesh")
        if isinstance(loaded, trimesh.Scene):
            loaded = max(loaded.geometry.values(), key=lambda m: len(m.vertices))
        # Priority as in _load_and_extract: GLB reference → associated diffuse texture
        # (debug patterns are content-sorted out) → embedded texture.
        tex_img = _first_real_texture(_texture_candidates(item)) \
            or _extract_glb_texture(loaded)
        # _write_trimesh_obj re-exports faces/normals/UVs but applies NO transform.
        _write_trimesh_obj(loaded, stem, piece_dir, tex_img, tex_dst)
    else:
        _copy_obj_verbatim(item.obj, obj_dst, stem)
        _write_clean_mtl(piece_dir, stem)
        # Same chain as the GLB branch. Straight from `item.tex` this copied RealityScan's UV
        # debug pattern whenever it happened to be the largest `*diffuse*` file.
        src_tex = _first_real_texture(_texture_candidates(item))
        if src_tex is not None:
            shutil.copyfile(src_tex, tex_dst)

    report = {"piece": item.name, "variant": stem, "verbatim": True,
              "texture": tex_dst.name if tex_dst.exists() else None}
    (piece_dir / f"{stem}_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    _log.info("verbatim import -> %s", obj_dst)

    if make_preview:
        _render_previews(None, stem, piece_dir, tex_dst)
    return report


def _copy_obj_verbatim(src: Path, dst: Path, stem: str) -> None:
    """Copy an OBJ unchanged, only pointing its ``mtllib``/``usemtl`` at ``<stem>``.

    All geometry lines (``v``/``vt``/``vn``/``f``/groups) are preserved exactly;
    the renderer ignores materials anyway, but a standalone viewer needs the
    sibling ``<stem>.mtl`` to find the texture.
    """
    lines = Path(src).read_text(encoding="utf-8", errors="replace").splitlines()
    out: list[str] = []
    seen_mtllib = False
    for ln in lines:
        if ln.startswith("mtllib "):
            if not seen_mtllib:
                out.append(f"mtllib {stem}.mtl")
                seen_mtllib = True
        elif ln.startswith("usemtl "):
            out.append("usemtl piece")
        else:
            out.append(ln)
    if not seen_mtllib:
        i = 0
        while i < len(out) and out[i].startswith("#"):
            i += 1
        out.insert(i, f"mtllib {stem}.mtl")
    Path(dst).write_text("\n".join(out) + "\n", encoding="utf-8")


# ==============================================================================
# Internal helpers
# ==============================================================================
def _load_and_extract(item: ScanItem, *, upright: bool = True):
    """Load mesh via trimesh; extract texture from .glb if needed.

    [upright] dreht Y-up nach Z-up. Der verbatim-Weg laesst es aus — er verspricht, die Datei
    nicht anzufassen, und eine stille Drehung waere genau das.
    """
    import trimesh

    obj_path = str(item.obj)

    # trimesh.load may return a Scene for .glb
    loaded = trimesh.load(obj_path, force="mesh")
    if isinstance(loaded, trimesh.Scene):
        meshes = list(loaded.geometry.values())
        if not meshes:
            raise RuntimeError(f"No meshes found in {obj_path}")
        mesh = max(meshes, key=lambda m: len(m.vertices) if hasattr(m, "vertices") else 0)
    else:
        mesh = loaded

    if not isinstance(mesh, trimesh.Trimesh):
        raise RuntimeError(f"Failed to load a single Trimesh from {obj_path}")

    # Normalise Y-up → Z-up (RealityScan exports are Y-up)
    # trimesh by default does NOT auto-convert, so we apply the transform manually.
    if upright:
        mesh = _ensure_z_up(mesh)

    # Extract texture. An EXPLICIT *_diffuse.png in the scan folder ALWAYS wins over the
    # .glb reference: RealityScan GLBs sometimes reference *_unwrap.png (UV debug pattern,
    # observed at scans/bP) — otherwise the checkerboard pattern would appear instead of wood.
    tex_img = _first_real_texture(_texture_candidates(item))
    if tex_img is None and item.obj.suffix.lower() in (".glb", ".gltf"):
        tex_img = _extract_glb_texture(mesh)          # last resort: embedded

    return mesh, tex_img


def _ensure_z_up(mesh) -> trimesh.Trimesh:
    """If the mesh appears to be Y-up, rotate to Z-up (-90° around X).

    glTF / .glb spec mandates Y-up.  trimesh loads in the file's native coordinates,
    so RealityScan glb files will be Y-up.  We only rotate when the Y extent is the
    clearly dominant axis (≥ 1.5× Z), which covers both native Y-up and already-
    rotated meshes without false positives.
    """
    import trimesh

    extents = mesh.vertices.max(axis=0) - mesh.vertices.min(axis=0)
    _log.info("extents before up-check: X=%.3f Y=%.3f Z=%.3f", *extents)
    if extents[1] >= 1.5 * extents[2]:
        _log.info("detected Y-up, rotating to Z-up")
        T = trimesh.transformations.rotation_matrix(-np.pi / 2, [1, 0, 0])
        mesh.apply_transform(T)
        ext2 = mesh.vertices.max(axis=0) - mesh.vertices.min(axis=0)
        _log.info("extents after rotation: X=%.3f Y=%.3f Z=%.3f", *ext2)
    return mesh


def _looks_like_debug_texture(path: Path) -> bool:
    """True if an image file looks like RealityScan's UV debug pattern (vivid
    solid-color areas, "Texture 0 / A1…H8" tiles) rather than a real photo texture.

    RealityScan writes a *_diffuse.png even WITHOUT running the texture step —
    then with the debug pattern as content (observed with wB). Distinction via
    mean saturation: debug ≈ pure RGB primary colors (S high), wood/photo desaturated."""
    try:
        import PIL.Image

        img = PIL.Image.open(path).convert("HSV").resize((64, 64))
        s = np.asarray(img)[:, :, 1].astype(np.float32) / 255.0
        return float(s.mean()) > 0.5
    except Exception:  # noqa: BLE001 — unreadable image: better not discard
        return False


def _first_real_texture(candidates) -> Path | None:
    """First candidate (path) that exists and is NOT a debug pattern.

    The filter may only DESELECT, never leave the piece bare: its saturation cut sits inside the
    real corpus (measured 2026-09-22 over the twelve shipped scans: 0.422-0.594 against a cut of
    0.50, four of them flagged), so a sole texture is kept even when it trips.
    """
    existing = [Path(c) for c in candidates if c is not None and Path(c).exists()]
    for p in existing:
        if not _looks_like_debug_texture(p):
            return p
    return existing[0] if existing else None


def _texture_candidates(item: ScanItem) -> list[Path | None]:
    """Texture candidates in priority order: GLB-referenced tile (UV-correct)
    → *diffuse* files belonging to the mesh (largest first; covers re-exports like
    wB_…_diffuse_2.png) → explicitly discovered texture. Evaluation (debug filter)
    is done by _first_real_texture."""
    cands: list[Path | None] = []
    if item.obj.suffix.lower() in (".glb", ".gltf"):
        cands.append(_glb_texture_uri(item.obj))
    stem = item.obj.stem.lower()
    cands.extend(sorted(
        (p for p in item.obj.parent.glob("*diffuse*")
         if p.suffix.lower() in (".png", ".jpg", ".jpeg")
         and p.stem.lower().startswith(stem)),
        key=lambda p: -p.stat().st_size))
    if item.tex is not None:
        cands.append(Path(item.tex))
    return cands


def _glb_texture_uri(glb_path: Path) -> Path | None:
    """Read the externally referenced texture from the GLB JSON (images[].uri).

    RealityScan exports MULTIPLE UV tiles per scan (*_u0_v0_*, *_u1_v1_*) — only the one
    referenced in the GLB matches the UV layout of the mesh; the wrong tile delivers
    colors from the wrong atlas location (observed: brown black king).
    *_unwrap.png references (UV debug) are ignored. None if nothing usable."""
    import struct

    try:
        b = glb_path.read_bytes()
        if b[:4] != b"glTF":
            return None
        ln = struct.unpack("<I", b[12:16])[0]
        doc = json.loads(b[20:20 + ln])
        for img in doc.get("images", []):
            uri = img.get("uri")
            if not uri or uri.startswith("data:") or "unwrap" in uri.lower():
                continue
            p = glb_path.parent / uri
            if p.exists():
                return p
    except Exception:  # noqa: BLE001 — defekte/abweichende GLBs: Fallback-Kette greift
        return None
    return None


def _extract_glb_texture(mesh) -> Path | None:
    """Try to extract the embedded texture image from a GLB mesh using trimesh.visual.

    Returns a path to a temporary PNG, or None.
    """
    import io

    import PIL.Image
    import trimesh

    visual = mesh.visual
    if hasattr(visual, "material") and hasattr(visual.material, "baseColorTexture"):
        tex = visual.material.baseColorTexture
        if tex is not None:
            # trimesh returns a PIL.Image, ndarray, or bytes depending on version.
            if isinstance(tex, PIL.Image.Image):
                return tex
            if isinstance(tex, np.ndarray):
                return PIL.Image.fromarray(tex)
            return PIL.Image.open(io.BytesIO(tex))

    # Try trimesh's own texture extraction
    if isinstance(visual, trimesh.visual.texture.TextureVisuals):
        if visual.material is not None and hasattr(visual.material, "image"):
            img = visual.material.image
            if img is not None:
                import PIL.Image

                return PIL.Image.fromarray(img) if isinstance(img, np.ndarray) else img

    return None


def _vertex_normals(verts: np.ndarray, faces: np.ndarray) -> np.ndarray:
    """Flächengewichtete Per-Vertex-Normalen (nach außen), normalisiert."""
    verts = np.asarray(verts, dtype=np.float64)
    normals = np.zeros_like(verts)
    if len(faces) == 0:
        normals[:, 2] = 1.0
        return normals
    tri = verts[faces]
    fn = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])  # area-weighted face normals
    for i in range(3):
        np.add.at(normals, faces[:, i], fn)
    ln = np.linalg.norm(normals, axis=1, keepdims=True)
    ln[ln < 1e-12] = 1.0
    return normals / ln



def _write_trimesh_obj(mesh, name: str, out_dir: Path, tex_img, tex_dst: Path):
    """Write clean OBJ from trimesh directly (no PyMeshLab).

    Writes v, vt (from mesh.visual.uv), vn (via _vertex_normals),
    single usemtl piece + mtllib <name>.mtl referencing <name>.png.
    Copies the texture image to <name>.png.
    """
    verts = np.asarray(mesh.vertices)
    faces = np.asarray(mesh.faces, dtype=np.int64)
    normals = _vertex_normals(verts, faces)

    visual = getattr(mesh, "visual", None)
    uv = getattr(visual, "uv", None) if visual is not None else None

    lines: list[str] = []
    lines.append(f"mtllib {name}.mtl")
    lines.append(f"o {name}")

    lines.extend(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}" for v in verts)
    lines.extend(f"vn {nrm[0]:.6f} {nrm[1]:.6f} {nrm[2]:.6f}" for nrm in normals)

    if uv is not None and len(uv) == len(verts):
        uv_raw = np.asarray(uv)[:, :2]
        uv_unique, uv_idx = np.unique(uv_raw, axis=0, return_inverse=True)
        lines.extend(f"vt {vt_val[0]:.6f} {vt_val[1]:.6f}" for vt_val in uv_unique)
        lines.append("usemtl piece")
        for fi in range(len(faces)):
            f0, f1, f2 = int(faces[fi, 0]), int(faces[fi, 1]), int(faces[fi, 2])
            lines.append(
                f"f {f0 + 1}/{int(uv_idx[f0]) + 1}/{f0 + 1}"
                f" {f1 + 1}/{int(uv_idx[f1]) + 1}/{f1 + 1}"
                f" {f2 + 1}/{int(uv_idx[f2]) + 1}/{f2 + 1}"
            )
    else:
        lines.append("usemtl piece")
        for fi in range(len(faces)):
            a, b, c = int(faces[fi, 0]) + 1, int(faces[fi, 1]) + 1, int(faces[fi, 2]) + 1
            lines.append(f"f {a}//{a} {b}//{b} {c}//{c}")

    obj_path = out_dir / f"{name}.obj"
    obj_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    _log.info("wrote clean OBJ -> %s (%d v, %d vn, %d f)",
              obj_path, len(verts), len(normals), len(faces))

    _write_clean_mtl(out_dir, name)
    _save_texture(tex_img, tex_dst)
    _cleanup_temp(out_dir, name)


def _write_clean_mtl(out_dir: Path, name: str):
    """Write a single-material MTL referencing <name>.png."""
    mtl_path = out_dir / f"{name}.mtl"
    content = (
        "newmtl piece\n"
        "Ka 1.0 1.0 1.0\n"
        "Kd 1.0 1.0 1.0\n"
        "Ks 0.0 0.0 0.0\n"
        "d 1.0\n"
        "illum 2\n"
        f"map_Kd {name}.png\n"
    )
    mtl_path.write_text(content, encoding="utf-8")
    _log.info("wrote clean MTL -> %s", mtl_path)

def _cleanup_temp(out_dir: Path, name: str):
    """Remove temporary files created by trimesh OBJ export (obj, mtl, png).

    Also removes MeshLab/trimesh stray files (material.mtl, material_0.png,
    <name>.obj.mtl) that the old ``save_current_mesh`` path left behind.
    """
    for pattern in (f"_{name}_tmp.obj", f"_{name}_tmp.mtl"):
        p = out_dir / pattern
        try:
            p.unlink(missing_ok=True)
        except OSError:
            pass
    # Also remove any PNGs trimesh may have written alongside the temp OBJ
    for p in out_dir.glob(f"_{name}_tmp*.png"):
        try:
            p.unlink(missing_ok=True)
        except OSError:
            pass
    # Remove stray MeshLab/trimesh files from old save_current_mesh path
    for stray in ("material.mtl", f"{name}.obj.mtl", "material_0.png"):
        p = out_dir / stray
        try:
            p.unlink(missing_ok=True)
        except OSError:
            pass


def _save_texture(tex_img, dst: Path):
    """Save texture image to *dst* as PNG."""
    if tex_img is None:
        return
    import PIL.Image

    if isinstance(tex_img, PIL.Image.Image):
        tex_img.save(str(dst))
    elif isinstance(tex_img, np.ndarray):
        PIL.Image.fromarray(tex_img).save(str(dst))
    elif isinstance(tex_img, (str, Path)):
        import shutil
        shutil.copy2(str(tex_img), str(dst))
# ---------------------------------------------------------------------------
# Preview rendering (best-effort, optional)
# ---------------------------------------------------------------------------


def _render_previews(mesh, name: str, out_dir: Path, tex_path: Path | None):
    """Render two orthographic side previews (textured + clay).

    Uses ``synth/render_piece.py`` via Blender (textured + clay).  Falls back to a
    simple matplotlib trisurf clay preview if Blender is missing or fails.
    """
    import subprocess

    from chesslab.config import _REPO_ROOT, SYNTH

    out_obj = (out_dir / f"{name}.obj").resolve()
    render_script = (_REPO_ROOT / "synth" / "render_piece.py").resolve()

    preview_dst = (out_dir / f"{name}_preview.png").resolve()
    clay_dst = (out_dir / f"{name}_preview_clay.png").resolve()

    # ---- Blender path (best-effort) ----------------------------------------
    blender_ok = False
    try:
        result = subprocess.run(
            [SYNTH.blender_cmd(), "--version"],
            capture_output=True, timeout=10,
        )
        blender_ok = result.returncode == 0
    except Exception:
        pass

    if blender_ok:
        blender = SYNTH.blender_cmd()
        # Textured preview
        tex_arg = str(tex_path.resolve()) if tex_path is not None and tex_path.exists() else "-"
        try:
            subprocess.run(
                [blender, "--background", "--python", str(render_script), "--",
                 str(out_obj), str(preview_dst), tex_arg],
                capture_output=True, timeout=120, check=True,
            )
            _log.info("preview %s", preview_dst)
        except Exception as e:
            _log.warning("Blender textured preview failed (%s)", e)

        # Clay preview
        try:
            subprocess.run(
                [blender, "--background", "--python", str(render_script), "--",
                 str(out_obj), str(clay_dst), "-"],
                capture_output=True, timeout=120, check=True,
            )
            _log.info("preview %s", clay_dst)
        except Exception as e:
            _log.warning("Blender clay preview failed (%s)", e)
    else:
        _log.info("Blender not found — previews via matplotlib fallback")

    # ---- Matplotlib fallback -----------------------------------------------
    # Verbatim imports pass mesh=None (no in-memory mesh); the Blender path above
    # renders straight from the OBJ file, so only fall back when we have a mesh.
    if mesh is not None:
        _render_previews_matplotlib(mesh, preview_dst, clay_dst)


def _render_previews_matplotlib(mesh, preview_dst: Path, clay_dst: Path):
    """Render a simple clay-style 3D view via matplotlib trisurf (no GPU needed).

    Skips any output that already exists (e.g. from a successful Blender run).
    """
    if preview_dst.exists() and clay_dst.exists():
        return

    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except Exception as e:
        _log.warning("matplotlib unavailable — skipping preview fallback (%s)", e)
        return

    try:
        from mpl_toolkits.mplot3d.art3d import Poly3DCollection

        verts = mesh.vertices
        faces = mesh.faces

        mn = verts.min(axis=0)
        mx = verts.max(axis=0)
        center = (mn + mx) / 2
        size = float((mx - mn).max()) or 1.0

        verts_disp = verts - center

        fig = plt.figure(figsize=(6, 6))
        ax = fig.add_subplot(111, projection="3d")

        tri = Poly3DCollection(
            verts_disp[faces],
            alpha=1.0,
            facecolor=(0.75, 0.75, 0.78),
            edgecolor="none",
        )
        ax.add_collection3d(tri)

        ax.set_xlim(-size / 2, size / 2)
        ax.set_ylim(-size / 2, size / 2)
        ax.set_zlim(-size / 2, size / 2)
        ax.view_init(elev=15, azim=-60)
        ax.set_axis_off()

        for dst in (preview_dst, clay_dst):
            if not dst.exists():
                fig.savefig(str(dst), dpi=100, bbox_inches="tight", pad_inches=0)
                _log.info("preview (matplotlib) %s", dst)

        plt.close(fig)
    except Exception as e:
        _log.warning("matplotlib preview fallback failed (%s) — skipping previews", e)