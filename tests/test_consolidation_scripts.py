"""Skripte, die eine Kopie gegen EINE Implementierung getauscht haben: Verhalten und Herkunft."""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

from conftest import load_script, write_jsonl

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

SWEEP_SHARED = ("Log", "px_per_square", "_counts", "phantoms_at_miss_target",
                "misses_phantom_free", "load_torch_run", "install_at_size", "frames_for_split")


def _defined_in(obj, script: str) -> bool:
    code = getattr(obj, "__code__", None) or obj.__init__.__code__
    return Path(code.co_filename).name == f"{script}.py"


# --- sweep_infer_size / sweep_warp_resolution / adabn_recalibrate ------------------------------

@pytest.fixture(scope="module", params=["sweep_infer_size", "sweep_warp_resolution"])
def sweep(request):
    return load_script(request.param)


def test_sweep_counts_misses_and_phantoms(sweep):
    trues = np.array([True, True, False, False])
    preds = np.array([False, True, True, False])
    assert sweep._counts(trues, preds) == (1, 1)


def test_sweep_misses_phantom_free_sits_just_above_the_loudest_empty(sweep):
    trues = np.array([True, True, False, False])
    probs = np.array([0.9, 0.3, 0.1, 0.4])
    misses, t = sweep.misses_phantom_free(trues, probs)
    assert misses == 1 and t == pytest.approx(0.4 + 1e-6)


def test_sweep_phantoms_at_a_binding_budget(sweep):
    trues = np.array([True, True, True, False, False])
    probs = np.array([0.9, 0.5, 0.2, 0.6, 0.1])
    assert sweep.phantoms_at_miss_target(trues, probs, target=1) == (1, 1, 0.5)


def test_sweep_counts_phantoms_when_no_cell_is_occupied(sweep):
    """Die Kopie in `sweep_infer_size` meldete hier 0 Phantome — der Zwilling zaehlt sie."""
    trues = np.array([False, False, False])
    probs = np.array([0.1, 0.5, 0.9])
    phantoms, misses, t = sweep.phantoms_at_miss_target(trues, probs, target=5)
    assert (phantoms, misses, t) == (3, 0, 0.0)


def test_sweep_frames_keep_manifest_order_and_group_labels(sweep):
    rows = [{"session_id": "s", "frame": 2, "square": "a1", "label": "wR"},
            {"session_id": "s", "frame": 1, "square": "a1", "label": "empty"},
            {"session_id": "s", "frame": 2, "square": "b1", "label": "wN"}]
    assert sweep.frames_for_split(rows) == [("s", "2", {"a1": "wR", "b1": "wN"}),
                                            ("s", "1", {"a1": "empty"})]


def test_sweep_install_at_size_seeds_both_size_keys(sweep, tmp_path, monkeypatch):
    from chesslab import serving

    monkeypatch.setattr(serving, "_CACHE", {})
    cfg = sweep.install_at_size(tmp_path, "model", {"out_size": [80, 80], "x": 1}, 96)
    assert cfg == {"out_size": [96, 96], "infer_size": [96, 96], "x": 1}
    assert serving._CACHE[str(tmp_path.resolve())] == ("model", cfg)


def test_sweep_px_per_square_reads_the_first_logged_quad(sweep, tmp_path, monkeypatch):
    write_jsonl(tmp_path / "log.jsonl", [{"corners": [[0, 0], [80, 0], [80, 80], [0, 80]]},
                                         {"corners": [[0, 0], [8, 0], [8, 8], [0, 8]]}])
    monkeypatch.setattr(sweep.store_paths, "session_dir", lambda sid: (tmp_path, None))
    assert sweep.px_per_square("s") == pytest.approx(10.0)


def test_sweep_log_tees_to_stdout_and_file(sweep, tmp_path, capsys):
    log = sweep.Log(tmp_path / "sub" / "x.log")
    log("eins")
    log.close()
    assert capsys.readouterr().out == "eins\n"
    assert (tmp_path / "sub" / "x.log").read_text(encoding="utf-8") == "eins\n"


def test_sweep_warp_takes_its_helpers_from_sweep_infer_size():
    warp = load_script("sweep_warp_resolution")
    assert all(_defined_in(getattr(warp, name), "sweep_infer_size") for name in SWEEP_SHARED)


@pytest.mark.parametrize("script", ["adabn_recalibrate", "sweep_warp_resolution"])
def test_profile_at_warp_rederives_cell_and_homography(script):
    from chesslab import calibration
    from conftest import make_profile

    prof = make_profile(800)
    warped = load_script(script).profile_at_warp(prof, 1600)
    assert (warped.board_size, warped.crop.cell) == (1600, 200.0)
    assert np.allclose(warped.homography, calibration.compute_homography(
        prof.image_corners, 1600, prof.margin))
    assert prof.board_size == 800


def test_adabn_takes_profile_at_warp_from_sweep_warp_resolution():
    adabn = load_script("adabn_recalibrate")
    assert _defined_in(adabn.profile_at_warp, "sweep_warp_resolution")


