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
# War 0.55, als die Textur noch neutral-grau war. Die aktuelle Textur ist ein ECHTES Brettfoto
# (bereits natürlich gefärbt) → ein starker Braun-Tint übergilbt sie (helle Felder zu gelb).
# Daher fast aus; die Textur trägt die Farbe selbst.
BOARD_WARM_FAC = 0.0
# Dunkle Felder haben niedrige Albedo + Glanz → sie spiegeln das (kühle) Umgebungslicht
# und wirken grau. Höhere Roughness macht sie matt → die (warme) Grundfarbe dominiert.
BOARD_ROUGHNESS = 0.85
# Board-Sättigung: das echte Brettfoto ist warm-gelblich → leicht entsättigen zieht das Gelb raus.
BOARD_SATURATION = 0.72
# Figuren leicht glänzend (echtes lackiertes Holz fängt Glanzlichter, die die 3D-Form verraten →
# hilft, N/B/R von oben zu unterscheiden). Frühere 0.7/Specular 0.2 waren ZU matt (formarm).
PIECE_ROUGHNESS = 0.45
PIECE_SPECULAR = 0.4
# Globaler Figuren-Skalierungsfaktor (auf die Basis-mm-Skalierung obendrauf). Hebel, um die
# scheinbare Figurengröße/Höhe im Crop an die echten Kamera-Crops anzugleichen (reale Figuren
# füllen den Crop stärker). 1.0 = wie gemessen; per --piece-scale überschrieben.
PIECE_SCALE = 1.0
# Weiß-Figuren-Korrektur: Scan-Textur ist zu orange/dunkel vs. reale blass-cremige Figuren.
# Sättigung runter (orange raus) + Value hoch (heller). Nur auf weiße Figuren angewandt.
PIECE_WHITE_SAT = 0.40
PIECE_WHITE_VAL = 1.55


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


# Spielfeld-Halbanteil der VOLL-Brett-Textur (inkl. Koordinaten-Ring + Rahmen), gemessen:
# das 8x8-Spielfeld belegt zentriert ±BOARD_PLAY_HALF_FRAC der Textur (0.5 = ganze Textur =
# Spielfeld). Der Rest sind Koordinaten (A–H, 1–8) + Rahmen. Bestimmt, wie groß die Plane
# sein muss, damit das 8x8 exakt auf ±HALF (die echten Feld-Weltkoordinaten) fällt.
BOARD_PLAY_HALF_FRAC = 0.419


