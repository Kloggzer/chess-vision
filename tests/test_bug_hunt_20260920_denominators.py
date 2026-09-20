"""Skript-Jagd 2026-09-20b: vier Nenner und ein Cache, die mehr behaupten als sie messen.

Drei Skripte teilten dieselbe Wurzel wie die Fallen in CLAUDE.md: eine uebersprungene Zeile blieb
im Nenner stehen, also las sich NICHT GEMESSEN wie gemessen. Der vierte Fall ist der
`--probs-cache` von `sweep_prior_lambda`, der nur die Zeilenzahl prueft. Jeder Test hier war vor
seinem Fix rot.
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))


def _write(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")


class _FakeCv2:
    """Kein Bild lesen, keine Rillen messen — geprueft wird allein der Nenner des Berichts."""

    COLOR_BGR2GRAY = 0
    imread = staticmethod(lambda _p: np.zeros((8, 8, 3), dtype=np.uint8))
    cvtColor = staticmethod(lambda _img, _code: np.zeros((8, 8), dtype=np.uint8))


def test_matte_audit_nennt_nur_die_geprueften_matten(tmp_path, monkeypatch, capsys):
    """`von {len(blind)}` zaehlte die Matten ohne Brett mit — der Kommentar sagte es selbst."""
    import matte_audit

    rec = tmp_path / "recordings" / "20-19"
    _write(rec / "matte.jsonl",
           [{"frame": f, "dirty_reason": "occluded"} for f in ("f1", "f2", "f3")])
    for f in ("f1", "f2"):
        (rec / "boards").mkdir(parents=True, exist_ok=True)
        (rec / "boards" / f"{f}.webp").write_bytes(b"")

    seen = iter([{"e4"}, set()])
    monkeypatch.setattr(matte_audit, "cv2", _FakeCv2())
    monkeypatch.setattr(matte_audit, "missing_edges", lambda *a, **k: None)
    monkeypatch.setattr(matte_audit, "hand_squares", lambda _e: next(seen))
    monkeypatch.setattr(sys, "argv", ["matte_audit", "--recordings", str(tmp_path / "recordings"),
                                      "--out", str(tmp_path / "out.jsonl")])

    assert matte_audit.main() == 0
    line = next(ln for ln in capsys.readouterr().out.splitlines() if "20-19" in ln)
    assert "von    2" in line and "von    3" not in line


def test_scan_ply_offset_zaehlt_uebersprungene_frames_nicht_als_geprueft():
    """Der Bericht nannte `len(per_frame)`, also auch Frames ohne 32 sichtbare Zellen."""
    import scan_ply_offset

    full = [{"path": f"p{i}", "square": sq, "coverage": 0.0}
            for i, sq in enumerate(f"{c}{r}" for r in "12345678" for c in "abcdefgh")]
    per_frame = {("s", "f1", 1): full, ("s", "f2", 1): full[:3]}
    boards = {("s", 0): {"a1": "empty"}, ("s", 1): {"a1": "empty"}}
    pred = {r["path"]: "empty" for r in full}

    hits, checked = scan_ply_offset.offsets(per_frame, boards, pred)
    assert (hits, checked) == ([], 1)


def test_audit_lane_probe_teilt_durch_die_gemessenen_zellen():
    """Der Handanteil lief durch `n_shown`; ein Frame ohne Matte-Zeile drueckte ihn auf die Haelfte."""
    import audit_lane_probe

    line = audit_lane_probe.hand_line(n_hand=5, n_shown=10, n_blind=5)
    assert "5 von 5 gemessenen (100 %)" in line


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
    assert sweep.cached_probs(cache, sweep.cache_key(run), 2).tolist() == got.tolist()
    assert sweep.cached_probs(cache, sweep.cache_key(tmp_path / "run-c"), 2) is None


def test_hand_audit_meldet_ohne_manifest_zeile_keine_quote():
    """`max(1, tot["train"])` machte aus "nichts gemessen" ein gemessenes 0,000 %."""
    import hand_audit

    assert "nichts gemessen" in hand_audit.share_line(Counter())
    assert "0,000" not in hand_audit.share_line(Counter())


def test_audit_sessions_meldet_ohne_situation_keine_quote():
    """Dieselbe Klammer je Aufnahme: 0 von 0 Situationen las sich als makellose 0,0 %."""
    import audit_sessions

    leer = {"situations": 0, "richtig": 0, "wackelig": 0, "verdaechtig": 0}
    assert audit_sessions.share_cells(leer).endswith("(   —)")
    assert audit_sessions.share_cells({**leer, "situations": 4, "verdaechtig": 1}).endswith(
        "(25.0%)")
