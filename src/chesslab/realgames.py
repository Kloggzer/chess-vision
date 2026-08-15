"""Real-game candidates: label confirmed against played game, or nothing.
LCS over SANs decides matches; human sees only disagreements."""

from __future__ import annotations

import json
import os
from collections.abc import Callable
from contextlib import closing
from datetime import UTC, datetime, timedelta
from pathlib import Path

import chess.pgn
import cv2
import yaml

from . import config
from .calibration import load_profile
from .labeling import all_squares, crops_for_frame
from .recording import Recording
from .state import GameState


def game_dir(name: str) -> Path:
    return config.DATA.root / "realgames" / name


def load_candidate(name: str) -> dict:
    """The candidate exactly as the tracker left it — nothing here rewrites `moves[]`."""
    path = game_dir(name) / "candidate.json"
    if not path.exists():
        raise FileNotFoundError(f"no candidate: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def truth_sans(name: str) -> list[str]:
    """SANs of `reference.pgn`'s mainline, replayed so the SAN spelling matches python-chess."""
    path = game_dir(name) / "reference.pgn"
    if not path.exists():
        raise FileNotFoundError(f"no reference game: {path}")
    with path.open(encoding="utf-8") as fh:
        game = chess.pgn.read_game(fh)
    if game is None:
        raise ValueError(f"{path}: no game in PGN")
    board = game.board()
    sans = []
    for move in game.mainline_moves():
        sans.append(board.san(move))
        board.push(move)
    return sans


def lcs_report(
    truth: list[str], cand: list[str]
) -> tuple[list[tuple[int, int]], list[int], list[int]]:
    """Order-preserving match of candidate SANs.
    Mirrors `RealGameScore.scoreMoves` (truth advances first).
    Returns matched pairs, invented indices, missed indices."""
    n, m = len(truth), len(cand)
    table = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            if truth[i] == cand[j]:
                table[i][j] = 1 + table[i + 1][j + 1]
            else:
                table[i][j] = max(table[i + 1][j], table[i][j + 1])
    matched: list[tuple[int, int]] = []
    invented: list[int] = []
    missed: list[int] = []
    i = j = 0
    while i < n and j < m:
        if truth[i] == cand[j]:
            matched.append((i, j))
            i += 1
            j += 1
        elif table[i + 1][j] >= table[i][j + 1]:
            missed.append(i)
            i += 1
        else:
            invented.append(j)
            j += 1
    missed.extend(range(i, n))
    invented.extend(range(j, m))
    return matched, invented, missed


def frame_anchor(name: str, move: dict) -> str:
    """One unmatched ply as a line the human can act on: the ply, and the PNG that shows it."""
    stem = f"{int(move['frame']):06d}"
    png = (game_dir(name) / "frames" / f"{stem}.png").as_posix()
    return f"ply {move['ply']} {move['san']} @frame {stem} -> {png}"


def report_lines(
    name: str,
    moves: list[dict],
    truth: list[str],
    matched: list[tuple[int, int]],
    invented: list[int],
    missed: list[int],
) -> list[str]:
    """Verdict as three lists, never one accuracy — two directions don't average."""
    lines = [
        f"{name}: {len(moves)} candidate plies vs {len(truth)} in reference.pgn",
        f"  matched {len(matched)}",
        f"  invented {len(invented)} (candidate only):",
    ]
    lines += [f"    {frame_anchor(name, moves[j])}" for j in invented]
    lines.append(f"  missed {len(missed)} (reference only):")
    lines += [f"    ply {i + 1} {truth[i]}" for i in missed]
    return lines


def reviewed_plies(moves: list[dict], matched: list[tuple[int, int]], kept: list[int]) -> list[int]:
    """The plies the FEN timeline may trust: every matched one, plus the invented ones kept."""
    keep = {j for _, j in matched} | set(kept)
    return [int(moves[j]["ply"]) for j in sorted(keep)]


def write_confirmation(name: str, candidate: dict, plies: list[int]) -> Path:
    """Stamp the three confirmation keys atomically — a half-written label is worse than none."""
    candidate["confirmed"] = True
    candidate["confirmed_at"] = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    candidate["reviewed_plies"] = plies
    path = game_dir(name) / "candidate.json"
    tmp = path.with_suffix(".json.tmp")
    try:
        tmp.write_text(json.dumps(candidate, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)
    return path


def confirm(name: str, *, yes: bool, ask: Callable[[dict], bool] | None = None) -> dict:
    """Compare candidate to reference game, write verdict.
    `ask` decides invented plies one at a time; under `yes`, unmatched plies rejected."""
    candidate = load_candidate(name)
    truth = truth_sans(name)
    moves = candidate["moves"]
    matched, invented, missed = lcs_report(truth, [m["san"] for m in moves])
    for line in report_lines(name, moves, truth, matched, invented, missed):
        print(line)
    kept = [] if yes or ask is None else [j for j in invented if ask(moves[j])]
    plies = reviewed_plies(moves, matched, kept)
    return {
        "path": write_confirmation(name, candidate, plies),
        "matched": len(matched),
        "invented": invented,
        "missed": missed,
        "kept": kept,
        "reviewed": plies,
    }


# --- export-session: a confirmed video becomes a session `slice` can eat ---------------------

EXPORT_PROFILE = "desktop"
YIELD_HEADER = f"{'population':10} {'rows':>6} {'crops':>8} {'cells':>6} {'cap4':>7} {'cap16':>7}"


def video_fps(candidate: dict) -> float:
    return float((candidate.get("clock") or {}).get("fps") or 30.0)


def base_time(candidate: dict) -> datetime:
    """The recording's wall clock — row timestamps are video time counted off it, not export time."""
    try:
        return datetime.fromisoformat(str(candidate.get("created_at", "")).replace("Z", "+00:00"))
    except ValueError:
        return datetime.now(UTC)


def video_path(name: str, candidate: dict) -> Path:
    """`candidate.video` as the tracker wrote it, resolved from the places it can be relative to."""
    rel = str(candidate.get("video") or "")
    for p in (Path(rel), game_dir(name) / rel, config.DATA.root / rel):
        if rel and p.exists():
            return p
    raise FileNotFoundError(f"{name}: video not found ({rel!r})")


#: How far past the FINAL commit its interval may run, in seconds — the whole rule for a ply that
#: no later commit closes. Nothing witnesses the board after the last commit: the recording keeps
#: going, the players keep playing, and on 2026-08-14-20-48-55 the tracker went on REJECTING
#: `Bxd2+` for 18 s while its own `fenAfter` still said the bishop stood on b4. So "the tracker
#: still agrees" is no witness either, and the tail is cut short instead of guessed.
LAST_INTERVAL_S = 2.0


def known_segments(candidate: dict) -> list[dict]:
    """One segment per REVIEWED ply: `[commit frame, next commit frame)` holds its `fen_after`.

    The next commit closes the segment whether or not that ply was reviewed — a commit is where
    the board changed, and an unreviewed one is still evidence that it did.

    The LAST ply has no such closer, and used to contribute nothing at all: 2026-08-14-20-48-55
    confirmed 11 plies and exported 10 intervals, so the position the game ended in — the one the
    human had just vouched for — was the one position never labelled. It gets [LAST_INTERVAL_S]
    after its commit and not a frame more; the commit itself is the proof the board was in that
    position, and nothing past the cap proves anything.
    """
    moves = candidate["moves"]
    if not moves:
        return []
    reviewed = set(candidate.get("reviewed_plies") or ())
    stray = sorted(reviewed - {int(m["ply"]) for m in moves})
    if stray:
        # A reviewed ply naming no move means the confirmation and `moves[]` disagree about which
        # ply is which — every interval after it could carry the wrong position. Never guess.
        raise ValueError(
            f"reviewed_plies names ply {stray} which no move carries — confirmation and moves[] "
            f"disagree; re-run `chesslab realgames confirm` instead of exporting a shifted timeline"
        )
    tail = int(moves[-1]["frame"]) + int(round(LAST_INTERVAL_S * video_fps(candidate)))
    total = int(candidate.get("frames") or 0)
    ends = [int(m["frame"]) for m in moves[1:]] + [min(tail, total) if total else tail]
    out = []
    for i, move in enumerate(moves):
        start, end = int(move["frame"]), ends[i]
        if int(move["ply"]) not in reviewed or end <= start:
            continue
        out.append(
            {
                "ply": int(move["ply"]),
                "fen": move["fen_after"],
                "start": start,
                "end": end,
                # Against the LAST move sharing the next commit's frame, not the first: a pair
                # commit lands two plies on one frame, and the hand window before it contains
                # BOTH moves' physical motion. Computed against only the first, the second pair
                # move's squares (e7/e5 of an e4+e5 pair) went unmarked while the frames already
                # showed them moved — exactly the mislabel `unknown_squares` exists to stop.
                "next_touches": changed_squares(move["fen_after"], group_end_fen(moves, i + 1))
                if i + 1 < len(moves)
                else [],
            }
        )
    return out


def group_end_fen(moves: list[dict], j: int) -> str | None:
    """`fen_after` of the last move committed on the same frame as `moves[j]` — the position the
    board actually shows once that frame's hand window is over."""
    while j + 1 < len(moves) and moves[j + 1]["frame"] == moves[j]["frame"]:
        j += 1
    return moves[j].get("fen_after")


def changed_squares(before: str | None, after: str | None) -> list[str]:
    """Squares whose occupant differs between two FENs — the next move's footprint.

    Derived from the two positions rather than from the SAN so castling, captures and
    en-passant need no special case: whatever changed, changed.
    """
    if not before or not after:
        return []
    a, b = GameState(before).labels(), GameState(after).labels()
    return sorted(sq for sq in a if a[sq] != b.get(sq))


def plan_rows(candidate: dict, *, margin_frames: int, every: int, dirty: bool,
              settle: dict | None = None) -> list[dict]:
    """Every log row the export will write, in frame order — the whole interval model.

    Quiet rows sit `margin_frames` clear of both commits, so no hand is declared to be in them.
    Dirty rows are the two hand windows at a segment's ends and carry the SAME interval FEN plus
    `dirty: true`: a shadowed piece is still that piece, and which square is actually under an
    occluder is phase 02's proposal, never the exporter's guess. Sampling is a global stride over
    the source index, so a frame's stem does not depend on which window it fell into.

    **The window BEFORE a commit is labeled short, and `unknown` is the honest word for it.** A
    commit lands after the move is physically over — settle frames, then the confirmer — so the
    trailing window holds frames where the piece has ALREADY moved while the interval's FEN still
    describes the position before it. Found by the user while labeling (2026-08-09, frame 000813:
    a pawn plainly on e5, FEN saying empty, commit `e5` 18 frames later). Only the squares the
    NEXT move touches are in doubt, so only those are named — the other 60-odd cells of the same
    frame are unaffected and stay labelable. `unknown_squares` travels with the row; `slice` does
    not read it, phase 02 skips those cells, and no crop of them is ever built.
    """
    corners = [[float(x), float(y)] for x, y in candidate["geometry"]["corners"]]
    base, fps = base_time(candidate), video_fps(candidate)
    rows = []
    for seg in known_segments(candidate):
        start, end = seg["start"], seg["end"]
        q0, q1 = start + margin_frames, end - margin_frames
        # A segment shorter than two margins is hand time end to end — no quiet part exists.
        windows = (
            [(q0, q1, False), (start, q0, True), (q1, end, True)]
            if q1 > q0
            else [(start, end, True)]
        )
        for lo, hi, is_dirty in windows:
            if is_dirty and not dirty:
                continue
            for idx in range(lo + (-lo) % every, hi, every):
                row = {
                    "frame": f"frames/{idx:06d}.png",
                    "ply": seg["ply"],
                    "fen": seg["fen"],
                    "ts": (base + timedelta(seconds=idx / fps)).isoformat(),
                    "corners": corners,
                    "corners_source": "realgame-export",
                }
                if is_dirty:
                    row["dirty"] = True
                # NOT inside the `dirty` branch, and that is the whole correction: a piece can be
                # placed seconds before the hand leaves, so a QUIET row can carry a stale FEN too.
                # Measured 2026-08-09: 5 of 15 changed squares were visible more than the 1 s
                # margin before their commit, one of them by 4.6 s.
                unknown = unknown_for(seg, idx, margin_frames, settle)
                if unknown:
                    row["unknown_squares"] = unknown
                rows.append(row)
    rows.sort(key=lambda r: r["frame"])
    return rows


def ensure_export_profile(profile: str, candidate: dict) -> Path:
    """The profile the crops will be cut through, taken from the recording — never invented.

    `ClipDriver` filled its profile from `CropParams.default` while the device served
    `pad_side 0.05` (CLAUDE.md, 2026-08-03), and that alone was a domain shift. So board size,
    marker margin and the pads come from the candidate itself; only `out_size` is the crop
    pool's 128 px instead of the device's 80, because the pool is what these crops join. An
    existing profile is never touched — the user may have tuned it.
    """
    from .calibration import CalibrationProfile, CropParams, compute_homography, profile_path

    path = profile_path(profile)
    if path.exists():
        return path
    geom = candidate["geometry"]
    board_size = int(geom["board_size"])
    crop = (candidate.get("source") or {}).get("crop") or {}
    prof = CalibrationProfile(
        profile=profile,
        camera_index=-1,
        frame_size=(int(geom["frame_size"][0]), int(geom["frame_size"][1])),
        board_size=board_size,
        image_corners=[[float(x), float(y)] for x, y in geom["corners"]],
        homography=compute_homography(geom["corners"], board_size, geom.get("margin", 0.0)),
        white_pov=True,
        crop=CropParams(
            cell=board_size / 8.0,
            pad_up=float(crop.get("pad_up", 0.0)),
            pad_side=float(crop.get("pad_side", config.CROP.pad_side)),
            out_size=(config.CROP.out_w, config.CROP.out_h),
        ),
        margin=float(geom.get("margin", 0.0)),
        source=candidate.get("video"),
    )
    print(f"[OK] calibration profile '{profile}' created from the candidate geometry ({path}).")
    return prof.save(path)


#: Grid lines (of 18) a rotation probe may leave unread and still win — pieces hide a couple.
ROTATION_UNREAD_SLACK = 2

#: Probe frames tried before the rotation chooser gives up (a probe can land under a hand).
ROTATION_PROBES = 5


def _unread_grid_lines(frame, geometry: dict) -> int:
    """Unread grid lines after warping [frame] with the CANDIDATE's stored corners — 0 says the
    decoded orientation is the one the geometry was measured in."""
    import numpy as np

    from .alignment import GRID_PAD_CELLS, grid_lines
    from .calibration import compute_homography

    bs = int(geometry["board_size"])
    pad = int(round(GRID_PAD_CELLS * bs / 8.0))
    h = np.array(compute_homography(geometry["corners"], bs, geometry.get("margin", 0.0)), np.float64)
    t = np.array([[1.0, 0.0, pad], [0.0, 1.0, pad], [0.0, 0.0, 1.0]])
    warped = cv2.warpPerspective(frame, t @ h, (bs + 2 * pad, bs + 2 * pad))
    lines = grid_lines(warped, bs, pad=pad)
    return sum(1 for axis in lines for line in axis if line is None)


def detect_rotation(video: Path, candidate: dict, wanted: set[int]) -> int | None:
    """The `cv2.ROTATE_*` the decode needs so Python sees the frames the Kotlin side measured.

    cv2 does not reliably honour a phone recording's rotation metadata (measured 2026-08-10:
    portrait 1080x1920 delivered for a landscape-measured candidate, and one video needing 180°
    despite `CAP_PROP_ORIENTATION_AUTO`), while the candidate's corners live in the Kotlin
    reader's view. The judge is the board's own grid through the STORED corners: the right
    orientation reads all 18 lines, a wrong one almost none. An as-is read that passes is never
    overridden — for a centred board a 180° flip also aligns the (symmetric) lines, and flipping
    a good session would transpose a1<->h8 in every label.
    """
    want_w, want_h = (int(v) for v in candidate["geometry"]["frame_size"])
    probes = sorted(wanted)[:ROTATION_PROBES]
    with closing(Recording(video).frames()) as stream:
        best: tuple[int, int | None] | None = None
        for target in probes:
            frame = next((f for i, f in stream if i >= target), None)
            if frame is None:
                return best[1] if best else None
            got = (frame.shape[1], frame.shape[0])
            rotations: list[int | None] = (
                [None, cv2.ROTATE_180]
                if got == (want_w, want_h)
                else [cv2.ROTATE_90_COUNTERCLOCKWISE, cv2.ROTATE_90_CLOCKWISE]
            )
            scored = [
                (_unread_grid_lines(frame if r is None else cv2.rotate(frame, r), candidate["geometry"]), r)
                for r in rotations
            ]
            scored.sort(key=lambda s: (s[0], s[1] is not None))  # a passing as-is wins ties
            if scored[0][0] <= ROTATION_UNREAD_SLACK:
                return scored[0][1]
            if best is None or scored[0][0] < best[0]:
                best = scored[0]
        raise ValueError(
            f"{video.name}: no rotation reads the board grid through the stored corners "
            f"(best left {best[0] if best else '?'} of 18 lines unread) — geometry and decode disagree."
        )


def decode_frames(video: Path, wanted: set[int], out_dir: Path, rotate: int | None = None) -> set[int]:
    """Write the wanted source frames as `frames/NNNNNN.png`, decoding STRICTLY forward.

    Never `CAP_PROP_POS_FRAMES`: seeking a long clip lands next to the requested index (the
    2026-08-06 stale-index defect class), and an index that is off by one here is a wrong LABEL,
    not a blurry picture. The walk runs through `Recording`, so a segmented recording is decoded
    to its end instead of stopping at the first minute. Returns the indices that actually arrived.
    [rotate] is `detect_rotation`'s verdict, applied to every written frame.

    **Frames already on disk are kept, not decoded again.** A re-export is otherwise a full
    forward decode of the whole video for pixels that cannot have changed, which made re-running
    the export unaffordable in practice — and that is how two sessions came to sit on a log
    written before `unknown_squares` existed while the code that writes it was already in the
    tree (found 2026-08-09: 760 of 760 dirty rows unprotected). The plan is a pure function of
    the candidate, so re-running it is the intended way to pick up an exporter fix; only the
    decode was in the way. An empty file counts as absent so a truncated write still repairs.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    have = {i for i in wanted if (f := out_dir / f"{i:06d}.png").is_file() and f.stat().st_size > 0}
    todo = wanted - have
    if have:
        print(f"  {len(have)} frames already on disk, {len(todo)} to decode")
    if not todo:
        return have
    # Nothing in a PNG says whether the barrel was taken out of it, so a set written by
    # `:desktop undistort` carries a receipt — and decoding one raw frame into it would make a
    # silently MIXED session, which is the exact failure mode specs/52 measured from the other
    # side (lens-corrected inference against a distorted corpus: 003957 67 -> 15 plies). Refuse,
    # and name the command that fills the gap properly.
    marker = out_dir / "lens.json"
    if marker.is_file():
        raise ValueError(
            f"{out_dir} holds undistorted frames ({marker.name}) and {len(todo)} planned frames "
            f"are missing. Re-run `:desktop undistort <video> {out_dir} every=<n>` with an "
            f"`every` that covers them — never decode raw frames into an undistorted set."
        )
    last, decoded = max(todo), set()
    recording = Recording(video)
    if len(recording.segments) > 1:
        print(f"  recording is {len(recording.segments)} segments: "
              f"{', '.join(p.name for p in recording.segments)}")
    with closing(recording.frames()) as stream:
        for idx, frame in stream:
            if idx in todo:
                cv2.imwrite(str(out_dir / f"{idx:06d}.png"), frame if rotate is None else cv2.rotate(frame, rotate))
                decoded.add(idx)
            if idx >= last:
                break
            if (idx + 1) % 1000 == 0:
                print(f"  decoded {idx + 1}/{last + 1} frames, {len(decoded)} written")
    arrived = have | decoded
    if len(arrived) < len(wanted):
        print(f"[WARN] {len(wanted) - len(arrived)} planned frames never arrived from {video}")
    return arrived


"""Per-row geometry a REPAIR step owns, which the exporter must never write back over.

`chesslab session scan|autofix` re-fits each frame's quad against the board's own grid and
records the verdict; the exporter only ever knew the candidate's single median quad. Measured on
the two exported sessions (2026-08-09): the repair had turned 1 quad into 11 and 7, moving corners
by up to 16 px — about a seventh of a cell, well past the 4 % criterion — and a plain re-export
silently put the median back. Since re-running the export is now the way to pick up a planner fix,
it has to be non-destructive, so these keys are carried over per frame from the log on disk.
"""
REPAIRED_KEYS = ("corners", "corners_source", "corners_prev", "corners_set_at", "align_worst_px")


def carry_repaired_geometry(session_dir: Path, rows: list[dict]) -> int:
    """Copy the repair's per-frame geometry onto freshly planned rows. Returns rows carried."""
    log = session_dir / "log.jsonl"
    if not log.is_file():
        return 0
    old = {}
    for line in log.read_text(encoding="utf-8").splitlines():
        if line.strip():
            row = json.loads(line)
            old[Path(row["frame"]).stem] = row
    carried = 0
    for row in rows:
        previous = old.get(Path(row["frame"]).stem)
        if previous is None:
            continue
        # Evidence of repair is a re-fitted quad OR a measured offset — `scan` records the verdict
        # without touching `corners_source`, so keying on the source alone would drop its numbers.
        # A pristine row carries neither, and is left alone so a re-measured CANDIDATE still flows
        # through instead of being masked by its own earlier export.
        if previous.get("corners_source") == "realgame-export" and previous.get("align_worst_px") is None:
            continue
        for key in REPAIRED_KEYS:
            if key in previous:
                row[key] = previous[key]
        carried += 1
    return carried


#: What `corners_source` says about a fitted row, one whose inherited quad the fit could not beat,
#: and one whose grid could not be read at all. Three values and not one "fallback": 167 of
#: 20-48-55's 637 rows are the middle case, and calling those a failure would send a reader looking
#: for damage that is not there.
FIT_SOURCE, FIT_KEPT, FIT_FAILED = "export-fit", "export-fit-kept", "export-fit-failed"


def fit_rows_to_grid(session_dir: Path, rows: list[dict], profile) -> dict:
    """Fit every written frame's quad to the board's OWN grid, per frame, at export time.

    The candidate carries one median quad for the whole video, and a median is not a measurement
    of any single frame: rg-2026-08-13-19-34-23 went out with all 137 frames uniformly ~17 px off
    their own grooves, and a hand-run `session scan` + `autofix` afterwards brought it to 2.71 px
    median. That repair is this same fit, so it runs by default instead of being hoped for.

    A frame the fit cannot read — hand over the grid, dark junk — KEEPS the quad it inherited and
    is marked [FIT_FAILED]. Nothing is dropped: those dirty rows are the wanted material.
    `improve_quad` returns nothing unless it improves its own frame, so this can only help.
    """
    from .alignment import improve_quad

    counts = {FIT_SOURCE: 0, FIT_KEPT: 0, FIT_FAILED: 0}
    worsts = []
    for row in rows:
        frame = cv2.imread(str(session_dir / row["frame"]))
        quad, before, after = (
            (None, float("nan"), float("nan"))
            if frame is None
            else improve_quad(frame, row["corners"], profile)
        )
        if quad is not None:
            row["corners"] = [[float(x), float(y)] for x, y in quad]
        worst = after if quad is not None else before
        source = FIT_SOURCE if quad is not None else (FIT_KEPT if worst == worst else FIT_FAILED)
        row["corners_source"] = source
        counts[source] += 1
        if worst == worst:
            row["align_worst_px"] = round(float(worst), 2)
            worsts.append(row["align_worst_px"])
    worsts.sort()
    return {
        **counts,
        "median": worsts[len(worsts) // 2] if worsts else None,
        "max": worsts[-1] if worsts else None,
    }


def write_session(session_dir: Path, name: str, candidate: dict, rows: list[dict]) -> Path:
    """`session.yaml` + `log.jsonl` in the §2 shape of `docs/data-pipeline.md`, nothing else."""
    from .sessions import backup_log

    # A re-export REPLACES a log that may hold hand-set quads or a review's verdicts. Same
    # `log.jsonl.bak.<stamp>` convention `session scan|autofix|adopt` use, for the same reason.
    if (session_dir / "log.jsonl").is_file():
        print(f"  previous log backed up as {backup_log(session_dir / 'log.jsonl')}")
    meta = {
        "session_id": session_dir.name,
        "profile": EXPORT_PROFILE,
        "mode": "track",
        "created_at": base_time(candidate).isoformat(),
        "frame_size": [int(v) for v in candidate["geometry"]["frame_size"]],
        "notes": f"exported from data/realgames/{name} (specs/53-01)",
        "reviewed": True,
    }
    session_dir.mkdir(parents=True, exist_ok=True)
    with (session_dir / "session.yaml").open("w", encoding="utf-8") as fh:
        yaml.safe_dump(meta, fh, sort_keys=False, allow_unicode=True)
    with (session_dir / "log.jsonl").open("w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    return session_dir


def cell_counts(rows: list[dict]) -> dict[tuple[str, str], int]:
    """(square, label) -> how many rows hold it. That pair is what `per_cell_cap` caps on."""
    by_fen: dict[str, dict[str, str]] = {}
    counts: dict[tuple[str, str], int] = {}
    for row in rows:
        labels = by_fen.get(row["fen"])
        if labels is None:
            labels = by_fen[row["fen"]] = GameState(row["fen"]).labels()
        for square, label in labels.items():
            counts[(square, label)] = counts.get((square, label), 0) + 1
    return counts


def yield_lines(rows: list[dict]) -> list[str]:
    """Raw crops against what a dataset build would actually keep — the honest yield."""
    lines = [YIELD_HEADER]
    for population, subset in (
        ("quiet", [r for r in rows if not r.get("dirty")]),
        ("dirty", [r for r in rows if r.get("dirty")]),
        ("total", rows),
    ):
        counts = cell_counts(subset)
        lines.append(
            f"{population:10} {len(subset):>6} {64 * len(subset):>8} {len(counts):>6} "
            f"{sum(min(n, 4) for n in counts.values()):>7} "
            f"{sum(min(n, 16) for n in counts.values()):>7}"
        )
    return lines


def export_session(
    name: str,
    *,
    quiet_margin_s: float = 1.0,
    every: int = 3,
    dirty: bool = True,
    measure: bool = True,
    fit: bool = True,
    report_only: bool = False,
) -> dict:
    """A confirmed candidate becomes `data/sessions/rg-<name>/`, and reports what it is worth."""
    candidate = load_candidate(name)
    if not candidate.get("confirmed"):
        raise ValueError(f"{name}: not confirmed — run `chesslab realgames confirm {name}` first")
    margin_frames = int(round(quiet_margin_s * video_fps(candidate)))
    settle = None
    rotation = None
    if not report_only:
        # Detected ONCE, before the settle pass: its crops read the candidate's quad, and on a
        # phone decode without the rotation every anchor pair sits below SETTLE_MIN_DELTA — the
        # measurement silently returned nothing. Commit frames are quiet, so they probe cleanly.
        ensure_export_profile(EXPORT_PROFILE, candidate)
        rotation = detect_rotation(
            video_path(name, candidate), candidate, {int(m["frame"]) for m in candidate["moves"]}
        )
        if rotation is not None:
            names = {cv2.ROTATE_90_CLOCKWISE: "90° cw", cv2.ROTATE_90_COUNTERCLOCKWISE: "90° ccw", cv2.ROTATE_180: "180°"}
            print(f"  decode rotation: {names[rotation]} (cv2 and the candidate geometry disagree on orientation)")
    if measure and not report_only:
        settle = measure_settle(video_path(name, candidate), candidate, load_profile(EXPORT_PROFILE), rotate=rotation)
        found = sum(len(v) for v in settle.values())
        print(f"  settle measured for {found} squares over {len(settle)} plies")
    rows = plan_rows(candidate, margin_frames=margin_frames, every=every, dirty=dirty, settle=settle)
    if not rows:
        raise ValueError(f"{name}: no reviewed interval survives a {quiet_margin_s}s margin")
    session_dir = config.DATA.sessions / f"rg-{name}"
    if not report_only:
        planned = {int(Path(r["frame"]).stem) for r in rows}
        arrived = decode_frames(
            video_path(name, candidate),
            planned,
            session_dir / "frames",
            rotate=rotation,
        )
        rows = [r for r in rows if int(Path(r["frame"]).stem) in arrived]
        if (session_dir / "frames" / "lens.json").is_file():
            # Undistorting MOVES the board in the image, so a quad measured on the raw frames — and
            # any repair fitted to them — describes a picture that no longer exists. Re-measure on
            # the frames that are actually there, and do NOT carry the old geometry over.
            quad = static_quad(sorted((session_dir / "frames").glob("[0-9]*.png")),
                               load_profile(EXPORT_PROFILE))
            for row in rows:
                row["corners"] = quad
                row["corners_source"] = "undistorted-remeasure"
            print("  geometry re-measured on the UNDISTORTED frames (the raw-frame repair is void)")
        else:
            carried = carry_repaired_geometry(session_dir, rows)
            if carried:
                print(f"  kept the repaired geometry of {carried} frames (`session scan|autofix`)")
        if fit:
            # Last, so the fit starts from the best quad this export knows — a carried repair or
            # the undistorted re-measure — and refines THAT rather than the candidate's median.
            stats = fit_rows_to_grid(session_dir, rows, load_profile(EXPORT_PROFILE))
            print(f"  grid fit over {len(rows)} frames: {stats[FIT_SOURCE]} re-fitted, "
                  f"{stats[FIT_KEPT]} already on the grid, {stats[FIT_FAILED]} unreadable — "
                  f"align_worst_px median {stats['median']}, max {stats['max']}")
        write_session(session_dir, name, candidate, rows)
    for line in yield_lines(rows):
        print(line)
    return {
        "session_dir": session_dir,
        "rows": rows,
        "margin_frames": margin_frames,
        "segments": len(known_segments(candidate)),
        "report_only": report_only,
    }


#: The position a hand-only recording is filmed in unless another one is given.
START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
#: Pseudo-interval length for a static recording, in seconds. The producer's `quiet_pool` reaches
#: SPAN intervals either way, so this only has to be short enough that a hand does not fill one.
STATIC_INTERVAL_S = 2.0
#: Static recordings get their own profile — their quad is measured, not taken from a candidate.
STATIC_PROFILE = "static"
#: Marker centres are NOT the playing field's corners — the printed border with the rank and file
#: labels sits between them. Every real-game candidate from this rig records 0.045, and 0.0 puts
#: that border inside the 64 cells: the crops then straddle the edge and the outer rank reads the
#: letters. Found by the user on the first static probe (2026-08-09).
STATIC_MARGIN = 0.045


def frame_activity(frames: list[Path], *, width: int = 240) -> dict[int, float]:
    """Per frame: how far it sits from the recording's own pixel-wise median, mean absolute.

    On a board that never changes, the median IS the clean board — a hand covers a minority of the
    pixels in a minority of the frames, and the median ignores both. That makes "is a hand in this
    frame" a MEASUREMENT rather than a declaration, which is the whole advantage of a static
    recording over a game: no margin around a commit has to stand in for it.
    """
    import numpy as np

    small = []
    for path in frames:
        img = cv2.imread(str(path))
        if img is None:
            raise FileNotFoundError(f"frame not readable: {path}")
        height = max(1, round(width * img.shape[0] / img.shape[1]))
        small.append(cv2.resize(img, (width, height)).astype(np.int16))
    stack = np.stack(small)
    deviation = np.abs(stack - np.median(stack, axis=0)).mean(axis=(1, 2, 3))
    return {int(p.stem): float(d) for p, d in zip(frames, deviation, strict=True)}


def static_quad(frames: list[Path], profile) -> list[list[float]]:
    """The board quad of a static recording: the per-corner MEDIAN over the frames.

    A single frame's quad is hostage to whichever marker the hand happens to cover; the median over
    the whole recording is not. Measured on the FRAMES, never on the source video — they are
    undistorted and the video is not, and a quad fitted through the barrel does not fit without it.
    """
    import numpy as np

    from .calibration import MarkerTracker, board_corners_for_frame

    tracker = MarkerTracker()
    seen = []
    for path in frames:
        img = cv2.imread(str(path))
        if img is None:
            continue
        quad = board_corners_for_frame(img, profile, tracker)
        if quad is not None:
            seen.append(quad)
    if not seen:
        raise ValueError("no frame yielded a board quad — are the markers visible?")
    median = np.median(np.array(seen, dtype=float), axis=0)
    print(f"  quad from {len(seen)}/{len(frames)} frames (per-corner median)")
    return [[float(x), float(y)] for x, y in median]


def ensure_static_profile(profile: str, quad: list[list[float]], frame_size, board_size: int,
                          margin: float) -> Path:
    """The profile a static recording's crops are cut through — same shape as the game exporter's.

    `pad_side` and `out_size` are the crop pool's, not `CropParams.default`'s: these crops JOIN the
    pool, and a harness that invents profile fields is a silent domain shift (CLAUDE.md, the
    `ClipDriver` incident).
    """
    from .calibration import CalibrationProfile, CropParams, compute_homography, profile_path

    path = profile_path(profile)
    if path.exists():
        return path
    prof = CalibrationProfile(
        profile=profile,
        camera_index=-1,
        frame_size=(int(frame_size[0]), int(frame_size[1])),
        board_size=board_size,
        image_corners=[[float(x), float(y)] for x, y in quad],
        homography=compute_homography(quad, board_size, margin),
        white_pov=True,
        crop=CropParams(
            cell=board_size / 8.0,
            pad_up=0.0,
            pad_side=config.CROP.pad_side,
            out_size=(config.CROP.out_w, config.CROP.out_h),
        ),
        margin=margin,
        source=f"static:{profile}",
    )
    print(f"[OK] calibration profile '{profile}' created from the measured quad ({path})")
    return prof.save(path)


def _detect_profile(frame_size, board_size: int):
    """An in-memory profile for MARKER DETECTION only — never saved, never used for a warp."""
    from .calibration import CalibrationProfile, CropParams, compute_homography

    unit = [[0.0, 0.0], [float(frame_size[0]), 0.0],
            [float(frame_size[0]), float(frame_size[1])], [0.0, float(frame_size[1])]]
    return CalibrationProfile(
        profile="__detect__", camera_index=-1,
        frame_size=(int(frame_size[0]), int(frame_size[1])), board_size=board_size,
        image_corners=unit, homography=compute_homography(unit, board_size, 0.0),
        white_pov=True, crop=CropParams(cell=board_size / 8.0, pad_up=0.0,
                                        pad_side=config.CROP.pad_side,
                                        out_size=(config.CROP.out_w, config.CROP.out_h)),
        margin=0.0, source="detect-only",
    )


def export_static(
    name: str, *, fen: str = START_FEN, fps: float = 30.0, quiet_frac: float = 0.35,
    board_size: int = 928, margin: float = STATIC_MARGIN, report_only: bool = False,
) -> dict:
    """A hand-over-a-standing-position recording becomes a session, with no game to confirm.

    The position never changes, so every square's label is known for every frame — no PGN, no
    commit timeline, and none of the pre-commit doubt `unknown_squares` exists for. What DOES have
    to be found is where the hand is, and on a static board that is measurable: `frame_activity`
    against the recording's own pixel median. The calm frames become the producer's quiet pool, the
    rest its dirty rows, and pseudo-intervals of [STATIC_INTERVAL_S] give `quiet_pool` the
    neighbours it reaches for.

    Frames must already be on disk and UNDISTORTED (`:desktop undistort`), which is why nothing
    here opens the video.
    """
    import numpy as np

    session_dir = config.DATA.sessions / f"rg-{name}"
    frames_dir = session_dir / "frames"
    frames = sorted(frames_dir.glob("[0-9]*.png"))
    if not frames:
        raise FileNotFoundError(f"no frames in {frames_dir} — run `:desktop undistort` first")
    if not (frames_dir / "lens.json").is_file():
        raise ValueError(f"{frames_dir} carries no lens.json — these frames were not undistorted")
    first = cv2.imread(str(frames[0]))
    frame_size = (first.shape[1], first.shape[0])

    # Measure FIRST, save SECOND. The detector needs a profile for the marker dictionary and the
    # board size only, so it gets a throwaway one; saving a profile before the quad is known would
    # persist a placeholder homography that every later `load_profile` would believe.
    quad = static_quad(frames, _detect_profile(frame_size, board_size))
    prof_path = ensure_static_profile(STATIC_PROFILE, quad, frame_size, board_size, margin)
    activity = frame_activity(frames)
    cut = float(np.quantile(list(activity.values()), quiet_frac))
    span = max(1, int(round(STATIC_INTERVAL_S * fps)))
    base = datetime.now(UTC)
    rows = [
        {
            "frame": f"frames/{p.name}",
            "ply": int(p.stem) // span,
            "fen": fen,
            "ts": (base + timedelta(seconds=int(p.stem) / fps)).isoformat(),
            "corners": quad,
            "corners_source": "static-export",
            **({} if activity[int(p.stem)] <= cut else {"dirty": True}),
        }
        for p in frames
    ]
    quiet = sum(1 for r in rows if not r.get("dirty"))
    print(f"  {len(rows)} rows over {1 + max(r['ply'] for r in rows)} pseudo-intervals: "
          f"{quiet} quiet (activity <= {cut:.1f}), {len(rows) - quiet} dirty")
    if not report_only:
        candidate = {"geometry": {"frame_size": list(frame_size)}, "video": f"static/{name}",
                     "created_at": base.isoformat()}
        write_session(session_dir, name, candidate, rows)
    return {"session_dir": session_dir, "rows": rows, "profile": prof_path, "quiet": quiet}


#: How far back a commit's settle point is looked for, and how far ahead the "after" anchor sits.
SETTLE_BACK, SETTLE_AHEAD = 180, 40
#: Below this mean absolute difference the two anchors are the same picture — the square carries no
#: visible change and no settle point can be found for it.
SETTLE_MIN_DELTA = 8.0


def measure_settle(video: Path, candidate: dict, profile,
                   rotate: int | None = None) -> dict[int, dict[str, int]]:
    """`ply -> {square: the frame from which the image already shows the move}`.

    [rotate] is `detect_rotation`'s verdict, applied before cropping — the quad lives in the
    rotated view, and against an unrotated phone decode every anchor pair reads as noise.

    The engine commits on QUIET, not on arrival: a piece that is placed while the hand lingers is
    visible for as long as the hand stays. Measured on VID_20260726_233432 (2026-08-09): the image
    leads the commit by a median of well under a second but by **1.8 s at p90 and 4.6 s at worst**,
    and 5 of 15 changed squares lead it by more than the 1 s the fixed margin protects. A constant
    margin is therefore the wrong instrument — the number differs per move by an order of magnitude,
    so it gets measured per move.

    Nearest-neighbour against two anchors (one clearly before, one clearly after), which needs no
    threshold: one of the two is always closer. A square whose anchors look alike is reported NOT AT
    ALL rather than guessed, and the caller falls back to the fixed window for it.
    """
    import numpy as np

    quad = candidate["geometry"]["corners"]
    squares = all_squares()
    moves = candidate["moves"]
    recording = Recording(video)
    out: dict[int, dict[str, int]] = {}
    for i, move in enumerate(moves):
        before = moves[i - 1].get("fen_after") if i else candidate.get("start_fen")
        touched = changed_squares(before, move.get("fen_after"))
        commit = int(move["frame"])
        if not touched or commit < SETTLE_BACK:
            continue
        lo, hi = commit - SETTLE_BACK, commit + SETTLE_AHEAD
        cells = {}
        with closing(recording.frames(lo)) as stream:
            for idx, frame in stream:
                if rotate is not None:
                    frame = cv2.rotate(frame, rotate)
                crops = crops_for_frame(frame, quad, profile, out_size=(48, 48))
                cells[idx] = {sq: crops[squares.index(sq)].astype(np.int16) for sq in touched}
                if idx >= hi:
                    break
        if lo not in cells or hi not in cells:
            continue
        for sq in touched:
            pre, post = cells[lo][sq], cells[hi][sq]
            if float(np.abs(pre - post).mean()) < SETTLE_MIN_DELTA:
                continue
            for f in range(hi, lo - 1, -1):
                cell = cells.get(f)
                if cell is None:
                    continue
                if float(np.abs(cell[sq] - pre).mean()) < float(np.abs(cell[sq] - post).mean()):
                    out.setdefault(int(move["ply"]), {})[sq] = min(f + 1, commit)
                    break
    return out


def unknown_for(seg: dict, index: int, margin_frames: int, settle: dict | None) -> list[str]:
    """Squares this frame cannot vouch for: the NEXT move's, from when they visibly changed.

    With a measurement, a square is unknown from its own settle frame — which can lie well before
    the quiet margin, so a QUIET row is protectable too, and that is the poison case the fixed
    window missed entirely. Without one, the old rule stands: the whole trailing window.
    """
    touches = seg.get("next_touches") or []
    if not touches:
        return []
    measured = (settle or {}).get(seg["ply"] + 1) or {}
    if measured:
        named = sorted(sq for sq in touches if index >= measured.get(sq, seg["end"] - margin_frames))
        return named
    return sorted(touches) if index >= seg["end"] - margin_frames else []
