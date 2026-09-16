"""The alpha worker: only what still carries its FEN, resumable, and cut like the crop."""

import json
from dataclasses import replace

import cv2
import numpy as np

from chesslab import matte
from chesslab.calibration import CalibrationProfile, CropParams, compute_homography, crop_border_px
from chesslab.ioutil import Contested
from conftest import make_profile

SIDE = 320
CELL = SIDE // 8


def _profile() -> CalibrationProfile:
    corners = [[0, 0], [SIDE, 0], [SIDE, SIDE], [0, SIDE]]
    return make_profile(SIDE, corners=corners, profile="t", out_size=(32, 32))


def _entry(pad: int) -> dict:
    return {"board": "boards/000001.webp", "board_size": SIDE, "board_border": pad,
            "corners": _profile().image_corners, "ply": 3}


def test_coverage_lands_on_the_squares_the_alpha_covers():
    """The alpha is cut by `crops_for_frame`, so a covered cell reads 1.0 and its neighbour 0.0."""
    prof = _profile()
    pad = crop_border_px(prof)
    alpha = np.zeros((SIDE + 2 * pad, SIDE + 2 * pad), np.float32)
    alpha[pad:pad + CELL, pad:pad + CELL] = 1.0          # a8, top-left in white POV
    cov = matte.coverage_of(alpha, _entry(pad), prof)
    assert cov["a8"] > 0.5
    assert cov["h1"] == 0.0


def _session(tmp_path, monkeypatch, rows):
    """A session carrying a dirty pile, the shape `alpha_worker` reads."""
    import json

    import yaml

    from chesslab import config, realgames

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = realgames.game_dir("s1")
    (sdir / "dirty").mkdir(parents=True)
    for r in rows:
        cv2.imwrite(str(sdir / r["board"]), np.full((SIDE, SIDE, 3), 128, np.uint8))
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "rg-s1", "profile": "t", "mode": "track"}), encoding="utf-8")
    return sdir


def _dirty_rows(pad):
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    return [{"frame": f"frames/00000{i}.png", "board": f"dirty/00000{i}.webp", "ply": 1,
             "fen": fen, "dirty": True, "dirty_reason": reason, "corners": _profile().image_corners,
             "board_size": SIDE, "board_border": pad}
            for i, reason in enumerate(("occluded", "stale"), 1)]


def test_the_worker_only_mattes_what_still_carries_its_fen(tmp_path, monkeypatch):
    """A `stale` frame's alpha would mask a position nobody knows — SAM 3 time for nothing."""
    pad = crop_border_px(_profile())
    rows = _dirty_rows(pad)
    sdir = _session(tmp_path, monkeypatch, rows)
    seen = []
    monkeypatch.setattr(matte, "alpha_sam3",
                        lambda b: (seen.append(1), (np.zeros(b.shape[:2], np.float32), {}))[1])
    monkeypatch.setattr(matte, "coverage_of", lambda *a, **k: {"a8": 0.9})
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: _profile())

    res = matte.alpha_worker("s1", progress=False)

    assert res["frames"] == 1 and len(seen) == 1, "only the occluded row"
    assert (sdir / "mattes" / "000001.webp").exists()
    assert not (sdir / "mattes" / "000002.webp").exists()


def test_the_worker_resumes_where_it_was_killed(tmp_path, monkeypatch):
    """11.9 s a frame: a row lands the moment it is done, so a kill costs one frame, not the run."""
    pad = crop_border_px(_profile())
    _session(tmp_path, monkeypatch, _dirty_rows(pad))
    monkeypatch.setattr(matte, "alpha_sam3", lambda b: (np.zeros(b.shape[:2], np.float32), {}))
    monkeypatch.setattr(matte, "coverage_of", lambda *a, **k: {"a8": 0.9})
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: _profile())

    matte.alpha_worker("s1", progress=False)
    again = matte.alpha_worker("s1", progress=False)

    assert again["frames"] == 0 and again["already"] == 1, "the finished row is not redone"


