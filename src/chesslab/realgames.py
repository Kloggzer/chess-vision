"""Real-game candidates: label confirmed against played game, or nothing.
LCS over SANs decides matches; human sees only disagreements."""

from __future__ import annotations

import json
import math
import os
from collections.abc import Callable, Iterator
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor, as_completed, wait
from contextlib import closing, contextmanager, nullcontext
from datetime import UTC, datetime, timedelta
from functools import partial
from itertools import pairwise
from pathlib import Path
from typing import Any

import chess.pgn
import cv2
import yaml

from . import config
from .calibration import MESH_CURV_LIMIT, MESH_TILT_LIMIT, load_profile
from .ioutil import read_jsonl, write_rows
from .labeling import all_squares, crops_for_frame
from .recording import Recording
from .state import GameState
from .work_audit import measure, object_revision, record_interval


def game_dir(name: str) -> Path:
    """The one folder for a recording. `session_id` keeps the `rg-` prefix, the directory never had it."""
    return config.DATA.recordings / name


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
    """One unmatched ply as a line the human can act on: the ply, and the picture that shows it.

    The replay writes `.webp` (`AnnotatedFrames.REVIEW_SUFFIX`); runs before 2026-08-17 left PNG.
    """
    # `retime._write_boards` rewrites the review pictures around `frame_review` and deletes the
    # old set, so the entry frame names a file that is gone. `review-cards.ts` reads the same pair.
    # `is None`, nicht `or`: Frame 0 ist ein Bild, kein fehlender Wert.
    review = move.get("frame_review")
    stem = f"{int(move['frame'] if review is None else review):06d}"
    frames = game_dir(name) / "frames"
    shot = next((p for ext in (".webp", ".png") if (p := frames / f"{stem}{ext}").is_file()),
                frames / f"{stem}.webp")
    return f"ply {move['ply']} {move['san']} @frame {stem} -> {shot.as_posix()}"


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


def is_archived(name: str) -> bool:
    """The UI's `ui-meta.json` archive flag — a human saying "not this one". Wirft, wenn er unlesbar ist.

    Python ignored it, so a re-export happily wrote three archived games back into the corpus
    (2026-08-19). Hiding a game from a list and keeping it out of the training data are the same
    intent, and two truths about one game are worth less than one.
    """
    meta = game_dir(name) / "ui-meta.json"
    if not meta.exists():
        return False
    try:
        return bool(json.loads(meta.read_text(encoding="utf-8-sig")).get("archived"))
    except (json.JSONDecodeError, OSError) as exc:
        raise ValueError(f"{name}: ui-meta.json ist unlesbar ({exc}) — der Archiv-Status laesst "
                         "sich nicht feststellen, also wird nichts exportiert") from exc


def reference_is_the_phones_own(name: str) -> bool:
    """Is `reference.pgn` a copy of the phone's own PGN (the UI's `adopt-pgn`)?

    Then `confirm` compares the tracker's replay against the tracker's live run — same algorithm,
    same video. It catches a divergence between the two, never a move both got wrong.
    """
    import hashlib

    ref = game_dir(name) / "reference.pgn"
    games = game_dir(name) / "files" / "games"
    if not ref.exists() or not games.is_dir():
        return False
    digest = hashlib.md5(ref.read_bytes()).hexdigest()
    return any(hashlib.md5(p.read_bytes()).hexdigest() == digest for p in games.glob("*.pgn"))


def confirm(name: str, *, yes: bool, ask: Callable[[dict], bool] | None = None) -> dict:
    """Compare candidate to reference game, write verdict.
    `ask` decides invented plies one at a time; under `yes`, unmatched plies rejected."""
    candidate = load_candidate(name)
    truth = truth_sans(name)
    moves = candidate["moves"]
    matched, invented, missed = lcs_report(truth, [m["san"] for m in moves])
    for line in report_lines(name, moves, truth, matched, invented, missed):
        print(line)
    if yes and reference_is_the_phones_own(name):
        raise ValueError(
            f"{name}: reference.pgn IS the phone's own PGN, so `--yes` would confirm the tracker "
            f"against itself. Confirm it by hand, or put an outside notation in place first.")
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
#: Frames between progress lines. The log IS the progress channel (`platform/app/lib/progress.ts`).
PROGRESS_EVERY = 100


#: Wie oft ein Worker seinen Stand meldet. Feiner als `PROGRESS_EVERY`, weil ein Abschnitt oft
#: kürzer als 100 Zeilen ist — der Balken stünde sonst bis zum Ende der Phase auf null.
WORKER_PROGRESS_EVERY = 10


def say_progress(progress, done: int, line: str) -> None:
    """A serial run prints its own line; a worker only counts, because the bar belongs to one log.

    Four workers each printing `N/M` would make `lib/progress.ts` (last number wins) jump about.
    """
    if progress is None:
        if done % PROGRESS_EVERY == 0:
            print(line, flush=True)
    elif done % WORKER_PROGRESS_EVERY == 0:
        progress(WORKER_PROGRESS_EVERY)
YIELD_HEADER = f"{'population':10} {'rows':>6} {'crops':>8} {'cells':>6} {'cap4':>7} {'cap16':>7}"


def video_fps(candidate: dict) -> float:
    """Die Bildrate der Aufnahme. NICHT geraten: sie steuert `margin_frames`, das letzte
    Intervall und jedes `ts`, und die Aufnahmen laufen zwischen 14,8 und 30,0."""
    fps = (candidate.get("clock") or {}).get("fps")
    if not fps:
        raise ValueError("candidate.json nennt keine clock.fps — ohne sie waeren Marge und "
                         "Zeitstempel geraten (`capture_import.container_fps` bricht ebenso ab)")
    return float(fps)


def base_time(candidate: dict) -> datetime:
    """The recording's wall clock — row timestamps are video time counted off it, not export time."""
    try:
        return datetime.fromisoformat(str(candidate.get("created_at", "")).replace("Z", "+00:00"))
    except ValueError as exc:
        # JETZT ist die Exportzeit, die der Docstring ausschliesst — sie landet als `ts` jeder
        # Zeile und ist am Ergebnis nicht als abgeleitet zu erkennen. Zwei Exporte derselben
        # Aufnahme ergaeben zwei verschiedene Aufnahmeuhren.
        raise ValueError("candidate.json nennt kein lesbares `created_at` — die Zeitstempel "
                         "waeren die Exportzeit, nicht die der Aufnahme") from exc


def video_path(name: str) -> Path:
    """The recording's video HEAD — the file `Recording` expands into its segments.

    Two real shapes, not a fallback: an early recording keeps `video.mp4` at its root, a phone
    upload keeps the whole raw tree and its video sits in `files/sessions/<id>/`. It must be the
    file where it really lies — `recording_segments` finds `video-001.mp4` BESIDE the head, so a
    copy at the root would hide the other 8 parts of a 9-part game and truncate it silently.

    It used to try three paths, all of which missed after the 2026-08-20 rename to
    `data/recordings/`: 24 of 24 candidates failed at once, because a fallback hides a wrong path
    until every branch is wrong.
    """
    root = game_dir(name)
    for p in (root / "video.mp4", *sorted(root.glob("files/sessions/*/video.mp4"))):
        if p.is_file():
            return p
    raise FileNotFoundError(f"{name}: no video.mp4 under {root}")


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
                # The quad the decider stood on at THIS commit (Kotlin `CommittedPly.corners`); a board
                # moved mid-game is cut right from here on, `geometry.corners` only when a ply has none.
                "corners": move.get("corners"),
                # Kotlin `CommittedPly.refProvisional`: the commit beat the motion hold, so the
                # frames right after it were cut against a reference that was re-captured later.
                "ref_provisional": bool(move.get("ref_provisional")),
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


def spread_indices(lo: int, hi: int, n: int) -> list[int]:
    """`n` source indices spread evenly over `[lo, hi)`, ends included, never duplicated.

    This is what `per_position` samples a quiet window with: a position that stood for ten seconds
    and one that stood for two then weigh the same. Positions are what the corpus is short of —
    246 of them over 9 386 boards (`docs/sampling.md`).
    """
    span = hi - lo
    if span <= 0 or n <= 0:
        return []
    n = min(n, span)          # a short window has fewer frames than boards asked for
    if n == 1:
        return [lo]
    return [lo + round(i * (span - 1) / (n - 1)) for i in range(n)]


def pick_spread(items: list, ok, n: int, *, prefer=(), tol: int = 0) -> list:
    """`n` of `items` spread evenly over the position, each the nearest one `ok` accepts.

    A slot whose own frame carries a hand borrows from beside it instead of going empty — dropping
    it is what starved the corpus (20 % of positions kept 8, median 5). An item in `prefer` takes
    the slot while it stays within `tol` places of the nearest one.
    """
    usable = [i for i, it in enumerate(items) if ok(it)]
    taken: set[int] = set()
    for slot in spread_indices(0, len(items), n):
        free = [i for i in usable if i not in taken]
        if not free:
            break
        best = min(free, key=lambda i: (abs(i - slot), i))
        near = [i for i in free if items[i] in prefer and abs(i - slot) <= abs(best - slot) + tol]
        taken.add(min(near, key=lambda i: (abs(i - slot), i)) if near else best)
    return [items[i] for i in sorted(taken)]


def _export_row(seg: dict, idx: int, corners: list, base, fps: float,
                margin_frames: int, settle: dict | None) -> dict:
    """One log row for one source index: the interval's FEN, and what is in doubt on it."""
    row = {"frame": f"frames/{idx:06d}.png", "ply": seg["ply"], "fen": seg["fen"],
           "ts": (base + timedelta(seconds=idx / fps)).isoformat(),
           "corners": seg.get("corners") or corners, "corners_source": "realgame-export"}
    if unknown := unknown_for(seg, idx, margin_frames, settle):
        row["unknown_squares"] = unknown
    return row


def corrected_frames(name: str) -> set[int]:
    """Source indices this recording carries a hand correction for — a correction names a picture.

    Reads the recording's own ledger, so there is nothing to filter by session: every row in it
    is about this recording, and every label in it is an identity (`occluded` was dropped when the
    scheme went to 13 + coverage).
    """
    from .labeling import load_corrections

    return {int(frame)
            for (_sid, frame, _square) in load_corrections(game_dir(name) / "corrections.jsonl")
            if str(frame).isdigit()}


