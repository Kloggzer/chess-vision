"""Die Wachen-Nebenbedingung des Latenz-Optimierers (`docs/engine-fuzz.md`)."""

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
    # Vier harte Achsen; ohne Alarme kaufte der Champion Latenz mit zusaetzlichen Alarmen,
    # unbemerkt.
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


def _basis(alarme):
    return {r: {"found": 10, "invented": 0, "alarme": a, "latency": -100}
            for r, a in zip(ok.RECORDINGS, alarme, strict=True)}


def test_alarme_sind_ein_budget_ueber_den_satz(monkeypatch):
    # Der eigene Champion holt sich eine Episode in einer Aufnahme und spart acht in einer
    # anderen. Eine Regel je Aufnahme haette ihn verworfen, obwohl er netto ruhiger ist.
    laeufe = iter([1, 0, 0, 0, 0])
    monkeypatch.setattr(ok, "replay", lambda rec, cfg, tag: {
        "found": 10, "invented": 0, "alarme": next(laeufe), "latency": -120})

    row = ok.race({}, _basis([0, 8, 0, 0, 0]), "t")

    assert row["status"] == "ok", row


def test_ueber_dem_budget_bricht_das_rennen_ab(monkeypatch):
    laeufe = iter([3, 0, 0, 0, 0])
    monkeypatch.setattr(ok, "replay", lambda rec, cfg, tag: {
        "found": 10, "invented": 0, "alarme": next(laeufe), "latency": -120})

    row = ok.race({}, _basis([1, 1, 0, 0, 0]), "t")

    assert row["status"] == "alarm" and row["extra_alarme"] == 1, row


def test_der_warmstart_nimmt_nur_zeilen_der_eigenen_regel():
    # Ein Versuch, den die ALTE Regel verworfen hat, kann unter der neuen zulaessig sein.
    zeilen = [
        {"kind": "suche", "config": {}, "regel": ok.REGEL},
        {"kind": "suche", "config": {}, "regel": "w4-veto-je-aufnahme"},
        {"kind": "suche", "config": {}},
        {"kind": "basis", "rec": "x", "regel": ok.REGEL},
    ]

    passend = [x for x in zeilen if x.get("kind") == "suche" and "config" in x
               and x.get("regel") == ok.REGEL]

    assert len(passend) == 1
