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
# Lowered from 0.85 on 2026-07-28 ("kann gerne die Roughness runter"). The old value was chosen to
# stop the dark squares reflecting the cool ambient and reading grey — a COLOUR fix applied to a
# reflectance parameter. The reference photos show a board with visible sheen, so the fix belongs
# in the light, not here.
BOARD_ROUGHNESS = 0.25
# Was hardcoded at 0.2. With roughness 0.70 that is a surface so diffuse it reflects almost nothing,
# so the grain bump perturbs a normal that has no highlight to move — "das Glänzen der kleinen Bumps
# fehlt" (2026-07-28). Relief without specular is invisible relief.
BOARD_SPECULAR = 0.85
# Board-Sättigung: das echte Brettfoto ist warm-gelblich → leicht entsättigen zieht das Gelb raus.
BOARD_SATURATION = 0.92
# LIGHT-TILE GAIN. The board texture is a PHOTOGRAPH of the board at its own exposure, used as
# albedo: measured on the file, its light tiles read 191 sRGB and its dark tiles 43, and they
# render at ~169 / ~48. The dark tiles are already inside the real camera's band (45-90); only
# the light tiles fall below every real session (193-246), which is what makes a white piece
# (~140) nearly invisible on a synth light square — a hard case real capture does not have.
# Light energy, world ambient and the HueSat Value all scale BOTH tiles, so they would lift the
# black-on-dark case out of the hard regime the model has to learn. This gain is therefore
# masked by the texture's OWN linear luminance: 1.0 at dark-tile level, full gain at light-tile
# level, ramped in between. Multiplicative (not a mix toward white) so the wood grain keeps its
# relative contrast.
# The same luminance-masked multiplier now reaches BOTH ends, because the measured fault is the
# CONTRAST and not the brightness. Four rectified reference photos of the real board (2026-07-28,
# `data/_reference/20260728-board`) give light 166.2 / dark 47.3 with a spread of only 163-172 and
# 44-54 across four lightings — a target, not a snapshot. The render sat at 139 / 58, so the light
# tiles come up and the dark ones come down.
BOARD_DARK_GAIN = 0.684
BOARD_LIGHT_GAIN = 2.67
BOARD_LIGHT_GAIN_LO = 0.15   # linear luma of the darkest pixel that stays untouched (dark tile: 0.024)
BOARD_LIGHT_GAIN_HI = 0.41   # linear luma at which the full gain applies (light tile: 0.523)
# Figuren leicht glänzend (echtes lackiertes Holz fängt Glanzlichter, die die 3D-Form verraten →
# hilft, N/B/R von oben zu unterscheiden). Frühere 0.7/Specular 0.2 waren ZU matt (formarm).
PIECE_ROUGHNESS = 0.26
PIECE_SPECULAR = 0.5
# --- WOOD MICRO-GRAIN (board and pieces share it, because they ARE the same wood) ---
# The board is a PHOTOGRAPH used as albedo and the pieces are photogrammetry scans: both carry
# colour variation and neither carries SURFACE. With a perfectly flat normal the render has no
# micro-shading, so the crop's high-frequency energy is pure albedo noise — measured p10 3.72
# against real 5.62 (`synth/measure_noise.py`). Injecting that as post-noise was tried on
# 2026-07-28 and rejected on sight: it reads as coloured speckle, where real crops carry
# DIRECTIONAL grain that responds to the light. Structure has to come from the shader.
#
# One helper applied to BOTH materials — a board and a piece turned from the same lacquered wood
# must not disagree about their own surface — and each drives it from ITS OWN texture, so the
# relief follows the actual grain rather than a pattern laid over the top.
# The grooves are REAL geometry the user measured: the grid lines and the coordinate letters are
# MILLED into the board, about 1 mm deep with a ROUNDED profile (ball-nose, not a square channel).
# 1 mm in board units: SQUARE_MM = 35 mm spans CELL units, so 1 mm = CELL / 35.
# 0.5, not the measured 1.0: chosen by BLIND comparison (2026-07-28, five settings 0/0.5/1/2/4 mm
# rendered at one seed in probe mode, shuffled and unlabelled, the user picking on sight). A bump
# map fakes relief through the normal without geometry, so it over-reads at grazing angles — half
# the physical depth is what looks like the real 1 mm cut. The user did NOT pick 0, so the relief
# itself is wanted; only its amplitude was over-stated.
GROOVE_DEPTH_MM = 0.65
# Wood grain is a fraction of that — surface texture, not a cut. It USED to be expressed as a share
# of GROOVE_DEPTH_MM "so the two stay in proportion", which is wrong for the one thing that actually
# changes: the groove depth is a measurement of this board and the grain amplitude is a look. Tying
# them together means retuning the cut silently retunes the grain on the board AND on every piece,
# undoing work done against renders. The share below is the value that pairing produced, resolved
# once and now standing on its own.
GRAIN_DEPTH_MM = 0.14
# How much more relief the pale white scans need to read as wood — see `_scanned_material`.
PIECE_WHITE_GRAIN_MUL = 11.0
# Extra roughness for the pale set — bare birch against lacquered dark wood.
PIECE_WHITE_ROUGHNESS_ADD = 0.12
# The same two axes for the DARK set, tuned separately: its scans carry more albedo contrast, so
# the relief multiplier that suits birch is not the one that suits the lacquered wood.
PIECE_GRAIN_MUL_PAWN = 20.0    # the flattest scans (span 0.020) need the most to show anything
PIECE_GRAIN_MUL_PIECE = 22.0    # the turned types carry more of their own contrast
PIECE_BLACK_ROUGHNESS_ADD = 0.0
# A neutral trim on the dark set's own scans. Neutral is the point: the warm multiply below it
# exists to turn PALE wood into dark wood when a black scan is missing, and reusing that tint for a
# mild darkening drags the pieces brown - which is the direction the user has already rejected once.
# This is a VALUE change and does not contradict the saturation finding recorded further down; that
# blind test ruled out desaturating, not darkening.
# NOTE this is a LINEAR multiplier and reads much weaker than it looks: 0.85 arrives as roughly a
# 5 % drop in the rendered image, because the encoding curve compresses it and the ambient adds a
# floor the multiply cannot touch. Judge it on renders, never on the number.
PIECE_BLACK_DARKEN = 0.50
# The dark pieces and the dark squares are the same wood, so the BOARD is the reference for their
# hue, not a guess. MEASURED off a render (2026-07-28): the pieces sit at R/G 1.265 against the dark
# squares' 1.072 - 18 % more red at the same brightness, which is the photogrammetry rig's warm
# lighting baked into the scan. This is the multiply that lands one on the other, its luminance
# normalised out so it changes colour and not exposure; PIECE_BLACK_DARKEN owns brightness alone.
# Applied ONCE it only closed part of the gap (1.265 -> 1.195): the multiply acts in linear light
# while the ratio is read off the sRGB-encoded render, so the value below is the converged one.
PIECE_BLACK_TINT = (0.760, 1.0, 1.062)
# Darkening must SPARE the crowns. A flat multiply hits them as hard as the body, and they were
# already the pieces' lightest feature - "die kronen sind da zu dunkel". MEASURED over the six dark
# scans (2026-07-28): bodies sit at luminance 0.13-0.28 (p50), the crowns at 0.42 (bQ) to 0.73 (bK)
# in the top percentiles, so the two separate cleanly. Below LO the trim applies in full, above HI
# the original brightness is kept, smooth in between.
#
# In LINEAR light, which is the trap this walked into first. The percentiles above are read off an
# sRGB-encoded PNG, the shader's RGBToBW sees the decoded values, and sRGB 0.32/0.50 decode to
# 0.084/0.214 - so thresholds taken straight from the measurement sat far above every crown pixel
# and the ramp spared nothing at all (crown brightness moved by 0.1 of 81).
PIECE_BLACK_KEEP = (0.084, 0.214)
# Where the luminance ramp puts the groove floor. The milled channels are the darkest thing in the
# board photo; everything above this is grain, everything below is cut. EASE interpolation is what
# makes the profile ROUND instead of a step — a square-edged groove reads as a printed line.
GROOVE_LUMA_FLOOR = 0.10
# Sheen band, and the extra polish the brightest areas get on top of it — see `add_wood_sheen`.
WOOD_SHEEN_SPAN = 0.07
WOOD_PEAK_GLOSS = 0.10
# NOT varied: roughness. A sheen jitter was tried and rejected on sight — it changes the MATERIAL,
# and the pieces stopped looking like the lacquered wood they are. Relief only: the surface gets a
# shape, its reflectance stays exactly what each material was tuned to.
# Globaler Figuren-Skalierungsfaktor (auf die Basis-mm-Skalierung obendrauf). Hebel, um die
# scheinbare Figurengröße/Höhe im Crop an die echten Kamera-Crops anzugleichen (reale Figuren
# füllen den Crop stärker). 1.0 = wie gemessen; per --piece-scale überschrieben.
PIECE_SCALE = 1.0
# Photogrammetry smoothing for the SCANNED pieces. The reconstruction is lumpy where the real
# pieces carry only a fine grain; see `_smooth_scan_mesh`. 0 iterations disables it entirely.
PIECE_SMOOTH_FACTOR = 1.0
PIECE_SMOOTH_ITERATIONS = 70
# Weiß-Figuren-Korrektur: Scan-Textur ist zu orange/dunkel vs. reale blass-cremige Figuren.
# Sättigung runter (orange raus) + Value hoch (heller). Nur auf weiße Figuren angewandt.
# Weiße Figuren = dasselbe Birkenholz wie die HELLEN Brettfelder → sollen die Tile-Farbe (warmes
# Tan) haben, nicht blass-weiß. Nur den ÜBERSCHUSS-Orange der Scan-Textur leicht dämpfen + minimal
# aufhellen; Sättigung hoch halten, damit die Holzwärme bleibt.
# Lowered from 0.82/1.62 on 2026-07-28: measured against real crops the synthetic white set sits
# +16.5 grey levels too bright overall (wN +46, wB +46, wP +30), and the user reads the queen and
# king as "zu gelb". Saturation carries the yellow, Value the brightness — both come down, and the
# earlier note about keeping the wood warmth is what pushed them too far up.
PIECE_WHITE_SAT = 0.92
PIECE_WHITE_VAL = 1.28
# Für Schwarz wird die Textur NICHT nachbearbeitet. Zwei Versuche sind daran gescheitert, dass
# jede globale Farbtransformation die Schwarztiefe gegen die Lichter eintauscht: eine
# Helligkeits-Multiplikation vergraute die cremefarbenen Kugeln der Damenkrone, ein Gamma>1
# dunkelte sie ebenfalls (gemessen 151 -> 75 gegenüber echten Aufnahmen). Der Grund, warum
# schwarze Figuren "nicht satt" wirkten, lag ohnehin nicht in der Textur, sondern im
# Welt-Ambient (siehe randomize_lights) — und Licht senkt die Schatten, ohne die inneren
# Helligkeitsverhältnisse der Textur zu verschieben.


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
    # _fresh_material statt materials.new: GroundMat wird PRO SZENE erzeugt (randomize_world) —
    # ohne Aufraeumen akkumulieren ueber 18k Szenen tausende verwaiste Node-Trees.
    mat = _fresh_material(name)
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
BOARD_PLAY_HALF_FRAC = 0.425





