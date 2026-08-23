"""Render the frames of one deterministic move-replay clip in Blender.

The host-side ``scripts/generate_blender_testclips.py`` builds the JSON spec (a flat
list of frames: which position to show and where the occluder arm sits), invokes this
script, and assembles the rendered frames into a compact MP4.

Spec format::

    {
      "positions": ["<fen0>", "<fen1>", ...],       # one FEN per stable position
      "moves_uci": ["e2e4", ...],                   # for the label sidecar
      "frames": [
        {"fen_index": 0, "arm": null,               # clear frame (no occluder)
         "phase": "clear"},
        {"fen_index": 0, "arm": [x, y, angle],      # occluder sweeping in over the board
         "phase": "occluding"},
        ...
      ]
    }

Each frame is a single render. The arm (a skin-toned forearm+fist, see
``render_board_v2.make_occluder_arm``) is placed on board coordinates ``(x, y)`` with
reach direction ``angle`` (radians) when ``arm`` is given, otherwise hidden.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

import bpy

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import render_board_v2 as board_render  # noqa: E402


def _args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    ap.add_argument("--spec", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--res", type=int, default=640)
    ap.add_argument("--samples", type=int, default=8)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--pieces", type=Path)
    ap.add_argument("--board-texture", type=Path)
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    return ap.parse_args(argv)


def main() -> None:
    args = _args()
    spec = json.loads(args.spec.read_text(encoding="utf-8"))
    args.out.mkdir(parents=True, exist_ok=True)
    rng = random.Random(args.seed)

    scene = bpy.context.scene
    board_render.set_engine_fast(args.samples)
    scene.render.resolution_x = args.res
    scene.render.resolution_y = args.res
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.use_persistent_data = True
    try:
        scene.view_settings.view_transform = "Standard"
    except (AttributeError, TypeError):
        pass

    pieces_dir = str(args.pieces) if args.pieces and args.pieces.exists() else None
    board_texture = str(args.board_texture) if args.board_texture and args.board_texture.exists() else None
    templates, base_z, procedural = board_render.build_templates(pieces_dir)
    board_render.style_board_v2(board_texture)
    cam = board_render.setup_camera()
    # Perfectly top-down (obliqueness 0): tall pieces project onto their true base cell, so a
    # pawn on e4 does not lean into e3. A tilted camera makes the move tracker read the wrong
    # rank; the deterministic fixture wants the geometry unambiguous. Real footage is oblique —
    # that robustness is a live-tuning concern, not what these regression clips assert.
    board_render.place_camera(cam, rng, max_obliqueness=0.0)
    board_render.randomize_lights(rng)
    arm = board_render.make_occluder_arm()

    positions = spec["positions"]
    frames = spec["frames"]
    # Shadow caster + angled sun only exist for clips that use them (keeps normal clips' lighting).
    uses_shadow = any(fr.get("shadow") is not None for fr in frames)
    caster = None
    if uses_shadow:
        board_render.setup_shadow_light()
        caster = board_render.make_shadow_caster()

    frame_labels = []
    for index, fr in enumerate(frames):
        fen = positions[fr["fen_index"]]
        nudge = {sq: tuple(v) for sq, v in (fr.get("nudge") or {}).items()}
        pieces = board_render.place_from_fen(
            fen,
            templates,
            base_z,
            rng,
            procedural_types=procedural,
            fallback_subsurf=0,
            placement_jitter=0.0,
            random_rotation=False,
            offsets=nudge,
        )
        occluded = fr.get("arm") is not None
        if occluded:
            board_render.place_occluder(arm, *fr["arm"])
        else:
            board_render.hide_occluder(arm)
        shadow = fr.get("shadow")
        if caster is not None:
            if shadow is not None:
                board_render.place_shadow_caster(caster, *shadow)
            else:
                board_render.hide_shadow_caster(caster)
        scene.render.filepath = str((args.out / f"position_{index:03d}.png").resolve())
        bpy.ops.render.render(write_still=True)
        frame_labels.append({
            "index": index,
            "phase": fr.get("phase", "occluding" if occluded else "clear"),
            "occluded": occluded,
            "shadow": shadow is not None,
            "nudged": bool(nudge),
            "position_index": fr["fen_index"],
        })
        for obj in pieces:
            bpy.data.objects.remove(obj, do_unlink=True)

    # Projection before Blender's first render can observe a stale evaluated camera
    # transform from the source .blend. Rendering updates the dependency graph.
    corners = board_render.corners_px(scene, cam)
    metadata = {
        "corners": corners,
        "frame_size": [args.res, args.res],
        "board_size": args.res,
        "frame_labels": frame_labels,
    }
    (args.out / "render_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