# --- matte.jsonl -> Frame -> Feld -> Coverage: `labeling.read_matte` --------------------------

def _refused_after_measure(sess: Path) -> None:
    write_jsonl(sess / "matte.jsonl", [
        {"frame": "000100", "coverage": {"e4": 0.9}},
        {"frame": "000100", "skipped": "zone too big"},
        {"frame": "000200", "coverage": {"e4": 0.0}},
    ])


def test_coverage_errors_drops_a_measurement_sam_withdrew(tmp_path, monkeypatch, capsys):
    """Die Kopie liess die aeltere Messung stehen; `read_matte` laesst die juengere Absage gelten."""
    ce = load_script("coverage_errors")
    monkeypatch.setattr(ce, "ROOT", tmp_path)
    _refused_after_measure(tmp_path / "s1")
    write_jsonl(tmp_path / "s1" / "reads.jsonl", [
        {"frame": f, "square": "e4", "model_cov": 0.0} for f in ("000100", "000200")])
    monkeypatch.setattr(sys, "argv", ["coverage_errors", "reads.jsonl", "s1"])

    ce.main()
    assert "1 Frames mit Matte" in capsys.readouterr().out


@pytest.mark.parametrize(("script", "name"), [("coverage_errors", "main"),
                                              ("occlusion_gate", "collect"),
                                              ("heldout_label_audit", "Session")])
def test_matte_readers_use_the_store_read_matte(script, name):
    from chesslab.session_store.matte import read_matte

    mod = load_script(script)
    fn = getattr(mod, name)
    code = (fn.__init__ if isinstance(fn, type) else fn).__code__
    assert "read_matte" in code.co_names or "coverage_of" in code.co_names
    assert read_matte in (getattr(mod, "read_matte", None), getattr(mod, "coverage_of", None))


# --- FEN -> {Feld: Klasse}: EIN `board_of` in `scan_ply_offset` -------------------------------

@pytest.mark.parametrize("script", ["scan_ply_offset", "fix_ply_offset", "check_setup_video"])
def test_board_of_reads_the_placement_in_manifest_spelling(script):
    board = load_script(script).board_of("k7/8/8/8/8/8/8/6NK w - - 0 1")
    assert list(board)[:2] == ["a8", "b8"] and len(board) == 64
    assert (board["a8"], board["g1"], board["h1"], board["e4"]) == ("bK", "wN", "wK", "empty")


@pytest.mark.parametrize("script", ["fix_ply_offset", "check_setup_video"])
def test_board_of_comes_from_scan_ply_offset(script):
    assert _defined_in(load_script(script).board_of, "scan_ply_offset")


# --- Brettbild eines Frames: `dirty/` vor `boards/`, EIN `board_path` in `matte_audit` ---------

@pytest.mark.parametrize("script", ["matte_audit", "matte_audit_montage"])
def test_board_path_prefers_the_dirty_pile(script, tmp_path):
    board_path = load_script(script).board_path
    for sub in ("boards", "dirty"):
        (tmp_path / sub).mkdir()
        (tmp_path / sub / "000100.webp").write_bytes(b"")
    (tmp_path / "boards" / "000200.webp").write_bytes(b"")
    assert board_path(tmp_path, "000100") == tmp_path / "dirty" / "000100.webp"
    assert board_path(tmp_path, "000200") == tmp_path / "boards" / "000200.webp"
    assert board_path(tmp_path, "000300") is None


def test_montage_takes_board_path_from_matte_audit():
    assert _defined_in(load_script("matte_audit_montage").board_path, "matte_audit")


# --- Berichte ueber `ioutil.write_rows`: dieselben Bytes wie der fruehere `write_text` ---------

def _old_bytes(rows: list[dict]) -> bytes:
    import json
    import os

    return "".join(json.dumps(r) + os.linesep for r in rows).encode("utf-8")


def test_mine_hard_coverage_report_bytes(tmp_path, monkeypatch):
    mine = load_script("mine_hard_coverage")
    dd = tmp_path / "ds"
    write_jsonl(dd / "manifest.jsonl", [
        {"path": p, "session_id": "s", "frame": "f", "square": sq, "label": "wP", "coverage": c}
        for p, sq, c in (("a.webp", "e4", 0.0), ("b.webp", "e5", 0.9))])
    monkeypatch.setattr(mine, "dataset_dir", lambda name: dd)
    monkeypatch.setattr(mine, "open_packed_rows", lambda *a, **k: (
        np.zeros((2, 4, 4, 3), np.uint8), {"a.webp": 0, "b.webp": 1}))
    monkeypatch.setattr(mine.occluded_model, "all_reads",
                        lambda run, cells: [{"coverage": v} for v in (0.9, 0.0)][:len(cells)])
    out = tmp_path / "rep" / "o.jsonl"
    monkeypatch.setattr(sys, "argv", ["mine", "--dataset", "ds", "--out", str(out)])

    mine.main()
    assert out.read_bytes() == _old_bytes([
        {"path": p, "session_id": "s", "frame": "f", "square": sq, "label": "wP", "kind": k,
         "true_cov": t, "pred_cov": pc}
        for p, sq, k, t, pc in (("a.webp", "e4", "phantom", 0.0, 0.9),
                                ("b.webp", "e5", "uebersehen", 0.9, 0.0))])


