"""Skripte laden das Profil einer Aufnahme ueber `session_profile`: Rauchtests ueber den echten Weg,
mit echter `session.yaml` und echtem Profil statt gepatchter Leser.
"""
from __future__ import annotations

import sys
import types

import numpy as np
import pytest

from conftest import identity_corners, load_script, make_profile, write_jsonl, write_session


def _session(tmp_path, monkeypatch, *, board_size: int = 64, white_pov: bool = True):
    from chesslab import calibration, config

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    prof = make_profile(board_size, profile="t", camera_index=-1, white_pov=white_pov)
    prof.save(calibration.profile_path("t"))
    image = np.random.default_rng(0).integers(0, 255, (board_size, board_size, 3), dtype=np.uint8)
    sdir = write_session(config.DATA.recordings / "s1",
                         [{"frame": "frames/000001.png", "corners": identity_corners(board_size),
                           "ply": 0}], profile=prof, image=image, boards=False)
    return sdir, prof, image


def test_adabn_schneidet_mit_dem_profil_der_aufnahme(tmp_path, monkeypatch):
    import torch

    from chesslab import labeling

    _, prof, image = _session(tmp_path, monkeypatch)
    mod = load_script("adabn_recalibrate")
    (batch,) = list(mod.crop_batches({}, [("rg-s1", "000001")], 16, None, 64))
    want = labeling.crops_for_frame(image, identity_corners(64), prof, out_size=(16, 16))
    assert torch.equal(batch, mod.to_batch({}, want))


def test_adabn_verweigert_eine_aufnahme_ohne_session_yaml(tmp_path, monkeypatch):
    sdir, _, _ = _session(tmp_path, monkeypatch)
    (sdir / "session.yaml").unlink()
    mod = load_script("adabn_recalibrate")
    with pytest.raises(FileNotFoundError):
        list(mod.crop_batches({}, [("rg-s1", "000001")], 16, None, 64))


def _spy_crops(monkeypatch):
    from chesslab import labeling

    seen, real = [], labeling.crops_for_frame

    def spy(frame, corners, profile, *, out_size):
        seen.append((profile.profile, profile.board_size))
        return real(frame, corners, profile, out_size=out_size)

    monkeypatch.setattr(labeling, "crops_for_frame", spy)
    return seen


def test_sweep_infer_size_schneidet_mit_dem_profil_der_aufnahme(tmp_path, monkeypatch):
    from chesslab import serving

    _session(tmp_path, monkeypatch)
    seen = _spy_crops(monkeypatch)
    mod = load_script("sweep_infer_size")
    monkeypatch.setattr(serving, "run_spec", lambda _d: types.SimpleNamespace(pad_side=None))
    monkeypatch.setattr(serving, "predict_arrays",
                        lambda _d, crops, **_k: [{"probs": [0.2, 0.8]} for _ in crops])
    monkeypatch.setattr(mod, "install_at_size", lambda *_a: {"classes": ["empty", "wP"]})
    rows = [{"session_id": "rg-s1", "frame": "000001", "square": "a1", "label": "wP"}]
    got = mod.sweep_path_a({"r": (tmp_path, None, {})}, rows, (16,), "cpu", lambda _m: None)
    assert seen == [("t", 64)]
    truth, pred, _ = got[("r", 16)]
    assert truth.tolist() == [True] and pred.tolist() == [True]


def test_sweep_warp_resolution_schneidet_mit_dem_profil_der_aufnahme(tmp_path, monkeypatch):
    from chesslab import serving

    _session(tmp_path, monkeypatch)
    seen = _spy_crops(monkeypatch)
    mod = load_script("sweep_warp_resolution")
    monkeypatch.setattr(serving, "predict_arrays", lambda _d, crops, **_k: [
        {"pred_label": "occupied", "probs": [0.1, 0.9]} for _ in crops])
    monkeypatch.setattr(mod, "install_at_size", lambda *_a: {"classes": ["empty", "occupied"]})
    rows = [{"session_id": "rg-s1", "frame": "000001", "square": "a1", "label": "wP"}]
    got = mod.sweep({"r": (tmp_path, None, {})}, rows, (64, 128), (16,), "cpu", None,
                    lambda _m: None)
    assert seen == [("t", 64), ("t", 128)]
    assert got[("r", 128, 16)][1].tolist() == [True]