def add_board_bump(nt, bsdf, texture_path, suffix, default_name, distance, fallback):
    """One height map -> one bump, CHAINED onto whatever already drives the normal.

    Chained rather than summed: each map's normal feeds the next one's Normal input, so fine grain
    survives inside the channels instead of being averaged away with them.

    The map lives beside the colour texture as `<stem><suffix>.png`, or `default_name` in the same
    directory. Missing map: use `fallback` if one is given, else warn — a board whose lines are
    painted rather than cut is a real difference and must not pass silently.
    """
    from pathlib import Path

    tex = Path(texture_path)
    src = None
    for cand in (tex.with_name(f"{tex.stem}{suffix}.png"), tex.with_name(default_name)):
        if cand.exists():
            img = bpy.data.images.load(str(cand))
            img.colorspace_settings.name = "Non-Color"      # a height field is not a colour
            node = nt.nodes.new("ShaderNodeTexImage")
            node.image = img
            node.interpolation = "Cubic"
            src = node.outputs["Color"]
            break
    if src is None:
        if fallback is None:
            print(f"[WARN] no {default_name} beside {tex.name} — board rendered without it")
            return
        src = fallback
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 1.0
    bump.inputs["Distance"].default_value = distance
    nt.links.new(src, bump.inputs["Height"])
    prev = bsdf.inputs["Normal"].links
    if prev:
        nt.links.new(prev[0].from_socket, bump.inputs["Normal"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

def add_wood_sheen(nt, bsdf, height_source, roughness_base):
    """Roughness from the texture's own luminance — bright areas glossier, in that DIRECTION.

    Restored after a first version was rejected: that one jittered roughness symmetrically around
    the base and read as a changed MATERIAL. This one is directional and physical — on a polished
    piece the raised, handled parts take the light while recesses stay matt, so the peaks catch a
    highlight ("die Peaks können bissel mehr glänzen", 2026-07-28) and the deep grain does not.

    `WOOD_SHEEN_SPAN` is how far roughness may move either way; the bright end gets
    `WOOD_PEAK_GLOSS` of extra polish on top, which is what makes a top read as a top.
    """
    rough = nt.nodes.new("ShaderNodeMapRange")
    rough.inputs["From Min"].default_value = 0.0
    rough.inputs["From Max"].default_value = 1.0
    rough.inputs["To Min"].default_value = min(1.0, roughness_base + WOOD_SHEEN_SPAN)
    rough.inputs["To Max"].default_value = max(0.0, roughness_base - WOOD_SHEEN_SPAN - WOOD_PEAK_GLOSS)
    nt.links.new(height_source, rough.inputs["Value"])
    nt.links.new(rough.outputs["Result"], bsdf.inputs["Roughness"])

def add_wood_grain(nt, bsdf, height_source, groove_units, grain_units):
    """Micro-relief and sheen variation taken from the material's OWN texture. Board and pieces.

    `height_source` is a scalar socket — the luminance of the very image that already supplies the
    albedo. That is the point: an albedo photograph of wood IS approximately its height field
    (latewood is darker AND sits differently), so the relief follows the real grain of this board
    and this piece, per square, instead of laying a uniform pattern over both. A procedural noise
    was tried first and rejected for exactly that reason — it was even everywhere, and wood is not.

    Deliberately Bump, not Displacement: at 1100 px board / 128 px crop the feature is a shading
    cue, and real geometry would cost triangles for something under a pixel.
    """
    # TWO height contributions, added — one ramp cannot carry both. The first attempt mapped
    # luminance through a single EASE ramp with its shoulder at the groove floor, which pinned
    # everything above it to a constant: the grain (luma 0.2-0.8) came out perfectly flat and the
    # change rendered identical to no change at all. Seen on the probe, not reasoned about.
    #
    #   grain  = luminance across its whole range, at grain amplitude
    #   groove = a mask of only the darkest pixels, at the measured 1 mm, EASE for a round profile
    grain = nt.nodes.new("ShaderNodeMapRange")
    grain.inputs["From Min"].default_value = 0.0
    grain.inputs["From Max"].default_value = 1.0
    grain.inputs["To Min"].default_value = 0.0
    grain.inputs["To Max"].default_value = grain_units
    nt.links.new(height_source, grain.inputs["Value"])
    groove = nt.nodes.new("ShaderNodeMapRange")
    groove.interpolation_type = "SMOOTHSTEP"      # the rounded ball-nose profile, not a step
    groove.inputs["From Min"].default_value = 0.0
    groove.inputs["From Max"].default_value = GROOVE_LUMA_FLOOR
    groove.inputs["To Min"].default_value = -groove_units
    groove.inputs["To Max"].default_value = 0.0
    nt.links.new(height_source, groove.inputs["Value"])
    total = nt.nodes.new("ShaderNodeMath")
    total.operation = "ADD"
    nt.links.new(grain.outputs["Result"], total.inputs[0])
    nt.links.new(groove.outputs["Result"], total.inputs[1])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 1.0
    # Height is already in SCENE units, so Distance is 1: the depth is the measured millimetre.
    bump.inputs["Distance"].default_value = 1.0
    nt.links.new(total.outputs["Value"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])


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
        bsdf.inputs["Specular IOR Level"].default_value = BOARD_SPECULAR
    elif "Specular" in bsdf.inputs:
        bsdf.inputs["Specular"].default_value = BOARD_SPECULAR
    tx = nt.nodes.new("ShaderNodeTexImage")
    tx.image = img
    # Light-tile gain (see BOARD_LIGHT_GAIN): luminance-masked multiplier that lifts ONLY the
    # bright half of the texture, so the light squares reach the real camera's 193-246 band
    # while the dark squares (and with them the black-on-dark hard case) stay where they are.
    bw = nt.nodes.new("ShaderNodeRGBToBW")
    nt.links.new(tx.outputs["Color"], bw.inputs["Color"])
    gain = nt.nodes.new("ShaderNodeMapRange")
    gain.inputs["From Min"].default_value = BOARD_LIGHT_GAIN_LO
    gain.inputs["From Max"].default_value = BOARD_LIGHT_GAIN_HI
    gain.inputs["To Min"].default_value = BOARD_DARK_GAIN
    gain.inputs["To Max"].default_value = BOARD_LIGHT_GAIN
    nt.links.new(bw.outputs["Val"], gain.inputs["Value"])
    lift = nt.nodes.new("ShaderNodeMixRGB")
    lift.blend_type = "MULTIPLY"
    lift.inputs["Fac"].default_value = 1.0
    nt.links.new(tx.outputs["Color"], lift.inputs["Color1"])
    nt.links.new(gain.outputs["Result"], lift.inputs["Color2"])
    # Warm-Tint: der dunkle Brett-Lack fotografiert sich neutral-grau -> per COLOR-Blend
    # mit einem warmen Ton Richtung Braun ziehen. BOARD_WARM_TINT/BOARD_WARM_FAC oben.
    warm = nt.nodes.new("ShaderNodeMixRGB")
    warm.blend_type = "COLOR"
    warm.inputs["Fac"].default_value = BOARD_WARM_FAC
    warm.inputs["Color2"].default_value = (*BOARD_WARM_TINT, 1.0)
    nt.links.new(lift.outputs["Color"], warm.inputs["Color1"])
    # Board leicht entsättigen: das echte Brettfoto ist warm-gelblich; Sättigung runter zieht
    # das Gelb raus, ohne die Helligkeit/den Kontrast der Felder zu ändern.
    desat = nt.nodes.new("ShaderNodeHueSaturation")
    desat.inputs["Saturation"].default_value = BOARD_SATURATION
    nt.links.new(warm.outputs["Color"], desat.inputs["Color"])
    nt.links.new(desat.outputs["Color"], bsdf.inputs["Base Color"])
    # Relief from the board photo's OWN luminance (`bw`, the raw texture before the light-tile
    # gain). It carries two things at once and both are real: the wood grain, and the grid lines
    # and coordinate numbers, which on this board are MILLED — recessed into the wood, not
    # printed. Dark texture -> low height is exactly the polarity a groove needs, so the same
    # source gives the squares their edge and the labels their depth without a second map.
    add_wood_sheen(nt, bsdf, bw.outputs["Val"], BOARD_ROUGHNESS)
    # TWO bumps, chained, because they are two different things and sharing one height map is what
    # made the previous round unusable: the milled channels and the dark squares occupy the same
    # luminance range in the photograph, so deepening the grooves also roughened the squares and no
    # setting was acceptable. The channels are GEOMETRY at known positions, so they get their own
    # computed map (`synth/make_groove_map.py`) and the photo is left to do only what it can —
    # wood grain.
    # Grain from its OWN map, not from the raw luminance. Raw luminance made every square boundary
    # a height cliff, because a light and a dark square differ in ALBEDO and not in height — they
    # are milled from one plank and are coplanar. `make_groove_map.py --grain-out` subtracts the
    # per-square mean so only the grain is left, and blanks the channels so the groove bump owns
    # them. Falls back to the old luminance path when no map is present.
    add_board_bump(nt, bsdf, texture_path, "_grain", "board_grain.png",
                   GRAIN_DEPTH_MM * CELL / SQUARE_MM,
                   fallback=bw.outputs["Val"])
    add_board_bump(nt, bsdf, texture_path, "_grooves", "board_grooves.png",
                   GROOVE_DEPTH_MM * CELL / SQUARE_MM, fallback=None)
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
        # Both axes inverted, and each half of that was verified with a two-rook probe
        # (`R7/8/8/8/8/8/8/7r`: white on a8, black on h1) rather than reasoned about:
        #
        #   swapped U/V (the old form)  -> coordinates landed CORRECTLY but every glyph rendered
        #                                  mirrored, letters on the left/right edges where the
        #                                  digits belong: a reflection about the main diagonal.
        #   un-swapped, not inverted    -> glyphs correct and on the right edges, but the ring was
        #                                  rotated 180 degrees: the a8 piece sat by the printed H1.
        #   un-swapped AND inverted     -> both right.
        uvl.data[loop.index].uv = (1.0 - (co.x + P) / (2.0 * P), 1.0 - (co.y + P) / (2.0 * P))
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


def _scanned_material(png, mul=None, whiten=False, piece_type=None):
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
    if bsdf is not None:
        psheen = nt.nodes.new("ShaderNodeRGBToBW")
        nt.links.new(tx.outputs["Color"], psheen.inputs["Color"])
        # White is MATTER than black, and physically so: the pale set is bare birch while the dark
        # set is lacquered. One global gloss made the white pieces read as piano lacquer even at a
        # roughness the black set wanted ("aber immer noch zu glossy", 2026-07-28).
        add_wood_sheen(nt, bsdf, psheen.outputs["Val"],
                       PIECE_ROUGHNESS + (PIECE_WHITE_ROUGHNESS_ADD if whiten else PIECE_BLACK_ROUGHNESS_ADD))
    # Relief on pieces, restored. It was removed when the pimply look was (wrongly) blamed on the
    # scan texture; the cause was the photogrammetry MESH, and that is smoothed at template load
    # now (`_smooth_scan_mesh`). With the lumps gone, the albedo's fine variation reads as the
    # "sehr feine Textur" the real pieces carry rather than as warts on top of warts.
    # Grain only: a turned piece has no milled channels, so no groove term.
    # The WHITE scans need more of it, and for a reason rather than by taste: their albedo is pale
    # birch with far less luminance contrast than the dark set, so the SAME bump strength produces
    # visibly less relief and the pieces read as "zu Klavierlack" (2026-07-28). The multiplier
    # compensates the texture's own contrast; it is not extra roughness on the material.
    # Per TYPE, not per colour, because the multiplier is really a contrast compensation: the
    # height source is the scan's own luminance and the scans differ wildly in how much of it they
    # have. Measured p10..p90 span: bP 0.020, wP 0.024, bQ 0.106, wQ 0.329 — the pawns are nearly
    # flat, so they need the most amplification to show any surface at all. The user picked these
    # blind, and the ordering they arrived at is exactly the ordering of the measured spans.
    _mul = PIECE_GRAIN_MUL_PAWN if piece_type == "P" else PIECE_GRAIN_MUL_PIECE
    if whiten:
        _mul = PIECE_WHITE_GRAIN_MUL
    _grain = GRAIN_DEPTH_MM * CELL / SQUARE_MM
    add_wood_grain(nt, bsdf, psheen.outputs["Val"], groove_units=0.0,
                   grain_units=_grain * _mul)
    # Historical note, kept because it cost a cycle: The height source here would be a PHOTOGRAMMETRY
    # The height source here would be a PHOTOGRAMMETRY SCAN, and its luminance carries
    # reconstruction noise rather than wood grain: rendered as a bump it reads as pimples over the
    # whole surface ("die schwarzen Figuren sind zu pickelig", 2026-07-28), worst on the dark
    # pieces where the scan is noisiest. The BOARD keeps its relief, because a flat-lit photograph
    # of wood IS approximately its height field. Restoring this needs a real per-piece height map,
    # not the albedo.
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
    # Schwarze Figuren: das Gegenstück. Die Scan-Textur ist zu hell und braunstichig; ohne das
    # hier wirken sie neben echten Aufnahmen ausgewaschen (siehe PIECE_BLACK_* oben).
    if mul is not None:
        try:
            mix = nt.nodes.new("ShaderNodeMixRGB"); mix.blend_type = "MULTIPLY"
            mix.inputs["Fac"].default_value = 1.0
            mix.inputs["Color2"].default_value = (*mul, 1.0)
            nt.links.new(src, mix.inputs["Color1"])
            lo, hi = PIECE_BLACK_KEEP
            if hi > lo:
                bw = nt.nodes.new("ShaderNodeRGBToBW")
                nt.links.new(src, bw.inputs["Color"])
                keep = nt.nodes.new("ShaderNodeMapRange")
                keep.interpolation_type = "SMOOTHSTEP"
                keep.inputs["From Min"].default_value = lo
                keep.inputs["From Max"].default_value = hi
                nt.links.new(bw.outputs["Val"], keep.inputs["Value"])
                spare = nt.nodes.new("ShaderNodeMixRGB")
                nt.links.new(keep.outputs["Result"], spare.inputs["Fac"])
                nt.links.new(mix.outputs["Color"], spare.inputs["Color1"])
                nt.links.new(src, spare.inputs["Color2"])
                src = spare.outputs["Color"]
            else:
                src = mix.outputs["Color"]
        except Exception:
            pass
    # NO colour correction on the BLACK set — measured, not assumed. A luminance-masked
    # saturation ramp was built for it (body 0.70 / crown 0.40) and a BLIND comparison of five
    # settings from untouched to that one, rendered at one seed in probe mode, picked UNTOUCHED
    # first and 0.94/0.84 second (2026-07-28). Desaturating is the wrong axis: it takes the life
    # out of the wood instead of cooling it, "das sieht fast tot aus".
    #
    # The observation that prompted it stands — the cream crown balls read too yellow — but the
    # lever has to be HUE or the lighting, not saturation. Two earlier attempts on the value axis
    # failed for a related reason (a brightness multiply greyed the balls, a gamma darkened them,
    # 151 -> 75 against real), so all three of value, saturation and global transforms are now
    # ruled out by measurement here.

    # Per-View-Jitter-Hook (siehe randomize_piece_materials): ein neutral initialisierter
    # HSV-Node am Ende der Kette, den der Render-Loop pro View verstellt. Gegen den
    # bQ→wQ-Flip: die cremefarbenen Kugeln der schwarzen Damenkrone kippen unter warmem
    # Licht ins Helle — Kronen-Helligkeit/-Farbe darf kein Farbbeweis der FIGUR sein.
    jit = nt.nodes.new("ShaderNodeHueSaturation")
    jit.name = jit.label = "PieceJitter"
    nt.links.new(src, jit.inputs["Color"])
    src = jit.outputs["Color"]
    mat["cl_black_piece"] = not whiten     # randomize_piece_materials braucht die Farbe
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
    import numpy as np
    co = np.empty(len(m.vertices) * 3, dtype=np.float64)
    m.vertices.foreach_get("co", co)
    v = co.reshape(-1, 3) * s
    # Recentern NACH dem Skalieren: Basis-Mitte auf den Ursprung (x/y = bbox-Mitte, z-min = 0).
    # RealityScan-Exporte tragen beliebige Welt-Origins (Turntable-Position); ohne Recentern
    # landet die Figur um genau diesen — mitskalierten — Versatz NEBEN ihrem Feld (Verbatim-
    # Importe haben keinen Prepare-Schritt mehr, der das frueher erledigte).
    v[:, 0] -= (v[:, 0].min() + v[:, 0].max()) / 2.0
    v[:, 1] -= (v[:, 1].min() + v[:, 1].max()) / 2.0
    v[:, 2] -= v[:, 2].min()
    m.vertices.foreach_set("co", v.ravel())
    m.update()
    _smooth_scan_mesh(imp, m)
    bpy.data.objects.remove(imp, do_unlink=True)
    for p in m.polygons:
        p.use_smooth = True
    return m


def _smooth_scan_mesh(obj, mesh) -> None:
    """Take the photogrammetry noise out of a scanned piece, and nothing else.

    The scans reconstruct as a lumpy surface: the base rims are irregular in SILHOUETTE, not merely
    in shading, which is how the user identified the cause ("ich glaube das Pickelige kommt eher aus
    dem Modell als aus der Textur oder dem Normal") and how it was confirmed — a render with ZERO
    surface relief is just as pimply. Real pieces are not glass-smooth either, but they carry a fine
    texture rather than warts.

    A plain vertex smooth is the right tool: it averages each vertex toward its neighbours, which
    removes high-frequency reconstruction noise while leaving the turned profile intact. `use_x/y/z`
    all on, because the noise is isotropic. Applied at TEMPLATE load, so it costs once per piece
    type per render process rather than once per placement.
    """
    if PIECE_SMOOTH_ITERATIONS <= 0:
        return
    mod = obj.modifiers.new("scan-smooth", "SMOOTH")
    mod.factor = PIECE_SMOOTH_FACTOR
    mod.iterations = PIECE_SMOOTH_ITERATIONS
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph).to_mesh()
    # Vertex COUNT is unchanged by a smooth, so the coordinates can be copied straight back.
    import numpy as np
    co = np.empty(len(evaluated.vertices) * 3, dtype=np.float64)
    evaluated.vertices.foreach_get("co", co)
    mesh.vertices.foreach_set("co", co)
    mesh.update()
    obj.evaluated_get(depsgraph).to_mesh_clear()
    obj.modifiers.remove(mod)


def build_templates(pieces_dir=None):
    """Pro Figurentyp je eine helle + dunkle Mesh-Vorlage + Basis-Z. Mit `pieces_dir`: für jeden Typ,
    der dort als Scan vorliegt (`wP.obj`/`bP.obj`/`P.obj` + gleichnamige `.png`), die GESCANNTE Figur
    verwenden (mit echter Textur, auf Ziel-Höhe skaliert); sonst die prozeduralen Staunton-Vorlagen."""
    pdir = Path(pieces_dir) if pieces_dir else None
    white_mat = make_wood_material("WoodWhite", (0.80, 0.64, 0.42), (0.62, 0.46, 0.27))
    black_mat = make_wood_material("WoodBlack", (0.17, 0.10, 0.055), (0.05, 0.027, 0.013))
    def _scanned_meshes(objs, t, color, mul):
        """One mesh datablock per variant OBJ, each with its own textured material.
        Ohne <variant>.png (Scan ohne Textur-Export): prozedurales Holz in der Zielfarbe
        statt Abbruch — die GEOMETRIE des Scans ist trotzdem wertvoll."""
        out = []
        for o in objs:
            m = _load_scanned_mesh(o, t)
            m.materials.clear()
            png = o.with_suffix(".png")
            if png.exists():
                m.materials.append(_scanned_material(png, mul, whiten=(color == "w"), piece_type=t))
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
            templates[("w", t)] = _scanned_meshes(w_objs or b_objs, t, "w", None)
            # Black: own scans if present, else the white scans recolored dark.
            _lum = 0.2126 * PIECE_BLACK_TINT[0] + 0.7152 * PIECE_BLACK_TINT[1] + \
                   0.0722 * PIECE_BLACK_TINT[2]
            _d = PIECE_BLACK_DARKEN / _lum
            _mul = tuple(c * _d for c in PIECE_BLACK_TINT)
            templates[("b", t)] = (_scanned_meshes(b_objs, t, "b", _mul) if b_objs
                                   else _scanned_meshes(w_objs, t, "b", (0.2, 0.18, 0.16)))
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


def place_camera(cam, rng, max_obliqueness=0.10, distance_jitter=0.0):
    base_H = CAM_DISTANCE_MM / MM_PER_UNIT   # ~94 Einheiten = 55 cm
    # Kamera-DISTANZ pro View über ein reales Band variieren (distance_jitter > 0): näher =
    # stärkere Perspektive/Lean + größere Figur, ferner = flacher/kleiner. Lehrt dem Modell
    # mehrere Maßstäbe (FixRes) und die radiale Verzerrung der echten obliquen Aufnahmen.
    if distance_jitter > 0:
        lo_f = max(0.55, 1.0 - distance_jitter)
        hi_f = 1.0 + distance_jitter
        H = base_H * rng.uniform(lo_f, hi_f)
    else:
        H = base_H + rng.uniform(-6, 6)
    # Obliqueness = horizontaler Offset / Höhe. Untergrenze 0.04 (nie perfekt senkrecht),
    # Obergrenze aus max_obliqueness — bei 0.45 bis ~25° gekippt (echte oblique Handaufnahmen).
    lo = min(0.04, max_obliqueness)
    obliq = rng.uniform(lo, max_obliqueness)
    off = obliq * H
    ang = rng.uniform(0, 2 * math.pi)
    cam.location = Vector((off * math.cos(ang), off * math.sin(ang), H))
    direction = Vector((0, 0, 0)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    # Realisierte Kameraparameter (für Diversity-Probe / Verteilungs-Check).
    return {"obliqueness": round(obliq, 4), "cam_height": round(H, 3),
            "cam_distance_mm": round(H * MM_PER_UNIT, 1)}


# Basis-Lichtenergie je Lampe, EINMAL aus der .blend gemerkt. Ohne diesen Anker würde
# `energy *= faktor` pro Frame kumulieren (Zufalls-Multiplikatoren mit Mittelwert >1) →
# über tausende Frames brennt die Szene exponentiell zu Weiß aus. Jeder Frame skaliert
# jetzt relativ zur BASIS, nicht relativ zum Vorframe.
_BASE_LIGHT_ENERGY: dict = {}
_BASE_CHECKER_COLOR: dict = {}   # base tile colors for randomize_board (jitter from base, no drift)

# Realistic per-scene board "families" for randomize_board. `hue` is a rotation of the brown board
# photo (0.5 = unchanged brown wood); higher rotates toward green/teal/blue like vinyl tournament
# boards. `sat_mul` < 1 pulls toward marble/greyscale. Weighted toward wood (the most common real
# case) but with enough green/blue/marble that board appearance can't predict piece identity.
# The REAL board keeps only a MILD recolor (stays recognizably the user's wood board) — the
# strong colour diversity that breaks the board-shortcut now comes from the ~50% procedural
# bordered boards (fully random colours). Hue stays near 0.5 (0.5 = unchanged brown wood).
BOARD_FAMILIES = [
    {"name": "wood", "hue": 0.500, "sat_mul": 1.00},
    {"name": "wood-warm", "hue": 0.490, "sat_mul": 1.05},
    {"name": "wood-cool", "hue": 0.512, "sat_mul": 0.95},
    {"name": "mahogany", "hue": 0.478, "sat_mul": 1.10},
]


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
            # Ambient bewusst niedrig: die alte Spanne (0.3-1.2) legte einen Aufhellungs-Boden
            # über die Szene, unter dem schwarze Figuren nie tief wurden — im Direktvergleich mit
            # echten Aufnahmen lag ihr Schatten 2.5x zu hell, und an der Basisfarbe liess sich das
            # kaum bewegen (2.5x dunklere Textur = nur 9% weniger Helligkeit). Schlüssellichter
            # modellieren, Schatten dürfen zufallen — so entsteht der Kontrast echter Fotos.
            bg.inputs[1].default_value = rng.uniform(0.08, 0.45)
            # World-Ambient ebenfalls warm-biased statt neutral-kühl.
            bg.inputs[0].default_value = (1.0, rng.uniform(0.82, 0.95), rng.uniform(0.62, 0.82), 1.0)


def randomize_piece_materials(rng):
    """Per-View Farb-/Helligkeits-Jitter der gescannten Figuren-Texturen (Node "PieceJitter"
    in _scanned_material). Gegen den bQ→wQ-Flip (Kronen-/Farbvarianz unter warmem Licht):
    das Modell sieht dieselbe Figur mal heller/wärmer, mal dunkler/kühler und kann die
    absolute Kronen-Helligkeit nicht mehr als Farbbeweis lesen. SCHWARZ bekommt die
    deutlich breitere VALUE-Spanne (0.55–1.5): genau die hellen Ausreißer, in denen eine
    reale bQ wie eine wQ wirkt, kommen so ins Training — mit korrektem bQ-Label. Hue nur
    minimal (±0.015 um den Neutralwert 0.5): die Holz-Identität der Figuren bleibt.
    Jitter ist global pro Template-Material (wie das Licht), nicht pro Figur-Instanz."""
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        node = mat.node_tree.nodes.get("PieceJitter")
        if node is None:
            continue
        black = bool(mat.get("cl_black_piece", False))
        node.inputs["Hue"].default_value = 0.5 + rng.uniform(-0.015, 0.015)
        node.inputs["Saturation"].default_value = rng.uniform(0.75, 1.15)
        node.inputs["Value"].default_value = (rng.uniform(0.55, 1.50) if black
                                              else rng.uniform(0.80, 1.25))


def randomize_board(rng, borderless_p: float = 0.0, isolate_p: float = 0.0):
    """Per-scene board appearance jitter — breaks the "read the board, not the piece" shortcut.

    With a single fixed board photo/texture, the background under every piece is IDENTICAL across
    the whole dataset, so the CNN can (and does, esp. for the dark knight) predict from board pixels.
    Jittering hue/value/saturation/gloss per scene makes the board carry NO information about piece
    identity, forcing the model onto the figure. Purely a material tweak — geometry and the label
    projection are untouched, so corners/FEN stay correct.
    """
    # Per-scene "board family": real chess boards aren't only brown wood — tournament sets are
    # green/buff and blue/buff vinyl, plus marble/greyscale. Hue is a ROTATION of the brown photo
    # (0.5 = unchanged); these targets rotate it toward green/blue while keeping the light/dark
    # checker structure. All realistic, so this is safe for `empty` too (real empty squares come in
    # these colors). `sat_mul<1` desaturates toward marble/grey. Picked per scene → the board's
    # look carries no information about which piece stands on it.
    # Structural variety: some scenes swap the ONE recolored photo for a fresh random procedural
    # checker (different pattern/grain/cell size), which the hue-recolor cannot produce. The photo
    # material is restored on non-procedural scenes.
    board = bpy.data.objects.get("BoardPlane")
    photo_mat = bpy.data.materials.get("BoardTexture")
    if board is not None and photo_mat is not None:
        # Curriculum stage 1: no board at all, just a randomized ground (see
        # make_isolation_surface). Checked FIRST so it wins over the borderless/photo paths.
        # The plane is scaled up like the borderless case so no plane edge shows at the rim.
        if isolate_p > 0.0 and rng.random() < isolate_p:
            board.scale = (BORDERLESS_PLANE_SCALE, BORDERLESS_PLANE_SCALE, 1.0)
            board.data.materials.clear()
            board.data.materials.append(make_isolation_surface(rng))
            return
        # Borderless procedural board (checker/solid runs edge-to-edge, NO frame): edge squares are
        # surrounded by more board, so the model can't shortcut on the rim to spot a border piece
        # (king/rook) — it must read the figure. `borderless_p` share of ALL scenes. The plane is
        # scaled up so the pattern overhangs FAR beyond the board (world-aligned material stays put).
        if borderless_p > 0.0 and rng.random() < borderless_p:
            board.scale = (BORDERLESS_PLANE_SCALE, BORDERLESS_PLANE_SCALE, 1.0)
            board.data.materials.clear()
            board.data.materials.append(make_random_procedural_board(rng, bordered=False))
            return
        board.scale = (1.0, 1.0, 1.0)   # restore exact plane size — bordered/photo need it (UV-mapped)
        if rng.random() < BOARD_PROCEDURAL_P:
            board.data.materials.clear()
            board.data.materials.append(make_random_procedural_board(rng))
            return
        if photo_mat.name not in {m.name for m in board.data.materials if m}:
            board.data.materials.clear()
            board.data.materials.append(photo_mat)

    family = rng.choice(BOARD_FAMILIES)
    hue = family["hue"] + rng.uniform(-0.02, 0.02)
    sat = BOARD_SATURATION * family["sat_mul"] * rng.uniform(0.85, 1.15)
    val = rng.uniform(0.75, 1.20)
    for mat_name in ("BoardTexture", "WoodBoard", "WoodSurround"):
        mat = bpy.data.materials.get(mat_name)
        if mat is None or not mat.use_nodes:
            continue
        nt = mat.node_tree
        for node in nt.nodes:
            if node.type == "HUE_SAT":            # existing desat node — hue-rotate + value/sat
                node.inputs["Hue"].default_value = hue
                node.inputs["Value"].default_value = val
                node.inputs["Saturation"].default_value = sat
            elif node.type == "BSDF_PRINCIPLED":  # vary gloss so highlights aren't a constant tell
                node.inputs["Roughness"].default_value = rng.uniform(0.55, 0.95)
            elif node.type == "TEX_CHECKER":      # procedural fallback: jitter the two tile colors
                for key in ("Color1", "Color2"):
                    bkey = f"{mat_name}.{key}"
                    base = _BASE_CHECKER_COLOR.setdefault(bkey, tuple(node.inputs[key].default_value))
                    f = rng.uniform(0.85, 1.15)   # from BASE, not current → no drift across scenes
                    node.inputs[key].default_value = (base[0] * f, base[1] * f, base[2] * f, 1.0)


# Per-scene probability of swapping the photo board for a fresh RANDOM procedural (bordered,
# aligned) checker. ~0.5 = a balanced real+synthetic mix: half the scenes show the real custom
# board (mild recolor), half show a diverse procedural board — the procedural half carries the
# strong colour variety that keeps the board from predicting piece identity.
BOARD_PROCEDURAL_P = 0.50

# Plane scale factor for BORDERLESS scenes: the board plane (normally ±28.6, ~0.8 cells past the
# 8x8) is enlarged so the edge-to-edge checker/solid overhangs FAR beyond the board (~5+ cells) and
# no plane edge / background can appear in a rim-square crop. The world-aligned borderless material
# is unaffected by the scale; bordered/photo scenes reset to 1.0 (their UV mapping needs ±28.6).
BORDERLESS_PLANE_SCALE = 2.4


def _fresh_material(name: str):
    """Neues Material-Datablock; gleichnamige Reste vorheriger Szenen vorher entfernen.

    Pro-Szene-Materialien (ProcBoard/IsolationSurface) wurden nur aus dem Slot geloescht — der
    Datablock (kompletter Node-Tree) blieb in bpy.data.materials und Blender nummerierte neu
    (.001, .002, ...): ueber 18k Szenen tausende verwaiste Node-Trees = RAM-Kriechen."""
    for m in [m for m in bpy.data.materials
              if m.name == name or m.name.startswith(name + ".")]:
        bpy.data.materials.remove(m)
    return bpy.data.materials.new(name)


def _rand_square_colors(rng):
    """A WILD two-colour checker pair for a random procedural board — the anti-shortcut lever
    pushed hard. The two tiles are INDEPENDENT random hues (pastel pink/lime, teal, neon on
    black, …), so the board is pure noise: it carries zero information about the piece on it and
    the CNN is forced onto the figure. The only constraint is LUMINANCE — the light tile must be
    as bright as a real light square and the dark tile as dark as a real dark one, so that the
    8x8 reads as a chessboard and, more importantly, a piece is never rendered on a square whose
    brightness does not occur in real capture. Hue is unconstrained; saturation only where it
    would fight the luminance requirement (see below)."""
    import colorsys

    # Light tile: any hue, LOW saturation, BRIGHT. Dark tile: any (independent) hue, high
    # saturation, DARK. Splitting the value ranges guarantees the checker is always obviously
    # colourful and high-contrast — no procedural board can land on a muddy orange/brown that
    # passes for wood, and light/dark independent hues give wild combos (pink×teal, lime×purple).
    # The light tile's saturation is capped because HSV *value* is not luminance: a saturated
    # blue at value 0.9 has linear luma 0.26 and renders at ~100-140, i.e. DARKER than the white
    # piece standing on it — a light square that dark does not exist in real capture (193-246),
    # and it both drags the synth light-square median down and inflates the empty-light spread
    # that white-on-light ambiguity is measured against. sat <= 0.35 with value >= 0.85 keeps
    # linear luma >= 0.58 for EVERY hue (worst case blue) = albedo 204+ sRGB, while hue stays
    # fully random so the board still carries no information about the piece on it.
    light = colorsys.hsv_to_rgb(rng.random(), rng.uniform(0.05, 0.35), rng.uniform(0.85, 1.0))
    dark = colorsys.hsv_to_rgb(rng.random(), rng.uniform(0.65, 1.0), rng.uniform(0.18, 0.48))
    return tuple(light), tuple(dark)


def make_isolation_surface(rng):
    """A NON-board surface for curriculum stage 1: pieces isolated on a random ground.

    Stage 1 asks a narrower question than the full task — can the model tell the piece TYPES
    apart at all? — so the plane carries no 8x8 structure, no frame, nothing that could stand in
    for the figure. What it must NOT be is a *constant* backdrop: a fixed green would just become
    the next shortcut ("the piece is the non-green thing"), a segmentation cue that does not exist
    on a real board. So the surface is re-randomized per scene across three families:

        solid     — one random colour
        gradient  — two random colours along a random direction
        noise     — coloured Perlin noise at a random scale

    Geometry is untouched (same plane, same corner projection), so the crop framing and the FEN
    label mapping stay identical to deployment — the geometry-match rule this project lives by.
    """
    a, b = _rand_square_colors(rng)
    mat = _fresh_material("IsolationSurface")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = rng.uniform(0.3, 1.0)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    kind = rng.choice(("solid", "gradient", "noise"))
    if kind == "solid":
        bsdf.inputs["Base Color"].default_value = (*rng.choice((a, b)), 1.0)
        return mat

    coord = nt.nodes.new("ShaderNodeTexCoord")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*a, 1.0)
    ramp.color_ramp.elements[1].color = (*b, 1.0)

    if kind == "gradient":
        mapping = nt.nodes.new("ShaderNodeMapping")
        mapping.inputs["Rotation"].default_value = (0.0, 0.0, rng.uniform(0.0, 2.0 * math.pi))
        grad = nt.nodes.new("ShaderNodeTexGradient")
        nt.links.new(coord.outputs["Object"], mapping.inputs["Vector"])
        nt.links.new(mapping.outputs["Vector"], grad.inputs["Vector"])
        nt.links.new(grad.outputs["Fac"], ramp.inputs["Fac"])
    else:
        noise = nt.nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = rng.uniform(1.5, 20.0)
        nt.links.new(coord.outputs["Object"], noise.inputs["Vector"])
        nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])

    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def make_random_procedural_board(rng, bordered: bool = True):
    """Procedural board for the BoardPlane: an 8x8 checker ALIGNED to the play area, in randomized
    colours. With `bordered=True` a solid frame surrounds the play area (the real board's
    structure). With `bordered=False` the checker runs edge-to-edge over the whole plane (NO
    frame): edge squares (a-file, ranks 1/8, where kings/rooks sit) are then surrounded by MORE
    checker instead of a constant border — this kills the edge-shortcut where the model reads the
    frame to recognise a rim piece (seen as bK piece_frac ~0%) instead of the figure itself.

    Uses the plane's UV (play area occupies [0.5±BOARD_PLAY_HALF_FRAC]) so the 8x8 lands on the
    true square world positions (a8/h8/h1/a1) regardless of the border; the checker simply tiles
    on beyond ±HALF when borderless.
    """
    light, dark = _rand_square_colors(rng)
    frac = BOARD_PLAY_HALF_FRAC
    lo, span = 0.5 - frac, 2.0 * frac

    mat = _fresh_material("ProcBoard")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = rng.uniform(0.4, 0.95)
    coord = nt.nodes.new("ShaderNodeTexCoord")

    # Remap UV so the play area [lo, lo+span] -> [0,1], then an 8-scale checker = aligned 8x8.
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Location"].default_value = (-lo / span, -lo / span, 0.0)
    mapping.inputs["Scale"].default_value = (1.0 / span, 1.0 / span, 1.0)
    checker = nt.nodes.new("ShaderNodeTexChecker")
    checker.inputs["Scale"].default_value = 8.0
    checker.inputs["Color1"].default_value = (*light, 1.0)
    checker.inputs["Color2"].default_value = (*dark, 1.0)
    nt.links.new(coord.outputs["UV"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], checker.inputs["Vector"])

    if not bordered:
        # Some borderless boards carry NO pattern at all — a plain solid colour edge-to-edge. Then
        # there is literally nothing (no frame, no checker) at the rim to shortcut on. Even stronger
        # anti-edge-shortcut than the checker; adds board-appearance variety.
        if rng.random() < 0.4:
            bsdf.inputs["Base Color"].default_value = (*rng.choice((light, dark)), 1.0)
            nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
            return mat
        # Borderless: a WORLD-position checker (cell = CELL world units, aligned to the square
        # grid at multiples of CELL), independent of the plane's size/UV. randomize_board scales
        # the plane up for borderless scenes, so this checker overhangs FAR beyond ±HALF and edge
        # crops are fully surrounded by checker (no plane edge / background at the rim).
        geo = nt.nodes.new("ShaderNodeNewGeometry")
        wmap = nt.nodes.new("ShaderNodeMapping")
        wmap.inputs["Scale"].default_value = (1.0 / CELL, 1.0 / CELL, 1.0)
        wchecker = nt.nodes.new("ShaderNodeTexChecker")
        wchecker.inputs["Scale"].default_value = 1.0
        wchecker.inputs["Color1"].default_value = (*light, 1.0)
        wchecker.inputs["Color2"].default_value = (*dark, 1.0)
        nt.links.new(geo.outputs["Position"], wmap.inputs["Vector"])
        nt.links.new(wmap.outputs["Vector"], wchecker.inputs["Vector"])
        nt.links.new(wchecker.outputs["Color"], bsdf.inputs["Base Color"])
        nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
        return mat

    # Border tone: a darker wood-ish frame, related to the dark tile so it reads as one set.
    border = tuple(min(1.0, c * rng.uniform(0.6, 0.95)) for c in dark)
    # Inside-play mask: Chebyshev distance from centre (0.5) < frac -> 1 (checker), else 0 (border).
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coord.outputs["UV"], sep.inputs["Vector"])

    def _absdev(comp):
        sub = nt.nodes.new("ShaderNodeMath"); sub.operation = "SUBTRACT"
        sub.inputs[1].default_value = 0.5
        nt.links.new(sep.outputs[comp], sub.inputs[0])
        ab = nt.nodes.new("ShaderNodeMath"); ab.operation = "ABSOLUTE"
        nt.links.new(sub.outputs[0], ab.inputs[0])
        return ab

    du, dv = _absdev("X"), _absdev("Y")
    dmax = nt.nodes.new("ShaderNodeMath"); dmax.operation = "MAXIMUM"
    nt.links.new(du.outputs[0], dmax.inputs[0])
    nt.links.new(dv.outputs[0], dmax.inputs[1])
    inside = nt.nodes.new("ShaderNodeMath"); inside.operation = "LESS_THAN"
    inside.inputs[1].default_value = frac
    nt.links.new(dmax.outputs[0], inside.inputs[0])

    mix = nt.nodes.new("ShaderNodeMixRGB")
    mix.inputs["Color1"].default_value = (*border, 1.0)   # Fac 0 (outside) -> border
    nt.links.new(inside.outputs[0], mix.inputs["Fac"])
    nt.links.new(checker.outputs["Color"], mix.inputs["Color2"])  # Fac 1 (inside) -> checker
    nt.links.new(mix.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def randomize_world(rng):
    """Vary the surroundings BEYOND the board: world ambient (wide colour range) + a large ground
    plane ("table") with a random material, so edge/oblique crops see varied context, not one flat
    colour. Geometry/labels untouched — the board occludes the ground within the playing field."""
    world = bpy.context.scene.world
    if world and world.use_nodes:
        bg = world.node_tree.nodes.get("Background")
        if bg is not None:
            # NOTE: nur die FARBE wird hier gesetzt. Die STÄRKE gehört randomize_lights, das
            # pro View läuft und diesen Wert sonst überschreiben würde — genau daran ist eine
            # frühere Absenkung wirkungslos verpufft.
            bg.inputs[0].default_value = (rng.uniform(0.2, 1.0), rng.uniform(0.2, 1.0),
                                          rng.uniform(0.2, 1.0), 1.0)
    ground = bpy.data.objects.get("Ground")
    if ground is None:
        g = HALF * 6.0
        mesh = bpy.data.meshes.new("Ground")
        mesh.from_pydata([(-g, -g, -1.0), (g, -g, -1.0), (g, g, -1.0), (-g, g, -1.0)], [], [(0, 1, 2, 3)])
        mesh.update()
        ground = bpy.data.objects.new("Ground", mesh)
        bpy.context.scene.collection.objects.link(ground)
    # A random wood/solid table surface (not a checker — that would look like a second board).
    c = tuple(rng.uniform(0.15, 0.75) for _ in range(3))
    mat = make_wood_material("GroundMat", tuple(min(1.0, v * 1.3) for v in c), c)
    ground.data.materials.clear()
    ground.data.materials.append(mat)


def place_from_fen(
    fen,
    templates,
    base_z,
    rng,
    procedural_types=frozenset(),
    fallback_subsurf=1,
    placement_jitter=0.4,
    random_rotation=True,
    offsets=None,
):
    # offsets: {square_name -> (dx, dy)} world-unit shifts for individual pieces (nudge test).
    offsets = offsets or {}
    created = []
    for fi, ri, sym in parse_fen_placement(fen):
        color = "w" if sym.isupper() else "b"
        t = sym.upper()
        variants = templates.get((color, t))
        if not variants:
            continue
        # Random variant per square → visual diversity across the dataset.
        # rng ist random.Random — .integers() gibt es nur auf np.random.Generator (latenter
        # AttributeError, sobald ein Figurentyp mehrere Scan-Varianten hat).
        mesh = variants[0] if len(variants) == 1 else variants[rng.randrange(len(variants))]
        x, y = square_center(fi, ri)
        dx, dy = offsets.get(f"{chr(97 + fi)}{ri + 1}", (0.0, 0.0))
        o = bpy.data.objects.new(f"pc_{fi}{ri}", mesh)
        o.location = (
            x + dx + rng.uniform(-placement_jitter, placement_jitter),
            y + dy + rng.uniform(-placement_jitter, placement_jitter),
            base_z[t],
        )
        o.rotation_euler = (0, 0, rng.uniform(0, 2 * math.pi) if random_rotation else 0.0)
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


# Ziel-Bildanteil des Bretts (grösste Ausdehnung, 1.0 = Bildkante). Der Grund, warum das
# überhaupt geregelt wird: mit der festen 28-mm-Optik belegte das Brett nur ~39% der Bildbreite,
# also blieben pro Feld nur ~51 px echte Information, die der Ingest anschliessend auf 128 px
# Crops HOCHskaliert hat — während echte Aufnahmen aus ~200 px/Feld HERUNTERgerechnet werden.
# Genau die Feinheiten, die Springer/Läufer/Turm trennen, fehlten dadurch in den Trainingsdaten.
# 0.80 verdoppelt die lineare Auflösung und lässt trotzdem 20% Rand für Schräglage und den
# Crop-Überstand der Randfelder. ACHTUNG: geregelt wird die ACHSENPARALLELE Bounding-Box; das
# Brett ist zufällig in der Ebene rotiert, also ist die Brett-SEITE um bis zu √2 kürzer.
# Gemessen bei --res 1024: 79 px/Feld im Mittel (71 bei 45°, 102 achsenparallel) — NICHT die
# 102, die die arithmetische Obergrenze 1024*0.80/8 suggeriert.
BOARD_FRAME_FRAC = 0.80

_BASE_CAM_LENS: dict = {}   # Basis-Brennweite EINMAL merken — sonst multipliziert sich die
                            # Korrektur über die Frames auf (derselbe Fehler wie bei den Lichtern)


def frame_board(scene, cam, target_frac: float = BOARD_FRAME_FRAC):
    """Brennweite so setzen, dass das Brett `target_frac` des Bildes einnimmt — für DIESE Pose.

    Exakt statt geschätzt: die vier Brettecken werden mit der Basis-Brennweite projiziert, die
    grösste Abweichung von der Bildmitte gemessen und die Brennweite linear skaliert (Projektion
    ist proportional zur Brennweite). Damit bleibt die Rahmung konstant, obwohl Distanz-Jitter
    und Obliqueness pro View variieren — Perspektive/Lean bleiben also als Varianz erhalten,
    nur der Massstab wird stabilisiert. Die Maximum-Abweichung (statt Mittelwert) garantiert,
    dass auch bei Schräglage keine Ecke aus dem Bild fällt.
    """
    base = _BASE_CAM_LENS.setdefault(cam.name, cam.data.lens)
    if target_frac <= 0:                     # 0 = Rahmung aus (CLI-Versprechen) — NICHT lens=0
        cam.data.lens = base
        bpy.context.view_layer.update()
        return base
    cam.data.lens = base
    bpy.context.view_layer.update()          # Projektion braucht die aktualisierte Matrix

    w, h = scene.render.resolution_x, scene.render.resolution_y
    ext = 0.0
    for x, y in corners_px(scene, cam):
        ext = max(ext, abs(x - w / 2.0) / (w / 2.0), abs(y - h / 2.0) / (h / 2.0))
    if ext <= 1e-6:
        return base
    cam.data.lens = base * (target_frac / ext)
    bpy.context.view_layer.update()
    return cam.data.lens


# --- Prozeduraler Occluder-Arm (nur für die Move-Clip-Fixtures, siehe render_move_clip.py) ---
# Eine Hand/ein Unterarm, der über das Brett fährt: testet den Occlusion-Pfad des Trackers
# (Baseline-Census + Farb-Gamut-Veto, Move-vs-Hand-Arbitrierung) UND wirft einen bewegten
# Schatten (Schatten-vs-Occlusion-Klassifikation). Der Datensatz-Renderer (main()) nutzt ihn NICHT.
ARM_RADIUS = 4.5    # ~1.5 Zellen Durchmesser — überdeckt die bewegten Felder sicher
ARM_LENGTH = 55.0   # reicht von weit außerhalb (>±HALF) bis zur Brettmitte
ARM_Z = 13.0        # über der höchsten Figur (König ~8.8), unter der Kamera (~94)
# Hautton bewusst AUSSERHALB der braunen Brett-Gamut (heller + pinker): löst das
# Farb-Occlusion-Veto (Lab a*/b* + Sättigung) zuverlässig aus, statt als Schatten zu gelten.
ARM_SKIN = (0.86, 0.60, 0.50)


def make_occluder_material():
    mat = bpy.data.materials.new("OccluderSkin")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (*ARM_SKIN, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.5   # leicht glänzend → sichtbarer Schatten/Form
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def make_occluder_arm(rng=None):
    """Baut einen Unterarm+Faust-Mesh: Faust im lokalen Ursprung, Schaft entlang -X.
    `place_occluder(arm, x, y, angle)` setzt die Faust auf Brett-Koordinaten (x, y); der
    Arm reicht dann aus Richtung `angle` heran und trägt off-board hinaus. Initial verborgen."""
    import bmesh  # noqa: PLC0415 — nur im Blender-Prozess verfügbar
    from mathutils import Matrix  # noqa: PLC0415

    bm = bmesh.new()
    # Schaft: Zylinder entlang -X (Faust bei 0, Ellbogen bei -ARM_LENGTH).
    shaft = Matrix.Translation((-ARM_LENGTH / 2.0, 0.0, 0.0)) @ Matrix.Rotation(math.radians(90), 4, "Y")
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=24,
                          radius1=ARM_RADIUS, radius2=ARM_RADIUS, depth=ARM_LENGTH, matrix=shaft)
    # Faust: etwas dickere Kugel am Brett-Ende.
    bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=ARM_RADIUS * 1.3,
                              matrix=Matrix.Translation((0.0, 0.0, 0.0)))
    mesh = bpy.data.meshes.new("OccluderArm")
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = True
    obj = bpy.data.objects.new("OccluderArm", mesh)
    obj.data.materials.append(make_occluder_material())
    bpy.context.scene.collection.objects.link(obj)
    hide_occluder(obj)
    return obj


