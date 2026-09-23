"""Skript-Jagd 2026-09-21: Messwerkzeuge, die einen fehlenden Lauf als Vergleich ausgaben."""
from __future__ import annotations

import re
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

VOLL = "  found {f}:\n  missed {m}:\n  invented {i} (phantoms)\n  beyond 0 (after)\n"
ABBRUCH = "starting replay ...\nException in thread main\n"


def _log(d: Path, name: str, text: str) -> None:
    d.mkdir(parents=True, exist_ok=True)
    (d / f"{name}.log").write_text(text, encoding="utf-8")


def test_compare_regression_zaehlt_den_abgebrochenen_lauf_nicht_mit(tmp_path, monkeypatch, capsys):
    """Die `-1` fuer "nicht geschrieben" landete ungeprueft in der Summe.

    Zwei abgestuerzte Laeufe verglichen sich ausserdem als (-1, -1) == (-1, -1) und gingen damit
    ohne Marke als unveraendert durch — genau das Urteil, das der Kommentar ausschliessen wollte.
    """
    import compare_regression

    monkeypatch.setattr(compare_regression, "ROOT", tmp_path)
    for tag, found in (("vorher", 10), ("nachher", 12)):
        d = tmp_path / "tmp" / "batch" / tag
        _log(d, "ganz", VOLL.format(f=found, m=1, i=0))
        _log(d, "abgebrochen", ABBRUCH)
    monkeypatch.setattr(sys, "argv", ["compare_regression.py", "vorher", "nachher"])

    compare_regression.main()
    out = capsys.readouterr().out

    summe = re.search(r"^found\s+(-?\d+) -> (-?\d+)", out, re.M)
    assert summe, out
    assert (int(summe.group(1)), int(summe.group(2))) == (10, 12), out
    assert "abgebrochen" in out and "-1" not in out


def test_guard_ablation_vergleicht_nur_denselben_aufnahmesatz(tmp_path, monkeypatch, capsys):
    """Ein Ablationslauf ueber weniger Aufnahmen ergab ein Delta und hiess dafuer "gedeckt".

    Live seit 2026-09-21: der Bezug faehrt 12 Aufnahmen, die abgelegten `abl-*` tragen 10.
    """
    import guard_ablation

    monkeypatch.setattr(guard_ablation, "ROOT", tmp_path)
    bezug = tmp_path / "tmp" / "batch" / "baseline-an"
    _log(bezug, "eins", VOLL.format(f=10, m=0, i=0))
    _log(bezug, "zwei", VOLL.format(f=20, m=0, i=0))
    # Dieselben Zahlen, nur eine Aufnahme fehlt: die Wache bewegt in Wahrheit NICHTS.
    _log(tmp_path / "tmp" / "batch" / "abl-wache", "eins", VOLL.format(f=10, m=0, i=0))
    monkeypatch.setattr(sys, "argv", ["guard_ablation.py"])

    guard_ablation.main()
    out = capsys.readouterr().out

    assert "gedeckt" not in out, out
    assert "Aufnahmesatz" in out, out


def test_occlusion_reserve_vergleicht_nur_arme_mit_denselben_aufnahmen(tmp_path, monkeypatch,
                                                                      capsys):
    """Die Prozentzeile stellte zwei Arme gegeneinander, die nicht dieselben Traces hatten."""
    import occlusion_reserve

    monkeypatch.setattr(occlusion_reserve, "ROOT", tmp_path)
    d = tmp_path / "tr"
    d.mkdir(parents=True)
    zeile = '{"kind": "frame", "occlVetoed": 1, "shadowVetoed": 0, "changed": 2}\n'
    for name in ("alt--eins", "alt--zwei", "champion--eins"):
        (d / f"{name}.jsonl").write_text(zeile, encoding="utf-8")
    monkeypatch.setattr(sys, "argv", ["occlusion_reserve.py", "--dir", "tr"])

    occlusion_reserve.main()
    out = capsys.readouterr().out

    assert "%" not in out.split("occlVetoed:")[-1], out
    assert "Aufnahmen" in out, out


def test_phone_vs_pc_verweigert_die_zeitbasis_die_es_nicht_gibt(tmp_path):
    """Ohne `video_sync` stand die Encoder-Basis auf 0 — jeder Handy-Frame lag daneben."""
    import numpy as np
    import phone_vs_pc

    (tmp_path / "timeline.jsonl").write_text(
        '{"kind": "decision", "accepted": true, "ply": 1, "elapsedNs": 1000000}\n',
        encoding="utf-8")

    with pytest.raises(SystemExit):
        phone_vs_pc.phone_side(tmp_path, [{"ply": 1, "frame": 5}], np.arange(100.0))
