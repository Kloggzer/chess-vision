"""Stage 6 — Collection UI: Training Data Assistant.

Second OpenCV window next to the camera window. Shows live class coverage,
light/dark matrix, session progress, and a FEN recommendation for the weakest class.

**Data source: session logs, not the manifest.** `collect` only writes frames + FEN;
the manifest is only created during `slice`. Coverage is therefore derived directly from the logged
FEN (FEN -> 64 labels via Stage 2, square_color deterministic) — this yields exactly
the later slice counts, but is available immediately during capture.

Pure aggregation/recommendation are headless-testable; rendering needs a display.
"""

from __future__ import annotations

import json
from pathlib import Path

import chess
import cv2
import numpy as np

from . import config
from .labeling import square_color
from .state import GameState

CLASSES = config.CLASSES
_PIECES = [c for c in CLASSES if c != "empty"]
_WIN = "chesslab dashboard"
_TYPEMAP = {"P": chess.PAWN, "N": chess.KNIGHT, "B": chess.BISHOP,
            "R": chess.ROOK, "Q": chess.QUEEN, "K": chess.KING}


# --- Aggregation (headless, tested) -------------------------------------------------

def aggregate_fens(fens: list[str]) -> tuple[dict, dict, dict]:
    counts = dict.fromkeys(CLASSES, 0)
    light = dict.fromkeys(CLASSES, 0)
    dark = dict.fromkeys(CLASSES, 0)
    for fen in fens:
        for square, label in GameState(fen).labels().items():
            counts[label] += 1
            if square_color(square) == "light":
                light[label] += 1
            else:
                dark[label] += 1
    return counts, light, dark


def coverage_from_sessions(sessions_dir: Path) -> dict:
    sessions_dir = Path(sessions_dir)
    fens: list[str] = []
    n_sessions = 0
    if sessions_dir.exists():
        for sdir in sorted(sessions_dir.iterdir()):
            log = sdir / "log.jsonl"
            if not log.exists():
                continue
            n_sessions += 1
            for line in log.read_text(encoding="utf-8").splitlines():
                if line.strip():
                    fens.append(json.loads(line)["fen"])
    counts, light, dark = aggregate_fens(fens)
    return {
        "frames": len(fens),
        "sessions": n_sessions,
        "total_crops": len(fens) * 64,
        "counts": counts,
        "light": light,
        "dark": dark,
    }


# --- FEN Recommendation (headless, tested) ----------------------------------------------

def _chess_sq_color(sq: int) -> str:
    return "dark" if (chess.square_file(sq) + chess.square_rank(sq)) % 2 == 0 else "light"


def build_recommendation_fen(label: str, color: str) -> str | None:
    """Valid FEN that places `label` on a square of color `color` (both kings present)."""
    if label == "empty" or len(label) != 2:
        return None
    is_white = label[0] == "w"
    ptype = _TYPEMAP[label[1]]
    piece_color = chess.WHITE if is_white else chess.BLACK
    targets = [sq for sq in chess.SQUARES if _chess_sq_color(sq) == color]

    for tsq in targets:
        if ptype == chess.PAWN and chess.square_rank(tsq) in (0, 7):
            continue
        board = chess.Board(None)
        board.turn = chess.WHITE
        if ptype == chess.KING:
            board.set_piece_at(tsq, chess.Piece(chess.KING, piece_color))
            placed = False
            for osq in (chess.A1, chess.A8, chess.H1, chess.H8, chess.D4, chess.E5):
                if osq != tsq and chess.square_distance(osq, tsq) > 1:
                    board.set_piece_at(osq, chess.Piece(chess.KING, not piece_color))
                    placed = True
                    break
            if not placed:
                continue
        else:
            if tsq in (chess.E1, chess.E8):
                continue
            board.set_piece_at(chess.E1, chess.Piece(chess.KING, chess.WHITE))
            board.set_piece_at(chess.E8, chess.Piece(chess.KING, chess.BLACK))
            board.set_piece_at(tsq, chess.Piece(ptype, piece_color))
        if board.is_valid():
            return board.fen()
    return None