def place_occluder(arm, x, y, angle):
    """Faust auf Brett-Koordinate (x, y) (Einheiten wie square_center), Reach-Richtung `angle`."""
    arm.location = (x, y, ARM_Z)
    arm.rotation_euler = (0.0, 0.0, angle)
    arm.hide_render = False


def hide_occluder(arm):
    arm.hide_render = True
    arm.location = (0.0, 0.0, 1000.0)   # zusätzlich weit weg parken (Schatten-Sicherheit)


def _point_seg_dist(px, py, ax, ay, bx, by):
    """Kürzester Abstand Punkt (px,py) zu Segment (ax,ay)-(bx,by) in Brett-Einheiten."""
    dx, dy = bx - ax, by - ay
    seg2 = dx * dx + dy * dy
    if seg2 <= 1e-9:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / seg2))
    cx, cy = ax + t * dx, ay + t * dy
    return math.hypot(px - cx, py - cy)


def occluder_footprint(fist_x, fist_y, angle, reach=ARM_LENGTH):
    """Brett-Felder (Namen a1..h8), die vom Occluder (Faust + Unterarm-Schaft) verdeckt werden.

    Gibt (heavy, partial) zurück: `heavy` = Feld-Zentrum liegt UNTER dem soliden Mesh → Label
    `occluded`; `partial` = ein Zell-Ring weiter (Figur teilweise sichtbar) → Figur-Label behalten
    (Robustheit gegen leichte Verdeckung). Der Schaft läuft von der Faust in Richtung `angle`
    (lokales -X, um Z gedreht) nach außen — genau wie in place_occluder/make_occluder_arm.
    """
    fist_r = ARM_RADIUS * 1.3
    ex, ey = fist_x - reach * math.cos(angle), fist_y - reach * math.sin(angle)
    heavy, partial = set(), set()
    for fi in range(8):
        for ri in range(8):
            cx, cy = square_center(fi, ri)
            d_fist = math.hypot(cx - fist_x, cy - fist_y)
            d_shaft = _point_seg_dist(cx, cy, fist_x, fist_y, ex, ey)
            name = f"{chr(ord('a') + fi)}{ri + 1}"
            if d_fist < fist_r or d_shaft < ARM_RADIUS:
                heavy.add(name)
            elif d_fist < fist_r + CELL * 0.9 or d_shaft < ARM_RADIUS + CELL * 0.9:
                partial.add(name)
    return heavy, partial


