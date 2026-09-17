"""Skript-Jagd 2026-09-17, Runde 2: Zahlen, die dem Menschen vorgelegt werden.

Die drei Reste aus Runde 1 (`settle_compare`, `phantoms_vs_neighbours`, `chain_gate` /
`audit_disk_damage`) und vier neue Funde in den Skripten, die Entscheidungen tragen:
`coverage_arms`, `compare_arms`, `fold_per_session`, `matte_cell_audit`.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[1]


def _load(name: str):
    spec = importlib.util.spec_from_file_location(f"_script2_{name}", ROOT / "scripts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


# --- 1. `settle_compare`: jede Spanne leer riss den Lauf am Ende um ----------------------------

def test_settle_compare_survives_gaps_whose_spans_are_all_empty():
    """Wenn `pc_q == ph_q` ist, hat die Spanne keine Frames — `over_share` bleibt leer und
    `st.median([])` warf `StatisticsError`, NACHDEM die Tabelle schon gedruckt war."""
    settle_compare = _load("settle_compare")

    line = settle_compare.share_line([], 7)
    assert "n=0 von 7 Plies" in line
    assert "0.00" not in line          # keine gemessene Null vortaeuschen

    assert settle_compare.share_line([0.5, 0.5, 1.0], 3) == "median 0.50 (n=3)"


# --- 2. `phantoms_vs_neighbours`: der leere Bucket meldete n=1 und mean nan --------------------

def test_phantoms_vs_neighbours_empty_bucket_is_not_a_measurement():
    """`buckets.get(0) or [np.nan]` machte aus "nie beobachtet" ein n=1 mit mean nan; das
    Verhaeltnis der Mittel wurde still `nan`."""
    pvn = _load("phantoms_vs_neighbours")

    assert pvn._band(np.array([], dtype=float)) == "n=0 — nicht gemessen"
    assert "n=1" not in pvn._band(np.array([], dtype=float))

    band = pvn._band(np.array([0.1, 0.3], dtype=float))
    assert "n=2" in band and "mean 0.2000" in band


# --- 3a. `chain_gate`: die uebersprungene Session fehlte in der GESAMT-Zeile --------------------

def _chain_gate_main(tmp_path, monkeypatch, sessions, results, capsys):
    chain_gate = _load("chain_gate")
    monkeypatch.setattr(chain_gate, "run", lambda s, *a, **k: results[s]())
    monkeypatch.setattr(sys, "argv", ["chain_gate", "--model", str(tmp_path),
                                      "--sessions", sessions])
    code = chain_gate.main()
    return code, capsys.readouterr().out


def test_chain_gate_total_names_the_sessions_it_could_not_measure(tmp_path, monkeypatch, capsys):
    ok = {"found": 10, "missed": 1, "invented": 0, "plies": 11}
    results = {"a": lambda: dict(ok), "b": _raise}
    code, out = _chain_gate_main(tmp_path, monkeypatch, "a,b", results, capsys)

    assert code == 0
    assert "1 uebersprungen: b" in out
    assert "von 11 Plies in 1 Sessions" in out


def test_chain_gate_says_so_when_every_session_was_skipped(tmp_path, monkeypatch, capsys):
    """Ohne `out` schwieg das Skript komplett und gab 0 zurueck — ein Lauf, der NICHTS
    gemessen hat, sah aus wie ein Lauf ohne Befund."""
    code, out = _chain_gate_main(tmp_path, monkeypatch, "a,b",
                                 {"a": _raise, "b": _raise}, capsys)

    assert code == 1
    assert "keine Session gemessen" in out
    assert "2 uebersprungen: a, b" in out


def _raise():
    raise RuntimeError("gesperrt")


# --- 3b. `audit_disk_damage`: der Schadens-Auditor meldete "nichts gefunden" ohne Messung ------

def test_audit_disk_damage_separates_blind_recordings_from_clean_ones(monkeypatch, capsys):
    """Eine Aufnahme, von der keine einzige Coverage-Zeile pruefbar war, verschwand — der
    Bericht las sich fuer sie wie "sauber"."""
    audit = _load("audit_disk_damage")
    audit.UNMEASURED.clear()
    audit.BROKEN_LINES.clear()
    audit.UNMEASURED["rg-2026-01-01"] = "0 von 12 Zeilen pruefbar"

    monkeypatch.setattr(audit, "close_seams_half_applied", lambda: [])
    monkeypatch.setattr(audit, "coverage_disagrees_with_its_alpha", lambda: [])
    monkeypatch.setattr(audit, "black_frames_in_plates", lambda: [])
    monkeypatch.setattr(audit, "log_rows_without_their_file", lambda: [])
    audit.main()
    out = capsys.readouterr().out

    assert "rg-2026-01-01: 0 von 12 Zeilen pruefbar" in out
    assert "-> 1 Aufnahmen nicht gemessen" in out


# --- 4. `coverage_arms`: 0 von 0 als gemessene Precision 0,000 --------------------------------

def test_coverage_arms_prints_no_zero_for_an_empty_sample(capsys):
    """Bei `Flags = 0` stand dort `0.000` — die Zeile, auf der "Kopf raus, Spezialist rein"
    entschieden wuerde, las sich wie ein miserabler Arm statt wie eine leere Stichprobe."""
    arms = _load("coverage_arms")

    # Kein Flag: Precision hat keinen Nenner. Recall 0 ist dagegen echt gemessen.
    arms.curve(np.array([0.0, 0.0, 0.9, 0.9]), np.zeros(4), "test", (0.5,))
    line = [x for x in capsys.readouterr().out.splitlines() if x.strip().startswith("0.50")][0]
    assert line.split()[1] == "—" and line.split()[2] == "0.000"

    # Keine verdeckte Zelle in der Wahrheit: Recall hat keinen Nenner, MAE auf Verdeckten auch nicht.
    arms.curve(np.zeros(4), np.array([0.0, 0.0, 0.9, 0.9]), "test", (0.5,))
    out = capsys.readouterr().out
    line = [x for x in out.splitlines() if x.strip().startswith("0.50")][0]
    assert line.split()[2] == "—" and line.split()[3] == "—"
    assert "auf verdeckten      —" in out and "nan" not in out


def test_coverage_arms_still_prints_real_numbers(capsys):
    arms = _load("coverage_arms")
    truth = np.array([0.0, 0.0, 0.9, 0.9])
    said = np.array([0.0, 0.9, 0.9, 0.9])

    arms.curve(truth, said, "test", (0.5,))
    line = [x for x in capsys.readouterr().out.splitlines() if x.strip().startswith("0.50")][0]

    assert "0.667" in line and "1.000" in line


# --- 5. `compare_arms`: gepaartes Mittel ueber unterschiedlich viele Seeds ---------------------

def _run(root: Path, name: str, epochs: int, value: float) -> None:
    d = root / name
    d.mkdir(parents=True)
    (d / "metrics.jsonl").write_text(
        "".join(f'{{"epoch": {e}, "val_loss": {value}}}\n' for e in range(epochs)),
        encoding="utf-8")


def test_compare_arms_says_over_how_many_seeds_it_paired(tmp_path, monkeypatch, capsys):
    """Der Basisarm hat drei Seeds, der Kandidat nur einen — beide Zeilen trugen `gepaart`
    ohne jeden Hinweis, dass die eine ueber ein Drittel der Grundgesamtheit gemittelt ist."""
    compare_arms = _load("compare_arms")
    for seed in (42, 43, 44):
        _run(tmp_path, f"base-s{seed}", 2, 1.0)
    _run(tmp_path, "cand-s42", 2, 0.5)

    monkeypatch.setattr(sys, "argv", ["compare_arms", "--root", str(tmp_path),
                                      "--baseline", "base", "--seeds", "42,43,44",
                                      "--epochs", "2", "--tail", "2"])
    compare_arms.main()
    out = capsys.readouterr().out

    cand = [x for x in out.splitlines() if x.strip().startswith("cand")]
    assert cand, out
    assert any("gepaart -0.5000 (n=1/3)" in line for line in cand), out
    assert "hat keine 60 Epochen" not in out     # die Legende log bei --epochs 2


# --- 6. `fold_per_session`: eine Test-Session ohne Zeilen fiel lautlos aus der Tabelle ---------

def test_fold_per_session_names_the_test_sessions_that_never_reached_the_table():
    """`duplicate_sessions` prueft nur "nicht zweimal". Die andere Haelfte der Zusage — jede
    Session GENAU einmal — hatte keine Gegenprobe, und `if not rows: continue` zog keinen
    Zaehler mit."""
    fps = _load("fold_per_session")
    expected = [("s1", "f0"), ("s2", "f0"), ("s3", "f1")]
    out = {("s1", "f0"): (10, 0.9, 0.8)}

    assert fps.missing_sessions(expected, out) == [("s2", "f0"), ("s3", "f1")]
    assert fps.missing_sessions(expected, dict.fromkeys(expected, (1, 1.0, 1.0))) == []


# --- 7. `matte_cell_audit`: der Nenner enthielt Flags, aus denen der Zaehler nie schoepft ------

def test_matte_cell_audit_share_uses_only_flags_whose_coverage_was_measured():
    """`missed` kann nur aus Flags kommen, die in der Coverage stehen; Flags ohne Eintrag
    trotzdem in den Nenner zu nehmen verduennt die Quote gegen eine fremde Grundgesamtheit."""
    from collections import Counter

    audit = _load("matte_cell_audit")
    stats = Counter({"Flags gesamt": 100, "flags with unknown coverage": 60,
                     "Flags ohne Coverage": 20})

    line = audit.share_line(stats)
    assert "50.0 %" in line            # 20 von 40 gemessenen, nicht 20 von 100
    assert "20.0 %" not in line
    assert "n=40 von 100 Flags" in line

    blind = Counter({"Flags gesamt": 7, "flags with unknown coverage": 7})
    assert "nichts gemessen" in audit.share_line(blind)


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))
