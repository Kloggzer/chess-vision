"""Kandidat gegen Referenzpartie: LCS ueber die SANs, der Mensch sieht nur die Abweichungen."""

from __future__ import annotations

import hashlib
from collections.abc import Callable, Sequence

from ..session_store.recording import (
    UNCHECKED,
    ReferenceMoved,
    game_dir,
    load_candidate,
    parse_reference,
    read_reference,
    read_reference_bytes,
    reference_is_the_phones_own,
    write_confirmation,
)


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


def confirm(name: str, *, yes: bool, ask: Callable[[dict], bool] | None = None) -> dict:
    """Compare candidate to reference game, write verdict.
    `ask` decides invented plies one at a time; under `yes`, unmatched plies rejected."""
    candidate = load_candidate(name)
    truth, reference_md5 = read_reference(name)
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
        "path": write_confirmation(name, candidate, plies, reference_md5=reference_md5),
        "matched": len(matched),
        "invented": invented,
        "missed": missed,
        "kept": kept,
        "reviewed": plies,
    }


def confirm_kept(name: str, kept: Sequence[int], drop: Sequence[int] = (), *,
                 shown_reference: str | None = UNCHECKED) -> list[int]:
    """The web's verdict: `kept` = unmatched candidate INDICES kept, `drop` = PLIES struck from the
    matched set (a transposition matches SANs, not positions); struck stays struck, `/api/zuege`
    never resends `drop`. `shown_reference`: md5 the page showed, `None` = it showed none.
    """
    candidate = load_candidate(name)
    data = read_reference_bytes(name)
    md5 = None if data is None else hashlib.md5(data).hexdigest()
    if shown_reference != UNCHECKED and shown_reference != md5:
        raise ReferenceMoved(f"{name}: Referenz wurde waehrend der Pruefung ersetzt, Seite neu laden")
    truth = None if data is None else parse_reference(data.decode("utf-8")).sans
    moves = candidate["moves"]
    # Ohne lesbare Referenz ist nichts "matched": dann SIND die Behaltenen das Urteil.
    matched, invented, _ = (lcs_report(truth, [m["san"] for m in moves]) if truth is not None
                            else ([], list(range(len(moves))), []))
    open_ = set(invented)
    struck = sorted(set(candidate.get("struck_plies") or []) | set(drop))
    plies = [p for p in reviewed_plies(moves, matched, [j for j in kept if j in open_]) if p not in struck]
    write_confirmation(name, candidate, plies, reference_md5=md5, struck=struck)
    return plies
