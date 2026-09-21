"""Mutationsprobe 2026-09-21 ueber `scripts/`: Sperren neutralisiert, Tests gefahren.

Vier Sperren gab es gar nicht (Fix + roter Test hier), sieben trugen, waren aber ungedeckt —
ihre Mutation blieb gruen. Beides steht nebeneinander, weil eine ungedeckte Sperre so lange
haelt, bis jemand sie "vereinfacht".

Der rote Faden ist derselbe wie in CLAUDE.md: eine fehlende Zahl als gemessene 0, zwei Laeufe
ueber verschiedene Grundgesamtheiten, ein Raster ohne den Rand aus der Log-Zeile.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

VOLL = "  found {f}:\n  missed {m}:\n  invented {i} (phantoms)\n  beyond 0 (after)\n"
ABBRUCH = "starting replay ...\nException in thread main\n"


def _log(d: Path, name: str, text: str) -> None:
    d.mkdir(parents=True, exist_ok=True)
    (d / f"{name}.log").write_text(text, encoding="utf-8")


def _rows(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")


# --- Fehlende Sperren: gefunden, gefixt, hier rot nachgewiesen ------------------------------


def _lag_tag(root: Path, tag: str, recs: dict[str, int]) -> None:
    for rec, run in recs.items():
        _log(root / "tmp" / "batch" / tag, rec, f"    e2e4 label frame 10 run frame {run} (ok)\n")
        _rows(root / "tmp" / "retime" / f"{rec}.json", [])
        (root / "tmp" / "retime" / f"{rec}.json").write_text(
            json.dumps({"plies": [{"frame_phone": 10, "frame": 10, "held": 3}]}), encoding="utf-8")
        cand = root / "data" / "recordings" / rec / "candidate.json"
        cand.parent.mkdir(parents=True, exist_ok=True)
        cand.write_text(json.dumps({"clock": {"fps": 15.0}}), encoding="utf-8")


def test_commit_lag_stellt_keine_zwei_aufnahmesaetze_nebeneinander(tmp_path, monkeypatch, capsys):
    """Live gemessen: `fix-verify3` (2 Aufnahmen, Median 0,55 s) stand in derselben Spalte wie
    `base-20260905` (10 Aufnahmen, 0,47 s). Eine Aufnahme ohne Referenz faellt still aus `lags`."""
    import commit_lag

    monkeypatch.setattr(commit_lag, "ROOT", tmp_path)
    _lag_tag(tmp_path, "bezug", {"eins": 25, "zwei": 40})
    _lag_tag(tmp_path, "schmal", {"eins": 25})

    rc = commit_lag.main(["bezug", "schmal"])
    out = capsys.readouterr().out

    assert rc == 1, out
    assert "anderer Aufnahmesatz" in out and "zwei" in out.split("schmal")[-1], out


def test_commit_lag_erfindet_keine_zeitbasis(tmp_path, monkeypatch):
    """`or 30.0` haette elf der 32 Aufnahmen (~15 fps) jeden Verzug verdoppelt."""
    import commit_lag

    monkeypatch.setattr(commit_lag, "ROOT", tmp_path)
    _lag_tag(tmp_path, "bezug", {"eins": 25})
    (tmp_path / "data" / "recordings" / "eins" / "candidate.json").write_text(
        json.dumps({"clock": {}}), encoding="utf-8")

    with pytest.raises(SystemExit, match="clock.fps"):
        commit_lag.reference("eins")


def test_lean_probe_schneidet_wie_der_kanonische_schnitt():
    """Die Sonde rasterte das GESPEICHERTE Brett bei 0 und klammerte am Rand.

    Gemessen auf `board_size` 928 + Rand 12: d8 kam als (342, 0, 470, 122) statt (354, 6, 482,
    134) — 12 px Versatz und eine um 6 px gestauchte Box, genau auf der Reihe, deren Ueberhang
    die Sonde messen soll.
    """
    import lean_probe
    from tests.conftest import make_profile

    from chesslab.calibration import crop_border_px, square_to_crop_box
    from chesslab.labeling import crop_square

    prof = make_profile(928)
    b = crop_border_px(prof)
    n = int(prof.board_size) + 2 * b
    rng = np.random.default_rng(7)
    board = rng.integers(0, 255, (n, n, 3), dtype=np.uint8)

    for sq in ("a8", "d8", "h1", "e4"):
        x0, y0, x1, y1 = square_to_crop_box(sq, prof, clamp=False)
        mein = lean_probe.cut(board, x0 + b, y0 + b, x1 + b, y1 + b)
        kanonisch = crop_square(board, sq, prof, (mein.shape[1], mein.shape[0]))

        assert mein.shape == kanonisch.shape, sq
        assert np.array_equal(mein, kanonisch), sq
        # `clamp=True` machte die Randbox kleiner statt sie schwarz aufzufuellen.
        assert mein.shape[:2] == (y1 - y0, x1 - x0), sq


def test_occlusion_gate_meldet_seine_absage_auch_im_exitcode():
    """`main()` blank aufgerufen: die `[FAIL]`-Zeile gab 1 zurueck, der Prozess trotzdem 0 —
    ein aufrufendes Skript las den Lauf ohne Occlusion-Kopf als gelungene Ableitung."""
    skript = Path(__file__).resolve().parents[1] / "scripts" / "occlusion_gate.py"

    proc = subprocess.run([sys.executable, str(skript), "model-reads.jsonl", "gibtsnicht"],
                          capture_output=True, text=True, check=False)

    assert proc.returncode == 1, proc.stdout


# --- Tragende Sperren, die keine Mutation rot machte ----------------------------------------


def test_guard_ablation_zaehlt_den_abgebrochenen_lauf_nicht_als_null(tmp_path, monkeypatch):
    """Eine fehlende Bewertungszeile darf nicht als 0 in die Summe des Satzes laufen."""
    import guard_ablation

    monkeypatch.setattr(guard_ablation, "ROOT", tmp_path)
    d = tmp_path / "tmp" / "batch" / "satz"
    _log(d, "ganz", VOLL.format(f=10, m=0, i=0))
    _log(d, "abgebrochen", ABBRUCH)

    assert guard_ablation.summe("satz") is None


def test_guard_ablation_haelt_ein_leeres_verzeichnis_nicht_fuer_einen_bezug(tmp_path, monkeypatch):
    """Sonst druckt der Bezug 0/0/0 ueber 0 Aufnahmen, als waere er gemessen."""
    import guard_ablation

    monkeypatch.setattr(guard_ablation, "ROOT", tmp_path)
    (tmp_path / "tmp" / "batch" / "leer").mkdir(parents=True)

    assert guard_ablation.summe("leer") is None


def test_compare_regression_nennt_die_aufnahme_die_nur_einer_satz_hat(tmp_path, monkeypatch,
                                                                     capsys):
    """Verglichen wird die Schnittmenge — die Zeile "! nur in" ist der einzige Hinweis darauf."""
    import compare_regression

    monkeypatch.setattr(compare_regression, "ROOT", tmp_path)
    for tag in ("vorher", "nachher"):
        _log(tmp_path / "tmp" / "batch" / tag, "gemeinsam", VOLL.format(f=10, m=0, i=0))
    _log(tmp_path / "tmp" / "batch" / "nachher", "extra", VOLL.format(f=5, m=0, i=0))
    monkeypatch.setattr(sys, "argv", ["compare_regression.py", "vorher", "nachher"])

    compare_regression.main()
    out = capsys.readouterr().out

    assert "! nur in nachher: extra" in out, out


def test_occlusion_reserve_zaehlt_die_fehlende_achse_als_ungemessen(tmp_path):
    """Ein aelteres Binary schrieb `occlVetoed` nicht — das ist kein Frame ohne Veto."""
    import occlusion_reserve

    trace = tmp_path / "t.jsonl"
    _rows(trace, [{"kind": "frame", "changed": 1},
                  {"kind": "frame", "occlVetoed": 0, "shadowVetoed": 0, "changed": 1}])

    got = occlusion_reserve.zaehle(trace)

    assert got["occlVetoed_ungemessen"] == 1
    assert got.get("occlVetoed_frames", 0) == 0


def test_occlusion_arms_zaehlt_den_frame_ohne_achse_nicht_als_stillen_arm(tmp_path):
    """Ohne die Achse ist der Frame nicht "beide still", sondern gar nicht befragt."""
    import occlusion_arms

    trace = tmp_path / "t.jsonl"
    _rows(trace, [{"kind": "frame", "cnnHandSquares": 2},
                  {"kind": "frame", "cnnHandSquares": 0, "occlVetoed": 0}])

    c = occlusion_arms.zaehle(trace)

    assert (c["ungemessen"], c["frames"], c["keiner"]) == (1, 1, 1)


def test_occlusion_gate_nimmt_nur_den_zusammenhaengenden_lauf_ab_null():
    """Ein spaeteres gutes Band rettet kein durchgefallenes davor — sonst waechst die Schwelle
    ueber ein Loch hinweg und laesst genau die Reads durch, die sie aussieben soll."""
    import occlusion_gate

    # (lo, hi, n, p, Wilson-Untergrenze): das zweite Band faellt durch, das dritte waere wieder gut.
    bands = [(0.00, 0.02, 200, 1.0, 0.98), (0.02, 0.05, 200, 0.40, 0.33),
             (0.05, 0.10, 200, 0.99, 0.96)]

    assert [b[1] for b in occlusion_gate.schwelle(bands, 0.75)] == [0.02]


def test_sweep_report_nennt_die_unvollstaendigen_laeufe(tmp_path, monkeypatch, capsys):
    """Ein Arm mit 2 statt 40 Epochen steht sonst wortlos neben dem Bezug."""
    import sweep_report

    axis = "val_visible_piece_acc"
    for arm, n in (("a-lang", 6), ("b-kurz", 2)):
        _rows(tmp_path / arm / "metrics.jsonl",
              [{"epoch": i, axis: 0.9 + i / 1000} for i in range(n)])
    monkeypatch.setattr(sys, "argv", ["sweep_report.py", "--dir", str(tmp_path)])

    sweep_report.main()
    out = capsys.readouterr().out

    assert "nicht vergleichbar" in out and "b-kurz" in out.split("nicht vergleichbar")[-1], out
