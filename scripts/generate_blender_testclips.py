"""Generate deterministic move-recognition regression clips with Blender.

For a known move sequence this renders one frame per scheduled step — stable "clear"
frames plus a skin-toned occluder arm sweeping over the board on every move — assembles
them into a compact MP4, and auto-labels everything from ``python-chess``:

* ``erwartete_zugliste`` (SAN) in the manifest is the replay assertion target,
* ``<clip>.labels.json`` carries the full ground truth (start FEN, UCI + SAN, the FEN of
  every position, and a per-frame occluded/position label).

The generated MP4 + manifest live in ``tests/data/testclips`` and replay with
``uv run pytest -m clips``. The occluder exercises the tracker's occlusion path
(baseline census + colour-gamut veto, move-vs-hand arbitration) and its moving shadow the
shadow-vs-occlusion classification — the move must still be recovered once the board clears.
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import tempfile
from pathlib import Path

import chess
import chess.pgn
import cv2
import yaml

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BLENDER = Path(r"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe")
DEFAULT_PIECES = ROOT / "synth_pieces"
START_FEN = chess.STARTING_FEN

# Board geometry — MUST match synth/render_board_v2.py (CELL/HALF/square_center). Replicated
# host-side because that module imports bpy and can only run inside Blender.
CELL = 6.0
HALF = 24.0

# Named scenarios. Each is {"moves": [uci...], "start_fen"?, "hovers"?, "jitter"?}:
#   hovers: position indices at which a hand sweeps over the board WITHOUT moving anything
#           (a phantom-move negative test — the tracker must recover only the real moves).
#   jitter: amplitude (board units) of per-frame arm tremble (non-smooth motion robustness).
SCENARIOS: dict[str, dict] = {
    "opening": {"moves": ["d2d4", "e7e5", "b1c3"]},
    "capture": {"moves": ["e2e4", "d7d5", "e4d5"]},
    "castle": {"moves": ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "e1g1"]},
    "enpassant": {"moves": ["e2e4", "a7a6", "e4e5", "d7d5", "e5d6"]},
    "promotion": {"moves": ["e7e8q"], "start_fen": "6k1/4P3/8/8/8/8/8/6K1 w - - 0 1"},
    # Unusual clips ------------------------------------------------------------------
    "hover": {"moves": [], "hovers": [0]},                       # hand passes, nothing moves -> []
    "phantom": {"moves": ["e2e4", "e7e5"], "hovers": [1]},       # hover between two real moves
    "jitter": {"moves": ["d2d4", "d7d5", "g1f3"], "jitter": 1.2},  # trembling hand during moves
    # Longer sequences (sustained tracking: drift, repeated occlusion, mid-game castling,
    # captures, checkmate). Famous games so the moves are easy to verify by eye.
    "scholars": {"moves": ["e2e4", "e7e5", "f1c4", "b8c6", "d1h5", "g8f6", "h5f7"]},  # Qxf7#
    "italian": {"moves": ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "c2c3", "g8f6",
                          "d2d3", "d7d6", "e1g1", "e8g8", "b1d2", "a7a6", "c4b3"]},
    "opera": {"moves": [  # Morphy, Paris Opera 1858 — ends 17.Rd8#
        "e2e4", "e7e5", "g1f3", "d7d6", "d2d4", "c8g4", "d4e5", "g4f3", "d1f3", "d6e5",
        "f1c4", "g8f6", "f3b3", "d8e7", "b1c3", "c7c6", "c1g5", "b7b5", "c3b5", "c6b5",
        "c4b5", "b8d7", "e1c1", "a8d8", "d1d7", "d8d7", "h1d1", "e7e6", "b5d7", "f6d7",
        "b3b8", "d7b8", "d1d8"]},
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


def _square_world(square: int) -> tuple[float, float]:
    """python-chess square -> (x, y) world coordinate, matching render_board_v2.square_center:
    file a..h -> Y axis, rank 1..8 -> X axis."""
    fi = chess.square_file(square)   # 0..7 (a..h)
    ri = chess.square_rank(square)   # 0..7 (rank 1..8)
    return (-21.0 + CELL * ri, -21.0 + CELL * fi)


def build_schedule(positions: list[str], moves: list[str], *, sweep_frames: int,
                   fps: int, initial_hold_s: float, hold_s: float, sweep_hold: int,
                   hovers: set[int] | None = None, jitter: float = 0.0,
                   seed: int = 42) -> list[dict]:
    """Frame schedule: an initial clear reference, then per move a clear hold plus an arm
    sweep (in over the board, piece teleports under the fist at the apex, out again). Positions
    listed in ``hovers`` also get a no-move sweep over the board centre (phantom-move test).
    ``jitter`` trembles the arm per frame. Each frame carries ``hold`` = video frames written."""
    import random  # noqa: PLC0415 — local, deterministic per seed
    rng = random.Random(seed)
    hovers = hovers or set()
    frames: list[dict] = []
    s = max(1, sweep_frames)
    hold_frames = max(1, round(hold_s * fps))

    def add(fen_index: int, arm, phase: str, hold: int) -> None:
        frames.append({"fen_index": fen_index, "arm": arm, "phase": phase, "hold": hold})

    def sweep(before_idx: int, after_idx: int, target, entry, angle) -> None:
        """One arm pass: approach entry->target (apex switches the position to ``after_idx``),
        then retract target->entry. before_idx == after_idx is a no-move hover."""
        def jit(v):
            return v + rng.uniform(-jitter, jitter) if jitter else v
        for k in range(s):     # approach
            t = (k + 1) / s
            ax = entry[0] + (target[0] - entry[0]) * t
            ay = entry[1] + (target[1] - entry[1]) * t
            apex = k == s - 1
            add(after_idx if apex else before_idx, [jit(ax), jit(ay), angle], "occluding", sweep_hold)
        for k in range(s):     # retract
            t = (k + 1) / s
            ax = target[0] + (entry[0] - target[0]) * t
            ay = target[1] + (entry[1] - target[1]) * t
            add(after_idx, [jit(ax), jit(ay), angle], "occluding", sweep_hold)

    def hover_at(idx: int) -> None:
        """A hand sweeps across the board centre without moving anything."""
        sweep(idx, idx, target=(0.0, 0.0), entry=(-HALF - 12.0, 0.0), angle=0.0)
        add(idx, None, "clear", hold_frames)

    add(0, None, "clear", max(1, round(initial_hold_s * fps)))   # base-truth reference
    if 0 in hovers:
        hover_at(0)
    for i, uci in enumerate(moves):
        mv = chess.Move.from_uci(uci)
        fx, fy = _square_world(mv.from_square)
        tx, ty = _square_world(mv.to_square)
        target = ((fx + tx) / 2.0, (fy + ty) / 2.0)
        # Reach from the mover's side (white from -X/near, black from +X/far) so the forearm
        # trails off-board; the fist covers the moved squares at the apex.
        mover_white = chess.Board(positions[i]).turn == chess.WHITE
        entry = (-HALF - 12.0, target[1]) if mover_white else (HALF + 12.0, target[1])
        angle = 0.0 if mover_white else math.pi
        sweep(i, i + 1, target, entry, angle)
        add(i + 1, None, "clear", hold_frames)   # clear board -> move detected here
        if (i + 1) in hovers:
            hover_at(i + 1)
    return frames


def assemble_video(images: list[Path], frames: list[dict], out: Path, fps: int) -> None:
    first = cv2.imread(str(images[0]))
    if first is None:
        raise RuntimeError(f"cannot read Blender output {images[0]}")
    height, width = first.shape[:2]
    writer = cv2.VideoWriter(str(out), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
    if not writer.isOpened():
        raise RuntimeError("OpenCV mp4v VideoWriter is unavailable")
    try:
        for index, (path, fr) in enumerate(zip(images, frames, strict=True)):
            frame = first if index == 0 else cv2.imread(str(path))
            if frame is None:
                raise RuntimeError(f"cannot read Blender output {path}")
            for _ in range(max(1, int(fr["hold"]))):
                writer.write(frame)
    finally:
        writer.release()


def resolve_moves(args: argparse.Namespace) -> dict:
    """Resolve {moves, start_fen, stem, hovers, jitter} from --pgn / --moves / --scenario.
    CLI --hovers/--jitter override the scenario defaults."""
    if args.pgn:
        with open(args.pgn, encoding="utf-8") as fh:
            game = chess.pgn.read_game(fh)
        if game is None:
            raise SystemExit(f"no game found in {args.pgn}")
        board = game.board()
        cfg = {"moves": [m.uci() for m in game.mainline_moves()], "start_fen": board.fen(),
               "stem": args.name or Path(args.pgn).stem}
    elif args.moves:
        cfg = {"moves": args.moves.split(), "start_fen": args.start_fen or START_FEN,
               "stem": args.name or "custom"}
    else:
        scenario = SCENARIOS[args.scenario]
        cfg = {"moves": scenario["moves"],
               "start_fen": args.start_fen or scenario.get("start_fen") or START_FEN,
               "stem": args.name or args.scenario,
               "hovers": scenario.get("hovers"), "jitter": scenario.get("jitter", 0.0)}
    if args.hovers is not None:
        cfg["hovers"] = [int(x) for x in args.hovers.split(",") if x.strip() != ""]
    if args.jitter is not None:
        cfg["jitter"] = args.jitter
    cfg.setdefault("hovers", None)
    cfg.setdefault("jitter", 0.0)
    return cfg


def generate(args: argparse.Namespace) -> Path:
    cfg = resolve_moves(args)
    moves, start_fen, stem = cfg["moves"], cfg["start_fen"], cfg["stem"]
    positions, sans = positions_and_san(moves, start_fen)
    frames = build_schedule(positions, moves, sweep_frames=args.sweep_frames, fps=args.fps,
                            initial_hold_s=args.initial_hold, hold_s=args.hold,
                            sweep_hold=args.sweep_hold,
                            hovers=set(cfg["hovers"]) if cfg["hovers"] else None,
                            jitter=cfg["jitter"], seed=args.seed)
    out_dir = args.out.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    clip_name = f"blender-{stem}.mp4"

    temp_root = ROOT / ".tmp"
    temp_root.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="chesslab-blender-clip-", dir=temp_root) as tmp_name:
        tmp = Path(tmp_name)
        spec = tmp / "spec.json"
        spec.write_text(json.dumps({"positions": positions, "moves_uci": moves,
                                    "frames": frames}, indent=2), encoding="utf-8")
        render_out = tmp / "renders"
        cmd = [
            str(args.blender),
            "--background",
            str((ROOT / "synth_assets" / "Chess Scene.blend").resolve()),
            "--python",
            str((ROOT / "synth" / "render_move_clip.py").resolve()),
            "--",
            "--spec", str(spec),
            "--out", str(render_out),
            "--res", str(args.res),
            "--samples", str(args.samples),
            "--seed", str(args.seed),
            "--board-texture", str((ROOT / "synth_pieces" / "board_texture.png").resolve()),
        ]
        if args.pieces and Path(args.pieces).exists():
            cmd += ["--pieces", str(Path(args.pieces).resolve())]
        subprocess.run(cmd, check=True, cwd=ROOT)
        images = sorted(render_out.glob("position_*.png"))
        if len(images) != len(frames):
            raise RuntimeError(f"Blender rendered {len(images)} of {len(frames)} frames")
        assemble_video(images, frames, out_dir / clip_name, args.fps)
        metadata = json.loads((render_out / "render_metadata.json").read_text(encoding="utf-8"))

    # Full ground-truth sidecar: usable for debugging and (per-frame occlusion) as labels.
    frame_labels = [{**lbl, "hold": fr["hold"], "fen": positions[fr["fen_index"]]}
                    for lbl, fr in zip(metadata["frame_labels"], frames, strict=True)]
    labels = {
        "clip": clip_name, "start_fen": start_fen, "moves_uci": moves, "san": sans,
        "positions_fen": positions, "corners": metadata["corners"],
        "frame_size": metadata["frame_size"], "board_size": metadata["board_size"],
        "fps": args.fps, "frame_labels": frame_labels,
    }
    (out_dir / f"{Path(clip_name).stem}.labels.json").write_text(
        json.dumps(labels, indent=2), encoding="utf-8")

    manifest_path = out_dir / "manifest.yaml"
    manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    clips = [entry for entry in (manifest or {}).get("clips", []) if entry.get("file") != clip_name]
    clips.append(
        {
            "file": clip_name,
            "source": "blender",
            "occlusion": True,
            "start_fen": start_fen,
            "erwartete_zugliste": sans,
            "positions": positions,
            "moves_uci": moves,
            "corners": metadata["corners"],
            "frame_size": metadata["frame_size"],
            "board_size": metadata["board_size"],
            # The synthetic board texture has no painted grid lines, so the grid-line gate is
            # off for this fixture; occlusion is exercised via the census + colour-gamut veto
            # (the skin arm is a chroma outlier). Move scoring, motion, legality and
            # confirmation still run. Near-perpendicular camera => no tall-piece overhang.
            "tracker": {
                "confirm_frames": 2,
                "min_grid_line_coverage": 0.0,
                "overhang": 0.0,
                # The scanned cream pieces on the light board squares change little
                # structurally, so at the default census_thr (160) a light piece landing on a
                # light square reads as a cast shadow and drops out of the move evidence. A
                # lower structural threshold keeps low-contrast fills as real changes.
                "census_thr": 40.0,
            },
        },
    )
    manifest_path.write_text(yaml.safe_dump({"clips": clips}, sort_keys=False), encoding="utf-8")
    return out_dir / clip_name


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--scenario", choices=sorted(SCENARIOS), default="opening")
    ap.add_argument("--moves", help="space-separated UCI moves (overrides --scenario)")
    ap.add_argument("--pgn", type=Path, help="PGN file; first game's mainline (overrides --scenario)")
    ap.add_argument("--start-fen", dest="start_fen", help="start position FEN (default: standard)")
    ap.add_argument("--name", help="clip name stem (default: scenario / pgn stem / 'custom')")
    ap.add_argument("--hovers", help="comma-separated position indices to insert a no-move "
                    "hand sweep at (phantom-move test)")
    ap.add_argument("--jitter", type=float, help="per-frame arm tremble amplitude (board units)")
    ap.add_argument("--out", type=Path, default=ROOT / "tests" / "data" / "testclips")
    ap.add_argument("--blender", type=Path, default=DEFAULT_BLENDER)
    ap.add_argument("--pieces", type=Path, default=DEFAULT_PIECES,
                    help="scanned piece meshes dir (default: synth_pieces)")
    ap.add_argument("--res", type=int, default=640)
    ap.add_argument("--fps", type=int, default=12)
    ap.add_argument("--initial-hold", type=float, default=2.0)
    ap.add_argument("--hold", type=float, default=1.5)
    ap.add_argument("--sweep-frames", type=int, default=4, help="arm frames per sweep direction")
    ap.add_argument("--sweep-hold", type=int, default=2, help="video frames each sweep frame is held")
    ap.add_argument("--samples", type=int, default=8)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()
    if not args.blender.exists() and shutil.which(str(args.blender)) is None:
        raise SystemExit(f"Blender not found: {args.blender}")
    print(generate(args))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
