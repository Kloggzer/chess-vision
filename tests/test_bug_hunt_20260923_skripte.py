"""Bug-Hunt: die bis dahin unberuehrten Skripte, nach Entscheidungsgewicht."""

from __future__ import annotations

import dataclasses
import json
import sys
import types
from pathlib import Path

import numpy as np
import pytest

from conftest import load_script, write_jsonl

ROOT = Path(__file__).resolve().parents[1]


# --- profile_training_kernels: die Rezeptzahl kommt aus dem Lauf, und der Anfang wird wiederholt --

def test_profile_kernels_fits_its_own_line_and_repeats_the_first_arm():
    mod = load_script("profile_training_kernels")
    # `tmp/compile-spike/kernels-new.json`, die Quelle von "59 %" und "2 611 Aufrufe".
    scaling = [{"crops": c, "ms_per_step": m} for c, m in
               ((64, 14.038), (128, 15.254), (256, 20.073), (512, 32.742), (1024, 46.171))]
    fit = mod.line_fit([*scaling, {"crops": 64, "ms_per_step": 30.0, "repeat": True}])
    assert fit["fixed_ms"] == pytest.approx(11.90, abs=0.01)
    assert fit["per_crop_us"] == pytest.approx(34.67, abs=0.01)   # nicht die zitierten 33,5
    assert mod.SIZES[-1] == mod.SIZES[0]
    assert mod.VARIANTS[-1] == f"{mod.VARIANTS[0]}-repeat"


# --- profile_training_gpu: `--fixture` ersetzt den Datensatz, statt ihn trotzdem zu lesen ---------

def test_profile_gpu_fixture_needs_no_dataset():
    torch = pytest.importorskip("torch")
    mod = load_script("profile_training_gpu")
    x, y = torch.zeros((4, 64, 3, 8, 8)), torch.zeros((256, 3))
    cfg = {"dataset": "gibt-es-nicht", "split": {"splits": {"train": []}}}
    got_x, got_y = mod.resident_batch(cfg, {"x": x, "y": y})
    assert got_x is x and got_y is y


# --- audit_disk_damage: nur die JUENGSTE Matte-Zeile gehoert zum Alpha auf der Platte -------------

def _disk_damage_env(tmp_path, monkeypatch, matte_rows):
    import cv2

    import chesslab.calibration as calibration
    import chesslab.labeling as labeling
    import chesslab.matte as matte

    mod = load_script("audit_disk_damage")
    monkeypatch.setattr(mod.config, "DATA", dataclasses.replace(mod.config.DATA, root=tmp_path))
    sdir = tmp_path / "recordings" / "s"
    write_jsonl(sdir / "matte.jsonl", matte_rows)
    (sdir / "mattes").mkdir(parents=True)
    cv2.imwrite(str(sdir / "mattes" / "f1.png"), np.zeros((4, 4), np.uint8))
    (sdir / "mattes" / "f1.png").rename(sdir / "mattes" / "f1.webp")
    monkeypatch.setattr(calibration, "load_profile", lambda _n: object())
    monkeypatch.setattr("chesslab.session_store.paths.read_session_meta", lambda _d: {"profile": "p"})
    monkeypatch.setattr("chesslab.session_store.log.read_log_rows", lambda _d: [{"board": "boards/f1.webp"}])
    monkeypatch.setattr(labeling, "usable_board", lambda _e, _p: True)
    monkeypatch.setattr(matte, "coverage_of", lambda _a, _e, _p: {"e4": 0.0})
    return mod


def test_disk_damage_ignores_a_superseded_matte_row(tmp_path, monkeypatch):
    """1 936 von 10 490 Zeilen sind ueberholt; gegen das heutige Alpha weichen 206 von 1 831 ab."""
    mod = _disk_damage_env(tmp_path, monkeypatch, [
        {"frame": "f1", "coverage": {"e4": 0.9}},       # ueberholt
        {"frame": "f1", "coverage": {"e4": 0.0}},       # gehoert zum Alpha
    ])
    assert mod.coverage_disagrees_with_its_alpha() == []


