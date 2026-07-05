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
    seed: int = 42,
    process: bool = False,
) -> dict:
    """Import a scanned piece into the render pipeline.

    Output layout is one folder per canonical piece with one file-set per
    variant: ``<out_dir>/<item.name>/<item.variant>.{obj,mtl,png,_report.json,
    _preview.png,_preview_clay.png}``.  This lets several scans of the same piece
    (e.g. two white pawns, one black) coexist as ``v1``/``v2``/… inside ``wP/``.

    ``process=False`` (default) is a **verbatim import**: the model the user
    supplies is copied unchanged and rendered as-is — no uprighting, no component
    filtering, no re-export.  Use this when you provide already-clean, upright,
    correctly-scaled models and only want them rendered.

    ``process=True`` runs the legacy minimal cleanup (largest component + base-plane
    uprighting + clean OBJ re-export).  Handy for raw RealityScan dumps, but it can
    distort an already-finished model, so it is no longer the default.
    """
    piece_dir = Path(out_dir) / item.name
    piece_dir.mkdir(parents=True, exist_ok=True)
    stem = item.variant

    if not process:
        return _import_verbatim(item, piece_dir, stem, make_preview=make_preview)

    rng = np.random.default_rng(seed)

    # ---- 1. Load mesh
    mesh, tex_img = _load_and_extract(item, rng)
    tris_before = len(mesh.faces)
    _log.info("loaded %s: %d verts, %d tris", item.name, len(mesh.vertices), tris_before)

    # ---- 2. Keep largest connected component
    mesh, center_component_frac = _keep_largest_component(mesh)
    _log.info("largest component frac: %.3f", center_component_frac)

    # ---- 3. Fit plane to bottom for uprighting
    base_normal, base_d, base_inlier_mask = _fit_plane(mesh.vertices, rng)
    _log.info("base plane fit for upright: %d inliers", int(base_inlier_mask.sum()))

    signed = mesh.vertices @ base_normal + base_d
    fig_side = 1 if signed.max() > abs(signed.min()) else -1
    if fig_side < 0:
        base_normal = -base_normal

    # ---- 4. Upright + re-center
    mesh = _upright(mesh, base_normal)

    # ---- 5. Write clean OBJ directly from trimesh
    tex_dst = piece_dir / f"{stem}.png"
    _write_trimesh_obj(mesh, stem, piece_dir, tex_img, tex_dst)

    # ---- 6. Mesh quality
    quality = _mesh_quality(mesh)

    # ---- 7. Dimensions + height ratio
    dims, height_ratio = _compute_dims_ratio(mesh)

    # ---- 8. Report
    report: dict = {
        "piece": item.name,
        "variant": stem,
        "verts": len(mesh.vertices),
        "tris": int(tris_before),
        "center_component_frac": round(float(center_component_frac), 3),
        **quality,
        "dims": [round(float(d), 4) for d in dims],
        "height_ratio": round(float(height_ratio), 3),
    }
    report_path = piece_dir / f"{stem}_report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    _log.info("wrote %s", report_path)

    if make_preview:
        _render_previews(mesh, stem, piece_dir, tex_dst)

    return report


# ==============================================================================
# Verbatim import (no geometry processing — the default)
# ==============================================================================
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
        if item.tex is not None and Path(item.tex).exists():
            shutil.copyfile(item.tex, tex_dst)

    report = {"piece": item.name, "variant": stem, "verbatim": True}
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
def _load_and_extract(item: ScanItem, rng: np.random.Generator):
    """Load mesh via trimesh; extract texture from .glb if needed."""
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
    # Z-up = Y-up rotated -90° around X
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
    """First candidate (path) that exists and is NOT a debug pattern."""
    for c in candidates:
        if c is None:
            continue
        p = Path(c)
        if p.exists() and not _looks_like_debug_texture(p):
            return p
    return None


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


def _fit_plane(vertices: np.ndarray, rng: np.random.Generator):
    """Fit a plane to the substrate via Open3D RANSAC segment_plane.

    Restricts sampling to the lowest 20 % of the mesh (by Z) so RANSAC
    reliably finds the table/base plane instead of a vertical facet.

    Returns ``(normal, d, inlier_mask)`` where plane eq. is ``v·normal + d = 0``.
    """
    import open3d as o3d

    n = len(vertices)
    extent = float(np.max(vertices.max(axis=0) - vertices.min(axis=0)))
    tolerance = max(extent * _RANSAC_TOL_FRAC, 1e-6)

    # Restrict to the bottom 20 % of the dominant axis (the figure sits on a plate).
    # Find the axis with the largest extent (= figure height in Y-up or Z-up).
    axis_extents = vertices.max(axis=0) - vertices.min(axis=0)
    dominant_axis = int(np.argmax(axis_extents))
    vals = vertices[:, dominant_axis]
    v_min, v_max = vals.min(), vals.max()
    v_cut = v_min + 0.20 * (v_max - v_min)
    bottom_mask = vals <= v_cut
    bottom_verts = vertices[bottom_mask]
    _log.info("RANSAC: sampling %d/%d vertices in bottom 20%% of axis %d",
              len(bottom_verts), n, dominant_axis)

    if len(bottom_verts) < 100:
        _log.warning("too few bottom vertices, using all %d", n)
        bottom_verts = vertices
        bottom_mask = np.ones(n, dtype=bool)

    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(bottom_verts)

    plane_model, inlier_subset = pcd.segment_plane(
        distance_threshold=tolerance,
        ransac_n=3,
        num_iterations=_RANSAC_ITERS,
    )

    # Map back to full vertex set: compute signed distances for ALL vertices
    normal = np.array(plane_model[:3])
    d = plane_model[3]
    signed = vertices @ normal + d
    inlier_mask = np.abs(signed) < tolerance

    return normal, d, inlier_mask


