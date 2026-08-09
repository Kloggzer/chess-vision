"""Real-game candidates: the label is confirmed against the game that was played, or it is nothing.

Everything downstream labels crops from "the position at frame N was X", and the Kotlin writer
cannot vouch for that claim — `RealGameCandidate.writeCandidate` hardcodes `confirmed: false`.
Where the true game is on disk as `reference.pgn`, the check is mechanical: an order-preserving
LCS over SANs decides the agreements, and a human only ever looks at the disagreements.
"""

from __future__ import annotations

import json
import os
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from pathlib import Path

import chess.pgn
import cv2
import yaml

from . import config
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
    """Order-preserving match of candidate SANs against the truth SANs.

    Mirrors `RealGameScore.scoreMoves` including its tie-break (truth advances first), so a move
    committed out of order counts as invented instead of quietly matching a later identical SAN
    backwards. Returns matched (truth, candidate) index pairs, invented candidate indices and
    missed truth indices.
    """
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
    """The verdict as three lists, never as one accuracy — the two directions do not average."""
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
    """Compare a candidate to its reference game, then write the human's verdict.

    `ask` decides one invented ply at a time — a resync-era candidate may legitimately hold a
    ply the PGN has as a later duplicate, and only a human can tell. Without it, and always
    under `yes`, an unmatched ply is rejected; that is the scripted case.
    """
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


def known_segments(candidate: dict) -> list[dict]:
    """One segment per REVIEWED ply: `[commit frame, next commit frame)` holds its `fen_after`.

    The next commit closes the segment whether or not that ply was reviewed — a commit is where
    the board changed, and an unreviewed one is still evidence that it did. A reviewed ply with
    no commit after it has no known end (the tracker stopped, or lost the position), so it
    contributes nothing rather than a guess about the rest of the video.
    """
    moves = candidate["moves"]
    reviewed = set(candidate.get("reviewed_plies") or ())
    out = []
    for i, move in enumerate(moves[:-1]):
        start, end = int(move["frame"]), int(moves[i + 1]["frame"])
        if int(move["ply"]) not in reviewed or end <= start:
            continue
        out.append(
            {
                "ply": int(move["ply"]),
                "fen": move["fen_after"],
                "start": start,
                "end": end,
                "next_touches": changed_squares(move["fen_after"], moves[i + 1].get("fen_after")),
            }
        )
    return out


def changed_squares(before: str | None, after: str | None) -> list[str]:
    """Squares whose occupant differs between two FENs — the next move's footprint.

    Derived from the two positions rather than from the SAN so castling, captures and
    en-passant need no special case: whatever changed, changed.
    """
    if not before or not after:
        return []
    a, b = GameState(before).labels(), GameState(after).labels()
    return sorted(sq for sq in a if a[sq] != b.get(sq))


def plan_rows(candidate: dict, *, margin_frames: int, every: int, dirty: bool) -> list[dict]:
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
                    # Only the TRAILING window is short-labeled: the leading one sits after its
                    # own commit, where the FEN is already true.
                    if lo == q1 and seg["next_touches"]:
                        row["unknown_squares"] = seg["next_touches"]
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


def decode_frames(video: Path, wanted: set[int], out_dir: Path) -> set[int]:
    """Write the wanted source frames as `frames/NNNNNN.png`, decoding STRICTLY forward.

    Never `CAP_PROP_POS_FRAMES`: seeking a long clip lands next to the requested index (the
    2026-08-06 stale-index defect class), and an index that is off by one here is a wrong LABEL,
    not a blurry picture. Returns the indices that actually arrived.

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
    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise FileNotFoundError(f"cannot open video: {video}")
    last, decoded, idx = max(todo), set(), 0
    try:
        while idx <= last:
            ok, frame = cap.read()
            if not ok:
                break
            if idx in todo:
                cv2.imwrite(str(out_dir / f"{idx:06d}.png"), frame)
                decoded.add(idx)
            idx += 1
            if idx % 1000 == 0:
                print(f"  decoded {idx}/{last + 1} frames, {len(decoded)} written")
    finally:
        cap.release()
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


def write_session(session_dir: Path, name: str, candidate: dict, rows: list[dict]) -> Path:
    """`session.yaml` + `log.jsonl` in the §2 shape of `docs/data-pipeline.md`, nothing else."""
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
    report_only: bool = False,
) -> dict:
    """A confirmed candidate becomes `data/sessions/rg-<name>/`, and reports what it is worth."""
    candidate = load_candidate(name)
    if not candidate.get("confirmed"):
        raise ValueError(f"{name}: not confirmed — run `chesslab realgames confirm {name}` first")
    margin_frames = int(round(quiet_margin_s * video_fps(candidate)))
    rows = plan_rows(candidate, margin_frames=margin_frames, every=every, dirty=dirty)
    if not rows:
        raise ValueError(f"{name}: no reviewed interval survives a {quiet_margin_s}s margin")
    session_dir = config.DATA.sessions / f"rg-{name}"
    if not report_only:
        ensure_export_profile(EXPORT_PROFILE, candidate)
        arrived = decode_frames(
            video_path(name, candidate),
            {int(Path(r["frame"]).stem) for r in rows},
            session_dir / "frames",
        )
        rows = [r for r in rows if int(Path(r["frame"]).stem) in arrived]
        carried = carry_repaired_geometry(session_dir, rows)
        if carried:
            print(f"  kept the repaired geometry of {carried} frames (`session scan|autofix`)")
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
