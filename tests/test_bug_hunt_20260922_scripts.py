"""Skript-Jagd 2026-09-22: Messwerkzeuge, die Ungemessenes als Messwert weiterreichten."""
from __future__ import annotations

import json
import subprocess
import sys
import types
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))


def _stub_optuna() -> None:
    """`optimise_knobs` importiert optuna; die Sonde hier ruehrt nichts davon an."""
    if "optuna" in sys.modules:
        return
    mod = types.ModuleType("optuna")
    for name in ("trial", "samplers", "distributions", "logging"):
        sub = types.ModuleType(f"optuna.{name}")
        setattr(mod, name, sub)
        sys.modules[f"optuna.{name}"] = sub
    sys.modules["optuna"] = mod


#: Ein Replay-Log, wie es `desktop replay ... score` schreibt — mit Ergebnisblock.
GANZ = """tracked 1945 frames of video.mp4 at 30,00 fps
  found 2:
    e4 label frame 10 run frame 12 (exact)
    e5 label frame 40 run frame 44 (exact)
  missed 0:
  invented 0 (phantoms):
  beyond 0 (after):
"""

#: Derselbe Lauf, abgebrochen bevor der Vergleich gedruckt wurde — 5 von 428 Logs auf der Platte.
OHNE = """tracked 1945 frames of video.mp4 at 30,00 fps
cnn: state=Ready observations=1061 attempts=1945
"""


def _fake_run(text: str):
    def run(*_a, **_kw):
        return subprocess.CompletedProcess([], 0, stdout=text, stderr="")
    return run


def test_optimise_knobs_verbucht_den_lauf_ohne_ergebnisblock_nicht_als_null_treffer(
        tmp_path, monkeypatch):
    """Ein Replay ohne Score-Block kam als `found=0` zurueck.

    Damit wurde aus einem ABGEBROCHENEN Lauf eine gemessene Nebenbedingungs-Verletzung: `race`
    meldete `verlust` mit der vollen Basiszahl, und Optunas Constrained-TPE lernte daraus eine
    unzulaessige Region, die nie gemessen wurde. Als BASIS-Lauf ist es schlimmer — dann steht
    `found=0` dauerhaft in `trials.jsonl` und jeder spaetere Versuch besteht die Pruefung.
    `screen_knobs.run_arm` weist denselben Fall seit je laut ab.
    """
    _stub_optuna()
    import optimise_knobs

    monkeypatch.setattr(optimise_knobs, "OUT", tmp_path)
    monkeypatch.setattr(optimise_knobs.subprocess, "run", _fake_run(GANZ))
    assert optimise_knobs.replay("rec", {}, "T")["found"] == 2

    monkeypatch.setattr(optimise_knobs.subprocess, "run", _fake_run(OHNE))
    with pytest.raises(RuntimeError, match="Ergebnisblock"):
        optimise_knobs.replay("rec", {}, "T")


def test_chain_gate_liest_keine_fremden_modell_lesungen(tmp_path, monkeypatch):
    """`--skip-read` nahm JEDE vorhandene `model-reads.jsonl` — auch die eines anderen Modells.

    Die Rueckgabe stempelt `model: <angefragtes Modell>` darauf, also meldet das Gate die Guete
    eines fremden Laufs unter dem eigenen Namen. Auf der Platte liegen 27 solcher Dateien von
    SECHS verschiedenen Modellen — ein warmer Cache, der wie ein Ergebnis aussieht.
    """
    import chain_gate

    monkeypatch.chdir(tmp_path)
    sdir = tmp_path / "data" / "recordings" / "s1"
    sdir.mkdir(parents=True)
    (sdir / "model-reads.jsonl").write_text(
        json.dumps({"_model": "data/models/_folds/mnv3s128-f0", "_classes": []}) + "\n",
        encoding="utf-8")

    def nie(*_a, **_kw):
        raise AssertionError("model-read haette nicht laufen duerfen")

    monkeypatch.setattr(chain_gate.subprocess, "run", nie)
    with pytest.raises(RuntimeError, match="mnv3s128-f0"):
        chain_gate.run("s1", Path("data/models/p4a-80-clahe"), skip_read=True)