def _keep_largest_component(mesh):
    """Keep only the largest connected component of the entire mesh.

    Used in the ``isolate=False`` pipeline for pre-cut single-piece meshes
    with no substrate/plate.

    Returns ``(new_mesh, kept_fraction)`` where *kept_fraction* is the ratio
    of kept triangles to total triangles.
    """
    import open3d as o3d

    faces = mesh.faces
    if len(faces) == 0:
        raise RuntimeError("Mesh has no faces")

    # Build Open3D mesh for clustering
    o3d_mesh = o3d.geometry.TriangleMesh()
    o3d_mesh.vertices = o3d.utility.Vector3dVector(np.array(mesh.vertices))
    o3d_mesh.triangles = o3d.utility.Vector3iVector(np.array(faces))

    triangle_clusters, cluster_counts, _ = o3d_mesh.cluster_connected_triangles()
    n_clusters = len(cluster_counts)

    if n_clusters == 0:
        raise RuntimeError("No connected components found in mesh")

    cluster_sizes = np.array(cluster_counts, dtype=int)
    best_cluster = int(np.argmax(cluster_sizes))
    total_tris = len(faces)
    best_tris = int(cluster_sizes[best_cluster])
    kept_fraction = best_tris / total_tris if total_tris > 0 else 1.0

    _log.info("selected cluster %d/%d (size=%d tris, %.1f%%)",
              best_cluster, n_clusters, best_tris, 100 * kept_fraction)

    # Keep only best cluster triangles
    best_mask = np.asarray(triangle_clusters) == best_cluster
    best_tri_indices = faces[best_mask]
    best_vert_idx = np.unique(best_tri_indices.flatten())

    # Compact remap
    v2 = {int(old): new for new, old in enumerate(best_vert_idx)}
    final_faces = np.array([[v2[vi] for vi in tri] for tri in best_tri_indices], dtype=np.int32)
    final_verts = mesh.vertices[best_vert_idx]

    # Remove statistical outliers (lenient)
    clean_verts = final_verts
    clean_tris = final_faces
    if len(final_verts) > 500:
        try:
            pcd = o3d.geometry.PointCloud()
            pcd.points = o3d.utility.Vector3dVector(final_verts)
            pcd, ind = pcd.remove_statistical_outlier(nb_neighbors=50, std_ratio=3.0)
            kept_frac = len(ind) / len(final_verts)
            if kept_frac > 0.3:
                clean_verts = np.asarray(pcd.points)
                clean_idx_set = set(ind)
                clean_tris = np.array([tri for tri in final_faces if all(v in clean_idx_set for v in tri)], dtype=np.int32)
                _log.info("outlier removal kept %.1f%% of vertices", 100 * kept_frac)
        except Exception:
            pass

    # Remap
    new_vert_map = {old: new for new, old in enumerate(sorted({v for tri in clean_tris for v in tri}))}
    clean_tris_mapped = np.array([[new_vert_map[vi] for vi in tri] for tri in clean_tris], dtype=np.int32)

    # Carry over vertex attributes (UVs, colors) through the entire vertex remap chain
    import trimesh
    kwargs = {}
    orig_visual = mesh.visual
    orig_uv = getattr(orig_visual, "uv", None)
    orig_vc = getattr(orig_visual, "vertex_colors", None)
    if clean_verts is final_verts:
        # No outlier removal → simple UV remap through best_vert_idx
        if orig_uv is not None and len(orig_uv) == len(mesh.vertices):
            kwargs["visual"] = trimesh.visual.texture.TextureVisuals(uv=orig_uv[best_vert_idx])
        elif orig_vc is not None and len(orig_vc) == len(mesh.vertices):
            kwargs["vertex_colors"] = orig_vc[best_vert_idx]
    else:
        # Outlier removal was applied → map UVs through best_vert_idx then ind
        # (ind is defined by remove_statistical_outlier inside the try block above,
        #  and clean_verts is final_verts[ind])
        if orig_uv is not None and len(orig_uv) == len(mesh.vertices):
            mapped_uv = orig_uv[best_vert_idx][list(ind)]
            kwargs["visual"] = trimesh.visual.texture.TextureVisuals(uv=mapped_uv)
        elif orig_vc is not None and len(orig_vc) == len(mesh.vertices):
            kwargs["vertex_colors"] = orig_vc[best_vert_idx][list(ind)]

    result = trimesh.Trimesh(vertices=clean_verts, faces=clean_tris_mapped,
                             process=False, **kwargs)
    return result, kept_fraction

