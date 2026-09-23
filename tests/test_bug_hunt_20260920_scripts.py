"""Skript-Jagd 2026-09-20: Stellen in `scripts/`, die NICHT GEMESSEN als Messung lesen."""
from __future__ import annotations

import importlib
import json
import sys
from pathlib import Path

import pytest

from conftest import write_jsonl

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))


def test_plan_setups_faerbt_a1_dunkel_wie_der_rest_des_projekts():
    """`plan_setups` rechnete mit dem 1-BASIERTEN Rang und drehte damit jede Feldfarbe um."""
    import plan_setups

    from chesslab.labeling import all_squares, square_color

    assert [plan_setups.square_color(sq) for sq in all_squares()] == \
           [square_color(sq) for sq in all_squares()]


def test_episode_eval_zaehlt_die_haelfte_nicht_als_mehrheit():
    """`e * 2 <= len(ep)` liess das Unentschieden gewinnen — bei 2 Zellen und 1 Fehler."""
    import episode_eval

    rows = [{"session_id": "s", "square": "e4", "frame": "1", "ply": 0, "label": "wP"},
            {"session_id": "s", "square": "e4", "frame": "2", "ply": 1, "label": "wP"}]

    assert episode_eval.score(rows, [True, False])["majority_acc"] == 0.0


def test_chain_decode_verweigert_lesungen_ohne_coverage(tmp_path, monkeypatch):
    """`1.0 - (cov or 0.0)` gab der ungemessenen Zelle das VOLLE Stimmgewicht."""
    import chain_decode

    monkeypatch.setattr(chain_decode, "ROOT", tmp_path)
    write_jsonl(tmp_path / "s" / "model-reads.jsonl",
           [{"frame": "1", "square": "e4", "probs": {"empty": 0.9, "wP": 0.1}}])

    with pytest.raises(SystemExit):
        chain_decode.load_reads("s", 1e-6, True, 1.0, "model-reads.jsonl")


def test_occlusion_gate_loescht_die_messung_die_sam_zurueckzieht(tmp_path, monkeypatch):
    """Eine Zeile ohne `coverage` ist SAMs Absage und die JUENGERE Aussage (`read_matte`)."""
    import occlusion_gate

    monkeypatch.setattr(occlusion_gate, "ROOT", tmp_path)
    write_jsonl(tmp_path / "s" / "matte.jsonl",
           [{"frame": "1", "coverage": {"e4": 0.0}}, {"frame": "1", "skipped": "zone too big"}])
    write_jsonl(tmp_path / "s" / "model-reads.jsonl",
           [{"frame": "1", "square": "e4", "fen_label": "wP", "model_cov": 0.2,
             "probs": {"wP": 0.9, "empty": 0.1}}])

    assert occlusion_gate.collect("model-reads.jsonl", ["s"]) == []


def test_heldout_label_audit_loescht_die_zurueckgezogene_messung(tmp_path):
    """Dieselbe Absage, derselbe Fehler: `if cells:` uebersprang sie, statt sie wirken zu lassen."""
    import heldout_label_audit

    write_jsonl(tmp_path / "matte.jsonl",
           [{"frame": "1", "coverage": {"e4": 0.9}}, {"frame": "1", "skipped": "zone too big"}])

    assert heldout_label_audit.coverage_of(tmp_path) == {}


def test_test_used_verweigert_eine_unlesbare_auswertung(tmp_path):
    """Der Herkunftspruefer selbst: ein halbes `eval_test.json` hiess bisher "nichts verbrannt"."""
    import test_used

    (tmp_path / "run").mkdir()
    (tmp_path / "run" / "eval_test.json").write_text('{"per_session": {"rg-a": ', encoding="utf-8")

    with pytest.raises(SystemExit):
        test_used.burned(tmp_path)


def test_cross_eval_verweigert_einen_lauf_ohne_split(tmp_path, monkeypatch):
    """`return False` meldete UNBEKANNTE Herkunft als saubere Herkunft."""
    import cross_eval

    monkeypatch.chdir(tmp_path)
    run = tmp_path / "run"
    run.mkdir()
    (run / "config.json").write_text(json.dumps({"dataset": "weg"}), encoding="utf-8")

    with pytest.raises(SystemExit):
        cross_eval.trained_on_val(run)


def test_screen_knobs_verweigert_einen_arm_ohne_punktestand(monkeypatch):
    """`max(value, 0)` machte aus dem `-1` fuer "kein Score im Log" eine gemessene 0."""
    import screen_knobs

    monkeypatch.setattr(screen_knobs, "RECORDINGS", ["r"])
    monkeypatch.setattr(screen_knobs, "run_one", lambda tag, extra, rec: screen_knobs.score_of(""))

    with pytest.raises(SystemExit):
        screen_knobs.run_arm("BASIS", [], 1)


def test_screen_report_summiert_das_ungemessene_nicht_weg():
    """Ein echter Cache-Miss plus ein Log ohne Cache-Zeile ergab in der Summe 0."""
    import screen_report

    def run(misses: int) -> dict:
        return {"found": {}, "missed": [], "invented": 0, "beyond": 0, "reordered": 0,
                "stuck": {}, "recovery_plies": 0, "pairs": 0, "alarms": 0, "occl_veto_lines": 0,
                "cache_hits": misses, "cache_misses": misses}

    out = screen_report.summarise({"a": run(1), "b": run(-1)}, {})

    assert (out["cache_misses"], out["cache_unmeasured"]) == (1, 1)


def test_die_ratsche_sieht_auch_den_zeilenschnitt_in_einer_comprehension():
    """`_iterated_lines` lief nur ueber `ast.For` — `[json.loads(l) for l in fh]` blieb unsichtbar,
    und `for i, line in enumerate(fh)` ebenso, weil das Ziel ein Tupel ist."""
    ratchet = importlib.import_module("tests.test_jsonl_readers")
    quelle = ("import json\n"
              "def a(fh): return [json.loads(line) for line in fh]\n"
              "def b(fh):\n"
              "    for i, line in enumerate(fh):\n"
              "        json.loads(line)\n")

    assert ratchet._iterated_lines(quelle) == 2


def test_der_session_pack_hat_einen_oeffner(tmp_path):
    """Vier Skripte bauten `packed_meta.json` + `np.memmap` woertlich nach; `open_pack` ist die
    eine Aufloesung fuer den SESSION-Pack, wie `open_packed_rows` fuer den Datensatz-Pack."""
    import crop_redundancy
    import crop_redundancy_plot
    import numpy as np
    import thin_dataset

    assert (crop_redundancy_plot.runs_of, crop_redundancy_plot.thumbs,
            crop_redundancy_plot.farthest, thin_dataset.farthest_point, thin_dataset.open_pack) == \
           (crop_redundancy.runs_of, crop_redundancy.thumbs, crop_redundancy.farthest_point,
            crop_redundancy.farthest_point, crop_redundancy.open_pack)

    pixels = np.arange(2 * 4 * 4 * 3, dtype=np.uint8).reshape(2, 4, 4, 3)
    (tmp_path / "packed_images.u8").write_bytes(pixels.tobytes())
    (tmp_path / "packed_meta.json").write_text(
        json.dumps({"n": 2, "h": 4, "w": 4, "paths": ["a.png", "b.png"]}), encoding="utf-8")

    mm, index = crop_redundancy.open_pack(tmp_path)

    assert index == {"a.png": 0, "b.png": 1}
    assert np.array_equal(np.asarray(mm), pixels)