def occluder_footprint_image(scene, cam, fist_x, fist_y, angle, reach=ARM_LENGTH, thr=0.30):
    """Squares the occluder actually hides IN THE RENDERED IMAGE (names a1..h8).

    The arm floats ARM_Z above the board, so under an oblique camera it covers squares OFFSET
    from its board-plane base (parallax) and the fat cylinder hides more than its thin axis. The
    board-plane `occluder_footprint` therefore mislabels: squares the hand really hides in the
    photo keep their piece label, so the crop shows arm/skin pixels tagged as that piece and the
    type head learns garbage. Here we project the arm (at its true height ARM_Z) AND each square's
    cell into image space via the same camera as corners_px, and label a square `occluded` only
    when the arm covers >= `thr` of the cell's projected area — matching what the square CROP sees.
    """
    rx, ry = scene.render.resolution_x, scene.render.resolution_y

    def _px(x, y, z):
        co = world_to_camera_view(scene, cam, Vector((x, y, z)))
        return (co.x * rx, (1.0 - co.y) * ry)

    # Arm silhouette: samples from fist to elbow at height ARM_Z, each with a projected pixel radius.
    arm = []
    n = 40
    for i in range(n + 1):
        t = reach * i / n
        ax = fist_x - t * math.cos(angle)
        ay = fist_y - t * math.sin(angle)
        r_world = ARM_RADIUS * 1.3 if t <= ARM_RADIUS else ARM_RADIUS   # fatter fist near the board
        cx, cy = _px(ax, ay, ARM_Z)
        ex, ey = _px(ax + r_world, ay, ARM_Z)
        r_px = math.hypot(ex - cx, ey - cy)
        arm.append((cx, cy, r_px * r_px))

    grid = (-0.8, -0.4, 0.0, 0.4, 0.8)      # 5x5 sample points across each cell
    half = CELL / 2.0
    occluded = []
    for fi in range(8):
        for ri in range(8):
            bx, by = square_center(fi, ri)
            covered = 0
            for gx in grid:
                for gy in grid:
                    sx, sy = _px(bx + gx * half, by + gy * half, 0.0)
                    if any((sx - ax) ** 2 + (sy - ay) ** 2 < r2 for ax, ay, r2 in arm):
                        covered += 1
            if covered >= thr * len(grid) * len(grid):
                occluded.append(f"{chr(ord('a') + fi)}{ri + 1}")
    return occluded