def test_matte_audit_liest_die_seite_aus_dem_profil_der_aufnahme(tmp_path, monkeypatch, capsys):
    sdir, _, _ = _session(tmp_path, monkeypatch, white_pov=False)
    mod = load_script("matte_audit")
    write_jsonl(sdir / "matte.jsonl", [{"frame": "000001", "dirty_reason": "occluded"}])
    (sdir / "boards").mkdir()
    (sdir / "boards" / "000001.webp").write_bytes(b"")
    write_jsonl(sdir / "log.jsonl", [{"frame": "frames/000001.png", "board": "boards/000001.webp",
                                      "board_size": 64, "board_border": 0}])
    pov = []
    monkeypatch.setattr(mod, "usable_board", lambda _e, p: p.profile == "t")
    monkeypatch.setattr(mod, "cv2", types.SimpleNamespace(
        COLOR_BGR2GRAY=0, imread=lambda _p: None, cvtColor=lambda *_a: np.zeros((8, 8), np.uint8)))
    monkeypatch.setattr(mod, "missing_edges", lambda *_a, white_pov, **_k: pov.append(white_pov))
    monkeypatch.setattr(mod, "hand_squares", lambda _e: set())
    monkeypatch.setattr(sys, "argv", ["matte_audit", "--recordings", str(sdir.parent),
                                      "--out", str(tmp_path / "out.jsonl")])
    assert mod.main() == 0
    assert pov == [False]
    assert "ohne Profil" not in capsys.readouterr().out


# --- Runde 2: die uebrigen Profil- und Logleser ---------------------------------------------------

def _boards(tmp_path, monkeypatch, fens, *, white_pov=True):
    """Eine Aufnahme mit gespeicherten Brettern, je FEN ein Frame, alle im selben Ply."""
    from chesslab import calibration, config

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    prof = make_profile(64, profile="t", camera_index=-1, white_pov=white_pov)
    prof.save(calibration.profile_path("t"))
    image = np.random.default_rng(1).integers(0, 255, (64, 64, 3), dtype=np.uint8)
    rows = [{"frame": f"frames/{i + 1:06d}.png", "corners": identity_corners(64), "ply": 0,
             "fen": fen} for i, fen in enumerate(fens)]
    return write_session(config.DATA.recordings / "s1", rows, profile=prof, image=image), prof


def test_check_alignment_fix_schreibt_die_ecken_ueber_den_log(tmp_path, monkeypatch):
    sdir, _, _ = _session(tmp_path, monkeypatch)
    mod = load_script("check_alignment")
    better = [[1, 1], [63, 1], [63, 63], [1, 63]]
    monkeypatch.setattr(mod, "frame_offsets",
                        lambda _f, q, prof: ({"a1": 1.0 if q == better else 10.0}, 0))
    monkeypatch.setattr(mod, "correct_quad", lambda _f, _q, prof: better)
    monkeypatch.setattr(sys, "argv", ["ca", "--session", "rg-s1", "--fix"])
    try:
        mod.main()
    except SystemExit as exc:
        assert not exc.code
    from chesslab.ioutil import read_jsonl

    (row,) = read_jsonl(sdir / "log.jsonl")
    assert row["corners"] == better and row["corners_source"] == "auto-corrected"
    assert list(sdir.glob("log.jsonl.bak*"))


def test_matte_cell_audit_liest_die_seite_aus_dem_profil_der_aufnahme(tmp_path, monkeypatch):
    sdir, _ = _boards(tmp_path, monkeypatch, ["8/8/8/8/8/8/8/8 w - - 0 1"], white_pov=False)
    from chesslab.ioutil import read_jsonl, write_rows

    rows = read_jsonl(sdir / "log.jsonl")
    write_rows(sdir / "log.jsonl", [{**r, "board_straightened": True} for r in rows])
    write_jsonl(sdir / "matte.jsonl", [{"frame": "000001", "coverage": {"e4": 0.0}}])
    mod = load_script("matte_cell_audit")
    pov = []
    monkeypatch.setattr(mod, "missing_edges", lambda *_a, white_pov, **_k: pov.append(white_pov))
    monkeypatch.setattr(mod, "hand_squares", lambda _e: {"e4"})
    out = tmp_path / "out.jsonl"
    monkeypatch.setattr(sys, "argv", ["mca", "--recordings", str(sdir.parent), "--out", str(out)])
    assert mod.main() == 0
    assert pov == [False]
    assert [r["missed"] for r in read_jsonl(out)] == [["e4"]]


def test_sensor_montage_zeichnet_beide_pools(tmp_path, monkeypatch):
    from PIL import ImageFont

    fen = "8/8/8/8/8/8/8/4K3 w - - 0 1"
    sdir, _ = _boards(tmp_path, monkeypatch, [fen, fen, fen])
    audit = write_jsonl(tmp_path / "audit.jsonl", [
        {"session": "s1", "frame": "000001", "square": "e1", "group": "neither",
         "temporal_normalized": 0.5, "reference_stock": "boards", "reference_peers": 2},
        {"session": "s1", "frame": "000002", "square": "e1", "group": "neither",
         "temporal_normalized": 0.1, "reference_stock": "boards", "reference_peers": 2}])
    font = ImageFont.load_default()
    monkeypatch.setattr(ImageFont, "truetype", lambda *_a, **_k: font)
    mod = load_script("sensor_montage")
    monkeypatch.setattr(sys, "argv", ["sm", "--audit", str(audit), "--session", "rg-s1",
                                      "--out", str(tmp_path / "o")])
    assert mod.main() == 0
    import json

    pools = json.loads((tmp_path / "o" / "selection.json").read_text(encoding="utf-8"))["pools"]
    assert [c["frame"] for c in pools["suspects"]] == ["000001"]
    assert [c["frame"] for c in pools["controls"]] == ["000002"]