def test_an_alpha_over_most_of_the_board_is_kept_and_says_how_big_it_is(tmp_path, monkeypatch):
    """Was SAM findet, wird geglaubt (Nutzer, 2026-09-16) — `MAX_ZONE_FRAC = 0.60` ist weg.

    Der frueher hier gepinnte Fall war echt — auf Ply 55 deckte eine Maske 97 % des Bretts und war
    eine Lichtaenderung. Er belegt die Grenze aber NICHT: sie fing ihn, weil er gross war, nicht
    weil er falsch war. Eine Fehlerkennung bei 20 % rutschte immer schon durch. Wer der Matte nur
    unter einer Flaeche traut, traut ihr nicht (Nutzer, 2026-09-16). `zone` bleibt als Zahl.
    """
    pad = crop_border_px(_profile())
    sdir = _session(tmp_path, monkeypatch, _dirty_rows(pad))
    monkeypatch.setattr(matte, "alpha_sam3", lambda b: (np.ones(b.shape[:2], np.float32), {}))
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: _profile())

    res = matte.alpha_worker("s1", progress=False)

    assert res["alphas"] == 1 and res["skipped"] == {}
    assert (sdir / "mattes" / "000001.webp").exists()
    row = json.loads((sdir / "matte.jsonl").read_text(encoding="utf-8").splitlines()[0])
    assert row["zone"] > 0.9, f"die Groesse muss in der Zeile stehen: {row.get('zone')}"


def test_the_alpha_survives_the_webp_roundtrip(tmp_path):
    """Written as 8-bit grey: a matte that comes back binarised would lose every soft edge."""
    alpha = np.linspace(0, 1, 256, dtype=np.float32).reshape(16, 16)
    path = tmp_path / "a.webp"
    cv2.imwrite(str(path), (alpha * 255).astype(np.uint8))
    back = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255.0
    assert np.abs(back - alpha).max() < 0.02


def test_the_slice_carries_the_matte_into_the_manifest(tmp_path, monkeypatch):
    """Coverage under the drop threshold reaches the row the trainer reads, and only there."""
    import json

    import yaml

    from chesslab import config
    from chesslab.labeling import read_matte, slice_session

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = tmp_path / "data" / "sessions" / "s1"
    (sdir / "frames").mkdir(parents=True)
    corners = [[20, 20], [300, 20], [300, 220], [20, 220]]
    cv2.imwrite(str(sdir / "frames" / "000001.png"), np.full((240, 320, 3), 128, np.uint8))
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    (sdir / "log.jsonl").write_text(
        json.dumps({"frame": "frames/000001.png", "fen": fen, "ply": 1, "corners": corners}) + "\n",
        encoding="utf-8")
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "s1", "profile": "p", "mode": "track"}), encoding="utf-8")
    (sdir / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "coverage": {"a8": 0.12, "h1": 0.0}}) + "\n"
        + json.dumps({"frame": "000002", "skipped": "no grid hand"}) + "\n", encoding="utf-8")

    assert read_matte(sdir) == {"000001": {"a8": 0.12, "h1": 0.0}}

    prof = replace(_profile(), profile="p", frame_size=(320, 240), board_size=128,
                   image_corners=corners,
                   homography=compute_homography(corners, 128, 0.0),
                   crop=CropParams(cell=16.0, pad_side=0.05, out_size=(32, 32)),
                   margin=0.0)
    slice_session(sdir, profile=prof, manifest_path=tmp_path / "m.jsonl",
                  squares_root=tmp_path / "squares", out_size=(32, 32))
    lines = (tmp_path / "m.jsonl").read_text(encoding="utf-8").splitlines()
    rows = {r["square"]: r for r in (json.loads(line) for line in lines)}
    assert rows["a8"]["coverage"] == 0.12
    assert rows["h1"]["coverage"] == 0.0
    assert rows["d4"]["coverage"] == 0.0, "a square the matte does not name is uncovered, not absent"


