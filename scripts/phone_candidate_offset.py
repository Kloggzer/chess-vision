"""Three time rules for a phone bundle's plies, measured against the replay's own.

The verb planned in `plan/02-phone-candidate` puts every recorded ply on a video frame without
running the tracker. This measures the three candidate rules (`frame`, `decision`, `wall`) and the
pre-roll rule the replay already applies (`PhoneLog.kt`), so the pack can fix a rule order and a
frame offset. It reads and reports only — nothing here writes into a bundle.
"""

from __future__ import annotations

import argparse
import bisect
import json
import re
import statistics
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

import chess
import cv2

from chesslab.ioutil import read_jsonl
from chesslab.recording import recording_segments

ROOT = Path(__file__).resolve().parents[1]
RECORDINGS = ROOT / "data" / "recordings"
DESKTOP = ROOT / "android" / "desktop"
DESKTOP_BAT = DESKTOP / "build" / "install" / "desktop" / "bin" / "desktop.bat"
MODEL = "real14-80"
MATTE_TARGET = 80
NS_PER_MS = 1_000_000.0
OCCLUDED = re.compile(r'"dirty_reason":\s*"occluded"')
FRAME_STEM = re.compile(r'"frame":\s*"([^"]+)"')


@dataclass
class Bundle:
    """One transferred recording and where its per-session files were found."""

    name: str
    dir: Path
    sid: str
    session: Path

    def find(self, filename: str) -> Path | None:
        for path in (self.session / filename, self.dir / filename):
            if path.is_file():
                return path
        return None

    def where(self, filename: str) -> str:
        if (self.session / filename).is_file():
            return "session+top" if (self.dir / filename).is_file() else "session"
        return "top" if (self.dir / filename).is_file() else "-"


@dataclass
class Ply:
    ply: int
    san: str
    uci: str
    ts_epoch_ms: int
    fen_after: str
    decider: str


@dataclass
class Rows:
    """The timeline as the rules read it, every list sorted by `elapsedNs`."""

    syncs: list[tuple[int, int]]
    frames: list[tuple[int, int, str | None]]
    decisions: list[tuple[int, int, str]]
    events: list[tuple[int, int]]


def bundles() -> list[Bundle]:
    out = []
    for directory in sorted(p for p in RECORDINGS.glob("*") if p.is_dir()):
        sessions = sorted(p for p in (directory / "files" / "sessions").glob("*") if p.is_dir())
        if not sessions:
            continue
        session = next((s for s in reversed(sessions) if (s / "video.mp4").is_file()), sessions[-1])
        out.append(Bundle(directory.name, directory, session.name, session))
    return out


def bundle_of(name: str) -> Bundle:
    found = next((b for b in bundles() if b.name == name), None)
    if found is None:
        sys.exit(f"no bundle {name} with files/sessions/ under {RECORDINGS}")
    return found


def record_of(bundle: Bundle) -> tuple[Path, dict] | None:
    """The `files/games/*.json` whose `sessionId` names this session — `gameRecordFor`'s rule."""
    for path in sorted((bundle.dir / "files" / "games").glob("*.json")):
        if path.name == "index.json":
            continue
        game = json.loads(path.read_text(encoding="utf-8"))
        if game.get("sessionId") == bundle.sid:
            return path, game
    return None


def segments_of(game: dict) -> list[dict]:
    """`StoredGame.segmentsOrOne` — a record written before segments existed is one segment."""
    return game.get("segments") or [{"startFen": game["startFen"], "moves": game["moves"]}]


def plies_of(segment: dict) -> list[Ply]:
    board = chess.Board(segment["startFen"])
    out = []
    for row in segment["moves"]:
        move = chess.Move.from_uci(row["uci"])
        if move not in board.legal_moves:
            sys.exit(f"record has an illegal move {row['uci']} at ply {row['ply']}")
        board.push(move)
        out.append(
            Ply(
                ply=int(row["ply"]),
                san=row["san"],
                uci=row["uci"],
                ts_epoch_ms=int(row["tsEpochMs"]),
                fen_after=board.fen(),
                decider=str((row.get("provenance") or {}).get("decider", "-")),
            )
        )
    return out