def test_coverage_arms_misst_ueber_die_gespeicherten_bretter(tmp_path, monkeypatch):
    sdir, _ = _boards(tmp_path, monkeypatch, ["8/8/8/8/8/8/8/8 w - - 0 1"])
    write_jsonl(sdir / "matte.jsonl", [{"frame": "000001", "coverage": {"e4": 0.9}}])
    mod = load_script("coverage_arms")
    from chesslab import occluded_model

    shapes = []
    monkeypatch.setattr(occluded_model, "all_reads", lambda _run, cells: shapes.append(
        {c.shape for c in cells}) or [{"coverage": 0.5} for _ in cells])
    monkeypatch.chdir(tmp_path)
    (tmp_path / "data" / "reports").mkdir(parents=True)
    monkeypatch.setattr(sys, "argv", ["ca", "--session", "rg-s1", "--no-gate", "--run", "r"])
    mod.main()
    import json

    report = json.loads((tmp_path / "data/reports/coverage-arms.json").read_text(encoding="utf-8"))
    assert report["cells"] == 64 and max(report["truth"]) == 0.9
    assert len(shapes) == 1 and len(shapes[0]) == 1


def test_board_grid_probe_legt_das_raster_auf_die_bretter(tmp_path, monkeypatch, capsys):
    from chesslab.ioutil import read_jsonl, write_rows

    sdir, _ = _boards(tmp_path, monkeypatch, ["8/8/8/8/8/8/8/8 w - - 0 1"])
    rows = read_jsonl(sdir / "log.jsonl")
    write_rows(sdir / "log.jsonl", [{**r, "grid_lines": [1], "align_worst_px": 2.5} for r in rows])
    mod = load_script("board_grid_probe")
    monkeypatch.setattr(mod, "REC", sdir.parent)
    out = tmp_path / "a.png"
    monkeypatch.setattr(sys, "argv", ["bgp", "--out", str(out)])
    assert mod.main() == 0
    assert out.is_file() and "[OK] 1 Aufnahmen" in capsys.readouterr().out


def test_board_grid_probe_uebergeht_einen_abgebrochenen_export(tmp_path, monkeypatch, capsys):
    sdir, _ = _boards(tmp_path, monkeypatch, ["8/8/8/8/8/8/8/8 w - - 0 1"])
    (sdir / ".export-running").write_text("", encoding="utf-8")
    mod = load_script("board_grid_probe")
    monkeypatch.setattr(mod, "REC", sdir.parent)
    monkeypatch.setattr(sys, "argv", ["bgp", "--out", str(tmp_path / "a.png")])
    assert mod.main() == 1
    assert "s1: uebersprungen" in capsys.readouterr().out


# --- Ein Leser fuer "was hat ein Mensch in dieser Aufnahme schon entschieden" ----------------------

def _judged_recording(tmp_path):
    rec = tmp_path / "recordings" / "s1"
    write_jsonl(rec / "reviewed.jsonl", [{"session_id": "rg-s1", "frame": "000001", "square": "e2"}])
    write_jsonl(rec / "corrections.jsonl",
                [{"session_id": "rg-s1", "frame": "000002", "square": "e4", "label": "wP"}])
    write_jsonl(rec / "matte.jsonl", [{"frame": "000001", "coverage": {"e2": 0.0}}])
    write_jsonl(rec / "log.jsonl", [{"frame": "frames/000001.png", "ply": 0, "fen": "8/8/8/8/8/8/8/8"},
                                    {"frame": "frames/000002.png", "ply": 1, "fen": "8/8/8/8/8/8/8/8"}])
    write_jsonl(rec / "interval-check.jsonl", [{"ply": 1, "moved": ["e2", "e4"], "seen": False}])
    return rec


@pytest.mark.parametrize("script", ["hand_audit", "move_timing_audit"])
def test_audits_kennen_beide_ledger(script, tmp_path, monkeypatch):
    rec = _judged_recording(tmp_path)
    mod = load_script(script)
    monkeypatch.setattr(mod, "REC", rec.parent)
    facts = mod.session_facts("rg-s1", *([1] if script == "move_timing_audit" else []))
    assert facts["human"] == {("000001", "e2"), ("000002", "e4")}


def test_move_timing_audit_liest_log_und_intervalle(tmp_path, monkeypatch):
    rec = _judged_recording(tmp_path)
    mod = load_script("move_timing_audit")
    monkeypatch.setattr(mod, "REC", rec.parent)
    facts = mod.session_facts("rg-s1", 1)
    assert facts["risky"] == {"000001": {"e2", "e4"}, "000002": {"e2", "e4"}}
    assert (facts["moves"], facts["unseen"]) == (1, 1)


def test_heldout_session_kennt_beide_ledger(tmp_path):
    rec = _judged_recording(tmp_path)
    mod = load_script("heldout_label_audit")
    session = mod.Session(rec)
    assert session.judged == {("000001", "e2"), ("000002", "e4")}
    assert session.ply == {"000001": 0, "000002": 1}
