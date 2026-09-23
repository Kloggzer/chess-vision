"""Rote Belege aus dem Randgebiet-Audit 2026-09-14: `scripts/`, ungetestet und entscheidungstragend."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

from conftest import load_script, write_jsonl

ROOT = Path(__file__).resolve().parents[1]


def test_thin_per_position_does_not_repeat_the_dirtiest_board_as_clean(tmp_path, monkeypatch):
    """Eine Stellung mit weniger Brettern als `--clean + --dirty` landet KOMPLETT in `clean_keys`.

    `head` ist im Rueckfallzweig `ordered` statt `ordered[:c]`, also gilt auch das verdeckteste
    Brett als sauber und wird `--clean-repeat` mal in den Datensatz geschrieben.
    """
    thin = load_script("thin_per_position")
    dirs = {"src": tmp_path / "src", "dst": tmp_path / "dst"}
    monkeypatch.setattr(thin, "dataset_dir", lambda name: dirs[name])
    write_jsonl(dirs["src"] / "manifest.jsonl", [
        {"session_id": "s", "ply": 1, "frame": f, "coverage": cov, "path": f"{f}.webp"}
        for f, cov in (("f0", 0.0), ("f1", 0.02), ("f2", 0.91))
    ])
    monkeypatch.setattr(sys, "argv", ["thin", "src", "dst",
                                      "--clean", "2", "--dirty", "2", "--clean-repeat", "3"])

    assert thin.main() == 0
    kept = [json.loads(x) for x in
            (dirs["dst"] / "manifest.jsonl").read_text(encoding="utf-8").splitlines()]
    times = {f: sum(1 for r in kept if r["frame"] == f) for f in ("f0", "f1", "f2")}
    assert times == {"f0": 3, "f1": 3, "f2": 1}


def test_commit_lag_p90_is_the_ninth_of_ten_values_not_the_maximum(tmp_path, monkeypatch, capsys):
    """`allv[int(n * 0.9)]` ist bei n = 10 der Index 9 — also das Maximum, nicht das p90."""
    lag = load_script("commit_lag")
    monkeypatch.setattr(lag, "ROOT", tmp_path)
    rec = "2026-09-05-00-00-00"
    (tmp_path / "tmp" / "retime").mkdir(parents=True)
    (tmp_path / "tmp" / "retime" / f"{rec}.json").write_text(json.dumps(
        {"plies": [{"frame_phone": 100 + i, "frame": 100 + i, "held": 1} for i in range(10)]}),
        encoding="utf-8")
    cand = tmp_path / "data" / "recordings" / rec
    cand.mkdir(parents=True)
    (cand / "candidate.json").write_text(json.dumps({"clock": {"fps": 10.0}}), encoding="utf-8")
    # Neun Plies mit einem Frame Verzug (0,10 s), einer mit fuenfzig (5,00 s).
    delays = [1] * 9 + [50]
    batch = tmp_path / "tmp" / "batch" / "t"
    batch.mkdir(parents=True)
    (batch / f"{rec}.log").write_text("".join(
        f"   e2e4 label frame {100 + i} run frame {100 + i + d}\n"
        for i, d in enumerate(delays)), encoding="utf-8")

    lag.main(["t"])
    p90 = capsys.readouterr().out.splitlines()[1].split()[-2]
    assert p90 == "0.10", f"p90 {p90} ist der Maximalwert, nicht das neunte von zehn"


def test_occlusion_gate_does_not_read_a_missing_occlusion_head_as_coverage_zero(tmp_path,
                                                                                monkeypatch):
    """`model-reads.jsonl` eines 13-Klassen-Laufs traegt gar kein `cov` (`occluded_model.py:190`).

    `r.get("cov") or 0.0` macht daraus gemessene Null; alle Reads fallen ins erste Band und das
    Skript leitet eine Schwelle fuer ein Modell ab, das Verdeckung nie gemessen hat.
    """
    gate = load_script("occlusion_gate")
    monkeypatch.setattr(gate, "ROOT", tmp_path)
    s = tmp_path / "sess"
    s.mkdir()
    (s / "matte.jsonl").write_text(json.dumps({"frame": "000001", "coverage": {"e4": 0.4}}) + "\n",
                                   encoding="utf-8")
    (s / "model-reads.jsonl").write_text(json.dumps(
        {"frame": "000001", "square": "e4", "fen_label": "wP", "probs": {"wP": 0.9}}) + "\n",
        encoding="utf-8")

    assert gate.collect("model-reads.jsonl", ["sess"]) == []


def test_coverage_arms_feeds_the_hand_student_a_board_without_its_border(tmp_path, monkeypatch):
    """`read_boards` schneidet den Brettrand NICHT ab (`hand_gate.py`, "Ohne Randschnitt").

    Der Vergleichslauf liest aber die GESPEICHERTEN Bretter, die `board_border` px Rand tragen —
    der Produktionsweg `gate_scan` reicht ihn als `borders=` durch. Ohne den Schnitt liegt das
    8x8-Raster des Schuelers ein Viertel Feld daneben und jede Zelle meldet ihre Nachbarin.
    """
    import cv2
    import numpy as np

    from chesslab import config, hand_gate, occluded_model

    arms = load_script("coverage_arms")
    border, side = 10, 100
    board = np.zeros((side, side, 3), np.uint8)
    board[..., 2] = 255                                    # Rand: rot
    board[border:-border, border:-border] = (255, 0, 0)    # Brett: blau

    sdir = tmp_path / "data" / "recordings" / "s"
    (sdir / "boards").mkdir(parents=True)
    cv2.imwrite(str(sdir / "boards" / "000001.webp"), board)
    (sdir / "log.jsonl").write_text(json.dumps(
        {"frame": "frames/000001.png", "board": "boards/000001.webp", "board_border": border,
         "corners": [[0, 0], [1, 0], [1, 1], [0, 1]]}) + "\n", encoding="utf-8")

    (tmp_path / "data" / "reports").mkdir(parents=True)
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    monkeypatch.setattr(arms, "read_session_meta", lambda d: {"profile": "desktop"})
    monkeypatch.setattr(arms, "load_profile", lambda name: None)
    monkeypatch.setattr(arms, "read_matte", lambda d: {"000001": {}})
    monkeypatch.setattr(arms, "crops_for_frame", lambda *a, **k: [None] * 64)
    # Wie das Profil und der Zuschnitt daneben: dieser Test isoliert den SCHUELER-Arm, nicht die
    # Wahl der Quelle. Ohne den Stub braucht `board_source` ein echtes Profil.
    monkeypatch.setattr(arms, "board_source", lambda row, _p: (row["board"], True))
    monkeypatch.setattr(hand_gate, "load_gate", lambda tag: (object(), {"size": 8}, "cpu"))
    seen = []
    monkeypatch.setattr(hand_gate, "_forward",
                        lambda model, dev, images, batch: seen.extend(images) or [[0.0] * 65])
    monkeypatch.setattr(occluded_model, "all_reads", lambda *a, **k: [{"coverage": 0.0}] * 64)
    monkeypatch.setattr(sys, "argv", ["coverage_arms", "--session", "rg-s", "--limit", "1"])

    arms.main()
    assert seen, "der Schueler-Arm lief nicht"
    # Die Eckzelle des 8x8-Rasters darf nur Brett sehen (blau), keinen Rand (rot).
    assert int(np.asarray(seen[0])[0, 0, 0]) == 0, "die Eckzelle des Schuelers ist Brettrand"


def test_mix_datasets_refuses_a_PACKED_host_not_only_a_packed_guest(tmp_path, monkeypatch, capsys):
    """Der Docstring verlangt "Beide Seiten muessen dateibasiert sein (kein `mm://`)".

    Geprueft wird nur der Gast. Ein Host mit `mm://`-Zeilen kommt durch, der Mischsatz wird
    geschrieben, und erst das empfohlene `dataset pack` faellt darueber.
    """
    mix = load_script("mix_datasets")
    dirs = {n: tmp_path / n for n in ("host", "guest", "out")}
    monkeypatch.setattr(mix, "dataset_dir", lambda name: dirs[name])
    for name, path in (("host", "mm://real-80/000001/e4"), ("guest", "comp/e4.webp")):
        write_jsonl(dirs[name] / "manifest.jsonl",
                  [{"path": path, "label": "wP", "square": "e4", "session_id": name}])
        (dirs[name] / "split.json").write_text(json.dumps(
            {"classes": ["wP"], "splits": {"train": [name], "val": [], "test": []}}),
            encoding="utf-8")
    monkeypatch.setattr(sys, "argv", ["mix", "host", "guest", "out"])

    with pytest.raises(SystemExit) as err:
        mix.main()
    assert "mm://" in str(err.value)