def rows_of(timeline: Path) -> Rows:
    syncs: list[tuple[int, int]] = []
    frames: list[tuple[int, int, str | None]] = []
    decisions: list[tuple[int, int, str]] = []
    events: list[tuple[int, int]] = []
    for row in read_jsonl(timeline):
        elapsed = row.get("elapsedNs")
        kind = row.get("kind")
        if elapsed is None:
            continue
        if kind == "video_sync" and row.get("durationNs") is not None:
            syncs.append((elapsed, int(row["durationNs"])))
        elif kind == "frame":
            frames.append((elapsed, int(row.get("wallTsMs", 0)), row.get("fen")))
        elif kind == "decision" and row.get("accepted"):
            decisions.append((elapsed, int(row["ply"]), str(row.get("reason") or "")))
        elif kind == "event":
            events.append((elapsed, int(row.get("wallTsMs", 0))))
    return Rows(sorted(syncs), sorted(frames), sorted(decisions), sorted(events))


def placement(fen: str) -> str:
    return " ".join(fen.split(" ")[:2])


def by_frame(ply: Ply, rows: Rows, after: int) -> int | None:
    want = placement(ply.fen_after)
    for elapsed, _wall, fen in rows.frames:
        if elapsed > after and fen and placement(fen) == want:
            return elapsed
    return None


def by_decision(ply: Ply, rows: Rows, after: int) -> int | None:
    """A `cnn_pair` writes one row for the SECOND ply of the pair; the first one shares it."""
    for elapsed, number, reason in rows.decisions:
        if elapsed <= after:
            continue
        if number == ply.ply or (number == ply.ply + 1 and "pair" in reason):
            return elapsed
    return None


def by_wall(ply: Ply, rows: Rows, after: int) -> int | None:
    rowed = [(e, w) for e, w, _f in rows.frames if e > after and w] + [
        (e, w) for e, w in rows.events if e > after and w
    ]
    if not rowed:
        return None
    elapsed, wall = min(rowed, key=lambda r: abs(r[1] - ply.ts_epoch_ms))
    return int(elapsed + (ply.ts_epoch_ms - wall) * NS_PER_MS)


def video_ns_at(elapsed: int, syncs: list[tuple[int, int]]) -> float:
    """`RecordedFrames.videoNsAt`: the nearest sync point plus system time, slope 1."""
    after = next((i for i, s in enumerate(syncs) if s[0] >= elapsed), -1)
    if after < 0:
        anchor = syncs[-1]
    elif after == 0:
        anchor = syncs[0]
    else:
        anchor = min(syncs[after - 1], syncs[after], key=lambda s: abs(s[0] - elapsed))
    return anchor[1] + float(elapsed - anchor[0])


def video_times(video: Path) -> list[float]:
    """Decoded video time per whole-recording frame index — `ConcatFrameSource`'s offset rule.

    Grabbed, not retrieved: the pixels are not wanted, only each frame's own PTS.
    """
    times: list[float] = []
    offset, last = 0.0, 0.0
    for segment in recording_segments(video):
        cap = cv2.VideoCapture(str(segment))
        if not cap.isOpened():
            sys.exit(f"cannot open video: {segment}")
        last = 0.0
        while cap.grab():
            last = cap.get(cv2.CAP_PROP_POS_MSEC)
            times.append(offset + last)
        cap.release()
        offset += last
    return times


def frame_at(times: list[float], ms: float | None) -> int | None:
    if ms is None:
        return None
    index = bisect.bisect_left(times, ms)
    return index if index < len(times) else None


def pre_roll_ms(session_yaml: Path | None) -> float | None:
    """`PhoneLog.preRollMs` — the `video_pre_roll_ns:` line of `session.yaml`, in ms."""
    if session_yaml is None:
        return None
    for line in session_yaml.read_text(encoding="utf-8").splitlines():
        if line.startswith("video_pre_roll_ns:"):
            return float(line.split(":", 1)[1].strip()) / NS_PER_MS
    return None


def replay_frames(bundle: Bundle, kept: Path | None = None) -> dict[int, tuple[int, str, str]]:
    candidate = kept or bundle.dir / "candidate.json"
    if not candidate.is_file():
        return {}
    moves = json.loads(candidate.read_text(encoding="utf-8"))["moves"]
    return {int(m["ply"]): (int(m["frame"]), str(m.get("san", "")), str(m.get("decider", ""))) for m in moves}