# --- Coverage Generator: dense setups instead of game replay (headless, tested) ----
#
# Core idea: the per-square classifier doesn't need a LEGAL position — the FEN is just a
# label source. Instead of replaying a Stockfish game (many pawns/empty squares, 1
# queen/king each), we pack onto the board as many UNDERREPRESENTED
# (piece × square color) combos as the inventory allows per physical setup. Over multiple setups
# the generator automatically rotates to the remaining deficits (greedy on the largest
# deficit). Result: drastically fewer rearrangements per rare training example gained.


def _color_squares(color: str) -> list[int]:
    return [sq for sq in chess.SQUARES if _chess_sq_color(sq) == color]


def build_coverage_fen(light: dict, dark: dict, target: int,
                       inventory: dict[str, int] | None = None) -> tuple[str, dict[int, str]]:
    """A FEN that distributes the physical inventory greedily to the largest (piece×square color) deficits.
    `light`/`dark`: current crop count per class per square color. Returns: (FEN,
    {square: label}). Pawns never land on the back rank (rank 1/8). No legality check."""
    inv = inventory or config.DEFAULT_INVENTORY
    cov = {"light": dict(light), "dark": dict(dark)}
    avail = {label: inv.get(label[1], 0) for label in _PIECES}
    free = {"light": _color_squares("light"), "dark": _color_squares("dark")}
    placements: dict[int, str] = {}
    blocked: set[tuple[str, str]] = set()   # (label, color) without usable square -> don't select again

    while True:
        best, best_def = None, 0
        for label in _PIECES:
            if avail[label] <= 0:
                continue
            for color in ("light", "dark"):
                if (label, color) in blocked or not free[color]:
                    continue
                deficit = target - cov[color][label]
                if deficit > best_def:
                    best_def, best = deficit, (label, color)
        if best is None or best_def <= 0:
            break
        label, color = best
        is_pawn = label[1] == "P"
        sq = next((s for s in free[color] if not (is_pawn and chess.square_rank(s) in (0, 7))), None)
        if sq is None:                       # only back-rank squares of this color free -> pawn won't work
            blocked.add((label, color))
            continue
        free[color].remove(sq)
        placements[sq] = label
        avail[label] -= 1
        cov[color][label] += 1

    board = chess.Board(None)
    for sq, label in placements.items():
        pc = chess.WHITE if label[0] == "w" else chess.BLACK
        board.set_piece_at(sq, chess.Piece(_TYPEMAP[label[1]], pc))
    return board.fen(), placements


def coverage_plan(light: dict, dark: dict, target: int, count: int,
                  inventory: dict[str, int] | None = None) -> list[dict]:
    """`count` dense setups as a position list (like pgn/play steps: {'ply','san','fen'}),
    ready for the capture loop. After each setup, coverage is simulated (assuming 1 frame per
    setup), so later setups shift toward the remaining deficits.
    Aborts early once all targets are reached."""
    cov_l, cov_d = dict(light), dict(dark)
    out: list[dict] = []
    for i in range(count):
        fen, placements = build_coverage_fen(cov_l, cov_d, target, inventory)
        if not placements:
            break
        for sq, label in placements.items():
            (cov_l if _chess_sq_color(sq) == "light" else cov_d)[label] += 1
        out.append({"ply": i + 1, "san": None, "fen": fen, "gains": len(placements)})
    return out


def _fen_from_placement(placement: dict[int, tuple[str, bool]]) -> str:
    """{chess_square: (piece type 'K'.., is_white)} -> FEN (no legality check; pure label source)."""
    board = chess.Board(None)
    for sq, (ptype, white) in placement.items():
        board.set_piece_at(sq, chess.Piece(_TYPEMAP[ptype], chess.WHITE if white else chess.BLACK))
    return board.fen()


