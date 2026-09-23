from pathlib import Path

import pytest

from chesslab import labeling
from chesslab.ioutil import stamp_of
from chesslab.session_store import log as store_log
from chesslab.session_store import paths as store_paths


def test_log_readers_keep_their_existing_empty_and_stamp_contracts(tmp_path):
    log = tmp_path / "log.jsonl"
    log.write_text("", encoding="utf-8")

    assert type(labeling.read_log(tmp_path)) is list
    with pytest.raises(FileNotFoundError, match="no captured frames"):
        store_log.read_log(tmp_path)

    log.write_text('{"frame":"frames/000001.png"}\n', encoding="utf-8")
    rows = store_log.read_log(tmp_path)
    assert rows == [{"frame": "frames/000001.png"}]
    assert rows.stamp == stamp_of(log)


def test_session_meta_readers_keep_their_existing_missing_and_empty_contracts(tmp_path):
    with pytest.raises(FileNotFoundError, match="session.yaml missing"):
        labeling.read_session_meta(tmp_path)
    assert store_paths._read_meta(tmp_path) == {}

    meta = tmp_path / "session.yaml"
    meta.write_text("", encoding="utf-8")
    assert labeling.read_session_meta(tmp_path) is None
    assert store_paths._read_meta(tmp_path) == {}


@pytest.mark.parametrize("dataset_name", ["PackedSquareDataset", "PackedBoardDataset"])
def test_packed_datasets_open_each_memmap_lazily_once(monkeypatch, dataset_name):
    from chesslab.training import pack, torch_data

    opened = []
    monkeypatch.setattr(pack, "open_packed_memmap", lambda *args, **kwargs: opened.append(
        (args, kwargs)) or object())
    dataset = getattr(torch_data, dataset_name).__new__(getattr(torch_data, dataset_name))
    dataset._files = [(Path("pixels.u8"), (2, 8, 8))]
    dataset._mm = None
    dataset.low_memory = True

    first = dataset._memmap(0)
    assert dataset._memmap(0) is first
    assert opened == [((Path("pixels.u8"), (2, 8, 8)), {"low_memory": True})]
