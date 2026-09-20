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


def test_wachen_uebergibt_blanke_knoepfe(monkeypatch):
    # Mit `set:`-Praefix hiess der Knopf `set:motionThr` und der Katalog warf. Die Basispruefung
    # uebergibt keinen Knopf und lief deshalb durch — der Fehler blieb bis zum ersten Versuch still.
    gesehen = {}

    class Proc:
        stdout = "veto:shadow=1 veto:occlusion=2\n"
        stderr = ""
        returncode = 0

    def fake_run(argv, **kwargs):
        gesehen["argv"] = argv
        return Proc()

    monkeypatch.setattr(ok.subprocess, "run", fake_run)

    assert ok.wachen({"motionThr": 0.5}) == {"veto:shadow": 1, "veto:occlusion": 2}
    assert "motionThr=0.5" in gesehen["argv"]
    assert not any(a.startswith("set:") for a in gesehen["argv"])


def test_eine_stumme_pruefung_nennt_stderr(monkeypatch):
    # Der .bat-Rahmen verschluckt den Exit-Code, also ist stderr die einzige Spur.
    class Proc:
        stdout = ""
        stderr = "unknown knob 'set:motionThr'"
        returncode = 0

    monkeypatch.setattr(ok.subprocess, "run", lambda *a, **k: Proc())

    with pytest.raises(RuntimeError, match="unknown knob"):
        ok.wachen({"motionThr": 0.5})
