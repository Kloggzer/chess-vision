"""Tests for training/pack.py — memmap packing, chunking and resume.

`pack_dataset` had no coverage at all while it grew the parts that repeatedly broke in practice:
whole-file mappings blowing the Windows commit limit, and a crash costing the entire multi-hour
pack. These tests pin the round-trip, the small-chunk behaviour and the resume sidecar.
"""

from __future__ import annotations

import json
import os

import numpy as np
import pytest
from PIL import Image

from chesslab import config
from chesslab.training import pack as pack_mod
from chesslab.training import packs

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


@pytest.mark.usefixtures("serial_pool")
def test_many_small_chunks_not_one_big(tmp_path, paths, monkeypatch):
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


@pytest.mark.usefixtures("serial_pool")
def test_resume_skips_already_packed_chunks(tmp_path, paths, monkeypatch):
    dd, _ = _make_dataset(tmp_path, 20)
    crop_bytes = CROP * CROP * 3
    monkeypatch.setattr(pack_mod, "_PACK_CHUNK_BYTES", 4 * crop_bytes)

    # First pass: complete pack (creates the file at full size).
    pack_mod.pack_dataset("ds", paths=paths, workers=1)

    # Claim the first three chunks (0, 4, 8) are done; only 12 and 16 should be re-run.
    # The signature must carry the manifest digest, otherwise resume is refused (by design).
    digest = pack_mod._manifest_digest(pack_mod._manifest_rows(dd))
    (dd / "packed_progress.json").write_text(json.dumps({
        "signature": {"n": 20, "h": CROP, "w": CROP, "csize": 4, "digest": digest},
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


@pytest.mark.usefixtures("serial_pool")
def test_resume_ignores_progress_with_stale_signature(tmp_path, paths, monkeypatch):
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


@pytest.mark.usefixtures("serial_pool")
def test_resume_refuses_when_manifest_changed_under_same_shape(tmp_path, paths, monkeypatch):
    """The silent-corruption case: same n/h/w, DIFFERENT crops.

    Without a content digest the already-allocated file is not re-truncated, the recorded chunks
    are skipped, and packed_meta.json is then written from the NEW manifest — leaving old pixels
    under new labels with exit code 0 and "100%". Training would consume mislabeled images.
    """
    dd, _ = _make_dataset(tmp_path, 8)
    crop_bytes = CROP * CROP * 3
    monkeypatch.setattr(pack_mod, "_PACK_CHUNK_BYTES", 4 * crop_bytes)

    # Produce the sidecar by INTERRUPTING a real pack, so the code's own digest computation is
    # exercised. Hand-writing the sidecar would make this test pass even if `signature` stopped
    # containing a digest at all — the comparison would then fail for the wrong reason.
    real = pack_mod._pack_chunk

    def die_on_second(task):
        if task[2][0][0] != 0:
            raise RuntimeError("simulated interrupt")
        return real(task)

    monkeypatch.setattr(pack_mod, "_pack_chunk", die_on_second)
    with pytest.raises(RuntimeError, match="simulated interrupt"):
        pack_mod.pack_dataset("ds", paths=paths, workers=1)
    monkeypatch.setattr(pack_mod, "_pack_chunk", real)

    sidecar = json.loads((dd / "packed_progress.json").read_text(encoding="utf-8"))
    assert sidecar["done"] == [0], "expected exactly the first chunk to be recorded"
    assert "digest" in sidecar["signature"], "the signature must carry a manifest digest"

    # Same row count and crop size, but different images (offset by 100) at different paths.
    rows = []
    for i in range(8):
        p = dd / "squares" / f"new{i:04d}.png"
        Image.fromarray(np.full((CROP, CROP, 3), 100 + i, dtype=np.uint8)).save(p)
        rows.append({"path": p.as_posix(), "out_size": [CROP, CROP], "label": "empty"})
    (dd / "manifest.jsonl").write_text(
        "\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")

    pack_mod.pack_dataset("ds", paths=paths, workers=1)

    arr = _packed_array(dd, 8)
    for i in range(8):
        assert arr[i].min() == arr[i].max() == 100 + i, (
            f"row {i} holds stale pixels from the previous dataset — resume ignored the manifest "
            f"change (got {arr[i].flat[0]}, expected {100 + i})")


@pytest.mark.usefixtures("serial_pool")
def test_interrupted_repack_does_not_leave_old_meta_published(tmp_path, paths, monkeypatch):
    """A re-pack rewrites the file in place — the OLD meta must not survive the interruption.

    Otherwise load_packed serves a file that is half old pixels, half new, and its digest still
    matches because it describes the same manifest. The progress sidecar is the only hint, and
    on a completed-then-interrupted sequence there may not be one.
    """
    dd, _ = _make_dataset(tmp_path, 8)
    crop_bytes = CROP * CROP * 3
    monkeypatch.setattr(pack_mod, "_PACK_CHUNK_BYTES", 4 * crop_bytes)
    pack_mod.pack_dataset("ds", paths=paths, workers=1)
    assert pack_mod.load_packed("ds", paths=paths) is not None

    # Same paths, new pixel content (a re-slice / synth re-render writing over itself).
    for i in range(8):
        Image.fromarray(np.full((CROP, CROP, 3), 100 + i, dtype=np.uint8)).save(
            dd / "squares" / f"{i:04d}.png")

    real = pack_mod._pack_chunk

    def die_on_second(task):
        if task[2][0][0] != 0:
            raise RuntimeError("simulated interrupt")
        return real(task)

    monkeypatch.setattr(pack_mod, "_pack_chunk", die_on_second)
    with pytest.raises(RuntimeError, match="simulated interrupt"):
        pack_mod.pack_dataset("ds", paths=paths, workers=1)

    assert pack_mod.load_packed("ds", paths=paths) is None, (
        "load_packed accepted a half-rewritten pack — the stale meta was left published")


@pytest.mark.usefixtures("serial_pool")
def test_incomplete_pack_does_not_publish_meta(tmp_path, paths, monkeypatch):
    """A short/failed pack must not leave a meta file that load_packed would happily serve."""
    dd, _ = _make_dataset(tmp_path, 8)
    crop_bytes = CROP * CROP * 3
    monkeypatch.setattr(pack_mod, "_PACK_CHUNK_BYTES", 4 * crop_bytes)

    real = pack_mod._pack_chunk

    def drop_second(task):
        start, count = real(task)
        return (start, 0) if start == 4 else (start, count)   # simulate a chunk not landing

    monkeypatch.setattr(pack_mod, "_pack_chunk", drop_second)
    with pytest.raises(RuntimeError, match="pack incomplete"):
        pack_mod.pack_dataset("ds", paths=paths, workers=1)
    assert not (dd / "packed_meta.json").exists()


def test_load_packed_rejects_pack_from_a_different_manifest(tmp_path, paths, monkeypatch):
    """Second line of defence: a stale pack must be ignored, not silently used for training."""
    dd, _ = _make_dataset(tmp_path, 6)
    pack_mod.pack_dataset("ds", paths=paths, workers=1)
    assert pack_mod.load_packed("ds", paths=paths) is not None

    # Rewrite the manifest with different crop paths but the same shape.
    rows = []
    for i in range(6):
        p = dd / "squares" / f"other{i:04d}.png"
        Image.fromarray(np.full((CROP, CROP, 3), i, dtype=np.uint8)).save(p)
        rows.append({"path": p.as_posix(), "out_size": [CROP, CROP], "label": "empty"})
    (dd / "manifest.jsonl").write_text(
        "\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")

    assert pack_mod.load_packed("ds", paths=paths) is None, (
        "load_packed served a pack that does not match the current manifest")


def test_load_packed_rejects_crops_rewritten_after_the_pack(tmp_path, paths):
    """The blind spot the digest cannot see: same paths, same labels, DIFFERENT pixels.

    This is what a re-slice does — it overwrites the whole crop pool in place. Path + label +
    out_size are unchanged, so the digest still matches and the pack keeps being served, feeding
    training the pixels of the previous geometry. It happened: `occ-real5nd-13c` was packed on
    2026-07-31 00:45 and every one of its crops was rewritten by the corpus re-alignment later
    that day, with `load_packed` still returning the old pack.
    """
    dd, _ = _make_dataset(tmp_path, 6)
    pack_mod.pack_dataset("ds", paths=paths, workers=1)
    assert pack_mod.load_packed("ds", paths=paths) is not None

    img, _meta = pack_mod._packed_paths(dd)
    packed_at = img.stat().st_mtime
    for i in range(6):
        p = dd / "squares" / f"{i:04d}.png"
        Image.fromarray(np.full((CROP, CROP, 3), 100 + i, dtype=np.uint8)).save(p)
        os.utime(p, (packed_at + 60, packed_at + 60))   # explicit: mtime resolution is not ours

    assert pack_mod.load_packed("ds", paths=paths) is None, (
        "load_packed served a pack whose crops were rewritten under it")


def test_load_packed_accepts_an_untouched_pool(tmp_path, paths):
    """The other side: an untouched pool must not be pushed onto the per-PNG loader."""
    _make_dataset(tmp_path, 6)
    pack_mod.pack_dataset("ds", paths=paths, workers=1)

    assert pack_mod.load_packed("ds", paths=paths) is not None


def test_load_packed_rejects_crops_restored_with_an_older_mtime(tmp_path, paths):
    """A `_parked/` restore or a timestamp-preserving copy moves mtime BACKWARDS.

    The pixels are as wrong as after a re-slice, but "newer than the pack" never fires — which is
    why the reference is a fingerprint compared on inequality rather than a timestamp.
    """
    dd, _ = _make_dataset(tmp_path, 6)
    pack_mod.pack_dataset("ds", paths=paths, workers=1)

    for i in range(6):
        p = dd / "squares" / f"{i:04d}.png"
        old = p.stat().st_mtime
        Image.fromarray(np.full((CROP, CROP, 3), 200 + i, dtype=np.uint8)).save(p)
        os.utime(p, (old - 3600, old - 3600))

    assert pack_mod.load_packed("ds", paths=paths) is None


def test_load_packed_rejects_crops_rewritten_while_a_pack_with_a_late_mtime_ran(tmp_path, paths):
    """The 2026-08-21 incident: the memmap's mtime is not the moment its pixels were written.

    A slice rewrote `data/crops/default` 09:59-10:16 while a build packed 10:03-10:22, and the u8
    ended up stamped 10:22 — so every crop touched mid-pack read as OLDER than the pack and the
    already-written chunks were served with the previous geometry's pixels, silently.
    """
    dd, _ = _make_dataset(tmp_path, 6)
    pack_mod.pack_dataset("ds", paths=paths, workers=1)
    img, _meta = pack_mod._packed_paths(dd)
    started = img.stat().st_mtime

    for i in range(6):
        p = dd / "squares" / f"{i:04d}.png"
        Image.fromarray(np.full((CROP, CROP, 3), 100 + i, dtype=np.uint8)).save(p)
        os.utime(p, (started + 60, started + 60))
    os.utime(img, (started + 300, started + 300))      # mtime = end of pack, not its start

    assert pack_mod.load_packed("ds", paths=paths) is None


def test_a_legacy_pack_without_a_fingerprint_still_uses_the_file_mtime(tmp_path, paths):
    dd, _ = _make_dataset(tmp_path, 6)
    pack_mod.pack_dataset("ds", paths=paths, workers=1)
    _img, meta_path = pack_mod._packed_paths(dd)
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    del meta["crop_fingerprint"]
    meta_path.write_text(json.dumps(meta), encoding="utf-8")

    assert pack_mod.load_packed("ds", paths=paths) is not None
    packed_at = _img.stat().st_mtime
    os.utime(dd / "squares" / "0000.png", (packed_at + 60, packed_at + 60))
    assert pack_mod.load_packed("ds", paths=paths) is None


@pytest.mark.usefixtures("serial_pool")
def test_partial_last_chunk_is_packed_correctly(tmp_path, paths, monkeypatch):
    """n not divisible by csize — the last chunk is short and must still land at the right rows."""
    dd, _ = _make_dataset(tmp_path, 10)
    crop_bytes = CROP * CROP * 3
    monkeypatch.setattr(pack_mod, "_PACK_CHUNK_BYTES", 4 * crop_bytes)

    seen: list[int] = []
    real = pack_mod._pack_chunk

    def spy(task):
        seen.append(len(task[2]))
        return real(task)

    monkeypatch.setattr(pack_mod, "_pack_chunk", spy)
    pack_mod.pack_dataset("ds", paths=paths, workers=1)

    assert sorted(seen) == [2, 4, 4], f"expected a short final chunk, got {seen}"
    arr = _packed_array(dd, 10)
    assert arr[9].min() == arr[9].max() == 9, "last row of the partial chunk is wrong"


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


def _variant_of(tmp_path, owner_rows, name: str, keep: list[int]):
    """A dataset whose manifest re-SELECTS rows the owner already packed — no crops of its own."""
    dd = tmp_path / "datasets" / name
    dd.mkdir(parents=True)
    (dd / "manifest.jsonl").write_text(
        "\n".join(json.dumps(owner_rows[i]) for i in keep) + "\n", encoding="utf-8")
    return dd


def test_a_row_selection_reads_the_owners_pixels_instead_of_copying_them(tmp_path, paths):
    """13 xval variants each held 8.89 GB of ONE raster because their manifests differ."""
    _, rows = _make_dataset(tmp_path, 12)
    pack_mod.pack_dataset("ds", paths=paths, workers=2)
    vd = _variant_of(tmp_path, rows, "ds-sub", [9, 2, 5])

    res = pack_mod.link_pack("ds-sub", "ds", paths=paths)

    assert res["freed_bytes"] == 0 and res["rows"] == 3
    assert not (vd / "packed_images.u8").exists()
    got = pack_mod.load_packed("ds-sub", paths=paths)
    assert got is not None
    img_path, shape, path2idx = got
    assert shape == (12, CROP, CROP, 3)[:3]
    arr = np.memmap(img_path, dtype=np.uint8, mode="r", shape=(12, CROP, CROP, 3))
    for i in (9, 2, 5):                       # the owner's index still addresses the right pixels
        assert arr[path2idx[rows[i]["path"]]].min() == i


def test_an_already_loaded_manifest_uses_compact_direct_indices(tmp_path, paths):
    """Training must not parse the manifest again or retain a full path dictionary."""
    dd, _ = _make_dataset(tmp_path, 8)
    pack_mod.pack_dataset("ds", paths=paths, workers=1)
    rows = pack_mod._manifest_rows(dd)

    packed = pack_mod.load_packed("ds", paths=paths, manifest_rows=rows)

    assert packed is not None and packed[2] is None
    assert [row["_packed_idx"] for row in rows] == list(range(8))

    from chesslab.training.torch_data import PackedSquareDataset, build_transform

    ds = PackedSquareDataset(rows[2:6], ["empty"], build_transform((CROP, CROP), train=False),
                             packed)
    assert ds.idx.tolist() == [[0, 2], [0, 3], [0, 4], [0, 5]]   # (pack_no, row_no), legacy = pack 0


def test_manifest_digest_keeps_the_existing_byte_contract():
    rows = [{"path": "x/a.png", "label": "wP", "out_size": [80, 80]},
            {"path": "x/b.png", "label": "empty"}]
    import hashlib

    raw = b"x/a.png\0wP\0[80, 80]\nx/b.png\0empty\0\n"
    assert pack_mod._manifest_digest(rows) == hashlib.sha256(raw).hexdigest()[:32]


def test_linking_frees_a_duplicate_memmap_it_replaces(tmp_path, paths):
    _, rows = _make_dataset(tmp_path, 8)
    pack_mod.pack_dataset("ds", paths=paths, workers=2)
    vd = _variant_of(tmp_path, rows, "ds-sub", list(range(8)))
    pack_mod.pack_dataset("ds-sub", paths=paths, workers=2)          # the wasteful second copy
    assert (vd / "packed_images.u8").exists()

    res = pack_mod.link_pack("ds-sub", "ds", paths=paths)

    assert res["freed_bytes"] == 8 * CROP * CROP * 3
    assert not (vd / "packed_images.u8").exists()
    assert pack_mod.load_packed("ds-sub", paths=paths) is not None


def test_a_link_is_refused_when_the_owner_lacks_a_crop(tmp_path, paths):
    """The link may only replace a copy that was valid — never invent coverage."""
    _, rows = _make_dataset(tmp_path, 4)
    pack_mod.pack_dataset("ds", paths=paths, workers=2)
    stranger = dict(rows[0], path="somewhere/else.png")
    dd = tmp_path / "datasets" / "ds-sub"
    dd.mkdir(parents=True)
    (dd / "manifest.jsonl").write_text(json.dumps(stranger) + "\n", encoding="utf-8")

    with pytest.raises(ValueError, match="does not carry"):
        pack_mod.link_pack("ds-sub", "ds", paths=paths)


def test_a_link_to_a_link_is_refused(tmp_path, paths):
    _, rows = _make_dataset(tmp_path, 4)
    pack_mod.pack_dataset("ds", paths=paths, workers=2)
    _variant_of(tmp_path, rows, "ds-sub", [0, 1])
    pack_mod.link_pack("ds-sub", "ds", paths=paths)
    _variant_of(tmp_path, rows, "ds-sub2", [0])

    with pytest.raises(ValueError, match="is itself a link"):
        pack_mod.link_pack("ds-sub2", "ds-sub", paths=paths)


def test_a_link_inherits_the_owners_staleness_reference(tmp_path, paths):
    """The link has no memmap, so without the owner's fingerprint nothing could check it."""
    dd, rows = _make_dataset(tmp_path, 6)
    pack_mod.pack_dataset("ds", paths=paths, workers=1)
    _variant_of(tmp_path, rows, "ds-sub", [0, 1, 2, 3, 4, 5])
    pack_mod.link_pack("ds-sub", "ds", paths=paths)
    assert pack_mod.load_packed("ds-sub", paths=paths) is not None

    for i in range(6):
        p = dd / "squares" / f"{i:04d}.png"
        Image.fromarray(np.full((CROP, CROP, 3), 100 + i, dtype=np.uint8)).save(p)

    assert pack_mod.load_packed("ds-sub", paths=paths) is None


@pytest.mark.usefixtures("serial_pool")
def test_a_resume_across_a_re_slice_does_not_certify_the_old_pixels(tmp_path, paths, monkeypatch):
    """The case the docstring claimed and nothing tested: same paths, so the digest never moves.

    The chunks written before the re-slice hold the previous geometry. A resume that re-stamps the
    reference would publish exactly that with a clean bill of health.
    """
    dd, _ = _make_dataset(tmp_path, 8)
    crop_bytes = CROP * CROP * 3
    monkeypatch.setattr(pack_mod, "_PACK_CHUNK_BYTES", 4 * crop_bytes)
    real = pack_mod._pack_chunk

    def die_on_second(task):
        if task[2][0][0] != 0:
            raise RuntimeError("simulated interrupt")
        return real(task)

    monkeypatch.setattr(pack_mod, "_pack_chunk", die_on_second)
    with pytest.raises(RuntimeError, match="simulated interrupt"):
        pack_mod.pack_dataset("ds", paths=paths, workers=1)
    monkeypatch.setattr(pack_mod, "_pack_chunk", real)
    first = json.loads((dd / "packed_progress.json").read_text(encoding="utf-8"))

    for i in range(8):                                   # a re-slice: same paths, new pixels
        Image.fromarray(np.full((CROP, CROP, 3), 100 + i, dtype=np.uint8)).save(
            dd / "squares" / f"{i:04d}.png")
    pack_mod.pack_dataset("ds", paths=paths, workers=1)

    _img, meta_path = pack_mod._packed_paths(dd)
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    assert meta["crop_fingerprint"] == first["crop_fingerprint"], "resume re-stamped the reference"
    assert pack_mod.load_packed("ds", paths=paths) is None


@pytest.mark.usefixtures("serial_pool")
def test_a_resume_from_a_sidecar_without_a_fingerprint_falls_back(tmp_path, paths, monkeypatch):
    """Sidecars predating the fingerprint must resume, not re-stamp — the fallback is conservative."""
    dd, _ = _make_dataset(tmp_path, 8)
    crop_bytes = CROP * CROP * 3
    monkeypatch.setattr(pack_mod, "_PACK_CHUNK_BYTES", 4 * crop_bytes)
    pack_mod.pack_dataset("ds", paths=paths, workers=1)

    digest = pack_mod._manifest_digest(pack_mod._manifest_rows(dd))
    (dd / "packed_progress.json").write_text(json.dumps({
        "signature": {"n": 8, "h": CROP, "w": CROP, "csize": 4, "digest": digest},
        "done": [0],
    }), encoding="utf-8")
    pack_mod.pack_dataset("ds", paths=paths, workers=1)

    _img, meta_path = pack_mod._packed_paths(dd)
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    assert "crop_fingerprint" not in meta
    assert pack_mod.load_packed("ds", paths=paths) is not None


def test_pack_dataset_refuses_a_pack_built_dataset(tmp_path, paths):
    """A pack-built dataset also carries `mm://` rows, so the fused-synth message would mislead."""
    dd, _rows = _make_dataset(tmp_path, 4)
    (dd / "dataset.yaml").write_text(f"name: ds\n{packs.PACKS_KEY}: [s1-80]\n", encoding="utf-8")
    with pytest.raises(ValueError, match="data/packs"):
        pack_mod.pack_dataset("ds", paths=paths, workers=1)
