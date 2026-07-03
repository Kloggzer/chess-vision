"""Pure-Python scan preparation: RealityScan mesh → isolated, decimated, render-ready OBJ.

Replaces the Blender-based ``synth/isolate_piece.py`` + ``synth_prepare.py`` with
an Open3D + PyMeshLab pipeline — testable headlessly in CI.

Heavy imports (open3d, pymeshlab, trimesh, pygltflib) are **guarded inside
functions** so that scan_discover-level imports stay cheap.
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
# Pipeline parameters (documented contract)
# ---------------------------------------------------------------------------

# plane_eps in mesh units (RealityScan exports in cm; ~1 mm).  For a rigid flat
# plate this cleanly separates the figure from the substrate.  Increase if the
# plate has significant texture relief; decrease for very flat plates.
_DEFAULT_PLANE_EPS: float = 0.1

# Open3D RANSAC: number of iterations and tolerance as fraction of mesh extent.
_RANSAC_ITERS: int = 500
_RANSAC_TOL_FRAC: float = 0.005


def prepare_scan(
    item: ScanItem,
    out_dir: Path,
    *,
    target_tris: int = 20000,
    plane_eps: float = _DEFAULT_PLANE_EPS,
    plate_diameter_mm: float | None = None,
    fill_holes: bool = True,
    smooth_iters: int = 10,
    make_preview: bool = True,
    seed: int = 42,
    isolate: bool = True,
) -> dict:
    """Prepare a single scanned piece for the render pipeline.

    Parameters
    ----------
    item:
        Scan discovered by ``scan_discover.discover_scans()``.
    out_dir:
        Output directory (receives ``<name>.obj``, ``<name>.png``,
        ``<name>_report.json``, and optionally preview images).
    target_tris:
        Target triangle count after decimation.  Set to 0 to skip decimation.
    plane_eps:
        Absolute threshold (mesh units) for ``signed_distance > plane_eps`` on
        the figure side.  Vertices closer to the fitted plane are treated as
        substrate and dropped.  Default 0.1 (≈1 mm for RealityScan cm exports).
        **Increase** if the plate has heavy texture relief; **decrease** for very
        flat plates.
    plate_diameter_mm:
        If given, scale the mesh so that the bounding circle of the plane inliers
        equals this diameter in mm.  This enables correct relative figure sizes
        in the renderer.
    fill_holes:
        Whether to close open boundary loops via PyMeshLab ``close_holes``.
    smooth_iters:
        Laplacian / Taubin smoothing iterations (0 = skip).
    make_preview:
        Render two orthographic side-view previews (textured + clay).  Requires
        an OpenGL-capable environment; skipped with a warning otherwise.
    seed:
        Seed for RANSAC and other random operations.
    isolate:
        When True (default), fit a plane to the substrate, mask below-plane
        vertices, and keep the connected component nearest the plate centroid.
        When False, the mesh is assumed to be a pre-cut single piece (no
        paper/plate) — skip the plane-based masking but still keep the largest
        connected component, remove outliers, and upright via base-plane fit.

    Returns
    -------
    dict
        Quality report (mirrors the old ``isolate_piece.py`` field names +
        ``plane_inliers``, ``scale_mm_per_unit``, ``center_component_frac``).
        Also written to ``<out_dir>/<name>_report.json``.
    """

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(seed)

    # ---- 1. Load mesh ---------------------------------------------------------
    mesh, tex_img = _load_and_extract(item, rng)
    tris_before = len(mesh.faces)

    _log.info("loaded %s: %d verts, %d tris", item.name, len(mesh.vertices), tris_before)

    if isolate:
        # ==================================================================
        # ISOLATION PIPELINE (existing): plane fit → above-plane mask →
        # keep center component → upright via plate plane
        # ==================================================================

        # ---- 2. RANSAC plane fit + above-plane mask ---------------------------
        plane_normal, plane_d, inlier_mask = _fit_plane(mesh.vertices, rng)
        plane_inliers = int(inlier_mask.sum())
        _log.info("plane fit: %d inliers", plane_inliers)

        signed = mesh.vertices @ plane_normal + plane_d
        fig_side = 1 if signed.max() > abs(signed.min()) else -1
        if fig_side < 0:
            plane_normal = -plane_normal
            plane_d = -plane_d
            signed = -signed

        # Above-plane = vertices with signed distance > plane_eps AND not a plane inlier.
        above_mask = (signed > plane_eps) & (~inlier_mask)
        _log.info("above-plane vertices: %d / %d", above_mask.sum(), len(mesh.vertices))

        # ---- 3. Pre-isolation metrics (must run before mesh is truncated) ------
        pattern_margin, piece_vertex_frac = _compute_pattern_margin(
            mesh, plane_normal, plane_d, above_mask, inlier_mask)

        # Optional scale (must use original mesh + inlier_mask)
        scale_mm = None
        if plate_diameter_mm is not None:
            scale_mm = _compute_scale(mesh, inlier_mask, plane_normal, plane_d, plate_diameter_mm)
            _log.info("scale: %.3f mm/unit", scale_mm)

        # ---- 4. Keep largest connected component near the rotation axis -------
        mesh, center_component_frac = _keep_center_component(
            mesh, above_mask, inlier_mask, plane_normal, plane_d)
        _log.info("center component frac: %.3f", center_component_frac)

        # ---- 5. Upright + re-center -------------------------------------------
        mesh = _upright(mesh, plane_normal)
    else:
        # ==================================================================
        # NO-ISOLATION PIPELINE: pre-cut single piece, no paper/plate.
        # Keep largest component, remove outliers, upright via base-plane fit.
        # ==================================================================

        plane_inliers = 0
        pattern_margin = None
        piece_vertex_frac = 1.0
        scale_mm = None

        # Keep largest connected component (drops stray debris)
        mesh, center_component_frac = _keep_largest_component(mesh)
        _log.info("largest component frac: %.3f", center_component_frac)

        # Fit plane to bottom ~15% of vertices for uprighting only
        base_normal, base_d, base_inlier_mask = _fit_plane(mesh.vertices, rng)
        plane_inliers = int(base_inlier_mask.sum())
        _log.info("base plane fit for upright: %d inliers", plane_inliers)

        # Ensure normal points +Z (figure side)
        signed = mesh.vertices @ base_normal + base_d
        fig_side = 1 if signed.max() > abs(signed.min()) else -1
        if fig_side < 0:
            base_normal = -base_normal
            base_d = -base_d

        # Upright + re-center using the base plane
        mesh = _upright(mesh, base_normal)

    # ---- 6. PyMeshLab: close holes, decimate, smooth -------------------------
    mesh, out_obj, tex_dst = _pymeshlab_process(
        mesh, item.name, out_dir, tex_img, item.tex,
        target_tris=target_tris, fill_holes=fill_holes, smooth_iters=smooth_iters,
    )
    tris_after = len(mesh.faces)

    # ---- 8. Mesh quality ------------------------------------------------------
    quality = _mesh_quality(mesh)

    # ---- 9. Dimensions + height ratio -----------------------------------------
    dims, height_ratio = _compute_dims_ratio(mesh)

    # ---- 10. Report -----------------------------------------------------------
    report: dict = {
        "piece": item.name,
        "verts": len(mesh.vertices),
        "tris_before": int(tris_before),
        "tris_after": int(tris_after),
        "decimated": bool(target_tris > 0 and tris_before > target_tris),
        "target_tris": target_tris,
        "smooth_iters": smooth_iters,
        "plane_eps": plane_eps,
        "fill_holes": fill_holes,
        "plane_inliers": int(plane_inliers),
        "center_component_frac": round(float(center_component_frac), 3),
        "piece_vertex_frac": round(float(piece_vertex_frac), 3),
        "scale_mm_per_unit": round(scale_mm, 3) if scale_mm is not None else None,
        "plate_diameter_mm": plate_diameter_mm,
        **quality,
        "dims": [round(float(d), 4) for d in dims],
        "height_ratio": round(float(height_ratio), 3),
    }
    if pattern_margin is not None:
        report["pattern_margin"] = round(float(pattern_margin), 3)
    report_path = out_dir / f"{item.name}_report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    _log.info("wrote %s", report_path)

    # ---- 11. Previews (best-effort) -------------------------------------------
    if make_preview:
        _render_previews(mesh, item.name, out_dir, tex_dst)

    return report


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

    # Extract texture
    tex_img = None
    ext = item.obj.suffix.lower()
    if ext in (".glb", ".gltf"):
        tex_img = _extract_glb_texture(mesh)
    elif ext == ".obj" and item.tex is not None:
        tex_img = item.tex

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


def _extract_glb_texture(mesh) -> Path | None:
    """Try to extract the embedded texture image from a GLB mesh using trimesh.visual.

    Returns a path to a temporary PNG, or None.
    """
    import io

    import trimesh

    import PIL.Image

    visual = mesh.visual
    if hasattr(visual, "material") and hasattr(visual.material, "baseColorTexture"):
        tex = visual.material.baseColorTexture
        if tex is not None:
            # trimesh liefert je nach Version ein PIL.Image, ein ndarray oder Bytes.
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

    # Carry over vertex attributes (UVs only if no outlier filtering, to keep mapping simple)
    import trimesh
    kwargs = {}
    orig_visual = mesh.visual
    if clean_verts is final_verts:
        # No outlier removal → simple UV remap through best_vert_idx
        orig_uv = getattr(orig_visual, "uv", None)
        if orig_uv is not None and len(orig_uv) == len(mesh.vertices):
            kwargs["visual"] = trimesh.visual.texture.TextureVisuals(uv=orig_uv[best_vert_idx])
        elif hasattr(orig_visual, "vertex_colors") and orig_visual.vertex_colors is not None:
            vc = orig_visual.vertex_colors
            if len(vc) == len(mesh.vertices):
                kwargs["vertex_colors"] = vc[best_vert_idx]

    result = trimesh.Trimesh(vertices=clean_verts, faces=clean_tris_mapped,
                             process=False, **kwargs)
    return result, kept_fraction


def _keep_center_component(mesh, above_mask: np.ndarray, inlier_mask: np.ndarray,
                           plane_normal: np.ndarray, plane_d: float):
    """Keep only the connected component of above-plane triangles nearest the
    in-plane centroid of plane inliers (≈ rotation axis).

    Operates on the original mesh's triangles/vertices to preserve vertex
    attributes (UVs, colors).

    Returns ``(new_mesh, center_component_frac)``.
    """
    import open3d as o3d

    if above_mask.sum() == 0:
        raise RuntimeError("No above-plane vertices — plane_eps too large or mesh empty")

    # Filter triangles: keep only those where ALL vertices are above-plane
    faces = mesh.faces
    keep_tri_mask = np.all(above_mask[faces], axis=1)
    kept_faces = faces[keep_tri_mask]
    if len(kept_faces) == 0:
        raise RuntimeError("No triangles above plane — plane_eps too high or mesh corrupt")

    # Get the unique vertex indices referenced by kept faces
    kept_vert_indices = np.unique(kept_faces.flatten())

    # Build a compact vertex list and face index remapping
    old_to_new = {int(old): new for new, old in enumerate(kept_vert_indices)}
    new_faces = np.array([[old_to_new[vi] for vi in tri] for tri in kept_faces], dtype=np.int32)
    new_verts = mesh.vertices[kept_vert_indices]

    # Build Open3D mesh for clustering
    above_mesh = o3d.geometry.TriangleMesh()
    above_mesh.vertices = o3d.utility.Vector3dVector(new_verts)
    above_mesh.triangles = o3d.utility.Vector3iVector(new_faces)

    # Connected components via triangle adjacency
    triangle_clusters, cluster_counts, _ = above_mesh.cluster_connected_triangles()
    n_clusters = len(cluster_counts)

    if n_clusters == 0:
        raise RuntimeError("No connected components found above plane")

    # Pick the LARGEST cluster (by triangle count).  The figure should be the
    # dominant above-plane component; debris clusters are much smaller.
    # As a tie-breaker for very close sizes, prefer the cluster nearest the
    # in-plane centroid of plane inliers.
    inlier_centroid = mesh.vertices[inlier_mask].mean(axis=0)
    proj = inlier_centroid - (inlier_centroid @ plane_normal + plane_d) * plane_normal

    cluster_sizes = np.array(cluster_counts, dtype=int)
    # Get the size of the largest cluster
    max_size = cluster_sizes.max()
    # Among clusters at least 80% of max_size, pick nearest to inlier centroid
    candidates = np.where(cluster_sizes >= 0.8 * max_size)[0]
    if len(candidates) == 1:
        best_cluster = int(candidates[0])
    else:
        # Tie-break by distance to inlier centroid
        best_dist = float("inf")
        best_cluster = 0
        for c in candidates:
            c_mask = np.asarray(triangle_clusters) == c
            c_tris = new_faces[c_mask]
            c_vert_idx = np.unique(c_tris.flatten())
            c_centroid = new_verts[c_vert_idx].mean(axis=0)
            d = float(np.linalg.norm(c_centroid - proj))
            if d < best_dist:
                best_dist = d
                best_cluster = int(c)
    _log.info("selected cluster %d/%d (size=%d tris)", best_cluster, n_clusters, cluster_sizes[best_cluster])
    total_above_tris = len(new_faces)
    best_tris = int(np.sum(np.asarray(triangle_clusters) == best_cluster))
    center_component_frac = best_tris / total_above_tris if total_above_tris > 0 else 1.0

    # Keep only best cluster triangles
    best_mask = np.asarray(triangle_clusters) == best_cluster
    best_tri_indices = new_faces[best_mask]
    best_vert_idx = np.unique(best_tri_indices.flatten())

    # Compact remap
    v2 = {int(old): new for new, old in enumerate(best_vert_idx)}
    final_faces = np.array([[v2[vi] for vi in tri] for tri in best_tri_indices], dtype=np.int32)
    final_verts = new_verts[best_vert_idx]

    # Remove statistical outliers (debris) — use lenient parameters to avoid
    # wiping out the figure on high-poly scans.
    clean_verts = final_verts
    clean_tris = final_faces
    if len(final_verts) > 500:
        try:
            pcd = o3d.geometry.PointCloud()
            pcd.points = o3d.utility.Vector3dVector(final_verts)
            pcd, ind = pcd.remove_statistical_outlier(nb_neighbors=50, std_ratio=3.0)
            kept_frac = len(ind) / len(final_verts)
            if kept_frac > 0.3:  # don't apply if it removes too much
                clean_verts = np.asarray(pcd.points)
                clean_idx_set = set(ind)
                clean_tris = [tri for tri in final_faces if all(v in clean_idx_set for v in tri)]
                _log.info("outlier removal kept %.1f%% of vertices", 100 * kept_frac)
        except Exception:
            pass

    # Remap
    new_vert_map = {old: new for new, old in enumerate(sorted({v for tri in clean_tris for v in tri}))}
    clean_tris_mapped = np.array([[new_vert_map[vi] for vi in tri] for tri in clean_tris], dtype=np.int32)

    # Carry over vertex attributes (UVs, colors) from the compact mesh
    import trimesh
    kwargs = {}
    orig_visual = mesh.visual
    if hasattr(orig_visual, "uv") and orig_visual.uv is not None:
        # UVs are per-vertex in trimesh — map through kept_vert_indices -> best_vert_idx -> ind
        orig_uv = orig_visual.uv
        if len(orig_uv) == len(mesh.vertices):
            mapped_uv = orig_uv[kept_vert_indices][best_vert_idx][list(ind)]
            kwargs["visual"] = trimesh.visual.texture.TextureVisuals(uv=mapped_uv)
    elif hasattr(orig_visual, "vertex_colors") and orig_visual.vertex_colors is not None:
        orig_vc = orig_visual.vertex_colors
        if len(orig_vc) == len(mesh.vertices):
            mapped_vc = orig_vc[kept_vert_indices][best_vert_idx][list(ind)]
            kwargs["vertex_colors"] = mapped_vc

    result = trimesh.Trimesh(vertices=clean_verts, faces=clean_tris_mapped,
                             process=False, **kwargs)

    return result, center_component_frac


def _trimesh_to_o3d(mesh):
    """Convert trimesh to Open3D TriangleMesh."""
    import open3d as o3d

    o3d_mesh = o3d.geometry.TriangleMesh()
    o3d_mesh.vertices = o3d.utility.Vector3dVector(np.array(mesh.vertices))
    o3d_mesh.triangles = o3d.utility.Vector3iVector(np.array(mesh.faces))
    return o3d_mesh


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


def _compute_pattern_margin(mesh, plane_normal: np.ndarray, plane_d: float,
                            above_mask: np.ndarray, inlier_mask: np.ndarray):
    """Compute pattern_margin and piece_vertex_frac from original (pre-isolation) data.

    ``pattern_margin`` = ratio of plane extent beyond figure to figure radius.
    """
    vertices = mesh.vertices

    # Project vertices onto the plane
    proj = vertices - (vertices @ plane_normal + plane_d)[:, None] * plane_normal[None, :]

    # Figure centroid (above-plane vertices)
    above_proj = proj[above_mask]
    if len(above_proj) == 0:
        return 0.0, 0.0

    fig_center = above_proj.mean(axis=0)
    fig_dists = np.linalg.norm(above_proj - fig_center, axis=1)
    fig_radius = float(np.percentile(fig_dists, 95)) if len(fig_dists) > 0 else 1.0

    # Plate radius (inlier vertices, excluding figure)
    plate_proj = proj[inlier_mask]
    if len(plate_proj) == 0:
        return 0.0, float(above_mask.mean())

    plate_dists = np.linalg.norm(plate_proj - fig_center, axis=1)
    plate_radius = float(np.percentile(plate_dists, 95)) if len(plate_dists) > 0 else 0.0

    pattern_margin = plate_radius / fig_radius if fig_radius > 0 else 0.0
    piece_vertex_frac = float(above_mask.mean())

    return pattern_margin, piece_vertex_frac


def _pymeshlab_process(mesh, name: str, out_dir: Path, tex_img,
                       tex_fallback: Path | None,
                       *, target_tris: int, fill_holes: bool, smooth_iters: int):
    """PyMeshLab post-processing: close holes, decimate, smooth.

    Writes ``<name>.obj``, ``<name>.mtl`` and ``<name>.png`` to *out_dir*.
    The OBJ/MTL are written by hand — NOT via PyMeshLab's ``save_current_mesh``
    — to avoid material mangling and stub textures.  Returns the (possibly
    modified) trimesh after processing.
    """
    import pymeshlab
    import trimesh

    out_obj = out_dir / f"{name}.obj"
    tex_dst = out_dir / f"{name}.png"

    # Nur die größte zusammenhängende Komponente behalten (UV-erhaltend) — entfernt
    # kleine schwebende Scan-Debris-Fragmente, damit das Ergebnis EIN sauberes Solid ist.
    try:
        comps = mesh.split(only_watertight=False)
        if len(comps) > 1:
            biggest = max(comps, key=lambda c: len(c.vertices))
            _log.info("keep largest component: %d/%d verts (dropped %d Fragmente)",
                      len(biggest.vertices), len(mesh.vertices), len(comps) - 1)
            mesh = biggest
    except Exception as e:  # pragma: no cover - defensiv
        _log.warning("keep-largest-component übersprungen (%s)", e)

    # Ensure mesh has TextureVisuals with material.image so OBJ export
    # writes vt coords → PyMeshLab gets per‑wedge texture coords and
    # the texture‑preserving decimator actually runs.
    _ensure_texture_visual(mesh, tex_img, tex_fallback)

    # Save mesh to temp OBJ for PyMeshLab WITH texture (vt + mtl)
    tmp_obj = out_dir / f"_{name}_tmp.obj"
    mesh.export(str(tmp_obj), include_texture=True)

    ms = pymeshlab.MeshSet()
    ms.load_new_mesh(str(tmp_obj))

    # Decimate FIRST (before any topology changes that could break the decimator)
    if target_tris > 0 and ms.current_mesh().face_number() > target_tris:
        try:
            ms.meshing_decimation_quadric_edge_collapse_with_texture(
                targetfacenum=target_tris,
                preserveboundary=False,
            )
        except Exception as e:
            _log.warning("texture-preserving decimation failed (%s), trying without texture", e)
            try:
                before_faces = ms.current_mesh().face_number()
                ms.meshing_decimation_quadric_edge_collapse(
                    targetfacenum=target_tris,
                    preservetopology=False,
                    preserveboundary=False,
                )
                _log.info("non-texture decimate: %d -> %d faces", before_faces,
                          ms.current_mesh().face_number())
            except Exception as e2:
                _log.warning("decimation failed (%s) — continuing without", e2)

    if smooth_iters > 0:
        try:
            ms.apply_coord_taubin_smoothing(
                stepsmoothnum=smooth_iters,
                lambda_=0.5,
                mu=-0.53,
            )
        except Exception as e:
            _log.warning("taubin smooth failed (%s), trying laplacian", e)
            try:
                ms.apply_coord_laplacian_smoothing(
                    stepsmoothnum=smooth_iters,
                )
            except Exception as e2:
                _log.warning("smoothing failed (%s) — continuing without", e2)

    # Close holes after decimate+smooth (avoids stale internal state)
    if fill_holes:
        try:
            ms.meshing_close_holes(maxholesize=5000)
        except Exception as e:
            _log.warning("close_holes failed (%s) — continuing without", e)

    # Kleine Komponenten entfernen: die Dezimierung kann dünne Verbindungen (z.B. den
    # Bauern-Hals) kollabieren lassen → schwebende Splitter. Nur Komponenten unterhalb
    # eines Bruchteils der Gesamtfläche wegwerfen (der Figurkörper bleibt).
    try:
        fn = ms.current_mesh().face_number()
        thresh = max(64, int(0.03 * fn))
        for fname in ("meshing_remove_connected_component_by_face_number",
                      "remove_isolated_pieces_wrt_face_num"):
            if hasattr(ms, fname):
                getattr(ms, fname)(mincomponentsize=thresh, removeunref=True)
                _log.info("removed components < %d faces (of %d)", thresh, fn)
                break
    except Exception as e:
        _log.warning("remove small components failed (%s) — continuing", e)

    # ---- Write clean OBJ ourselves (BUG 1 fix: bypass broken PyMeshLab writer) ----
    _write_clean_obj(ms, out_obj, name)
    _save_texture(tex_img, tex_fallback, tex_dst)
    _write_clean_mtl(out_dir, name)
    _cleanup_temp(out_dir, name)

    # Reload the processed mesh for quality computation
    result = trimesh.load(str(out_obj), force="mesh")
    if isinstance(result, trimesh.Scene):
        meshes = list(result.geometry.values())
        result = max((m for m in meshes if isinstance(m, trimesh.Trimesh)),
                     key=lambda m: len(m.vertices), default=result)

    return result if isinstance(result, trimesh.Trimesh) else mesh, out_obj, tex_dst


# ---------------------------------------------------------------------------
# Texture helpers for OBJ export (preserve UVs through PyMeshLab)
# ---------------------------------------------------------------------------


def _generate_spherical_uvs(verts: np.ndarray) -> np.ndarray:
    """Generate simple spherical UVs from vertex positions.

    Maps vertices onto a unit sphere centred at the mesh centroid and derives
    (u, v) from azimuth / elevation.  The mapping is continuous enough for
    PyMeshLab's texture-preserving decimator; it does NOT need to be
    artist-quality.
    """
    center = verts.mean(axis=0)
    centered = verts - center
    norms = np.linalg.norm(centered, axis=1, keepdims=True)
    norms = np.maximum(norms, 1e-10)
    dirs = centered / norms

    # u ← azimuth around Z,  v ← elevation from XY plane
    u = np.arctan2(dirs[:, 0], dirs[:, 1]) / (2 * np.pi) + 0.5
    v = np.arcsin(np.clip(dirs[:, 2], -1.0, 1.0)) / np.pi + 0.5
    return np.column_stack([u, v])


def _ensure_texture_visual(mesh, tex_img, tex_fallback):
    """Set up ``mesh.visual`` as TextureVisuals with material.image so
    ``export(…, include_texture=True)`` writes vt coords + MTL.

    No-op if the mesh already has a usable TextureVisuals with image,
    or if no texture source is available.
    """
    import PIL.Image
    import trimesh

    # Already has a material with an image → nothing to do
    visual = mesh.visual
    if isinstance(visual, trimesh.visual.texture.TextureVisuals):
        if visual.material is not None and getattr(visual.material, "image", None) is not None:
            return

    # Resolve texture image
    img = None
    if isinstance(tex_img, PIL.Image.Image):
        img = tex_img
    elif isinstance(tex_img, np.ndarray):
        img = PIL.Image.fromarray(tex_img)
    elif isinstance(tex_img, (str, Path)):
        try:
            img = PIL.Image.open(str(tex_img))
        except Exception:
            pass

    if img is None and tex_fallback is not None:
        try:
            img = PIL.Image.open(str(tex_fallback))
        except Exception:
            pass

    if img is None:
        return  # nothing to attach

    # Get UVs from existing visual
    uv = None
    if isinstance(visual, trimesh.visual.texture.TextureVisuals):
        uv = visual.uv
    elif hasattr(visual, "uv") and visual.uv is not None:
        uv = visual.uv

    if uv is None or len(uv) != len(mesh.vertices):
        # No usable UVs — generate simple spherical UVs so the texture-
        # preserving decimator has *something* to work with.
        uv = _generate_spherical_uvs(mesh.vertices)
        _log.info("generated synthetic UVs for texture-preserving decimation")

    from trimesh.visual.material import SimpleMaterial

    mat = SimpleMaterial(image=img)
    mesh.visual = trimesh.visual.texture.TextureVisuals(uv=uv, material=mat)


def _largest_component_mask(faces: np.ndarray, n_verts: int) -> np.ndarray:
    """Boolean face-mask selecting the connected component with the most faces.

    Union-Find über geteilte Vertices — deterministisch, unabhängig von
    PyMeshLabs Lösch-Semantik. Entfernt schwebende Debris-/Dezimierungssplitter.
    """
    parent = np.arange(n_verts)

    def find(x):
        root = x
        while parent[root] != root:
            root = parent[root]
        while parent[x] != root:
            parent[x], x = root, parent[x]
        return root

    for f in faces:
        a = find(int(f[0]))
        for vi in (int(f[1]), int(f[2])):
            b = find(vi)
            if a != b:
                parent[b] = a
    roots = np.array([find(int(f[0])) for f in faces])
    if len(roots) == 0:
        return np.ones(len(faces), dtype=bool)
    uniq, counts = np.unique(roots, return_counts=True)
    best_root = uniq[int(np.argmax(counts))]
    return roots == best_root


def _write_clean_obj(ms, out_obj: Path, name: str):
    """Extract final geometry from PyMeshLab and write a clean OBJ.

    Writes exactly ONE ``usemtl``, ``mtllib <name>.mtl``, vertex positions,
    deduplicated texture coordinates, and face lines.  This avoids the
    material-mangling produced by PyMeshLab's ``save_current_mesh``.
    """
    cm = ms.current_mesh()
    verts = np.asarray(cm.vertex_matrix())       # Nv × 3
    faces = np.asarray(cm.face_matrix(), dtype=np.int64)  # Nf × 3 (0‑based)

    # Try to extract per‑wedge (per‑corner) texture coordinates
    uv_matrix = None
    has_wedge_uvs = False
    try:
        uv_matrix = np.asarray(cm.wedge_tex_coord_matrix())
        if uv_matrix.size > 0:
            has_wedge_uvs = True
    except Exception:
        try:
            uv_matrix = np.asarray(cm.vertex_tex_coord_matrix())
        except Exception:
            pass

    # Nur die größte zusammenhängende Komponente behalten (Debris weg), mit
    # korrekter UV-Mitführung und Vertex-Remap.
    if len(faces) > 0:
        fmask = _largest_component_mask(faces, len(verts))
        if not fmask.all():
            n_before = len(faces)
            if has_wedge_uvs and uv_matrix is not None and len(uv_matrix) == 3 * n_before:
                uv_matrix = uv_matrix.reshape(n_before, 3, -1)[fmask].reshape(-1, uv_matrix.shape[1])
            faces = faces[fmask]
            used = np.unique(faces.reshape(-1))
            remap = np.full(len(verts), -1, dtype=np.int64)
            remap[used] = np.arange(len(used))
            verts = verts[used]
            if uv_matrix is not None and not has_wedge_uvs and len(uv_matrix) == len(remap):
                uv_matrix = uv_matrix[used]
            faces = remap[faces]
            _log.info("keep largest component (writer): %d/%d Faces, %d Fragmente weg",
                      len(faces), n_before, len(fmask) - int(fmask.sum()))

    # Per-Vertex-Normalen berechnen (flächengewichtet) — three.js schattiert Meshes
    # ohne `vn` unzuverlässig (Wireframe/dunkel-Look). vn-Index == v-Index.
    normals = _vertex_normals(verts, faces)

    lines: list[str] = []
    lines.append(f"mtllib {name}.mtl")
    lines.append(f"o {name}")
    for v in verts:
        lines.append(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}")
    for nrm in normals:
        lines.append(f"vn {nrm[0]:.6f} {nrm[1]:.6f} {nrm[2]:.6f}")

    # Texture coords + faces (vn-Index = v-Index, da Normalen pro Vertex)
    if uv_matrix is not None and uv_matrix.size > 0:
        uvs_raw = uv_matrix[:, :2]  # discard optional third column (w)
        if has_wedge_uvs and len(uvs_raw) == 3 * len(faces):
            # per‑wedge → deduplicate UVs, write vt, index wedges
            uv_unique, uv_idx = np.unique(uvs_raw, axis=0, return_inverse=True)
            for uv in uv_unique:
                lines.append(f"vt {uv[0]:.6f} {uv[1]:.6f}")
            lines.append("usemtl piece")
            for fi in range(len(faces)):
                vi0, vi1, vi2 = int(faces[fi, 0]) + 1, int(faces[fi, 1]) + 1, int(faces[fi, 2]) + 1
                vt0, vt1, vt2 = int(uv_idx[3 * fi]) + 1, int(uv_idx[3 * fi + 1]) + 1, int(uv_idx[3 * fi + 2]) + 1
                lines.append(f"f {vi0}/{vt0}/{vi0} {vi1}/{vt1}/{vi1} {vi2}/{vt2}/{vi2}")
        elif not has_wedge_uvs and len(uvs_raw) == len(verts):
            # per‑vertex UVs
            uv_unique, uv_idx = np.unique(uvs_raw, axis=0, return_inverse=True)
            for uv in uv_unique:
                lines.append(f"vt {uv[0]:.6f} {uv[1]:.6f}")
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
    else:
        lines.append("usemtl piece")
        for fi in range(len(faces)):
            a, b, c = int(faces[fi, 0]) + 1, int(faces[fi, 1]) + 1, int(faces[fi, 2]) + 1
            lines.append(f"f {a}//{a} {b}//{b} {c}//{c}")

    out_obj.write_text("\n".join(lines) + "\n", encoding="utf-8")
    _log.info("wrote clean OBJ: %d verts, %d faces (+vn)", len(verts), len(faces))


def _vertex_normals(verts: "np.ndarray", faces: "np.ndarray") -> "np.ndarray":
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


def _write_clean_mtl(out_dir: Path, name: str):
    """Write a single-material MTL referencing ``<name>.png``."""
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
    _log.info("wrote clean MTL → %s", mtl_path)


def _fix_output_texture(out_dir: Path, name: str, tex_img, tex_fallback):
    """Legacy stub — no longer called.  Kept only for import compatibility."""
    pass


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


def _compute_scale(mesh, inlier_mask: np.ndarray, plane_normal: np.ndarray,
                   plane_d: float, plate_diameter_mm: float) -> float:
    """Compute ``scale_mm_per_unit`` from plane-inlier bounding circle.

    Projects plane inliers, fits a bounding circle, compares to *plate_diameter_mm*.
    """
    vertices = mesh.vertices[inlier_mask] if inlier_mask.sum() > 0 else mesh.vertices
    if len(vertices) == 0:
        return 0.0
    proj = vertices - (vertices @ plane_normal + plane_d)[:, None] * plane_normal[None, :]
    center = proj.mean(axis=0)
    radii = np.linalg.norm(proj - center, axis=1)
    mesh_diameter = 2.0 * float(np.percentile(radii, 95))
    if mesh_diameter < 1e-9:
        return 0.0
    return plate_diameter_mm / mesh_diameter


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