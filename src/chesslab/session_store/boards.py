"""Die Bretter einer Session: `boards/`, `dirty/`, `mattes/` — Namen, Schreiben, Umhaengen."""

from __future__ import annotations

from pathlib import Path

import cv2

# `boards/`: the board rectified with the row's FINAL quad and the crop border (WebP, 115 KB against
# 3.3 MB), the raster `crop_square` cuts from. A later quad change must rewrite it.
from .names import BOARD_DIR, DIRTY_DIR

BOARD_SUFFIX = ".webp"


#: The file, its pixel scale, and whether it was pulled straight — popped together on a rewrite,
#: since a fresh warp is bowed again.
BOARD_KEYS = ("board", "board_size", "board_border", "board_straightened")


BOARD_ENCODE = [cv2.IMWRITE_WEBP_QUALITY, 95]


#: Lossless (OpenCV switches over at > 100): a matte carries hand-drawn edges.
MATTE_ENCODE = [cv2.IMWRITE_WEBP_QUALITY, 101]


def board_rel(stem: str, dirty: bool = False) -> str:
    """The board's path inside the session — `row["board"]`, as `row["frame"]` names the frame."""
    return f"{DIRTY_DIR if dirty else BOARD_DIR}/{stem}{BOARD_SUFFIX}"


def place_board(session_dir: Path, row: dict) -> tuple[Path, Path] | None:
    """Repoint the row at the folder its `dirty` flag names; returns the move for `move_boards`. The
    FOLDER is the clean/dirty predicate reference peers are picked by.
    """
    rel = row.get("board")
    if not rel:
        return None
    want = board_rel(Path(rel).stem, bool(row.get("dirty")))
    src, dst = session_dir / rel, session_dir / want
    if want == rel or not src.is_file():
        return None
    row["board"] = want
    return src, dst


def move_boards(moves: list[tuple[Path, Path] | None]) -> int:
    """Erst NACH dem bewachten `_write_log`: sonst laege das Brett bei `Contested` im anderen
    Ordner, als die Log-Zeile sagt.
    """
    done = 0
    for move in filter(None, moves):
        src, dst = move
        if src.is_file():
            dst.parent.mkdir(parents=True, exist_ok=True)
            src.replace(dst)
            done += 1
    return done


def write_board(session_dir: Path, stem: str, frame, corners, profile,
                dirty: bool = False, mesh=None, lens=None) -> dict:
    """The DATA warp (`warp_board_for_crops`), the crop's raster. Returns the row's `board` keys,
    path AND pixel scale: a reader assuming 928 on a 1008 board cut every cell 8 % off.
    """
    from ..calibration import crop_border_px, warp_board_for_crops

    rel = board_rel(stem, dirty)
    out = session_dir / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(out), warp_board_for_crops(frame, profile, corners, mesh, lens), BOARD_ENCODE):
        raise OSError(f"could not write board {out}")
    # A stem lives in ONE folder; the old one goes AFTER the new plate is on disk.
    (session_dir / board_rel(stem, not dirty)).unlink(missing_ok=True)
    keys = {"board": rel, "board_size": int(profile.board_size),
            "board_border": crop_border_px(profile)}
    return keys if mesh is None else {**keys, "board_straightened": True}
