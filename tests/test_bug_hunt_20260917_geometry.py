"""Bug hunt 2026-09-17, Achse Geometrie und Zuschnitt: Leser des Brett-Stores, die ihre eigene
Skala annehmen statt die der Zeile. Jeder Test hier faellt auf dem Code von vorher."""

import json

import cv2
import numpy as np
import yaml

from chesslab import config, realgames, sessions
from chesslab.calibration import CalibrationProfile, crop_border_px
from conftest import make_profile

SIDE = 320


def _profile(bs: int = SIDE, **crop_kw) -> CalibrationProfile:
    corners = [[0, 0], [bs, 0], [bs, bs], [0, bs]]
    return make_profile(bs, corners=corners, profile="t", out_size=(32, 32), **crop_kw)


def _board(side: int, border: int) -> np.ndarray:
    """Jede Zelle ein eigener Grauwert — ein um eine Zelle verschobener Schnitt liest anders."""
    img = np.zeros((side + 2 * border, side + 2 * border, 3), np.uint8)
    cell = side // 8
    for r in range(8):
        for c in range(8):
            img[border + r * cell:border + (r + 1) * cell,
                border + c * cell:border + (c + 1) * cell] = 4 * (r * 8 + c) + 3
    return img


def _session(tmp_path, monkeypatch, rows, side, border):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = realgames.game_dir("s1")
    (sdir / "boards").mkdir(parents=True)
    for row in rows:
        cv2.imwrite(str(sdir / row["board"]), _board(side, border))
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "rg-s1", "profile": "t", "mode": "track"}), encoding="utf-8")
    return sdir


def test_the_settle_scan_refuses_a_board_that_is_not_the_crop_raster(tmp_path, monkeypatch):
    """`labeling.usable_board` ist die Wache jedes Brettlesers: `matte`, `temporal_matte`,
    `sensor_audit`, `occluded_model` und `slice` fragen sie, bevor sie aus `boards/` schneiden.

    `sessions.settle_scan_session` fragt nur, OB eine Datei daliegt, und `realgames.settle_for_ply`
    schneidet sie dann mit `crop_square` unter der Skala des PROFILS. Ein Brett in einer anderen
    Skala wird damit an voellig anderen Stellen abgetastet — und die Zahl, die dabei herauskommt,
    landet als `settle_dev` in der `log.jsonl` und steuert ueber `SETTLE_LIMIT` die Strittig-Lane.
    """
    prof = _profile()
    small, border = SIDE // 2, 4
    rows = [{"frame": f"frames/{i:06d}.png", "board": f"boards/{i:06d}.webp", "ply": 1,
             "fen": "8/8/8/8/8/8/8/8 w - - 0 1", "corners": prof.image_corners,
             "board_size": small, "board_border": border}
            for i in range(1, 9)]
    _session(tmp_path, monkeypatch, rows, small, border)
    monkeypatch.setattr("chesslab.labeling.load_profile", lambda name: prof)

    result = sessions.settle_scan_session("rg-s1")

    assert result["scored"] == 0, (
        f"{result['scored']} Bretter in {small} px wurden mit dem {SIDE}-px-Profil abgetastet und "
        "ihre `settle_dev` in die log.jsonl geschrieben — dieselbe stille Fehlskala, gegen die "
        "`usable_board` existiert."
    )


def test_the_cells_the_settle_scan_cuts_are_the_cells_the_crop_cuts(tmp_path, monkeypatch):
    """Gegenprobe zum Obigen als MESSUNG statt als Zaehlung: unter der falschen Skala liest die
    Zelle a8 den Grauwert einer ganz anderen Zelle. 928/12 ist, was alle 25 Aufnahmen tragen."""
    from chesslab.labeling import all_squares, crop_square

    prof = _profile()
    small, border = SIDE // 2, 4
    board = _board(small, border)
    right = _profile(bs=small, cell=small / 8.0)

    wrong = np.stack([crop_square(board, s, prof, (8, 8)) for s in all_squares()])
    good = np.stack([crop_square(board, s, right, (8, 8)) for s in all_squares()])

    assert int(np.median(good[0])) != int(np.median(wrong[0])), (
        "a8 liest unter beiden Skalen dasselbe — das Fixture unterscheidet die Zellen nicht")


def test_the_settle_scan_still_scores_a_board_in_the_profiles_own_scale(tmp_path, monkeypatch):
    """Die Wache darf nicht alles verwerfen: unter der Skala der Zeile wird weiter gemessen."""
    prof = _profile()
    border = crop_border_px(prof)
    rows = [{"frame": f"frames/{i:06d}.png", "board": f"boards/{i:06d}.webp", "ply": 1,
             "fen": "8/8/8/8/8/8/8/8 w - - 0 1", "corners": prof.image_corners,
             "board_size": SIDE, "board_border": border}
            for i in range(1, 9)]
    _session(tmp_path, monkeypatch, rows, SIDE, border)
    monkeypatch.setattr("chesslab.labeling.load_profile", lambda name: prof)

    assert sessions.settle_scan_session("rg-s1")["scored"] == 8
