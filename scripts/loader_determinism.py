"""Ist der Trainings-Loader reproduzierbar? Zwei Prozesse, gleicher Seed, gehashte Batches.

    uv run python scripts/loader_determinism.py <dataset> <seed> <num-workers> <batches>

Isoliert den LOADER vom Modell: wenn schon die Pixel je Lauf andere sind, ist jeder Vergleich
weiter oben sinnlos. Nacheinander in zwei Prozessen laufen lassen und die Hashes vergleichen —
in EINEM Prozess wuerde die geerbte Entropie den Unterschied verstecken.
"""
import hashlib
import json
import random
import sys

import numpy as np
import torch
from torch.utils.data import DataLoader

from chesslab import config  # noqa: E402
from chesslab.dataset_build import dataset_dir  # noqa: E402
from chesslab.training.torch_data import SquareDataset, build_transform  # noqa: E402


def main():
    name, seed, workers, batches = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
    torch.manual_seed(seed)
    np.random.seed(seed)
    random.seed(seed)

    dd = dataset_dir(name)
    rows = [json.loads(x) for x in (dd / "manifest.jsonl").read_text(encoding="utf-8").splitlines()]
    split = json.loads((dd / "split.json").read_text(encoding="utf-8"))
    train_sessions = set(split["splits"]["train"])
    rows = [r for r in rows if r.get("session_id") in train_sessions][:20000]

    tf = build_transform((80, 80), train=True)
    ds = SquareDataset(rows, config.IDENTITY_CLASSES, tf, augment=True)
    kw = {"batch_size": 64, **config.loader_kwargs(workers, pin_memory=False)}
    loader = DataLoader(ds, shuffle=True, drop_last=True, **kw)

    h = hashlib.sha256()
    labels = []
    for i, batch in enumerate(loader):
        if i >= batches:
            break
        x = batch[0] if isinstance(batch, (list, tuple)) else batch["image"]
        y = batch[1] if isinstance(batch, (list, tuple)) else batch["label"]
        h.update(np.ascontiguousarray(x.numpy()).tobytes())
        labels.extend(y.tolist()[:8])
    print(json.dumps({"pixels": h.hexdigest()[:16], "first_labels": labels[:16]}))


if __name__ == "__main__":
    main()
