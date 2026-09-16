"""Der Session-Pack schnitt Bretter mit dem PROFIL, ohne zu pruefen, ob es ihr Massstab ist.

`usable_board` ist die Wache, an der jeder andere Brettleser haengt (`matte`, `temporal_matte`,
`labeling`, `occluded_model` seit heute) — `_cut_session` haengt als einziger nicht daran. Ein
Brett mit eigenem `board_size`/`board_border` wird sonst bis zu 59 px daneben geschnitten, und
diese Pixel sind die, aus denen das Modell lernt.

Gemessen 2026-09-16: 11 647 Bretter auf der Platte, **null** mit abweichendem Massstab. Laut
abweisen kostet also heute nichts.
"""

from __future__ import annotations

import numpy as np
import pytest

from chesslab.training import pack


def _session(tmp_path, small_profile, board_size: int, border: int):
    import cv2

    d = tmp_path / "rg-s1"
    (d / "boards").mkdir(parents=True)
    size = int(small_profile.board_size) + 2 * border
    cv2.imwrite(str(d / "boards" / "000001.webp"), np.full((size, size, 3), 120, np.uint8))
    return d, [{"frame": "frames/000001.png", "board": "boards/000001.webp",
                "board_size": board_size, "board_border": border}]


def _wire(monkeypatch, d, rows, small_profile):
    from chesslab import calibration, labeling, realgames

    monkeypatch.setattr(realgames, "game_dir", lambda name: d)
    monkeypatch.setattr(labeling, "read_log", lambda _d: rows)
    monkeypatch.setattr(labeling, "read_session_meta", lambda _d: {"profile": "p"})
    monkeypatch.setattr(calibration, "load_profile", lambda _n: small_profile)


def test_a_board_written_at_another_scale_is_refused(tmp_path, monkeypatch, small_profile):
    d, rows = _session(tmp_path, small_profile, board_size=999, border=0)
    _wire(monkeypatch, d, rows, small_profile)
    img = tmp_path / "packed.u8"
    img.write_bytes(b"\0" * (32 * 32 * 3))

    with pytest.raises(ValueError, match="000001"):
        pack._cut_session((str(img), 32 * 32 * 3, (32, 32), "rg-s1", {"000001": [("a1", 0)]}))


def test_a_board_at_the_profile_scale_still_cuts(tmp_path, monkeypatch, small_profile):
    from chesslab.labeling import crop_border_px

    border = crop_border_px(small_profile)
    d, rows = _session(tmp_path, small_profile, int(small_profile.board_size), border)
    _wire(monkeypatch, d, rows, small_profile)
    img = tmp_path / "packed.u8"
    img.write_bytes(b"\0" * (32 * 32 * 3))

    assert pack._cut_session((str(img), 32 * 32 * 3, (32, 32), "rg-s1",
                              {"000001": [("a1", 0)]})) == 1
