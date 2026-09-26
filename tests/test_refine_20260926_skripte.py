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
