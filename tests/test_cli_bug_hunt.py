"""Red tests for operator-surface defects in ``chesslab.cli`` and ``scripts/``."""

from __future__ import annotations

import json
import sys

from typer.testing import CliRunner

from chesslab import config
from chesslab.cli import app
from conftest import load_script


def test_ingest_default_uses_the_configured_synthetic_warp_size(tmp_path, monkeypatch):
    from chesslab import ingest

    seen = {}

    def fake_run_ingest(adapter, root, **kwargs):
        seen.update(kwargs)
        return {
            "adapter": adapter,
            "items": 0,
            "sessions": 0,
            "crops": 0,
            "manifest": tmp_path / "manifest.jsonl",
        }

    monkeypatch.setattr(ingest, "run_ingest", fake_run_ingest)

    result = CliRunner().invoke(app, ["ingest", "synthetic", str(tmp_path)])

    assert result.exit_code == 0
    assert seen["board_size"] == config.SYNTH.warp_board_size, (
        "`chesslab ingest` still hard-codes a 900 px warp although the synthetic pipeline's "
        "configured and documented resolution is 1100 px; omitting --board-size silently "
        "throws away source resolution before crops are cut"
    )


def test_session_park_frames_returns_failure_when_a_session_fails(monkeypatch):
    from chesslab import session_boards

    def fail(_session):
        raise ValueError("park failed")

    monkeypatch.setattr(session_boards, "park_frames_session", fail)

    result = CliRunner().invoke(app, ["session", "park-frames", "rg-broken"])

    assert result.exit_code != 0, (
        "`session park-frames` catches a per-session failure, prints [FAIL], then exits 0; "
        "automation therefore treats an unparked or partly parked corpus as success"
    )


def test_session_fit_mesh_all_returns_failure_when_a_session_fails(monkeypatch):
    from chesslab import sessions

    ran = []

    def fake_all(run, on_done):
        ran.append(run)
        row = {"session_id": "rg-broken", "error": "mesh failed"}
        on_done(row)
        return [row]

    monkeypatch.setattr(sessions, "sweep", fake_all)

    result = CliRunner().invoke(app, ["session", "fit-mesh", "--all"])

    assert ran == [sessions.fit_mesh_session]

    assert result.exit_code != 0, (
        "`session fit-mesh --all` reports failed sessions in its final summary but still exits 0, "
        "so a partial corpus mesh pass appears successful to the calling pipeline"
    )


def test_session_mark_hands_all_returns_failure_when_a_session_fails(monkeypatch):
    from chesslab import sessions

    ran = []

    def fake_all(run, on_done):
        ran.append(run)
        row = {"session_id": "rg-broken", "error": "hand scan failed"}
        on_done(row)
        return [row]

    monkeypatch.setattr(sessions, "sweep", fake_all)

    result = CliRunner().invoke(app, ["session", "mark-hands", "--all"])

    assert ran == [sessions.mark_hands_session]

    assert result.exit_code != 0, (
        "`session mark-hands --all` prints a failure count but exits 0, allowing unscanned "
        "sessions whose hand frames can still enter training to pass an automated run"
    )


def test_realgames_adopt_dirty_returns_failure_when_a_recording_fails(monkeypatch):
    from chesslab.realgames import export as rg_export

    def fail(_name):
        raise ValueError("adoption failed")

    monkeypatch.setattr(rg_export, "adopt_reported_dirty", fail)

    result = CliRunner().invoke(app, ["realgames", "adopt-dirty", "broken"])

    assert result.exit_code != 0, (
        "`realgames adopt-dirty` catches the recording error, prints [ERR], then prints a final "
        "[OK] and exits 0 even though no reported hand frames were adopted"
    )


def test_occluders_close_seams_returns_failure_when_a_session_fails(monkeypatch):
    from chesslab import matte

    def fail(_name, **_kwargs):
        raise OSError("matte unreadable")

    monkeypatch.setattr(matte, "close_seams", fail)

    result = CliRunner().invoke(app, ["occluders", "close-seams", "broken"])

    assert result.exit_code != 0, (
        "`occluders close-seams` swallows an unreadable-matte error and exits 0, so a maintenance "
        "job can leave every requested alpha untouched while reporting shell success"
    )


def test_session_trim_requires_confirmation_before_dropping_the_tail(monkeypatch):
    from chesslab import session_lifecycle

    called = []

    def fake_trim(session, keep):
        called.append((session, keep))
        return {"removed_frames": 9, "removed_crops": 576}

    monkeypatch.setattr(session_lifecycle, "trim_session", fake_trim)

    result = CliRunner().invoke(app, ["session", "trim", "rg-valued", "--keep", "1"])

    assert not called, (
        "`session trim` invokes the destructive backend immediately, with no confirmation or "
        "explicit --yes guard, although it drops the session tail and all of its labeled crops"
    )
    assert result.exit_code != 0


def test_stage_model_asset_refuses_to_overwrite_an_existing_asset(tmp_path, monkeypatch):
    script = load_script("stage_model_asset")
    run = tmp_path / "run"
    run.mkdir()
    (run / "config.json").write_text(
        json.dumps({"head": "occlusion", "classes": ["empty"]}), encoding="utf-8"
    )
    (run / "model.onnx").write_bytes(b"new-model")
    script.ASSETS = tmp_path / "assets"
    deployed = script.ASSETS / "phone-model"
    deployed.mkdir(parents=True)
    old_model = deployed / "model.onnx"
    old_config = deployed / "config.json"
    old_model.write_bytes(b"deployed-model")
    old_config.write_text("deployed-config", encoding="utf-8")
    monkeypatch.setattr(
        sys,
        "argv",
        ["stage_model_asset.py", str(run), "--gate", "0.2", "--name", "phone-model"],
    )

    script.main()

    assert old_model.read_bytes() == b"deployed-model" and old_config.read_text(
        encoding="utf-8"
    ) == "deployed-config", (
        "`stage_model_asset.py` silently overwrites an already deployed model and config; it has "
        "no --force flag, confirmation, or backup to protect the previous APK asset"
    )


def test_thin_per_position_refuses_to_overwrite_an_existing_dataset(tmp_path, monkeypatch):
    script = load_script("thin_per_position")
    source = tmp_path / "source"
    target = tmp_path / "target"
    source.mkdir()
    target.mkdir()
    row = {
        "session_id": "rg-one",
        "ply": 1,
        "frame": "000001",
        "square": "a1",
        "label": "empty",
        "coverage": 0.0,
    }
    (source / "manifest.jsonl").write_text(json.dumps(row) + "\n", encoding="utf-8")
    existing = target / "manifest.jsonl"
    existing.write_text("existing-dataset\n", encoding="utf-8")
    script.dataset_dir = lambda name: {"source": source, "target": target}[name]
    monkeypatch.setattr(
        sys, "argv", ["thin_per_position.py", "source", "target", "--clean", "1"]
    )

    script.main()

    assert existing.read_text(encoding="utf-8") == "existing-dataset\n", (
        "`thin_per_position.py` uses exist_ok=True and silently overwrites an existing dataset's "
        "manifest and metadata, while any old packed files in that directory remain stale"
    )