def test_disk_damage_a_later_refusal_takes_the_frame_out(tmp_path, monkeypatch):
    mod = _disk_damage_env(tmp_path, monkeypatch, [
        {"frame": "f1", "coverage": {"e4": 0.9}},
        {"frame": "f1", "coverage": None, "skipped": "zone too big"},
    ])
    assert mod.coverage_disagrees_with_its_alpha() == []


# --- gradcam_summary: `Path.exists` warf jede `mm://`-Zeile weg und meldete Erfolg ----------------

def test_gradcam_summary_refuses_packed_rows(tmp_path, monkeypatch):
    mod = load_script("gradcam_summary")
    dd = tmp_path / "ds"
    dd.mkdir()
    (dd / "split.json").write_text(json.dumps({"splits": {"val": ["s1"]}}), encoding="utf-8")
    write_jsonl(dd / "manifest.jsonl", [{"path": f"mm://s1-80/000001/{sq}", "label": "wP",
                                    "session_id": "s1"} for sq in ("a1", "b1")])
    monkeypatch.setattr(mod, "dataset_dir", lambda _n: dd)
    monkeypatch.setattr(mod, "collect",
                        lambda run, rows, size, n: (np.zeros((size, size)), float("nan"), {}, [], []))
    monkeypatch.setattr(sys, "argv", ["gradcam_summary", str(tmp_path / "run"), "--dataset", "ds",
                                      "--out", str(tmp_path / "out")])
    with pytest.raises(SystemExit) as exc:
        mod.main()
    assert "mm://" in str(exc.value)


# --- settle_lag: ein Ply, das nie ruhig wird, fiel still aus dem Median ---------------------------

def test_settle_lag_names_plies_that_never_settle(tmp_path, monkeypatch, capsys):
    mod = load_script("settle_lag")
    monkeypatch.setattr(mod, "ROOT", tmp_path)
    rec = tmp_path / "data" / "recordings" / "r"
    rec.mkdir(parents=True)
    (rec / "candidate.json").write_text(json.dumps({
        "clock": {"fps": 30},
        "moves": [{"frame": 0, "ply": 1, "san": "e4", "held": 1},
                  {"frame": 10, "ply": 2, "san": "e5", "held": 1}]}), encoding="utf-8")
    dump = tmp_path / "dump.csv"
    dump.write_text("frame,motion\n" + "".join(f"{i},0.0\n" for i in range(20)), encoding="utf-8")
    states = ["moving"] * 5 + ["waiting"] * 5 + ["moving"] * 10
    Path(f"{dump}.status.csv").write_text(
        "index,frame,state,motion,stuck\n"
        + "".join(f"{i},{i},{s},0.0,\n" for i, s in enumerate(states)), encoding="utf-8")
    assert mod.main("r", str(dump)) == 0
    out = capsys.readouterr().out
    assert "1 von 2 Plies nie `waiting`" in out and "Plies 2" in out


# --- ingest_video_session: der Ausrichtungsbericht nennt seinen Nenner ----------------------------

def test_ingest_alignment_report_names_its_denominator(tmp_path, monkeypatch, capsys):
    mod = load_script("ingest_video_session")
    monkeypatch.setattr(mod.config, "DATA", dataclasses.replace(mod.config.DATA, root=tmp_path))
    monkeypatch.setattr(mod, "read_log_rows", lambda _d: [
        {"frame": "frames/0000.jpg", "corners": [[0, 0]] * 4},
        {"frame": "frames/0001.jpg"},                              # keine Ecken
        {"frame": "frames/0002.jpg", "corners": [[0, 0]] * 4},     # Datei fehlt
    ])
    monkeypatch.setattr(mod.cv2, "imread",
                        lambda p: np.zeros((4, 4, 3), np.uint8) if p.endswith("0000.jpg") else None)
    fake = types.ModuleType("check_alignment")
    fake.frame_offsets = lambda frame, corners, profile: ({"e4": 2.0}, 0)
    fake.judge = lambda off, max_off: ([], max(off.values()))
    monkeypatch.setitem(sys.modules, "check_alignment", fake)
    mod.report_alignment("sid", types.SimpleNamespace(board_size=928))
    assert "1 of 3 frames measured" in capsys.readouterr().out


