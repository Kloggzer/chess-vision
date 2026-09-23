"""Which straightening actually takes the barrel out of a board — mesh, lens, both, or neither?

Two mechanisms answer that question in this repo and neither was ever measured against the other:
the LENS model (fitted per recording from the board's grooves, `:desktop undistort`) and the GRID
MESH (18 lines measured per frame, `grid_lines`). Both are only half wired up, so the bow a crop
carries today depends on which verb cut it.

The ruler is `grid_lines_with_curvature`'s `c` — the bow the pooled LINEAR fit cannot carry, in
warped pixels. `square_offsets` cannot decide this: it fits STRAIGHT lines to the grooves, so a bow
lands in its residual and never in its verdict. That is the ruler that buried undistort-first in
specs/30, and using it again would repeat the mistake.

Frames are reported in two groups because the answer differs between them. A hand over the grooves
moves single lines, so a hand frame's OWN mesh can leave the board worse than no mesh; and the
frames that carry no mesh at all are hand frames without exception (1 116 of 7 344, measured
2026-08-21). Those are exactly the frames the occlusion labels are made of.

Every arm is held out from what produced it: the lens is fitted by Kotlin from the video's HEAD
frames, and `mesh-session` is a leave-one-out median so no frame is straightened by itself.

    uv run python scripts/straighten_ab.py data/recordings/<name> --emit-frames tmp/f.txt
    android/desktop/build/install/desktop/bin/desktop.bat undistort <video> tmp/undist frames=tmp/f.txt
    uv run python scripts/straighten_ab.py data/recordings/<name> --undist tmp/undist
"""

from __future__ import annotations

import argparse
import contextlib
import json
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from chesslab import config  # noqa: E402
from chesslab.alignment import grid_lines_with_curvature, improve_quad, warp_for_grid  # noqa: E402
from chesslab.calibration import (  # noqa: E402
    CalibrationProfile,
    CropParams,
    compute_homography,
    mesh_from_lines,
    pooled_mesh,
    straighten_board,
)
from chesslab.ioutil import read_jsonl  # noqa: E402
from chesslab.realgames.decode import detect_rotation  # noqa: E402
from chesslab.realgames.mesh import grid_line_fracs  # noqa: E402
from chesslab.recording import Recording  # noqa: E402
from chesslab.session_store.recording import video_path  # noqa: E402


def profile_of(candidate: dict) -> CalibrationProfile:
    geom = candidate["geometry"]
    bs = int(geom["board_size"])
    crop = (candidate.get("source") or {}).get("crop") or {}
    return CalibrationProfile(
        profile="__straighten_ab__", camera_index=-1,
        frame_size=(int(geom["frame_size"][0]), int(geom["frame_size"][1])), board_size=bs,
        image_corners=[[float(x), float(y)] for x, y in geom["corners"]],
        homography=compute_homography(geom["corners"], bs, geom.get("margin", 0.0)),
        white_pov=True,
        crop=CropParams(cell=bs / 8.0,
                        pad_side=float(crop.get("pad_side", config.CROP.pad_side)),
                        out_size=(config.CROP.out_w, config.CROP.out_h)),
        margin=float(geom.get("margin", 0.0)),
    )


def bow_of(frame, quad, profile, mesh=None) -> tuple[float, int]:
    """(median |c|, lines unread) of one frame's 18 grid lines, in warped px.

    With `mesh`, the board is pulled straight GLOBALLY first — the operation `straighten_board`
    would perform in the store — and the SAME ruler is then laid against the result.
    """
    warped, pad = warp_for_grid(frame, profile, quad)
    if mesh is not None:
        warped = straighten_board(warped, mesh, profile.board_size, pad)
    lines, curls = grid_lines_with_curvature(warped, profile.board_size, pad=pad)
    unread = sum(1 for axis in lines for line in axis if line is None)
    cs = [abs(c[1]) for axis in curls for c in axis if c is not None]
    return (float(np.median(cs)) if cs else float("nan")), unread


def frame_index(row: dict) -> int:
    return int(Path(row["frame"]).stem)


