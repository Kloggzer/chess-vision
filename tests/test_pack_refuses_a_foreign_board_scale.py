"""Der Session-Pack schneidet nur Bretter, deren Massstab das Profil ist (`usable_board`)."""

from __future__ import annotations

import numpy as np
import pytest

from chesslab.training import pack_dataset as pack


def _session(tmp_path, small_profile, board_size: int, border: int):
    import cv2

    d = tmp_path / "rg-s1"
    (d / "boards").mkdir(parents=True)
    size = int(small_profile.board_size) + 2 * border
    cv2.imwrite(str(d / "boards" / "000001.webp"), np.full((size, size, 3), 120, np.uint8))
    return d, [{"frame": "frames/000001.png", "board": "boards/000001.webp",
                "board_size": board_size, "board_border": border}]


def _wire(monkeypatch, d, rows, small_profile):
    from chesslab import calibration
    from chesslab.session_store import recording as store_rec

    monkeypatch.setattr(store_rec, "game_dir", lambda name: d)
    monkeypatch.setattr("chesslab.session_store.log.read_log_rows", lambda _d: rows)
    monkeypatch.setattr("chesslab.session_store.paths.read_session_meta", lambda _d: {"profile": "p"})
    monkeypatch.setattr(calibration, "load_profile", lambda _n: small_profile)


def test_a_board_written_at_another_scale_is_refused(tmp_path, monkeypatch, small_profile):
    d, rows = _session(tmp_path, small_profile, board_size=999, border=0)
    _wire(monkeypatch, d, rows, small_profile)
    img = tmp_path / "packed.u8"
    img.write_bytes(b"\0" * (32 * 32 * 3))

    with pytest.raises(ValueError, match="000001"):
        pack._cut_session((str(img), 32 * 32 * 3, (32, 32), "rg-s1", {"000001": [("a1", 0)]}))


def test_a_board_at_the_profile_scale_still_cuts(tmp_path, monkeypatch, small_profile):
    from chesslab.calibration import crop_border_px

    border = crop_border_px(small_profile)
    d, rows = _session(tmp_path, small_profile, int(small_profile.board_size), border)
    _wire(monkeypatch, d, rows, small_profile)
    img = tmp_path / "packed.u8"
    img.write_bytes(b"\0" * (32 * 32 * 3))

    assert pack._cut_session((str(img), 32 * 32 * 3, (32, 32), "rg-s1",
                              {"000001": [("a1", 0)]})) == 1