# --- Schatten-Werfer (nur für den dedizierten Shadow-Sweep-Fixture) ---------------------
# Ein neutraler Balken hoch über dem Brett + eine schräge Sonne: sein WEICHER Schatten
# wandert quer übers Brett, während der Balken selbst neben dem sichtbaren Spielfeld
# bleibt. Die assertierten Felder sehen nur den Schatten (flaches, census-invariantes
# Abdunkeln → Shadow-Veto), KEINEN Chroma-Occluder. Testet den Schatten-vs-Zug-Pfad rein.
SHADOW_Z = 22.0             # hoch → langer, weicher Schlagschatten
SHADOW_SUN_TILT = 52.0      # Grad aus der Senkrechten (um Y): Schatten zieht in +X
SHADOW_CASTER_GREY = (0.05, 0.05, 0.055)


def setup_shadow_light():
    """Add a fixed, angled sun so a raised caster throws a long directional shadow across the
    board (existing scene lights are near-overhead → shadow directly under the caster)."""
    sun = bpy.data.objects.get("ShadowSun")
    if sun is None:
        data = bpy.data.lights.new("ShadowSun", type="SUN")
        sun = bpy.data.objects.new("ShadowSun", data)
        bpy.context.scene.collection.objects.link(sun)
    sun.data.energy = 4.0
    sun.data.angle = math.radians(2.0)      # small angular size → soft-ish but defined shadow
    sun.rotation_euler = (0.0, math.radians(SHADOW_SUN_TILT), 0.0)
    return sun


