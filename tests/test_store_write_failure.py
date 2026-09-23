"""`straighten_boards`, wenn `cv2.imwrite` scheitert: keine `board_straightened`-Marke."""
from __future__ import annotations

import cv2
import pytest

from chesslab.realgames import MATTE_DIR, straighten_boards
from conftest import write_jsonl
from test_store_straightening import BORDER, BS, EIGHTHS, TILT, _drawn


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
    write_jsonl(sdir / "log.jsonl", rows)
    return sdir, rows


def test_a_failed_board_write_does_not_mark_the_board_straightened(session, monkeypatch):
    sdir, rows = session
    monkeypatch.setattr(cv2, "imwrite", lambda *a, **k: False)

    with pytest.raises(OSError):
        straighten_boards(sdir, rows)

    assert not any(r.get("board_straightened") for r in rows), (
        "the write failed, the bowed board is still on disk, and the row claims it is straight — "
        "that row can never be straightened again")
