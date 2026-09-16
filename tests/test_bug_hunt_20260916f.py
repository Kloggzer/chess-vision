"""Rote Belege aus dem Skript-Audit 2026-09-16f: `scripts/`, die Zahlen erzeugen.

Alle Funde derselben Form: was NICHT gemessen wurde, liest das Skript als gemessenen Normalwert
— und die Kurve, die Bilanz oder das p90 entsteht darauf.
"""

from __future__ import annotations

import dataclasses
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _load(name: str):
    spec = importlib.util.spec_from_file_location(f"_script_{name}", ROOT / "scripts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")


def test_coverage_errors_refuses_reads_without_a_coverage_column(tmp_path, monkeypatch, capsys):
    """Ohne Occlusion-Kopf traegt kein Read `model_cov`; `or 0.0` macht daraus "nicht geflaggt".

    Ergebnis waere null FP bei null TP — makellose Precision, auf einem Lauf, der die Groesse gar
    nicht kennt. `occlusion_gate.py` verweigert denselben Fall laut.
    """
    ce = _load("coverage_errors")
    monkeypatch.setattr(ce, "ROOT", tmp_path)
    sess = tmp_path / "s1"
    _jsonl(sess / "matte.jsonl", [{"frame": "000100", "coverage": {"e4": 0.9, "e5": 0.9}}])
    _jsonl(sess / "reads.jsonl", [{"frame": "000100", "square": sq, "fen_label": "wP"}
                                  for sq in ("e4", "e5")])
    monkeypatch.setattr(sys, "argv", ["coverage_errors", "reads.jsonl", "s1"])

    ce.main()
    out = capsys.readouterr().out
    assert "[FAIL]" in out, out


def test_coverage_errors_counts_clean_frames_in_its_denominator(tmp_path, monkeypatch, capsys):
    """`per_frame` bekommt nur bei TP/FP/FN einen Eintrag — ein rundum richtiger Frame fehlt.

    Die Zeile heisst "Frames mit Matte" und ist der Nenner des Hand-Anteils. Ohne die sauberen
    Frames misst dieser Anteil nicht "wie oft je Frame", sondern "wie oft unter den Fehlern".
    """
    ce = _load("coverage_errors")
    monkeypatch.setattr(ce, "ROOT", tmp_path)
    sess = tmp_path / "s1"
    _jsonl(sess / "matte.jsonl", [
        {"frame": "000100", "coverage": {"e4": 0.0, "e5": 0.0}},
        {"frame": "000200", "coverage": {"e4": 0.0, "e5": 0.0}},
    ])
    _jsonl(sess / "reads.jsonl", [
        {"frame": "000100", "square": "e4", "model_cov": 0.0},
        {"frame": "000100", "square": "e5", "model_cov": 0.0},
        {"frame": "000200", "square": "e4", "model_cov": 0.9},
        {"frame": "000200", "square": "e5", "model_cov": 0.9},
    ])
    monkeypatch.setattr(sys, "argv", ["coverage_errors", "reads.jsonl", "s1"])

    ce.main()
    out = capsys.readouterr().out
    assert "2 Frames mit Matte" in out, out
    assert "50.00 % aller Frames" in out, out


def test_mine_hard_coverage_skips_rows_the_matte_never_measured(tmp_path, monkeypatch, capsys):
    """Eine Zeile OHNE `coverage` ist un-mattet, nicht frei — `or 0.0` macht sie zur Wahrheit 0.

    Jede Modellmeldung ueber `--high` wird darauf zum "Phantom". Genau die Falle, die CLAUDE.md
    als "Coverage Matte Trap" fuehrt; die Bilanz "entschiedene Widersprueche" ist dann erfunden.
    """
    mine = _load("mine_hard_coverage")
    dd = tmp_path / "ds"
    rows = [{"path": "a.webp", "session_id": "s", "frame": "f", "square": "e4", "label": "wP"},
            {"path": "b.webp", "session_id": "s", "frame": "f", "square": "e5", "label": "wP",
             "coverage": 0.0}]
    _jsonl(dd / "manifest.jsonl", rows)
    import numpy as np

    img = tmp_path / "packed_images.u8"
    np.zeros((2, 4, 4, 3), np.uint8).tofile(img)
    monkeypatch.setattr(mine, "dataset_dir", lambda name: dd)
    monkeypatch.setattr(mine, "load_packed",
                        lambda *a, **k: (img, (2, 4, 4), {"a.webp": 0, "b.webp": 1}))
    monkeypatch.setattr(mine.occluded_model, "all_reads",
                        lambda run, cells: [{"coverage": 0.9} for _ in cells])
    monkeypatch.setattr(sys, "argv", ["mine", "--dataset", "ds", "--out", str(tmp_path / "o.jsonl")])

    mine.main()
    hits = [json.loads(x) for x in
            (tmp_path / "o.jsonl").read_text(encoding="utf-8").splitlines() if x.strip()]
    assert [h["square"] for h in hits] == ["e5"], capsys.readouterr().out


