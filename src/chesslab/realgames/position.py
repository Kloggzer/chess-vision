"""Die gesetzte Stellung je Ply-Intervall aus den Brettern — und wer sie verlaesst."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import cv2

from ..labeling import all_squares
from ..session_store.boards import BOARD_SUFFIX
from ..session_store.names import MATTE_DIR
from .timeline import changed_squares

#: The settle score's shape. `SETTLE_CELL_PX` is small on purpose — the question is whether the
#: cell's CONTENT changed, not how sharp it is, and 32 px averages the sensor noise away for free.
#: `SETTLE_MIN_FRAMES` is what a median needs before it describes anything: below it the majority
#: that is supposed to be the settled board is a coin toss. `SETTLE_MEDIAN_MAX` bounds the memory
#: one ply can take (60 x 64 x 32 x 32 x 3 as int16 is ~24 MB) and costs nothing — `spread` samples
#: the interval evenly, and a median over 60 frames is not measurably worse than over 300.
SETTLE_CELL_PX = 32


SETTLE_MIN_FRAMES = 5


SETTLE_MEDIAN_MAX = 60


#: Alpha from which a pixel is the hand and not the board — the middle of the range.
ALPHA_SOLID = 128


#: What a frame may claim anywhere and still describe the SETTLED position. The reference must be
#: the board alone; a hand in it would put the hand into the median.
SETTLE_CLEAR_MAX = 0.02


def alpha_cells(session_dir: Path, stem: str, profile, out) -> Any:
    """The frame's alpha as 64 cells, the hand-corrected cut first — `None` when none was ever made.

    Cut with the same `crop_square` the board goes through, so a pixel means the same square in
    both and `coverage_of`'s number and this mask describe one region.
    """
    import numpy as np

    from ..labeling import crop_square
    from ..matte import FIXED_SUFFIX

    for name in (f"{stem}{FIXED_SUFFIX}", f"{stem}{BOARD_SUFFIX}"):
        path = session_dir / MATTE_DIR / name
        grey = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE) if path.is_file() else None
        if grey is None:
            continue
        board = cv2.cvtColor(grey, cv2.COLOR_GRAY2BGR)
        return np.stack([crop_square(board, s, profile, out) for s in all_squares()])[..., 0]
    return None


def cell_deviations(cells, ref, visible) -> Any:
    """Per cell: how far its VISIBLE pixels sit from [ref], and what fraction of them there were.

    Both sides are levelled before the difference, because a shadow shifts a cell's brightness
    while a piece shifts its structure. Raw, the shadow of a player leaning in flagged a2, b3 and
    b5 on a board nobody had touched (2026-08-22).
    """
    import numpy as np

    weight = visible[..., None].astype(np.float32)
    px = np.maximum(weight.sum(axis=(1, 2, 3)), 1.0)[:, None, None, None]

    def level(x):
        return x - (x * weight).sum(axis=(1, 2), keepdims=True) / px

    dev = (np.abs(level(cells) - level(ref)) * weight).sum(axis=(1, 2, 3))
    return dev / (px[:, 0, 0, 0] * cells.shape[-1]), weight.mean(axis=(1, 2, 3))


#: Wie viele zusammenhängende Felder eine Änderung höchstens umfasst. Ein Zug berührt ZWEI —
#: benachbart beim Bauernschritt, sonst zwei Blöcke zu eins; drei am Stück kann kein Zug. Gemessen
#: 2026-08-22: 89 % der Karten auf Zugfeldern liegen in Blöcken von 1 oder 2, ab 3 fällt die
#: Trefferquote von 19 % auf 2–4 % und damit auf den Hintergrund.
MAX_DEPART_BLOCK = 2


def departures(dev, seen, cover, *, limit: float, seen_min: float, covered_max: float,
               max_block: int = MAX_DEPART_BLOCK, keep=()) -> Any:
    """`(frames, 64) -> (frames, 64) bool`: hat dieses Feld die gesetzte Stellung VERLASSEN?

    Drei Zustände je Zelle, denn eine verdeckte Zelle passt nicht zur Referenz — sie ist ungesehen,
    und als Treffer gezählt würde sie eine Serie beenden, die die Hand nur verdeckt. Verlassen heißt
    deshalb: ab hier stimmt das Feld nie wieder, und mindestens einmal weicht es messbar ab.
    """
    import numpy as np

    covered = np.asarray(cover) >= covered_max
    blind = ~covered & (np.asarray(seen) < seen_min)
    known = ~covered & ~blind
    gone = known & (np.asarray(dev) >= limit)
    home = known & ~gone

    left = blind.copy()
    for c in range(left.shape[1]):
        at = np.flatnonzero(home[:, c])
        start = int(at[-1]) + 1 if len(at) else 0
        if start < left.shape[0] and gone[start:, c].any():
            left[start:, c] = True
    left &= ~covered
    # Form statt Menge: ein Schatten deckt einen zusammenhängenden Block, ein Zug zwei Felder.
    # `all_squares()` läuft reihenweise ab a1, also ist die 8x8-Sicht das Brett selbst.
    # `keep` sind die Felder des NAECHSTEN Zugs: eine Rochade mit Hand ist ein Block von sechs,
    # und als Schatten gelesen liess sie den Koenig auf e1 ins Training (153751, Ply 12).
    kept = left[:, list(keep)].copy() if len(keep) else None
    for f in range(left.shape[0]):
        block = left[f].reshape(8, 8)
        n, lab, stats, _c = cv2.connectedComponentsWithStats(block.astype(np.uint8),
                                                             connectivity=4)
        big = [c for c in range(1, n) if stats[c, cv2.CC_STAT_AREA] > max_block]
        if big:
            block[np.isin(lab, big)] = False
    if kept is not None:
        left[:, list(keep)] = kept
    # Verdeckte Zellen sind das Occlusion-Ziel: ihre Coverage nimmt sie schon aus dem
    # Klassifikations-Loss, als "verlassen" gemeldet würden sie stattdessen weggeworfen.
    return left


def settle_for_ply(job: tuple[Path, list[dict], object, dict]) -> dict:
    """One ply interval -> its settled board, the per-cell measurement, and the VERDICT per frame.

    Within one interval the position stands still, so the pixel-wise median over the boards whose
    ALPHA is empty is the settled position. Every frame is read against it on the pixels its own
    alpha calls board, and `departures` then adds the time axis: a shadow passes, a move stays.
    Only paths cross the process boundary.
    """
    import numpy as np

    from ..labeling import MATTE_DIRTY, SETTLE_LIMIT, SETTLE_SEEN_MIN, all_squares, crop_square

    session_dir, rows, profile, mattes, *rest = job
    touches = rest[0] if rest else ()
    rows = sorted(rows, key=lambda r: r["frame"])
    squares = all_squares()
    out = (SETTLE_CELL_PX, SETTLE_CELL_PX)
    stems = [Path(r["frame"]).stem for r in rows]

    # Ein Frame wird EINMAL gelesen: die Referenz-Frames sind Teil der Reihe und wurden vorher
    # zweimal dekodiert und 64-fach geschnitten.
    cells = {}
    for row, stem in zip(rows, stems, strict=True):
        board = cv2.imread(str(session_dir / row["board"]))
        if board is not None:
            cells[stem] = np.stack([crop_square(board, s, profile, out) for s in squares]).astype(np.float32)

    # Ein DIRTY Frame, den niemand gemessen hat, ist nicht "keine Hand", sondern ungemessen —
    # und `SETTLE_CLEAR_MAX` existiert genau dagegen. Gemessen 2026-09-16 ueber 25 Aufnahmen:
    # kostet 138 Frames und 14 von 804 Plys, die dann ehrlich "—" statt einer Zahl zeigen.
    unmeasured = {Path(r["frame"]).stem for r in rows if r.get("dirty")} - set(mattes)
    clear = [s for s in stems if s in cells and s not in unmeasured
             and max((mattes.get(s) or {}).values(), default=0.0) <= SETTLE_CLEAR_MAX]
    step = max(1, len(clear) // SETTLE_MEDIAN_MAX)
    reference = [cells[s] for s in clear[::step]]
    if len(reference) < SETTLE_MIN_FRAMES:
        return {}
    ref = np.median(np.stack(reference), axis=0)

    seen_stems, devs, seens, covers = [], [], [], []
    for stem in stems:
        if stem not in cells:
            continue
        alpha = alpha_cells(session_dir, stem, profile, out)
        visible = np.ones(cells[stem].shape[:3], bool) if alpha is None else alpha < ALPHA_SOLID
        dev, seen = cell_deviations(cells[stem], ref, visible)
        cover = mattes.get(stem) or {}
        seen_stems.append(stem)
        devs.append(dev)
        seens.append(seen)
        covers.append([cover.get(sq, 0.0) for sq in squares])

    left = departures(np.array(devs), np.array(seens), np.array(covers),
                      limit=SETTLE_LIMIT, seen_min=SETTLE_SEEN_MIN, covered_max=MATTE_DIRTY,
                      keep=[squares.index(sq) for sq in touches if sq in squares])
    scores = {stem: {"dev": [round(float(v), 2) for v in devs[i]],
                     "seen": [round(float(v), 3) for v in seens[i]],
                     "left": [squares[c] for c in np.flatnonzero(left[i])]}
              for i, stem in enumerate(seen_stems)}
    return {"ref": ref.astype(np.uint8), "scores": scores}


#: How far two neighbouring settled boards must differ on the squares the move between them
#: touched. Measured over 177 neighbour pairs: the committed move shows at a median of 33 to 49,
#: and 16 pairs stayed under 15 — those are the intervals whose commit nobody can vouch for.
INTERVAL_MOVE_MIN = 15.0


def interval_moves(refs: dict[int, Any], fens: dict[int, str]) -> list[dict]:
    """Per ply: is the move that OPENED this interval visible between its settled board and the
    one before it, on exactly the squares the move touched?

    A commit in the wrong place hangs a FEN on pixels that never showed it, and nothing downstream
    notices: every frame of the interval then agrees with a reference that is already wrong. This
    is the only test that looks across an interval boundary.
    """
    import numpy as np

    squares = all_squares()
    out = []
    for ply in sorted(refs):
        moved = changed_squares(fens.get(ply - 1), fens.get(ply)) if ply - 1 in refs else []
        if not moved:
            continue
        now = refs[ply].astype(np.float32)
        dev, _ = cell_deviations(now, refs[ply - 1].astype(np.float32), np.ones(now.shape[:3], bool))
        worst = max(float(dev[squares.index(sq)]) for sq in moved)
        out.append({"ply": ply, "moved": moved, "dev": round(worst, 2),
                    "seen": worst >= INTERVAL_MOVE_MIN})
    return out