def test_ingest_refuses_an_existing_session_dir(tmp_path, monkeypatch):
    mod = load_script("ingest_video_session")
    monkeypatch.setattr(mod.config, "DATA", dataclasses.replace(mod.config.DATA, root=tmp_path))
    (tmp_path / "sessions" / "20260923-120000").mkdir(parents=True)
    monkeypatch.setattr(mod.time, "strftime", lambda _f: "20260923-120000")

    class Cap:
        frames = [np.zeros((4, 4, 3), np.uint8)]

        def isOpened(self):
            return True

        def get(self, _prop):
            return 30.0

        def read(self):
            return (True, self.frames.pop()) if self.frames else (False, None)

        def release(self):
            pass

    written = []
    monkeypatch.setattr(mod.cv2, "VideoCapture", lambda _p: Cap())
    monkeypatch.setattr(mod, "load_profile", lambda _n: object())
    monkeypatch.setattr(mod, "make_tracker", lambda _p: None)
    monkeypatch.setattr(mod, "board_corners_for_frame", lambda *a: [[0, 0]] * 4)
    monkeypatch.setattr(mod, "SessionWriter", lambda *a, **k: written.append(a) or pytest.fail("clobbered"))
    monkeypatch.setattr(sys, "argv", ["ingest", str(tmp_path / "v.mp4")])
    with pytest.raises(SystemExit):
        mod.main()
    assert written == []


# --- worker_probe: "s/Epoche" mittelte die Kompilier-Epoche mit hinein ----------------------------

def test_worker_probe_reports_warm_epochs(monkeypatch, capsys):
    mod = load_script("worker_probe")
    rows = [{"train_loss": 0.7, "t_train_s": 70.0, "t_val_s": 0.0, "t_data_s": 9.0},
            {"train_loss": 0.6, "t_train_s": 10.7, "t_val_s": 0.0, "t_data_s": 7.0},
            {"train_loss": 0.5, "t_train_s": 10.7, "t_val_s": 0.0, "t_data_s": 7.0}]
    monkeypatch.setattr(mod, "run", lambda w, e, d, f: rows)
    monkeypatch.setattr(sys, "argv", ["worker_probe", "--workers", "2"])
    assert mod.main() == 0
    line = capsys.readouterr().out.strip().splitlines()[-1]
    assert "10.7s" in line and "30.5s" not in line


# === Runde 2: die Skripte, die keine Jagd angefasst hatte ===

# --- profile_training_gpu: A/B abwechselnd statt fester Reihenfolge, Paritaet ohne Bezug ungemessen -

def test_profile_gpu_ab_cancels_linear_drift():
    mod = load_script("profile_training_gpu")
    calls = []

    def arm(true_ms):
        def fn():
            calls.append(true_ms)
            return true_ms + 1.0 * len(calls)   # der Rechner wird je Messung 1 ms langsamer
        return fn

    got = mod.alternating({"a": arm(10.0), "b": arm(10.0)})
    assert len(got["a"]["reps_ms"]) >= 2
    assert got["a"]["median_ms"] == pytest.approx(got["b"]["median_ms"])


def test_profile_gpu_fused_parity_without_reference_is_unmeasured():
    torch = pytest.importorskip("torch")
    mod = load_script("profile_training_gpu")
    got = mod.parity(None, {"w": torch.ones(3)})
    assert got["parameters_equal"] is None and got["max_parameter_error"] is None


# --- thin_per_position: ungemessene Coverage ist nicht sauber, Kompositen tragen keinen `ply` ------

def _thin_env(tmp_path, monkeypatch, rows):
    mod = load_script("thin_per_position")
    write_jsonl(tmp_path / "src" / "manifest.jsonl", rows)
    monkeypatch.setattr(mod, "dataset_dir", lambda name: tmp_path / name)
    monkeypatch.setattr(sys, "argv", ["thin", "src", "dst", "--clean", "1", "--dirty", "0"])
    return mod