def test_compare_arms_rejects_a_run_whose_epochs_appear_twice(tmp_path):
    """Der Docstring verspricht EINDEUTIGE Epochen, geprueft wird eine MENGE — die schluckt sie.

    Ein fortgesetzter Lauf schreibt Epochen doppelt; der Schwanz mittelt dann ueber die letzten
    `tail` ZEILEN, also ueber weniger Epochen als gedacht, und der gepaarte Abstand daneben.
    """
    arms = _load("compare_arms")
    run = tmp_path / "p4a-s42"
    _jsonl(run / "metrics.jsonl", [{"epoch": e, "val_loss": v} for e, v in
                                   ((0, 1.0), (1, 0.9), (2, 0.8), (1, 0.5), (2, 0.4))])

    assert arms.tail_mean(run, "val_loss", 3, 3) is None


def _settle_fixture(tmp_path: Path) -> tuple[str, str]:
    rec = tmp_path / "data" / "recordings" / "rec"
    rec.mkdir(parents=True)
    (rec / "candidate.json").write_text(json.dumps(
        {"clock": {"fps": 30.0},
         "moves": [{"ply": 1, "san": "e4", "frame": 10, "held": 5}]}), encoding="utf-8")
    dump = tmp_path / "motion.csv"
    # Der ROI-Auszug traegt NUR den ersten Frame: 11 und 12 hat der Replay nicht gemessen.
    dump.write_text("frame,motion\n10,0.9\n", encoding="utf-8")
    (tmp_path / "motion.csv.status.csv").write_text(
        "index,frame,motion,state,stuck\n"
        "10,10,0.90,moving,\n11,11,0.90,moving,\n12,12,0.90,moving,\n13,13,0.00,waiting,\n",
        encoding="utf-8")
    return str(dump)


def test_settle_lag_does_not_read_an_unmeasured_roi_as_board_motion(tmp_path, monkeypatch, capsys):
    """`roi.get(frame, 0.0)`: ein Frame ohne ROI-Zeile sieht aus wie "Brett bewegt, ROI still".

    Genau die Achse, die das Skript entscheiden soll. Ungemessen gehoert in eine eigene Spalte,
    nicht auf die Seite des Bretts.
    """
    lag = _load("settle_lag")
    monkeypatch.setattr(lag, "ROOT", tmp_path)
    dump = _settle_fixture(tmp_path)

    lag.main("rec", dump)
    out = capsys.readouterr().out
    assert "board-led 0" in out, out
    assert "ohne ROI-Messung 2" in out, out


