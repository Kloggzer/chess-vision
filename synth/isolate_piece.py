"""Eine gescannte Figur aus dem RealityScan-Mesh isolieren + aufrecht normalisieren (läuft IN Blender).

    blender --background --python synth/isolate_piece.py -- <mesh.obj> <diffuse.png> <out.obj> [preview.png]

Macht: Papier-Ebene per PCA finden → den herausragenden Figur-Cluster behalten (Zylinder um die
Figur) → **aufrecht** stellen (Basis auf z=0, mittig, Figur-Achse = +Z; behebt die beliebige
RealityScan-Orientierung). Schreibt <out.obj> + kopiert die Textur als <out>.png daneben.
Generisch für jeden Figurentyp.
"""
import shutil
import sys
from pathlib import Path

import bpy
import bmesh
import numpy as np
from mathutils import Vector


def isolate(obj_path, tex_path, out_obj, preview=None, smooth_iters=25):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.wm.obj_import(filepath=obj_path)
    obj = [o for o in bpy.context.scene.objects if o.type == "MESH"][0]
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
    keep = (np.sqrt((a - ca) ** 2 + (b - cb) ** 2) <= rad * 1.9) & (pd > 0.0)

    base_z = pd[keep].min()
    me.vertices.foreach_set("co", np.column_stack([a - ca, b - cb, pd - base_z]).ravel())
    me.update()

    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in range(len(bm.verts)) if not keep[i]], context="VERTS")
    bm.to_mesh(me); bm.free()
    print(f"[isolate] kept {len(me.vertices)} verts, dims={tuple(round(x,2) for x in obj.dimensions)}")

    for o in bpy.context.scene.objects:
        o.select_set(o == obj)
    bpy.context.view_layer.objects.active = obj

    if smooth_iters > 0:                              # Oberfläche glätten (Scan-Rauschen weg, Textur bleibt)
        sm = obj.modifiers.new("smooth", "SMOOTH")
        sm.iterations = smooth_iters
        sm.factor = 0.5
        bpy.ops.object.modifier_apply(modifier=sm.name)
        for p in me.polygons:
            p.use_smooth = True
        print(f"[isolate] geglättet ({smooth_iters} Iterationen)")

    Path(out_obj).parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.obj_export(filepath=out_obj, export_selected_objects=True, export_materials=False)
    tex_dst = str(Path(out_obj).with_suffix(".png"))
    shutil.copyfile(tex_path, tex_dst)
    print(f"[isolate] wrote {out_obj} + {tex_dst}")

    if preview:
        img = bpy.data.images.load(tex_path)
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
        lo = bpy.data.objects.new("L", bpy.data.lights.new("L", "SUN")); sc.collection.objects.link(lo)
        lo.rotation_euler = (0.5, 0.2, 0.4); lo.data.energy = 4
        cam = bpy.data.objects.new("C", bpy.data.cameras.new("C")); sc.collection.objects.link(cam)
        cam.data.clip_end = size * 100; sc.camera = cam
        cam.location = center + Vector((size * 1.1, -size * 1.1, size * 0.9))
        cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = preview
        bpy.ops.render.render(write_still=True)
        print(f"[isolate] preview {preview}")


def main():
    argv = sys.argv[sys.argv.index("--") + 1:]
    isolate(argv[0], argv[1], argv[2], argv[3] if len(argv) > 3 else None)


main()