def reported_dirty(session_id: str, verdict: str = "dirty-frame") -> set[int]:
    """Source indices a human called dirty in the labeling stream (`review-notes.jsonl`).

    `verdict="matte-wanted"` liest denselben Zettel der Frame-Lane: ein strittiges Frame, das ein
    Mensch zur Matte geschickt hat statt es wegzuwerfen. Es steht schon auf dem dirty-Stapel, nur
    nicht als `occluded` — es kommt deshalb NUR ueber `alpha_worker(frames=...)` an SAM vorbei.

    The scan measures grooves and a person, and it misses a hand that neither moved a piece nor
    reached over the markers. The human sees it, and the honest word for the frame is the same one
    the scan would have used: the board is unchanged, so the FEN still holds.
    """

    from .config import DATA

    path = DATA.labels / "review-notes.jsonl"
    out = set()
    if not path.exists():
        return out
    for row in read_jsonl(path):
        if (row.get("session_id") == session_id and row.get("verdict") == verdict
                and str(row.get("frame", "")).isdigit()):
            out.add(int(row["frame"]))
    return out


def adopt_reported_dirty(name: str) -> dict:
    """Put the hands a human reported into the log NOW, instead of at the next export.

    `plan_scanned` reads the same set, but only a re-export runs it — hours, and it re-plans every
    frame. The rows here are already stored; marking them `occluded` is what lets the matte RESCUE
    them (`slice_session`), where a measured coverage on a `clean` row would condemn them instead.
    """
    from .labeling import read_session_meta
    from .sessions import _write_log, backup_log, read_log

    session_dir = game_dir(name)
    meta = read_session_meta(session_dir)
    wanted = reported_dirty(meta["session_id"])
    rows = read_log(session_dir)
    stamp = datetime.now(UTC).isoformat()
    changed = []
    for row in rows:
        stem = Path(row.get("board") or row["frame"]).stem
        if not stem.isdigit() or int(stem) not in wanted or row.get("dirty"):
            continue
        row["dirty"] = True
        row["dirty_reason"] = "occluded"
        row["dirty_source"] = "reported"
        row["dirty_set_at"] = stamp
        place_board(session_dir, row)
        changed.append(stem)
    if not changed:
        return {"reported": len(wanted), "changed": 0, "stems": [], "backup": None}
    backup = backup_log(session_dir / "log.jsonl")
    _write_log(session_dir, rows)
    return {"reported": len(wanted), "changed": len(changed), "stems": changed, "backup": backup}


def plan_scanned(candidate: dict, scan: list[dict], *, margin_frames: int,
                 settle: dict | None = None, per_position: int = 8,
                 dirty_per_position: int = 8, prefer=(), reported=(),
                 dirty: bool = True, white_pov: bool = True) -> list[dict]:
    """The rows to store, picked from MEASURED frames instead of from a window around the commit.

    The window let 23 % hands into the clean pool and condemned half its dirty frames for nothing
    (`docs/frame-scan.md`). Each dirty row keeps its `dirty_reason`, so what it is good for later
    is written down instead of guessed again.

    `dirty=False` is `--no-dirty`, which reached only the `--no-scan` branch and therefore did
    nothing on the path every export actually takes.
    """
    from . import framescan

    corners = [[float(x), float(y)] for x, y in candidate["geometry"]["corners"]]
    base, fps = base_time(candidate), video_fps(candidate)
    # Zu unscharf, um eine Figur zu zeigen — gemessen ueber die ganze AUFNAHME, nicht je Ply:
    # der absolute Median schwankt zwischen Aufnahmen um Faktor 28, innerhalb einer kaum. Die
    # Verteilung ist zweigipflig, die Schwelle liegt in der Luecke (`framescan.SHARP_MIN_FRACTION`).
    # Zwei Gruende, ein Brett ganz zu verwerfen: unscharf oder zu dunkel. Beim Licht ist es eine
    # Aufnahme-Entscheidung — die Ecke steht still, also trifft es alle Bretter oder keines.
    blurred = framescan.blurred_indices(scan) | framescan.dark_indices(scan)
    rows = []
    for seg in known_segments(candidate):
        reasons = {k: v for k, v in framescan.classify(seg, scan, white_pov=white_pov).items()
                   if k not in blurred}
        # Only over a CLEAN verdict. `occluded` claims the FEN still holds, which contradicts a
        # measured `stale` or `changed` — and a frame promoted that way is rescued by its matte and
        # carries the lagging FEN into training. The report answers "the scan missed a hand", the
        # one thing it cannot see; it does not answer "the position is unchanged".
        for idx in reported:
            if reasons.get(idx) == "clean":
                reasons[idx] = "occluded"
        clean, flagged = framescan.select(reasons, per_position=per_position,
                                          dirty_per_position=dirty_per_position if dirty else 0,
                                          prefer=prefer)
        # Ein korrigiertes Bild ist Handarbeit und darf nicht an einem Slot scheitern: `prefer`
        # gewinnt nur im Umkreis von `tol`, und nach einer neuen Abtastung liegt es eben daneben.
        # Es kommt ZUSAETZLICH mit, das Acht-Frame-Ziel gilt dafuer nicht. Nur `clean` und
        # `occluded` — bei `stale`/`changed` laeuft die FEN nach, und die Korrektur beschreibt
        # dann ein anderes Brett als das Label (2026-09-09: 4 von 11 so gerettet, 7 blieben).
        rescued = [idx for idx in sorted(prefer)
                   if seg["start"] <= idx < seg["end"] and idx not in clean and idx not in flagged
                   and reasons.get(idx) in ("clean", "occluded")]
        clean = list(clean) + [i for i in rescued if reasons[i] == "clean"]
        flagged = list(flagged) + ([i for i in rescued if reasons[i] == "occluded"] if dirty else [])
        rows.extend(_export_row(seg, idx, corners, base, fps, margin_frames, settle)
                    for idx in clean)
        rows.extend(_export_row(seg, idx, corners, base, fps, margin_frames, settle)
                    | {"dirty": True, "dirty_reason": reasons[idx]} for idx in flagged)
    rows.sort(key=lambda r: r["frame"])
    return rows


def plan_rows(candidate: dict, *, margin_frames: int, every: int, dirty: bool,
              settle: dict | None = None, per_position: int | None = None) -> list[dict]:
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
            indices = (spread_indices(lo, hi, per_position)
                       if per_position and not is_dirty
                       else range(lo + (-lo) % every, hi, every))
            for idx in indices:
                row = {
                    "frame": f"frames/{idx:06d}.png",
                    "ply": seg["ply"],
                    "fen": seg["fen"],
                    "ts": (base + timedelta(seconds=idx / fps)).isoformat(),
                    "corners": seg.get("corners") or corners,
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
    with closing(Recording(video).frames(wanted=set(probes))) as stream:
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
    for orphan in out_dir.glob("tmp-*.png"):
        orphan.unlink(missing_ok=True)
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
    # `st_size > 0` war der ganze Resume-Test, aber ein abgebrochener Encode hinterlaesst ein
    # HALBES PNG, das ihn besteht und nie wieder geschrieben wird. Die Pixel gehen deshalb neben
    # den Zielnamen und werden erst umgehaengt, wenn sie ganz da sind. `tmp-<idx>.png`, nicht
    # `<idx>.png.tmp`: `imwrite` waehlt den Codec an der ENDUNG, und `static_quad` globt `[0-9]*`.
    with closing(recording.frames(wanted=todo, rotate=rotate)) as stream:
        for idx, frame in stream:
            staged = out_dir / f"tmp-{idx:06d}.png"
            if not cv2.imwrite(str(staged), frame):
                staged.unlink(missing_ok=True)
                raise OSError(f"could not write frame {out_dir / f'{idx:06d}.png'}")
            os.replace(staged, out_dir / f"{idx:06d}.png")
            decoded.add(idx)
            # The card reads this out of the log (`lib/progress.ts`): a step that prints
            # nothing for half an hour is indistinguishable from a hung one.
            if len(decoded) % PROGRESS_EVERY == 0:
                print(f"  decode {len(decoded)}/{len(todo)} frames", flush=True)
            if idx >= last:
                break
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
    old = {Path(r["frame"]).stem: r for r in read_jsonl(log)}
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


#: The session's working picture: the board, rectified with the row's FINAL quad and the crop
#: border, as WebP. It replaces the 3.3 MB source frame — 82 GB of PNG for 12.7 GB of video — at
#: 115 KB per board, and it is the exact raster `crop_square` cuts from, so the label view and the
#: training crop stop being two independent cuts of the same frame. Written by `fit_rows_to_grid`
#: because the quad is only final there; a later quad change must rewrite it (`session boards`).
BOARD_DIR = "boards"
#: The dirty pile lives apart so `boards/` is literally the p8 stock — readers follow
#: `row["board"]`, so a second directory costs them nothing (`docs/frame-scan.md`).
DIRTY_DIR = "dirty"
#: SAM 3's alpha per frame, in the BOARD's raster — so it follows the board through everything.
MATTE_DIR = "mattes"
BOARD_SUFFIX = ".webp"
#: What a row says about its board — the file, the scale its pixels are in (`write_board`), and
#: whether it has been pulled straight. Popped together whenever a board is rewritten: a fresh
#: warp is bowed again, and a row that still claimed otherwise would never be straightened.
BOARD_KEYS = ("board", "board_size", "board_border", "board_straightened")
BOARD_ENCODE = [cv2.IMWRITE_WEBP_QUALITY, 95]
#: Threads encoding boards while the decoder walks on. Measured 2026-09-08: the webp encode is
#: 73 % of this phase (50 ms per 928px board at quality 95) and `cv2.imwrite` drops the GIL, so
#: it overlaps the next decode. Four, not more — a frame in flight is 11 MB and this machine's
#: crashes are memory (`docs/export-decode.md`).
BOARD_WRITERS = 4
#: Lossless (OpenCV switches over at > 100) — a matte carries hand-drawn edges, and `matte-fix.ts`
#: writes them lossless for that reason. Re-encoding them at 95 would smear what a human drew.
MATTE_ENCODE = [cv2.IMWRITE_WEBP_QUALITY, 101]


def board_rel(stem: str, dirty: bool = False) -> str:
    """The board's path inside the session — `row["board"]`, as `row["frame"]` names the frame."""
    return f"{DIRTY_DIR if dirty else BOARD_DIR}/{stem}{BOARD_SUFFIX}"


#: Processes a per-frame pass uses, and the row count that makes a pool worth its start-up.
#: Measured over 240 frames of 20-19-54 (10.5 MB each): serial 166 ms/frame, then 41.6 / 37.2 /
#: 33.0 / 31.9 at 6 / 8 / 12 / 16 — 12 is 5.05x and 16 only 5.23x, so the last four processes buy
#: 3 %. THREADS plateau at 1.9x: the work is numpy and Python and the GIL is the wall, which is why
#: the CPU sat at 1.6 of 20 cores. (A 40-frame run says 8 saturates — that is pool start-up.)
POOL_WORKERS = 12
POOL_MIN_ROWS = 32


#: The settle score's shape. `SETTLE_CELL_PX` is small on purpose — the question is whether the
#: cell's CONTENT changed, not how sharp it is, and 32 px averages the sensor noise away for free.
#: `SETTLE_MIN_FRAMES` is what a median needs before it describes anything: below it the majority
#: that is supposed to be the settled board is a coin toss. `SETTLE_MEDIAN_MAX` bounds the memory
#: one ply can take (60 x 64 x 32 x 32 x 3 as int16 is ~24 MB) and costs nothing — `spread` samples
#: the interval evenly, and a median over 60 frames is not measurably worse than over 300.
SETTLE_CELL_PX = 32
SETTLE_MIN_FRAMES = 5
SETTLE_MEDIAN_MAX = 60
#: Alpha from which a pixel is the hand and not the board — the middle of the range.
ALPHA_SOLID = 128
#: What a frame may claim anywhere and still describe the SETTLED position. The reference must be
#: the board alone; a hand in it would put the hand into the median.
SETTLE_CLEAR_MAX = 0.02


def alpha_cells(session_dir: Path, stem: str, profile, out) -> Any:
    """The frame's alpha as 64 cells, the hand-corrected cut first — `None` when none was ever made.

    Cut with the same `crop_square` the board goes through, so a pixel means the same square in
    both and `coverage_of`'s number and this mask describe one region.
    """
    import numpy as np

    from .labeling import crop_square
    from .matte import FIXED_SUFFIX

    for name in (f"{stem}{FIXED_SUFFIX}", f"{stem}{BOARD_SUFFIX}"):
        path = session_dir / MATTE_DIR / name
        grey = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE) if path.is_file() else None
        if grey is None:
            continue
        board = cv2.cvtColor(grey, cv2.COLOR_GRAY2BGR)
        return np.stack([crop_square(board, s, profile, out) for s in all_squares()])[..., 0]
    return None


