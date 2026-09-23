"""`run_train` auf der CPU, Ende zu Ende: config.json, metrics.jsonl und Gewichte bitgleich.

Haelt den Umbau von `training/` fest. Die Digests stammen vom Stand VOR der Zerlegung; aendert
ein Schritt Rezept, Zufallsreihenfolge, Metrik oder Checkpoint-Wahl, wird hier etwas rot.
"""

from __future__ import annotations

import atexit
import hashlib
import importlib
import inspect
import json
import sys

import numpy as np
import pytest
import torch
from PIL import Image

from chesslab import config, doctor, locks
from chesslab.ioutil import read_jsonl
from conftest import write_jsonl

CLASSES = ["empty", "wP", "bP", "wK"]
SIDE = 16
SQUARES = [f"{f}{r}" for r in range(1, 9) for f in "abcdefgh"]
SPLITS = {"train": ["rg-s1", "rg-s2"], "val": ["rg-s3"], "test": ["rg-s4"]}

GOLDEN = {
    "files": {"config": "87daa90d32281bec", "metrics": "101d49cd244a8400", "epochs": 3,
              "last.pt": "30fae007a6c9708a", "best.pt": "30fae007a6c9708a",
              "best_piece.pt": "30fae007a6c9708a"},
    "focal": {"config": "13519f870438b8d7", "metrics": "8cfdc5f20b87c85c", "epochs": 2,
              "last.pt": "600178bfb3c782df", "best.pt": "b941d563f2435202",
              "best_piece.pt": "b941d563f2435202"},
    "pack": {"config": "77a732094921fe41", "metrics": "e51a8474dc6af45d", "epochs": 3,
             "last.pt": "81777929af8315b5", "best.pt": "81777929af8315b5",
             "best_piece.pt": "81777929af8315b5", "swa.pt": "c2a2a014b63511b0"},
    "board": {"config": "c90dbee0b41a3de5", "metrics": "97b627247b1b09e2", "epochs": 2,
              "last.pt": "95d5cb65da4bddc5", "best.pt": "c46ec15045203330",
              "best_piece.pt": "c46ec15045203330"},
}


