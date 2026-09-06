"""Bump replay: the same recording with the board shifted from frame N on.

Two replays of one recording, `control` (re-encoded, untouched) and `bump` (every frame from
--at shifted by --dx/--dy px), both scored against the recording's confirmed candidate and both
dumping the board the ENGINE sees every --dump frames. The report says whether the plies survive
the jump and how far the engine's board sits from its grooves before and after it.

    uv run python scripts/bump_replay.py 2026-08-08-11-55-19 --at 700 --dx 20 --dy 8
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DESKTOP_DIR = ROOT / "android" / "desktop"
BINARY = DESKTOP_DIR / "build" / "install" / "desktop" / "bin" / "desktop.bat"
DUMP_DIR = ROOT / "tmp" / "board-dump"
SIDE_FILES = ("session.yaml", "settings.json", "log.jsonl")


def encode(src: Path, dst: Path, at: int, dx: int, dy: int) -> int:
    cap = cv2.VideoCapture(str(src))
    cap.set(cv2.CAP_PROP_ORIENTATION_AUTO, 0)
    fps, w, h = cap.get(cv2.CAP_PROP_FPS), int(cap.get(3)), int(cap.get(4))
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{w}x{h}", "-r", f"{fps}",
           "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", str(dst)]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    assert ff.stdin is not None
    shift = np.float32([[1, 0, dx], [0, 1, dy]])
    n = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if n >= at and (dx or dy):
            frame = cv2.warpAffine(frame, shift, (w, h), borderMode=cv2.BORDER_REPLICATE)
        ff.stdin.write(frame.tobytes())
        n += 1
    ff.stdin.close()
    ff.wait()
    return n


def replay(video: Path, name: str, dump_every: int) -> Path:
    if DUMP_DIR.exists():
        shutil.rmtree(DUMP_DIR)
    log = video.with_suffix(".log")
    with log.open("w", encoding="utf-8") as out:
        subprocess.run([str(BINARY), "replay", str(video), "score", f"name={name}", f"dump={dump_every}"],
                       cwd=DESKTOP_DIR, stdout=out, stderr=subprocess.STDOUT, check=False)
    dumps = video.parent / "dump"
    if dumps.exists():
        shutil.rmtree(dumps)
    if DUMP_DIR.exists():
        shutil.move(str(DUMP_DIR), str(dumps))
    return log


def score(log: Path) -> dict:
    text = log.read_text(encoding="utf-8", errors="replace")
    counts = {k: int(m.group(1)) if (m := re.search(rf"^  {k} (\d+)", text, re.M)) else None
              for k in ("found", "missed", "invented", "beyond")}
    found = {m.group(1): int(m.group(2)) for m in re.finditer(r"^    (\S+)\s+label frame\s+\d+\s+run frame\s+(\d+)", text, re.M)}
    missed = [(m.group(1), int(m.group(2))) for m in re.finditer(r"^    (\S+)\s+label frame\s+(\d+)\s*$", text, re.M)]
    skipped = int(m.group(1)) if (m := re.search(r"pre-roll: (\d+) frames skipped", text)) else 0
    return {"counts": counts, "found": found, "missed": missed, "skipped": skipped}


def groove_offset(gray: np.ndarray) -> tuple[float, float]:
    """Median distance of the 7 interior grid lines from the darkest column/row nearby, in cells."""
    n = gray.shape[0]
    cell = n / 8
    out = []
    for axis in (0, 1):
        prof = gray.astype(np.float32).mean(axis=axis)
        offs = []
        for k in range(1, 8):
            lo, hi = int(k * cell - cell / 2), int(k * cell + cell / 2)
            offs.append((lo + int(np.argmin(prof[lo:hi])) - k * cell) / cell)
        out.append(float(np.median(offs)))
    return out[0], out[1]


def boards(variant: Path) -> dict[int, np.ndarray]:
    out = {}
    for png in sorted((variant / "dump").glob("raw-*.png")):
        out[int(png.stem.split("-")[1])] = cv2.imread(str(png), cv2.IMREAD_GRAYSCALE)
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("recording")
    ap.add_argument("--at", type=int, required=True, help="first shifted frame (raw video index)")
    ap.add_argument("--dx", type=int, default=20)
    ap.add_argument("--dy", type=int, default=0)
    ap.add_argument("--dump", type=int, default=30, help="dump the engine's board every n tracked frames")
    ap.add_argument("--reuse", action="store_true", help="skip the encode when the videos exist")
    args = ap.parse_args()

    rec = ROOT / "data" / "recordings" / args.recording
    src = rec / "video.mp4"
    if not src.is_file() or not BINARY.is_file():
        sys.exit(f"need {src} and {BINARY}")
    work = ROOT / "data" / "tmp" / "bump" / f"{args.recording}-at{args.at}-dx{args.dx}-dy{args.dy}"
    variants = {"control": (0, 0), "bump": (args.dx, args.dy)}
    for name, (dx, dy) in variants.items():
        d = work / name
        d.mkdir(parents=True, exist_ok=True)
        for side in SIDE_FILES:
            if (rec / side).is_file():
                shutil.copy2(rec / side, d / side)
        if not (args.reuse and (d / "video.mp4").is_file()):
            n = encode(src, d / "video.mp4", args.at, dx, dy)
            print(f"{name}: {n} frames encoded", flush=True)
        replay(d / "video.mp4", args.recording, args.dump)
        print(f"{name}: replayed", flush=True)

    lines = [f"# bump replay {args.recording}: shift ({args.dx},{args.dy}) px from raw frame {args.at}", ""]
    scores = {name: score(work / name / "video.log") for name in variants}
    lines.append("| run | found | missed | invented | beyond | pre-roll skipped |")
    lines.append("|---|---|---|---|---|---|")
    for name, s in scores.items():
        c = s["counts"]
        lines.append(f"| {name} | {c['found']} | {c['missed']} | {c['invented']} | {c['beyond']} | {s['skipped']} |")
    lines.append("")
    lines.append("| ply | control run frame | bump run frame | delta |")
    lines.append("|---|---|---|---|")
    for san, frame in scores["control"]["found"].items():
        other = scores["bump"]["found"].get(san)
        lines.append(f"| {san} | {frame} | {other if other is not None else 'missed'} | {other - frame if other is not None else '—'} |")
    for san, frame in scores["bump"]["missed"]:
        if san not in scores["control"]["found"]:
            lines.append(f"| {san} | missed | missed (label frame {frame}) | — |")
    lines.append("")
    control, bump = boards(work / "control"), boards(work / "bump")
    lines.append("| tracked frame | control grooves (cells) | bump grooves (cells) | mean abs diff /255 |")
    lines.append("|---|---|---|---|")
    for frame in sorted(set(control) & set(bump)):
        a, b = control[frame], bump[frame]
        diff = float(np.abs(a.astype(np.int16) - b.astype(np.int16)).mean()) / 255 if a.shape == b.shape else float("nan")
        ca, cb = groove_offset(a), groove_offset(b)
        lines.append(f"| {frame} | {ca[0]:+.3f} {ca[1]:+.3f} | {cb[0]:+.3f} {cb[1]:+.3f} | {diff:.3f} |")
    report = "\n".join(lines) + "\n"
    (work / "summary.md").write_text(report, encoding="utf-8")
    print(report)
    print(f"logs and dumps under {work}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