def cell_deviations(cells, ref, visible) -> Any:
    """Per cell: how far its VISIBLE pixels sit from [ref], and what fraction of them there were.

    Both sides are levelled before the difference, because a shadow shifts a cell's brightness
    while a piece shifts its structure. Raw, the shadow of a player leaning in flagged a2, b3 and
    b5 on a board nobody had touched (2026-08-22).
    """
    import numpy as np

    weight = visible[..., None].astype(np.float32)
    px = np.maximum(weight.sum(axis=(1, 2, 3)), 1.0)[:, None, None, None]

    def level(x):
        return x - (x * weight).sum(axis=(1, 2), keepdims=True) / px

    dev = (np.abs(level(cells) - level(ref)) * weight).sum(axis=(1, 2, 3))
    return dev / (px[:, 0, 0, 0] * cells.shape[-1]), weight.mean(axis=(1, 2, 3))


#: Wie viele zusammenhängende Felder eine Änderung höchstens umfasst. Ein Zug berührt ZWEI —
#: benachbart beim Bauernschritt, sonst zwei Blöcke zu eins; drei am Stück kann kein Zug. Gemessen
#: 2026-08-22: 89 % der Karten auf Zugfeldern liegen in Blöcken von 1 oder 2, ab 3 fällt die
#: Trefferquote von 19 % auf 2–4 % und damit auf den Hintergrund.
MAX_DEPART_BLOCK = 2


def departures(dev, seen, cover, *, limit: float, seen_min: float, covered_max: float,
               max_block: int = MAX_DEPART_BLOCK, keep=()) -> Any:
    """`(frames, 64) -> (frames, 64) bool`: hat dieses Feld die gesetzte Stellung VERLASSEN?

    Drei Zustände je Zelle, denn eine verdeckte Zelle passt nicht zur Referenz — sie ist ungesehen,
    und als Treffer gezählt würde sie eine Serie beenden, die die Hand nur verdeckt. Verlassen heißt
    deshalb: ab hier stimmt das Feld nie wieder, und mindestens einmal weicht es messbar ab.
    """
    import numpy as np

    covered = np.asarray(cover) >= covered_max
    blind = ~covered & (np.asarray(seen) < seen_min)
    known = ~covered & ~blind
    gone = known & (np.asarray(dev) >= limit)
    home = known & ~gone

    left = blind.copy()
    for c in range(left.shape[1]):
        at = np.flatnonzero(home[:, c])
        start = int(at[-1]) + 1 if len(at) else 0
        if start < left.shape[0] and gone[start:, c].any():
            left[start:, c] = True
    left &= ~covered
    # Form statt Menge: ein Schatten deckt einen zusammenhängenden Block, ein Zug zwei Felder.
    # `all_squares()` läuft reihenweise ab a1, also ist die 8x8-Sicht das Brett selbst.
    # `keep` sind die Felder des NAECHSTEN Zugs: eine Rochade mit Hand ist ein Block von sechs,
    # und als Schatten gelesen liess sie den Koenig auf e1 ins Training (153751, Ply 12).
    kept = left[:, list(keep)].copy() if len(keep) else None
    for f in range(left.shape[0]):
        block = left[f].reshape(8, 8)
        n, lab, stats, _c = cv2.connectedComponentsWithStats(block.astype(np.uint8),
                                                             connectivity=4)
        big = [c for c in range(1, n) if stats[c, cv2.CC_STAT_AREA] > max_block]
        if big:
            block[np.isin(lab, big)] = False
    if kept is not None:
        left[:, list(keep)] = kept
    # Verdeckte Zellen sind das Occlusion-Ziel: ihre Coverage nimmt sie schon aus dem
    # Klassifikations-Loss, als "verlassen" gemeldet würden sie stattdessen weggeworfen.
    return left


def settle_for_ply(job: tuple[Path, list[dict], object, dict]) -> dict:
    """One ply interval -> its settled board, the per-cell measurement, and the VERDICT per frame.

    Within one interval the position stands still, so the pixel-wise median over the boards whose
    ALPHA is empty is the settled position. Every frame is read against it on the pixels its own
    alpha calls board, and `departures` then adds the time axis: a shadow passes, a move stays.
    Only paths cross the process boundary.
    """
    import numpy as np

    from .labeling import MATTE_DIRTY, SETTLE_LIMIT, SETTLE_SEEN_MIN, all_squares, crop_square

    session_dir, rows, profile, mattes, *rest = job
    touches = rest[0] if rest else ()
    rows = sorted(rows, key=lambda r: r["frame"])
    squares = all_squares()
    out = (SETTLE_CELL_PX, SETTLE_CELL_PX)
    stems = [Path(r["frame"]).stem for r in rows]

    # Ein Frame wird EINMAL gelesen: die Referenz-Frames sind Teil der Reihe und wurden vorher
    # zweimal dekodiert und 64-fach geschnitten.
    cells = {}
    for row, stem in zip(rows, stems, strict=True):
        board = cv2.imread(str(session_dir / row["board"]))
        if board is not None:
            cells[stem] = np.stack([crop_square(board, s, profile, out) for s in squares]).astype(np.float32)

    # Ein DIRTY Frame, den niemand gemessen hat, ist nicht "keine Hand", sondern ungemessen —
    # und `SETTLE_CLEAR_MAX` existiert genau dagegen. Gemessen 2026-09-16 ueber 25 Aufnahmen:
    # kostet 138 Frames und 14 von 804 Plys, die dann ehrlich "—" statt einer Zahl zeigen.
    unmeasured = {Path(r["frame"]).stem for r in rows if r.get("dirty")} - set(mattes)
    clear = [s for s in stems if s in cells and s not in unmeasured
             and max((mattes.get(s) or {}).values(), default=0.0) <= SETTLE_CLEAR_MAX]
    step = max(1, len(clear) // SETTLE_MEDIAN_MAX)
    reference = [cells[s] for s in clear[::step]]
    if len(reference) < SETTLE_MIN_FRAMES:
        return {}
    ref = np.median(np.stack(reference), axis=0)

    seen_stems, devs, seens, covers = [], [], [], []
    for stem in stems:
        if stem not in cells:
            continue
        alpha = alpha_cells(session_dir, stem, profile, out)
        visible = np.ones(cells[stem].shape[:3], bool) if alpha is None else alpha < ALPHA_SOLID
        dev, seen = cell_deviations(cells[stem], ref, visible)
        cover = mattes.get(stem) or {}
        seen_stems.append(stem)
        devs.append(dev)
        seens.append(seen)
        covers.append([cover.get(sq, 0.0) for sq in squares])

    left = departures(np.array(devs), np.array(seens), np.array(covers),
                      limit=SETTLE_LIMIT, seen_min=SETTLE_SEEN_MIN, covered_max=MATTE_DIRTY,
                      keep=[squares.index(sq) for sq in touches if sq in squares])
    scores = {stem: {"dev": [round(float(v), 2) for v in devs[i]],
                     "seen": [round(float(v), 3) for v in seens[i]],
                     "left": [squares[c] for c in np.flatnonzero(left[i])]}
              for i, stem in enumerate(seen_stems)}
    return {"ref": ref.astype(np.uint8), "scores": scores}


#: Per session, one row per ply: did the move that opened this interval show up on the board?
INTERVAL_FILE = "interval-check.jsonl"
#: How far two neighbouring settled boards must differ on the squares the move between them
#: touched. Measured over 177 neighbour pairs: the committed move shows at a median of 33 to 49,
#: and 16 pairs stayed under 15 — those are the intervals whose commit nobody can vouch for.
INTERVAL_MOVE_MIN = 15.0


def interval_moves(refs: dict[int, Any], fens: dict[int, str]) -> list[dict]:
    """Per ply: is the move that OPENED this interval visible between its settled board and the
    one before it, on exactly the squares the move touched?

    A commit in the wrong place hangs a FEN on pixels that never showed it, and nothing downstream
    notices: every frame of the interval then agrees with a reference that is already wrong. This
    is the only test that looks across an interval boundary.
    """
    import numpy as np

    squares = all_squares()
    out = []
    for ply in sorted(refs):
        moved = changed_squares(fens.get(ply - 1), fens.get(ply)) if ply - 1 in refs else []
        if not moved:
            continue
        now = refs[ply].astype(np.float32)
        dev, _ = cell_deviations(now, refs[ply - 1].astype(np.float32), np.ones(now.shape[:3], bool))
        worst = max(float(dev[squares.index(sq)]) for sq in moved)
        out.append({"ply": ply, "moved": moved, "dev": round(worst, 2),
                    "seen": worst >= INTERVAL_MOVE_MIN})
    return out


def board_from_frame(job: tuple[Path, str, list, object, bool]) -> dict | None:
    """One frame -> one board, for the retrofit pool: only paths cross the process boundary."""
    session_dir, frame_rel, corners, profile, dirty = job
    frame = cv2.imread(str(session_dir / frame_rel))
    if frame is None:
        return None
    return write_board(session_dir, Path(frame_rel).stem, frame, corners, profile, dirty)


def place_board(session_dir: Path, row: dict) -> bool:
    """Move a stored board into the folder its `dirty` flag names, and repoint the row.

    The FOLDER is the clean/dirty predicate downstream: `temporal_matte.bracketing` and
    `sensor_audit.audit` pick their reference peers out of `boards/`. A flag set after the export
    that leaves the file where it was makes a hand frame a reference plate.
    """
    rel = row.get("board")
    if not rel:
        return False
    want = board_rel(Path(rel).stem, bool(row.get("dirty")))
    src, dst = session_dir / rel, session_dir / want
    if want == rel or not src.is_file():
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    src.replace(dst)
    row["board"] = want
    return True


def write_board(session_dir: Path, stem: str, frame, corners, profile,
                dirty: bool = False, mesh=None, lens=None) -> dict:
    """The DATA warp (`warp_board_for_crops`), not `grid_occlusion.warp_padded`: the two differ
    as soon as `pad_side` exceeds the display border, and the store has to be the crop's raster.

    Returns the row's `board` keys — the path AND the scale the pixels are in. A homography hides
    that scale (board coordinates cancel against it), a stored raster does not: the candidate's
    geometry says 1008 where the export profile says 928, and a reader that assumed its own number
    cut every cell 8 % off (measured: 14 dB against the training crop).
    """
    from .calibration import crop_border_px, warp_board_for_crops

    rel = board_rel(stem, dirty)
    out = session_dir / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(out), warp_board_for_crops(frame, profile, corners, mesh, lens), BOARD_ENCODE):
        raise OSError(f"could not write board {out}")
    # A stem must exist in ONE folder — the folder is the clean/dirty predicate `temporal_matte`
    # and `sensor_audit` read. AFTER the new plate is on disk: dropping the old one first loses the
    # board outright if the warp or the write fails.
    (session_dir / board_rel(stem, not dirty)).unlink(missing_ok=True)
    keys = {"board": rel, "board_size": int(profile.board_size),
            "board_border": crop_border_px(profile)}
    return keys if mesh is None else {**keys, "board_straightened": True}


