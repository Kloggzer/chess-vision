"""Top-down Schachbrett-Renderer (läuft IN Blender).

Aufruf:
    blender --background "synth_assets/Chess Scene.blend" --python synth/render_chessboard.py \
            -- --out <pfad> --n 200 --seed 42 --res 1024 [--fens pfad] [--pieces pfad]

Pro Sample: Stellung aus FEN aufbauen, top-down-Kamera (≈senkrecht + Jitter), Licht/Material
randomisieren, rendern -> out/<i>.png, und **Labels per Projektion** (bekannte 3D-Brettecken ->
Pixel) + FEN -> out/<i>.json. Ecken-Reihenfolge IMMER [a8, h8, h1, a1] (per Konstruktion korrekt).

Diese Datei nutzt NUR Blenders eingebautes bpy/Python (kein numpy/python-chess) — FEN-Placement
wird simpel selbst geparst.
"""
import json
import math
import random
import sys
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

from render_args import parse_render_args

# --- Brett-Geometrie (aus der Szene gemessen): 48x48 zentriert am Ursprung, 6 Einheiten/Feld ---
CELL = 6.0
HALF = 24.0                 # Brettkante bei ±24
TEMPLATE_NAMES = {"P": "White Pawn", "N": "Knight", "B": "Bishop", "R": "LPRook",
                  "Q": "Queen", "K": "King"}
BOARD_KEEP = {"ChessBoard", "Chessboard Surround"}


def argv_after_dashes():
    return sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def square_center(fi, ri):
    """file-index a..h = 0..7 (Y-Achse), rank-index 1..8 = 0..7 (X-Achse) -> Weltkoordinate."""
    return (-21.0 + CELL * ri, -21.0 + CELL * fi)


BOARD_CORNERS_3D = {                       # äußere Brettecken (z=0), benannt nach Feld
    "a8": (HALF, -HALF), "h8": (HALF, HALF), "h1": (-HALF, HALF), "a1": (-HALF, -HALF),
}


def parse_fen_placement(fen):
    """FEN-Placement -> Liste (fi, ri, symbol). Großbuchstabe=weiß."""
    out = []
    for r_idx, row in enumerate(fen.split()[0].split("/")):   # r_idx 0 = Rang 8
        ri = (8 - r_idx) - 1                                   # 0..7
        fi = 0
        for ch in row:
            if ch.isdigit():
                fi += int(ch)
            else:
                out.append((fi, ri, ch))
                fi += 1
    return out