def _board(sid, frame, cov, ply=None):
    row = {"session_id": sid, "frame": frame, "square": "a1", "label": "empty", "coverage": cov}
    return row if ply is None else {**row, "ply": ply}


def test_thin_refuses_unmeasured_coverage(tmp_path, monkeypatch):
    mod = _thin_env(tmp_path, monkeypatch, [_board("rg-x", "000001", None, ply=3),
                                            _board("rg-x", "000002", 0.4, ply=3)])
    assert mod.main() == 1
    assert not (tmp_path / "dst").exists()


def test_thin_takes_a_composite_without_ply_as_one_position(tmp_path, monkeypatch):
    mod = _thin_env(tmp_path, monkeypatch, [_board("comp-a", "000001", 0.3),
                                            _board("comp-a", "000002", 0.0),
                                            _board("rg-x", "000001", 0.0, ply=3)])
    assert mod.main() == 0
    kept = [(r["session_id"], r["frame"]) for r in _read(tmp_path / "dst" / "manifest.jsonl")]
    assert kept == [("comp-a", "000002"), ("rg-x", "000001")]


def _read(path: Path) -> list[dict]:
    from chesslab.ioutil import read_jsonl

    return read_jsonl(path)


# --- mix_datasets: zwei FEHLENDE Klassenlisten sind keine gleichen ---------------------------------

def test_mix_refuses_when_no_side_names_its_classes(tmp_path, monkeypatch):
    mod = load_script("mix_datasets")
    for name in ("host", "guest"):
        write_jsonl(tmp_path / name / "manifest.jsonl",
               [{"session_id": f"{name}-s", "path": "x.webp", "label": "wP", "square": "a2"}])
        (tmp_path / name / "split.json").write_text(
            json.dumps({"splits": {"train": [f"{name}-s"], "val": [], "test": []}}), encoding="utf-8")
    monkeypatch.setattr(mod, "dataset_dir", lambda name: tmp_path / name)
    monkeypatch.setattr(sys, "argv", ["mix", "host", "guest", "out"])
    with pytest.raises(SystemExit):
        mod.main()
    assert not (tmp_path / "out").exists()


# --- benchmark_export_warp: `uncached` lief immer zuerst, `cached` gegen den warmen Cache ----------

def test_export_warp_benchmark_alternates_its_arms(tmp_path, monkeypatch):
    mod = load_script("benchmark_export_warp")
    write_jsonl(tmp_path / "log.jsonl", [{"frame": "frames/000001.png"}])
    rg_decode, rg_boards = mod.rg_decode, mod.rg_boards
    calibration, store_rec = mod.calibration, mod.store_rec
    for owner, attr, value in ((store_rec, "game_dir", lambda name: tmp_path),
                               (store_rec, "video_path", lambda name: None),
                               (store_rec, "load_candidate", lambda name: {}),
                               (rg_decode, "detect_rotation", lambda *a: None),
                               (rg_decode, "stream_frames", lambda *a: iter(()))):
        monkeypatch.setattr(owner, attr, value)
    monkeypatch.setattr(calibration, "load_profile", lambda name: None)
    clock, order = [0.0], []

    def rewarp(destination, rows, profile, *, frames, progress):
        order.append("cached" if hasattr(calibration._crop_mesh_coordinates, "cache_clear") else "uncached")
        clock[0] += 5.0 + len(order)   # die Maschine wird je Lauf 1 s langsamer
        return {}

    monkeypatch.setattr(rg_boards, "rewarp_boards", rewarp)
    monkeypatch.setattr(mod.time, "perf_counter", lambda: clock[0])
    got = mod.benchmark("x")
    assert order[:2] == ["uncached", "cached"] and order[2:4] == ["cached", "uncached"]
    assert got["cached"]["seconds"] == pytest.approx(got["uncached"]["seconds"])


# --- border_probe: der Seek landete neben dem Index, und die Ecken sassen auf einem fremden Bild ---

