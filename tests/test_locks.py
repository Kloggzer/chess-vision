"""The crop pool takes ONE writer."""

from __future__ import annotations

import json
import os

import pytest

from chesslab import config, locks


def test_a_second_writer_is_refused_while_the_first_holds_the_pool(tmp_path, monkeypatch):
    pool = tmp_path / "crops" / "default"
    pool.mkdir(parents=True)
    with locks.pool_lock(pool, "slice 3 session(s)"):
        monkeypatch.setattr(os, "getpid", lambda: 999999)   # pretend to be another process
        monkeypatch.setattr(locks, "pid_alive", lambda pid: True)
        with pytest.raises(RuntimeError, match="is being written by"):
            with locks.pool_lock(pool, "slice 1 session(s)"):
                pass


def test_the_lock_is_released_even_when_the_run_raises(tmp_path):
    pool = tmp_path / "crops" / "default"
    pool.mkdir(parents=True)
    with pytest.raises(ValueError, match="boom"):
        with locks.pool_lock(pool, "slice"):
            raise ValueError("boom")
    assert not locks.pool_lock_path(pool).exists()


def test_a_lock_from_a_dead_process_is_reclaimed(tmp_path, monkeypatch):
    pool = tmp_path / "crops" / "default"
    pool.mkdir(parents=True)
    locks.pool_lock_path(pool).write_text(json.dumps({"pid": 424242, "job": "slice"}))
    monkeypatch.setattr(locks, "pid_alive", lambda pid: False)

    with locks.pool_lock(pool, "slice"):
        assert json.loads(locks.pool_lock_path(pool).read_text())["pid"] == os.getpid()


def test_a_build_refuses_a_pool_that_is_being_written(tmp_path, monkeypatch):
    """The 10:03 race: the build read a manifest a slice was still rewriting."""
    from chesslab import dataset_build

    paths = config.Paths(root=tmp_path)
    pool = paths.crop_pool
    pool.mkdir(parents=True)
    (pool / "manifest.jsonl").write_text("", encoding="utf-8")
    locks.pool_lock_path(pool).write_text(json.dumps(
        {"pid": 999999, "job": "slice", "name": "39 session(s)", "startedAt": "09:59"}))
    monkeypatch.setattr(locks, "pid_alive", lambda pid: pid == 999999)

    with pytest.raises(ValueError, match="is being written by"):
        dataset_build.build_dataset("ds", ["s1"], paths=paths, write_pack=False)