def _sweep_types(order: tuple[str, ...], inv: dict[str, int]) -> list[str]:
    types: list[str] = []
    for t in order:
        types += [t] * inv.get(t, 0)
    return types[:8]   # one piece per file, max 8 files


def sweep_plan(colors: tuple[str, ...] = ("w", "b"), pieces: str = "special", passes: int = 1,
               inventory: dict[str, int] | None = None, together: bool = False,
               offset: int = 0) -> list[dict]:
    """Systematic coverage sweep: a row of pieces marches rank by rank across the board
    (one piece per file a–h). Each piece thus goes through all 8 ranks of its file (light/dark
    automatically).

    `together=False`: first White completely (8 photos/pass), then Black. `together=True`: BOTH colors
    simultaneously — White on rank r, Black on rank (r+4) (always 4 apart, never colliding) →
    only 8 photos/pass, each square gets a white AND a black example (half the photo count).

    **`offset`:** shifts the file→piece mapping **once** (constant for the ENTIRE session, NEVER
    mid-way — you set up once and only shift the row(s) backward). offset=0 →
    a=K,b=Q,…; offset=1 → a=Q,b=R,…  Over multiple sessions with different offsets each piece sees
    different files/squares → prevents "file⇒piece" overfitting. `passes` = mere repetition.

    `pieces`: "special" (non-pawns K,Q,R,B,N — default inventory = 8 = exactly one per file),
    "pawn" or "all". Returns: [{'ply','san','fen','note'}] for the capture loop (1 frame per pos.).
    """
    inv = inventory or config.DEFAULT_INVENTORY
    specials = _sweep_types(("K", "Q", "R", "B", "N"), inv)
    if specials and offset:                       # file→piece mapping shift ONCE
        k = int(offset) % len(specials)
        specials = specials[k:] + specials[:k]
    pawns = _sweep_types(("P",), inv)
    # One piece per file -> max 8 per rank. "all" packs specials AND pawns as a BLOCK on
    # adjacent ranks (like the starting position) and shifts both together -> both in every
    # photo, half the photo count. (layer_types, rank_offset_in_block)
    blocks = {"special": [(specials, 0)],
              "pawn": [(pawns, 0)],
              "all": [(specials, 0), (pawns, 1)]}.get(pieces)
    if blocks is None:
        raise ValueError(f"pieces must be special|pawn|all, got {pieces!r}")
    blocks = [(t, off) for t, off in blocks if t]
    if not blocks:
        return []

    def place(placement: dict, base_rank: int, white: bool) -> None:
        # NO rotation: each piece stays on ITS file across all passes/frames. You set up
        # the pieces ONCE and only shift the row(s) backward — never swap pieces.
        for types, off in blocks:
            for fi, t in enumerate(types):
                placement[chess.square(fi, (base_rank + off) % 8)] = (t, white)

    out: list[dict] = []
    ply = 0
    if together:
        for p in range(max(1, passes)):                    # passes = repetition (e.g. different lighting)
            for rank in range(8):
                placement: dict = {}
                place(placement, rank, True)               # White in front
                place(placement, rank + 4, False)          # Black shifted by 4 ranks -> never collides
                ply += 1
                out.append({"ply": ply, "san": None, "fen": _fen_from_placement(placement),
                            "note": f"wb-{pieces} pass{p + 1} rank{rank + 1}"})
    else:
        for color in colors:
            white = color == "w"
            for p in range(max(1, passes)):
                for rank in range(8):
                    placement = {}
                    place(placement, rank, white)
                    ply += 1
                    out.append({"ply": ply, "san": None, "fen": _fen_from_placement(placement),
                                "note": f"{color}-{pieces} pass{p + 1} rank{rank + 1}"})
    return out


