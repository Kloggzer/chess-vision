"""Top-down Schachbrett-Renderer v2 — Blender/EEVEE mit echter Brett-Textur.

Gegenüber render_chessboard.py NUR der Brett-Unterbau geändert:
- Statt prozeduralem Holz-Checker kann eine rektifizierte Foto-Textur (board_texture.py)
  als Albedo auf den Brett-Planar (ChessBoard-Objekt) gelegt werden.
- Ohne --board-texture fällt er auf das alte prozedurale Holz-Checker zurück
  (identisches Verhalten zu render_chessboard.py).
- Figuren-Platzierung, Kamera, Licht, Label-Projektion, Ecken-Reihenfolge [a8,h8,h1,a1]
  und alles andere sind IDENTISCH zu render_chessboard.py.

Aufruf:
    blender --background "synth_assets/Chess Scene.blend" --python synth/render_board_v2.py \
            -- --out <pfad> --n 200 --seed 42 --res 1024 \
            [--fens pfad] [--pieces pfad] [--board-texture synth_pieces/board_texture.png]
"""

import json
import math
import random
import sys
from pathlib import Path

# Ensure the synth/ directory is on sys.path so `render_args` is importable
# both from the Blender CLI and via `chesslab synth render`.
_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

import bpy  # noqa: E402
from bpy_extras.object_utils import world_to_camera_view  # noqa: E402
from mathutils import Vector  # noqa: E402

from render_args import parse_render_args  # noqa: E402

# --- Brett-Geometrie (identisch zu render_chessboard.py) ---
CELL = 6.0
HALF = 24.0
TEMPLATE_NAMES = {"P": "White Pawn", "N": "Knight", "B": "Bishop", "R": "LPRook",
                  "Q": "Queen", "K": "King"}
BOARD_KEEP = {"ChessBoard", "Chessboard Surround"}

BOARD_CORNERS_3D = {
    "a8": (HALF, -HALF), "h8": (HALF, HALF), "h1": (-HALF, HALF), "a1": (-HALF, -HALF),
}

# Warm-Tint für die Brett-Foto-Textur: der dunkle Brett-Lack fotografiert sich neutral-grau.
# COLOR-Blend drückt dem Bild die HUE+Sättigung dieses Holztons auf (Helligkeit bleibt) →
# aus neutralem Grau wird echtes Braun. BOARD_WARM_FAC 0=aus, 1=voll durchbraun.
BOARD_WARM_TINT = (0.45, 0.29, 0.14)  # Holz-Braun (Ziel-Hue)
BOARD_WARM_FAC = 0.55
# Dunkle Felder haben niedrige Albedo + Glanz → sie spiegeln das (kühle) Umgebungslicht
# und wirken grau. Höhere Roughness macht sie matt → die (warme) Grundfarbe dominiert.
BOARD_ROUGHNESS = 0.85
PIECE_ROUGHNESS = 0.7   # Figuren matt halten, damit ihre echte Holzfarbe zeigt (kein Grau-Glanz)


def argv_after_dashes():
    return sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def square_center(fi, ri):
    """file-index a..h = 0..7 (Y-Achse), rank-index 1..8 = 0..7 (X-Achse) -> Weltkoordinate."""
    return (-21.0 + CELL * ri, -21.0 + CELL * fi)


def parse_fen_placement(fen):
    """FEN-Placement -> Liste (fi, ri, symbol). Großbuchstabe=weiß."""
    out = []
    for r_idx, row in enumerate(fen.split()[0].split("/")):
        ri = (8 - r_idx) - 1
        fi = 0
        for ch in row:
            if ch.isdigit():
                fi += int(ch)
            else:
                out.append((fi, ri, ch))
                fi += 1
    return out


# --- Prozedurale Holz-Materialien (Fallback, identisch zu render_chessboard.py) ---

def make_wood_material(name, light, dark):
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
    """Prozedurales Holz-Schachbrett (Checker)."""
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


