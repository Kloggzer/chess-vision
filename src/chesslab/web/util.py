"""Gemeinsame Hilfsfunktionen für die Web-Router.

Aus ``app.py`` ausgezogen: Bild-URLs, Run-Verzeichnisse, Overlay-Zeichnung,
Kamera-Snapshots, Manifest-Zugriff. Keine Router-Logik, keine Endpoint-Definitionen.

``cv2`` wird nur in den Funktionen importiert, die es brauchen (Lazy-Import-Konvention).
"""

from __future__ import annotations

import logging
from pathlib import Path

from .. import config
from .. import dataset as dataset_mod
from ..labeling import label_to_fen_char, labels_to_fen  # noqa: F401 — re-export für Router

log = logging.getLogger("chesslab.web")

# Nach so vielen None-Frames in Folge zeigt der Stream ein Fehlerbild statt still zu idlen.
_NONE_FRAME_LIMIT = 50


def _camera_error_frame(width: int = 960, height: int = 540):
    """Gerendertes Fehlerbild für Streams, deren Kamera keine Frames liefert."""
    import cv2
    import numpy as np

    img = np.zeros((height, width, 3), dtype=np.uint8)
    cv2.putText(img, "Kamera liefert keine Frames — Quelle pruefen", (20, height // 2),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2, cv2.LINE_AA)
    return img


# --- Hilfen ---------------------------------------------------------------------------


def _manifest() -> list[dict]:
    p = config.DATA.manifests / "squares.jsonl"
    try:
        return dataset_mod.load_manifest(p)
    except FileNotFoundError:
        return []


def _img_url(path: str) -> str:
    """Manifest-Pfad 'data/squares/..' -> '/img/squares/..' (statischer Mount auf data/)."""
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


# --- Overlay-Helfer (für collect/camera-Streams) ----------------------------------------

# Figurennamen (ASCII, da OpenCV-Hershey-Fonts keine Umlaute rendern) für das Ziel-Overlay
# beim Nachbauen einer Stellung (v.a. coverage-Modus, der keine einzelnen Züge hat).
_PIECE_NAMES_DE: dict[str, str] = {
    "K": "Koenig", "Q": "Dame", "R": "Turm", "B": "Laeufer", "N": "Springer", "P": "Bauer",
}


def _put_centered_name(view, text: str, cx: int, cy: int, is_white: bool) -> None:
    """Figurennamen mittig auf ein Feld schreiben, mit Kontrast-Halo (weiße Figur = heller
    Text auf dunklem Halo, schwarze Figur umgekehrt) — lesbar auf beliebigem Bretthintergrund."""
    import cv2

    font, scale, thick = cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1
    (tw, th), _ = cv2.getTextSize(text, font, scale, thick)
    x, y = cx - tw // 2, cy + th // 2
    fill = (255, 255, 255) if is_white else (20, 20, 20)
    halo = (20, 20, 20) if is_white else (235, 235, 235)
    cv2.putText(view, text, (x, y), font, scale, halo, thick + 2, cv2.LINE_AA)
    cv2.putText(view, text, (x, y), font, scale, fill, thick, cv2.LINE_AA)


def _draw_target_pieces(view, prof, fen: str) -> None:
    """Die komplette Ziel-Stellung als Figuren-NAMEN auf das (entzerrte) Brett zeichnen, damit
    man beim Nachbauen sieht, welche Figur auf welches Feld gehört. Liest das FEN-Platzierungsfeld
    direkt (keine Legalitätsprüfung — coverage-FENs sind bewusst nicht spielbar)."""
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
    except Exception:  # noqa: BLE001 — reine Overlay-Deko, darf den Stream nie reißen
        log.debug("Zug-Pfeil-Overlay übersprungen (FEN/SAN nicht zeichenbar)", exc_info=True)


# --- Zustands-Helfer für Router --------------------------------------------------------


def _collect_state() -> dict:
    from .state import COLLECT

    c = COLLECT.snapshot()
    w = c["writer"]
    if w is None:
        return {"active": False}
    pos, i = c["positions"], c["i"]
    n = len(pos)
    cur = pos[min(i, n - 1)]
    return {
        "active": True, "session_id": w.session_id, "index": i, "n_positions": n,
        "done": i >= n, "fen": cur["fen"], "ply": cur["ply"],
        # Zug, um die aktuell zu fotografierende Stellung zu erreichen (None = Startstellung).
        "move_san": (pos[i]["san"] if 0 <= i < n else None),
        # coverage-Modus: ganze Stellung neu aufbauen (Namen im Bild), kein Einzelzug.
        "build_target": bool(c.get("show_target")),
        "gains": (cur.get("gains") if isinstance(cur, dict) else None),
        "captures": w.count,
    }


def _capture_frame_corners(prof, board):
    """(frame, corners) fürs SPEICHERN. Ist eine hochauflösende Capture-Quelle gesetzt
    (`--source` ist der flüssige Stream, `CHESSLAB_CAMERA_CAPTURE` der scharfe Snapshot),
    wird der Snapshot geholt und die Ecken DARAUF neu erkannt (andere Auflösung/Orientierung
    als die Vorschau). Sonst Live-Frame + die im Stream verifizierten Ecken."""
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
