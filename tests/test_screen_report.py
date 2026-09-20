"""Die drei Fehler, die `screen_report` beim Bauen hatte — je einer als Test.

Alle drei waren still: der Bericht sah plausibel aus und war falsch. Zwei davon haetten einen
Befund erfunden, der dritte haette ein Phantom durchgelassen.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


def _modul():
    spec = importlib.util.spec_from_file_location("screen_report", ROOT / "scripts/screen_report.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


SCORE = """score vs x.json — model m, label 4 plies, run 4 plies
  found 3:
    Rxc8     label frame    100   run frame    102  (cnn_occupancy)
    Rxc8     label frame    200   run frame    205  (cnn_pair)
    e4       label frame    300   run frame    299  (cnn_occupancy)
  reordered 0 (same end position, order unprovable):
  missed 1:
    Nf6      label frame    400
  invented 2 (phantoms — the veto):
  beyond 5 (after the reference end):
obs-cache: 10 hits, 0 misses
"""


@pytest.fixture
def log(tmp_path: Path) -> Path:
    p = tmp_path / "ARM--rec.log"
    p.write_text(SCORE, encoding="utf-8")
    return p


def test_derselbe_zug_zweimal_zaehlt_zweimal(log: Path) -> None:
    # Auf den SAN allein geschluesselt ueberschrieb der zweite `Rxc8` den ersten — der Bericht
    # meldete 75 statt 78 Treffer. Drei `Rxc8` in einem Clip sind gemessen, nicht konstruiert.
    assert len(_modul().read_log(log)["found"]) == 3


def test_veto_und_nachlauf_werden_gelesen(log: Path) -> None:
    row = _modul().read_log(log)
    assert (row["invented"], row["beyond"], row["reordered"]) == (2, 5, 0)


def test_vergleich_traegt_alle_vier_achsen() -> None:
    # `recoveryMaxPlies=2` verlor drei Commits, die als `beyond` zaehlten, und galt als
    # wirkungslos. Ein Phantom bei gleichem found/missed waere genauso durchgerutscht.
    mod = _modul()
    basis = {"found": 78, "missed": 3, "invented": 0, "beyond": 3}
    assert mod._tally({**basis, "beyond": 0}) != mod._tally(basis)
    assert mod._tally({**basis, "invented": 1}) != mod._tally(basis)
    assert mod._tally(dict(basis)) == mod._tally(basis)
