"""Conservative I/O preserves pixels and stops before exhausting host memory."""

from types import SimpleNamespace

import numpy as np
import pytest
import torch
from torch.utils.data import DataLoader, TensorDataset

from chesslab.training import memory
from chesslab.training.packs import open_packed_memmap
from chesslab.training.train_feed import _device_batches


def test_low_memory_reader_preserves_random_rows_and_boards(tmp_path, monkeypatch):
    pixels = np.random.default_rng(42).integers(0, 256, (130, 8, 8, 3), dtype=np.uint8)
    path = tmp_path / "pack.u8"
    pixels.tofile(path)
    monkeypatch.setenv("CHESSLAB_PACK_READER", "mmap")
    reader = open_packed_memmap(str(path), pixels.shape[:3], low_memory=True)
    assert not isinstance(reader, np.memmap)
    try:
        for index in (129, 0, 75, slice(0, 64), slice(64, 128)):
            np.testing.assert_array_equal(reader[index], pixels[index])
    finally:
        reader._f.close()


def test_guard_stops_before_fetching_another_batch(monkeypatch):
    fetched = []

    class Loader:
        dataset = SimpleNamespace(ram_reserve_gb=4)

        def __iter__(self):
            for i in range(3):
                fetched.append(i)
                yield i

    readings = iter([8, 8, 8, 3])
    monkeypatch.setattr(memory, "available_ram", lambda: next(readings) * 2**30)
    batches = memory.guarded_batches(Loader())
    assert next(batches) == 0
    with pytest.raises(MemoryError, match="reserve"):
        next(batches)
    assert fetched == [0]


def test_disabled_guard_does_not_query_memory(monkeypatch):
    monkeypatch.setattr(memory, "available_ram", lambda: pytest.fail("queried RAM"))
    memory.check_ram(0)


def test_low_memory_transfer_keeps_partial_batch_and_labels():
    x = torch.arange(5 * 3 * 8 * 8).reshape(5, 3, 8, 8).float()
    y = torch.arange(5)
    ds = TensorDataset(x, y)
    ds.low_memory = True
    loader = DataLoader(ds, batch_size=2, num_workers=0, pin_memory=False)
    batches = list(_device_batches(loader, torch.device("cpu")))
    assert [len(a) for a, _ in batches] == [2, 2, 1]
    assert torch.equal(torch.cat([a for a, _ in batches]), x)
    assert torch.equal(torch.cat([b for _, b in batches]), y)


def test_validation_uses_no_workers_or_pinning(monkeypatch):
    from chesslab.training.engine import _LOADERS, evaluate_dataset

    ds = TensorDataset(torch.eye(3), torch.arange(3))
    ds.rows = [{"session_id": "s", "frame": str(i), "coverage": 0} for i in range(3)]
    ds.low_memory = True
    calls = []

    def capture(*args, **kwargs):
        calls.append(kwargs)
        return DataLoader(*args, **kwargs)

    monkeypatch.setattr(torch.utils.data, "DataLoader", capture)
    result = evaluate_dataset(torch.nn.Identity(), ds, torch.device("cpu"), num_workers=2)
    assert result["square_acc"] == 1
    assert calls[0]["num_workers"] == 0
    assert calls[0]["pin_memory"] is False
    assert "persistent_workers" not in calls[0]
    assert ds not in _LOADERS


def test_cli_memory_stop_releases_lock_and_exits_with_failure(monkeypatch):
    import os

    from typer.testing import CliRunner

    from chesslab.cli import app
    from chesslab.training import train, train_lock

    released = []

    def stop(**kwargs):
        assert kwargs["low_memory"] is True
        # Vorgabe ist AUS: die Wache riss Laeufe an einem momentanen Einbruch ab.
        assert kwargs["ram_reserve_gb"] == 0
        raise MemoryError("RAM reserve reached")

    def exit_process(code):
        raise SystemExit(code)

    monkeypatch.setattr(train, "run_train", stop)
    monkeypatch.setattr(train_lock, "_release_train_lock", lambda: released.append(True))
    monkeypatch.setattr(os, "_exit", exit_process)
    result = CliRunner().invoke(app, ["train"])
    assert result.exit_code == 1
    assert "RAM reserve reached" in result.output
    assert released == [True]


def test_the_run_records_its_patience(tmp_path, monkeypatch):
    """`patience` bestimmt, WANN ein Lauf endet — und stand in keiner config.json.

    Gemessen 2026-09-17: alle Basislaeufe zeigen `patience: None`, und ob einer frueh ausstieg
    liess sich nur daran ablesen, dass er 60 von 60 Epochen hatte. Bei einem Vergleich haengt der
    Unterschied sonst am Ausstiegszeitpunkt statt am Verfahren (Nutzer: "bei solchen vergleichen
    machen wir eigentlich immer patience 60").
    """
    import inspect

    from chesslab.training import train_recipe

    src = inspect.getsource(train_recipe.run_config)
    start = src.index("cfg_written = {")
    block = src[start:src.index("\n    }", start)]
    assert '"patience"' in block, "die Rezeptur eines Laufs muss vollstaendig in der config.json stehen"
