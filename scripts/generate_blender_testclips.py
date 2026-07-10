"""Generate compact deterministic move-recognition regression clips with Blender.

The generated MP4 and manifest live in ``tests/data/testclips`` and can be replayed
with ``uv run pytest -m clips``. Blender renders one stable image per position;
OpenCV repeats those images using fixed video timestamps so the test remains small.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

import chess
import cv2
import yaml

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BLENDER = Path(r"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe")
START_FEN = chess.STARTING_FEN
SCENARIOS = {
    "opening": ["d2d4", "e7e5", "b1c3"],
    "capture": ["e2e4", "d7d5", "e4d5"],
}


def positions_and_san(moves: list[str], start_fen: str = START_FEN) -> tuple[list[str], list[str]]:
    board = chess.Board(start_fen)
    positions = [board.fen()]
    sans: list[str] = []
    for uci in moves:
        move = chess.Move.from_uci(uci)
        if move not in board.legal_moves:
            raise ValueError(f"illegal scenario move {uci} for {board.fen()}")
        sans.append(board.san(move))
        board.push(move)
        positions.append(board.fen())
    return positions, sans


def assemble_video(images: list[Path], out: Path, fps: int, initial_hold_s: float, hold_s: float) -> None:
    first = cv2.imread(str(images[0]))
    if first is None:
        raise RuntimeError(f"cannot read Blender output {images[0]}")
    height, width = first.shape[:2]
    writer = cv2.VideoWriter(str(out), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
    if not writer.isOpened():
        raise RuntimeError("OpenCV mp4v VideoWriter is unavailable")
    try:
        for index, path in enumerate(images):
            frame = first if index == 0 else cv2.imread(str(path))
            if frame is None:
                raise RuntimeError(f"cannot read Blender output {path}")
            seconds = initial_hold_s if index == 0 else hold_s
            for _ in range(max(1, round(seconds * fps))):
                writer.write(frame)
    finally:
        writer.release()


def generate(args: argparse.Namespace) -> Path:
    moves = SCENARIOS[args.scenario]
    positions, sans = positions_and_san(moves)
    out_dir = args.out.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    clip_name = f"blender-{args.scenario}.mp4"

    temp_root = ROOT / ".tmp"
    temp_root.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="chesslab-blender-clip-", dir=temp_root) as tmp_name:
        tmp = Path(tmp_name)
        spec = tmp / "spec.json"
        spec.write_text(json.dumps({"positions": positions}, indent=2), encoding="utf-8")
        render_out = tmp / "renders"
        cmd = [
            str(args.blender),
            "--background",
            str((ROOT / "synth_assets" / "Chess Scene.blend").resolve()),
            "--python",
            str((ROOT / "synth" / "render_move_clip.py").resolve()),
            "--",
            "--spec",
            str(spec),
            "--out",
            str(render_out),
            "--res",
            str(args.res),
            "--samples",
            str(args.samples),
            "--seed",
            str(args.seed),
            "--board-texture",
            str((ROOT / "synth_pieces" / "board_texture.png").resolve()),
        ]
        subprocess.run(cmd, check=True, cwd=ROOT)
        images = sorted(render_out.glob("position_*.png"))
        if len(images) != len(positions):
            raise RuntimeError(f"Blender rendered {len(images)} of {len(positions)} positions")
        assemble_video(images, out_dir / clip_name, args.fps, args.initial_hold, args.hold)
        metadata = json.loads((render_out / "render_metadata.json").read_text(encoding="utf-8"))

    manifest_path = out_dir / "manifest.yaml"
    manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    clips = [entry for entry in manifest.get("clips", []) if entry.get("file") != clip_name]
    clips.append(
        {
            "file": clip_name,
            "source": "blender",
            "start_fen": START_FEN,
            "erwartete_zugliste": sans,
            "corners": metadata["corners"],
            "frame_size": metadata["frame_size"],
            "board_size": metadata["board_size"],
            # The existing synthetic board texture has no explicit painted grid lines.
            # Keep the production default intact, but disable that camera-specific gate
            # for this fixture; move scoring, motion, legality and confirmation still run.
            "tracker": {
                "confirm_frames": 2,
                "min_grid_line_coverage": 0.0,
                # The fixture camera is nearly perpendicular, so tall-piece overhang
                # would leak destination evidence into the neighboring rank.
                "overhang": 0.0,
            },
        },
    )
    manifest_path.write_text(yaml.safe_dump({"clips": clips}, sort_keys=False), encoding="utf-8")
    return out_dir / clip_name


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--scenario", choices=sorted(SCENARIOS), default="opening")
    ap.add_argument("--out", type=Path, default=ROOT / "tests" / "data" / "testclips")
    ap.add_argument("--blender", type=Path, default=DEFAULT_BLENDER)
    ap.add_argument("--res", type=int, default=640)
    ap.add_argument("--fps", type=int, default=12)
    ap.add_argument("--initial-hold", type=float, default=2.0)
    ap.add_argument("--hold", type=float, default=1.5)
    ap.add_argument("--samples", type=int, default=8)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()
    if not args.blender.exists() and shutil.which(str(args.blender)) is None:
        raise SystemExit(f"Blender not found: {args.blender}")
    print(generate(args))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
