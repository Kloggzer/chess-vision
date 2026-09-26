"""Die Ply-Intervalle eines bestaetigten Kandidaten und die Zeilen, die der Export daraus plant."""

from __future__ import annotations

from datetime import timedelta

from ..session_store.recording import base_time, video_fps
from ..state import GameState

YIELD_HEADER = f"{'population':10} {'rows':>6} {'crops':>8} {'cells':>6} {'cap4':>7} {'cap16':>7}"


#: How far past the FINAL commit its interval may run. Nothing witnesses the board after the last
#: commit (the tracker once kept REJECTING a played move for 18 s), so the tail is cut short.
LAST_INTERVAL_S = 2.0


def known_segments(candidate: dict) -> list[dict]:
    """One segment per REVIEWED ply: `[commit frame, next commit frame)` holds its `fen_after`; any
    next commit closes it. The LAST ply gets [LAST_INTERVAL_S] — otherwise the final position is
    never labelled.
    """
    moves = candidate["moves"]
    if not moves:
        return []
    reviewed = set(candidate.get("reviewed_plies") or ())
    stray = sorted(reviewed - {int(m["ply"]) for m in moves})
    if stray:
        # A reviewed ply naming no move: every later interval could carry the wrong position. Never
        # guess.
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
                # The quad at THIS commit (Kotlin `CommittedPly.corners`), so a board moved mid-game
                # is cut right.
                "corners": move.get("corners"),
                # The commit beat the motion hold; the frames after it were cut against a later
                # reference.
                "ref_provisional": bool(move.get("ref_provisional")),
                # Against the LAST move on the next commit's frame: a pair commit's hand window
                # holds BOTH moves, and the second move's squares went unmarked.
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
    """Squares whose occupant differs between two FENs — castling, captures, en passant need no
    case.
    """
    if not before or not after:
        return []
    a, b = GameState(before).labels(), GameState(after).labels()
    return sorted(sq for sq in a if a[sq] != b.get(sq))


def spread_indices(lo: int, hi: int, n: int) -> list[int]:
    """`n` source indices spread evenly over `[lo, hi)`, ends included, never duplicated: positions,
    not seconds, are what the corpus is short of.
    """
    span = hi - lo
    if span <= 0 or n <= 0:
        return []
    n = min(n, span)          # a short window has fewer frames than boards asked for
    if n == 1:
        return [lo]
    return [lo + round(i * (span - 1) / (n - 1)) for i in range(n)]


def pick_spread(items: list, ok, n: int, *, prefer=(), tol: int = 0) -> list:
    """`n` of `items` spread evenly, each the nearest one `ok` accepts: an empty slot borrows from
    beside it (dropping starved the corpus). `prefer` wins within `tol` places.
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


def plan_scanned(candidate: dict, scan: list[dict], *, margin_frames: int,
                 settle: dict | None = None, per_position: int = 8,
                 dirty_per_position: int = 8, prefer=(), reported=(),
                 dirty: bool = True, white_pov: bool = True) -> list[dict]:
    """The rows to store, picked from MEASURED frames (the commit window let 23 % hands through);
    each dirty row keeps its `dirty_reason`.
    """
    from .. import framescan

    corners = [[float(x), float(y)] for x, y in candidate["geometry"]["corners"]]
    base, fps = base_time(candidate), video_fps(candidate)
    # Zu unscharf oder zu dunkel, gemessen ueber die ganze AUFNAHME: der absolute Median schwankt
    # nur zwischen Aufnahmen, und die Ecke steht still.
    blurred = framescan.blurred_indices(scan) | framescan.dark_indices(scan)
    rows = []
    for seg in known_segments(candidate):
        reasons = {k: v for k, v in framescan.classify(seg, scan, white_pov=white_pov).items()
                   if k not in blurred}
        # Only over a CLEAN verdict: `occluded` claims the FEN holds, which contradicts
        # `stale`/`changed`. The report says "the scan missed a hand", not "the position is
        # unchanged".
        promoted = {idx for idx in reported if reasons.get(idx) == "clean"}
        for idx in promoted:
            reasons[idx] = "occluded"
        clean, flagged = framescan.select(reasons, per_position=per_position,
                                          dirty_per_position=dirty_per_position if dirty else 0,
                                          prefer=prefer)
        # Ein korrigiertes Bild ist Handarbeit und kommt ZUSAETZLICH mit, auch neben dem Slot. Nur
        # `clean` und `occluded`: bei `stale`/`changed` beschriebe die Korrektur ein anderes Brett.
        rescued = [idx for idx in sorted(prefer)
                   if seg["start"] <= idx < seg["end"] and idx not in clean and idx not in flagged
                   and reasons.get(idx) in ("clean", "occluded")]
        clean = list(clean) + [i for i in rescued if reasons[i] == "clean"]
        flagged = list(flagged) + ([i for i in rescued if reasons[i] == "occluded"] if dirty else [])
        rows.extend(_export_row(seg, idx, corners, base, fps, margin_frames, settle)
                    for idx in clean)
        rows.extend(_export_row(seg, idx, corners, base, fps, margin_frames, settle)
                    | {"dirty": True, "dirty_reason": reasons[idx]}
                    # Abgeleitet, nicht getragen: nur so erreicht ein spaeterer Widerruf die Zeile.
                    | ({"dirty_source": "reported"} if idx in promoted else {})
                    for idx in flagged)
    rows.sort(key=lambda r: r["frame"])
    return rows


def plan_rows(candidate: dict, *, margin_frames: int, every: int, dirty: bool,
              settle: dict | None = None, per_position: int | None = None) -> list[dict]:
    """Every log row the export will write, in frame order. Quiet rows sit `margin_frames` clear of
    both commits; dirty rows are the hand windows with the SAME interval FEN plus `dirty: true`.

    Before a commit the piece has often ALREADY moved: only the squares the NEXT move touches are
    in doubt, named in `unknown_squares`; the rest of the frame stays labelable."""
    corners = [[float(x), float(y)] for x, y in candidate["geometry"]["corners"]]
    base, fps = base_time(candidate), video_fps(candidate)
    rows = []
    for seg in known_segments(candidate):
        start, end = seg["start"], seg["end"]
        q0, q1 = start + margin_frames, end - margin_frames
        # A segment shorter than two margins has no quiet part.
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
            # `unknown_squares` on QUIET rows too: a piece placed seconds before the hand leaves
            # makes them stale (up to 4.6 s before its commit).
            rows.extend(_export_row(seg, idx, corners, base, fps, margin_frames, settle)
                        | ({"dirty": True} if is_dirty else {}) for idx in indices)
    rows.sort(key=lambda r: r["frame"])
    return rows


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


def unknown_for(seg: dict, index: int, margin_frames: int, settle: dict | None) -> list[str]:
    """Squares this frame cannot vouch for: the NEXT move's, from their own settle frame on
    (possibly inside the quiet margin); without a measurement, the whole trailing window.
    """
    touches = seg.get("next_touches") or []
    if not touches:
        return []
    measured = (settle or {}).get(seg["ply"] + 1) or {}
    if measured:
        named = sorted(sq for sq in touches if index >= measured.get(sq, seg["end"] - margin_frames))
        return named
    return sorted(touches) if index >= seg["end"] - margin_frames else []