#: Was ein Sensor als Hand im Bild fuehrt. Die Rillen benennen Felder (`hand_squares`), das Gate
#: des Scans nur den Frame (`framescan.classify` -> `occluded`, der Fit selbst -> `grid-late`) —
#: gemessen 2026-09-21 sind 315 von 1 228 Mesh-Gebern so eine Zeile, 212 davon `occluded`.
HAND_DIRTY_REASONS = ("occluded", "grid-late")


def hand_seen(row: dict) -> bool:
    """Sah irgendein Sensor auf diesem Frame eine Hand? Dann gibt er kein Mesh ab."""
    return bool(row.get("hand_squares")) or row.get("dirty_reason") in HAND_DIRTY_REASONS


def meshes_for_boards(rows: list[dict]) -> dict[int, Any]:
    """{frame index: the mesh its board must be straightened with} — ONE mesh for the recording.

    The camera does not move inside a recording, so every line sits where it sits and a per-frame
    mesh can only add noise. It adds a lot: the middle lines hold still to +-0.4 px over a session
    while the back-rank ones scatter by 3.8-4.6 px (2026-08-22, over 833 and 363 frames), because
    pieces stand ON those grooves in every frame and move the line the fit finds. The per-line
    MEDIAN over the clean frames is the same measurement without that jitter — and it keeps a real
    lens bow, which is constant across frames (turntable `2026-08-09 20-48-50`: a smooth +-0.03
    ramp, 8.5 px, survives the median unchanged).

    A frame whose grid a HAND covers never contributes: its mesh leaves the board worse than no
    mesh at all (measured 2026-08-21: 15.6 px against 16.1 raw).
    """
    from .calibration import mesh_from_lines, pooled_mesh, smooth_mesh_curvature

    clean = [smooth_mesh_curvature(mesh_from_lines(r["grid_lines"]))
             for r in rows if r.get("grid_lines") and not hand_seen(r)]
    session = pooled_mesh([m for m in clean if m is not None])
    return {int(Path(row["frame"]).stem): session for row in rows}


#: How often `straighten_boards` asks its caller to persist the rows. The write is the destructive
#: half and the flag is the only record of it — a run that dies between them leaves boards straight
#: on disk that a later run would pull a SECOND time.
STRAIGHTEN_CHECKPOINT = 50


def rewarp_boards(session_dir: Path, rows: list[dict], profile, *,
                  frames: Iterator[tuple[dict, Any]], lens=None, meshes=None, progress=None) -> dict:
    """Write every board FROM ITS FRAME, straight, in one resample.

    The export's second pass and the retrofit for a store whose video still exists. `straighten_boards`
    exists for the other case — a store with no frames left — and pays a second resample for it
    (+57 % Laplacian energy in the finished crop separates the two, measured 2026-08-21).
    """
    # A chunk must never pool its OWN mesh: `meshes_for_boards` averages over every clean frame
    # of the recording, so four workers would straighten four different boards with four meshes.
    meshes = meshes_for_boards(rows) if meshes is None else meshes
    done = {"rewarped": 0, "no_mesh": 0, "no_frame": 0}
    with ThreadPoolExecutor(max_workers=BOARD_WRITERS) as pool:
        pending: dict[Any, dict] = {}

        def collect(keep: int) -> None:
            """Fold finished writes back into their rows, never more than `keep` still in flight."""
            while len(pending) > keep:
                for future in as_completed(list(pending)):
                    pending.pop(future).update(future.result())
                    break

        for seen, (row, frame) in enumerate(frames, 1):
            # Die Karte liest das aus dem Log (`lib/progress.ts`), im selben `N/M frames`-Muster
            # wie Dekodieren und Grid-Fit. Ohne die Zeile steht der Schritt minutenlang stumm da.
            say_progress(progress, seen, f"  board cut {seen}/{len(rows)} frames")
            if frame is None:
                done["no_frame"] += 1
                continue
            mesh = meshes.get(int(Path(row["frame"]).stem))
            done["no_mesh"] += mesh is None
            for key in BOARD_KEYS:
                row.pop(key, None)
            pending[pool.submit(write_board, session_dir, Path(row["frame"]).stem, frame,
                                row["corners"], profile, bool(row.get("dirty")), mesh, lens)] = row
            done["rewarped"] += 1
            collect(BOARD_WRITERS)
        collect(0)
    return done


#: Prozesse für die beiden Frame-Phasen. Vier, nicht mehr: jeder Worker hält Frames von 11 MB und
#: importiert cv2/numpy für sich, und die Abstürze dieser Maschine sind Speicher. 1 nimmt den
#: seriellen Weg — der ist der Referenzpfad, gegen den `test_parallel_export_matches_serial` prüft.
EXPORT_WORKERS = 4
#: Unter so vielen Zeilen je Worker zahlt sich ein Prozess nicht: er kostet Start (~3 s auf
#: Windows) und den Vorlauf ab seiner Segmentgrenze.
MIN_CHUNK = 40


