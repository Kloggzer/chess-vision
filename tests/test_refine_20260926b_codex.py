from __future__ import annotations

import json
import os
from pathlib import Path

from typer.testing import CliRunner

from chesslab import dataset, locks, matte, sessions
from chesslab.cli import app


def test_release_rechecks_identity_after_permission_retry(tmp_path, monkeypatch):
    lock = tmp_path / "publish.lock"
    ours = {"pid": os.getpid(), "childPid": os.getpid(), "token": "ours"}
    successor = {"pid": os.getpid(), "childPid": os.getpid(), "token": "successor"}
    lock.write_text(json.dumps(ours), encoding="utf-8")
    real_unlink = Path.unlink
    attempts = 0

    def contested_unlink(path: Path, *args, **kwargs):
        nonlocal attempts
        if path == lock and attempts == 0:
            attempts += 1
            lock.write_text(json.dumps(successor), encoding="utf-8")
            raise PermissionError("the first owner lost its delete race")
        return real_unlink(path, *args, **kwargs)

    monkeypatch.setattr(Path, "unlink", contested_unlink)
    locks.release(lock, "ours")

    assert json.loads(lock.read_text(encoding="utf-8")) == successor
    assert attempts == 1


def test_sweep_keeps_discovery_order_callback_order_and_typed_errors(tmp_path, monkeypatch):
    found = [("rg-first", tmp_path / "first"), ("second", tmp_path / "second")]
    monkeypatch.setattr(sessions, "all_sessions", lambda paths=None: found)
    called: list[str] = []
    reported: list[dict] = []

    def run(session_id: str) -> dict:
        called.append(session_id)
        if session_id == "rg-first":
            raise ValueError("bad mesh")
        return {"session_id": session_id, "measured": 2}

    rows = sessions.sweep(run, on_done=reported.append)

    assert called == ["rg-first", "second"]
    assert rows == [
        {"session_id": "rg-first", "error": "ValueError: bad mesh"},
        {"session_id": "second", "measured": 2},
    ]
    assert reported == rows


def test_fit_mesh_all_keeps_report_order_and_failure_exit(monkeypatch):
    def fake_sweep(run, on_done):
        assert run is sessions.fit_mesh_session
        rows = [
            {"session_id": "rg-ok", "measured": 3, "of": 4, "curved": 1,
             "tilted": 0, "carried": 1, "backup": "old.jsonl"},
            {"session_id": "rg-bad", "error": "ValueError: broken"},
        ]
        for row in rows:
            on_done(row)
        return rows

    monkeypatch.setattr(sessions, "sweep", fake_sweep)
    result = CliRunner().invoke(app, ["session", "fit-mesh", "--all"])

    assert result.exit_code != 0
    assert result.stdout.index("[OK] rg-ok") < result.stdout.index("[FAIL] rg-bad")
    assert "3 frames meshed and 1 carried over 1 sessions, 1 failed" in result.stdout


def test_write_dataset_files_preserves_classic_bytes_and_row_order(tmp_path, monkeypatch):
    ds = tmp_path / "dataset"
    ds.mkdir()
    rows = [
        {"path": "a.png", "label": "wK", "note": "König"},
        {"path": "b.png", "label": "empty", "n": 2},
    ]
    precomputed = {"train": ["s2", "s1"], "val": [], "test": []}
    split = {"splits": precomputed, "counts": {"train": 2, "val": 0, "test": 0}}
    stats = {"total": 2, "classes": {"wK": 1, "empty": 1}}
    seen: dict = {}

    def fake_make_split(got_rows, *args, **kwargs):
        seen["rows"] = got_rows
        seen["precomputed"] = kwargs["precomputed_splits"]
        return split

    monkeypatch.setattr(dataset, "make_split", fake_make_split)
    monkeypatch.setattr(dataset, "validate_split", lambda *args, **kwargs: ([], []))
    monkeypatch.setattr(dataset, "compute_stats", lambda *args, **kwargs: stats)

    got = dataset.write_dataset_files(
        ds, rows, precomputed, val_frac=0.2, test_frac=0.1, max_empty_ratio=None,
        seed=42, max_class_ratio=None, classes=["wK", "empty"], allow_degenerate=False,
    )

    def legacy_write_bytes(name: str, text: str) -> bytes:
        path = tmp_path / name
        path.write_text(text, encoding="utf-8")
        return path.read_bytes()

    manifest = "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows)
    assert (ds / "manifest.jsonl").read_bytes() == legacy_write_bytes("old-manifest", manifest)
    assert (ds / "split.json").read_bytes() == legacy_write_bytes(
        "old-split", json.dumps(split, indent=2, ensure_ascii=False) + "\n"
    )
    assert (ds / "stats.json").read_bytes() == legacy_write_bytes(
        "old-stats", json.dumps(stats, ensure_ascii=False) + "\n"
    )
    assert got is split
    assert seen == {"rows": rows, "precomputed": precomputed}


def test_matte_helpers_keep_strict_thresholds():
    coverage = {"a1": 0.5, "a2": 0.50001, "a3": 1.0}
    assert matte.coverage_fields(coverage) == {"coverage": coverage, "cells_over_half": 2}
    assert matte._crossed(
        {"a1": 0.15, "a2": 0.15001, "a3": 0.9},
        {"a1": 0.15001, "a2": 0.15, "a3": 0.8},
    ) == 2