def _rows(root, *, pack_name=None):
    rng = np.random.default_rng(7)
    rows, pixels = [], []
    for sid in (s for part in SPLITS.values() for s in part):
        for frame in ("000010", "000020"):
            for i, sq in enumerate(SQUARES):
                label = CLASSES[int(rng.integers(len(CLASSES)))]
                img = rng.integers(0, 256, (SIDE, SIDE, 3), dtype=np.uint8)
                img[4:12, 4:12] = 40 * CLASSES.index(label)
                cov = (None, 0.0, 0.05, 0.4)[i % 4]
                bright = (None, 120.0, 10.0, 200.0)[(i // 4) % 4]
                row = {"label": label, "session_id": sid, "frame": frame, "square": sq,
                       "out_size": [SIDE, SIDE], "coverage": cov, "brightness": bright,
                       "pad_side": 0.05}
                if pack_name is None:
                    path = root / "crops" / sid / frame / f"{sq}.png"
                    path.parent.mkdir(parents=True, exist_ok=True)
                    Image.fromarray(img).save(path)
                    row["path"] = path.as_posix()
                else:
                    row["path"] = f"mm://{pack_name(sid)}/{frame}/{sq}"
                rows.append(row)
                pixels.append(img)
    return rows, pixels


def _dataset(paths, name, rows, subsample=None, yaml_text=None):
    dd = paths.datasets / name
    write_jsonl(dd / "manifest.jsonl", rows)
    split = {"classes": CLASSES, "splits": SPLITS}
    if subsample:
        split["train_subsample"] = subsample
    (dd / "split.json").write_text(json.dumps(split), encoding="utf-8")
    if yaml_text:
        (dd / "dataset.yaml").write_text(yaml_text, encoding="utf-8")
    return dd


def _monolith_pack(dd, rows, pixels):
    from chesslab.training.pack_dataset import write_packed_meta

    np.stack(pixels).tofile(dd / "packed_images.u8")
    write_packed_meta(dd / "packed_meta.json", rows, SIDE, SIDE, crop_fingerprint={})


def _session_packs(paths, rows, pixels):
    from chesslab.training.pack_dataset import write_packed_meta

    by_pack: dict[str, list] = {}
    for row, img in zip(rows, pixels, strict=True):
        by_pack.setdefault(row["path"].split("/")[2], []).append((row, img))
    for name, items in by_pack.items():
        d = paths.packs / name
        d.mkdir(parents=True)
        np.stack([img for _, img in items]).tofile(d / "packed_images.u8")
        write_packed_meta(d / "packed_meta.json", [r for r, _ in items], SIDE, SIDE)


def _build(paths, scenario):
    root = paths.root
    if scenario in ("files", "focal"):
        rows, _ = _rows(root)
        sub = {"max_empty_ratio": 1.0, "seed": 3} if scenario == "files" else None
        _dataset(paths, "mini", rows, subsample=sub)
    elif scenario == "pack":
        rows, pixels = _rows(root)
        _monolith_pack(_dataset(paths, "mini", rows), rows, pixels)
        empties = [r["path"] for r in rows if r["label"] == "empty"][::3]
        write_jsonl(paths.reports / "hard_empty.jsonl", [{"path": p} for p in empties])
    else:
        rows, pixels = _rows(root, pack_name=lambda sid: f"{sid}-{SIDE}")
        packs = sorted({r["path"].split("/")[2] for r in rows})
        _dataset(paths, "mini", rows, yaml_text="packs:\n" + "".join(f"- {p}\n" for p in packs))
        _session_packs(paths, rows, pixels)


KW = {
    "files": {"backbone": "smallcnn", "epochs": 3, "batch_size": 32, "patience": 5},
    "focal": {"backbone": "smallcnn", "epochs": 4, "batch_size": 32, "patience": 1,
              "head": "combined", "loss": "focal", "balance": "class", "sched": "none",
              "batch_aug": True, "scales": [16, 32]},
    "pack": {"backbone": "smallcnn", "epochs": 3, "batch_size": 32, "patience": 5,
             "balance": "piece", "hard_negative_multiplier": 2.0, "epoch_frac": 0.5,
             "swa": True, "swa_start": 0.5, "aug_scale": 0.5, "erase_p": 0.3,
             "class_weight": {"wP": 2.0}, "weight_cap": 4.0,
             "label_smoothing": 0.1, "weight_decay": 0.05, "coverage_weight": "soft"},
    "board": {"backbone": "board:smallcnn", "epochs": 2, "batch_size": 128, "patience": 5,
              "balance": "session", "board_width": 16, "board_layers": 1,
              "clahe_clip": 2.0, "input_size": "16x16", "hflip_p": 0.5},
}


def _tensor_digest(state: dict) -> str:
    h = hashlib.sha256()
    for key in sorted(state):
        h.update(key.encode())
        h.update(state[key].detach().cpu().contiguous().numpy().tobytes())
    return h.hexdigest()[:16]


def _digest(run_dir) -> dict:
    cfg = (run_dir / "config.json").read_text(encoding="utf-8")
    # Spalten in IHRER Reihenfolge; nur die Wanduhr (`t_*_s`) ist kein Teil des Rezepts.
    metrics = [{k: None if k.startswith("t_") else v for k, v in row.items()}
               for row in read_jsonl(run_dir / "metrics.jsonl")]
    out = {"config": hashlib.sha256(cfg.encode()).hexdigest()[:16],
           "metrics": hashlib.sha256(json.dumps(metrics).encode()).hexdigest()[:16],
           "epochs": len(metrics)}
    for name in ("last.pt", "best.pt", "best_piece.pt", "swa.pt"):
        if (run_dir / name).exists():
            out[name] = _tensor_digest(torch.load(run_dir / name, map_location="cpu"))
    return out


#: Wer `paths=config.DATA` als Vorgabe traegt, hat das ECHTE `data/` beim Import gebunden.
_BOUND = ("chesslab.dataset", "chesslab.dataset_build", "chesslab.training.pack_dataset",
          "chesslab.training.packs", "chesslab.training.pack_bake", "chesslab.training.train")


def _rebind_defaults(monkeypatch, old, new):
    for name in _BOUND:
        importlib.import_module(name)
    for name, mod in list(sys.modules.items()):
        if not name.startswith("chesslab"):
            continue
        for fn in list(vars(mod).values()):
            if not (inspect.isfunction(fn) and fn.__module__ == name):
                continue
            if fn.__defaults__ and any(d is old for d in fn.__defaults__):
                monkeypatch.setattr(fn, "__defaults__",
                                    tuple(new if d is old else d for d in fn.__defaults__))
            if fn.__kwdefaults__ and any(d is old for d in fn.__kwdefaults__.values()):
                monkeypatch.setattr(fn, "__kwdefaults__", {k: new if d is old else d
                                                           for k, d in fn.__kwdefaults__.items()})


@pytest.fixture
def cpu_run(tmp_path, monkeypatch):
    from chesslab.training import engine

    paths = config.Paths(root=tmp_path / "data")
    _rebind_defaults(monkeypatch, config.DATA, paths)
    monkeypatch.setattr(config, "DATA", paths)
    monkeypatch.delenv("CHESSLAB_TRAIN_SLOT", raising=False)
    monkeypatch.delenv("CHESSLAB_MAX_TRAININGS", raising=False)
    monkeypatch.setattr(doctor, "validate_gpu", lambda: (True, []))
    monkeypatch.setattr(atexit, "register", lambda *a, **k: None)
    monkeypatch.setattr(torch.cuda, "is_available", lambda: False)
    monkeypatch.setattr(engine, "get_device", lambda require_gpu: torch.device("cpu"))
    threads = torch.get_num_threads()
    torch.set_num_threads(1)

    def run(scenario, **over):
        from chesslab.training.train import run_train

        _build(paths, scenario)
        out = paths.root / f"run-{scenario}"
        kw = {"lr": 1e-2, "no_amp": True, "seed": 0, "out": str(out), "dataset": "mini",
              "split": "split.json", **KW[scenario], **over}
        try:
            assert run_train(**kw) == 0
        finally:
            locks.release(config.DATA.heavy_lock)
        return _digest(out)

    yield run
    torch.set_num_threads(threads)


@pytest.mark.parametrize("scenario", sorted(GOLDEN))
def test_a_cpu_run_is_bit_identical_to_the_pinned_one(cpu_run, scenario):
    got = cpu_run(scenario)
    assert got == GOLDEN[scenario], json.dumps(got, indent=1)


def test_another_seed_changes_the_run(cpu_run):
    """Gegenprobe: die Digests sehen die Zufallsreihenfolge, sonst waere oben nichts bewiesen."""
    got = cpu_run("files", seed=1)
    assert got["metrics"] != GOLDEN["files"]["metrics"]
    assert got["last.pt"] != GOLDEN["files"]["last.pt"]
