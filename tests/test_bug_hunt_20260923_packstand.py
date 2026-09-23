"""Der Bau ueberliest kein spaeteres Menschenurteil ueber Zellen in einem Pack."""

import json

import pytest
import yaml

from chesslab import dataset_build
from chesslab.training import pack_session, packs
from test_session_pack import _make_session, _pack_paths


def _append(sdir, name: str, row: dict) -> None:
    with (sdir / name).open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(row) + "\n")


def _build(paths, **kw):
    return dataset_build.build_dataset("ds", ["sess1"], rotations=(0,), phash_enabled=False,
                                       val_frac=0.0, test_frac=0.0, paths=paths,
                                       allow_degenerate=True, from_packs=True, **kw)


@pytest.fixture
def packed(tmp_path, monkeypatch):
    sdir = _make_session(tmp_path)
    paths = _pack_paths(tmp_path, monkeypatch)
    pack_session.write_session_pack("sess1", paths=paths)
    return sdir, paths


def _unusable(sdir, square="e1", unusable=True, frame="0000"):
    _append(sdir, "unusable-cells.jsonl", {"session_id": "sess1", "frame": frame,
                                           "square": square, "unusable": unusable})


def test_a_cell_locked_after_the_pack_refuses_the_build(packed):
    sdir, paths = packed
    _unusable(sdir)
    with pytest.raises(ValueError, match=r"sess1-80.*1 cell\(s\) marked unusable.*0000/e1") as e:
        _build(paths)
    assert "chesslab session pack --session sess1 --size 80 --replace" in str(e.value)
    assert not (paths.datasets / "ds").exists()


def test_a_relabel_after_the_pack_refuses_the_build(packed):
    sdir, paths = packed
    _append(sdir, "corrections.jsonl", {"session_id": "sess1", "frame": "0000", "square": "e1",
                                        "label": "empty"})
    with pytest.raises(ValueError, match=r"1 cell\(s\) relabelled"):
        _build(paths)


def test_a_relabel_the_pack_already_carries_is_no_refusal(packed):
    sdir, paths = packed
    _append(sdir, "corrections.jsonl", {"session_id": "sess1", "frame": "0000", "square": "e1",
                                        "label": "wK"})
    _build(paths)


def test_allow_stale_packs_builds_and_says_so(packed):
    sdir, paths = packed
    _unusable(sdir)
    _build(paths, allow_stale_packs=True)
    cfg = yaml.safe_load((paths.datasets / "ds" / "dataset.yaml").read_text(encoding="utf-8"))
    assert cfg["stale_packs"] == ["sess1-80"]


def test_a_withdrawn_lock_and_a_cell_outside_the_pack_are_no_refusal(packed):
    sdir, paths = packed
    _unusable(sdir, "d1")
    _unusable(sdir, "d1", unusable=False)
    _unusable(sdir, "a1", frame="9999")
    _build(paths)


def test_the_pack_stamps_its_ledgers_and_an_unchanged_one_is_not_reread(packed, monkeypatch):
    _sdir, paths = packed
    stamp = json.loads((packs.pack_dir("sess1-80", paths) / pack_session.LEDGER_STAMP)
                       .read_text(encoding="utf-8"))
    assert set(stamp["ledgers"]) == {"unusable-cells.jsonl", "corrections.jsonl"}

    def boom(*_a, **_k):
        raise AssertionError("a matching stamp must spare the content check")

    monkeypatch.setattr(dataset_build, "_ledger_hits", boom)
    _build(paths)


def test_an_unstamped_pack_is_checked_by_content_not_waved_through(packed):
    sdir, paths = packed
    (packs.pack_dir("sess1-80", paths) / pack_session.LEDGER_STAMP).unlink()
    _build(paths)                                   # clean old pack: accepted
    _unusable(sdir)
    with pytest.raises(ValueError, match="marked unusable"):
        _build(paths)
