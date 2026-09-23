"""Skript-Jagd 2026-09-22: Werkzeuge, die eine Luecke als Messwert weiterreichten."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

from conftest import write_jsonl

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))


def test_cross_eval_meldet_den_abgestuerzten_lauf_statt_mit_null_zu_enden(monkeypatch):
    """`check=False` ohne Auswertung machte aus einem Absturz eine fehlende Tabellenzeile."""
    import cross_eval

    seen = []
    monkeypatch.setattr(cross_eval, "RUNS", [("run-a", "ds"), ("run-b", "ds")])
    monkeypatch.setattr(cross_eval, "trained_on_val", lambda p: False)
    monkeypatch.setattr(cross_eval.Path, "exists", lambda self: True)
    monkeypatch.setattr(cross_eval.subprocess, "run",
                        lambda *a, **k: seen.append(a) or subprocess.CompletedProcess([], 1))
    assert cross_eval.main() == 1, "ein gescheiterter eval darf nicht als gelungen enden"
    assert len(seen) == 2, "der zweite Lauf soll trotzdem noch versucht werden"


def test_thin_arms_verwirft_den_fortgesetzten_lauf(tmp_path):
    """Ein Lauf, der seine ersten Epochen ein zweites Mal schrieb, kam als vollstaendig durch.

    Der Zwilling `compare_arms.tail_mean` prueft eindeutige, lueckenlose Epochen; hier zaehlte
    nur die Zeilenzahl. Auf der Platte tragen 2 von 307 `metrics.jsonl` genau diese Form.
    """
    import thin_arms_report as tar

    ganz = [{"epoch": i, tar.METRIC: 0.9} for i in range(60)]   # das Rezept der Arme
    write_jsonl(tmp_path / "ganz" / "metrics.jsonl", ganz)
    assert tar.tail_mean(tmp_path / "ganz") == pytest.approx(0.9)

    write_jsonl(tmp_path / "weiter" / "metrics.jsonl", ganz[:5] + ganz)
    assert tar.tail_mean(tmp_path / "weiter") is None, "fortgesetzter Lauf ist nicht rangfaehig"
    write_jsonl(tmp_path / "kurz" / "metrics.jsonl", ganz[:-1])
    assert tar.tail_mean(tmp_path / "kurz") is None, "abgebrochener Lauf ist nicht rangfaehig"


def _trace(d: Path, name: str) -> None:
    d.mkdir(parents=True, exist_ok=True)
    write_jsonl(d / f"{name}.jsonl", [{"kind": "frame", "index": 1, "timeMs": 100},
                                {"kind": "decision", "index": 1, "ply": 1, "uci": "e2e4",
                                 "accepted": True}])
    (d / f"{name}.log").write_text("found 1:\nmissed 0:\ninvented 0:\nbeyond 0:\nreordered 0:\n",
                                   encoding="utf-8")


def test_commit_latency_ab_laesst_die_unpaarige_aufnahme_nicht_stumm_fallen(tmp_path):
    """Je Zeile blieb die Zahl ehrlich, die SUMME nicht — die Aufnahme verschwand ohne Wort."""
    import commit_latency_ab as ab

    base, cand = tmp_path / "base", tmp_path / "cand"
    _trace(base, "aufnahme-a")
    _trace(base, "aufnahme-b")
    _trace(cand, "aufnahme-a")
    rows = ab.compare(base, cand)
    assert [r["recording"] for r in rows] == ["aufnahme-a", "aufnahme-b"]
    fehlend = [r for r in rows if r.get("missing")]
    assert len(fehlend) == 1 and fehlend[0]["recording"] == "aufnahme-b"
    assert fehlend[0]["base"]["found"] == 1, "die Basis-Zahl bleibt lesbar"
    assert fehlend[0]["cand"]["found"] is None, "erfunden wird nichts"


def _dataset(tmp_path: Path) -> tuple[Path, list[dict]]:
    """Ein Datensatz mit zwei Sitzungen, einem Pack und einer Zeile, die der Pack nicht traegt."""
    rows = [{"path": f"mm://p-80/{i:06d}/a1", "label": "wP" if i % 2 else "empty",
             "session_id": "s-train" if i < 8 else "s-val"} for i in range(12)]
    ds = tmp_path / "data" / "datasets" / "d"
    write_jsonl(ds / "manifest.jsonl", rows)
    pack = tmp_path / "data" / "packs" / "p-80"
    pack.mkdir(parents=True)
    (pack / "packed_meta.json").write_text(
        json.dumps({"paths": [r["path"] for r in rows[:-1]]}), encoding="utf-8")
    return ds, rows


def test_drop_dead_rows_zieht_split_json_nach(tmp_path, monkeypatch):
    """Das Manifest wurde neu geschrieben, `split.json` behielt die alten Zaehlungen.

    In diesem Projekt ist `split.json` die einzige Wahrheit ueber den Split — steht seine
    `counts`/`class_weights` auf Zeilen, die es nicht mehr gibt, misst jeder Lauf danach gegen
    eine Zahl, die niemand mehr nachrechnen kann. 12 Datensaetze auf der Platte tragen heute
    tote Zeilen, vier davon mit `split*.json`.
    """
    import drop_dead_rows as dd

    from chesslab import dataset as dataset_mod

    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(dataset_mod, "load_priority_paths", lambda *a, **k: None)
    ds, rows = _dataset(tmp_path)
    split = dataset_mod.make_split(rows, 0.2, 0.0, None, 42,
                                   precomputed_splits={"train": ["s-train"], "val": ["s-val"],
                                                       "test": []})
    (ds / "split.json").write_text(json.dumps(split), encoding="utf-8")
    assert split["counts"]["val"] == 4

    assert dd.main(["d"]) == 0
    neu = json.loads((ds / "split.json").read_text(encoding="utf-8"))
    assert neu["counts"]["val"] == 3, "die tote Zeile lag im val-Split"
    assert neu["train_class_counts"] == split["train_class_counts"], "train blieb unberuehrt"
    assert neu["dead_rows_dropped"]["n"] == 1


def test_drop_dead_rows_benennt_die_fold_datei_die_es_nicht_rechnen_kann(tmp_path, monkeypatch):
    """Eine Fold-Datei deckt nicht jede Sitzung — sie neu zu rechnen hiesse, sie zu erfinden."""
    import drop_dead_rows as dd

    from chesslab import dataset as dataset_mod

    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(dataset_mod, "load_priority_paths", lambda *a, **k: None)
    ds, rows = _dataset(tmp_path)
    (ds / "split-f0.json").write_text(
        json.dumps({"seed": 42, "val_frac": 0.2, "test_frac": 0.0, "max_empty_ratio": None,
                    "max_class_ratio": None, "classes": [], "counts": {},
                    "splits": {"train": ["s-train"], "val": [], "test": []}}), encoding="utf-8")
    assert dd.main(["d"]) == 1, "eine nicht nachziehbare Split-Datei darf nicht stumm bleiben"


def test_coverage_gaps_nennt_die_ungemessenen_zellen_statt_sie_als_sichtbar_zu_buchen(tmp_path):
    """`coverage or 0.0` las die UNGEMESSENE Zelle als sauber sichtbaren Beleg.

    Neun Datensaetze auf der Platte tragen Figurenzellen, die zu 100 % ungemessen sind
    (`labeled-rg-2026-08-08-00-39-57-80`, sechs `phone-stored-*`, zwei `turntable*`). Fuer die
    meldete der Luecken-Bericht einen gedeckten Korpus ohne eine einzige Messung.
    """
    import coverage_gaps

    man = tmp_path / "manifest.jsonl"
    write_jsonl(man, [{"label": "wP", "square_color": "light", "brightness": 120.0, "coverage": None},
                {"label": "wP", "square_color": "light", "brightness": 120.0, "coverage": 0.0},
                {"label": "empty", "square_color": "dark", "brightness": 120.0, "coverage": 0.0}])
    seen, denom = coverage_gaps.counts("egal", str(man))
    assert denom == {"piece_rows": 2, "coverage_unmeasured": 1}
    assert sum(seen.values()) == 2, "die ungemessene Zeile zaehlt weiter mit — aber benannt"


def test_fold_per_session_haelt_den_fortgesetzten_fold_aus_der_tabelle(tmp_path):
    """`len(rows) < 60` nahm einen Lauf mit doppelt geschriebenen Epochen als fertigen Fold."""
    import fold_per_session as fps

    ganz = [{"epoch": i, "val_piece_acc": 0.9} for i in range(60)]
    write_jsonl(tmp_path / "f0" / "metrics.jsonl", ganz)
    assert fps.finished(tmp_path / "f0")
    write_jsonl(tmp_path / "f1" / "metrics.jsonl", ganz[:10] + ganz)
    assert not fps.finished(tmp_path / "f1"), "70 Zeilen sind keine 60 Epochen"
    write_jsonl(tmp_path / "f2" / "metrics.jsonl", ganz[:59])
    assert not fps.finished(tmp_path / "f2")


def test_rung_predictiveness_nimmt_den_fortgesetzten_lauf_nicht_in_die_kohorte(tmp_path):
    """Dritte Stelle derselben Regel: `len(s) >= epochs` zaehlte Zeilen, nicht Epochen.

    Hier kostet es doppelt — der Lauf kommt in die Kohorte UND `_mean(v, -tail, None)` mittelt
    danach ueber einen Schwanz, der die doppelt geschriebenen Epochen enthaelt.
    """
    import rung_predictiveness as rp

    ganz = [{"epoch": i, rp.METRIC: 0.9} for i in range(60)]
    write_jsonl(tmp_path / "a" / "metrics.jsonl", ganz)
    assert rp._series(tmp_path / "a", rp.METRIC, 60) is not None
    write_jsonl(tmp_path / "b" / "metrics.jsonl", ganz[:6] + ganz)
    assert rp._series(tmp_path / "b", rp.METRIC, 60) is None


def test_audit_sessions_teilt_den_zwilling_die_wache(tmp_path):
    """`audit_sessions` sprang stumm ueber unfertige Laeufe und zaehlte dabei nur Zeilen."""
    import audit_sessions

    ganz = [{"epoch": i} for i in range(60)]
    write_jsonl(tmp_path / "f1" / "metrics.jsonl", ganz[:10] + ganz)
    assert audit_sessions.finished(tmp_path / "f1") is False