def test_scan_ply_offset_report_bytes(tmp_path, monkeypatch):
    scan = load_script("scan_ply_offset")
    dd = tmp_path / "ds"
    squares = [f"{c}{r}" for r in "12345678" for c in "abcdefgh"]
    rows = [{"path": f"{fr}-{sq}", "session_id": "s", "frame": fr, "ply": ply, "fen": fen,
             "square": sq, "coverage": cov}
            for fr, ply, fen, cov in (("f0", 0, "8/8/8/8/8/8/8/8 w - - 0 1", 1.0),
                                      ("f1", 1, "8/8/8/8/8/8/8/KQRBNBRQ w - - 0 1", 0.0))
            for sq in squares]
    write_jsonl(dd / "manifest.jsonl", rows)
    monkeypatch.setattr(scan, "dataset_dir", lambda _n: dd)
    monkeypatch.setattr(scan, "open_packed_rows", lambda *a, **k: (
        np.zeros((len(rows), 1, 1, 3), np.uint8), {r["path"]: i for i, r in enumerate(rows)}))
    monkeypatch.setattr(scan.occluded_model, "all_reads",
                        lambda _run, cells: [{"pred_label": "empty"}] * len(cells))
    out = tmp_path / "rep" / "ply.jsonl"
    monkeypatch.setattr(sys, "argv", ["scan_ply_offset", "ds", "--out", str(out)])

    scan.main()
    assert out.read_bytes() == _old_bytes([
        {"session_id": "s", "frame": "f1", "ply": 1, "better_at": 0,
         "match_own": 56, "match_better": 64, "visible": 64}])


# --- Randmasse einer Aufmerksamkeitskarte: EIN `edge_mass` in `gradcam_summary` ----------------

@pytest.mark.parametrize("script", ["gradcam_summary", "occlusion_sensitivity"])
def test_edge_mass_is_the_share_outside_the_inner_window(script):
    edge_mass = load_script(script).edge_mass
    ring = np.ones((20, 20))
    ring[3:17, 3:17] = 0.0
    assert edge_mass(ring) == pytest.approx(1.0)
    assert edge_mass(np.ones((20, 20))) == pytest.approx(1 - 14 * 14 / 400)
    assert edge_mass(np.zeros((20, 20))) == 1.0


def test_occlusion_sensitivity_takes_edge_mass_from_gradcam_summary():
    assert _defined_in(load_script("occlusion_sensitivity").edge_mass, "gradcam_summary")


# --- orthogonale Nachbarn eines Feldes: EIN `neighbours` in `coverage_errors` -----------------

@pytest.mark.parametrize("script", ["coverage_errors", "hand_audit"])
def test_neighbours_are_orthogonal_and_stay_on_the_board(script):
    neighbours = load_script(script).neighbours
    assert neighbours("e4") == ["f4", "d4", "e5", "e3"]
    assert neighbours("a1") == ["b1", "a2"]
    assert neighbours("h8") == ["g8", "h7"]


def test_hand_audit_takes_neighbours_from_coverage_errors():
    assert _defined_in(load_script("hand_audit").neighbours, "coverage_errors")


def test_hand_audit_classify_flags_a_hand_body_next_door():
    classify = load_script("hand_audit").classify
    row = {"coverage": {"e5": 0.9, "f5": 0.9}}
    assert classify(row, "occluded", 0.0, "e4") == "nachbar"
    assert classify(row, "occluded", 0.0, "f4") == "nachbar"
    assert classify(row, "occluded", 0.0, "d4") is None


# --- compare_arms / thin_arms_report: EIN Schwanzmittel -----------------------------------------

@pytest.fixture(params=["compare_arms", "thin_arms_report"])
def arms(request):
    return load_script(request.param)


def test_tail_mean_takes_the_last_values_not_the_last_rows(arms, tmp_path):
    rows = [{"epoch": 0, "val_loss": 1.0}, {"epoch": 1, "val_loss": 0.8},
            {"epoch": 2}, {"epoch": 3, "val_loss": 0.6}]
    run = tmp_path / "a-s42"
    write_jsonl(run / "metrics.jsonl", rows)
    assert arms.tail_mean(run, "val_loss", 2, 4) == pytest.approx(0.7)
    assert arms.tail_mean(run, "val_loss", 4, 4) is None, "weniger Werte als der Schwanz: kein Urteil"


def test_compare_arms_takes_tail_mean_from_thin_arms_report():
    assert _defined_in(load_script("compare_arms").tail_mean, "thin_arms_report")
