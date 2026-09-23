"""POOL auf `/corpus`: jede Zelle jedes exportierten Log-Frames, FEN-Label mit dem Ledger darueber.

Die Web-App fragt es ueber `web_ops.corpus_pool`; die Korrekturen liest `labeling.load_corrections`
wie der Slice — letzte Zeile gewinnt, `retract: true` oeffnet die Zelle wieder.
"""

from __future__ import annotations

from pathlib import Path

from . import config
from .chain_state import parsed
from .ioutil import mtime_size, read_jsonl
from .session_store.names import corrections_path, log_path
from .session_store.recording import game_dir


def _frames(path: Path) -> list[tuple[str, str, bool]]:
    return [(Path(str(r["frame"])).stem, r.get("fen"), r.get("dirty") is True) for r in read_jsonl(path)]


def _logs(names: list[str]) -> list[tuple[str, list[tuple[str, str, bool]]]]:
    """`(session_id, [(stem, fen, dirty)])` je exportierter Aufnahme — ohne `log.jsonl` keine."""
    return [(f"rg-{name}", parsed(log_path(game_dir(name)), "frames", _frames))
            for name in names if log_path(game_dir(name)).exists()]


_POOL: dict[str, tuple[tuple, dict]] = {}


def _stamp(path: Path) -> tuple[int, int] | None:
    try:
        return mtime_size(path)
    except FileNotFoundError:
        return None


def corpus_pool(names: list[str]) -> dict:
    """`classes`, `occludedBySession`, `frames`, `cells`, `orphans` — Zellen, keine Crops.

    Je Stand aller Logs und Ledger einmal gerechnet: 12 000 FENs aufzuklappen kostet ~250 ms.
    """
    key = tuple((name, _stamp(log_path(game_dir(name))), _stamp(corrections_path(game_dir(name))))
                for name in names)
    hit = _POOL.get(str(config.DATA.root))
    if hit is not None and hit[0] == key:
        return hit[1]
    value = _fold(names)
    _POOL[str(config.DATA.root)] = (key, value)
    return value


def _fold(names: list[str]) -> dict:
    from .labeling import load_corrections  # zieht cv2: erst beim ersten Pool
    from .state import GameState

    corrections: dict = {}
    for name in names:
        load_corrections(corrections_path(game_dir(name)), into=corrections)
    labels: dict[str, dict[str, str]] = {}
    pool = {"classes": {}, "occludedBySession": {}, "frames": 0, "cells": 0, "orphans": 0}
    hits = 0
    for session_id, frames in _logs(names):
        pool["occludedBySession"].setdefault(session_id, 0)
        for stem, fen, _dirty in frames:
            pool["frames"] += 1
            fen_labels = labels.get(fen) or labels.setdefault(fen, GameState(fen).labels())
            for square, fen_label in fen_labels.items():
                corrected = corrections.get((session_id, stem, square))
                hits += corrected is not None
                label = corrected if corrected is not None else fen_label
                pool["classes"][label] = pool["classes"].get(label, 0) + 1
                if label == "occluded":
                    pool["occludedBySession"][session_id] += 1
                pool["cells"] += 1
    # Eine Korrektur auf einem Frame, das kein exportiertes Log fuehrt, hat keinen Snapshot.
    pool["orphans"] = len(corrections) - hits
    return pool


def session_dirty(names: list[str]) -> list[dict]:
    """`count(dirty)/count(rows)` je exportiertem Log — dieselben Zeilen, die der Pool aufklappt."""
    return [{"sessionId": sid, "rows": len(frames), "dirty": sum(d for _s, _f, d in frames)}
            for sid, frames in _logs(names)]
