"""Die Bretter einer Session: `boards/`, `dirty/`, `mattes/` — Namen, Schreiben, Umhaengen."""

from __future__ import annotations

from pathlib import Path

import cv2

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


#: Lossless (OpenCV switches over at > 100) — a matte carries hand-drawn edges, and `matte-fix.ts`
#: writes them lossless for that reason. Re-encoding them at 95 would smear what a human drew.
MATTE_ENCODE = [cv2.IMWRITE_WEBP_QUALITY, 101]


def board_rel(stem: str, dirty: bool = False) -> str:
    """The board's path inside the session — `row["board"]`, as `row["frame"]` names the frame."""
    return f"{DIRTY_DIR if dirty else BOARD_DIR}/{stem}{BOARD_SUFFIX}"


def place_board(session_dir: Path, row: dict) -> tuple[Path, Path] | None:
    """Repoint the row at the folder its `dirty` flag names; returns the move `move_boards` makes.

    The FOLDER is the clean/dirty predicate downstream: `temporal_matte.bracketing` and
    `sensor_audit.audit` pick their reference peers out of `boards/`. A flag set after the export
    that leaves the file where it was makes a hand frame a reference plate.
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
    """Erst NACH dem bewachten `_write_log`: vorher verschoben lag das Brett bei `Contested` im
    anderen Ordner, als die unveraenderte Log-Zeile sagt (W5, Muster `trim_session`)."""
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
    """The DATA warp (`warp_board_for_crops`), not `grid_occlusion.warp_padded`: the two differ
    as soon as `pad_side` exceeds the display border, and the store has to be the crop's raster.

    Returns the row's `board` keys — the path AND the scale the pixels are in. A homography hides
    that scale (board coordinates cancel against it), a stored raster does not: the candidate's
    geometry says 1008 where the export profile says 928, and a reader that assumed its own number
    cut every cell 8 % off (measured: 14 dB against the training crop).
    """
    from ..calibration import crop_border_px, warp_board_for_crops

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