def plan_chunks(rows: list[dict], workers: int) -> list[list[dict]]:
    """Contiguous stretches of the recording, one per worker — never interleaved.

    Each chunk pays its own walk from the segment holding its first frame, so cutting by index
    keeps that at one partial segment per worker; a round-robin split would make every one of them
    walk the whole recording.
    """
    ordered = sorted(rows, key=lambda r: int(Path(r["frame"]).stem))
    if workers <= 1 or len(ordered) < 2 * MIN_CHUNK:
        return [ordered]
    n = min(workers, len(ordered) // MIN_CHUNK)
    size = -(-len(ordered) // n)
    return [ordered[i:i + size] for i in range(0, len(ordered), size)]


class ChunkProgress:
    """A worker's only way to say how far it is; the parent owns the single progress line.

    A closure cannot be handed to a process — this carries the manager's proxies, which can.
    """

    def __init__(self, counter, lock):
        self.counter, self.lock = counter, lock

    def __call__(self, n: int) -> None:
        with self.lock:
            self.counter.value += n


def _fit_chunk(rows: list[dict], progress, *, video: Path, profile_name: str, rotate) -> dict:
    """Worker: the very same `fit_rows_to_grid`, on one stretch, with its own decoder."""
    return fit_rows_to_grid(rows, load_profile(profile_name),
                            frames=stream_frames(video, rows, rotate), progress=progress)


def _warp_chunk(rows: list[dict], progress, *, session_dir: Path, video: Path, profile_name: str,
                rotate, meshes, lens) -> tuple[dict, list[dict]]:
    """Worker: `rewarp_boards` on one stretch, with the SESSION's mesh handed in from the parent."""
    made = rewarp_boards(session_dir, rows, load_profile(profile_name),
                         frames=stream_frames(video, rows, rotate), lens=lens, meshes=meshes,
                         progress=progress)
    return made, rows


def run_chunked(fn, chunks: list[list[dict]], total: int, label: str, *, executor=None) -> list:
    """Run one phase over its chunks and print ONE bar for all of them.

    Returns the workers' results in chunk order. A single chunk runs in THIS process — no pool, no
    pickling — which is both the small-session path and the reference the equivalence test uses.
    """
    import multiprocessing as mp

    if len(chunks) == 1:
        return [fn(chunks[0], None)]
    with mp.Manager() as manager:
        progress = ChunkProgress(manager.Value("i", 0), manager.Lock())
        with (nullcontext(executor) if executor is not None
              else ProcessPoolExecutor(max_workers=len(chunks))) as pool:
            futures = [pool.submit(fn, chunk, progress) for chunk in chunks]
            while True:
                done, _ = wait(futures, timeout=2.0)
                over = len(done) == len(futures)
                seen = total if over else min(progress.counter.value, total)
                print(f"  {label} {seen}/{total} frames "
                      f"({len(done)}/{len(chunks)} Abschnitte)", flush=True)
                if over:
                    break
            return [f.result() for f in futures]


def merge_fit_stats(parts: list[dict]) -> dict:
    """One phase's numbers out of the chunks', identical to what one serial pass would report.

    The spread (`median`, `max`) is recomputed from the rows, not averaged from the parts: every
    fitted row carries its own `align_worst_px`, so the merge is the same sorted list the serial
    run built — an average of medians would not be.
    """
    rows = [row for part in parts for row in part["arrived"]]
    # Nur GEMESSENE, wie der serielle Lauf: ein FIT_FAILED-Row behaelt das `align_worst_px`, das
    # `carry_repaired_geometry` vom letzten Export uebernahm, und `--workers 4` meldete damit eine
    # andere Streuung als `--workers 1` auf derselben Aufnahme.
    worsts = sorted(row["align_worst_px"] for row in rows
                    if "align_worst_px" in row and row.get("corners_source") != FIT_FAILED)
    merged = {key: sum(part[key] for part in parts)
              for key in (FIT_SOURCE, FIT_KEPT, FIT_FAILED, "mesh", "hands", "late")}
    return {**merged, "arrived": rows,
            "median": worsts[len(worsts) // 2] if worsts else None,
            "max": worsts[-1] if worsts else None}


def fit_rows_parallel(rows: list[dict], profile_name: str, *, video: Path, rotate,
                      workers: int, executor=None) -> dict:
    """`fit_rows_to_grid` over the recording in stretches. Same numbers, same row order."""
    chunks = plan_chunks(rows, workers)
    fn = partial(_fit_chunk, video=video, profile_name=profile_name, rotate=rotate)
    return merge_fit_stats(run_chunked(fn, chunks, len(rows), "grid fit", executor=executor))


def rewarp_parallel(session_dir: Path, rows: list[dict], profile_name: str, *, video: Path,
                    rotate, lens, workers: int, executor=None) -> tuple[dict, list[dict]]:
    """`rewarp_boards` in stretches, all of them straightened with the SESSION's one mesh.

    The mesh is pooled here and handed down: a chunk pooling its own would straighten its boards
    against a different measurement than its neighbour's, and the seam would be invisible.
    """
    chunks = plan_chunks(rows, workers)
    fn = partial(_warp_chunk, session_dir=session_dir, video=video, profile_name=profile_name,
                 rotate=rotate, meshes=meshes_for_boards(rows), lens=lens)
    parts = run_chunked(fn, chunks, len(rows), "board cut", executor=executor)
    made = {key: sum(part[key] for part, _ in parts) for key in ("rewarped", "no_mesh", "no_frame")}
    return made, [row for _, chunk in parts for row in chunk]


def straighten_boards(session_dir: Path, rows: list[dict], checkpoint=None,
                      *, mattes: bool = True) -> dict:
    """Pull every stored board straight, once, so every cut afterwards is a plain rectangle.

    This is the ONLY straightening in the pipeline: a board carrying `board_straightened` must
    never be pulled again, and `crop_square` must never be handed a mesh for one. Rows whose board
    is missing, or for which no mesh could be found at all, are counted and left alone — a raw
    board is worse than a straight one but honest, a twice-corrected one is neither.

    `mattes=False`, wenn nur die BRETTER frisch gebogen daliegen: `write_boards_session` schneidet
    sie neu und poppt dabei das Flag, die Alphas daneben sind vom vorigen Lauf schon gezogen.
    Gemessen: ein zweiter Zug verbiegt sie um 16 px auf einem 400-px-Brett, in die Gegenrichtung.

    `checkpoint()`: persist the rows so far. Called every `STRAIGHTEN_CHECKPOINT` boards, because
    the flag is the ONLY thing standing between a killed run and a twice-corrected store.
    """
    from .calibration import straighten_board

    meshes = meshes_for_boards(rows)
    done = {"straightened": 0, "already": 0, "no_mesh": 0, "no_board": 0, "mattes": 0}
    for seen, row in enumerate(rows, 1):
        if seen % PROGRESS_EVERY == 0:
            print(f"  straighten {seen}/{len(rows)} frames", flush=True)
        if row.get("board_straightened"):
            done["already"] += 1
            continue
        rel = row.get("board")
        board = None if not rel else cv2.imread(str(session_dir / rel))
        if board is None:
            done["no_board"] += 1
            continue
        mesh = meshes.get(int(Path(row["frame"]).stem))
        if mesh is None:
            done["no_mesh"] += 1
            continue
        bs, border = int(row["board_size"]), int(row["board_border"])
        # Ungeprueft setzte der naechste Block `board_straightened` auf ein Brett, das noch
        # gebogen auf der Platte liegt — und das wird laut Docstring nie wieder angefasst.
        if not cv2.imwrite(str(session_dir / rel),
                           straighten_board(board, mesh, bs, border), BOARD_ENCODE):
            raise OSError(f"could not write straightened board {session_dir / rel}")
        # A matte IS the board raster (952x952 for a 928 board), and `coverage_of` cuts it with the
        # very geometry the crop uses. Leaving it bowed would measure a straight cell against a
        # curved alpha — and the corrected ones are hand-made, so they are pulled, never redone.
        # `<stem>.*` sammelte auch `close_seams`' gestapelte `<stem>.tmp.webp` ein — die zog
        # es gerade und zaehlte sie als Matte. Was danach umgehaengt wird, waere zweimal gezogen.
        for matte in (sorted(p for p in (session_dir / MATTE_DIR).glob(f"{Path(rel).stem}.*")
                             if p.suffixes[-2:] != [".tmp", ".webp"]) if mattes else ()):
            alpha = cv2.imread(str(matte), cv2.IMREAD_UNCHANGED)
            if alpha is not None:
                if not cv2.imwrite(str(matte), straighten_board(alpha, mesh, bs, border),
                                   MATTE_ENCODE):
                    raise OSError(f"could not write straightened matte {matte}")
                done["mattes"] += 1
        row["board_straightened"] = True
        done["straightened"] += 1
        if checkpoint is not None and done["straightened"] % STRAIGHTEN_CHECKPOINT == 0:
            checkpoint()
    return done


def stream_frames(video: Path, rows: list[dict], rotate: int | None) -> Iterator[tuple[dict, Any]]:
    """(row, frame) for every planned row, decoded STRICTLY forward out of the recording.

    The frame never touches the disk: `video -> webp -> labeling -> crop -> training` (User,
    2026-08-16). Writing it out first cost 3.3 MB per frame — 82 GB of session tree for 12.7 GB of
    video — to hand the very next step a picture it already had in memory. Forward only, for the
    reason `decode_frames` gives: a seek lands NEXT to the asked-for index, and an index off by one
    here is a wrong label rather than a blurry crop.
    """
    wanted = {int(Path(r["frame"]).stem): r for r in rows}
    if not wanted:
        return
    last = max(wanted)
    # `take` and not a filter here: the export asks for 11 % of the frames and paid the full
    # colour conversion for the other 89 %, twice over (this streams once for the fit and once
    # for the warp). The decoder now only builds the pictures that are asked for.
    with closing(Recording(video).take(set(wanted), rotate)) as stream:
        for idx, frame in stream:
            yield wanted[idx], frame
            if idx >= last:
                break


def disk_frames(session_dir: Path, rows: list[dict]) -> Iterator[tuple[dict, Any]]:
    """(row, frame) read from `frames/NNNNNN.png` — the source for a set the video cannot make.

    The sibling of `stream_frames`. Undistorted frames are Kotlin's output and a re-decode of the
    raw video would produce a different picture, so those rows come off the disk; everything else
    streams. One exporter, two sources, chosen by the caller.
    """
    for row in rows:
        yield row, cv2.imread(str(session_dir / row["frame"]))


def _fit_frame_geometry(frame, corners, profile):
    from .alignment import improve_quad, reuse_grid_measurements

    if frame is None:
        return None, float("nan"), float("nan"), None
    with reuse_grid_measurements():
        quad, before, after = improve_quad(frame, corners, profile)
        mesh = grid_line_fracs(frame, corners if quad is None else quad, profile.board_size, profile)
    return quad, before, after, mesh


def fit_rows_to_grid(rows: list[dict], profile, *,
                     frames: Iterator[tuple[dict, Any]], progress=None) -> dict:
    """Fit every written frame's quad to the board's OWN grid, per frame, at export time.

    `frames`: (row, picture) pairs — `stream_frames` or `disk_frames`. Required: which pictures
    to fit is the caller's decision, not a fallback guessed at here.

    The candidate carries one median quad for the whole video, and a median is not a measurement
    of any single frame: rg-2026-08-13-19-34-23 went out with all 137 frames uniformly ~17 px off
    their own grooves, and a hand-run `session scan` + `autofix` afterwards brought it to 2.71 px
    median. That repair is this same fit, so it runs by default instead of being hoped for.

    A frame the fit cannot read — hand over the grid, dark junk — KEEPS the quad it inherited and
    is marked [FIT_FAILED]. Nothing is dropped: those dirty rows are the wanted material.
    `improve_quad` returns nothing unless it improves its own frame, so this can only help.

    Every row also gets its `grid_lines` mesh where all 18 lines were readable, so `slice` cuts at
    the board's own boundaries instead of the nominal eighth (docs/data-pipeline.md §2).
    """
    from .calibration import crop_border_px, warp_padded
    from .grid_occlusion import hand_squares, missing_edges
    from .imgops import skin_patch

    counts = {FIT_SOURCE: 0, FIT_KEPT: 0, FIT_FAILED: 0}
    worsts, meshed, hands, late = [], 0, 0, 0
    pad = crop_border_px(profile)
    pairs = frames
    seen = []
    for done, (row, frame) in enumerate(pairs, 1):
        seen.append(row)
        say_progress(progress, done, f"  grid fit {done}/{len(rows)} frames, hands on {hands}")
        quad, before, after, mesh = _fit_frame_geometry(frame, row["corners"], profile)
        if quad is not None:
            row["corners"] = [[float(x), float(y)] for x, y in quad]
        row.pop("grid_lines", None)
        if mesh is not None:
            row["grid_lines"] = mesh
            meshed += 1
        # The exporter's own `dirty` is a 1 s window around a commit, so a hand that adjusts a
        # piece or crosses the board goes unflagged and its crops reach training under the FEN
        # label (measured 2026-08-16: 424 of 2 228 frames). The grooves are the witness, and the
        # frame is already decoded here. Only ADDS the flag; a commit window stays dirty.
        row.pop("hand_squares", None)
        padded = None if frame is None else warp_padded(frame, profile, row["corners"], pad)
        found = None if padded is None else hand_squares(missing_edges(
            cv2.cvtColor(padded, cv2.COLOR_BGR2GRAY), profile.board_size, pad,
            white_pov=profile.white_pov))
        if found:
            row["hand_squares"] = sorted(found)
        # The groove read needs an adjacent PAIR, so it is blind to the hand that only grazes the
        # outer rank — 263 of 7 358 otherwise open frames (2026-08-16), every one an edge hand.
        # The colour read catches 259 of them at zero cost on 600 clean frames, so it decides the
        # flag alongside; naming the cells stays the grooves' job.
        if found or (padded is not None and skin_patch(
                padded[pad:pad + profile.board_size, pad:pad + profile.board_size],
                profile.board_size / 8.0, profile.crop.pad_side)):
            hands += 1
            if not row.get("dirty"):
                # The scan called this frame clean on the candidate's quad and the fit's own quad
                # disagrees. Rare, and a hand in the clean pool costs more than a missing slot.
                row["dirty"], row["dirty_reason"] = True, "grid-late"
                late += 1
        # No board here any more: it is warped STRAIGHT in `rewarp_boards`, and the mesh a hand
        # frame needs comes from its clean neighbours — none of them known until every row is read.
        for key in BOARD_KEYS:
            row.pop(key, None)
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
        "mesh": meshed,
        "hands": hands,
        "late": late,
        "arrived": seen,
        "median": worsts[len(worsts) // 2] if worsts else None,
        "max": worsts[-1] if worsts else None,
    }


#: Liegt waehrend des Brett-Schreibens da. Ein Export ueberschreibt `boards/` an Ort und Stelle,
#: schreibt `log.jsonl` aber erst zum Schluss — stirbt er dazwischen, beschreiben die Ecken im
#: alten Log nicht mehr die Pixel auf der Platte, und niemand kann das spaeter noch sehen.
EXPORT_MARKER = ".export-running"


def export_interrupted(session_dir: Path) -> bool:
    """Steht ein abgebrochener Export im Weg? Dann sind Log und Bretter nicht dasselbe Alter."""
    return (session_dir / EXPORT_MARKER).is_file()


@contextmanager
def mark_export(session_dir: Path):
    """Markiert die Strecke, in der Bretter schon neu und das Log noch alt ist."""
    session_dir.mkdir(parents=True, exist_ok=True)
    marker = session_dir / EXPORT_MARKER
    marker.write_text(f"export started {datetime.now(UTC).isoformat()}\n", encoding="utf-8")
    yield_ok = False
    try:
        yield marker
        yield_ok = True
    finally:
        # NUR nach einem sauberen Durchlauf weg: der Marker IST die Spur.
        if yield_ok:
            marker.unlink(missing_ok=True)


def write_session(session_dir: Path, name: str, candidate: dict, rows: list[dict]) -> Path:
    """`session.yaml` + `log.jsonl` in the §2 shape of `docs/data-pipeline.md`, nothing else."""
    from .sessions import backup_log

    # A re-export REPLACES a log that may hold hand-set quads or a review's verdicts. Same
    # `log.jsonl.bak.<stamp>` convention `session scan|autofix|adopt` use, for the same reason.
    if (session_dir / "log.jsonl").is_file():
        print(f"  previous log backed up as {backup_log(session_dir / 'log.jsonl')}")
    meta = {
        # The id keeps the `rg-` prefix the DIRECTORY dropped: it is the join key in every
        # manifest and in `sessions.session_dir`, so it must not follow the folder rename.
        "session_id": f"rg-{session_dir.name}",
        "profile": EXPORT_PROFILE,
        "mode": "track",
        "created_at": base_time(candidate).isoformat(),
        "frame_size": [int(v) for v in candidate["geometry"]["frame_size"]],
        "notes": f"exported from data/recordings/{name} (specs/53-01)",
        "reviewed": True,
    }
    session_dir.mkdir(parents=True, exist_ok=True)
    with (session_dir / "session.yaml").open("w", encoding="utf-8") as fh:
        yaml.safe_dump(meta, fh, sort_keys=False, allow_unicode=True)
    write_rows(session_dir / "log.jsonl", rows)
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
    per_position: int | None = 8,
    dirty_per_position: int = 8,
    dirty: bool = True,
    measure: bool = True,
    fit: bool = True,
    report_only: bool = False,
    workers: int = EXPORT_WORKERS,
    no_scan: bool = False,
) -> dict:
    """A confirmed candidate is cut into its own `data/recordings/<name>/`, and reports its worth."""
    with (ProcessPoolExecutor(max_workers=workers) if workers > 1 and not report_only
          else nullcontext(None)) as executor:
        return _export_session(name, quiet_margin_s=quiet_margin_s, every=every,
                               per_position=per_position, dirty_per_position=dirty_per_position,
                               dirty=dirty, measure=measure, fit=fit, report_only=report_only,
                               no_scan=no_scan, workers=workers, executor=executor)


def ensure_scan(name: str, *, rotate, extra=(), read_only: bool = False,
                progress: bool = True) -> list[dict]:
    """Der Frame-Scan, notfalls frisch gezogen — die Auswahl steht und faellt mit ihm.

    Ohne ihn plant der Export nach Margin-Fenstern, und die lassen gemessene 23 % Haende durch
    (`docs/frame-scan.md`). Deshalb kein stiller Rueckfall: was hier scheitert, bricht ab.
    `read_only` ist fuer `--report-only` — es urteilt, schreibt aber nichts.
    """
    from . import framescan

    stale = framescan.scan_is_stale(name, extra=extra)
    if stale is None:
        return framescan.read_scan(name)
    if read_only:
        raise ValueError(f"{name}: der Bericht braucht einen gueltigen Frame-Scan ({stale}). "
                         f"`chesslab realgames scan-video {name}` — ein Bericht erzeugt keinen.")
    print(f"  kein gueltiger Frame-Scan ({stale}) — wird jetzt gemessen, vor der Auswahl")
    try:
        res = framescan.scan_video(name, rotate=rotate, extra=extra, resume=False,
                                   progress=progress)
    except (OSError, ValueError, KeyError, RuntimeError) as e:
        raise ValueError(
            f"{name}: der Frame-Scan ist gescheitert ({type(e).__name__}: {e}). Der Export bricht "
            f"ab, statt auf die Margin-Fenster zurueckzufallen — die lassen 23 % Haende durch. "
            f"Mit `--no-scan` laesst sich der alte Weg ausdruecklich erzwingen."
        ) from e
    print(f"  {res['frames']} Frames gemessen, {res['hands']} mit einer Hand")
    return framescan.read_scan(name)


def correction_ledger(name: str, prefer: set[int], rows: list[dict],
                      scan: list[dict], candidate: dict, rejected=()) -> dict:
    """Welche korrigierten Bilder der Neuplan uebernimmt — und warum die anderen nicht.

    `prefer` verspricht nichts: `pick_spread` bevorzugt nur im Umkreis von `tol`, und ein Slot
    kann anders belegt sein. Gezaehlt wird deshalb gegen die ENDGUELTIGEN Zeilen; `occluded` ist
    dabei kein Ausschluss, verdeckte Bretter werden ja mitgenommen.
    """
    kept = {int(Path(r["frame"]).stem): r for r in rows}
    measured = {int(r["idx"]) for r in scan}
    spans = [(s["start"], s["end"]) for s in known_segments(candidate)]
    out = []
    for idx in sorted(prefer):
        row = kept.get(idx)
        if row is not None:
            out.append({"idx": idx, "kept": True, "dirty_reason": row.get("dirty_reason")})
            continue
        if idx in rejected:
            why = "Brett verworfen (zu dunkel oder unscharf)"
        elif idx not in measured:
            why = "nicht gemessen"
        elif not any(lo <= idx < hi for lo, hi in spans):
            why = "ausserhalb jedes Ply-Intervalls"
        else:
            why = "von der Auswahl nicht gezogen"
        out.append({"idx": idx, "kept": False, "why": why})
    path = config.DATA.reports / f"export-corrections-{name}.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    write_rows(path, out)
    from collections import Counter

    lost = [r for r in out if not r["kept"]]
    return {"kept": len(out) - len(lost), "lost": len(lost), "path": path,
            "why": Counter(r["why"] for r in lost)}


def _export_session(name: str, *, quiet_margin_s: float, every: int, per_position: int | None,
                    dirty_per_position: int, dirty: bool, measure: bool, fit: bool,
                    report_only: bool, no_scan: bool, workers: int, executor) -> dict:
    """One export, sharing its worker processes across settle, grid fit and board encoding."""

    if is_archived(name):
        raise ValueError(
            f"{name}: archived in the UI — un-archive it there if it belongs in the corpus")
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
            video_path(name), candidate, {int(m["frame"]) for m in candidate["moves"]}
        )
        if rotation is not None:
            names = {cv2.ROTATE_90_CLOCKWISE: "90° cw", cv2.ROTATE_90_COUNTERCLOCKWISE: "90° ccw", cv2.ROTATE_180: "180°"}
            print(f"  decode rotation: {names[rotation]} (cv2 and the candidate geometry disagree on orientation)")
    if measure and not report_only:
        settle = measure_settle(video_path(name), candidate, load_profile(EXPORT_PROFILE),
                                rotate=rotation, workers=workers, executor=executor)
        found = sum(len(v) for v in settle.values())
        print(f"  settle measured for {found} squares over {len(settle)} plies")
    # VOR dem Scan geholt, damit beide als `extra` mitgemessen werden: ein korrigierter Frame,
    # dessen Index nicht auf dem Dreier-Raster liegt, stuende sonst gar nicht erst im Scan — und
    # was nicht gemessen ist, kann keine Bevorzugung mehr retten.
    prefer = corrected_frames(name)
    reported = reported_dirty(f"rg-{name}")
    scan = [] if no_scan else ensure_scan(name, rotate=rotation, extra=prefer | reported,
                                          read_only=report_only)
    if scan:
        rows = plan_scanned(candidate, scan, margin_frames=margin_frames, settle=settle,
                            per_position=per_position or 8, dirty_per_position=dirty_per_position,
                            prefer=prefer, reported=reported, dirty=dirty,
                            white_pov=load_profile(EXPORT_PROFILE).white_pov)
        print(f"  {len(scan)} measured frames, {len(prefer)} of them already corrected, "
              f"{len(reported)} reported dirty by hand — "
              f"picking on data instead of on a {quiet_margin_s}s margin")
        if prefer:
            from . import framescan as _fs

            rejected = _fs.blurred_indices(scan) | _fs.dark_indices(scan)
            book = correction_ledger(name, prefer, rows, scan, candidate, rejected=rejected)
            why = ", ".join(f"{n}x {w}" for w, n in book["why"].most_common()) or "—"
            print(f"  Korrekturen: {book['kept']} uebernommen, {book['lost']} nicht ({why}) "
                  f"-> {book['path']}")
    else:
        print(f"[WARN] {name}: --no-scan — planning on the margin windows, which admitted "
              f"23 % hands. This is the explicitly chosen path, not a fallback.")
        rows = plan_rows(candidate, margin_frames=margin_frames, every=every, dirty=dirty,
                         settle=settle, per_position=per_position)
    if not rows:
        # `confirmed: true` with an EMPTY `reviewed_plies` is a reachable state — confirming a
        # candidate before its reference PGN is in place vouches for nothing — and blaming the
        # margin for it sent the user hunting a timing problem that was not there (20-19-54).
        if not (candidate.get("reviewed_plies") or ()):
            raise ValueError(
                f"{name}: confirmed, but not one ply is reviewed — re-run the confirmation "
                f"(its {len(candidate['moves'])} moves have nothing vouching for them)")
        raise ValueError(f"{name}: no reviewed interval survives a {quiet_margin_s}s margin")
    session_dir = game_dir(name)
    if not report_only:
        # Von hier bis zum Log-Schreiben sind die Bretter schon neu und das Log noch alt.
        # Stirbt der Lauf dazwischen, beschreiben die Ecken nicht mehr die Pixel — und ohne
        # Marker sieht das niemand je wieder.
        with mark_export(session_dir):
            # The frames only hit the disk for an UNDISTORTED set, whose whole point is a picture the
            # video cannot reproduce, and for `--no-fit`, which has no pass to write boards in. Every
            # other export goes video -> board and keeps no 3.3 MB copy of what it already had.
            on_disk = (session_dir / "frames" / "lens.json").is_file() or not fit
            if on_disk:
                arrived = decode_frames(
                    video_path(name),
                    {int(Path(r["frame"]).stem) for r in rows},
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
                # An undistorted set reads PNGs off the disk, which no walk can be split by; only the
                # video path goes to workers.
                if on_disk:
                    stats = fit_rows_to_grid(rows, load_profile(EXPORT_PROFILE),
                                             frames=disk_frames(session_dir, rows))
                else:
                    stats = fit_rows_parallel(rows, EXPORT_PROFILE, video=video_path(name),
                                              rotate=rotation, workers=workers, executor=executor)
                # What the decoder actually handed over — a row past the end of a truncated recording
                # has no picture, and carrying it would name a board that was never written.
                rows = stats["arrived"]
                print(f"  grid fit over {len(rows)} frames: {stats[FIT_SOURCE]} re-fitted, "
                      f"{stats[FIT_KEPT]} already on the grid, {stats[FIT_FAILED]} unreadable — "
                      f"align_worst_px median {stats['median']}, max {stats['max']}, "
                      f"mesh on {stats['mesh']}, hands on {stats['hands']}")
                # A SECOND pass over the video, because a board can only be warped straight once the
                # mesh is final, and a hand frame's mesh is its clean neighbours'. The decode costs a
                # minute; warping first and correcting after costs 57 % of the crop's detail.
                if on_disk:
                    made = rewarp_boards(session_dir, rows, load_profile(EXPORT_PROFILE),
                                         frames=disk_frames(session_dir, rows))
                else:
                    made, rows = rewarp_parallel(session_dir, rows, EXPORT_PROFILE,
                                                 video=video_path(name), rotate=rotation, lens=None,
                                                 workers=workers, executor=executor)
                print(f"  boards warped straight: {made['rewarped']}, "
                      f"{made['no_mesh']} left bowed for want of any mesh")
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


def static_quad(frames: list[Path], profile) -> list[list[float]]:
    """The board quad of an UNDISTORTED frame set: the per-corner MEDIAN over the frames.

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


#: How far back a commit's settle point is looked for, and how far ahead the "after" anchor sits.
SETTLE_BACK, SETTLE_AHEAD = 180, 40
#: Below this mean absolute difference the two anchors are the same picture — the square carries no
#: visible change and no settle point can be found for it.
SETTLE_MIN_DELTA = 8.0


def measure_settle(video: Path, candidate: dict, profile,
                   rotate: int | None = None,
                   workers: int = 1, executor=None) -> dict[int, dict[str, int]]:
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
    quad = candidate["geometry"]["corners"]
    moves = candidate["moves"]
    out: dict[int, dict[str, int]] = {}
    jobs = []
    for i, move in enumerate(moves):
        before = moves[i - 1].get("fen_after") if i else candidate.get("start_fen")
        touched = changed_squares(before, move.get("fen_after"))
        commit = int(move["frame"])
        if not touched or commit < SETTLE_BACK:
            continue
        lo, hi = commit - SETTLE_BACK, commit + SETTLE_AHEAD
        record_interval("settle windows", video.resolve(), lo, hi)
        jobs.append({"move": move, "touched": touched, "commit": commit, "lo": lo, "hi": hi})

    clusters: list[list[dict]] = []
    for job in sorted(jobs, key=lambda item: item["lo"]):
        if not clusters or job["lo"] > max(item["hi"] for item in clusters[-1]) + 1:
            clusters.append([job])
        else:
            clusters[-1].append(job)

    for cluster in clusters:
        record_interval("video frames", video.resolve(),
                        min(job["lo"] for job in cluster), max(job["hi"] for job in cluster))
    if workers > 1 and len(jobs) > 1:
        return _settle_parallel(jobs, video=video, quad=quad, profile=profile,
                                rotate=rotate, workers=workers, executor=executor)
    # Disjoint windows in one segment share their forward decode, including the run-up.
    recording = Recording(video)
    grouped: dict[int, list[dict]] = {}
    for cluster in clusters:
        base = recording.segment_base(min(job["lo"] for job in cluster))
        grouped.setdefault(base, []).extend(cluster)
    clusters = list(grouped.values())
    fn = partial(settle_cluster, video=video, quad=quad, profile=profile, rotate=rotate)
    parts = [fn(c) for c in clusters]
    for part in parts:
        for ply, squares_seen in part.items():
            out.setdefault(ply, {}).update(squares_seen)
    return out


def _settle_requests(jobs, *, anchors=False):
    requested: dict[int, set[str]] = {}
    for job in jobs:
        indices = (job["lo"], job["hi"]) if anchors else range(job["lo"], job["hi"] + 1)
        for idx in indices:
            requested.setdefault(idx, set()).update(job["touched"])
    return [(idx, tuple(sorted(squares))) for idx, squares in sorted(requested.items())]


def _settle_frames(requests, *, video, quad, profile, rotate):
    """Decode only requested small crops, walking forward from an exact segment boundary."""
    import numpy as np

    if not requests:
        return
    wanted = dict(requests)
    last = max(wanted)
    with closing(Recording(video).take(wanted, rotate)) as stream:
        for idx, frame in stream:
            squares = wanted[idx]
            crops = crops_for_frame(frame, quad, profile, out_size=(48, 48), squares=squares)
            yield idx, {sq: crop.astype(np.int16) for sq, crop in zip(squares, crops, strict=True)}
            if idx >= last:
                break


def _settle_compare(requests, *, jobs, video, quad, profile, rotate):
    """Return the latest pre-position match per job/square; no images cross the boundary."""
    import numpy as np

    latest: dict[int, dict[str, int]] = {}
    for idx, cells in _settle_frames(requests, video=video, quad=quad, profile=profile, rotate=rotate):
        for number, job in enumerate(jobs):
            if not job["lo"] <= idx <= job["hi"]:
                continue
            for sq, (pre, post) in job["anchors"].items():
                if float(np.abs(cells[sq] - pre).mean()) < float(np.abs(cells[sq] - post).mean()):
                    latest.setdefault(number, {})[sq] = idx
    return latest


def _settle_anchors(requests, *, video, quad, profile, rotate):
    """Only the small reference crops are returned, never decoded source frames."""
    return dict(_settle_frames(requests, video=video, quad=quad, profile=profile, rotate=rotate))


def _settle_parallel(jobs, *, video, quad, profile, rotate, workers, executor=None):
    """Read anchors once, then balance the comparison frames independently of cluster lengths."""
    import numpy as np

    recording = Recording(video)
    anchor_chunks: dict[int, list] = {}
    for request in _settle_requests(jobs, anchors=True):
        anchor_chunks.setdefault(recording.segment_base(request[0]), []).append(request)
    if not anchor_chunks:
        return {}
    with (nullcontext(executor) if executor is not None
          else ProcessPoolExecutor(max_workers=workers)) as pool:
        anchor_fn = partial(_settle_anchors, video=video, quad=quad, profile=profile, rotate=rotate)
        anchors = {idx: cells for part in pool.map(anchor_fn, anchor_chunks.values())
                   for idx, cells in part.items()}
        valid = []
        for job in sorted(jobs, key=lambda j: j["lo"]):
            lo, hi = job["lo"], job["hi"]
            if lo not in anchors or hi not in anchors:
                continue
            pairs = {sq: (anchors[lo][sq], anchors[hi][sq]) for sq in job["touched"]
                     if float(np.abs(anchors[lo][sq] - anchors[hi][sq]).mean()) >= SETTLE_MIN_DELTA}
            if pairs:
                valid.append({**job, "anchors": pairs, "touched": tuple(pairs)})
        requests = _settle_requests(valid)
        if not requests:
            return {}
        size = -(-len(requests) // workers)
        chunks = [requests[i:i + size] for i in range(0, len(requests), size)]
        fn = partial(_settle_compare, jobs=valid, video=video, quad=quad, profile=profile, rotate=rotate)
        parts = list(pool.map(fn, chunks))
    latest: dict[int, dict[str, int]] = {}
    for part in parts:
        for number, squares in part.items():
            combined = latest.setdefault(number, {})
            for sq, idx in squares.items():
                combined[sq] = max(combined.get(sq, -1), idx)
    out: dict[int, dict[str, int]] = {}
    for number, job in enumerate(valid):
        for sq, idx in latest.get(number, {}).items():
            out.setdefault(int(job["move"]["ply"]), {})[sq] = min(idx + 1, job["commit"])
    return out


def settle_cluster(cluster: list[dict], *, video: Path, quad, profile,
                   rotate) -> dict[int, dict[str, int]]:
    """Serial reference: decode a group once, then scan each job backwards from its anchor."""
    import numpy as np

    out: dict[int, dict[str, int]] = {}
    cells = dict(_settle_frames(_settle_requests(cluster), video=video, quad=quad,
                                profile=profile, rotate=rotate))

    for job in cluster:
        move, touched = job["move"], job["touched"]
        commit, lo, hi = job["commit"], job["lo"], job["hi"]
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


# --- fit-stored: the PC re-fits the quad an Android "Stored" session logged -------------------

#: The sidecar `packLabeledSession` and the review viewer prefer over the logged marker quad —
#: contract in `docs/data-pipeline.md` §2.1.
QUAD_FIT_NAME = "quad-fit.json"
FIT_METHOD = "grid-fit over printed field edges"

#: `measuredBoardSize` (CalibrationStore.kt) in Python: the pack warps a stored frame at this
#: size, so the fit measures at it too and `align_worst_px` is in the pixels its cells are cut in.
BOARD_SIZE_STEP, MIN_BOARD_SIZE, MAX_BOARD_SIZE = 16, 320, 1280


def measured_board_size(quad) -> int:
    """The rectified board size a quad is worth, stepped and clamped like the Kotlin consumer's."""
    import numpy as np

    pts = np.asarray(quad, np.float64)
    longest = float(np.linalg.norm(pts - np.roll(pts, -1, axis=0), axis=1).max())
    stepped = int(round(longest / BOARD_SIZE_STEP)) * BOARD_SIZE_STEP
    return min(max(stepped, MIN_BOARD_SIZE), MAX_BOARD_SIZE)


def field_quad(quad, board_size: int, margin: float) -> list[list[float]]:
    """The PLAYING FIELD's corners for a quad whose points sit `margin` outside it (a8,h8,h1,a1)."""
    import numpy as np

    from .calibration import compute_homography

    bs = float(board_size)
    h = np.array(compute_homography(quad, board_size, margin), np.float64)
    corners = np.array([[0.0, 0.0, 1.0], [bs, 0.0, 1.0], [bs, bs, 1.0], [0.0, bs, 1.0]]).T
    out = np.linalg.inv(h) @ corners
    return [[float(x), float(y)] for x, y in (out[:2] / out[2]).T]


def _field_profile(quad, frame_size, board_size: int):
    """Margin 0, because `quad` already IS the playing field — never saved, only measured through."""
    from .calibration import CalibrationProfile, CropParams, compute_homography

    return CalibrationProfile(
        profile="__stored-fit__", camera_index=-1,
        frame_size=(int(frame_size[0]), int(frame_size[1])), board_size=board_size,
        image_corners=quad, homography=compute_homography(quad, board_size, 0.0),
        white_pov=True, crop=CropParams.default(board_size), margin=0.0, source="stored-fit",
    )


def stored_session_dirs(name: str) -> list[Path]:
    """Every `files/sessions/<id>/` of a bundle that carries a log — Android "Stored" recordings."""
    root = game_dir(name) / "files" / "sessions"
    if not root.is_dir():
        return []
    return sorted(d for d in root.iterdir() if (d / "log.jsonl").is_file())


def stored_rows(session_dir: Path) -> list[dict]:
    """The logged rows in frame order — every row, since the sidecar is keyed per frame."""
    log = session_dir / "log.jsonl"
    rows = read_jsonl(log)
    return sorted((r for r in rows if r.get("frame") and r.get("corners")),
                  key=lambda r: Path(r["frame"]).stem)


#: The limits live in `calibration.py` because the CONSUMERS read them (CropBox.kt / warp.ts have
#: their twins). Measured on rg-2026-08-08-11-59-12/004251: the real outer lines reach c = 0.046,
#: a ~10 px sagitta at 928, so 0.08 leaves ~1.7x headroom — bigger is a shadow, not a lens.


def _mesh_axis(values: list[float]) -> bool:
    """Finite and strictly increasing — a NaN in the JSON would break both consumer parsers."""
    return (all(math.isfinite(v) for v in values)
            and all(b > a for a, b in pairwise(values)))


def _mesh_tilts(values: list[float], limit: float = MESH_TILT_LIMIT) -> bool:
    return all(math.isfinite(v) and abs(v) < limit for v in values)


def _curved_axes(lines, curls, pad: int, board_size: int) -> dict | None:
    """The curvature pair, ALL-or-nothing: folded offsets plus `cx`/`cy`, or None.

    `d` is folded into the offset so `x` stays "position at the centre" of the PARABOLA — the
    linear offsets stay untouched when the pair is refused, each stage carrying its own best fit.
    """
    if any(c is None for axis in curls for c in axis):
        return None
    fold = [[round((lines[a][k][1] + curls[a][k][0] - pad) / board_size, 5) for k in range(9)]
            for a in (0, 1)]
    curv = [[round(curls[a][k][1] / board_size, 5) for k in range(9)] for a in (0, 1)]
    ok = (_mesh_axis(fold[0]) and _mesh_axis(fold[1])
          and _mesh_tilts(curv[0], MESH_CURV_LIMIT) and _mesh_tilts(curv[1], MESH_CURV_LIMIT))
    return {"x": fold[0], "y": fold[1], "cx": curv[0], "cy": curv[1]} if ok else None


def grid_line_fracs(image, quad, board_size: int, profile=None, lens=None) -> dict | None:
    """Audit-aware entry point for the board's 18 measured grid lines."""
    quad_key = tuple(round(float(v), 4) for point in quad for v in point)
    key = (object_revision(image), tuple(image.shape), quad_key, int(board_size),
           getattr(profile, "profile", None), id(lens) if lens is not None else None)
    with measure("grid sweeps", key, processed_bytes=getattr(image, "nbytes", 0)):
        return _grid_line_fracs(image, quad, board_size, profile=profile, lens=lens)


def _grid_line_fracs(image, quad, board_size: int, profile=None, lens=None) -> dict | None:
    """The 18 measured lines as fractions of the field side, or None unless ALL are located.

    Per line: offset at the board's centre, dimensionless tilt, and — when every line's bands
    allow it — the parabola term `cx`/`cy` (`pos(t) = x + tx·(t−0.5) + cx·(t−0.5)²`). Consumers
    cut each square at the intersections of its four neighbour LINES, one stage per shape.

    `profile`: measure through ITS margin — a session log holds the marker quad, and fractions
    read at margin 0 would describe a board the slice never warps. Default: `quad` is the field.
    """
    from .alignment import grid_lines_with_curvature, warp_for_grid

    if profile is None:
        profile = _field_profile(quad, (image.shape[1], image.shape[0]), board_size)
    warped, pad = warp_for_grid(image, profile, quad, lens=lens)
    lines, curls = grid_lines_with_curvature(warped, board_size, pad=pad)
    if any(line is None for axis in lines for line in axis):
        return None
    xs = [round((lines[0][k][1] - pad) / board_size, 5) for k in range(9)]
    ys = [round((lines[1][k][1] - pad) / board_size, 5) for k in range(9)]
    txs = [round(lines[0][k][0], 5) for k in range(9)]
    tys = [round(lines[1][k][0], 5) for k in range(9)]
    if not (_mesh_axis(xs) and _mesh_axis(ys) and _mesh_tilts(txs) and _mesh_tilts(tys)):
        return None
    mesh = {"x": xs, "y": ys, "tx": txs, "ty": tys}
    curved = _curved_axes(lines, curls, pad, board_size)
    if curved is not None:
        mesh.update(curved)
    return mesh


def fit_stored_session(session_dir: Path, *,
                       margin: float = config.DEFAULT_MARKER_MARGIN) -> tuple[dict, list[float]]:
    """The sidecar payload, plus what the LOGGED quad measured before the fit (the honest before).

    The log carries the MARKER quad and one constant outset for it, and the real one varies per
    session (measured 2026-08-15: up to 14 px, an eighth of a cell). The margin only has to put
    the grooves inside the first search window; the grid fit supplies the accuracy from there.
    """
    from .alignment import improve_quad

    frames, failed, before_px = {}, [], []
    for row in stored_rows(session_dir):
        stem = Path(row["frame"]).stem
        image = cv2.imread(str(session_dir / row["frame"]))
        if image is None:
            failed.append(stem)
            continue
        size = measured_board_size(row["corners"])
        start = field_quad(row["corners"], size, margin)
        quad, before, after = improve_quad(
            image, start, _field_profile(start, (image.shape[1], image.shape[0]), size))
        worst = after if quad is not None else before
        if worst != worst:  # NaN — no square was measurable at all, so nothing here is trustworthy
            failed.append(stem)
            continue
        frames[stem] = {"corners": [[round(x, 2), round(y, 2)] for x, y in (quad or start)],
                        "align_worst_px": round(float(worst), 2)}
        mesh = grid_line_fracs(image, quad or start, size)
        if mesh is not None:
            frames[stem]["grid_lines"] = mesh
        if before == before:
            before_px.append(round(float(before), 2))
    payload = {
        "margin": 0.0,
        "frames": frames,
        "failed": failed,
        "method": FIT_METHOD,
        "source_margin": float(margin),
        "written_at": datetime.now(UTC).isoformat(),
    }
    return payload, sorted(before_px)


def write_quad_fit(session_dir: Path, payload: dict) -> Path:
    """Atomically — a half-written sidecar would silently move every crop of the session."""
    path = session_dir / QUAD_FIT_NAME
    tmp = path.with_suffix(".json.tmp")
    try:
        tmp.write_text(json.dumps(payload, ensure_ascii=False) + "\n", encoding="utf-8")
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)
    return path


def _median(values: list[float]) -> float | None:
    return values[len(values) // 2] if values else None


def fit_stored(name: str) -> list[dict]:
    """Write `quad-fit.json` next to every stored session of one bundle, and say what it moved."""
    sessions = stored_session_dirs(name)
    if not sessions:
        raise FileNotFoundError(f"{name}: no stored session under files/sessions/<id>/log.jsonl")
    done = []
    for session_dir in sessions:
        payload, before = fit_stored_session(session_dir)
        path = write_quad_fit(session_dir, payload)
        after = sorted(f["align_worst_px"] for f in payload["frames"].values())
        print(f"  {name}/{session_dir.name}: {len(payload['frames'])} fitted, "
              f"{len(payload['failed'])} failed — align_worst_px median {_median(before)} -> "
              f"{_median(after)}, max {before[-1] if before else None} -> {after[-1] if after else None}")
        done.append({"name": name, "session": session_dir.name, "path": path,
                     "fitted": len(payload["frames"]), "failed": payload["failed"],
                     "before": _median(before), "after": _median(after)})
    return done


def bundles_with_stored() -> list[str]:
    root = config.DATA.recordings
    return sorted(d.name for d in root.iterdir() if stored_session_dirs(d.name)) if root.is_dir() else []


def fit_stored_all() -> list[dict]:
    """Every bundle that carries a stored session, one after the other — ONE worker, no pool."""
    done = []
    for name in bundles_with_stored():
        done += fit_stored(name)
    return done