def _upright(mesh, plane_normal: np.ndarray):
    """Rotate/translate mesh so that the base sits at z=0 and the figure axis is +Z."""
    # Rotate so plane normal aligns with +Z
    z_axis = np.array([0.0, 0.0, 1.0])
    rot = _rotation_between(plane_normal, z_axis)
    mesh.apply_transform(rot)

    # Translate so min Z = 0
    min_z = mesh.vertices[:, 2].min()
    mesh.vertices[:, 2] -= min_z

    # Center XY
    centroid_xy = mesh.vertices[:, :2].mean(axis=0)
    mesh.vertices[:, 0] -= centroid_xy[0]
    mesh.vertices[:, 1] -= centroid_xy[1]

    return mesh


def _rotation_between(a: np.ndarray, b: np.ndarray):
    """4x4 homogeneous transform that rotates unit vector a to unit vector b."""
    import trimesh

    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    if np.allclose(a, b):
        return np.eye(4)
    if np.allclose(a, -b):
        # 180° rotation around any perpendicular axis
        perp = np.array([1.0, 0.0, 0.0])
        if np.abs(np.dot(perp, a)) > 0.99:
            perp = np.array([0.0, 1.0, 0.0])
        perp = perp - np.dot(perp, a) * a
        perp = perp / np.linalg.norm(perp)
        return trimesh.transformations.rotation_matrix(np.pi, perp)

    v = np.cross(a, b)
    s = np.linalg.norm(v)
    c = np.dot(a, b)
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    R = np.eye(3) + vx + vx @ vx * ((1 - c) / (s * s))
    T = np.eye(4)
    T[:3, :3] = R
    return T

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

    for v in verts:
        lines.append(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}")
    for nrm in normals:
        lines.append(f"vn {nrm[0]:.6f} {nrm[1]:.6f} {nrm[2]:.6f}")

    if uv is not None and len(uv) == len(verts):
        uv_raw = np.asarray(uv)[:, :2]
        uv_unique, uv_idx = np.unique(uv_raw, axis=0, return_inverse=True)
        for vt_val in uv_unique:
            lines.append(f"vt {vt_val[0]:.6f} {vt_val[1]:.6f}")
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
    _save_texture(tex_img, None, tex_dst)
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


def _save_texture(tex_img, tex_fallback: Path | None, dst: Path):
    """Save texture image to *dst* as PNG."""
    if tex_img is not None:
        import PIL.Image

        if isinstance(tex_img, PIL.Image.Image):
            tex_img.save(str(dst))
        elif isinstance(tex_img, np.ndarray):
            PIL.Image.fromarray(tex_img).save(str(dst))
        elif isinstance(tex_img, (str, Path)):
            import shutil
            shutil.copy2(str(tex_img), str(dst))
        return

    if tex_fallback is not None:
        import shutil
        shutil.copy2(str(tex_fallback), str(dst))
def _mesh_quality(mesh) -> dict:
    """Count boundary and non-manifold edges.

    Welds vertices **by position** before counting edges so that UV-seam splits
    do not inflate the boundary edge count.
    """
    if len(mesh.faces) == 0:
        return {"boundary_edges": 0, "nonmanifold_edges": 0}

    verts = np.asarray(mesh.vertices)
    faces = np.asarray(mesh.faces, dtype=np.int64)

    # Weld vertices by position (tolerance ~ 0.1 μm in mesh units)
    tol = 1e-4
    verts_rounded = np.round(verts / tol) * tol
    _, __, pos_ids = np.unique(verts_rounded, axis=0,
                               return_index=True, return_inverse=True)
    welded_faces = pos_ids[faces]

    # Build edge set from welded faces
    edges = np.vstack([
        welded_faces[:, [0, 1]],
        welded_faces[:, [1, 2]],
        welded_faces[:, [2, 0]],
    ])
    edges_sorted = np.sort(edges, axis=1)
    ___, ___, counts = np.unique(edges_sorted, axis=0,
                                 return_inverse=True, return_counts=True)

    boundary = int((counts == 1).sum())
    nonmanifold = int((counts > 2).sum())

    return {"boundary_edges": boundary, "nonmanifold_edges": nonmanifold}


def _compute_dims_ratio(mesh):
    """Bounding-box dimensions and height/width ratio."""
    if len(mesh.vertices) == 0:
        return np.zeros(3), 0.0
    mn = mesh.vertices.min(axis=0)
    mx = mesh.vertices.max(axis=0)
    dims = mx - mn
    height_ratio = float(dims[2] / max(dims[0], dims[1], 1e-9))
    return dims, height_ratio


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
        _render_previews_matplotlib(mesh, out_dir, preview_dst, clay_dst)


def _render_previews_matplotlib(mesh, out_dir: Path, preview_dst: Path, clay_dst: Path):
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