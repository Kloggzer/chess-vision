"""Rote Belege aus der Skript-Jagd 2026-09-17: drei Zahlen, die niemand nachrechnet.

Alle drei sitzen in `scripts/`, tragen Entscheidungen und hatten keinen Test:
der Risiko-Zaehler von `hand_audit`, die p90-Spalte von `phone_vs_pc`/`settle_compare`
und die Abschlusstabelle von `fold_per_session`.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
import pytest

from chesslab.training.pack import PackedIndex

ROOT = Path(__file__).resolve().parents[1]


def _load(name: str):
    spec = importlib.util.spec_from_file_location(f"_script_{name}", ROOT / "scripts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


# --- 1. `hand_audit`: leere `concepts` sind GEMESSEN, nur `coverage is None` ist blind ----------

def test_hand_audit_does_not_call_a_measured_empty_matte_blind():
    """2 320 Korpuszeilen tragen `concepts: {}` mit voll gemessener Coverage, 684 davon mit
    Schmutzgrund. Ueber `concepts` gepruefte Zeilen galten geschlossen als `blind` und damit als
    RISIKO — die Zahl, die das Skript ausrechnet."""
    hand_audit = _load("hand_audit")
    measured = {"concepts": {}, "dirty_reason": "occluded",
                "coverage": {f"{f}{r}": 0.0 for r in range(1, 9) for f in "abcdefgh"}}

    assert hand_audit.classify(measured, "occluded", 0.0, "e4") is None
    assert hand_audit.classify({**measured, "dirty_reason": "stale"}, "stale", 0.0, "e4") == "spaet"

    # Die echte Absage — `skipped`, "zone too big" — bleibt blind.
    refused = {"concepts": {}, "dirty_reason": "occluded", "coverage": None}
    assert hand_audit.classify(refused, "occluded", 0.0, "e4") == "blind"
    assert hand_audit.classify(None, "occluded", 0.0, "e4") == "blind"


# --- 2. p90 war bei n = 10 das Maximum ---------------------------------------------------------

def test_phone_vs_pc_p90_is_not_the_maximum():
    """`int(0,9 * n)` ist bei n = 10 der Index 9, also `max` — die Spalte log neben `max`
    dieselbe Zahl. `commit_lag.py`, `commit_budget.py` und `settle_lag.py` rechnen es richtig."""
    phone_vs_pc = _load("phone_vs_pc")
    ten = [float(x) for x in range(1, 11)]

    assert phone_vs_pc.p90(ten) == 9.0
    assert phone_vs_pc.p90(ten) != max(ten)
    assert phone_vs_pc.p90([5.0]) == 5.0

    line = phone_vs_pc.stats(ten)
    assert "p90  9.00" in line and "max 10.00" in line


def test_settle_compare_uses_the_same_p90():
    settle_compare = _load("settle_compare")
    assert settle_compare.p90([float(x) for x in range(1, 11)]) == 9.0


# --- 3. `fold_per_session`: die Abschlusstabelle lief nie ---------------------------------------

def _fold_fixture(tmp_path: Path):
    """Ein Datensatz mit Pack und zwei Folds, klein genug fuer den Test."""
    dd = tmp_path / "ds"
    (dd / "packs").mkdir(parents=True)
    rows = []
    for fold, sess in (("f0", "s-hoch"), ("f1", "s-tief")):
        (dd / f"split-{fold}.json").write_text(
            json.dumps({"splits": {"test": [sess]}}), encoding="utf-8")
        rows += [{"path": f"{sess}/{i}", "session_id": sess, "coverage": 0.0,
                  "label": "wP" if i else "empty", "_packed_idx": len(rows) + i}
                 for i in range(2)]
    (dd / "manifest.jsonl").write_text(
        "".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")

    pack = dd / "packed_images.u8"
    np.zeros((len(rows), 4, 4, 3), dtype=np.uint8).tofile(pack)
    folds = tmp_path / "folds"
    for fold in ("f0", "f1"):
        (folds / f"run-{fold}").mkdir(parents=True)
        (folds / f"run-{fold}" / "metrics.jsonl").touch()
    return dd, rows, pack, folds


def test_fold_per_session_prints_its_summary_table(tmp_path, monkeypatch, capsys):
    """Die Abschlusstabelle entpackte einen Dreier in vier Namen und sortierte nach `kv[1][3]`.
    Ein voller Fold-Lauf brach also NACH der ganzen GPU-Arbeit mit `IndexError` ab; die Helfer
    `sorted_rows`/`table_line` lagen daneben und wurden nie gerufen."""
    fold_per_session = _load("fold_per_session")
    dd, rows, pack, folds = _fold_fixture(tmp_path)

    def fake_read_jsonl(path):
        if Path(path).name == "metrics.jsonl":
            return [{"epoch": i} for i in range(60)]
        return [json.loads(line) for line in Path(path).read_text(encoding="utf-8").splitlines()]

    monkeypatch.setattr(fold_per_session, "dataset_dir", lambda name: dd)
    monkeypatch.setattr(fold_per_session, "read_jsonl", fake_read_jsonl)
    monkeypatch.setattr("chesslab.training.pack.load_packed",
                        lambda name, *a, **k: PackedIndex(str(pack), (len(rows), 4, 4), None))
    monkeypatch.setattr(fold_per_session.occluded_model, "all_reads",
                        lambda run, crops: [{"pred_label": "wP"} for _ in crops])
    monkeypatch.setattr(sys, "argv", ["fold", "--dataset", "ds", "--folds", str(folds)])

    fold_per_session.main()

    out = capsys.readouterr().out
    assert "s-hoch" in out and "s-tief" in out
    # `piece` ist hier 1.0 auf beiden, `visible` 0.5 — die Tabelle steht, statt zu sterben.
    assert out.count("1.0000") >= 2


def test_fold_per_session_reports_a_session_two_folds_held_back(tmp_path, monkeypatch, capsys):
    """`out[(sess, fold)]` verschluckt nichts mehr, aber gemeldet wurde es auch nie."""
    fold_per_session = _load("fold_per_session")
    dd, rows, pack, folds = _fold_fixture(tmp_path)
    (dd / "split-f1.json").write_text(json.dumps({"splits": {"test": ["s-hoch"]}}),
                                      encoding="utf-8")

    def fake_read_jsonl(path):
        if Path(path).name == "metrics.jsonl":
            return [{"epoch": i} for i in range(60)]
        return [json.loads(line) for line in Path(path).read_text(encoding="utf-8").splitlines()]

    monkeypatch.setattr(fold_per_session, "dataset_dir", lambda name: dd)
    monkeypatch.setattr(fold_per_session, "read_jsonl", fake_read_jsonl)
    monkeypatch.setattr("chesslab.training.pack.load_packed",
                        lambda name, *a, **k: PackedIndex(str(pack), (len(rows), 4, 4), None))
    monkeypatch.setattr(fold_per_session.occluded_model, "all_reads",
                        lambda run, crops: [{"pred_label": "wP"} for _ in crops])
    monkeypatch.setattr(sys, "argv", ["fold", "--dataset", "ds", "--folds", str(folds)])

    fold_per_session.main()
    assert "in mehreren Folds im Test: s-hoch (f0/f1)" in capsys.readouterr().out


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))
