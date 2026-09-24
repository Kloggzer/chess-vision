"""Architektur-Hypothesen aus dem Codex-Review; Befunde als `xfail(strict=True)`.
Bericht: `docs/architektur-review-python-2026-09-23.md`."""

from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
import pytest

from chesslab import (
    config,
    ioutil,
    provenance,
    session_boards,
    session_lifecycle,
    temporal_flags,
    temporal_matte,
)
from chesslab.session_store import log as store_log
from conftest import write_jsonl


def _recording(tmp_path: Path, monkeypatch, name: str = "g") -> Path:
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    rec = tmp_path / "recordings" / name
    (rec / "frames").mkdir(parents=True)
    (rec / "mattes").mkdir()
    (rec / "frames" / "000001.png").write_bytes(b"x")
    (rec / "session.yaml").write_text(f"session_id: rg-{name}\nprofile: p\n", encoding="utf-8")
    row = {"frame": "frames/000001.png", "ply": 1, "board": "boards/000001.webp",
           "corners": [[0, 0], [1, 0], [1, 1], [0, 1]],
           "settle_dev": [2.0] * 64, "settle_seen": [9] * 64, "settle_left": ["a1"]}
    (rec / "log.jsonl").write_text(json.dumps(row) + "\n", encoding="utf-8")
    return rec


# H2 -------------------------------------------------------------------------------------------

@pytest.mark.xfail(strict=True, reason="BUG H2: neue Bretter behalten die Settle-Messung der alten; "
                                       "0 von 27 betroffen, offene-entscheidungen A1")
def test_rewritten_boards_drop_the_settle_measurement(tmp_path, monkeypatch):
    """Die Pixel-Seite derselben Luecke: `settle_for_ply` hat die ALTEN Bretter gemessen."""
    from chesslab import labeling
    from chesslab.realgames import boards as rg_boards

    rec = _recording(tmp_path, monkeypatch)
    monkeypatch.setattr(labeling, "_profile_for_session", lambda _meta, _x: object())
    monkeypatch.setattr(rg_boards, "board_from_frame",
                        lambda _job: {"board": "boards/000001.webp", "board_size": 928})
    monkeypatch.setattr(rg_boards, "straighten_boards",
                        lambda *_a, **_k: {"straightened": 0})
    session_boards.write_boards_session("rg-g")
    assert "settle_dev" not in store_log.read_log(rec)[0]


# H3 -------------------------------------------------------------------------------------------

def test_a_profile_edit_stales_the_pass_like_its_scan(tmp_path, monkeypatch):
    """Zwei Uhren, ein Lauf: `propose_session` verweigert, `chain.ts` meldet die Sprosse erledigt."""
    rec = _recording(tmp_path, monkeypatch)
    profile = config.DATA.calibration / "p.yaml"
    profile.parent.mkdir(parents=True)
    profile.write_text("margin: 0.045\n", encoding="utf-8")
    report = temporal_matte.write_pass_report("rg-g", {"adopted": 0})
    before = temporal_flags.source_stamp(rec)
    profile.write_text("margin: 0.050\n", encoding="utf-8")
    later = profile.stat().st_mtime_ns + 10**9
    os.utime(profile, ns=(later, later))
    assert temporal_flags.source_stamp(rec) != before
    with pytest.raises(provenance.Stale):
        provenance.check(rec, report)


# H4 -------------------------------------------------------------------------------------------

def test_the_metric_mask_is_classification_eligible():
    """`_occlusion_diagnostics` baut die Zellregel als NumPy-Ausdruck nach — heute deckungsgleich."""
    from chesslab.cell_rule import classification_eligible
    from chesslab.training.epoch_metrics import _occlusion_diagnostics

    rows = [{"session_id": "s", "frame": str(i), "coverage": c, "brightness": b}
            for i, (c, b) in enumerate([(0.0, None), (0.15, 25.0), (0.1500001, 200.0),
                                        (0.1, 24.9), (None, 30.0), (0.9, None)])]
    cov = np.array([float(r["coverage"] or 0.0) for r in rows], dtype=np.float32)
    val = {"coverage_trues": cov, "coverage_probs": cov,
           "trues": np.zeros(len(rows), dtype=int), "preds": np.zeros(len(rows), dtype=int)}
    diag = _occlusion_diagnostics(val, rows, ["empty", "wP"], 0.15)
    assert diag["val_visible_n"] == sum(classification_eligible(r) for r in rows)