def test_a_hand_the_tracker_missed_still_takes_the_frame_out(tmp_path, monkeypatch):
    """The settle detector reacts to pieces moving; a resting arm moves none. The matte does."""
    import json

    import yaml

    from chesslab import config
    from chesslab.labeling import slice_session

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = tmp_path / "data" / "sessions" / "s1"
    (sdir / "frames").mkdir(parents=True)
    corners = [[20, 20], [300, 20], [300, 220], [20, 220]]
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    rows = []
    for stem in ("000001", "000002"):
        cv2.imwrite(str(sdir / "frames" / f"{stem}.png"), np.full((240, 320, 3), 128, np.uint8))
        rows.append({"frame": f"frames/{stem}.png", "fen": fen, "ply": 1, "corners": corners})
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "s1", "profile": "p", "mode": "track"}), encoding="utf-8")
    (sdir / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "coverage": {"a8": 0.9}}) + "\n", encoding="utf-8")

    prof = replace(_profile(), profile="p", frame_size=(320, 240), board_size=128,
                   image_corners=corners, homography=compute_homography(corners, 128, 0.0),
                   crop=CropParams(cell=16.0, pad_side=0.05, out_size=(32, 32)),
                   margin=0.0)
    res = slice_session(sdir, profile=prof, manifest_path=tmp_path / "m.jsonl",
                        squares_root=tmp_path / "squares", out_size=(32, 32))

    assert res["dirty_dropped"] == 64, "the matted frame leaves, the clean one stays"
    assert res["crops"] == 64


def test_the_export_samples_by_position_not_by_time():
    """A position that stood ten seconds and one that stood two must weigh the same."""
    from chesslab.realgames import spread_indices

    assert spread_indices(100, 200, 8) == [100, 114, 128, 142, 157, 171, 185, 199]
    assert spread_indices(0, 3, 8) == [0, 1, 2], "never more boards than frames"
    assert spread_indices(5, 6, 4) == [5]
    assert spread_indices(7, 7, 4) == []


def test_the_p8_slot_borrows_from_beside_it_when_its_own_frame_has_a_hand():
    """8 boards per position, spread — a slot the hand sits in takes the nearest clean neighbour."""
    from chesslab.realgames import pick_spread

    items = list(range(20))
    assert pick_spread(items, lambda i: True, 4) == [0, 6, 13, 19]
    assert pick_spread(items, lambda i: i % 2 == 0, 4) == [0, 6, 12, 18]
    assert pick_spread(items, lambda i: i > 15, 4) == [16, 17, 18, 19], "all four still arrive"
    assert pick_spread(items, lambda i: i == 3, 4) == [3], "never the same frame twice"
    assert pick_spread([], lambda i: True, 4) == []


def test_the_limit_is_a_target_not_a_batch(tmp_path, monkeypatch):
    """"Bring the frames to 80" on a session holding 40 means 40 more, never another 80."""
    import json

    pad = crop_border_px(_profile())
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    rows = [{"frame": f"frames/{i:06d}.png", "board": f"dirty/{i:06d}.webp", "ply": 1, "fen": fen,
             "dirty": True, "dirty_reason": "occluded", "corners": _profile().image_corners,
             "board_size": SIDE, "board_border": pad} for i in range(1, 7)]
    sdir = _session(tmp_path, monkeypatch, rows)
    monkeypatch.setattr(matte, "alpha_sam3", lambda b: (np.zeros(b.shape[:2], np.float32), {}))
    monkeypatch.setattr(matte, "coverage_of", lambda *a, **k: {"a8": 0.9})
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: _profile())

    assert matte.alpha_worker("s1", limit=2, progress=False)["alphas"] == 2
    second = matte.alpha_worker("s1", limit=4, progress=False)

    assert second["already"] == 2, "the two it already has are counted, not redone"
    assert second["alphas"] == 2, "it fills the gap to four"
    assert len(json.loads(json.dumps(
        [json.loads(x) for x in (sdir / "matte.jsonl").read_text(encoding="utf-8").splitlines()]
    ))) == 4
    assert matte.alpha_worker("s1", limit=4, progress=False)["alphas"] == 0, "asking again is free"