def test_border_probe_warps_the_frame_its_corners_belong_to(tmp_path, monkeypatch):
    import cv2

    from chesslab.realgames import decode as rg_decode
    from chesslab.session_store import recording as store_rec

    mod = load_script("border_probe")
    sdir = tmp_path / "rec"
    write_jsonl(sdir / "log.jsonl", [{"frame": "frames/000007.png", "board": "boards/000007.webp",
                                 "board_border": 12, "corners": [[0, 0]] * 4}])
    monkeypatch.setattr(mod, "config", types.SimpleNamespace(DATA=types.SimpleNamespace(recordings=tmp_path)))

    class Seeking:   # ein Seek auf n liefert Frame n + 1 — gemessen 2 von 7 Sonden
        def __init__(self, *_):
            self.pos = 0

        def set(self, _prop, value):
            self.pos = int(value) + 1

        def read(self):
            return True, np.full((4, 4, 3), self.pos, np.uint8)

        def release(self):
            pass

    monkeypatch.setattr(cv2, "VideoCapture", Seeking)
    monkeypatch.setattr(store_rec, "video_path", lambda name: sdir / "video.mp4")
    monkeypatch.setattr(store_rec, "load_candidate", lambda name: {})
    monkeypatch.setattr(rg_decode, "detect_rotation", lambda *a: None)
    monkeypatch.setattr(rg_decode, "stream_frames",
                        lambda video, rows, rot: iter([(rows[0], np.full((4, 4, 3), 7, np.uint8))]))
    monkeypatch.setattr(mod, "read_session_meta", lambda d: {"profile": "p"})
    monkeypatch.setattr(mod, "load_profile", lambda p: types.SimpleNamespace(board_size=8))
    seen = []

    def warp(frame, profile, corners, pad):
        seen.append(int(frame[0, 0, 0]))
        raise SystemExit(0)

    monkeypatch.setattr(mod, "warp_padded", warp)
    monkeypatch.setattr(sys, "argv", ["border_probe", "--session", "rec", "--out", str(tmp_path / "o")])
    with pytest.raises(SystemExit):
        mod.main()
    assert seen == [7]


# --- move_strip: die Kachel schrieb eine ungemessene Coverage als `cov=0.00` -----------------------

def test_move_strip_caption_marks_unmeasured_coverage(tmp_path, monkeypatch):
    mod = load_script("move_strip")
    manifest = [{"session_id": "rg-s", "ply": 4, "square": "d1", "frame": f, "label": "wQ",
                 "path": f"mm://s/{f}/d1", "coverage": cov} for f, cov in (("000001", None),
                                                                            ("000002", 0.3))]
    write_jsonl(tmp_path / "ds" / "manifest.jsonl", manifest)
    monkeypatch.setattr(mod, "dataset_dir", lambda name: tmp_path / "ds")
    pixels = np.zeros((2, 8, 8, 3), np.uint8)
    monkeypatch.setattr(mod, "open_packed_rows",
                        lambda name, rows: (pixels, {r["path"]: i for i, r in enumerate(rows)}))
    monkeypatch.setattr(mod, "Path", lambda *a: tmp_path.joinpath(*a) if a[0] == "data/recordings"
                        else Path(*a))
    write_jsonl(tmp_path / "data/recordings" / "s" / "interval-check.jsonl", [{"ply": 4, "moved": []}])
    texts = []
    real_draw = mod.ImageDraw.Draw

    def draw(img):
        d = real_draw(img)
        monkeypatch.setattr(d, "text", lambda _xy, text, **kw: texts.append(text))
        return d

    monkeypatch.setattr(mod.ImageDraw, "Draw", draw)
    monkeypatch.setattr(sys, "argv", ["move_strip", "--session", "s", "--ply", "4", "--square", "d1",
                                      "--out", str(tmp_path / "o.png")])
    assert mod.main() == 0
    assert "wQ cov=--" in texts and "wQ cov=0.30" in texts


# --- fix_ply_offset: `reviewed.jsonl` ist auch ein Urteil, und ungemessen ist nicht sichtbar -------

_START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"


