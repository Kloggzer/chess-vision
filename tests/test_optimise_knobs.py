"""Die Wachen-Nebenbedingung des Latenz-Optimierers.

Der Regressionssatz misst diese Achse nicht — er lieferte 396/3/0/171 mit UND ohne
Verdeckungsschutz. Latenz gewinnt man, indem man Tore aufmacht, also braucht die Freigabe
eine eigene Achse dafuer (`docs/engine-fuzz.md`).
"""

from __future__ import annotations

import pytest
from scripts import optimise_knobs as ok


@pytest.fixture
def _wachen(monkeypatch):
    def setze(antwort: dict[str, int]) -> None:
        monkeypatch.setattr(ok, "wachen", lambda _config: antwort)

    return setze


def test_stummes_veto_gilt_als_entwaffnet(_wachen):
    _wachen({"veto:shadow": 0, "veto:occlusion": 7})

    assert ok.entwaffnet({"motionThr": 0.9}, {"veto:shadow": 51, "veto:occlusion": 20}) == [
        "veto:shadow"
    ]


def test_eine_wache_die_schon_in_der_basis_schweigt_zaehlt_nicht(_wachen):
    # Sonst waere jede Konfiguration unzulaessig, sobald das Testszenario eine Achse nie erreicht.
    _wachen({"veto:shadow": 0, "veto:occlusion": 0})

    assert ok.entwaffnet({}, {"veto:shadow": 0, "veto:occlusion": 20}) == ["veto:occlusion"]


def test_scharfe_wachen_sind_zulaessig(_wachen):
    _wachen({"veto:shadow": 3, "veto:occlusion": 1})

    assert ok.entwaffnet({}, {"veto:shadow": 51, "veto:occlusion": 20}) == []


def test_constraints_tragen_veto_und_alarm():
    # Vier harte Achsen. Alarme fehlten bis 2026-09-20: der Champion kaufte 437 Frames Latenz
    # mit zwei zusaetzlichen, und nichts in der Suche sah das.
    class Trial:
        user_attrs = {"fehlende_treffer": 0.0, "phantome": 0.0,
                      "entwaffnet": 1.0, "extra_alarme": 2.0}

    assert ok.constraints(Trial()) == (0.0, 0.0, 1.0, 2.0)