def test_a_re_export_does_not_let_orphan_rows_eat_the_target(tmp_path, monkeypatch):
    """Rows for frames the re-export dropped are dead weight, not progress toward `limit`."""
    import json

    pad = crop_border_px(_profile())
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    rows = [{"frame": f"frames/{i:06d}.png", "board": f"dirty/{i:06d}.webp", "ply": 1, "fen": fen,
             "dirty": True, "dirty_reason": "occluded", "corners": _profile().image_corners,
             "board_size": SIDE, "board_border": pad} for i in range(1, 5)]
    sdir = _session(tmp_path, monkeypatch, rows)
    monkeypatch.setattr(matte, "alpha_sam3", lambda b: (np.zeros(b.shape[:2], np.float32), {}))
    monkeypatch.setattr(matte, "coverage_of", lambda *a, **k: {"a8": 0.9})
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: _profile())
    # Two mattes for frames the next export no longer picks — the shape of 20-48-55 on 2026-08-19.
    (sdir / "matte.jsonl").write_text(
        "".join(json.dumps({"frame": f"{i:06d}", "coverage": {}}) + "\n" for i in (900, 901)),
        encoding="utf-8")

    res = matte.alpha_worker("s1", limit=2, progress=False)

    assert res["already"] == 0, "an orphan is not an alpha this session has"
    assert res["alphas"] == 2, "the target is filled from the frames that still exist"


def test_a_corrected_alpha_is_recut_and_sams_own_survives(tmp_path, monkeypatch):
    """The paint tool writes pixels; the numbers come from the one cut, never from the browser."""
    import json

    pad = crop_border_px(_profile())
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    rows = [{"frame": "frames/000001.png", "board": "dirty/000001.webp", "ply": 1, "fen": fen,
             "dirty": True, "dirty_reason": "occluded", "corners": _profile().image_corners,
             "board_size": SIDE, "board_border": pad}]
    sdir = _session(tmp_path, monkeypatch, rows)
    monkeypatch.setattr(matte, "alpha_sam3", lambda b: (np.zeros(b.shape[:2], np.float32), {}))
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: _profile())
    matte.alpha_worker("s1", progress=False)
    before = json.loads((sdir / "matte.jsonl").read_text(encoding="utf-8").splitlines()[0])

    side = SIDE + 2 * pad
    painted = np.zeros((side, side), np.uint8)
    painted[pad:pad + CELL, pad:pad + CELL] = 255                  # a8 von Hand zugemalt
    cv2.imwrite(str(sdir / "mattes" / f"000001{matte.FIXED_SUFFIX}"), painted)

    res = matte.recut_fixed("s1", progress=False)
    after = json.loads((sdir / "matte.jsonl").read_text(encoding="utf-8").splitlines()[0])

    assert res["recut"] == 1
    assert before["coverage"]["a8"] == 0.0 and after["coverage"]["a8"] > 0.5
    assert after["alpha"] == "fixed", "the row says which alpha it used"
    assert (sdir / "mattes" / "000001.webp").exists(), "SAM's own cut is not overwritten"


