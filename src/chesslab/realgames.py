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
from datetime import UTC, datetime
from pathlib import Path

import chess.pgn

from . import config


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
