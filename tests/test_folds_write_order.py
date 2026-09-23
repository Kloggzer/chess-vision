"""`make_folds` prueft alle Folds, bevor es eine Fold-Datei schreibt."""
from __future__ import annotations

import json

import pytest

from chesslab import config, dataset_build

CLASSES = ["empty", "wP", "wN"]


@pytest.fixture(autouse=True)
def _classes(monkeypatch):
    monkeypatch.setattr(dataset_build, "class_list_for", lambda mode: CLASSES)


def _built(tmp_path):
    """Acht Aufnahmen; `wN` steht in genau EINER — das ist der Fehler, den `validate_split` meldet."""
    paths = config.Paths(root=tmp_path)
    dd = paths.datasets / "ds"
    dd.mkdir(parents=True)
    rows = []
    for s in range(8):
        for i in range(40):
            label = "wN" if (s == 0 and i % 2) else CLASSES[i % 2]
            rows.append({"path": f"c/s{s}_{i}.webp", "label": label, "session_id": f"s{s}",
                         "frame": str(i // 2), "square": "a1", "out_size": [80, 80]})
    (dd / "manifest.jsonl").write_text(
        "\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    (dd / "dataset.yaml").write_text(json.dumps({
        "name": "ds", "class_mode": "pieces13",
        "dedup": {"per_cell_cap": 0, "phash_enabled": False},
        "force_train": [],
        "split": {"val_frac": 0.15, "test_frac": 0.15, "seed": 42},
    }), encoding="utf-8")
    return paths, dd


def test_a_refused_fold_set_leaves_nothing_behind(tmp_path):
    paths, dd = _built(tmp_path)

    with pytest.raises(ValueError):
        dataset_build.make_folds("ds", 4, paths=paths)

    left = sorted(p.name for p in dd.glob("split-f*.json"))
    assert not left, (
        f"make_folds refused the fold set and still left {left} on disk — the retry now fails "
        "with 'exists — pass --force', and train --split reads a split the check rejected")