def sample_rows(recording: Path, want: int) -> list[dict]:
    """Evenly spaced log rows carrying a quad, half of them with a hand on the board.

    Hand frames are a sixth of a recording and the whole question here, so an even sweep would put
    two or three in the sample and decide nothing.
    """
    rows = [r for r in read_jsonl(recording / "log.jsonl") if r.get("corners")]
    out: list[dict] = []
    for group in ([r for r in rows if r.get("hand_squares")],
                  [r for r in rows if not r.get("hand_squares")]):
        take = min(want // 2, len(group))
        out += [group[int(i * len(group) / take)] for i in range(take)] if take else []
    return sorted(out, key=frame_index)


def undistorted_quad(frame, seed, profile):
    """The board on an undistorted frame: refined from the raw seed, or the seed when that fails.

    Undistortion moves the corners, so the raw quad is a seed and never the answer; `improve_quad`
    returns nothing unless it beats what it was given, which is the guarantee wanted here.
    """
    fixed, _before, _after = improve_quad(frame, seed, profile)
    return fixed if fixed is not None else seed


def local_mesh(pool: dict[int, object], idx: int, k: int = 5):
    """The median of the `k` clean frames NEAREST IN TIME, never the frame itself.

    On a fixed rig this is the recording's mesh; on a handheld phone it follows the drift a
    whole-recording median would average away (measured: session median 5.65 px against 0.76 for
    the frame's own mesh). One rule, both cameras.
    """
    near = sorted((i for i in pool if i != idx), key=lambda i: (abs(i - idx), i))[:k]
    return pooled_mesh([pool[i] for i in near])


def report(arms: dict[str, dict[str, list[tuple[float, int]]]]) -> None:
    groups = ["sauber", "Hand"]
    print(f"\n{'arm':<20}" + "".join(f"{g:>18}" for g in groups) + f"{'unread/18':>12}")
    for name, by_group in arms.items():
        cells = ""
        for g in groups:
            v = by_group.get(g) or []
            # Ein Frame ohne gelesene Linie kommt als `nan` zurueck, und `nanmedian` wirft ihn
            # weg. Der Nenner steht daneben: sonst steht ein Arm mit einer Messung so breit da
            # wie einer mit zwoelf.
            read = [a for a, _ in v if a == a]
            got = f"{np.median(read):.2f}" if read else "-"
            cells += f"{got + f' ({len(read)}/{len(v)})':>18}" if v else f"{'-':>18}"
        unread = [u for v in by_group.values() for _, u in v]
        print(f"{name:<20}{cells}{np.mean(unread) if unread else float('nan'):>12.2f}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("recording", type=Path)
    ap.add_argument("--frames", type=int, default=24)
    ap.add_argument("--undist", type=Path, default=None,
                    help="a `:desktop undistort` output directory; without it the lens arms are "
                         "skipped and only the mesh arms are reported")
    ap.add_argument("--emit-frames", type=Path, default=None,
                    help="write the sampled source indices and exit — the input `undistort "
                         "frames=<file>` wants, so both sides measure the SAME pictures")
    ap.add_argument("--out", type=Path, default=None, help="where the sample boards are written")
    args = ap.parse_args()

    candidate = json.loads((args.recording / "candidate.json").read_text(encoding="utf-8"))
    profile = profile_of(candidate)
    rows = sample_rows(args.recording, args.frames)
    hands = sum(1 for r in rows if r.get("hand_squares"))
    print(f"{args.recording.name}: {len(rows)} Frames ({hands} mit Hand), "
          f"board_size {profile.board_size}")

    if args.emit_frames:
        args.emit_frames.parent.mkdir(parents=True, exist_ok=True)
        args.emit_frames.write_text("\n".join(str(frame_index(r)) for r in rows) + "\n",
                                    encoding="utf-8")
        print(f"wrote {len(rows)} frame indices -> {args.emit_frames}")
        return 0

    wanted = {frame_index(r): r for r in rows}
    video = video_path(args.recording.name)
    # The export's own judge, not a flag: a phone decode arrives portrait while the quad was
    # measured landscape, and against an unrotated frame every line below reads as noise.
    rotate = detect_rotation(video, candidate, set(wanted))
    frames = {}
    with contextlib.closing(Recording(video).frames()) as stream:
        for i, frame in stream:
            if i in wanted:
                frames[i] = frame.copy() if rotate is None else cv2.rotate(frame, rotate)
            if i >= max(wanted):
                break
    print(f"decoded {len(frames)} of {len(wanted)} frames")

    lens_note = None
    if args.undist and (args.undist / "lens.json").is_file():
        lens_note = json.loads((args.undist / "lens.json").read_text(encoding="utf-8"))
        print(f"lens: k1={lens_note.get('k1'):.4f} k2={lens_note.get('k2'):.4f}")
    elif args.undist:
        print(f"kein lens.json unter {args.undist} — der Fit wurde abgelehnt, Linsen-Arme entfallen")

    # Both session meshes pool the CLEAN frames only, each on its own side of the lens: a mesh
    # measured on a raw board does not describe an undistorted one.
    raw_pool, und_pool, und = {}, {}, {}
    # From EVERY clean row of the log, not just the sampled ones: the meshes are already in
    # `grid_lines`, so a neighbour costs a dict lookup rather than a decode.
    for row in read_jsonl(args.recording / "log.jsonl"):
        if row.get("grid_lines") and not row.get("hand_squares"):
            raw_pool[frame_index(row)] = mesh_from_lines(row["grid_lines"])
    for idx in (sorted(frames) if lens_note is not None else []):
        img = cv2.imread(str(args.undist / f"{idx:06d}.png"))
        if img is None:
            continue
        quad = undistorted_quad(img, [[float(x), float(y)] for x, y in wanted[idx]["corners"]],
                                profile)
        und[idx] = (img, quad)
        if not wanted[idx].get("hand_squares"):
            lines = grid_line_fracs(img, quad, profile.board_size, profile)
            if lines is not None:
                und_pool[idx] = mesh_from_lines(lines)
    print(f"Session-Mesh aus {len(raw_pool)} sauberen Frames"
          + (f", entzerrt {len(und_pool)}" if lens_note else ""))

    out_dir = args.out or Path("data/reports") / f"straighten-{args.recording.name}"
    out_dir.mkdir(parents=True, exist_ok=True)
    arms: dict[str, dict[str, list[tuple[float, int]]]] = {}
    for idx in sorted(frames):
        row, frame = wanted[idx], frames[idx]
        group = "Hand" if row.get("hand_squares") else "sauber"
        quad = [[float(x), float(y)] for x, y in row["corners"]]
        own = mesh_from_lines(row["grid_lines"]) if row.get("grid_lines") else None
        # The rule this measurement exists to propose: a frame's own mesh only when nothing was
        # on the board, otherwise its clean neighbours'.
        fix = own if own is not None and group == "sauber" else local_mesh(raw_pool, idx)
        todo = {"roh": (frame, quad, None), "mesh (eigener)": (frame, quad, own),
                "mesh-session": (frame, quad,
                                 pooled_mesh([m for i, m in raw_pool.items() if i != idx])),
                "mesh-lokal": (frame, quad, local_mesh(raw_pool, idx)),
                "mesh-REGEL": (frame, quad, fix)}
        if idx in und:
            uimg, uquad = und[idx]
            todo["lens"] = (uimg, uquad, None)
            todo["lens+mesh-REGEL"] = (uimg, uquad, (und_pool.get(idx) if group == "sauber"
                                                     else None) or local_mesh(und_pool, idx))
        for name, (img, q, m) in todo.items():
            arms.setdefault(name, {}).setdefault(group, []).append(bow_of(img, q, profile, m))
            if idx == min(frames):
                warped, pad = warp_for_grid(img, profile, q)
                if m is not None:
                    warped = straighten_board(warped, m, profile.board_size, pad)
                cv2.imwrite(str(out_dir / f"{idx:06d}_{name.replace(' ', '')}.png"), warped)
    report(arms)
    print(f"\nBeispielbretter von Frame {min(frames)} -> {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
