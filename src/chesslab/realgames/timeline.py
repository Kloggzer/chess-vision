"""Die Ply-Intervalle eines bestaetigten Kandidaten und die Zeilen, die der Export daraus plant."""

from __future__ import annotations

from datetime import timedelta

from ..session_store.recording import base_time, video_fps
from ..state import GameState

YIELD_HEADER = f"{'population':10} {'rows':>6} {'crops':>8} {'cells':>6} {'cap4':>7} {'cap16':>7}"


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
    246 of them over 9 386 boards (`docs/frame-scan.md`).
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
    from .. import framescan

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
        promoted = {idx for idx in reported if reasons.get(idx) == "clean"}
        for idx in promoted:
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
                    | {"dirty": True, "dirty_reason": reasons[idx]}
                    # Abgeleitet, nicht getragen: nur so erreicht ein spaeterer Widerruf die Zeile.
                    | ({"dirty_source": "reported"} if idx in promoted else {})
                    for idx in flagged)
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