def _ply_offset_env(tmp_path, monkeypatch, coverage, reviewed):
    mod = load_script("fix_ply_offset")
    rec = tmp_path / "recordings" / "s"
    write_jsonl(tmp_path / "hits.jsonl", [{"session_id": "rg-s", "frame": "000010", "ply": 0,
                                      "better_at": 1, "match_better": 64, "match_own": 62}])
    manifest = [{"session_id": "rg-s", "frame": "000010", "ply": 0, "fen": _START, "square": sq,
                 "label": "wP" if sq == "e2" else "empty", "path": f"mm://s/000010/{sq}",
                 "coverage": coverage} for sq in ("e2", "e4")]
    manifest.append({**manifest[0], "frame": "000020", "ply": 1, "fen": _E4})
    write_jsonl(tmp_path / "ds" / "manifest.jsonl", manifest)
    write_jsonl(rec / "reviewed.jsonl", reviewed)
    monkeypatch.setattr(mod, "ROOT", tmp_path / "recordings")
    monkeypatch.setattr(mod, "dataset_dir", lambda name: tmp_path / "ds")
    monkeypatch.setattr(mod, "ledger_paths", lambda name: sorted((tmp_path / "recordings").glob(f"*/{name}")),
                        raising=False)
    monkeypatch.setattr(mod, "open_packed_rows", lambda name, rows: (
        np.zeros((len(rows), 4, 4, 3), np.uint8), {r["path"]: i for i, r in enumerate(rows)}))
    new = {"e2": "empty", "e4": "wP"}
    monkeypatch.setattr(mod.occluded_model, "all_reads",
                        lambda run, crops: [{"pred_label": new[sq]} for sq in ("e2", "e4")][:len(crops)])
    monkeypatch.setattr(sys, "argv", ["fix", "--hits", str(tmp_path / "hits.jsonl"), "--apply"])
    return mod, rec / "corrections.jsonl"


def test_ply_offset_never_overrides_a_reviewed_cell(tmp_path, monkeypatch):
    reviewed = [{"session_id": "rg-s", "frame": "000010", "square": sq, "label": lab}
                for sq, lab in (("e2", "wP"), ("e4", "empty"))]
    mod, out = _ply_offset_env(tmp_path, monkeypatch, 0.0, reviewed)
    mod.main()
    assert not out.exists()


def test_ply_offset_skips_unmeasured_coverage(tmp_path, monkeypatch):
    mod, out = _ply_offset_env(tmp_path, monkeypatch, None, [])
    mod.main()
    assert not out.exists()


def test_ply_offset_still_corrects_a_clean_unjudged_cell(tmp_path, monkeypatch):
    mod, out = _ply_offset_env(tmp_path, monkeypatch, 0.0, [])
    mod.main()
    from chesslab.ioutil import read_jsonl

    assert {(r["square"], r["label"]) for r in read_jsonl(out)} == {("e2", "empty"), ("e4", "wP")}


# --- matte_audit_montage: dasselbe Raster wie `matte_audit` vor 5f4a85c9 -- ohne Rand, ohne Seite --

def test_matte_montage_marks_the_square_the_audit_named(tmp_path, monkeypatch):
    from PIL import Image

    mod = load_script("matte_audit_montage")
    monkeypatch.chdir(tmp_path)
    rec = tmp_path / "data" / "recordings" / "rec"
    (rec / "boards").mkdir(parents=True)
    Image.new("RGB", (952, 952)).save(rec / "boards" / "000005.webp")
    write_jsonl(tmp_path / "audit.jsonl", [{"session": "rec", "frame": "000005", "ply": 3, "squares": ["a1"]}])
    entry = {"frame": "frames/000005.png", "board_size": 928, "board_border": 12}
    monkeypatch.setattr(mod, "read_log_rows", lambda d: [entry], raising=False)
    monkeypatch.setattr(mod, "read_session_meta", lambda d: {}, raising=False)
    monkeypatch.setattr(mod, "_profile_for_session",
                        lambda meta, p: types.SimpleNamespace(white_pov=False), raising=False)
    boxes = []
    real_draw = mod.ImageDraw.Draw

    def draw(img):
        d = real_draw(img)
        if img.size == (mod.TILE, mod.TILE):
            monkeypatch.setattr(d, "rectangle", lambda box, **kw: boxes.append(box))
        return d

    monkeypatch.setattr(mod.ImageDraw, "Draw", draw)
    monkeypatch.setattr(sys, "argv", ["m", "--audit", str(tmp_path / "audit.jsonl"),
                                      "--out", str(tmp_path / "o.png")])
    assert mod.main() == 0
    scale = mod.TILE / 952
    # Schwarz unten: a1 liegt OBEN RECHTS, eine Randbreite nach innen versetzt.
    assert boxes[0][0] == pytest.approx((12 + 7 * 116) * scale)
    assert boxes[0][1] == pytest.approx(12 * scale)