def run_replay(bundle: Bundle) -> float | None:
    video = bundle.find("video.mp4")
    if video is None:
        print("  no video.mp4 — no replay")
        return None
    if not DESKTOP_BAT.is_file():
        print(f"  no desktop at {DESKTOP_BAT} — run :desktop:installDist")
        return None
    args = [str(DESKTOP_BAT), "replay", str(video), "label", "quiet", f"name={bundle.name}", f"model={MODEL}"]
    print(f"  replay: {' '.join(args)}")
    started = time.time()
    done = subprocess.run(args, cwd=DESKTOP, capture_output=True, text=True, check=False)
    seconds = time.time() - started
    log = ROOT / "tmp" / f"phone-candidate-{bundle.name}-replay.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    log.write_text(done.stdout + done.stderr, encoding="utf-8")
    print(f"  replay exit {done.returncode} in {seconds:.0f} s, log {log}")
    if done.returncode != 0:
        for line in (done.stdout + done.stderr).strip().splitlines()[-12:]:
            print(f"    {line}")
        return seconds
    return seconds


def chain_audit(bundle: Bundle) -> str:
    """What `chain.ts` sees: a phone commit log counts as an export, and `nextStep` skips it."""
    log = bundle.dir / "log.jsonl"
    first = ""
    if log.is_file():
        with log.open(encoding="utf-8") as handle:
            first = handle.readline()
    board = '"board"' in first
    text = log.read_text(encoding="utf-8") if log.is_file() else ""
    matte = bundle.dir / "matte.jsonl"
    done = len(set(FRAME_STEM.findall(matte.read_text(encoding="utf-8")))) if matte.is_file() else 0
    total = len(OCCLUDED.findall(text))
    step = next_step(
        session=log.is_file(),
        done=done,
        target=min(MATTE_TARGET, total),
        reads=(bundle.dir / "model-reads.jsonl").is_file(),
    )
    return f"log.jsonl={'yes' if log.is_file() else 'no'} board={'yes' if board else 'no'} step_after_confirm={step}"


def next_step(*, session: bool, done: int, target: int, reads: bool) -> str:
    """`chain.ts nextStep` with the candidate confirmed — the two steps before that are decided."""
    if not session:
        return "export"
    if done < target:
        return "matte"
    return "labeln" if reads else "model-read"


def list_bundles() -> None:
    for bundle in bundles():
        found = record_of(bundle)
        if found is None:
            print(f"{bundle.name} sid={bundle.sid} record=- {chain_audit(bundle)}")
            continue
        path, game = found
        sizes = [len(s["moves"]) for s in segments_of(game)]
        stamps = len({m["tsEpochMs"] for m in game["moves"]})
        print(
            f"{bundle.name} sid={bundle.sid} record={path.stem} moves={len(game['moves'])} "
            f"segments={sizes} instants={stamps} "
            f"video={bundle.where('video.mp4')} timeline={bundle.where('timeline.jsonl')} "
            f"settings={bundle.where('settings.json')} "
            f"candidate={'yes' if (bundle.dir / 'candidate.json').is_file() else 'no'} "
            f"{chain_audit(bundle)}"
        )


def deltas(rule: list[int | None], replay: list[int | None]) -> str:
    """Coverage of the rule, and the offset over the plies BOTH columns placed.

    The median is over the intersection while `covered` counts the rule alone, so a rule that
    placed 40 of 67 plies against a replay that placed 12 was being judged on 12 — the same
    shape as a `nanmedian` over a mostly empty arm. `n=` says which.
    """
    both = [r - p for r, p in zip(rule, replay, strict=True) if r is not None and p is not None]
    covered = sum(1 for value in rule if value is not None)
    if not both:
        return f"covered {covered}/{len(rule)}  vs replay: - (n=0)"
    worst = max(both, key=abs)
    return (f"covered {covered}/{len(rule)}  median {statistics.median(both):+.1f}  "
            f"max {worst:+d}  (n={len(both)})")


