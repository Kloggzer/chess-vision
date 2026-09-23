"""Zweite Bug-Jagd vom 2026-09-16; offene Funde als `xfail(strict=True)`."""

from __future__ import annotations

import ast
import inspect
import json
import shutil
from pathlib import Path

import numpy as np
import pytest
import yaml

from chesslab import config
from conftest import write_jsonl


def _paths(tmp_path: Path) -> config.Paths:
    return config.Paths(root=tmp_path / "data")


# --- 1. sessions.archive_session ---------------------------------------------------------

def test_archive_keeps_the_crops_when_the_move_fails(tmp_path, monkeypatch):
    from chesslab import session_lifecycle

    paths = _paths(tmp_path)
    (paths.sessions / "s1").mkdir(parents=True)
    pool = paths.crop_pool / "wP"
    pool.mkdir(parents=True)
    crop = pool / "s1_000001_a1.webp"
    crop.write_bytes(b"x")
    manifest = paths.crop_pool / "manifest.jsonl"
    manifest.write_text(json.dumps({"session_id": "s1", "square": "a1"}) + "\n", encoding="utf-8")

    def boom(*_a, **_k):
        raise PermissionError("WinError 32: file in use by another process")

    monkeypatch.setattr(shutil, "move", boom)
    with pytest.raises(PermissionError):
        session_lifecycle.archive_session("s1", reason="test", paths=paths)

    assert crop.exists(), "der Move ist gescheitert — die Crops duerfen nicht weg sein"
    assert manifest.read_text(encoding="utf-8").strip(), "das Manifest ebenso wenig"


# --- 2. sessions.flag_frame --------------------------------------------------------------

def test_flag_frame_backs_the_log_up_like_every_other_writer(tmp_path, monkeypatch):
    from chesslab.session_store import log as store_log

    paths = _paths(tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    sdir = paths.sessions / "s1"
    sdir.mkdir(parents=True)
    (sdir / "log.jsonl").write_text(
        json.dumps({"frame": "frames/000001.png", "ply": 1}) + "\n", encoding="utf-8")

    store_log.flag_frame("s1", 0, True)

    assert list(sdir.glob("log.jsonl.bak.*")), (
        "jede andere Schreibfunktion des Abschnitts sichert den Log zuerst")


# --- 3. ingest.run_ingest ----------------------------------------------------------------

def test_ingest_reports_how_many_renders_the_adapter_dropped(tmp_path):
    from chesslab.ingest import run_ingest

    root = tmp_path / "renders"
    root.mkdir()
    (root / "000000.json").write_text(json.dumps({"fen": "8/8/8/8/8/8/8/8 w - - 0 1",
                                                  "corners": [[0, 0], [1, 0], [1, 1], [0, 1]]}),
                                      encoding="utf-8")

    with pytest.raises(ValueError, match=r"skipped: 1"):
        run_ingest("synthetic", root, tag="t", build=False, paths=_paths(tmp_path))


# --- 4. realgames.frame_anchor -----------------------------------------------------------

def test_frame_anchor_uses_review_frame_zero(tmp_path, monkeypatch):
    from chesslab.realgames import confirm as rg_confirm

    monkeypatch.setattr(config, "DATA", _paths(tmp_path))
    line = rg_confirm.frame_anchor("g1", {"ply": 1, "san": "e4", "frame": 42, "frame_review": 0})

    assert "000000" in line, "Frame 0 ist ein Bild wie jedes andere, kein fehlender Wert"


# --- 5. scan_discover.assess_report ------------------------------------------------------

def _report_keys_read(func) -> set[str]:
    tree = ast.parse(inspect.getsource(func).lstrip())
    keys: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) \
                and node.func.attr == "get" and isinstance(node.func.value, ast.Name) \
                and node.func.value.id == "report" and node.args:
            keys.add(getattr(node.args[0], "value", None))
        if isinstance(node, ast.Subscript) and isinstance(node.value, ast.Name) \
                and node.value.id == "report":
            keys.add(getattr(node.slice, "value", None))
        if isinstance(node, ast.Compare) and isinstance(node.ops[0], ast.In) \
                and isinstance(node.comparators[0], ast.Name) \
                and node.comparators[0].id == "report":
            keys.add(getattr(node.left, "value", None))
    return {k for k in keys if isinstance(k, str)}


def _report_keys_written(module) -> set[str]:
    tree = ast.parse(inspect.getsource(module))
    keys: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Dict) \
                and any(isinstance(t, ast.Name) and t.id == "report" for t in node.targets):
            keys |= {k.value for k in node.value.keys if isinstance(k, ast.Constant)}
    return keys


@pytest.mark.xfail(reason="die Wache kann nur `ok` liefern — welche Zahlen ein Scan-Bericht "
                          "tragen soll, ist eine offene Entscheidung", strict=True)
def test_assess_report_judges_numbers_the_report_actually_carries():
    """Null Ueberlappung: `assess_report` beurteilt sieben Zahlen, `prepare_scan` schreibt
    fuenf andere. Hinter `ok` zu WARNEN war 2026-09 ausdruecklich falsch — die Wache ist
    damit wirkungslos, und das aufzuloesen heisst entscheiden, was ein Bericht tragen soll.
    """
    from chesslab import meshprep, scan_discover

    judged = _report_keys_read(scan_discover.assess_report)
    written = _report_keys_written(meshprep)

    assert judged, "der Selbsttest selbst muss etwas finden"
    assert judged & written, (
        f"keine der geprueften Zahlen wird geschrieben: {sorted(judged)} gegen {sorted(written)}")