def make_shadow_caster():
    """A neutral dark bar spanning the file (Y) axis, parked high above the board. Only its
    shadow reaches the squares; swept in X the shadow band crosses the board. Initially hidden."""
    import bmesh  # noqa: PLC0415
    from mathutils import Matrix  # noqa: PLC0415

    bm = bmesh.new()
    # Bar along Y (files), ~ board-wide, so its shadow is a rank-spanning band.
    bar = Matrix.Rotation(math.radians(90), 4, "X")   # cone default +Z → align to Y
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=16,
                          radius1=2.6, radius2=2.6, depth=54.0, matrix=bar)
    mesh = bpy.data.meshes.new("ShadowCaster")
    bm.to_mesh(mesh)
    bm.free()
    mat = bpy.data.materials.new("ShadowCasterMat")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (*SHADOW_CASTER_GREY, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.9
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    mesh.materials.append(mat)
    obj = bpy.data.objects.new("ShadowCaster", mesh)
    bpy.context.scene.collection.objects.link(obj)
    hide_shadow_caster(obj)
    return obj


def place_shadow_caster(caster, x, y=0.0):
    caster.location = (x, y, SHADOW_Z)
    caster.hide_render = False


def hide_shadow_caster(caster):
    caster.hide_render = True
    caster.location = (0.0, 0.0, 1000.0)


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
    # JPEG q90 statt PNG: ~5x kleinere Roh-Renders UND naeher an der Domaene der echten Kamera
    # (die Webcam liefert JPEG-komprimierte Frames — verlustfreie PNGs sind unrealistisch sauber).
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 90
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
    dist_jitter = ra.cam_distance_jitter
    occ_p = ra.occlusion_p
    # Occluder-Arm (Faust+Unterarm) EINMAL bauen, verborgen; pro View mit occ_p eingeblendet.
    # EEVEE-Schatten sind an → der Occluder wirft automatisch einen Schatten (User-Anforderung).
    occ_arm = make_occluder_arm(rng) if occ_p > 0 else None
    print(f"[v2] engine={eng}, samples={ra.samples}, views_per_scene={views}, "
          f"max_obliqueness={max_ob}, cam_distance_jitter={dist_jitter}, occlusion_p={occ_p}, "
          f"fens={len(fens)}")

    # Szene = eine Figurenaufstellung, EINMAL gebaut; darüber `views` Kamera/Licht-Varianten.
    i = 0
    scene_idx = 0
    while i < n:
        fen = fens[scene_idx % len(fens)] if fens else "8/8/8/8/8/8/8/8"
        pieces = place_from_fen(fen, templates, base_z, rng, procedural_types, fb_subsurf)
        if ra.randomize_board:
            randomize_board(rng, ra.borderless_p, ra.isolate_p)   # new board per scene; some borderless (anti edge-shortcut)
        if ra.randomize_world:
            randomize_world(rng)   # varied surroundings beyond the board (edge/oblique crops)

        for _ in range(views):
            if i >= n:
                break
            cam_meta = place_camera(cam, rng, max_ob, dist_jitter)
            # Rahmung NACH der Pose: Distanz/Obliqueness variieren pro View, die Brennweite
            # zieht nach, damit das Brett konstant gross im Bild steht (Auflösung/Feld).
            cam_meta["lens_mm"] = round(frame_board(scene, cam, ra.frame_frac), 2)
            if not ra.probe:
                randomize_lights(rng)
                randomize_piece_materials(rng)   # Kronen-/Farbvarianz pro View (bQ→wQ-Flip)

            # Occluder: pro View mit occ_p eine Faust/Unterarm über ein Brett-Innenfeld legen.
            # Verdeckte Felder → occluded_squares (heavy). Der Occluder wirft einen echten Schatten.
            occluded_sq: list[str] = []
            if occ_arm is not None and rng.random() < occ_p:
                tfi, tri = rng.randint(1, 6), rng.randint(1, 6)   # Innenfeld, wo eine Hand hinreicht
                fx, fy = square_center(tfi, tri)
                fx += rng.uniform(-CELL / 2, CELL / 2)
                fy += rng.uniform(-CELL / 2, CELL / 2)
                angle = rng.uniform(0, 2 * math.pi)
                place_occluder(occ_arm, fx, fy, angle)
                # Label the squares the arm actually hides IN THE IMAGE (parallax-correct), not
                # its board-plane base — otherwise hand-covered squares keep their piece label.
                occluded_sq = sorted(occluder_footprint_image(scene, cam, fx, fy, angle))
            elif occ_arm is not None:
                hide_occluder(occ_arm)

            scene.render.filepath = str((out_dir / f"{i:06d}.jpg").resolve())
            bpy.ops.render.render(write_still=True)
            corners = corners_px(scene, cam)
            (out_dir / f"{i:06d}.json").write_text(
                json.dumps({"fen": fen, "corners": corners, "occluded_squares": occluded_sq,
                            "cam": cam_meta}))
            in_frame = all(0 <= c[0] <= scene.render.resolution_x and 0 <= c[1] <= scene.render.resolution_y for c in corners)
            print(f"[v2] {i+1}/{n} scene={scene_idx} pieces={len(pieces)} "
                  f"corners_in_frame={in_frame} occluded={len(occluded_sq)}")
            i += 1

        for o in pieces:
            bpy.data.objects.remove(o, do_unlink=True)
        scene_idx += 1
    print("[v2] DONE")


if __name__ == "__main__":
    main()