def measure(name: str, replay: bool, kept: Path | None) -> None:
    bundle = bundle_of(name)
    found = record_of(bundle)
    if found is None:
        sys.exit(f"{name}: no game record naming session {bundle.sid}")
    path, game = found
    segments = segments_of(game)
    plies = plies_of(segments[0])
    print(f"== {bundle.name} sid={bundle.sid} record={path.name}")
    print(f"   segments={[len(s['moves']) for s in segments]} measured={len(plies)} plies of segment 0")
    print(f"   record deciders: {histogram(p.decider for p in plies)}")

    timeline = bundle.find("timeline.jsonl")
    video = bundle.find("video.mp4")
    if timeline is None or video is None:
        sys.exit(f"{name}: timeline.jsonl or video.mp4 missing")
    rows = rows_of(timeline)
    print(f"   timeline: {len(rows.frames)} frame, {len(rows.decisions)} accepted decision, "
          f"{len(rows.events)} event, {len(rows.syncs)} video_sync rows ({timeline.parent.name})")
    if not rows.syncs:
        sys.exit(f"{name}: timeline.jsonl has no video_sync rows")

    if replay and not (bundle.dir / "candidate.json").is_file():
        run_replay(bundle)
    started = time.time()
    times = video_times(video)
    walk = time.time() - started
    print(f"   decode walk: {len(times)} frames of {len(recording_segments(video))} segments "
          f"in {walk:.0f} s, last {times[-1] / 1000:.1f} s")

    pre_roll = pre_roll_ms(bundle.find("session.yaml"))
    if pre_roll is None:
        sys.exit(f"{name}: no video_pre_roll_ns in session.yaml")
    first_ts = plies[0].ts_epoch_ms
    # With a kept replay candidate the live candidate.json is the VERB's, so it gets a column of
    # its own and the reference column reads the copy Phase 03 put aside before running the verb.
    replayed = replay_frames(bundle, kept)
    verb = replay_frames(bundle) if kept else {}
    print(f"   candidate deciders: {histogram(d for _f, _s, d in (verb or replayed).values()) or '-'}")
    if kept:
        print(f"   kept replay: {kept.name}, {len(replayed)} plies")

    widths = [("frame", 8), ("decision", 11), ("wall", 8), ("preroll", 10)]
    widths += [("verb", 8)] if kept else []
    widths += [("replay", 9)]
    columns: dict[str, list[int | None]] = {rule: [] for rule, _w in widths}
    bounds = {"frame": -1, "decision": -1, "wall": -1}
    header = " ".join(f"{'f_' + rule:>{width}}" for rule, width in widths)
    print(f"{'ply':>4} {'san':<8} {header}")
    for ply in plies:
        elapsed = {
            "frame": by_frame(ply, rows, bounds["frame"]),
            "decision": by_decision(ply, rows, bounds["decision"]),
            "wall": by_wall(ply, rows, bounds["wall"]),
        }
        for rule, value in elapsed.items():
            if value is not None:
                bounds[rule] = value
            columns[rule].append(frame_at(times, None if value is None else video_ns_at(value, rows.syncs) / NS_PER_MS))
        columns["preroll"].append(frame_at(times, pre_roll + (ply.ts_epoch_ms - first_ts)))
        if kept:
            columns["verb"].append(verb.get(ply.ply, (None, "", ""))[0])
        columns["replay"].append(replayed.get(ply.ply, (None, "", ""))[0])
        cells = " ".join(
            f"{'-' if columns[rule][-1] is None else columns[rule][-1]:>{width}}" for rule, width in widths
        )
        print(f"{ply.ply:>4} {ply.san:<8} {cells}")

    for rule, _width in widths[:-1]:
        print(f"   {rule:<9} {deltas(columns[rule], columns['replay'])}")
    print(f"   chain: {chain_audit(bundle)}")


def histogram(values) -> str:
    counts: dict[str, int] = {}
    for value in values:
        counts[value] = counts.get(value, 0) + 1
    return " ".join(f"{k}={v}" for k, v in sorted(counts.items()))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("name", nargs="?", help="recording directory under data/recordings/")
    parser.add_argument("--list", action="store_true", help="every bundle with a session directory")
    parser.add_argument("--replay", action=argparse.BooleanOptionalAction, default=True,
                        help="run one replay when the bundle has no candidate.json")
    parser.add_argument("--replay-candidate",
                        help="a kept replay candidate (name inside the bundle or a path) as the "
                             "reference column; the live candidate.json is then the verb's")
    args = parser.parse_args()
    if args.list:
        list_bundles()
        return
    if not args.name:
        parser.error("give a recording name or --list")
    kept = None
    if args.replay_candidate:
        kept = Path(args.replay_candidate)
        kept = kept if kept.is_file() else bundle_of(args.name).dir / args.replay_candidate
        if not kept.is_file():
            sys.exit(f"no kept replay candidate at {kept}")
    measure(args.name, args.replay, kept)


if __name__ == "__main__":
    main()