def test_audit_lane_probe_separates_frames_without_a_matte(tmp_path, monkeypatch, capsys):
    """Ein Frame OHNE Matte-Zeile liest `.get(square, 0.0)` als "keine Hand".

    Die Quote "davon mit Matte > 0" beantwortet die Frage des Nutzers, ob die Lane voller Haende
    liegt. Ungemessene Frames druecken sie, ohne dass die Zeile es sagt; und der Nenner zaehlt
    auch Flags, deren Brett gar nicht gelesen werden konnte.
    """
    probe = _load("audit_lane_probe")
    import numpy as np

    sdir = tmp_path / "recordings" / "s"
    sdir.mkdir(parents=True)
    _jsonl(sdir / "log.jsonl", [{"frame": f"{f}.png", "corners": [[0, 0]] * 4} for f in ("f1", "f2")])
    flags = tmp_path / "flags.jsonl"
    _jsonl(flags, [{"session_id": "rg-s", "frame": f, "square": "e4", "fen_label": "empty",
                    "predicted": "wP", "prob": 0.9} for f in ("f1", "f2")])
    monkeypatch.setattr(probe.config, "DATA",
                        dataclasses.replace(probe.config.DATA, root=tmp_path))
    monkeypatch.setattr(probe, "read_session_meta", lambda d: {"profile": "p"})
    monkeypatch.setattr(probe, "load_profile", lambda name: object())
    monkeypatch.setattr(probe, "read_matte", lambda d: {"f1": {"e4": 0.0}})
    monkeypatch.setattr(probe, "board_source", lambda row, profile: ("board.webp", True))
    monkeypatch.setattr(probe, "crops_for_frame",
                        lambda *a, **k: [np.zeros((8, 8, 3), np.uint8)] * 64)
    monkeypatch.setattr(probe.cv2, "imread", lambda path: np.zeros((8, 8, 3), np.uint8))
    monkeypatch.setattr(sys, "argv", ["probe", "--flags", str(flags),
                                      "--out", str(tmp_path / "sheet.png")])

    probe.main()
    out = capsys.readouterr().out
    assert "ohne Matte: 1" in out, out


def test_commit_budget_p90_is_the_ninth_of_ten_values(tmp_path, capsys):
    """`int(0.9 * n)` ist bei n = 10 der Index 9, also das MAXIMUM.

    Nachgesehen, bevor es stehen blieb: die p90-Spalten in `docs/commit-latency.md` stammen NICHT
    von hier — die Tabelle dieses Skripts dort traegt nur Mediane, die p90 kommen aus
    `commit_lag.py`, das die richtige Formel seit 2026-09-14 hat. Der Fix bewegt also keine
    veroeffentlichte Zahl.
    """
    budget = _load("commit_budget")
    budget.ROOT = tmp_path
    rec = tmp_path / "data" / "recordings" / "rec"
    rec.mkdir(parents=True)
    (rec / "candidate.json").write_text(json.dumps(
        {"clock": {"fps": 1.0},
         "moves": [{"ply": i, "san": "e4", "frame": 100 * i, "held": 1} for i in range(10)]}),
        encoding="utf-8")
    dump = tmp_path / "m.csv"
    (tmp_path / "m.csv.status.csv").write_text(
        "index,state\n" + "".join(f"{100 * i},waiting\n" for i in range(10)), encoding="utf-8")
    (tmp_path / "run.log").write_text(
        "".join(f"seq={100 * i} note: checking e4 via CNN\n"
                f"   e4  label frame {100 * i}  run frame {100 * i + i + 1}\n"
                for i in range(10)), encoding="utf-8")

    budget.main("rec", str(dump), str(tmp_path / "run.log"))
    p90 = [ln for ln in capsys.readouterr().out.splitlines() if ln.startswith("p90")][0]
    assert p90.split()[-1] == "9.00", p90


def test_emission_lag_ignores_reads_without_a_coverage_column(tmp_path, monkeypatch, capsys):
    """Ohne `model_cov` gilt jede Zelle als sichtbar — die Korrelation entstuende auf Haenden.

    `docs/emission-correlation.md` nimmt verdeckte Zellen ausdruecklich aus; auf einem Lauf ohne
    Occlusion-Kopf tat `or 0.0` das Gegenteil, ohne dass eine Zeile es sagt.
    """
    lag = _load("emission_lag")
    monkeypatch.setattr(lag, "ROOT", tmp_path)
    (tmp_path / "s").mkdir()
    _jsonl(tmp_path / "s" / "model-reads.jsonl", [
        {"frame": f, "square": "e4", "fen_label": "wP", "probs": {"wP": 0.9}}
        for f in (100, 101)])
    monkeypatch.setattr(sys, "argv", ["emission_lag", "s"])

    lag.main()
    assert "[FAIL]" in capsys.readouterr().out