# --- 6. hand_gate.gate_rows --------------------------------------------------------------

def _recording_with_matte(paths: config.Paths, rows: list[dict]) -> Path:
    rec = paths.recordings / "r1"
    rec.mkdir(parents=True)
    (rec / "session.yaml").write_text(yaml.safe_dump({"session_id": "rg-r1", "profile": "p"}),
                                      encoding="utf-8")
    (rec / "log.jsonl").write_text(
        "".join(json.dumps({"frame": f"frames/{r['frame']}.png", "board": f"boards/{r['frame']}.webp",
                            "board_border": 0}) + "\n" for r in rows), encoding="utf-8")
    write_jsonl(rec / "matte.jsonl", rows)
    return rec


def test_gate_rows_teaches_only_what_sam_measured(tmp_path, monkeypatch):
    from chesslab import hand_gate

    paths = _paths(tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    _recording_with_matte(paths, [
        {"frame": "000001", "concepts": {"hand": 0.9}, "coverage": {"a1": 0.9}},
        {"frame": "000002", "source": "upsert", "concepts": {"temporal": 0.8},
         "coverage": {"a1": 0.9}},
    ])

    stems = {r["stem"] for r in hand_gate.gate_rows()}

    assert stems == {"000001"}, "die Karte nennt `teacher: sam3` — dann darf nur SAM lehren"


# --- 7. temporal_matte.prune_dead_rows ---------------------------------------------------

def test_prune_drops_an_upsert_row_sam_has_re_cut(tmp_path, monkeypatch):
    from chesslab import temporal_matte

    paths = _paths(tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    rec = paths.recordings / "r1"
    rec.mkdir(parents=True)
    (rec / "session.yaml").write_text(yaml.safe_dump({"session_id": "rg-r1", "profile": "p"}),
                                      encoding="utf-8")
    (rec / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "source": "upsert", "coverage": {"a1": 0.9}}) + "\n"
        + json.dumps({"frame": "000001", "coverage": {"a1": 0.4}}) + "\n", encoding="utf-8")

    res = temporal_matte.prune_dead_rows("rg-r1")

    assert res["dropped"] == 1, "SAMs spaetere Zeile gewinnt — die alte Upsert-Zeile ist tot"


# --- 8. occluders.chroma_cut_of ----------------------------------------------------------

class _DeadCap:
    def set(self, *_a):
        return True

    def read(self):
        return False, None


def test_chroma_cut_refuses_an_unreadable_clip():
    from chesslab.occluders import chroma_cut_of

    median = np.full((16, 16, 3), 120, np.uint8)
    stage = np.ones((16, 16), np.uint8)

    with pytest.raises(ValueError):
        chroma_cut_of(_DeadCap(), 40, median, stage, samples=4, size=(16, 16))


# --- 9. synth_build counts ---------------------------------------------------------------

def test_fused_counts_separate_dedup_from_the_class_collapse(tmp_path):
    import cv2

    from chesslab.synth_build import build_synth_dataset

    corners = [[16.0, 16.0], [144.0, 16.0], [144.0, 144.0], [16.0, 144.0]]
    renders = tmp_path / "renders"
    renders.mkdir()
    for i in range(4):
        cv2.imwrite(str(renders / f"{i:06d}.jpg"), np.full((160, 160, 3), 40 + 30 * i, np.uint8))
        (renders / f"{i:06d}.json").write_text(json.dumps(
            {"fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR", "corners": corners,
             "occluded_squares": ["d4", "e4"]}), encoding="utf-8")

    res = build_synth_dataset("fused-counts", renders, board_size=160, per_cell_cap=10**9,
                              val_frac=0.0, test_frac=0.0, workers=1, allow_degenerate=True,
                              class_mode="pieces13", paths=_paths(tmp_path))

    counts = res["counts"]
    assert counts["after_dedup"] == 4 * 64, "ohne Cap wirft die Dedup nichts weg"
    assert counts["final"] == 4 * 62, "erst der pieces13-Collapse wirft die 8 occluded-Zeilen"


# --- 10. training/quantize ---------------------------------------------------------------

def test_calibration_never_falls_back_to_the_val_split(tmp_path, monkeypatch):
    from chesslab.training.quantize import _calibration_rows

    paths = _paths(tmp_path)
    monkeypatch.setattr(config, "DATA", paths)
    ds = paths.datasets / "d1"
    ds.mkdir(parents=True)
    (ds / "manifest.jsonl").write_text(
        json.dumps({"session_id": "v", "label": "wP", "path": "mm://d1/0/a1"}) + "\n",
        encoding="utf-8")
    (ds / "split.json").write_text(
        json.dumps({"splits": {"train": [], "val": ["v"], "test": []}}), encoding="utf-8")

    assert _calibration_rows({"dataset": "d1"}, 8) == [], (
        "ein leerer Train-Split ist ein Fehler, kein Anlass, den Eval-Satz zu nehmen")


# --- 11. training/torch_data._target -----------------------------------------------------

def test_target_reads_a_written_out_null_brightness_as_bright():
    from chesslab.training.torch_data import _target

    assert float(_target(3, {"coverage": 0.0, "brightness": None})[2]) == 255.0, (
        "`occlusion.classification_eligible` liest dieselbe Zeile als hell")
