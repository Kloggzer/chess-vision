"""Eine gescannte Figur aus dem RealityScan-Mesh isolieren, dezimieren + aufrecht normalisieren
(läuft IN Blender).

    blender --background --python synth/isolate_piece.py -- \
        <mesh.obj> <diffuse.png|jpg> <out.obj> [preview.png] [--target-tris 20000] [--smooth-iters 10]

Macht: Papier-Ebene per PCA finden → den herausragenden Figur-Cluster behalten (Zylinder um die
Figur) → **dezimieren** auf ~target-tris Dreiecke (RealityScan liefert Millionen — 32 Figuren
davon sind unrenderbar; Decimate/Collapse erhält Silhouette + UVs) → glätten → **aufrecht**
stellen (Basis auf z=0, mittig, Figur-Achse = +Z). Schreibt <out.obj>, die Textur als
<out>.png (JPG wird echt nach PNG konvertiert) und einen Qualitäts-Report <out>_report.json
(Dreiecke vorher/nachher, offene Kanten/Löcher, Non-Manifold, Maße/Proportionen) —
den wertet `chesslab synth prepare` aus. Generisch für jeden Figurentyp.
"""
import json
import sys
from pathlib import Path

import bpy
import bmesh
import numpy as np
from mathutils import Vector


def _tri_count(me) -> int:
    return sum(max(0, len(p.vertices) - 2) for p in me.polygons)


def _mesh_quality(me) -> dict:
    """Offene Kanten (Löcher) + Non-Manifold-Kanten zählen — die zwei häufigsten Scan-Defekte."""
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.edges.ensure_lookup_table()
    boundary = sum(1 for e in bm.edges if e.is_boundary)
    nonmanifold = sum(1 for e in bm.edges if not e.is_manifold and not e.is_boundary)
    bm.free()
    return {"boundary_edges": boundary, "nonmanifold_edges": nonmanifold}


def _save_image_as_png(img, dst_png: str) -> None:
    """Blender-Image ECHT als PNG speichern. pack() erzwingt das Laden der Pixeldaten —
    ohne das wirft save() 'does not have any image data'."""
    if not img.packed_file:
        img.pack()
    img.filepath_raw = dst_png
    img.file_format = "PNG"
    img.save()


def _material_image(obj):
    """Erstes Textur-Image aus den Materialien des Objekts (für .glb: eingebettete Diffuse)."""
    for slot in obj.material_slots:
        mat = slot.material
        if mat and mat.use_nodes:
            for n in mat.node_tree.nodes:
                if n.type == "TEX_IMAGE" and n.image:
                    return n.image
    return None


def _import_scan(obj_path: str):
    """Scan importieren (.glb/.gltf mit eingebetteter Textur oder .obj) und das
    vertex-reichste Mesh zurückgeben (glb-Szenen können mehrere Knoten enthalten)."""
    if obj_path.lower().endswith((".glb", ".gltf")):
        bpy.ops.import_scene.gltf(filepath=obj_path)
    else:
        bpy.ops.wm.obj_import(filepath=obj_path)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    return max(meshes, key=lambda o: len(o.data.vertices))


def _keep_largest_component(me) -> int:
    """Nur die größte zusammenhängende Komponente behalten (schwebende Scan-Trümmer weg).
    Rückgabe: Anzahl entfernter Komponenten."""
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    parent = list(range(len(bm.verts)))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for e in bm.edges:
        a, b = find(e.verts[0].index), find(e.verts[1].index)
        if a != b:
            parent[a] = b
    from collections import Counter
    comp = Counter(find(i) for i in range(len(bm.verts)))
    if len(comp) <= 1:
        bm.free()
        return 0
    biggest = comp.most_common(1)[0][0]
    doomed = [bm.verts[i] for i in range(len(bm.verts)) if find(i) != biggest]
    bmesh.ops.delete(bm, geom=doomed, context="VERTS")
    bm.to_mesh(me); bm.free(); me.update()
    return len(comp) - 1


