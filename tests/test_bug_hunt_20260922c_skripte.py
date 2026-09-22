"""Skript-Jagd 2026-09-22c: sechs Zahlen aus `scripts/`, die niemand nachgerechnet hat.

Alle sechs reichen etwas UNGEMESSENES als gemessenen Normalwert weiter: ein Pack, dessen
Zeilenzahl nicht zu seinen Pixeln passt; ein Lernkurvenpunkt, den es nicht gibt; eine Sitzung
ohne Lesarten und eine ohne Quad, die stumm aus der Summe fallen; ein Median ueber eine
unbekannte Teilmenge; und eine nie gemattete Zelle, die sich als sichtbar ausgibt.
"""

from __future__ import annotations

import importlib.util
import json
import sys
import types
from pathlib import Path

import numpy as np
import pytest

from chesslab.ioutil import write_json, write_rows

ROOT = Path(__file__).resolve().parents[1]


def _load(name: str):
    spec = importlib.util.spec_from_file_location(f"_s22c_{name}", ROOT / "scripts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


# --- 1. `eval_packed_13c`: Pixel und Zeilen aus zwei verschiedenen Staenden -------------------

class _FakeIO:
    def __init__(self, name, shape):
        self.name = name
        self.shape = shape


class _FakeSession:
    """Sagt immer `empty` — jede Abweichung im Bericht kommt dann aus der Zuordnung."""

    def __init__(self, *_a, **_k):
        pass

    def get_inputs(self):
        return [_FakeIO("x", [4, 3, 8, 8])]

    def get_outputs(self):
        return [_FakeIO("y", [4, 13])]

    def run(self, _outs, feed):
        n = feed["x"].shape[0]
        return [np.tile(np.eye(13, dtype=np.float32)[12], (n, 1))]


def _pack(tmp_path: Path, rows: int, n: int) -> Path:
    pack = tmp_path / "pack"
    pack.mkdir()
    write_json(pack / "packed_meta.json", {"n": n, "h": 8, "w": 8})
    write_rows(pack / "manifest.jsonl",
               [{"label": "empty", "session_id": "s", "frame": i} for i in range(rows)])
    np.memmap(pack / "packed_images.u8", dtype=np.uint8, mode="w+",
              shape=(n, 8, 8, 3))[:] = 7
    return pack


def test_eval_packed_13c_refuses_a_pack_whose_rows_do_not_match_its_pixels(tmp_path, monkeypatch):
    """Auf der Platte liegen heute FUENF Datensatzverzeichnisse, deren `packed_meta.json` 424 519
    Zeilen behauptet, waehrend das `manifest.jsonl` 116 475 bis 300 339 traegt (`-p2`, `-c8d1`,
    `-c8d2`, `-c2d8`, `-c2x4d2`). Das Skript formt den Memmap nach `meta["n"]` und laeuft dann
    ueber `len(rows)` — Bild i und Label i stammen aus verschiedenen Staenden, und keine Zahl im
    Bericht verraet es."""
    monkeypatch.setitem(sys.modules, "onnxruntime",
                        types.SimpleNamespace(InferenceSession=_FakeSession))
    script = _load("eval_packed_13c")
    cfg = tmp_path / "config.json"
    write_json(cfg, {"classes": [f"c{i}" for i in range(12)] + ["empty"]})
    pack = _pack(tmp_path, rows=6, n=4)
    monkeypatch.setattr(sys, "argv", ["eval", "--model", "m.onnx", "--config", str(cfg),
                                      "--pack", str(pack)])
    with pytest.raises(SystemExit) as exc:
        script.main()
    assert "6" in str(exc.value) and "4" in str(exc.value)


def test_eval_packed_13c_still_runs_when_the_pack_matches(tmp_path, monkeypatch):
    monkeypatch.setitem(sys.modules, "onnxruntime",
                        types.SimpleNamespace(InferenceSession=_FakeSession))
    script = _load("eval_packed_13c")
    cfg = tmp_path / "config.json"
    write_json(cfg, {"classes": [f"c{i}" for i in range(12)] + ["empty"]})
    pack = _pack(tmp_path, rows=6, n=6)
    out = tmp_path / "r.json"
    monkeypatch.setattr(sys, "argv", ["eval", "--model", "m.onnx", "--config", str(cfg),
                                      "--pack", str(pack), "--out", str(out)])
    script.main()
    assert json.loads(out.read_text(encoding="utf-8"))["crops"] == 6


# --- 2. `learning_curve`: ein Punkt, den es nicht gibt ----------------------------------------

def _dataset(tmp_path: Path, sessions: list[str]) -> Path:
    dd = tmp_path / "ds"
    dd.mkdir()
    write_json(dd / "split.json", {"splits": {"train": sessions, "val": ["v"], "test": []}})
    write_rows(dd / "manifest.jsonl", [{"session_id": s, "label": "empty"} for s in sessions])
    return dd


def test_learning_curve_refuses_a_k_larger_than_the_training_set(tmp_path, monkeypatch):
    """`order[:k]` kuerzt still. Mit weniger Aufnahmen als gefragt schreibt das Skript zwei
    Splits mit IDENTISCHEM Inhalt unter verschiedenen Namen — die Lernkurve bekommt einen
    waagerechten Abschnitt geschenkt, und genau ihre Steigung ist die Entscheidung."""
    script = _load("learning_curve")
    dd = _dataset(tmp_path, [f"s{i}" for i in range(5)])
    monkeypatch.setattr(script, "dataset_dir", lambda _n: dd)
    monkeypatch.setattr(sys, "argv", ["lc", "--dataset", "x", "--k", "4,8"])
    with pytest.raises(SystemExit) as exc:
        script.main()
    assert "8" in str(exc.value) and "5" in str(exc.value)
    assert not (dd / "split-lc4.json").exists(), "kein halber Satz Splits auf der Platte"


def test_learning_curve_writes_the_points_it_can(tmp_path, monkeypatch):
    script = _load("learning_curve")
    dd = _dataset(tmp_path, [f"s{i}" for i in range(5)])
    monkeypatch.setattr(script, "dataset_dir", lambda _n: dd)
    monkeypatch.setattr(sys, "argv", ["lc", "--dataset", "x", "--k", "2,5"])
    assert script.main() == 0
    assert len(json.loads((dd / "split-lc2.json").read_text())["splits"]["train"]) == 2
    assert len(json.loads((dd / "split-lc5.json").read_text())["splits"]["train"]) == 5


# --- 3. `persist_by_class`: eine genannte Sitzung faellt stumm aus der Summe -------------------

def _reads(path: Path, wrong: bool) -> None:
    rows = []
    for frame in range(4):
        for sq in ("a1", "a2"):
            top = "wP" if not wrong else "bP"
            rows.append({"frame": frame, "square": sq, "fen_label": "wP", "model_cov": 0.0,
                         "probs": {top: 0.9, "wP": 0.1 if wrong else 0.9}})
    write_rows(path, rows)


def test_persist_by_class_names_a_session_it_could_not_read(tmp_path, monkeypatch, capsys):
    """24 der 51 Verzeichnisse unter `data/recordings/` tragen heute KEINE `model-reads.jsonl`.
    Wer eine davon auf die Kommandozeile schreibt, bekommt trotzdem eine vollstaendig aussehende
    Tabelle: das `continue` ueberspringt sie, und die Prozente stehen dann ueber einer
    Teilmenge, die niemand genannt hat."""
    monkeypatch.chdir(tmp_path)
    (tmp_path / "data" / "recordings" / "da").mkdir(parents=True)
    (tmp_path / "data" / "recordings" / "fehlt").mkdir(parents=True)
    _reads(tmp_path / "data" / "recordings" / "da" / "model-reads.jsonl", wrong=False)
    monkeypatch.setattr(sys, "argv", ["persist", "da", "fehlt"])
    _load("persist_by_class")
    out = capsys.readouterr().out
    assert "fehlt" in out, "die uebersprungene Sitzung muss im Bericht stehen"
    assert "da" not in out.split("fehlt")[0].split("\n")[-1]


# --- 4. `straighten_ab`: ein Median ueber eine unbekannte Teilmenge ---------------------------

def test_straighten_ab_report_shows_how_many_frames_its_median_rests_on(capsys):
    """`bow_of` gibt `nan` zurueck, wenn keine einzige Linie gelesen wurde — genau auf den
    Handframes, aus denen die Haelfte der Stichprobe besteht (`sample_rows`). `np.nanmedian`
    wirft die stumm weg: ein Arm, der auf einem von zwoelf Frames messbar war, steht mit
    derselben Autoritaet in der Tabelle wie einer mit zwoelf."""
    script = _load("straighten_ab")
    arms = {"roh": {"sauber": [(3.0, 0), (5.0, 0)], "Hand": [(4.0, 1), (6.0, 1)]},
            "mesh-session": {"sauber": [(1.0, 0), (float("nan"), 18)],
                             "Hand": [(float("nan"), 18), (float("nan"), 18)]}}
    script.report(arms)
    out = capsys.readouterr().out
    mesh = [ln for ln in out.splitlines() if ln.startswith("mesh-session")][0]
    roh = [ln for ln in out.splitlines() if ln.startswith("roh")][0]
    assert "1/2" in mesh, f"der Nenner des Medians fehlt: {mesh!r}"
    assert "0/2" in mesh, f"ein Arm ohne jede Messung muss das sagen: {mesh!r}"
    assert "2/2" in roh, f"auch der volle Arm nennt seinen Nenner: {roh!r}"


# --- 5. `survey_alignment`: eine Aufnahme ohne Quad verschwindet ------------------------------

def test_survey_alignment_names_a_session_without_corners(tmp_path, monkeypatch, capsys):
    """Das Skript existiert, damit ueber den KORPUS entschieden wird und nicht ueber die eine
    Aufnahme, die falsch aussah. Eine Aufnahme, deren `log.jsonl` keinen einzigen Quad traegt,
    fiel stumm heraus — ungemessen, aber nicht von einer sauberen zu unterscheiden."""
    script = _load("survey_alignment")
    ohne, mit = tmp_path / "ohne", tmp_path / "mit"
    for d in (ohne, mit):
        d.mkdir()
    write_rows(ohne / "log.jsonl", [{"frame": "000001.png"}])
    write_rows(mit / "log.jsonl", [{"frame": "000001.png", "corners": [[0, 0]] * 4}])
    monkeypatch.setattr(script.sessions, "all_sessions",
                        lambda *a, **k: [("ohne", ohne), ("mit", mit)])
    monkeypatch.setattr(script.sessions, "missing_source_frames", lambda *a, **k: None)
    monkeypatch.setattr(script.labeling, "read_session_meta", lambda _d: {})
    monkeypatch.setattr(script.labeling, "_profile_for_session",
                        lambda *a, **k: types.SimpleNamespace(board_size=800))
    monkeypatch.setattr(script, "worst_offset", lambda *a, **k: 1.0)
    import cv2
    monkeypatch.setattr(cv2, "imread", lambda *a, **k: np.zeros((4, 4, 3), np.uint8))
    monkeypatch.setattr(sys, "argv", ["survey"])
    assert script.main() == 0
    out = capsys.readouterr().out
    assert "ohne" in out, "die Aufnahme ohne Quad muss genannt werden"
    assert "mit" in out


# --- 6. `show_errors`: `coverage or 0.0` macht aus ungemessen sichtbar ------------------------

def test_show_errors_counts_unmeasured_coverage_instead_of_calling_it_visible():
    """`float(r.get("coverage") or 0.0) > VMAX` liest `None` als 0,0 und damit als frei.
    ELF Datensaetze tragen heute keine einzige Coverage-Zahl — allein die fuenf groessten
    (`labeled-rg-2026-08-08-00-39-57-80`, drei `turntable-13bn-*`, `turntable80-test-092133`)
    sind 380 214 Zeilen. Der Kontaktbogen nannte sie 'sichtbare Zellen'."""
    script = _load("show_errors")
    rows = [{"coverage": None, "label": "wP", "square": "a1", "session_id": "s"},
            {"coverage": 0.0, "label": "wP", "square": "a2", "session_id": "s"},
            {"coverage": 0.9, "label": "wP", "square": "a3", "session_id": "s"}]
    wrong, seen, blind = script.collect_wrong(rows, [0, 0, 0], [1, 0, 1], [0.5] * 3,
                                              ["wP", "bP"])
    assert blind == 1, "die ungemessene Zeile muss als solche gezaehlt werden"
    assert seen == 2 and len(wrong) == 1
    assert script.cov_str(None) != script.cov_str(0.0), "blind liest sich sonst wie frei"
