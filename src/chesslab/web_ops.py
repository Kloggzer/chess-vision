"""What the web app asks Python instead of rebuilding it (`docs/web-ruft-python.md`).

Every op only calls a function that already exists; `chesslab web-worker` serves them. Ops that
touch a recording take `root`, the web app's `CHESSLAB_DATA_DIR`, so one worker serves any root.
"""

from __future__ import annotations

import contextlib
import os
import sys
from collections.abc import Callable, Iterator
from pathlib import Path

import chess

from . import config
from .realgames import confirm as rg_confirm
from .session_store import recording


@contextlib.contextmanager
def _rooted(root: str) -> Iterator[None]:
    before = config.DATA
    config.DATA = config.Paths(root=Path(root))
    try:
        yield
    finally:
        config.DATA = before


def ping() -> dict:
    """`torch`/`cv2`/`cli` say whether anything on the way pulled them in — the worker must stay light."""
    return {"pid": os.getpid(), "torch": "torch" in sys.modules, "cv2": "cv2" in sys.modules,
            "cli": "chesslab.cli" in sys.modules}


def lcs_report(truth: list[str], cand: list[str]) -> dict:
    matched, invented, missed = rg_confirm.lcs_report(truth, cand)
    return {"matched": [list(p) for p in matched], "invented": invented, "missed": missed}


def reviewed_plies(moves: list[dict], matched: list[list[int]], kept: list[int]) -> list[int]:
    return rg_confirm.reviewed_plies(moves, [tuple(p) for p in matched], kept)


def parse_reference(text: str) -> dict:
    ref = recording.parse_reference(text)
    return {"sans": ref.sans, "problem": ref.problem, "more": ref.more}


def _squares(fen: str | None, san: str) -> dict | None:
    if not fen:
        return None
    try:
        move = chess.Board(fen).parse_san(san)
    except ValueError:
        return None
    return {"from": chess.square_name(move.from_square), "to": chess.square_name(move.to_square)}


def move_squares(plies: list[list]) -> list[dict | None]:
    """`[fen_before, san]` pairs -> the squares the arrow is drawn between, `None` when unplayable."""
    return [_squares(fen, san) for fen, san in plies]


def reference_origin(root: str, name: str) -> str:
    with _rooted(root):
        return recording.reference_origin(name)


def confirm(root: str, name: str, kept: list[int], drop: list[int],
            shown_reference: str | None = recording.UNCHECKED) -> list[int]:
    with _rooted(root):
        return rg_confirm.confirm_kept(name, kept, drop, shown_reference=shown_reference)


def chain_status(root: str, names: list[str], target: int, model: str | None = None) -> dict[str, dict]:
    """EINE Anfrage fuer alle Aufnahmen einer Seite; `review-notes.jsonl` wird dabei einmal gelesen."""
    from . import chain_state  # lazy: der Worker startet ohne cv2/numpy (`docs/web-ruft-python.md`)

    with _rooted(root):
        notes = chain_state.review_frames()
        return {name: chain_state.chain_status(name, target=target, model=model, notes=notes) for name in names}


def matte_census(root: str, name: str, target: int) -> dict:
    from . import chain_state

    with _rooted(root):
        return chain_state.matte_census(recording.game_dir(name), f"rg-{name}", target)


def admission(root: str, names: list[str]) -> dict[str, dict]:
    """Je Aufnahme des Labeln-Stroms: Bretter ohne Weg in den Slice, Zellen ohne Weg in den Verlust."""
    from . import stream_admission

    with _rooted(root):
        return {name: stream_admission.admission(recording.game_dir(name)) for name in names}


def pool(root: str, names: list[str]) -> dict:
    from . import corpus_pool

    with _rooted(root):
        return corpus_pool.corpus_pool(names)


def session_dirty(root: str, names: list[str]) -> list[dict]:
    from . import corpus_pool

    with _rooted(root):
        return corpus_pool.session_dirty(names)


def confirmed_against(candidate: dict, reference_md5: str | None) -> str:
    return recording.confirmation_against(candidate, reference_md5)


OPS: dict[str, Callable[..., object]] = {
    "ping": ping,
    "lcs_report": lcs_report,
    "reviewed_plies": reviewed_plies,
    "parse_reference": parse_reference,
    "move_squares": move_squares,
    "reference_origin": reference_origin,
    "confirm": confirm,
    "chain_status": chain_status,
    "matte_census": matte_census,
    "confirmed_against": confirmed_against,
    "admission": admission,
    "pool": pool,
    "session_dirty": session_dirty,
}