def _fill_holes(me) -> None:
    """Offene Ränder schließen (Basis-Öffnung, Scan-Löcher) — macht die Silhouette sauber
    statt ausgefranst. Danach Normalen konsistent nach außen richten: frisch gefüllte
    Flächen zeigen sonst oft nach innen und rendern schwarz."""
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.holes_fill(bm, edges=bm.edges, sides=0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free(); me.update()


def isolate(obj_path, tex_path, out_obj, preview=None, smooth_iters=10, target_tris=20000,
            keep_radius=1.9, keep_largest=True, fill_holes=True):
    """Alle Nachbearbeitungsschritte sind Toggles:
    target_tris=0 → kein Decimate · smooth_iters=0 → kein Glätten ·
    keep_largest=False → Trümmer-Entfernung aus · fill_holes=False → Löcher offen lassen ·
    keep_radius → Isolations-Zylinder um die Figur (größer = mehr behalten) ·
    preview=None → kein Vorschaubild. Report wird immer geschrieben (kostet nichts)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    obj = _import_scan(obj_path)
    # Textur: explizite Datei ODER '-' = aus dem Material extrahieren (.glb: eingebettet).
    tex_img = None
    if not tex_path or tex_path == "-":
        tex_img = _material_image(obj)
        if tex_img is None:
            raise RuntimeError("keine Textur im Mesh-Material gefunden — Textur-Datei explizit angeben")
    # Import-Achsenkonvention (Y-up→Z-up) liegt als OBJEKT-Rotation auf dem Mesh — einbacken,
    # damit Roh-Vertices == Weltkoordinaten (sonst zielt die Preview-Kamera daneben).
    for o in bpy.context.scene.objects:
        o.select_set(o == obj)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = obj.data
    V = np.array([list(v.co) for v in me.vertices])

    c = V.mean(0); X = V - c
    _, _, Vt = np.linalg.svd(X, full_matrices=False)
    normal, e1, e2 = Vt[2], Vt[0], Vt[1]
    dd = (X @ normal) - np.median(X @ normal)
    pos, neg = dd[dd > 0], dd[dd < 0]
    side = 1.0 if (pos.sum() if len(pos) else 0) >= (-neg.sum() if len(neg) else 0) else -1.0
    pd = dd * side                                   # Figur ragt in +pd
    a, b = X @ e1, X @ e2

    top = pd > 0.55 * pd.max()                        # eindeutig Figur (hoch erhaben)
    ca, cb = a[top].mean(), b[top].mean()
    rad = np.percentile(np.sqrt((a[top] - ca) ** 2 + (b[top] - cb) ** 2), 95)
    keep = (np.sqrt((a - ca) ** 2 + (b - cb) ** 2) <= rad * keep_radius) & (pd > 0.0)

    base_z = pd[keep].min()
    me.vertices.foreach_set("co", np.column_stack([a - ca, b - cb, pd - base_z]).ravel())
    me.update()

    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in range(len(bm.verts)) if not keep[i]], context="VERTS")
    bm.to_mesh(me); bm.free()
    print(f"[isolate] kept {len(me.vertices)} verts, dims={tuple(round(x,2) for x in obj.dimensions)}")

    components_removed = 0
    if keep_largest:                                  # schwebende Scan-Trümmer entfernen
        components_removed = _keep_largest_component(me)
        if components_removed:
            print(f"[isolate] {components_removed} lose Komponente(n) entfernt")
    if fill_holes:                                    # Basis-Öffnung + Scan-Löcher schließen
        _fill_holes(me)
        print("[isolate] Löcher gefüllt (Basis geschlossen)")

    for o in bpy.context.scene.objects:
        o.select_set(o == obj)
    bpy.context.view_layer.objects.active = obj

    # Dezimieren VOR dem Glätten: Collapse auf ~target_tris ist auf Millionen Dreiecken schnell,
    # das Glätten danach auf dem kleinen Mesh praktisch gratis. UVs bleiben erhalten.
    tris_before = _tri_count(me)
    decimated = False
    if target_tris and tris_before > target_tris:
        dec = obj.modifiers.new("dec", "DECIMATE")
        dec.ratio = max(0.001, target_tris / tris_before)
        bpy.ops.object.modifier_apply(modifier=dec.name)
        decimated = True
        print(f"[isolate] dezimiert: {tris_before} → {_tri_count(me)} Dreiecke")

    if smooth_iters > 0:
        # Laplacian Smooth mit Volumenerhalt: nimmt die typischen Scan-„Bumps" raus, ohne die
        # Silhouette zu schrumpfen (der einfache SMOOTH-Modifier zieht das Mesh zusammen).
        # Stärke über --smooth-iters (10 = mild, 25–40 = deutlich; UVs/Textur bleiben erhalten).
        sm = obj.modifiers.new("smooth", "LAPLACIANSMOOTH")
        sm.iterations = smooth_iters
        sm.lambda_factor = 0.5
        sm.use_volume_preserve = True
        sm.use_normalized = True
        bpy.ops.object.modifier_apply(modifier=sm.name)
        for p in me.polygons:
            p.use_smooth = True
        print(f"[isolate] geglättet (Laplacian, {smooth_iters} Iterationen, Volumen erhalten)")

    Path(out_obj).parent.mkdir(parents=True, exist_ok=True)
    # up_axis='Z': Datei-Koordinaten == Blender-Welt (aufrecht, Basis z=0). Der Renderer
    # (_load_scanned_mesh) liest die ROHEN Datei-Koordinaten und verwirft das Import-Objekt —
    # er braucht Z-up in der Datei (Konvention des bewährten Bauern-Scans).
    bpy.ops.wm.obj_export(filepath=out_obj, export_selected_objects=True, export_materials=False,
                          up_axis="Z", forward_axis="Y")
    tex_dst = str(Path(out_obj).with_suffix(".png"))
    if tex_img is None:
        tex_img = bpy.data.images.load(tex_path)
    try:
        _save_image_as_png(tex_img, tex_dst)
    except RuntimeError:
        # .glb mit EXTERN referenzierter Textur, deren Quellpfad fehlt → explizite Datei nutzen.
        if tex_path and tex_path != "-":
            tex_img = bpy.data.images.load(tex_path)
            _save_image_as_png(tex_img, tex_dst)
        else:
            raise RuntimeError(f"Textur nicht extrahierbar (Quelle fehlt: {tex_img.filepath}) — "
                               "Textur-Datei mit in den Scan-Ordner legen")
    print(f"[isolate] wrote {out_obj} + {tex_dst}")

    # Qualitäts-Report für `chesslab synth prepare` (Löcher, Non-Manifold, Maße, Proportionen).
    P = np.array([list(v.co) for v in me.vertices])
    dims = (P.max(0) - P.min(0)).tolist() if len(P) else [0.0, 0.0, 0.0]
    height_ratio = dims[2] / max(dims[0], dims[1], 1e-9)
    report = {
        "piece": Path(out_obj).stem,
        "verts": len(me.vertices),
        "tris_before": tris_before,
        "tris_after": _tri_count(me),
        "decimated": decimated,
        "target_tris": target_tris,
        "smooth_iters": smooth_iters,
        "keep_radius": keep_radius,
        "components_removed": components_removed,
        "filled_holes": bool(fill_holes),
        **_mesh_quality(me),
        "dims": [round(d, 4) for d in dims],
        "height_ratio": round(height_ratio, 3),   # Höhe / max(Breite,Tiefe) — Schachfigur ~1.0–3.5
        "preview": preview,
    }
    report_path = Path(out_obj).with_name(Path(out_obj).stem + "_report.json")
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"[isolate] report {report_path}")

    if preview:
        img = tex_img
        mat = bpy.data.materials.new("s"); mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        tx = mat.node_tree.nodes.new("ShaderNodeTexImage"); tx.image = img
        mat.node_tree.links.new(tx.outputs["Color"], bsdf.inputs["Base Color"])
        me.materials.clear(); me.materials.append(mat)
        P = np.array([list(v.co) for v in me.vertices]); mn, mx = P.min(0), P.max(0)
        center = Vector((mn + mx) / 2); size = float((mx - mn).max()) or 1.0
        sc = bpy.context.scene
        for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
            try:
                sc.render.engine = eng; break
            except Exception:
                pass
        sc.render.resolution_x = sc.render.resolution_y = 600
        # Key + Fill: mit nur EINER Sonne verschwinden Einschnürungen im Schatten und sehen
        # aus wie Scan-Löcher (falscher Alarm beim Bauern-Hals).
        for nm, rot, en in (("key", (0.5, 0.2, 0.4), 4.0), ("fill", (1.0, -0.3, -2.4), 1.5)):
            lo = bpy.data.objects.new(nm, bpy.data.lights.new(nm, "SUN"))
            sc.collection.objects.link(lo)
            lo.rotation_euler = rot; lo.data.energy = en
        cam = bpy.data.objects.new("C", bpy.data.cameras.new("C")); sc.collection.objects.link(cam)
        cam.data.clip_end = size * 100; sc.camera = cam
        # Orthografische Seitenansicht (Blick entlang +Y): narrensicher zentriert, und genau die
        # Ansicht, in der man Aufrecht-Stehen, Basis und Silhouette am besten beurteilt.
        import math
        cam.data.type = "ORTHO"
        cam.data.ortho_scale = size * 1.3
        cam.location = center + Vector((0.0, -size * 3.0, 0.0))
        cam.rotation_euler = (math.radians(90), 0.0, 0.0)
        sc.render.filepath = preview
        bpy.ops.render.render(write_still=True)
        print(f"[isolate] preview {preview}")


def main():
    argv = sys.argv[sys.argv.index("--") + 1:]
    pos: list[str] = []
    kw = {}
    i = 0
    while i < len(argv):                       # Positionsargumente + optionale Flags mischen
        a = argv[i]
        if a == "--target-tris":
            kw["target_tris"] = int(argv[i + 1]); i += 2
        elif a == "--smooth-iters":
            kw["smooth_iters"] = int(argv[i + 1]); i += 2
        elif a == "--keep-radius":
            kw["keep_radius"] = float(argv[i + 1]); i += 2
        elif a == "--no-keep-largest":
            kw["keep_largest"] = False; i += 1
        elif a == "--no-fill-holes":
            kw["fill_holes"] = False; i += 1
        else:
            pos.append(a); i += 1
    isolate(pos[0], pos[1], pos[2], pos[3] if len(pos) > 3 else None, **kw)


main()