# H5 -------------------------------------------------------------------------------------------

def test_a_log_rewrite_keeps_a_verdict_set_meanwhile(tmp_path, monkeypatch):
    """Ein langer Lauf (settle-scan, fit-mesh, boards) liest das Log am Anfang und schreibt am Ende.

    Setzt der Mensch dazwischen `unusable` (Web: `lib/frame-flag.ts`, CLI: `flag_frame`), ist es weg.
    """
    rec = _recording(tmp_path, monkeypatch)
    snapshot = store_log.read_log(rec)
    store_log.flag_frame("rg-g", 0, True)
    try:
        store_log._write_log(rec, snapshot)
    except ioutil.Contested:
        return
    assert store_log.read_log(rec)[0].get("unusable") is True


def test_trim_keeps_a_matte_row_appended_meanwhile(tmp_path, monkeypatch):
    """Die sieben anderen Schreiber von `matte.jsonl` pruefen den Stempel, dieser nicht."""
    rec = _recording(tmp_path, monkeypatch)
    path = rec / "matte.jsonl"
    path.write_text(json.dumps({"frame": "000001", "coverage": {"a1": 0.0}}) + "\n", encoding="utf-8")
    real = session_lifecycle.read_jsonl

    def read_then_worker_appends(p):
        rows = real(p)
        if Path(p) == path:
            ioutil.append_rows(path, [{"frame": "000009", "coverage": {"a1": 0.8}}])
        return rows

    monkeypatch.setattr(session_lifecycle, "read_jsonl", read_then_worker_appends)
    try:
        session_lifecycle._filter_matte_frames(rec, {"000001"})
    except ioutil.Contested:
        return
    assert "000009" in {r["frame"] for r in real(path)}


def test_a_refused_upsert_leaves_the_alphas_alone(tmp_path, monkeypatch):
    """`close_seams` stagt und haengt zuletzt um; der Upsert benennt SOFORT um.

    Nach dem `Contested` traegt `matte.jsonl` weiter die Upsert-Coverage, die Datei aber SAMs Alpha.
    """
    rec = _recording(tmp_path, monkeypatch)
    rows = [{"frame": "000001", "coverage": {"a1": 0.0}},
            {"frame": "000001", "source": "upsert", "coverage": {"a1": 0.9}}]
    write_jsonl(rec / "matte.jsonl", rows)
    (rec / "mattes" / "000001.webp").write_bytes(b"upsert-alpha")
    (rec / "mattes" / "000001.sam.webp").write_bytes(b"sam-alpha")
    proposals = tmp_path / "reports" / "temporal-mattes" / "g" / "local"
    proposals.mkdir(parents=True)
    (proposals / "proposals.jsonl").write_text(json.dumps({"frame": "000001"}) + "\n",
                                               encoding="utf-8")
    monkeypatch.setattr(temporal_matte, "require_fresh_proposals", lambda *_a: None)
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda _name: object())
    # Der Alpha-Worker haengt an, waehrend der Upsert laeuft: der bewachte Rewrite verweigert.
    monkeypatch.setattr(temporal_matte, "stamp_of", lambda _p: (0, 0))
    with pytest.raises(ioutil.Contested):
        temporal_matte.upsert_proposals("rg-g")
    assert (rec / "mattes" / "000001.webp").read_bytes() == b"upsert-alpha"


# H6 -------------------------------------------------------------------------------------------

def test_a_sam_row_after_the_pass_reopens_it(tmp_path, monkeypatch):
    """Der Upsert gilt fuer Frames, auf denen SAM NICHTS fand — kommt so ein Frame spaeter dazu,
    hat ihn kein Lauf gesehen, und die Kette haelt die Sprosse trotzdem zu (63 Frames, 18 Aufnahmen).
    """
    rec = _recording(tmp_path, monkeypatch)
    (rec / "matte.jsonl").write_text("", encoding="utf-8")
    report = temporal_matte.write_pass_report("rg-g", {"upserted": 0})
    ioutil.append_rows(rec / "matte.jsonl", [{"frame": "000001", "coverage": {"a1": 0.0}}])
    with pytest.raises(provenance.Stale):
        provenance.check(rec, report)