def make_textured_board_material(texture_path):
    """Principled-BSDF mit Brett-Foto-Textur (Image-Node + Warm-Tint). NUR der Shader —
    die UV-Map setzt das aufrufende Mesh (siehe make_board_plane)."""
    img = bpy.data.images.load(str(texture_path))
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
    # Warm-Tint: der dunkle Brett-Lack fotografiert sich neutral-grau -> per COLOR-Blend
    # mit einem warmen Ton Richtung Braun ziehen. BOARD_WARM_TINT/BOARD_WARM_FAC oben.
    warm = nt.nodes.new("ShaderNodeMixRGB")
    warm.blend_type = "COLOR"
    warm.inputs["Fac"].default_value = BOARD_WARM_FAC
    warm.inputs["Color2"].default_value = (*BOARD_WARM_TINT, 1.0)
    nt.links.new(tx.outputs["Color"], warm.inputs["Color1"])
    # Board leicht entsättigen: das echte Brettfoto ist warm-gelblich; Sättigung runter zieht
    # das Gelb raus, ohne die Helligkeit/den Kontrast der Felder zu ändern.
    desat = nt.nodes.new("ShaderNodeHueSaturation")
    desat.inputs["Saturation"].default_value = BOARD_SATURATION
    nt.links.new(warm.outputs["Color"], desat.inputs["Color"])
    nt.links.new(desat.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def make_board_plane(texture_path):
    """Ersetzt das alte ChessBoard/Surround-Modell durch EINE Plane mit der Voll-Brett-
    Textur (inkl. Koordinaten-Ring). Die Plane ist so groß, dass das 8x8-Spielfeld der
    Textur exakt auf ±HALF (die echten Feld-Weltkoordinaten a8/h8/h1/a1) fällt — Figuren
    und Label-Projektion bleiben damit unverändert korrekt.

    Orientierung wie zuvor: Welt-Y (File a→h) → U, Welt-X (Rank 1→8) → V; die rektifizierte
    Textur hat a8 oben links. Rest der Textur (Ring/Rahmen) liegt außerhalb von ±HALF.
    """
    old = bpy.data.objects.get("ChessBoard")
    z = float(old.location.z) if old is not None else 0.0
    for nm in ("ChessBoard", "Chessboard Surround"):
        o = bpy.data.objects.get(nm)
        if o is not None:
            bpy.data.objects.remove(o, do_unlink=True)

    # Plane-Halbkante: Textur [0,1] deckt ±P ab; das Spielfeld [0.5-frac, 0.5+frac] soll ±HALF sein.
    P = HALF / (2.0 * BOARD_PLAY_HALF_FRAC)
    mesh = bpy.data.meshes.new("BoardPlane")
    mesh.from_pydata([(-P, -P, 0.0), (P, -P, 0.0), (P, P, 0.0), (-P, P, 0.0)], [], [(0, 1, 2, 3)])
    mesh.update()
    uvl = mesh.uv_layers.new(name="UVMap")
    for loop in mesh.loops:
        co = mesh.vertices[loop.vertex_index].co
        uvl.data[loop.index].uv = ((co.y + P) / (2.0 * P), (co.x + P) / (2.0 * P))
    obj = bpy.data.objects.new("BoardPlane", mesh)
    obj.location.z = z
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(make_textured_board_material(texture_path))
    for p in mesh.polygons:
        p.use_smooth = True
    print(f"[v2] board plane: P=±{P:.2f} (play=±{HALF}), z={z:.3f}")
    return obj


def style_board_v2(board_texture_path=None):
    """Brett aufbauen: Voll-Brett-Textur auf einer Plane (altes Modell entfernt) wenn
    vorhanden, sonst prozedurales Holz auf dem Original-ChessBoard-Modell."""
    if board_texture_path and Path(board_texture_path).exists():
        make_board_plane(board_texture_path)
        print(f"[v2] board texture (plane): {board_texture_path}")
        return

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
# Echte Kamera-Distanz zum Brett (Nutzer: Fotos bei 55 cm). Bestimmt die Perspektive: näher =
# stärkere Perspektive → hohe Figuren kippen/füllen den Crop wie bei der echten Kamera. Vorher
# stand die Cam bei ~150 Einheiten (~87 cm) = zu top-down.
CAM_DISTANCE_MM = 550.0

# Reale Basis-DURCHMESSER (mm) je Typ — für eine Top-Down-Kamera ist die Grundfläche
# das entscheidende Maß. ALLE vom Nutzer real gemessen (2026-07-05, Zelle 35 mm). Da der Scan
# das Seitenverhältnis erhält, ergibt die korrekte Basis-Skalierung automatisch die korrekte
# HÖHE → kein globaler Fudge nötig (--piece-scale bleibt 1.0). Nur genutzt, wenn kein
# scale_mm_per_unit im Report steht.
TARGET_BASE_MM = {"P": 20.0, "N": 23.0, "B": 23.0, "R": 23.0, "Q": 28.0, "K": 28.0}

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


def _variant_objs(pdir, canonical):
    """All prepared variant OBJs for a canonical piece (``wP``, ``bN``, …).

    New layout: ``<pdir>/<canonical>/<variant>.obj`` (one folder per piece, one
    file-set per variant).  Legacy flat fallback: ``<pdir>/<canonical>.obj`` and,
    for white, the old unprefixed ``<pdir>/<type>.obj``.
    """
    if pdir is None:
        return []
    d = pdir / canonical
    if d.is_dir():
        objs = sorted(d.glob("*.obj"))
        if objs:
            return objs
    flat = pdir / f"{canonical}.obj"
    if flat.exists():
        return [flat]
    if canonical.startswith("w"):
        legacy = pdir / f"{canonical[1:]}.obj"
        if legacy.exists():
            return [legacy]
    return []


def _scanned_material(png, darken=1.0, whiten=False):
    img = bpy.data.images.load(str(png))
    mat = bpy.data.materials.new("scan"); mat.use_nodes = True
    nt = mat.node_tree; bsdf = nt.nodes.get("Principled BSDF")
    # Leicht glänzend (Glanzlichter zeigen die Form). Warm-biased Licht (randomize_lights) hält
    # die Highlights warm statt lavendel-grau, daher ist mehr Specular hier unproblematisch.
    if bsdf is not None:
        bsdf.inputs["Roughness"].default_value = PIECE_ROUGHNESS
        if "Specular IOR Level" in bsdf.inputs:
            bsdf.inputs["Specular IOR Level"].default_value = PIECE_SPECULAR
        elif "Specular" in bsdf.inputs:
            bsdf.inputs["Specular"].default_value = PIECE_SPECULAR
    tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = img
    src = tx.outputs["Color"]
    # Weiße Figuren: die Scan-Textur ist zu orange/dunkel (Photogrammetrie unter warmem Licht),
    # die echten Figuren sind aber blass-cremig → entsättigen + aufhellen (nicht-destruktiv im Shader).
    if whiten:
        try:
            hsv = nt.nodes.new("ShaderNodeHueSaturation")
            hsv.inputs["Saturation"].default_value = PIECE_WHITE_SAT
            hsv.inputs["Value"].default_value = PIECE_WHITE_VAL
            nt.links.new(src, hsv.inputs["Color"])
            src = hsv.outputs["Color"]
        except Exception:
            pass
    if darken < 0.999:
        try:
            mix = nt.nodes.new("ShaderNodeMixRGB"); mix.blend_type = "MULTIPLY"
            mix.inputs["Fac"].default_value = 1.0
            mix.inputs["Color2"].default_value = (darken, darken * 0.9, darken * 0.8, 1.0)
            nt.links.new(src, mix.inputs["Color1"])
            src = mix.outputs["Color"]
        except Exception:
            pass
    nt.links.new(src, bsdf.inputs["Base Color"])
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
    s *= PIECE_SCALE   # globaler Angleich-Faktor (Crop-Füllung an reale Kamera)
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
    def _scanned_meshes(objs, t, color, darken):
        """One mesh datablock per variant OBJ, each with its own textured material.
        Ohne <variant>.png (Scan ohne Textur-Export): prozedurales Holz in der Zielfarbe
        statt Abbruch — die GEOMETRIE des Scans ist trotzdem wertvoll."""
        out = []
        for o in objs:
            m = _load_scanned_mesh(o, t)
            m.materials.clear()
            png = o.with_suffix(".png")
            if png.exists():
                m.materials.append(_scanned_material(png, darken, whiten=(color == "w")))
            else:
                print(f"[WARN] {o}: keine Textur ({png.name} fehlt) — prozedurales Holz")
                m.materials.append(white_mat if color == "w" else black_mat)
            out.append(m)
        return out

    templates, base_z = {}, {}
    procedural_types = set()  # Typen mit Low-Poly-Staunton-Fallback (brauchen Subsurf).
    for t, name in TEMPLATE_NAMES.items():
        w_objs = _variant_objs(pdir, f"w{t}")
        b_objs = _variant_objs(pdir, f"b{t}")
        if w_objs or b_objs:
            base_z[t] = 0.0
            # White: own scans if present, else the black scans (rare: black-only).
            templates[("w", t)] = _scanned_meshes(w_objs or b_objs, t, "w", 1.0)
            # Black: own scans if present, else the white scans recolored dark.
            templates[("b", t)] = (_scanned_meshes(b_objs, t, "b", 1.0) if b_objs
                                   else _scanned_meshes(w_objs, t, "b", 0.2))
        else:
            procedural_types.add(t)
            src = bpy.data.objects[name]
            base_z[t] = float(src.location.z)
            for color, mat in (("w", white_mat), ("b", black_mat)):
                m = src.data.copy(); m.materials.clear(); m.materials.append(mat)
                for p in m.polygons:
                    p.use_smooth = True
                templates[(color, t)] = [m]
    for o in list(bpy.data.objects):
        if o.type == "MESH" and o.name not in BOARD_KEEP:
            bpy.data.objects.remove(o, do_unlink=True)
    return templates, base_z, procedural_types


def setup_camera():
    cam = bpy.data.objects.get("Camera")
    if cam is None:
        cam_data = bpy.data.cameras.new("Camera")
        cam = bpy.data.objects.new("Camera", cam_data)
        bpy.context.scene.collection.objects.link(cam)
    # 28 mm @ 36 mm Sensor ≈ 65° Blickwinkel — passt zu einer echten Webcam und lässt das ganze
    # Brett bei 55 cm Distanz (auch schräg) ins Bild. Vorher 50 mm (~40°) = zu eng bei der Nähe.
    cam.data.lens = 28.0
    cam.data.sensor_width = 36.0
    cam.data.clip_start = 1.0
    cam.data.clip_end = 10000.0
    bpy.context.scene.camera = cam
    return cam


def place_camera(cam, rng, max_obliqueness=0.10):
    H = CAM_DISTANCE_MM / MM_PER_UNIT + rng.uniform(-6, 6)   # ~94 Einheiten = 55 cm
    # Obliqueness = horizontaler Offset / Höhe. Untergrenze 0.04 (nie perfekt senkrecht),
    # Obergrenze aus max_obliqueness — im gematchten Regime der echten ~0.06-Top-Down-Kamera.
    lo = min(0.04, max_obliqueness)
    off = rng.uniform(lo, max_obliqueness) * H
    ang = rng.uniform(0, 2 * math.pi)
    cam.location = Vector((off * math.cos(ang), off * math.sin(ang), H))
    direction = Vector((0, 0, 0)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


# Basis-Lichtenergie je Lampe, EINMAL aus der .blend gemerkt. Ohne diesen Anker würde
# `energy *= faktor` pro Frame kumulieren (Zufalls-Multiplikatoren mit Mittelwert >1) →
# über tausende Frames brennt die Szene exponentiell zu Weiß aus. Jeder Frame skaliert
# jetzt relativ zur BASIS, nicht relativ zum Vorframe.
_BASE_LIGHT_ENERGY: dict = {}


def randomize_lights(rng):
    for o in bpy.data.objects:
        if o.type == "LIGHT":
            base = _BASE_LIGHT_ENERGY.setdefault(o.name, o.data.energy)
            o.data.energy = base * rng.uniform(0.6, 1.5)
            # Nur leicht warm-biased (Innenraum), aber deutlich neutraler als früher — die starke
            # Wärme machte die (ohnehin orangen) weißen Figuren zu orange. Bleibt randomisiert.
            o.data.color = (1.0, rng.uniform(0.93, 1.0), rng.uniform(0.86, 0.98))
            if o.data.type == "SUN":
                o.rotation_euler = (rng.uniform(0, 0.5), rng.uniform(0, 0.5), rng.uniform(0, 2 * math.pi))
    world = bpy.context.scene.world
    if world and world.use_nodes:
        bg = world.node_tree.nodes.get("Background")
        if bg:
            bg.inputs[1].default_value = rng.uniform(0.3, 1.2)
            # World-Ambient ebenfalls warm-biased statt neutral-kühl.
            bg.inputs[0].default_value = (1.0, rng.uniform(0.82, 0.95), rng.uniform(0.62, 0.82), 1.0)


def place_from_fen(fen, templates, base_z, rng, procedural_types=frozenset(), fallback_subsurf=1):
    created = []
    for fi, ri, sym in parse_fen_placement(fen):
        color = "w" if sym.isupper() else "b"
        t = sym.upper()
        variants = templates.get((color, t))
        if not variants:
            continue
        # Random variant per square → visual diversity across the dataset.
        mesh = variants[0] if len(variants) == 1 else variants[int(rng.integers(len(variants)))]
        x, y = square_center(fi, ri)
        o = bpy.data.objects.new(f"pc_{fi}{ri}", mesh)
        o.location = (x + rng.uniform(-0.4, 0.4), y + rng.uniform(-0.4, 0.4), base_z[t])
        o.rotation_euler = (0, 0, rng.uniform(0, 2 * math.pi))
        # Subsurf NUR für die Low-Poly-Staunton-Fallback-Figuren. Gescannte Meshes sind bereits
        # dicht (~35k tris, decimate_pieces.py) → Subsurf verdoppelte nur die GPU-Last ohne Nutzen.
        if t in procedural_types and fallback_subsurf > 0:
            sub = o.modifiers.new("subsurf", "SUBSURF")
            sub.levels = min(1, fallback_subsurf)
            sub.render_levels = fallback_subsurf
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


def set_engine_fast(samples=24):
    scene = bpy.context.scene
    eng = scene.render.engine
    for candidate in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = candidate
            eng = candidate
            break
        except Exception:
            continue
    # EEVEE TAA-Render-Samples: bestimmt Anti-Aliasing/Rausch-Qualität und ist der Haupt-Speed-Hebel.
    try:
        scene.eevee.taa_render_samples = samples
    except (AttributeError, TypeError) as e:  # pragma: no cover - Blender-Version
        print(f"[v2] taa_render_samples unchanged ({e})")
    # Ambient Occlusion + weiche Schatten: dunkeln Kontaktkanten/Vertiefungen ab und schärfen so
    # Silhouetten/Form → hilft, N/B/R von oben zu unterscheiden. Attribute je nach EEVEE-Variante
    # unterschiedlich → jedes einzeln defensiv setzen (EEVEE-legacy: use_gtao; EEVEE-Next: raytracing).
    for attr, val in (("use_gtao", True), ("gtao_distance", 0.6), ("gtao_factor", 1.0),
                      ("use_soft_shadows", True), ("use_raytracing", True), ("use_shadows", True)):
        try:
            setattr(scene.eevee, attr, val)
        except (AttributeError, TypeError):
            pass
    return eng


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

    views = ra.views_per_scene
    max_ob = ra.max_obliqueness
    fb_subsurf = ra.fallback_subsurf
    global PIECE_SCALE
    PIECE_SCALE = ra.piece_scale

    scene = bpy.context.scene
    eng = set_engine_fast(ra.samples)
    scene.render.resolution_x = scene.render.resolution_y = ra.res
    scene.render.image_settings.file_format = "PNG"
    # Mesh/BVH/GPU-Buffer zwischen Renders halten → Folge-Views einer Szene (nur Kamera+Licht
    # geändert) rendern ohne teuren Szenen-Neuaufbau. Zentraler Speed-Hebel des Szenen-Reuse.
    scene.render.use_persistent_data = True
    # View-Transform auf "Standard": AgX/Filmic entsättigt die warme Holz-Foto-Textur
    # zu Grau. "Standard" (reines sRGB) ist zudem treuer zur echten Webcam-JPEG-Farbe.
    try:
        scene.view_settings.view_transform = "Standard"
    except (AttributeError, TypeError) as e:  # pragma: no cover - Blender-Version
        print(f"[v2] view_transform unchanged ({e})")
    templates, base_z, procedural_types = build_templates(pieces_dir)
    style_board_v2(board_tex)
    cam = setup_camera()
    print(f"[v2] engine={eng}, samples={ra.samples}, views_per_scene={views}, "
          f"max_obliqueness={max_ob}, fens={len(fens)}")

    # Szene = eine Figurenaufstellung, EINMAL gebaut; darüber `views` Kamera/Licht-Varianten.
    i = 0
    scene_idx = 0
    while i < n:
        fen = fens[scene_idx % len(fens)] if fens else "8/8/8/8/8/8/8/8"
        pieces = place_from_fen(fen, templates, base_z, rng, procedural_types, fb_subsurf)

        for _ in range(views):
            if i >= n:
                break
            place_camera(cam, rng, max_ob)
            randomize_lights(rng)

            scene.render.filepath = str((out_dir / f"{i:06d}.png").resolve())
            bpy.ops.render.render(write_still=True)
            corners = corners_px(scene, cam)
            (out_dir / f"{i:06d}.json").write_text(json.dumps({"fen": fen, "corners": corners}))
            in_frame = all(0 <= c[0] <= scene.render.resolution_x and 0 <= c[1] <= scene.render.resolution_y for c in corners)
            print(f"[v2] {i+1}/{n} scene={scene_idx} pieces={len(pieces)} corners_in_frame={in_frame}")
            i += 1

        for o in pieces:
            bpy.data.objects.remove(o, do_unlink=True)
        scene_idx += 1
    print("[v2] DONE")


main()
