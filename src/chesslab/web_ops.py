"""What the web app asks Python instead of rebuilding it (`docs/web-ruft-python.md`).

Every op only calls a function that already exists; `chesslab web-worker` serves them. Ops that
touch a recording take `root`, the web app's `CHESSLAB_DATA_DIR`, so one worker serves any root.
"""

from __future__ import annotations

import contextlib
import os
import sys
import threading
from collections.abc import Callable, Iterator
from pathlib import Path

import chess

from . import config
from .realgames import confirm as rg_confirm
from .session_store import recording


class Missing(FileNotFoundError):
    """The ASKED-FOR recording, frame, alpha or candidate is not there: the web's only 404 from Python.
    A bare FileNotFoundError is an internal file gone and stays a 500 (`lib/http-error.ts`)."""


_root_turn = threading.Condition()
_root_users = 0
_root_before: config.Paths | None = None


@contextlib.contextmanager
def _rooted(root: str) -> Iterator[None]:
    """`config.DATA` is global: parallel cuts share one root, a different root waits until they leave."""
    global _root_users, _root_before
    with _root_turn:
        while _root_users and config.DATA.root != Path(root):
            _root_turn.wait()
        if not _root_users:
            _root_before, config.DATA = config.DATA, config.Paths(root=Path(root))
        _root_users += 1
    try:
        yield
    finally:
        with _root_turn:
            _root_users -= 1
            if not _root_users:
                config.DATA = _root_before
                _root_turn.notify_all()


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
        try:
            os.stat(recording.candidate_path(name))
        except FileNotFoundError:
            raise Missing(f"{name}: no candidate.json") from None
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


def preload() -> None:
    """Every module an op imports lazily, loaded by the READING thread: on Windows a DLL (cv2) that
    loads in an op thread hangs while stdin has a read pending (measured 2026-09-24)."""
    from . import (  # noqa: F401
        chain_state,
        corpus_pool,
        labeling,
        matte,
        stream_admission,
        web_cuts,
    )
    from .realgames import position  # noqa: F401
    from .state import GameState  # noqa: F401


def warm_cuts() -> bool:
    """The server's first call: `serve` preloads before it, so the first cell pays nothing."""
    return True


def cut_cell(root: str, name: str, stem: str, square: str, size: int, median: bool = False) -> str:
    from . import web_cuts

    with _rooted(root):
        return web_cuts.cut_cell(name, stem, square, size, median)


def cut_board(root: str, name: str, stem: str, size: int) -> str:
    from . import web_cuts

    with _rooted(root):
        return web_cuts.cut_board(name, stem, size)


def cut_matte(root: str, name: str, stem: str, size: int) -> str:
    from . import web_cuts

    with _rooted(root):
        return web_cuts.cut_matte(name, stem, size)


def pen(root: str, name: str, stem: str, action: str, mask: str | None = None) -> None:
    """`stroke` burns a base64 PNG mask into `mattes/<stem>.fixed.webp`, `clear` empties it, `restore` drops it."""
    from . import web_cuts

    with _rooted(root):
        if action == "stroke":
            return web_cuts.pen_stroke(name, stem, mask or "")
        if action == "clear":
            return web_cuts.pen_clear(name, stem)
        if action == "restore":
            return web_cuts.pen_restore(name, stem)
    raise ValueError(f"unknown pen action: {action!r}")


#: What the label views read of a `matte.jsonl` row; `coverage` only when measured (absent = SAM refused).
_MATTE_KEYS = ("ply", "reason", "concepts", "coverage", "alpha", "skipped", "merged_at")


def matte_frames(root: str, name: str) -> dict[str, dict]:
    """Per frame the EFFECTIVE row (`session_store.matte.effective_rows`), empty without a file."""
    from .ioutil import read_jsonl
    from .session_store.matte import effective_rows
    from .session_store.names import matte_path

    with _rooted(root):
        path = matte_path(recording.game_dir(name))
        try:
            rows = read_jsonl(path)
        except ValueError as exc:
            raise ValueError(f"{path}: beschaedigte Zeile mittendrin — {exc}") from None
    return {stem: {k: row[k] for k in _MATTE_KEYS if row.get(k) is not None}
            for stem, row in effective_rows(rows).items()}


def confirmed_against(candidate: dict, reference_md5: str | None) -> str:
    return recording.confirmation_against(candidate, reference_md5)


#: Read-only and cv2-bound (cv2 drops the GIL): these run side by side, every other op in order.
PARALLEL_OPS = frozenset({"cut_cell", "cut_board", "cut_matte"})
#: What a cut reads: a cut sent after one of these waits until it is done.
WRITE_OPS = frozenset({"pen", "confirm"})

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
    "warm_cuts": warm_cuts,
    "cut_cell": cut_cell,
    "cut_board": cut_board,
    "cut_matte": cut_matte,
    "pen": pen,
    "matte_frames": matte_frames,
}
