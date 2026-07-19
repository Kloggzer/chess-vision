"""Tests for training/pack.py — memmap packing, chunking and resume.

`pack_dataset` had no coverage at all while it grew the parts that repeatedly broke in practice:
whole-file mappings blowing the Windows commit limit, and a crash costing the entire multi-hour
pack. These tests pin the round-trip, the small-chunk behaviour and the resume sidecar.
"""

from __future__ import annotations

import json

import numpy as np
import pytest
from PIL import Image

from chesslab import config
from chesslab.training import pack as pack_mod

CROP = 8  # tiny crops keep the tests fast; the code only cares about h/w consistency


def _make_dataset(tmp_path, n: int, name: str = "ds"):
    """Create a minimal built-dataset dir: manifest.jsonl + one PNG per row."""
    dd = tmp_path / "datasets" / name
    (dd / "squares").mkdir(parents=True)
    rows = []
    for i in range(n):
        p = dd / "squares" / f"{i:04d}.png"
        # Distinct constant colour per crop so we can verify the memmap row-by-row.
        Image.fromarray(np.full((CROP, CROP, 3), i % 256, dtype=np.uint8)).save(p)
        rows.append({"path": p.as_posix(), "out_size": [CROP, CROP], "label": "empty"})
    (dd / "manifest.jsonl").write_text(
        "\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    return dd, rows


@pytest.fixture
def paths(tmp_path, monkeypatch):
    """config.Paths rooted in tmp_path so nothing touches the real data dir."""
    p = config.Paths(root=tmp_path)
    monkeypatch.setattr(pack_mod.config, "DATA", p)
    return p


class _SerialPool:
    """Drop-in for multiprocessing.Pool that runs tasks in-process.

    Needed because the chunk-observing spies below are local closures, which cannot be pickled to
    Windows spawn workers. Running serially exercises the same task-splitting and resume logic.
    """

    def __init__(self, *_a, **_kw) -> None:
        pass

    def __enter__(self) -> _SerialPool:
        return self

    def __exit__(self, *_exc) -> bool:
        return False

    def imap_unordered(self, fn, tasks):
        for t in tasks:
            yield fn(t)


@pytest.fixture
def serial_pool(monkeypatch):
    import multiprocessing

    monkeypatch.setattr(multiprocessing, "Pool", _SerialPool)


def _packed_array(dd, n):
    img, _ = pack_mod._packed_paths(dd)
    return np.memmap(img, dtype=np.uint8, mode="r", shape=(n, CROP, CROP, 3))


def test_pack_round_trip_writes_every_crop(tmp_path, paths):
    dd, rows = _make_dataset(tmp_path, 12)
    res = pack_mod.pack_dataset("ds", paths=paths, workers=2)

    assert res["n"] == 12
    arr = _packed_array(dd, 12)
    for i in range(12):
        assert arr[i].min() == arr[i].max() == i, f"row {i} not packed correctly"

    meta = json.loads((dd / "packed_meta.json").read_text(encoding="utf-8"))
    assert meta["n"] == 12 and meta["h"] == CROP and meta["w"] == CROP
    assert meta["paths"] == [r["path"] for r in rows]


def test_pack_removes_progress_sidecar_when_complete(tmp_path, paths):
    dd, _ = _make_dataset(tmp_path, 6)
    pack_mod.pack_dataset("ds", paths=paths, workers=2)
    assert not (dd / "packed_progress.json").exists()


def test_many_small_chunks_not_one_big(tmp_path, paths, monkeypatch, serial_pool):
    """Chunk size follows _PACK_CHUNK_BYTES — that is what bounds a worker's mapping."""
    dd, _ = _make_dataset(tmp_path, 20)
    monkeypatch.setattr(pack_mod, "_PACK_CHUNK_BYTES", 4 * CROP * CROP * 3)  # 4 crops per chunk

    seen: list[int] = []
    real = pack_mod._pack_chunk

    def spy(task):
        seen.append(len(task[2]))
        return real(task)

    monkeypatch.setattr(pack_mod, "_pack_chunk", spy)
    pack_mod.pack_dataset("ds", paths=paths, workers=1)

    assert len(seen) == 5, f"expected 5 chunks of 4 crops, got {seen}"
    assert max(seen) == 4


def test_resume_skips_already_packed_chunks(tmp_path, paths, monkeypatch, serial_pool):
    dd, _ = _make_dataset(tmp_path, 20)
    crop_bytes = CROP * CROP * 3
    monkeypatch.setattr(pack_mod, "_PACK_CHUNK_BYTES", 4 * crop_bytes)

    # First pass: complete pack (creates the file at full size).
    pack_mod.pack_dataset("ds", paths=paths, workers=1)

    # Claim the first three chunks (0, 4, 8) are done; only 12 and 16 should be re-run.
    img, meta = pack_mod._packed_paths(dd)
    (dd / "packed_progress.json").write_text(json.dumps({
        "signature": {"n": 20, "h": CROP, "w": CROP, "csize": 4},
        "done": [0, 4, 8],
    }), encoding="utf-8")

    starts: list[int] = []
    real = pack_mod._pack_chunk

    def spy(task):
        starts.append(task[2][0][0])
        return real(task)

    monkeypatch.setattr(pack_mod, "_pack_chunk", spy)
    pack_mod.pack_dataset("ds", paths=paths, workers=1)

    assert sorted(starts) == [12, 16], f"resume re-ran the wrong chunks: {starts}"


def test_resume_ignores_progress_with_stale_signature(tmp_path, paths, monkeypatch, serial_pool):
    dd, _ = _make_dataset(tmp_path, 8)
    crop_bytes = CROP * CROP * 3
    monkeypatch.setattr(pack_mod, "_PACK_CHUNK_BYTES", 4 * crop_bytes)
    pack_mod.pack_dataset("ds", paths=paths, workers=1)

    # Signature from a DIFFERENT dataset shape -> must be discarded, everything re-packed.
    (dd / "packed_progress.json").write_text(json.dumps({
        "signature": {"n": 999, "h": CROP, "w": CROP, "csize": 4},
        "done": [0, 4],
    }), encoding="utf-8")

    starts: list[int] = []
    real = pack_mod._pack_chunk

    def spy(task):
        starts.append(task[2][0][0])
        return real(task)

    monkeypatch.setattr(pack_mod, "_pack_chunk", spy)
    pack_mod.pack_dataset("ds", paths=paths, workers=1)

    assert sorted(starts) == [0, 4], "stale signature must invalidate the resume state"


def test_wrong_size_file_is_reallocated_and_progress_dropped(tmp_path, paths, monkeypatch):
    dd, _ = _make_dataset(tmp_path, 8)
    crop_bytes = CROP * CROP * 3
    monkeypatch.setattr(pack_mod, "_PACK_CHUNK_BYTES", 4 * crop_bytes)

    img, _ = pack_mod._packed_paths(dd)
    img.write_bytes(b"\0" * 16)                      # truncated leftover from a failed run
    (dd / "packed_progress.json").write_text(json.dumps({
        "signature": {"n": 8, "h": CROP, "w": CROP, "csize": 4},
        "done": [0, 4],
    }), encoding="utf-8")

    pack_mod.pack_dataset("ds", paths=paths, workers=1)

    assert img.stat().st_size == 8 * crop_bytes
    arr = _packed_array(dd, 8)
    for i in range(8):
        assert arr[i].min() == arr[i].max() == i, "reallocated file must be fully re-packed"


def test_empty_manifest_raises(tmp_path, paths):
    dd = tmp_path / "datasets" / "ds"
    dd.mkdir(parents=True)
    (dd / "manifest.jsonl").write_text("", encoding="utf-8")
    with pytest.raises(ValueError, match="empty manifest"):
        pack_mod.pack_dataset("ds", paths=paths)