# --- audit_montage: das Beispiel je Fall war auch ein ungemessener oder dunkler Crop ---------------

def test_audit_montage_picks_a_measured_visible_crop(tmp_path, monkeypatch):
    mod = load_script("audit_montage")
    (tmp_path / "audit.json").write_text(json.dumps(
        {"rg-s": {"faelle": [{"square": "a8", "label": "bR", "model": "bN", "conf": 0.9, "n": 5}]}}),
        encoding="utf-8")
    rows = [{"session_id": "rg-s", "square": "a8", "label": "bR", "path": f"mm://s/{i}/a8", **extra}
            for i, extra in enumerate(({"coverage": None}, {"coverage": 0.0, "brightness": 10.0},
                                       {"coverage": 0.0, "brightness": 90.0}))]
    write_jsonl(tmp_path / "ds" / "manifest.jsonl", rows)
    monkeypatch.setattr(mod, "dataset_dir", lambda name: tmp_path / "ds")
    taken = []

    class Pack:
        def __getitem__(self, i):
            taken.append(i)
            return np.zeros((8, 8, 3), np.uint8)

    monkeypatch.setattr(mod, "open_packed_rows",
                        lambda name, man: (Pack(), {r["path"]: i for i, r in enumerate(man)}))
    monkeypatch.setattr(sys, "argv", ["a", "--audit", str(tmp_path / "audit.json"),
                                      "--out", str(tmp_path / "o.png")])
    mod.main()
    assert taken == [2]


# === Runde 3: die vier offenen Punkte aus Nr. 50 ===

# --- sweep_report: Rauschen aus dem Sweep selbst, gemittelt ueber 20 statt 5 Epochen --------------

def _sweep(tmp_path, monkeypatch, capsys, arms: dict[str, list[float]]) -> dict[str, str]:
    mod = load_script("sweep_report")
    axis = "val_visible_piece_acc"
    for arm, vals in arms.items():
        write_jsonl(tmp_path / arm / "metrics.jsonl", [{"epoch": i, axis: v} for i, v in enumerate(vals)])
    monkeypatch.setattr(sys, "argv", ["sweep_report", "--dir", str(tmp_path)])
    assert mod.main() == 0
    lines = capsys.readouterr().out.splitlines()
    return {arm: next(line for line in lines if line.startswith(arm)) for arm in arms}


def _wobble(level: float, amp: float, n: int = 20) -> list[float]:
    return [level + (amp if i % 2 else -amp) for i in range(n)]


def test_sweep_a_spike_in_the_last_five_epochs_is_no_effect(tmp_path, monkeypatch, capsys):
    spike = [*_wobble(0.88, 0.02, 15), *[0.96] * 5]      # Mittel ueber 20: genau der Bezug
    got = _sweep(tmp_path, monkeypatch, capsys, {"a": _wobble(0.90, 0.001), "b": spike})
    assert "(im Rauschen)" in got["b"]


def test_sweep_noise_comes_from_the_sweep_not_from_one_old_set(tmp_path, monkeypatch, capsys):
    # Zwei ruhige Arme, 0,02 auseinander: gegen die feste 3 x 0,0157 hiess das "im Rauschen".
    got = _sweep(tmp_path, monkeypatch, capsys, {"a": _wobble(0.90, 0.001), "b": _wobble(0.92, 0.001)})
    assert "(im Rauschen)" not in got["b"]