def test_a_recut_refuses_to_overwrite_the_running_worker(tmp_path, monkeypatch):
    """`recut_fixed` rewrites matte.jsonl whole while `alpha_worker` appends — one of them loses."""
    import json

    import pytest

    pad = crop_border_px(_profile())
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    rows = [{"frame": "frames/000001.png", "board": "dirty/000001.webp", "ply": 1, "fen": fen,
             "dirty": True, "dirty_reason": "occluded", "corners": _profile().image_corners,
             "board_size": SIDE, "board_border": pad}]
    sdir = _session(tmp_path, monkeypatch, rows)
    monkeypatch.setattr(matte, "alpha_sam3", lambda b: (np.zeros(b.shape[:2], np.float32), {}))
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: _profile())
    matte.alpha_worker("s1", progress=False)
    side = SIDE + 2 * pad
    cv2.imwrite(str(sdir / "mattes" / f"000001{matte.FIXED_SUFFIX}"), np.zeros((side, side), np.uint8))

    real = matte.coverage_of

    def touch_then_cut(*a, **k):
        with (sdir / "matte.jsonl").open("a", encoding="utf-8") as fh:
            fh.write(json.dumps({"frame": "000002", "coverage": {}}) + "\n")
        return real(*a, **k)

    monkeypatch.setattr(matte, "coverage_of", touch_then_cut)
    with pytest.raises(Contested, match="changed while recutting"):
        matte.recut_fixed("s1", progress=False)

    kept = (sdir / "matte.jsonl").read_text(encoding="utf-8").splitlines()
    assert len(kept) == 2, "the worker's row survives — nothing was written over it"


def test_the_status_names_orphans_and_gaps(tmp_path, monkeypatch):
    """Ein Re-Export aendert die Frame-Auswahl, `matte.jsonl` wird nur angehaengt.

    Gemessen 2026-09-14 ueber den Korpus: 2 975 Matten-Zeilen ohne Log-Zeile und 2 497 dirty-Frames
    ohne Matte — und niemand gleicht die beiden ab. Eine Luecke ist dabei die teurere Haelfte:
    ein Crop ohne Matte bekommt Coverage 0 und sieht aus wie ein nachweislich freies Feld.
    """
    import json

    pad = crop_border_px(_profile())
    sdir = _session(tmp_path, monkeypatch, _dirty_rows(pad))
    (sdir / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "coverage": {"a8": 0.5}}) + "\n"
        + json.dumps({"frame": "009999", "coverage": {"a8": 0.5}}) + "\n", encoding="utf-8")

    res = matte.matte_status("s1")

    assert res["orphans"] == ["009999"], f"eine Matte ohne Log-Zeile muss auffallen: {res}"
    # Gemeldet wird er weiterhin — seit 2026-09-16 im ehrlichen Eimer: den `stale`-Frame holt
    # kein Standardlauf (`--reason occluded`), nur `--reason all`.
    assert res["missing_other"] == ["000002"], f"auch ein `stale`-Frame braucht seine Matte: {res}"
    assert res["missing"] == [], f"der Standardstapel ist vollstaendig: {res}"


def test_an_unusable_frame_is_neither_matted_nor_counted_as_due(tmp_path, monkeypatch):
    """`slice` ueberspringt markierte Frames, SAM lief bisher trotzdem darueber.

    Die Markierung ist der Weg fuer das, was keine gueltige Stellung hergibt — umgefallene Figur,
    Katze im Bild. Ohne sie hier kostet sie Rechenzeit und liefert eine Coverage, die niemand will.
    """
    import json

    pad = crop_border_px(_profile())
    rows = _dirty_rows(pad)
    rows[0]["unusable"] = True
    sdir = _session(tmp_path, monkeypatch, rows)
    monkeypatch.setattr(matte, "alpha_sam3", lambda b: (np.zeros(b.shape[:2], np.float32), {}))
    monkeypatch.setattr(matte, "coverage_of", lambda *a, **k: {"a8": 0.9})
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: _profile())

    matte.alpha_worker("s1", reason="all", progress=False)

    matted = {str(json.loads(line).get("frame"))
              for line in (sdir / "matte.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()}
    assert "000001" not in matted, f"ein als unbrauchbar markierter Frame wurde gemattet: {matted}"
    assert matte.matte_status("s1")["missing"] == [], "und er darf nicht als Luecke gelten"
