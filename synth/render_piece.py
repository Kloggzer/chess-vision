"""Eine vorbereitete Figur hübsch rendern (läuft IN Blender).

    blender --background --python render_piece.py -- <obj> <out.png> [textur.png|-]

Orthografische 3/4-Ansicht, aufrecht (Datei ist Z-up aus isolate_piece), zwei Sonnen
(Key+Fill) für gleichmäßiges Licht. '-' oder fehlende Textur = Clay-Render (Geometrie pur).
"""
import math
import sys

import bpy
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
obj_path, out_png = argv[0], argv[1]
tex = argv[2] if len(argv) > 2 and argv[2] != "-" else None

bpy.ops.wm.read_factory_settings(use_empty=True)
# up_axis='Z': Datei-Koordinaten unverändert übernehmen (isolate exportiert Z-up).
bpy.ops.wm.obj_import(filepath=obj_path, up_axis="Z", forward_axis="Y")
obj = max([o for o in bpy.context.scene.objects if o.type == "MESH"],
          key=lambda o: len(o.data.vertices))
for o in bpy.context.scene.objects:
    o.select_set(o == obj)
bpy.context.view_layer.objects.active = obj
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = obj.data
for p in me.polygons:
    p.use_smooth = True

mat = bpy.data.materials.new("m"); mat.use_nodes = True
bsdf = mat.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Roughness"].default_value = 0.55
if tex:
    img = bpy.data.images.load(tex)
    tx = mat.node_tree.nodes.new("ShaderNodeTexImage"); tx.image = img
    mat.node_tree.links.new(tx.outputs["Color"], bsdf.inputs["Base Color"])
else:
    bsdf.inputs["Base Color"].default_value = (0.75, 0.75, 0.78, 1.0)   # Clay
me.materials.clear(); me.materials.append(mat)

P = np.array([list(v.co) for v in me.vertices])
mn, mx = P.min(0), P.max(0)
center = Vector(((mn + mx) / 2))
size = float((mx - mn).max()) or 1.0

sc = bpy.context.scene
for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try:
        sc.render.engine = eng; break
    except Exception:
        pass
sc.render.resolution_x = sc.render.resolution_y = 800
sc.render.film_transparent = False
world = bpy.data.worlds.new("w"); sc.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.09, 0.09, 0.11, 1.0)

def sun(name, rot, energy):
    lo = bpy.data.objects.new(name, bpy.data.lights.new(name, "SUN"))
    sc.collection.objects.link(lo)
    lo.rotation_euler = rot
    lo.data.energy = energy

sun("key", (math.radians(45), math.radians(-15), math.radians(30)), 4.0)
sun("fill", (math.radians(60), math.radians(20), math.radians(-140)), 1.5)

cam = bpy.data.objects.new("C", bpy.data.cameras.new("C")); sc.collection.objects.link(cam)
sc.camera = cam
cam.data.type = "ORTHO"
cam.data.ortho_scale = size * 1.25
cam.data.clip_end = size * 100
yaw = math.radians(30)                       # 3/4-Ansicht
d = size * 3.0
cam.location = center + Vector((d * math.sin(yaw), -d * math.cos(yaw), 0.0))
cam.rotation_euler = (math.radians(90), 0.0, yaw)
sc.render.filepath = out_png
bpy.ops.render.render(write_still=True)
print(f"[render] {out_png}")
