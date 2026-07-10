"""Render the stable positions of one deterministic move-replay clip in Blender.

The host-side ``scripts/generate_blender_testclips.py`` creates the JSON spec,
invokes this script, and assembles the rendered positions into a compact MP4.
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
    board_render.place_camera(cam, rng, max_obliqueness=0.0)
    board_render.randomize_lights(rng)

    for index, fen in enumerate(spec["positions"]):
        pieces = board_render.place_from_fen(
            fen,
            templates,
            base_z,
            rng,
            procedural_types=procedural,
            fallback_subsurf=0,
            placement_jitter=0.0,
            random_rotation=False,
        )
        scene.render.filepath = str((args.out / f"position_{index:03d}.png").resolve())
        bpy.ops.render.render(write_still=True)
        for obj in pieces:
            bpy.data.objects.remove(obj, do_unlink=True)

    # Projection before Blender's first render can observe a stale evaluated camera
    # transform from the source .blend. Rendering updates the dependency graph.
    corners = board_render.corners_px(scene, cam)
    metadata = {
        "corners": corners,
        "frame_size": [args.res, args.res],
        "board_size": args.res,
    }
    (args.out / "render_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
