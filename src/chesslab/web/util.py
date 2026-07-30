"""Shared helper functions for the web routers.

Extracted from ``app.py``: image URLs, run directories, overlay drawing,
camera snapshots, manifest access. No router logic, no endpoint definitions.

``cv2`` is only imported in the functions that need it (lazy import convention).
"""

from __future__ import annotations

import logging
from pathlib import Path

from .. import config
from .. import dataset as dataset_mod
from ..labeling import label_to_fen_char, labels_to_fen  # noqa: F401 — re-export for routers

log = logging.getLogger("chesslab.web")

# After this many consecutive None-frames, the stream shows an error image instead of idling silently.
_NONE_FRAME_LIMIT = 50


def _camera_error_frame(width: int = 960, height: int = 540):
    """Rendered error image for streams whose camera does not deliver frames."""
    import cv2
    import numpy as np

    img = np.zeros((height, width, 3), dtype=np.uint8)
    cv2.putText(img, "Camera does not deliver frames — check source", (20, height // 2),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2, cv2.LINE_AA)
    return img


# --- Helpers ---------------------------------------------------------------------------


def _manifest() -> list[dict]:
    p = config.DATA.manifests / "squares.jsonl"
    try:
        return dataset_mod.load_manifest(p)
    except FileNotFoundError:
        return []


def _img_url(path: str) -> str:
    """Manifest path 'data/squares/..' -> '/img/squares/..' (static mount on data/)."""
    path = path.replace("\\", "/")
    root = config.DATA.root.as_posix() + "/"
    return "/img/" + (path[len(root):] if path.startswith(root) else path)


def _run_dirs() -> list[Path]:
    root = config.DATA.models
    if not root.exists():
        return []
    return sorted((p for p in root.iterdir() if (p / "config.json").exists()), key=lambda p: p.name)


def _read_jsonl(path: Path) -> list[dict]:
    from ..ioutil import read_jsonl
    return read_jsonl(path)


# --- Overlay helpers (for collect/camera streams) ----------------------------------------

# Piece names (ASCII, since OpenCV Hershey fonts don't render umlauts) for the target overlay
# when reconstructing a position (especially coverage mode, which has no individual moves).
_PIECE_NAMES_DE: dict[str, str] = {
    "K": "Koenig", "Q": "Dame", "R": "Turm", "B": "Laeufer", "N": "Springer", "P": "Bauer",
}


def _put_centered_name(view, text: str, cx: int, cy: int, is_white: bool) -> None:
    """Write piece name centered on a square, with contrast halo (white piece = light
    text on dark halo, black piece vice versa) — readable on any board background."""
    import cv2

    font, scale, thick = cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1
    (tw, th), _ = cv2.getTextSize(text, font, scale, thick)
    x, y = cx - tw // 2, cy + th // 2
    fill = (255, 255, 255) if is_white else (20, 20, 20)
    halo = (20, 20, 20) if is_white else (235, 235, 235)
    cv2.putText(view, text, (x, y), font, scale, halo, thick + 2, cv2.LINE_AA)
    cv2.putText(view, text, (x, y), font, scale, fill, thick, cv2.LINE_AA)


def _draw_target_pieces(view, prof, fen: str) -> None:
    """Draw the complete target position as piece NAMES on the (rectified) board, so that
    during reconstruction one can see which piece belongs on which square. Reads the FEN placement
    field directly (no legality check — coverage FENs are intentionally not playable)."""
    from ..calibration import square_center

    placement = fen.split()[0]
    rank = 8
    for row in placement.split("/"):
        file_idx = 0
        for ch in row:
            if ch.isdigit():
                file_idx += int(ch)
                continue
            if file_idx > 7 or rank < 1:
                continue
            sqname = "abcdefgh"[file_idx] + str(rank)
            name = _PIECE_NAMES_DE.get(ch.upper())
            if name:
                cx, cy = square_center(sqname, prof)
                _put_centered_name(view, name, cx, cy, is_white=ch.isupper())
            file_idx += 1
        rank -= 1


def _draw_move_arrow(view, prof, fen, san):
    import chess
    import cv2

    from ..calibration import square_center
    from ..state import castling_rook_squares, en_passant_captured_square

    try:
        b = chess.Board(fen)
        mv = b.parse_san(san)
        c0 = square_center(chess.square_name(mv.from_square), prof)
        c1 = square_center(chess.square_name(mv.to_square), prof)
        cv2.arrowedLine(view, c0, c1, (0, 0, 255), 3, cv2.LINE_AA, tipLength=0.25)
        cv2.circle(view, c0, 10, (0, 200, 255), 2, cv2.LINE_AA)
        rook = castling_rook_squares(b, mv)
        if rook is not None:
            r0 = square_center(chess.square_name(rook[0]), prof)
            r1 = square_center(chess.square_name(rook[1]), prof)
            cv2.arrowedLine(view, r0, r1, (0, 165, 255), 3, cv2.LINE_AA, tipLength=0.25)
        ep = en_passant_captured_square(b, mv)
        if ep is not None:
            e = square_center(chess.square_name(ep), prof)
            d = 16
            cv2.line(view, (e[0] - d, e[1] - d), (e[0] + d, e[1] + d), (0, 0, 255), 3, cv2.LINE_AA)
            cv2.line(view, (e[0] - d, e[1] + d), (e[0] + d, e[1] - d), (0, 0, 255), 3, cv2.LINE_AA)
    except Exception:  # noqa: BLE001 — pure overlay decoration, must never crash the stream
        log.debug("Move arrow overlay skipped (FEN/SAN not drawable)", exc_info=True)


# --- State helpers for routers --------------------------------------------------------


def _collect_state() -> dict:
    from .camera import CAMERA
    from .state import COLLECT

    # `camera` rides along on the polled state so the UI can keep showing the DELIVERED
    # resolution (and a mismatch against the request) without a second poll loop.
    cam = CAMERA.status()
    c = COLLECT.snapshot()
    w = c["writer"]
    if w is None:
        return {"active": False, "camera": cam}
    pos, i = c["positions"], c["i"]
    n = len(pos)
    cur = pos[min(i, n - 1)]
    return {
        "active": True, "camera": cam,
        "session_id": w.session_id, "index": i, "n_positions": n,
        "done": i >= n, "fen": cur["fen"], "ply": cur["ply"],
        # Move to reach the currently-to-be-photographed position (None = starting position).
        "move_san": (pos[i]["san"] if 0 <= i < n else None),
        # Coverage mode: rebuild the entire position (names in the image), no individual move.
        "build_target": bool(c.get("show_target")),
        "gains": (cur.get("gains") if isinstance(cur, dict) else None),
        "captures": w.count,
    }


def _capture_frame_corners(prof, board):
    """(frame, corners) for SAVING. If a high-resolution capture source is set
    (`--source` is the fluent stream, `CHESSLAB_CAMERA_CAPTURE` the sharp snapshot),
    the snapshot is grabbed and corners are re-detected ON IT (different resolution/orientation
    than the preview). Otherwise live frame + the corners verified in the stream."""
    from ..calibration import detect_board_markers, resolve_board_corners
    from .camera import CAMERA

    f, hires = CAMERA.grab_capture()
    if f is None:
        return None, None
    if hires:
        mk = detect_board_markers(f, prof.marker_dict)
        res = resolve_board_corners(mk, board_size=prof.board_size) if len(mk) >= 4 else None
        return f, (res[0] if res else None)
    return f, (board.last_corners if board else None)