def auto_sweep_offset(sessions_dir, n_files: int = 8) -> int:
    """Next offset for 'auto' mode: counts previous sweep sessions (`notes` contains 'sweep')
    and returns `count % n_files` — thus cycling through all file arrangements over multiple
    sessions (each piece gradually lands on every file)."""
    import yaml

    cnt = 0
    p = Path(sessions_dir)
    if p.exists():
        for d in p.iterdir():
            sy = d / "session.yaml"
            if not sy.exists():
                continue
            try:
                m = yaml.safe_load(sy.read_text(encoding="utf-8")) or {}
            except Exception:  # noqa: BLE001
                continue
            if "sweep" in str(m.get("notes", "")):
                cnt += 1
    return cnt % max(1, n_files)


def recommend(coverage: dict, target_per_class: int = config.UI_TARGET_PER_CLASS,
              warn_frac: float = config.UI_WARN_FRAC) -> dict | None:
    counts, light, dark = coverage["counts"], coverage["light"], coverage["dark"]

    # Priority 1: missing square color coverage (✗).
    for c in _PIECES:
        for color, have in (("dark", dark[c]), ("light", light[c])):
            if have == 0:
                fen = build_recommendation_fen(c, color)
                if fen:
                    return {"class": c, "color": color,
                            "reason": f"{c} missing on {color} squares", "fen": fen}

    # Priority 2/3: below warn_frac or below 100% of target.
    pool = [c for c in _PIECES if counts[c] < warn_frac * target_per_class]
    if not pool:
        pool = [c for c in _PIECES if counts[c] < target_per_class]
    if not pool:
        return None
    c = min(pool, key=lambda c: counts[c])
    color = "dark" if dark[c] <= light[c] else "light"
    pct = int(100 * counts[c] / max(target_per_class, 1))
    return {"class": c, "color": color, "reason": f"{c} at {pct}% of target",
            "fen": build_recommendation_fen(c, color)}


def copy_to_clipboard(text: str) -> bool:
    try:
        import pyperclip

        pyperclip.copy(text)
        return True
    except Exception:  # noqa: BLE001 - pyperclip optional / no clipboard
        return False


# --- Dashboard (rendering needs display) --------------------------------------------

_GREEN = (80, 200, 80)
_YELLOW = (60, 200, 230)
_RED = (60, 60, 230)
_EMPTY_BLUE = (220, 170, 80)
_FG = (230, 230, 230)


