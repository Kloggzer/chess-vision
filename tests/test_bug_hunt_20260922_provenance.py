"""Herkunft an den Python-Tueren, und drei Stellen, die einen Defekt als Erfolg lasen.

Die Kette in `platform/app/lib/chain.ts` VERGLEICHT den `_source`-Stempel; die Python-Verbraucher
lasen ihn weg. Dazu der stumme Ersatz eines fehlenden Kalibrierprofils bei MESSENDEN Befehlen,
der Teilausfall im Stapel-Matten und der beschaedigte Archiv-Beleg.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from chesslab import audit_flags, config, hand_flags, matte, provenance, realgames, sessions


def _session(tmp_path: Path, name: str = "rec") -> Path:
    sdir = tmp_path / "recordings" / name
    sdir.mkdir(parents=True)
    (sdir / "log.jsonl").write_text('{"frame": "f/0.png"}\n', encoding="utf-8")
    return sdir


def _stale(stamp: str) -> str:
    ms, size = stamp.split(":")
    return f"{int(ms) - 60_000}:{int(size) + 7}"


# H1 -------------------------------------------------------------------------------------------

def test_check_passes_without_a_stamp(tmp_path):
    """Altbestand: alles, was heute auf der Platte liegt, ist ungestempelt und gilt weiter."""
    sdir = _session(tmp_path)
    (sdir / "matte.jsonl").write_text('{"frame": "0", "coverage": {}}\n', encoding="utf-8")
    provenance.check(sdir, sdir / "matte.jsonl")


def test_check_passes_on_the_current_stamp(tmp_path):
    sdir = _session(tmp_path)
    row = {"frame": "0", "coverage": {}, "_source": provenance.source(sdir)}
    (sdir / "matte.jsonl").write_text(json.dumps(row) + "\n", encoding="utf-8")
    provenance.check(sdir, sdir / "matte.jsonl")


def test_check_refuses_a_stamp_from_an_older_cut(tmp_path):
    sdir = _session(tmp_path)
    row = {"frame": "0", "coverage": {}, "_source": {"log": _stale(provenance.session_stamp(sdir))}}
    (sdir / "matte.jsonl").write_text(json.dumps(row) + "\n", encoding="utf-8")
    with pytest.raises(provenance.Stale):
        provenance.check(sdir, sdir / "matte.jsonl")


def test_check_reads_a_json_header(tmp_path):
    """`pass.json` traegt den Stempel im Objekt, nicht je Zeile."""
    sdir = _session(tmp_path)
    report = sdir / "pass.json"
    report.write_text(json.dumps({"_source": {"log": _stale(provenance.session_stamp(sdir))}}),
                      encoding="utf-8")
    with pytest.raises(provenance.Stale):
        provenance.check(sdir, report)


def _reads(sdir: Path, stamp: dict) -> Path:
    path = sdir / "model-reads.jsonl"
    rows = [{"_model": "m", "_classes": ["wP"], "_source": stamp},
            {"session_id": "rg-" + sdir.name, "frame": "0", "square": "a1",
             "fen_label": "wP", "model_cov": 0.9, "probs": {"wP": 0.9}}]
    path.write_text("\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    return path


def test_hand_flags_skips_reads_from_an_older_cut(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    sdir = _session(tmp_path)
    _reads(sdir, {"log": _stale(provenance.session_stamp(sdir))})
    res = hand_flags.hand_flags()
    assert [r["session"] for r in res["stale"]] == ["rec"]
    assert res["flags"] == 0


def test_hand_flags_still_reads_an_unstamped_file(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    sdir = _session(tmp_path)
    _reads(sdir, {})
    res = hand_flags.hand_flags()
    assert res["stale"] == []
    assert res["flags"] == 1


def test_audit_flags_skips_reads_from_an_older_cut(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    sdir = _session(tmp_path)
    _reads(sdir, {"log": _stale(provenance.session_stamp(sdir))})
    res = audit_flags.audit_flags()
    assert [s["session"] for s in res["skipped"]] == ["rec"]
    assert res["flags"] == 0


def test_slice_refuses_a_matte_from_an_older_cut(tmp_path, monkeypatch, capsys):
    """Die Tuer, an der die alten Zahlen sonst ins Manifest und ins Training gehen."""
    from chesslab import labeling

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    sdir = _session(tmp_path)
    row = {"frame": "0", "coverage": {}, "_source": {"log": _stale(provenance.session_stamp(sdir))}}
    (sdir / "matte.jsonl").write_text(json.dumps(row) + "\n", encoding="utf-8")
    monkeypatch.setattr(sessions, "session_dir", lambda sid: (sdir, False))
    assert labeling.run_slice(session="rec") == 1
    assert "aelteren Schnitt" in capsys.readouterr().out


# H2 (geparkt) ---------------------------------------------------------------------------------

@pytest.mark.xfail(strict=True, reason="H2: gemessen 0 von 27 Aufnahmen betroffen, siehe "
                                       "docs/offene-entscheidungen.md")
def test_a_new_quad_drops_the_settle_measurement(tmp_path):
    """Der Settle-Sensor liegt in seiner eigenen Invalidierungsquelle.

    `write_corner_rows` raeumt `align_worst_px` weg, weil die Zahl den ERSETZTEN Quad beschreibt —
    `settle_dev`/`settle_seen`/`settle_left` beschreiben ihn genauso und bleiben stehen.
    """
    sdir = tmp_path / "s"
    sdir.mkdir()
    rows = [{"frame": "f/0.png", "corners": [[0, 0], [1, 0], [1, 1], [0, 1]],
             "align_worst_px": 3.0, "settle_dev": {"a1": 2.0}, "settle_left": ["a1"]}]
    (sdir / "log.jsonl").write_text(json.dumps(rows[0]) + "\n", encoding="utf-8")
    sessions.write_corner_rows(sdir, rows, [0], [[0, 0], [2, 0], [2, 2], [0, 2]],
                               source="hand", from_index=None)
    assert "settle_dev" not in rows[0]


# H4 -------------------------------------------------------------------------------------------

def test_session_profile_still_stands_in_for_a_review(tmp_path):
    prof = sessions.session_profile(tmp_path)
    assert prof.board_size == config.DEFAULT_BOARD_SIZE


def test_measuring_callers_refuse_an_invented_profile(tmp_path):
    """`scan_alignment`/`autofix_corners` schreiben ins Log — unter einer erfundenen Kamera nicht."""
    with pytest.raises(FileNotFoundError):
        sessions.session_profile(tmp_path, allow_standin=False)
    (tmp_path / "session.yaml").write_text("profile: nicht-da\n", encoding="utf-8")
    with pytest.raises(FileNotFoundError):
        sessions.session_profile(tmp_path, allow_standin=False)


# H5 -------------------------------------------------------------------------------------------

def test_alpha_worker_all_reports_its_failures(monkeypatch):
    def boom(name, **kw):
        if name == "bad":
            raise FileNotFoundError(f"{name}: no video")
        return {"alphas": 1, "already": 0, "frames": 1}

    monkeypatch.setattr(matte, "alpha_worker", boom)
    monkeypatch.setattr(matte, "unload_models", lambda: None)
    res = matte.alpha_worker_all(["good", "bad"], progress=False)
    assert res["sessions"] == 1
    assert [f["session"] for f in res["failed"]] == ["bad"]


# H6 -------------------------------------------------------------------------------------------

def test_an_unreadable_archive_flag_is_not_a_release(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    gdir = realgames.game_dir("g")
    gdir.mkdir(parents=True)
    (gdir / "ui-meta.json").write_text('{"archived": tr', encoding="utf-8")
    with pytest.raises(ValueError, match="unlesbar"):
        realgames.is_archived("g")
