"""Gegenprobe fuer den Profil-Fehler der zusammengefuehrten Temporal-Aufrufer."""

from __future__ import annotations

import json

import pytest
from typer.testing import CliRunner

from chesslab import config, temporal_flags
from chesslab.cli import app


@pytest.mark.parametrize("verb", [
    "temporal-adopt", "temporal-upsert", "temporal-scan", "temporal-mattes", "temporal-pass"])
def test_temporal_commands_report_a_missing_profile_without_a_traceback(tmp_path, monkeypatch, verb):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    recording = tmp_path / "recordings" / "broken"
    recording.mkdir(parents=True)
    (recording / "session.yaml").write_text("session_id: rg-broken\n", encoding="utf-8")
    (recording / "log.jsonl").write_text("", encoding="utf-8")
    proposals = tmp_path / "reports" / "temporal-mattes" / "broken" / "local"
    proposals.mkdir(parents=True)
    (proposals / "proposals.jsonl").write_text("", encoding="utf-8")
    (proposals / "proposals.meta.json").write_text(
        json.dumps({"source": temporal_flags.source_stamp(recording)}), encoding="utf-8"
    )

    result = CliRunner().invoke(app, ["session", verb, "rg-broken"])

    assert result.exit_code == 1
    assert type(result.exception) is SystemExit
    assert "[ERR]" in result.output
    assert "session.yaml nennt kein Profil" in result.output


def test_sensor_agreement_reports_a_missing_profile_without_a_traceback(tmp_path, monkeypatch, capsys):
    from chesslab import sensor_audit

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    recording = tmp_path / "recordings" / "broken"
    recording.mkdir(parents=True)
    (recording / "session.yaml").write_text("session_id: rg-broken\n", encoding="utf-8")
    out = tmp_path / "out.jsonl"
    monkeypatch.setattr("sys.argv", ["sensor_agreement", "--session", "rg-broken", "--out", str(out)])

    with pytest.raises(SystemExit) as caught:
        sensor_audit.main()

    assert caught.value.code == 1
    assert "[ERR]" in capsys.readouterr().err
    assert not out.exists()
