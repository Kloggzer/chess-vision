"""Skript-Jagd 2026-09-20b: vier Nenner und ein Cache, die mehr behaupten als sie messen.

Drei Skripte teilten dieselbe Wurzel wie die Fallen in CLAUDE.md: eine uebersprungene Zeile blieb
im Nenner stehen, also las sich NICHT GEMESSEN wie gemessen. Der vierte Fall ist der
`--probs-cache` von `sweep_prior_lambda`, der nur die Zeilenzahl prueft. Jeder Test hier war vor
seinem Fix rot.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))


def _write(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")


class _FakeCv2:
    """Kein Bild lesen, keine Rillen messen — geprueft wird allein der Nenner des Berichts."""

    COLOR_BGR2GRAY = 0
    COLOR_BGR2RGB = 4
    imread = staticmethod(lambda _p: np.zeros((8, 8, 3), dtype=np.uint8))
    cvtColor = staticmethod(lambda _img, _code: np.zeros((8, 8, 3), dtype=np.uint8))


def test_matte_audit_nennt_nur_die_geprueften_matten(tmp_path, monkeypatch, capsys):
    """`von {len(blind)}` zaehlte die Matten ohne Brett mit — der Kommentar sagte es selbst."""
    import matte_audit

    rec = tmp_path / "recordings" / "20-19"
    _write(rec / "matte.jsonl",
           [{"frame": f, "dirty_reason": "occluded"} for f in ("f1", "f2", "f3")])
    for f in ("f1", "f2"):
        (rec / "boards").mkdir(parents=True, exist_ok=True)
        (rec / "boards" / f"{f}.webp").write_bytes(b"")
    # Die Zellmasse stehen in der Log-Zeile, nicht in der Bildform: `gray.shape[0]` ist 952 bei
    # `board_size` 928, und ohne die zwei Zahlen rastert der Sensor mit 119 statt 116 px.
    _write(rec / "log.jsonl",
           [{"frame": f"{f}.jpg", "board": f"boards/{f}.webp", "board_size": 928,
             "board_border": 12} for f in ("f1", "f2", "f3")])

    seen = iter([{"e4"}, set()])
    monkeypatch.setattr(matte_audit, "cv2", _FakeCv2())
    monkeypatch.setattr(matte_audit, "missing_edges", lambda *a, **k: None)
    monkeypatch.setattr(matte_audit, "hand_squares", lambda _e: next(seen))
    monkeypatch.setattr(sys, "argv", ["matte_audit", "--recordings", str(tmp_path / "recordings"),
                                      "--out", str(tmp_path / "out.jsonl")])

    assert matte_audit.main() == 0
    line = next(ln for ln in capsys.readouterr().out.splitlines() if "20-19" in ln)
    assert "von    2" in line and "von    3" not in line


def test_scan_ply_offset_zaehlt_eine_UNGEMESSENE_zelle_nicht_als_sichtbar():
    """`coverage is None` heisst UN-MATTET, nicht frei — die Coverage-Matte-Falle.

    Der Sichtbarkeitsfilter las `r.get("coverage") or 0.0`, eine ungemessene Zelle kam damit als
    0,0 durch. Ein ungemattetes Bild erreichte so 32 "sichtbare" Zellen und landete im frisch
    korrigierten Nenner als WIRKLICH geprueft. Alles andere ist hier absichtlich in Ordnung —
    Nachbar-Bretter und Vorhersagen stehen bereit, nur die Matte fehlt.
    """
    import scan_ply_offset

    felder = [f"{c}{r}" for r in "12345678" for c in "abcdefgh"]
    ohne_matte = [{"path": f"u-{sq}", "session_id": "s", "frame": "u", "ply": 1,
                   "square": sq, "coverage": None} for sq in felder]
    brett = dict.fromkeys(felder, "empty")
    boards = {("s", 0): brett, ("s", 1): brett, ("s", 2): brett}
    pred = {r["path"]: "empty" for r in ohne_matte}

    _hits, checked = scan_ply_offset.offsets({("s", "u", 1): ohne_matte}, boards, pred)

    assert checked == 0, "ein ungemattetes Bild hat keine GEMESSENE sichtbare Zelle"


def test_scan_ply_offset_meldet_den_nenner_der_GEPRUEFTEN_frames(tmp_path, monkeypatch, capsys):
    """Der Bericht nannte `len(per_frame)`, also auch Frames ohne 32 sichtbare Zellen."""
    import scan_ply_offset

    dd = tmp_path / "ds"
    fen = "8/8/8/8/8/8/8/8 w - - 0 1"
    man = [{"path": f"{frame}-{sq}", "session_id": "s", "frame": frame, "ply": ply, "fen": fen,
            "square": sq, "coverage": 0.0}
           for frame, ply in (("f0", 0), ("f1", 1), ("f2", 1))
           for sq in (f"{c}{r}" for r in "12345678" for c in "abcdefgh")]
    # f0 und f2 tragen nur drei sichtbare Zellen: uebersprungen, also auch kein Nenner-Anteil.
    for r in man:
        if r["frame"] != "f1" and r["square"] not in ("a1", "b1", "c1"):
            r["coverage"] = 1.0
    _write(dd / "manifest.jsonl", man)

    monkeypatch.setattr(scan_ply_offset, "dataset_dir", lambda _n: dd)
    monkeypatch.setattr(scan_ply_offset, "open_packed_rows",
                        lambda *a, **k: (np.zeros((len(man), 1, 1, 3), dtype=np.uint8),
                                         {r["path"]: i for i, r in enumerate(man)}))
    monkeypatch.setattr(scan_ply_offset.occluded_model, "all_reads",
                        lambda _run, cells: [{"pred_label": "empty"}] * len(cells))
    monkeypatch.setattr(sys, "argv", ["scan_ply_offset", "ds",
                                      "--out", str(tmp_path / "ply.jsonl")])

    scan_ply_offset.main()
    out = capsys.readouterr().out
    assert "1 von 3 Frames geprueft" in out


def test_audit_lane_probe_meldet_den_handanteil_auf_GEMESSENEN_zellen(tmp_path, monkeypatch,
                                                                       capsys):
    """Der Handanteil lief durch `n_shown`; ein Frame ohne Matte-Zeile drueckte ihn auf die Haelfte."""
    import audit_lane_probe as probe

    flags = [{"session_id": "rg-20-19", "frame": f, "square": "e4", "fen_label": "empty",
              "predicted": "wP", "prob": 0.9} for f in ("f1", "f2")]
    monkeypatch.setattr(probe, "read_jsonl",
                        lambda p: flags if "audit-flags" in str(p)
                        else [{"frame": f"{f}.png", "corners": []} for f in ("f1", "f2")])
    monkeypatch.setattr(probe, "read_session_meta", lambda _d: {"profile": "p"})
    monkeypatch.setattr(probe, "load_profile", lambda _p: object())
    # Nur f1 ist gemattet; f2 hat keine Zeile und ist damit nicht gemessen, nicht handfrei.
    monkeypatch.setattr(probe, "read_matte", lambda _d: {"f1": {"e4": 0.6}})
    monkeypatch.setattr(probe, "board_source", lambda _r, _p: ("boards/f.webp", True))
    monkeypatch.setattr(probe, "crops_for_frame",
                        lambda *a, **k: [np.zeros((4, 4, 3), dtype=np.uint8)] * 64)
    monkeypatch.setattr(probe, "cv2", _FakeCv2())
    monkeypatch.setattr(sys, "argv", ["audit_lane_probe", "--flags",
                                      str(tmp_path / "audit-flags.jsonl"),
                                      "--out", str(tmp_path / "probe.png")])

    probe.main()
    out = capsys.readouterr().out
    assert "1 von 1 gemessenen (100 %)" in out
    assert "ohne Matte: 1 von 2 gezeichneten" in out


def _fake_pack(pack: Path, paths: list[str]) -> None:
    pack.mkdir(parents=True, exist_ok=True)
    (pack / "packed_meta.json").write_text(
        json.dumps({"n": len(paths), "h": 1, "w": 1, "paths": paths}), encoding="utf-8")
    (pack / "packed_images.u8").write_bytes(bytes(3 * len(paths)))


def test_sweep_prior_lambda_verwirft_den_cache_eines_ANDEREN_modells(tmp_path, monkeypatch):
    """Nur die Zeilenzahl geprueft, meldete der zweite Lauf die Softmax des ERSTEN Modells."""
    import sweep_prior_lambda as sweep

    import chesslab.serving as serving

    run = tmp_path / "run-b"
    run.mkdir()
    (run / "config.json").write_text(json.dumps({"classes": ["empty", "wP"]}), encoding="utf-8")
    pack = tmp_path / "packs" / "p"
    _fake_pack(pack, ["a", "b"])
    rows = [{"path": "a"}, {"path": "b"}]

    cache = tmp_path / "probs.npz"
    np.savez_compressed(cache, probs=np.array([[0.0, 1.0], [0.0, 1.0]]))
    monkeypatch.setattr(serving, "predict_arrays",
                        lambda *a, **k: [{"probs": [1.0, 0.0]}] * len(a[1]))

    got = sweep.probabilities(run, rows, pack, "cpu", 2, cache)
    assert got.tolist() == [[1.0, 0.0], [1.0, 0.0]]
    key = sweep.cache_key(run, rows, pack, "cpu")
    assert sweep.cached_probs(cache, key, 2).tolist() == got.tolist()
    assert sweep.cached_probs(cache, sweep.cache_key(tmp_path / "run-c", rows, pack, "cpu"),
                              2) is None


def test_sweep_prior_lambda_stempelt_gewichte_daten_und_geraet(tmp_path):
    """Der Schluessel war nur Modell: zwei Splits GLEICHER Zeilenzahl teilten sich die Softmax."""
    import sweep_prior_lambda as sweep

    run = tmp_path / "run-b"
    run.mkdir()
    (run / "config.json").write_text(json.dumps({"temperature": 1.0}), encoding="utf-8")
    (run / "model.onnx").write_bytes(b"graph")
    pack = tmp_path / "packs" / "p"
    _fake_pack(pack, ["a", "b", "c"])
    rows = [{"path": "a"}, {"path": "b"}]
    base = sweep.cache_key(run, rows, pack, "cpu")

    # Gleiche Zeilenzahl, andere Zeilen — und dieselben Zeilen in anderer REIHENFOLGE.
    assert sweep.cache_key(run, [{"path": "a"}, {"path": "c"}], pack, "cpu") != base
    assert sweep.cache_key(run, list(reversed(rows)), pack, "cpu") != base
    assert sweep.cache_key(run, rows, pack, "cuda") != base

    (run / "config.json").write_text(json.dumps({"temperature": 1.4}), encoding="utf-8")
    assert sweep.cache_key(run, rows, pack, "cpu") != base
    (run / "config.json").write_text(json.dumps({"temperature": 1.0}), encoding="utf-8")

    (run / "model.onnx").write_bytes(b"graph2")
    assert sweep.cache_key(run, rows, pack, "cpu") != base
    (run / "model.onnx").write_bytes(b"graph")

    (run / "best.pt").write_bytes(b"w")
    assert sweep.cache_key(run, rows, pack, "cpu") != base
    (run / "best.pt").unlink()
    (run / "last.pt").write_bytes(b"w")
    assert sweep.cache_key(run, rows, pack, "cpu") != base
    (run / "last.pt").unlink()

    _fake_pack(pack, ["a", "b", "c", "d"])
    assert sweep.cache_key(run, rows, pack, "cpu") != base


def test_hand_audit_druckt_ohne_manifest_zeile_keine_quote(tmp_path, monkeypatch, capsys):
    """`max(1, tot["train"])` machte aus "nichts gemessen" ein gemessenes 0,000 %."""
    import hand_audit

    rec = tmp_path / "recordings"
    (rec / "20-19").mkdir(parents=True)
    dd = tmp_path / "ds"
    dd.mkdir()
    (dd / "split-pin.json").write_text(json.dumps({"splits": {"train": ["rg-20-19"]}}),
                                       encoding="utf-8")
    # Keine Manifest-Zeile dieser Aufnahme: der Nenner ist 0, nicht 1.
    _write(dd / "manifest.jsonl", [{"session_id": "rg-andere", "frame": "f1", "square": "e4"}])

    monkeypatch.setattr(hand_audit, "REC", rec)
    monkeypatch.setattr("chesslab.dataset_build.dataset_dir", lambda _n: dd)
    monkeypatch.setattr(sys, "argv", ["hand_audit", "--dataset", "ds"])

    assert hand_audit.main() == 0
    out = capsys.readouterr().out
    assert "nichts gemessen" in out
    assert "0,000" not in out


def test_audit_sessions_druckt_ohne_situation_keine_quote(tmp_path, monkeypatch, capsys):
    """Dieselbe Klammer je Aufnahme: 0 von 0 Situationen las sich als makellose 0,0 %."""
    import audit_sessions

    dd = tmp_path / "ds"
    man = [{"path": "a", "session_id": "rg-20-19", "square": "e4", "label": "wP", "coverage": 0.0}]
    _write(dd / "manifest.jsonl", man)
    (dd / "split-f1.json").write_text(json.dumps({"splits": {"test": ["rg-20-19"]}}),
                                      encoding="utf-8")
    folds = tmp_path / "_folds" / "run-f1"
    _write(folds / "metrics.jsonl", [{"epoch": i} for i in range(60)])

    monkeypatch.setattr(audit_sessions, "dataset_dir", lambda _n: dd)
    monkeypatch.setattr(audit_sessions, "open_packed_rows",
                        lambda *a, **k: (np.zeros((1, 1, 1, 3), dtype=np.uint8), {"a": 0}))
    monkeypatch.setattr(audit_sessions.occluded_model, "all_reads",
                        lambda _run, cells: [{"pred_label": "wP", "probs": [1.0]}] * len(cells))
    monkeypatch.setattr(sys, "argv", ["audit_sessions", "--dataset", "ds",
                                      "--folds", str(tmp_path / "_folds"),
                                      "--out", str(tmp_path / "audit.json")])

    audit_sessions.main()
    # Eine einzige Zeile traegt die Gruppe: unter `--min-n`, also 0 beurteilte Situationen.
    line = next(ln for ln in capsys.readouterr().out.splitlines() if ln.startswith("rg-20-19"))
    assert line.endswith("(   —)")