# --- benchmark_batch_aug: Varianten verschraenkt statt Block fuer Block ---------------------------

def test_batch_aug_benchmark_interleaves_its_variants(monkeypatch):
    mod = load_script("benchmark_batch_aug")
    clock, order = [0.0], []

    def arm(name):
        def aug(raw):
            order.append(name)
            clock[0] += 1.0 + len(order) / 1000   # der Rechner wird je Aufruf langsamer
        return aug

    monkeypatch.setattr(mod.time, "perf_counter", lambda: clock[0])
    got = mod.time_variants({"a": arm("a"), "b": arm("b")}, None, lambda: None, calls=10)
    assert order[:10] == ["a"] * 10 and order[10:30] == ["b"] * 20
    assert got["a"]["median_ms"] == pytest.approx(got["b"]["median_ms"])
    assert len(got["a"]["reps_ms"]) >= 2


# --- pack_dataset_sessions: ein Pack, den ein Urteil ueberholt hat, hiess "have" -----------------

def _pack_donor(tmp_path, monkeypatch):
    from chesslab import config
    from chesslab.training import pack_session
    from test_bug_hunt_20260923_packstand import _unusable
    from test_session_pack import _make_session, _pack_paths

    sdir = _make_session(tmp_path)
    paths = _pack_paths(tmp_path, monkeypatch)
    (paths.datasets / "ds").mkdir(parents=True)
    (paths.datasets / "ds" / "dataset.yaml").write_text("session_ids: [sess1]\n", encoding="utf-8")
    write_jsonl(paths.datasets / "ds" / "manifest.jsonl", [])
    pack_session.write_session_pack("sess1", paths=paths)   # juenger als das Spender-Manifest
    monkeypatch.setattr(config, "DATA", paths)
    monkeypatch.setattr(sys, "argv", ["pack", "--dataset", "ds", "--size", "80", "--dry-run"])
    return load_script("pack_dataset_sessions"), lambda: _unusable(sdir)


def test_pack_sessions_names_a_pack_a_verdict_overtook(tmp_path, monkeypatch, capsys):
    mod, lock = _pack_donor(tmp_path, monkeypatch)
    lock()
    assert mod.main() == 1
    out = capsys.readouterr().out
    assert "VERDICT" in out and "0000/e1" in out and "--replace" in out


def test_pack_sessions_a_current_pack_is_still_have(tmp_path, monkeypatch, capsys):
    mod, _ = _pack_donor(tmp_path, monkeypatch)
    assert mod.main() == 0
    assert "have" in capsys.readouterr().out


# --- reduce_video: ein Container ohne Bildrate wurde still zu 30 fps -----------------------------

class _NoFpsCapture:
    def __init__(self, _src):
        self.props = {"CAP_PROP_FRAME_WIDTH": 64, "CAP_PROP_FRAME_HEIGHT": 32, "CAP_PROP_FPS": 0.0,
                      "CAP_PROP_FRAME_COUNT": 0}

    def isOpened(self):
        return True

    def get(self, prop):
        import cv2

        return next(v for k, v in self.props.items() if getattr(cv2, k) == prop)

    def read(self):
        return False, None

    def release(self):
        pass


def _reduce_env(monkeypatch):
    mod = load_script("reduce_video")
    writers = []

    class Writer:
        def __init__(self, _dst, _fourcc, fps, _size):
            writers.append(fps)

        def isOpened(self):
            return True

        def release(self):
            pass

    monkeypatch.setattr(mod.cv2, "VideoCapture", _NoFpsCapture)
    monkeypatch.setattr(mod.cv2, "VideoWriter", Writer)
    return mod, writers


def test_reduce_video_refuses_a_missing_frame_rate(monkeypatch):
    mod, writers = _reduce_env(monkeypatch)
    assert mod.reduce("in.mp4", "out.mp4") == 1
    assert writers == []


def test_reduce_video_takes_an_explicit_frame_rate(monkeypatch):
    mod, writers = _reduce_env(monkeypatch)
    assert mod.reduce("in.mp4", "out.mp4", fps=24.0) == 0
    assert writers == [24.0]
