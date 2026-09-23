"""`chesslab dataset folds`: session-grouped out-of-fold splits over ONE packed corpus."""

from __future__ import annotations

import json

import pytest

from chesslab import config, dataset_build
from chesslab import dataset as dataset_mod

CLASSES = ["empty", "wP"]


def _built(tmp_path, sessions, *, cap=0, phash=False, force_train=(), groups=None):
    """A built dataset dir: manifest + dataset.yaml, enough for make_folds."""
    paths = config.Paths(root=tmp_path)
    dd = paths.datasets / "ds"
    dd.mkdir(parents=True)
    rows = []
    for sid, n in sessions.items():
        for i in range(n):
            row = {"path": f"c/{sid}_{i}.webp", "label": CLASSES[i % 2], "session_id": sid,
                   "frame": str(i // 2), "square": "a1", "out_size": [80, 80]}
            if groups and sid in groups:
                row["split_group"] = groups[sid]
            rows.append(row)
    (dd / "manifest.jsonl").write_text(
        "\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    (dd / "dataset.yaml").write_text(json.dumps({
        "name": "ds", "class_mode": "pieces13",
        "dedup": {"per_cell_cap": cap, "phash_enabled": phash},
        "force_train": list(force_train),
        "split": {"val_frac": 0.15, "test_frac": 0.15, "seed": 42},
    }), encoding="utf-8")
    return paths, dd


@pytest.fixture(autouse=True)
def _classes(monkeypatch):
    monkeypatch.setattr(dataset_build, "class_list_for", lambda mode: CLASSES)


def _splits(dd, k, prefix="split-f"):
    return [json.loads((dd / f"{prefix}{i}.json").read_text(encoding="utf-8"))["splits"]
            for i in range(k)]


def test_every_session_is_in_exactly_one_test_fold(tmp_path):
    paths, dd = _built(tmp_path, {f"s{i}": 40 for i in range(8)})

    dataset_build.make_folds("ds", 4, paths=paths)

    tests = [set(s["test"]) for s in _splits(dd, 4)]
    assert set.union(*tests) == {f"s{i}" for i in range(8)}
    for i, a in enumerate(tests):
        for b in tests[i + 1:]:
            assert not a & b, "folds overlap — out-of-fold would be a lie"


def test_a_folds_val_never_touches_its_own_test(tmp_path):
    paths, dd = _built(tmp_path, {f"s{i}": 40 for i in range(8)})

    dataset_build.make_folds("ds", 4, paths=paths)

    for s in _splits(dd, 4):
        assert not set(s["val"]) & set(s["test"])
        assert not set(s["train"]) & (set(s["test"]) | set(s["val"]))
        assert s["val"], "a fold without val cannot early-stop"


def test_a_split_group_never_straddles_two_folds(tmp_path):
    """A clip cut into pseudo-sessions must move as one — neighbouring frames are near-identical."""
    paths, dd = _built(tmp_path, {f"s{i}": 40 for i in range(8)},
                       groups={"s0": "clip", "s1": "clip"})

    dataset_build.make_folds("ds", 4, paths=paths)

    for s in _splits(dd, 4):
        assert ("s0" in s["test"]) == ("s1" in s["test"])


def test_a_pinned_session_gets_no_fold_and_is_said_out_loud(tmp_path, capsys):
    paths, dd = _built(tmp_path, {f"s{i}": 40 for i in range(8)}, force_train=["s0"])

    dataset_build.make_folds("ds", 4, paths=paths)

    out = capsys.readouterr().out
    assert "pinned to train" in out
    for s in _splits(dd, 4):
        assert "s0" not in s["test"] and "s0" not in s["val"]
        assert "s0" in s["train"]


def test_a_train_only_deduped_dataset_is_refused(tmp_path):
    """`build_dataset` thins TRAIN rows only, so a fold test set would be missing squares."""
    paths, _dd = _built(tmp_path, {f"s{i}": 40 for i in range(8)}, cap=256)

    with pytest.raises(ValueError, match="deduped train-only"):
        dataset_build.make_folds("ds", 4, paths=paths)


def test_allow_asymmetric_is_the_deliberate_way_through(tmp_path):
    paths, dd = _built(tmp_path, {f"s{i}": 40 for i in range(8)}, cap=256)

    dataset_build.make_folds("ds", 4, paths=paths, allow_asymmetric=True)

    assert (dd / "split-f0.json").exists()


def test_dry_run_writes_nothing(tmp_path):
    paths, dd = _built(tmp_path, {f"s{i}": 40 for i in range(8)})

    dataset_build.make_folds("ds", 4, paths=paths, dry_run=True)

    assert not list(dd.glob("split-f*.json"))


def test_existing_fold_files_are_not_overwritten_without_force(tmp_path):
    paths, dd = _built(tmp_path, {f"s{i}": 40 for i in range(8)})
    dataset_build.make_folds("ds", 4, paths=paths)

    with pytest.raises(ValueError, match="--force"):
        dataset_build.make_folds("ds", 4, paths=paths)
    dataset_build.make_folds("ds", 4, paths=paths, force=True)


def test_k_larger_than_the_corpus_is_refused(tmp_path):
    paths, _dd = _built(tmp_path, {"s0": 40, "s1": 40})

    with pytest.raises(ValueError, match="larger than this corpus"):
        dataset_build.make_folds("ds", 4, paths=paths)


def test_folds_carry_the_datasets_class_list(tmp_path):
    """`train.py` reads `split["classes"]`; a wrong list gives a fold model the wrong head size."""
    paths, dd = _built(tmp_path, {f"s{i}": 40 for i in range(8)})

    dataset_build.make_folds("ds", 4, paths=paths)

    for i in range(4):
        s = json.loads((dd / f"split-f{i}.json").read_text(encoding="utf-8"))
        assert s["classes"] == CLASSES and s["fold"] == i and s["k"] == 4


def test_fold_groups_partitions_completely_and_stays_within_one_group_of_balance():
    sizes = {"a": 100, "b": 90, "c": 80, "d": 70, "e": 60}

    folds = dataset_mod.fold_groups(sizes, 2, seed=1)

    loads = [sum(sizes[g] for g in f) for f in folds]
    assert sorted(g for f in folds for g in f) == sorted(sizes)
    assert max(loads) - min(loads) <= max(sizes.values()), "greedy went off the rails"


def test_fold_groups_is_deterministic_for_one_seed():
    sizes = {f"g{i}": 100 for i in range(8)}

    assert dataset_mod.fold_groups(sizes, 4, seed=7) == dataset_mod.fold_groups(sizes, 4, seed=7)
    assert [sum(100 for _ in f) for f in dataset_mod.fold_groups(sizes, 4, seed=7)] == [200] * 4