class CollectDashboard:
    """Render-only window. Key handling belongs to the collect loop (a global waitKey stream)."""

    def __init__(self, sessions_dir: Path, target_per_class: int = config.UI_TARGET_PER_CLASS,
                 mode_label: str = "", session_id: str = "") -> None:
        self.sessions_dir = Path(sessions_dir)
        self.target = target_per_class
        self.mode_label = mode_label
        self.session_id = session_id
        self.coverage: dict | None = None
        self._rec: dict | None = None
        self._window = False
        self._last_img = None

    def update(self) -> None:
        self.coverage = coverage_from_sessions(self.sessions_dir)
        self._rec = recommend(self.coverage, self.target)
        img = self._render()
        self._last_img = img
        if not self._window:
            cv2.namedWindow(_WIN, cv2.WINDOW_NORMAL)
            cv2.resizeWindow(_WIN, 900, 700)
            self._window = True
        cv2.imshow(_WIN, img)
        cv2.waitKey(1)

    def image(self):
        return self._last_img

    def recommended_fen(self) -> str | None:
        return self._rec["fen"] if self._rec else None

    def close(self) -> None:
        if self._window:
            cv2.destroyWindow(_WIN)
            self._window = False

    def _bar_color(self, count: int, target: int):
        if count >= target:
            return _GREEN
        if count >= self.target * config.UI_WARN_FRAC:
            return _YELLOW
        return _RED

    def _render(self):
        cov = self.coverage or {"frames": 0, "sessions": 0, "total_crops": 0,
                                 "counts": dict.fromkeys(CLASSES, 0), "light": dict.fromkeys(CLASSES, 0),
                                 "dark": dict.fromkeys(CLASSES, 0)}
        W, H = 900, 700
        img = np.full((H, W, 3), 30, dtype=np.uint8)

        def text(s, x, y, scale=0.5, color=_FG, thick=1):
            cv2.putText(img, s, (x, y), cv2.FONT_HERSHEY_SIMPLEX, scale, color, thick, cv2.LINE_AA)

        # A) Progress
        text(f"Sessions: {cov['sessions']}  |  Frames: {cov['frames']}  |  Crops: {cov['total_crops']}"
             f"  |  {self.mode_label} {self.session_id}", 14, 28, 0.55)
        prog = min(1.0, cov["total_crops"] / max(config.UI_TOTAL_TARGET, 1))
        cv2.rectangle(img, (14, 40), (W - 14, 54), (70, 70, 70), -1)
        cv2.rectangle(img, (14, 40), (14 + int((W - 28) * prog), 54), _GREEN, -1)

        # B) Class coverage (bars)
        piece_counts = [cov["counts"][c] for c in _PIECES]
        empty_target = int(config.UI_EMPTY_TARGET_RATIO * max(piece_counts + [1]))
        text("Class Coverage", 14, 84, 0.55)
        y = 100
        bar_x, bar_max = 70, 320
        for c in CLASSES:
            cnt = cov["counts"][c]
            tgt = empty_target if c == "empty" else self.target
            frac = min(1.0, cnt / max(tgt, 1))
            color = _EMPTY_BLUE if c == "empty" else self._bar_color(cnt, tgt)
            text(c, 14, y + 11, 0.45)
            cv2.rectangle(img, (bar_x, y), (bar_x + int(bar_max * frac), y + 14), color, -1)
            text(str(cnt), bar_x + bar_max + 8, y + 12, 0.42)
            y += 22

        # C) Light/Dark Matrix
        mx = 470
        text("Light / Dark", mx, 84, 0.55)
        text("light  dark", mx + 70, 100, 0.42)
        y = 116
        for c in CLASSES:
            text(c, mx, y + 10, 0.45)
            for k, (cnt) in enumerate((cov["light"][c], cov["dark"][c])):
                ok = cnt > 0
                cv2.putText(img, "OK" if ok else "X", (mx + 76 + k * 52, y + 11),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, _GREEN if ok else _RED, 1, cv2.LINE_AA)
            y += 22

        # D) Recommendation
        cv2.rectangle(img, (14, H - 96), (W - 14, H - 14), (45, 45, 45), -1)
        if self._rec:
            text(f"Recommendation: {self._rec['reason']}", 24, H - 70, 0.55, _YELLOW)
            text(f"FEN: {self._rec['fen']}", 24, H - 46, 0.42)
            text("Press g in capture window: copy FEN", 24, H - 24, 0.42, _GREEN)
        else:
            text("All classes sufficiently covered.", 24, H - 50, 0.6, _GREEN)
        return img


def run_ui(sessions_dir: str | None = None,
           target_per_class: int = config.UI_TARGET_PER_CLASS) -> int:
    """Standalone dashboard showing current status (without running capture)."""
    sdir = Path(sessions_dir) if sessions_dir else config.DATA.sessions
    dash = CollectDashboard(sdir, target_per_class=target_per_class, mode_label="(standalone)")
    dash.update()
    cov = dash.coverage
    print(f"Sessions: {cov['sessions']} | Frames: {cov['frames']} | Crops: {cov['total_crops']}")
    print("q = close, g = copy recommended FEN")
    while True:
        key = cv2.waitKey(50) & 0xFF
        if key == ord("q"):
            break
        if key == ord("g"):
            fen = dash.recommended_fen()
            if fen:
                print(("copied: " if copy_to_clipboard(fen) else "FEN: ") + fen)
    dash.close()
    return 0