def test_emission_lag_erfindet_keine_dreissig_bilder_je_sekunde(tmp_path, monkeypatch):
    """`FPS = 30.0` stand fest, waehrend nur 9 der 27 Aufnahmen mit Lesungen so laufen.

    Zehn laufen mit ~15 fps: die Spalte "Sekunden" war dort um den Faktor zwei falsch. Und weil
    die Tabelle ueber ALLE uebergebenen Aufnahmen gepoolt wird, hat ein gemischter Aufruf
    ueberhaupt keine gemeinsame Zeitbasis. `commit_lag.py` weist denselben Fall seit 2026-09-21 ab.
    """
    import emission_lag

    monkeypatch.setattr(emission_lag, "ROOT", tmp_path)
    for name, fps in (("langsam", 14.97), ("schnell", 30.0)):
        d = tmp_path / name
        d.mkdir()
        (d / "candidate.json").write_text(json.dumps({"clock": {"fps": fps}}), encoding="utf-8")

    assert emission_lag.fps_for(["langsam"]) == pytest.approx(14.97)
    with pytest.raises(SystemExit, match="Zeitbasis|fps"):
        emission_lag.fps_for(["langsam", "schnell"])

    (tmp_path / "ohne").mkdir()
    (tmp_path / "ohne" / "candidate.json").write_text("{}", encoding="utf-8")
    with pytest.raises(SystemExit, match="clock.fps"):
        emission_lag.fps_for(["ohne"])


def test_phone_vs_pc_faellt_nicht_auf_dreissig_zurueck(tmp_path):
    """`frames / total if total else 30.0` — ohne Video eine erfundene Rate, still.

    38 der 51 Aufnahmeverzeichnisse tragen heute gar kein `video*.mp4` mehr; dort kam die Rate
    nicht aus der Messung, sondern aus der Konstanten, und JEDE Zahl dieses Skripts ist eine
    Sekundenangabe.
    """
    import phone_vs_pc

    with pytest.raises(SystemExit, match="Zeitbasis|Dauer"):
        phone_vs_pc.fps_of(tmp_path, 1000)


#: Die 13 Klassen plus die UNABHAENGIGE Coverage-Sigmoid in Spalte 13 (`config.IDENTITY_CLASSES`).
CLASSES = ["empty"] + [c + p for c in "wb" for p in "PNBRQK"]


def _coverage_dominant_model():
    """Ein Occlusion-Kopf, dessen Coverage-Spalte den groessten Ausgang hat.

    Genau der Fall, den die Aufrufer nicht abschnitten: `argmax` waehlt Spalte 13, und die ist
    keine Klasse. 50 der 59 Laeufe unter `data/models/` tragen `head: occlusion`.
    """
    import torch.nn as nn

    model = nn.Sequential(nn.Conv2d(3, 4, 3, padding=1), nn.AdaptiveAvgPool2d(1),
                          nn.Flatten(), nn.Linear(4, len(CLASSES) + 1))
    with __import__("torch").no_grad():
        model[3].bias.zero_()
        model[3].bias[len(CLASSES)] = 20.0
    return model


def _gradcam_cfg() -> dict:
    return {"classes": CLASSES, "out_size": [16, 16], "head": "occlusion"}


def test_gradcam_skripte_schneiden_die_coverage_spalte_ab(tmp_path, monkeypatch, capsys):
    """Beide Aufrufer legten `softmax`/`argmax` ueber alle 14 Spalten.

    Die Coverage ist eine eigene Sigmoid und kein Softmax-Teilnehmer: sie mischt sich sonst in
    jede Klassenwahrscheinlichkeit, und der Argmax kann sie selbst waehlen — dann zeigt
    `classes[idx]` ins Leere. `compute_cam` nimmt seit `69fb22ec` `n_classes`.
    """
    import gradcam as gradcam_cli
    import gradcam_summary
    import numpy as np
    from PIL import Image

    model = _coverage_dominant_model()
    cfg = _gradcam_cfg()
    monkeypatch.setattr(gradcam_cli, "load_run", lambda _r: (model, cfg))
    monkeypatch.setattr(gradcam_summary, "load_run", lambda _r: (model, cfg))

    crop = tmp_path / "e4.png"
    Image.fromarray(np.full((16, 16, 3), 120, np.uint8)).save(crop)
    monkeypatch.setattr(sys, "argv", ["gradcam.py", str(tmp_path / "run"), str(crop),
                                      "--out", str(tmp_path / "m.png")])
    assert gradcam_cli.main() == 0
    assert capsys.readouterr().out.split(":")[1].strip().split(" ")[0] in CLASSES

    _acc, _cm, _pc, ex, classes = gradcam_summary.collect(
        tmp_path / "run", [{"path": str(crop), "label": "wP"}], 16, 1)
    assert ex[0][3] in classes