def make_wood_material(name, light, dark):
    """Prozedurales Holz: Wave-Textur (Maserung) -> ColorRamp (dunkel..hell) -> Principled Base Color."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.45
    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (3.0, 3.0, 3.0)
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = "BANDS"
    wave.inputs["Scale"].default_value = 3.0
    wave.inputs["Distortion"].default_value = 9.0
    wave.inputs["Detail"].default_value = 2.0
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (dark[0], dark[1], dark[2], 1.0)
    ramp.color_ramp.elements[1].color = (light[0], light[1], light[2], 1.0)
    nt.links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], wave.inputs["Vector"])
    nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def make_board_material(light, dark):
    """Holz-Schachbrett: 8×8-Checker zwischen hellem und dunklem Holzton (Generated-Koordinaten)."""
    mat = bpy.data.materials.new("WoodBoard")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.4
    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (8.0, 8.0, 8.0)
    checker = nt.nodes.new("ShaderNodeTexChecker")
    checker.inputs["Scale"].default_value = 1.0
    checker.inputs["Color1"].default_value = (light[0], light[1], light[2], 1.0)
    checker.inputs["Color2"].default_value = (dark[0], dark[1], dark[2], 1.0)
    nt.links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], checker.inputs["Vector"])
    nt.links.new(checker.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def style_board():
    """Brettfläche -> Holz-Checker, Rahmen -> dunkles Holz; beides glätten."""
    board_mat = make_board_material((0.46, 0.31, 0.17), (0.20, 0.12, 0.06))   # dunkleres Holz (wie Figuren)
    surround_mat = make_wood_material("WoodSurround", (0.40, 0.26, 0.14), (0.22, 0.13, 0.06))
    for name, mat, subsurf in (("ChessBoard", board_mat, False), ("Chessboard Surround", surround_mat, False)):
        o = bpy.data.objects.get(name)
        if o is None or o.type != "MESH":
            continue
        o.data.materials.clear()
        o.data.materials.append(mat)
        for p in o.data.polygons:
            p.use_smooth = True
        if subsurf:
            m = o.modifiers.new("subsurf", "SUBSURF")
            m.levels = 1
            m.render_levels = 2


# Ziel-Höhen je Typ in Zell-Einheiten (6/Feld), aus dem Staunton-Set gemessen — gescannte Figuren
# werden darauf skaliert, damit Proportionen passen (separat gescannte Figuren haben beliebige Größe).
TARGET_HEIGHT = {"P": 4.6, "N": 5.1, "B": 7.8, "R": 4.6, "Q": 7.75, "K": 8.8}


def _find_scan(pdir, names):
    if pdir is None:
        return None
    for n in names:
        p = pdir / f"{n}.obj"
        if p.exists():
            return p
    return None


def _scanned_material(png, darken=1.0):
    img = bpy.data.images.load(str(png))
    mat = bpy.data.materials.new("scan"); mat.use_nodes = True
    nt = mat.node_tree; bsdf = nt.nodes.get("Principled BSDF")
    tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = img
    if darken < 0.999:
        try:
            mix = nt.nodes.new("ShaderNodeMixRGB"); mix.blend_type = "MULTIPLY"
            mix.inputs["Fac"].default_value = 1.0
            mix.inputs["Color2"].default_value = (darken, darken * 0.9, darken * 0.8, 1.0)
            nt.links.new(tx.outputs["Color"], mix.inputs["Color1"])
            nt.links.new(mix.outputs["Color"], bsdf.inputs["Base Color"])
            return mat
        except Exception:
            pass
    nt.links.new(tx.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def _load_scanned_mesh(obj_path, target_h):
    before = set(bpy.data.objects)
    bpy.ops.wm.obj_import(filepath=str(obj_path))
    imp = [o for o in bpy.data.objects if o not in before][0]
    m = imp.data
    s = target_h / (imp.dimensions.z or 1.0)
    co = [0.0] * (len(m.vertices) * 3)
    m.vertices.foreach_get("co", co)
    m.vertices.foreach_set("co", [c * s for c in co])
    m.update()
    bpy.data.objects.remove(imp, do_unlink=True)
    for p in m.polygons:
        p.use_smooth = True
    return m


def build_templates(pieces_dir=None):
    """Pro Figurentyp je eine helle + dunkle Mesh-Vorlage + Basis-Z. Mit `pieces_dir`: für jeden Typ,
    der dort als Scan vorliegt (`wP.obj`/`bP.obj`/`P.obj` + gleichnamige `.png`), die GESCANNTE Figur
    verwenden (mit echter Textur, auf Ziel-Höhe skaliert); sonst die prozeduralen Staunton-Vorlagen."""
    pdir = Path(pieces_dir) if pieces_dir else None
    white_mat = make_wood_material("WoodWhite", (0.80, 0.64, 0.42), (0.62, 0.46, 0.27))
    black_mat = make_wood_material("WoodBlack", (0.17, 0.10, 0.055), (0.05, 0.027, 0.013))
    templates, base_z = {}, {}
    for t, name in TEMPLATE_NAMES.items():
        scan_w = _find_scan(pdir, [f"w{t}", t])
        scan_b = _find_scan(pdir, [f"b{t}", t])
        if scan_w:                                   # Typ ist gescannt -> beide Farben aus Scans
            base_z[t] = 0.0
            mw = _load_scanned_mesh(scan_w, TARGET_HEIGHT[t])
            mw.materials.clear(); mw.materials.append(_scanned_material(scan_w.with_suffix(".png")))
            templates[("w", t)] = mw
            if scan_b and scan_b != scan_w:
                mb = _load_scanned_mesh(scan_b, TARGET_HEIGHT[t])
                mb.materials.clear(); mb.materials.append(_scanned_material(scan_b.with_suffix(".png")))
            else:                                    # nur ein Scan -> für Schwarz dunkel tinten
                mb = _load_scanned_mesh(scan_w, TARGET_HEIGHT[t])
                mb.materials.clear(); mb.materials.append(_scanned_material(scan_w.with_suffix(".png"), 0.2))
            templates[("b", t)] = mb
        else:                                        # prozedurale Staunton-Vorlage aus der .blend
            src = bpy.data.objects[name]
            base_z[t] = float(src.location.z)
            for color, mat in (("w", white_mat), ("b", black_mat)):
                m = src.data.copy(); m.materials.clear(); m.materials.append(mat)
                for p in m.polygons:
                    p.use_smooth = True
                templates[(color, t)] = m
    for o in list(bpy.data.objects):                 # original platzierte Figuren weg
        if o.type == "MESH" and o.name not in BOARD_KEEP:
            bpy.data.objects.remove(o, do_unlink=True)
    return templates, base_z


def setup_camera():
    cam = bpy.data.objects.get("Camera")
    if cam is None:
        cam_data = bpy.data.cameras.new("Camera")
        cam = bpy.data.objects.new("Camera", cam_data)
        bpy.context.scene.collection.objects.link(cam)
    cam.data.lens = 50.0
    cam.data.sensor_width = 36.0
    cam.data.clip_start = 1.0
    cam.data.clip_end = 10000.0        # Kamera ist ~150 über dem Brett -> Default 100 würde clippen
    bpy.context.scene.camera = cam
    return cam


def place_camera(cam, rng):
    """Near-top-down: hoch über der Mitte, kleiner horizontaler Offset (-> leichte Obliqueness)."""
    H = 150.0 + rng.uniform(-10, 10)           # Höhe; lens50/sensor36 -> Brett füllt ~Frame
    off = rng.uniform(0.04, 0.10) * H          # Offset/H ~ tan(Neigung) -> Obliqueness ~0.05-0.10
    ang = rng.uniform(0, 2 * math.pi)
    cam.location = Vector((off * math.cos(ang), off * math.sin(ang), H))
    direction = Vector((0, 0, 0)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def randomize_lights(rng):
    for o in bpy.data.objects:
        if o.type == "LIGHT":
            o.data.energy *= rng.uniform(0.6, 1.5)
            if o.data.type == "SUN":
                o.rotation_euler = (rng.uniform(0, 0.5), rng.uniform(0, 0.5), rng.uniform(0, 2 * math.pi))
    world = bpy.context.scene.world
    if world and world.use_nodes:
        bg = world.node_tree.nodes.get("Background")
        if bg:
            bg.inputs[1].default_value = rng.uniform(0.3, 1.2)   # ambient strength


def place_from_fen(fen, templates, base_z, rng):
    created = []
    for fi, ri, sym in parse_fen_placement(fen):
        color = "w" if sym.isupper() else "b"
        t = sym.upper()
        mesh = templates.get((color, t))
        if mesh is None:
            continue
        x, y = square_center(fi, ri)
        o = bpy.data.objects.new(f"pc_{fi}{ri}", mesh)
        o.location = (x + rng.uniform(-0.4, 0.4), y + rng.uniform(-0.4, 0.4), base_z[t])
        o.rotation_euler = (0, 0, rng.uniform(0, 2 * math.pi))
        sub = o.modifiers.new("subsurf", "SUBSURF")   # rundet die kantige Low-Poly-Geometrie
        sub.levels = 1
        sub.render_levels = 2
        bpy.context.scene.collection.objects.link(o)
        created.append(o)
    return created


def corners_px(scene, cam):
    out = []
    for sq in ("a8", "h8", "h1", "a1"):
        x, y = BOARD_CORNERS_3D[sq]
        co = world_to_camera_view(scene, cam, Vector((x, y, 0.0)))
        out.append([co.x * scene.render.resolution_x, (1.0 - co.y) * scene.render.resolution_y])
    return out


def set_engine_fast():
    scene = bpy.context.scene
    for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = eng
            return eng
        except Exception:
            continue
    return scene.render.engine    # fallback (CYCLES)


def main():
    args_after = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ra = parse_render_args(args_after)
    out_dir = ra.out
    n = ra.n
    seed = ra.seed
    fens_file = ra.fens
    pieces_dir = str(ra.pieces) if ra.pieces else None

    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"[synth] out={out_dir}")
    print(f"[synth] n={n}  seed={seed}  res={ra.res}")
    print(f"[synth] fens={fens_file or 'none'}")
    print(f"[synth] pieces={pieces_dir or 'prozedural'}")

    if fens_file and fens_file.exists():
        fens = [line.strip() for line in fens_file.read_text().splitlines() if line.strip()]
    else:
        fens = ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"]   # Fallback: Grundstellung
    rng = random.Random(seed)

    scene = bpy.context.scene
    eng = set_engine_fast()
    scene.render.resolution_x = scene.render.resolution_y = ra.res
    scene.render.image_settings.file_format = "PNG"
    templates, base_z = build_templates(pieces_dir)
    style_board()
    cam = setup_camera()
    print(f"[synth] engine={eng}, fens={len(fens)}")

    for i in range(n):
        fen = fens[i % len(fens)] if fens else "8/8/8/8/8/8/8/8"
        place_camera(cam, rng)
        randomize_lights(rng)
        pieces = place_from_fen(fen, templates, base_z, rng)

        scene.render.filepath = str((out_dir / f"{i:06d}.png").resolve())
        bpy.ops.render.render(write_still=True)
        corners = corners_px(scene, cam)
        (out_dir / f"{i:06d}.json").write_text(json.dumps({"fen": fen, "corners": corners}))
        in_frame = all(0 <= c[0] <= scene.render.resolution_x and 0 <= c[1] <= scene.render.resolution_y for c in corners)
        print(f"[synth] {i+1}/{n} pieces={len(pieces)} corners_in_frame={in_frame}")

        for o in pieces:                  # aufräumen für nächstes Sample
            bpy.data.objects.remove(o, do_unlink=True)
    print("[synth] DONE")


main()
