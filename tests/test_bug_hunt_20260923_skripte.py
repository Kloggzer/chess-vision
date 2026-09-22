"""Bug-Hunt 2026-09-23: die bis dahin unberuehrten Skripte, nach Entscheidungsgewicht.

Jeder Test ist gegen den ungefixten Stand rot gesehen worden (Gegenprobe im Bericht).
"""

from __future__ import annotations

import dataclasses
import importlib.util
import json
import sys
import types
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"


def _load(name: str):
    spec = importlib.util.spec_from_file_location(f"bh23_{name}", SCRIPTS / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")


# --- profile_training_kernels: die Rezeptzahl kommt aus dem Lauf, und der Anfang wird wiederholt --

def test_profile_kernels_fits_its_own_line_and_repeats_the_first_arm():
    mod = _load("profile_training_kernels")
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
    mod = _load("profile_training_gpu")
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

    mod = _load("audit_disk_damage")
    monkeypatch.setattr(mod.config, "DATA", dataclasses.replace(mod.config.DATA, root=tmp_path))
    sdir = tmp_path / "recordings" / "s"
    _jsonl(sdir / "matte.jsonl", matte_rows)
    (sdir / "mattes").mkdir(parents=True)
    cv2.imwrite(str(sdir / "mattes" / "f1.png"), np.zeros((4, 4), np.uint8))
    (sdir / "mattes" / "f1.png").rename(sdir / "mattes" / "f1.webp")
    monkeypatch.setattr(calibration, "load_profile", lambda _n: object())
    monkeypatch.setattr(labeling, "read_session_meta", lambda _d: {"profile": "p"})
    monkeypatch.setattr(labeling, "read_log", lambda _d: [{"board": "boards/f1.webp"}])
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
    mod = _load("gradcam_summary")
    dd = tmp_path / "ds"
    dd.mkdir()
    (dd / "split.json").write_text(json.dumps({"splits": {"val": ["s1"]}}), encoding="utf-8")
    _jsonl(dd / "manifest.jsonl", [{"path": f"mm://s1-80/000001/{sq}", "label": "wP",
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
    mod = _load("settle_lag")
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
    mod = _load("ingest_video_session")
    monkeypatch.setattr(mod.config, "DATA", dataclasses.replace(mod.config.DATA, root=tmp_path))
    monkeypatch.setattr(mod.labeling, "read_log", lambda _d: [
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
    mod = _load("ingest_video_session")
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
    mod = _load("worker_probe")
    rows = [{"train_loss": 0.7, "t_train_s": 70.0, "t_val_s": 0.0, "t_data_s": 9.0},
            {"train_loss": 0.6, "t_train_s": 10.7, "t_val_s": 0.0, "t_data_s": 7.0},
            {"train_loss": 0.5, "t_train_s": 10.7, "t_val_s": 0.0, "t_data_s": 7.0}]
    monkeypatch.setattr(mod, "run", lambda w, e, d, f: rows)
    monkeypatch.setattr(sys, "argv", ["worker_probe", "--workers", "2"])
    assert mod.main() == 0
    line = capsys.readouterr().out.strip().splitlines()[-1]
    assert "10.7s" in line and "30.5s" not in line