def make_textured_board_material(texture_path):
    """Brett-Foto-Textur via Image-Texture-Node + UV-Map auf dem ChessBoard-Mesh.

    Die UVs werden aus der Geometrie abgeleitet: Objekt-X (Rank 1→8) → UV.Y (0→1),
    Objekt-Y (File a→h) → UV.X (0→1). Die rektifizierte Textur hat a8 oben links,
    a1 unten links — passt damit exakt auf das Brett (Board-Corners a8/h8/h1/a1
    entsprechen den Bild-Ecken der Textur).
    """
    board_obj = bpy.data.objects.get("ChessBoard")
    if board_obj is None or board_obj.type != "MESH":
        print("[v2] WARN: ChessBoard object not found, falling back to procedural")
        return make_board_material((0.46, 0.31, 0.17), (0.20, 0.12, 0.06))

    img = bpy.data.images.load(str(texture_path))

    # UV-Map aus Objekt-Koordinaten ableiten
    mesh = board_obj.data
    if not mesh.uv_layers:
        mesh.uv_layers.new(name="UVMap")
    uv_layer = mesh.uv_layers.active
    for loop in mesh.loops:
        v = mesh.vertices[loop.vertex_index]
        # Object space: X = rank (1..8), Y = file (a..h)
        u = (v.co.y + HALF) / (2.0 * HALF)   # file a→h  →  0→1
        v_val = (v.co.x + HALF) / (2.0 * HALF)  # rank 1→8  →  0→1
        uv_layer.data[loop.index].uv = (u, v_val)

    mat = bpy.data.materials.new("BoardTexture")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = BOARD_ROUGHNESS
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.2
    elif "Specular" in bsdf.inputs:
        bsdf.inputs["Specular"].default_value = 0.2
    tx = nt.nodes.new("ShaderNodeTexImage")
    tx.image = img
    # Warm-Tint: der dunkle Brett-Lack fotografiert sich neutral-grau -> per MULTIPLY
    # mit einem warmen Ton Richtung Braun ziehen (dunkle Felder werden wärmer, helle
    # bleiben nahezu unverändert). BOARD_WARM_TINT/BOARD_WARM_FAC oben anpassbar.
    warm = nt.nodes.new("ShaderNodeMixRGB")
    warm.blend_type = "COLOR"
    warm.inputs["Fac"].default_value = BOARD_WARM_FAC
    warm.inputs["Color2"].default_value = (*BOARD_WARM_TINT, 1.0)
    nt.links.new(tx.outputs["Color"], warm.inputs["Color1"])
    nt.links.new(warm.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def style_board_v2(board_texture_path=None):
    """Brett-Material auftragen: Foto-Textur wenn vorhanden, sonst prozedurales Holz."""
    if board_texture_path and Path(board_texture_path).exists():
        board_mat = make_textured_board_material(board_texture_path)
        print(f"[v2] board texture: {board_texture_path}")
    else:
        if board_texture_path:
            print(f"[v2] board texture not found: {board_texture_path}, falling back to procedural")
        else:
            print("[v2] no --board-texture, using procedural wood checker")
        board_mat = make_board_material((0.46, 0.31, 0.17), (0.20, 0.12, 0.06))

    surround_mat = make_wood_material("WoodSurround", (0.40, 0.26, 0.14), (0.22, 0.13, 0.06))
    for name, mat in (("ChessBoard", board_mat), ("Chessboard Surround", surround_mat)):
        o = bpy.data.objects.get(name)
        if o is None or o.type != "MESH":
            continue
        o.data.materials.clear()
        o.data.materials.append(mat)
        for p in o.data.polygons:
            p.use_smooth = True


# --- Figuren, Kamera, Licht, Rendern (identisch zu render_chessboard.py) ---

# Skalierung in ECHTEN Millimetern. Feld = 35 mm = CELL Einheiten.
SQUARE_MM = 35.0
MM_PER_UNIT = SQUARE_MM / CELL  # 5.833 mm pro Brett-Einheit

# Reale Basis-DURCHMESSER (mm) je Typ — für eine Top-Down-Kamera ist die Grundfläche
# das entscheidende Maß. Gemessen: Dame-Basis = 27 mm. Andere via Staunton-Verhältnissen
# (Schätzung, überschreibbar). Wird nur genutzt, wenn kein scale_mm_per_unit im Report steht.
TARGET_BASE_MM = {"P": 20.0, "N": 23.5, "B": 24.0, "R": 23.0, "Q": 27.0, "K": 28.0}

# Fallback-Höhen (Brett-Einheiten), nur wenn weder Report-Maßstab noch Basis-Messung greifen.
TARGET_HEIGHT = {"P": 4.6, "N": 5.1, "B": 7.8, "R": 4.6, "Q": 7.75, "K": 8.8}


def _report_scale_mm_per_unit(obj_path):
    """scale_mm_per_unit aus <name>_report.json lesen (physikalisch korrekter Maßstab), sonst None."""
    rp = obj_path.with_name(f"{obj_path.stem}_report.json")
    if not rp.exists():
        return None
    try:
        import json
        v = json.loads(rp.read_text(encoding="utf-8")).get("scale_mm_per_unit")
        return float(v) if v else None
    except Exception:
        return None


def _mesh_base_diameter_units(mesh):
    """Basis-Durchmesser (Brett-Einheiten) = 2×95.-Perzentil-Radius der untersten Vertex-Schicht."""
    import math
    zs = [v.co.z for v in mesh.vertices]
    if not zs:
        return 1.0
    zmin, zmax = min(zs), max(zs)
    cut = zmin + 0.06 * max(zmax - zmin, 1e-6)
    ring = [(v.co.x, v.co.y) for v in mesh.vertices if v.co.z <= cut]
    if len(ring) < 8:
        ring = [(v.co.x, v.co.y) for v in mesh.vertices]
    cx = sum(p[0] for p in ring) / len(ring)
    cy = sum(p[1] for p in ring) / len(ring)
    radii = sorted(math.hypot(p[0] - cx, p[1] - cy) for p in ring)
    r95 = radii[min(len(radii) - 1, int(0.95 * len(radii)))]
    return max(2.0 * r95, 1e-6)


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
    # Matt + wenig Specular: sonst spiegeln die glänzenden Figuren das kühle Umgebungslicht
    # und wirken lavendel-grau statt in ihrer echten Holzfarbe (gleiches Problem wie das Brett).
    if bsdf is not None:
        bsdf.inputs["Roughness"].default_value = PIECE_ROUGHNESS
        if "Specular IOR Level" in bsdf.inputs:
            bsdf.inputs["Specular IOR Level"].default_value = 0.2
        elif "Specular" in bsdf.inputs:
            bsdf.inputs["Specular"].default_value = 0.2
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


def _load_scanned_mesh(obj_path, type_letter):
    before = set(bpy.data.objects)
    bpy.ops.wm.obj_import(filepath=str(obj_path))
    imp = [o for o in bpy.data.objects if o not in before][0]
    m = imp.data
    # Maßstab bestimmen (Priorität: physikalischer Report-Maßstab > reale Basis-mm > Höhe-Fallback)
    mm_per_unit_mesh = _report_scale_mm_per_unit(obj_path)
    if mm_per_unit_mesh:
        # 1 Mesh-Einheit = mm_per_unit_mesh mm; Brett-Einheit = MM_PER_UNIT mm
        s = mm_per_unit_mesh / MM_PER_UNIT
    elif type_letter in TARGET_BASE_MM:
        base_units = _mesh_base_diameter_units(m)
        s = (TARGET_BASE_MM[type_letter] / MM_PER_UNIT) / base_units
    else:
        s = TARGET_HEIGHT.get(type_letter, 5.0) / (imp.dimensions.z or 1.0)
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
        if scan_w:
            base_z[t] = 0.0
            mw = _load_scanned_mesh(scan_w, t)
            mw.materials.clear(); mw.materials.append(_scanned_material(scan_w.with_suffix(".png")))
            templates[("w", t)] = mw
            if scan_b and scan_b != scan_w:
                mb = _load_scanned_mesh(scan_b, t)
                mb.materials.clear(); mb.materials.append(_scanned_material(scan_b.with_suffix(".png")))
            else:
                mb = _load_scanned_mesh(scan_w, t)
                mb.materials.clear(); mb.materials.append(_scanned_material(scan_w.with_suffix(".png"), 0.2))
            templates[("b", t)] = mb
        else:
            src = bpy.data.objects[name]
            base_z[t] = float(src.location.z)
            for color, mat in (("w", white_mat), ("b", black_mat)):
                m = src.data.copy(); m.materials.clear(); m.materials.append(mat)
                for p in m.polygons:
                    p.use_smooth = True
                templates[(color, t)] = m
    for o in list(bpy.data.objects):
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
    cam.data.clip_end = 10000.0
    bpy.context.scene.camera = cam
    return cam


def place_camera(cam, rng):
    H = 150.0 + rng.uniform(-10, 10)
    off = rng.uniform(0.04, 0.10) * H
    ang = rng.uniform(0, 2 * math.pi)
    cam.location = Vector((off * math.cos(ang), off * math.sin(ang), H))
    direction = Vector((0, 0, 0)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def randomize_lights(rng):
    for o in bpy.data.objects:
        if o.type == "LIGHT":
            o.data.energy *= rng.uniform(0.6, 1.5)
            # Warm-biased Lichtfarbe (Innenraum-Licht ist warm) – sonst wirken helle
            # Figuren kühl/lavendel. Bleibt randomisiert (Domain-Randomization).
            o.data.color = (1.0, rng.uniform(0.85, 0.98), rng.uniform(0.7, 0.9))
            if o.data.type == "SUN":
                o.rotation_euler = (rng.uniform(0, 0.5), rng.uniform(0, 0.5), rng.uniform(0, 2 * math.pi))
    world = bpy.context.scene.world
    if world and world.use_nodes:
        bg = world.node_tree.nodes.get("Background")
        if bg:
            bg.inputs[1].default_value = rng.uniform(0.3, 1.2)
            # World-Ambient ebenfalls warm-biased statt neutral-kühl.
            bg.inputs[0].default_value = (1.0, rng.uniform(0.82, 0.95), rng.uniform(0.62, 0.82), 1.0)


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
        sub = o.modifiers.new("subsurf", "SUBSURF")
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
    return scene.render.engine


def main():
    args_after = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ra = parse_render_args(args_after)
    out_dir = ra.out
    n = ra.n
    seed = ra.seed
    fens_file = ra.fens
    pieces_dir = str(ra.pieces) if ra.pieces else None
    board_tex = str(ra.board_texture) if ra.board_texture else None

    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"[v2] out={out_dir}")
    print(f"[v2] n={n}  seed={seed}  res={ra.res}")
    print(f"[v2] fens={fens_file or 'none'}")
    print(f"[v2] pieces={pieces_dir or 'prozedural'}")
    print(f"[v2] board-texture={board_tex or 'procedural'}")

    if fens_file and fens_file.exists():
        fens = [line.strip() for line in fens_file.read_text().splitlines() if line.strip()]
    else:
        fens = ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"]
    rng = random.Random(seed)

    scene = bpy.context.scene
    eng = set_engine_fast()
    scene.render.resolution_x = scene.render.resolution_y = ra.res
    scene.render.image_settings.file_format = "PNG"
    # View-Transform auf "Standard": AgX/Filmic entsättigt die warme Holz-Foto-Textur
    # zu Grau. "Standard" (reines sRGB) ist zudem treuer zur echten Webcam-JPEG-Farbe.
    try:
        scene.view_settings.view_transform = "Standard"
    except (AttributeError, TypeError) as e:  # pragma: no cover - Blender-Version
        print(f"[v2] view_transform unchanged ({e})")
    templates, base_z = build_templates(pieces_dir)
    style_board_v2(board_tex)
    cam = setup_camera()
    print(f"[v2] engine={eng}, fens={len(fens)}")

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
        print(f"[v2] {i+1}/{n} pieces={len(pieces)} corners_in_frame={in_frame}")

        for o in pieces:
            bpy.data.objects.remove(o, do_unlink=True)
    print("[v2] DONE")


main()
