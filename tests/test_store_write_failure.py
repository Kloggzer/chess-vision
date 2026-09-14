"""Was passiert, wenn der Schreibvorgang scheitert — nicht, wenn er gelingt.

`straighten_boards` setzt `board_straightened` und die Zeile ist danach fuer immer gesperrt
("must never be pulled again"). Schlaegt `cv2.imwrite` fehl, liegt das gebogene Brett weiter auf
der Platte und traegt die Marke des geraden — der Schaden ist still und nicht mehr aufholbar.
"""
from __future__ import annotations

import json

import cv2
import numpy as np
import pytest

from chesslab.realgames import MATTE_DIR, straighten_boards

BS, BORDER, TILT = 400, 20, 0.04
EIGHTHS = [k / 8.0 for k in range(9)]


def _drawn(tilt: float):
    canvas = np.zeros((BS + 2 * BORDER, BS + 2 * BORDER, 3), np.uint8)
    for y in range(canvas.shape[0]):
        t = (y - BORDER) / BS - 0.5
        for k in range(9):
            x = BORDER + int(round((EIGHTHS[k] + tilt * t) * BS))
            canvas[y, max(0, x - 1):x + 2] = 255
    return canvas


def _row(idx: int) -> dict:
    return {"frame": f"frames/{idx:06d}.png", "board": f"boards/{idx:06d}.webp",
            "board_size": BS, "board_border": BORDER,
            "grid_lines": {"x": list(EIGHTHS), "y": list(EIGHTHS),
                           "tx": [TILT] * 9, "ty": [0.0] * 9}}


@pytest.fixture
def session(tmp_path):
    rows = [_row(i) for i in (0, 3, 6)]
    sdir = tmp_path / "rec"
    (sdir / "boards").mkdir(parents=True)
    (sdir / MATTE_DIR).mkdir(parents=True)
    for row in rows:
        cv2.imwrite(str(sdir / row["board"]), _drawn(TILT))
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    return sdir, rows


def test_a_failed_board_write_does_not_mark_the_board_straightened(session, monkeypatch):
    sdir, rows = session
    monkeypatch.setattr(cv2, "imwrite", lambda *a, **k: False)

    with pytest.raises(OSError):
        straighten_boards(sdir, rows)

    assert not any(r.get("board_straightened") for r in rows), (
        "the write failed, the bowed board is still on disk, and the row claims it is straight — "
        "that row can never be straightened again")
