"""Stage 4 — dataset stats / split / verify (headless)."""


from collections import Counter

import cv2
import numpy as np
import pytest

from chesslab import config, dataset
from chesslab.dataset import (
    assign_sessions_to_splits,
    compute_class_weights,
    compute_stats,
    load_priority_paths,
    make_split,
    subsample_classes,
    subsample_empty,
    verify,
)


def _row(label, session, square, color, out_size=(96, 128), path="x.png"):
    return {"label": label, "session_id": session, "square": square,
            "square_color": color, "out_size": list(out_size), "path": path}


def _dataset():
    rows = []
    # 4 sessions, pieces on both colors, lots of empty
    for si in range(4):
        sid = f"s{si}"
        rows.extend(_row("wP", sid, "a2", "light" if k % 2 else "dark") for k in range(10))
        rows.append(_row("wK", sid, "e1", "dark"))
        rows.extend(_row("empty", sid, "c4", "light" if k % 2 else "dark") for k in range(60))
    return rows


def test_compute_stats_counts_and_warnings():
    rows = _dataset()
    stats = compute_stats(rows, min_samples=200)
    assert stats["num_sessions"] == 4
    assert stats["counts"]["wP"] == 40
    assert stats["counts"]["empty"] == 240
    assert stats["light"]["wP"] == 20 and stats["dark"]["wP"] == 20
    # wK only on dark squares -> warning; wP under 200 -> warning
    assert any("wK" in w and "only on dark" in w for w in stats["warnings"])
    assert any("wP" in w and "200" in w for w in stats["warnings"])
    # bN absent entirely
    assert any(w.startswith("Class bN") for w in stats["warnings"])


def test_subsample_empty_caps_and_is_seed_stable():
    rows = _dataset()  # empty=240, largest piece (wP)=40 -> cap at 1.5*40=60
    sub = subsample_empty(rows, 1.5, seed=42)
    n_empty = sum(r["label"] == "empty" for r in sub)
    assert n_empty == 60
    # non-empty untouched
    assert sum(r["label"] != "empty" for r in sub) == sum(r["label"] != "empty" for r in rows)
    # deterministic
    again = subsample_empty(rows, 1.5, seed=42)
    assert [r["square_color"] for r in sub] == [r["square_color"] for r in again]


def test_subsample_priority_paths_survive_empty_cap():
    """Mined hard-negative empties must never be dropped by the random empty cap."""
    rows = _dataset()
    hard = {f"hard_{i}.png" for i in range(5)}
    n_empty_seen = 0
    for r in rows:
        if r["label"] == "empty" and n_empty_seen < 5:
            r["path"] = f"hard_{n_empty_seen}.png"
            n_empty_seen += 1
    sub = subsample_classes(rows, max_empty_ratio=1.5, seed=42, priority_paths=hard)
    kept_paths = {r["path"] for r in sub if r["label"] == "empty"}
    assert hard <= kept_paths, "hard empties were dropped by the cap"
    assert sum(r["label"] == "empty" for r in sub) == 60      # cap still respected
    # more hard than cap -> deliberate overshoot, all hard kept
    many = {f"h{i}.png" for i in range(70)}
    i = 0
    for r in rows:
        if r["label"] == "empty" and i < 70:
            r["path"] = f"h{i}.png"
            i += 1
    sub2 = subsample_classes(rows, max_empty_ratio=1.5, seed=42, priority_paths=many)
    kept2 = {r["path"] for r in sub2 if r["label"] == "empty"}
    assert many <= kept2
    assert sum(r["label"] == "empty" for r in sub2) == 70


def test_load_priority_paths_reads_the_mined_keep_list(tmp_path):
    """The keep list is read from `<reports>/hard_empty.jsonl`, or None when nothing is mined.

    Both `dataset_build.build_dataset` and `training.train.run_train` go through this one loader.
    They have to: the built dataset's manifest holds the UNCAPPED rows, so `run_train` re-runs
    `subsample_classes` and a keep list honoured only at build time would be re-drawn away before
    a single batch ever saw a hard negative.
    """
    from dataclasses import replace

    paths = replace(config.DATA, root=tmp_path)
    paths.reports.mkdir(parents=True, exist_ok=True)
    assert load_priority_paths(paths) is None      # nothing mined -> no protection, no crash

    (paths.reports / "hard_empty.jsonl").write_text(
        '{"path": "a.png", "pred": "wN"}\n\n{"path": "b.png", "pred": "empty"}\n', encoding="utf-8")
    assert load_priority_paths(paths) == {"a.png", "b.png"}   # blank lines ignored


def test_class_weights_largest_class_has_smallest_weight():
    counts = dict.fromkeys(config.CLASSES, 0)
    counts["empty"] = 1000
    counts["wP"] = 100
    counts["wK"] = 10
    w = compute_class_weights(counts)
    present = {c: w[c] for c in ("empty", "wP", "wK")}
    assert present["empty"] == min(present.values())   # largest class -> smallest weight
    assert present["wK"] == max(present.values())       # rarest -> largest
    assert w["bN"] == 0.0                                # absent -> 0


def test_weight_cap_flattens_the_spread_without_moving_the_loss_scale():
    """Kappen darf nur die Spanne aendern. Verschoebe es auch den Massstab, waere die
    effektive Lernrate mitgewandert und der Vergleich gekappt/ungekappt waere zwei Aenderungen."""
    counts = {"empty": 198309, "wP": 40782, "wN": 10215, "wQ": 4998}
    plain = compute_class_weights(counts, list(counts))
    capped = compute_class_weights(counts, list(counts), cap=3.0)

    total = sum(counts.values())
    assert max(plain.values()) / min(plain.values()) > 3.0
    assert max(capped.values()) / min(capped.values()) == pytest.approx(3.0, abs=0.01)
    assert sum(capped[c] * n for c, n in counts.items()) / total == pytest.approx(1.0, abs=0.01)
    # Die Reihenfolge bleibt: geglaettet, nicht beschnitten.
    assert sorted(capped, key=capped.get) == sorted(plain, key=plain.get)


def test_a_cap_above_the_actual_spread_changes_nothing():
    counts = {"empty": 100, "wP": 80}
    assert compute_class_weights(counts, list(counts), cap=10.0) ==            compute_class_weights(counts, list(counts))


def test_split_is_session_disjoint_and_respects_empty_ratio():
    rows = _dataset()
    split = make_split(rows, val_frac=0.25, test_frac=0.25, max_empty_ratio=1.5, seed=42)
    s = split["splits"]
    all_sids = s["train"] + s["val"] + s["test"]
    assert len(all_sids) == len(set(all_sids)) == 4      # every session once, no overlap
    # empty capped in TRAIN at 1.5 x largest train piece class
    tcc = split["train_class_counts"]
    pieces = {k: v for k, v in tcc.items() if k != "empty" and v > 0}
    assert tcc["empty"] <= round(1.5 * max(pieces.values()))
    # class_weights (from balanced train): empty smallest among present
    cw = split["class_weights"]
    assert cw["empty"] == min(v for v in cw.values() if v > 0)


# --- unequal-session splits (regression, 2026-07-27) ---------------------------------
#
# The real corpus is wildly unequal: 4992, 3520, 1600, 1024, 1024, 832, 384 crops per
# session, where the top two are 64 % of the rows. Greedy largest-first with no overshoot
# guard put both of them into val/test and left train with the crumbs (train 1611 while
# 8512 sat in holdout). These pin the three properties that prevent it.

_UNEQUAL = {"big1": 4992, "big2": 3520, "mid": 1600,
            "old1": 1024, "old2": 1024, "small1": 832, "small2": 384}


def test_unequal_sessions_do_not_strand_the_corpus_in_holdout():
    """A session far larger than the whole val/test target must not be dropped into it."""
    sp = assign_sessions_to_splits(_UNEQUAL, val_frac=0.15, test_frac=0.15, seed=42)
    total = sum(_UNEQUAL.values())
    n = {k: sum(_UNEQUAL[s] for s in v) for k, v in sp.items()}
    assert n["train"] + n["val"] + n["test"] == total
    # train must hold the clear majority — the whole point of a 15/15 split
    assert n["train"] >= 0.5 * total, f"train stranded: {n}"
    # and neither holdout may run away past its target by more than 2x
    assert n["val"] <= 2 * 0.15 * total, f"val overshoot: {n}"
    assert n["test"] <= 2 * 0.15 * total, f"test overshoot: {n}"


def test_force_train_targets_use_only_the_available_sessions():
    """Targets must be computed over what can actually fill val/test.

    Sizing them off the FULL total (force_train included) inflates both targets while only
    the remainder may fill them, so more of that remainder is pulled into holdout than the
    caller asked for — forcing the two big sessions into train made train *smaller*.
    """
    forced = ["big1", "big2"]
    sp = assign_sessions_to_splits(_UNEQUAL, val_frac=0.15, test_frac=0.15, seed=42,
                                   force_train=forced)
    n = {k: sum(_UNEQUAL[s] for s in v) for k, v in sp.items()}
    for f in forced:
        assert f in sp["train"]
    available = sum(v for k, v in _UNEQUAL.items() if k not in forced)
    # holdout is sized against the AVAILABLE pool, not the full corpus
    assert n["val"] <= 2 * 0.15 * available, f"val sized off the wrong total: {n}"
    assert n["test"] <= 2 * 0.15 * available, f"test sized off the wrong total: {n}"
    # forcing the big sessions into train must not shrink train
    unforced = assign_sessions_to_splits(_UNEQUAL, val_frac=0.15, test_frac=0.15, seed=42)
    n_unforced = sum(_UNEQUAL[s] for s in unforced["train"])
    assert n["train"] >= n_unforced, f"force_train shrank train: {n['train']} < {n_unforced}"


def test_session_larger_than_the_target_goes_to_train():
    """The mechanism behind the fix: a session that cannot fit a holdout belongs in train.

    This is also why targeting stays on RAW counts — `dataset_build` dedups train only, so an
    oversized (and in practice redundancy-heavy) session is cheap in train and full price in
    holdout.
    """
    sp = assign_sessions_to_splits(_UNEQUAL, val_frac=0.15, test_frac=0.15, seed=42)
    target = 0.15 * sum(_UNEQUAL.values())
    for sid, sz in _UNEQUAL.items():
        if sz >= 2 * target:                    # cannot reduce any holdout's deviation
            assert sid in sp["train"], f"{sid} ({sz}) belongs in train, target {target:.0f}"


def test_val_and_test_never_end_up_empty():
    """Equal-sized sessions: the overshoot guard must not starve val/test entirely."""
    sizes = {"a": 100, "b": 100, "c": 100}
    sp = assign_sessions_to_splits(sizes, val_frac=0.15, test_frac=0.15, seed=42)
    assert sp["val"] and sp["test"] and sp["train"], sp
    assert sorted(sp["train"] + sp["val"] + sp["test"]) == ["a", "b", "c"]


def test_shipped_occ_synth_split_is_reproduced_exactly():
    """Backward compatibility on a BALANCED corpus: the real occ-synth sizes must still
    produce the split that is on disk (37/2/2, same session ids). The fix may only change
    what the unequal case does."""
    sizes = {f"occ-synth__synth-shard-{s}-{i:03d}": 6400
             for s, n in ((0, 5), (1, 10), (2, 10), (3, 10)) for i in range(n)}
    sizes.update({f"occ-synth__synth-topup-{i:03d}": 6400 for i in range(6)})
    sizes["occ-synth__synth-shard-0-004"] = 2944
    sizes["occ-synth__synth-topup-005"] = 3456
    assert len(sizes) == 41 and sum(sizes.values()) == 256000
    sp = assign_sessions_to_splits(sizes, val_frac=0.05, test_frac=0.05, seed=config.SEED)
    assert sorted(sp["val"]) == ["occ-synth__synth-shard-1-004",
                                 "occ-synth__synth-shard-1-005"], sp
    assert sorted(sp["test"]) == ["occ-synth__synth-shard-0-003",
                                  "occ-synth__synth-topup-001"], sp
    assert len(sp["train"]) == 37, sp


def test_subsample_classes_caps_pieces_and_empty():
    rows = _dataset()  # wP=40, wK=4, empty=240
    kept = subsample_classes(rows, max_empty_ratio=1.5, max_class_ratio=2.0, seed=42)
    c = Counter(r["label"] for r in kept)
    # smallest piece wK=4 -> piece cap = 8; wP 40 -> 8, wK unchanged
    assert c["wP"] == 8
    assert c["wK"] == 4
    # empty cap = 1.5 * max effective piece (8) = 12
    assert c["empty"] == 12
    # deterministic for same seed
    again = Counter(r["label"] for r in subsample_classes(rows, 1.5, 2.0, seed=42))
    assert c == again


def test_make_split_max_class_ratio_balances_train_pieces():
    rows = _dataset()
    split = make_split(rows, val_frac=0.25, test_frac=0.25, max_empty_ratio=2.0,
                       max_class_ratio=2.0, seed=42)
    tcc = split["train_class_counts"]
    pieces = {k: v for k, v in tcc.items() if k != "empty" and v > 0}
    if pieces:
        assert max(pieces.values()) <= round(2.0 * min(pieces.values()))  # pieces balanced
    # policy recorded for the trainer to reproduce
    assert split["train_subsample"]["max_class_ratio"] == 2.0


def test_verify_flags_missing_file_size_and_split_overlap(tmp_path):
    good = tmp_path / "good.png"
    cv2.imwrite(str(good), np.zeros((128, 96, 3), dtype=np.uint8))
    wrongsize = tmp_path / "wrong.png"
    cv2.imwrite(str(wrongsize), np.zeros((64, 64, 3), dtype=np.uint8))

    rows = [
        _row("wK", "s0", "e1", "dark", path=str(good)),                 # ok
        _row("wP", "s0", "a2", "dark", path=str(tmp_path / "missing.png")),  # missing
        _row("wP", "s0", "a3", "dark", path=str(wrongsize)),            # wrong size
        _row("zz", "s0", "a4", "dark", path=str(good)),                 # bad label
    ]
    split = {"splits": {"train": ["s0"], "val": ["s0"], "test": []}}    # s0 in two splits
    problems = verify(rows, split=split)
    assert any("file missing" in p for p in problems)
    assert any("out_size" in p for p in problems)
    assert any("unknown label" in p for p in problems)
    assert any("AND" in p for p in problems)


# --- validate_split -------------------------------------------------------------------

def test_validate_split_class_only_in_one_session():
    """Class only in one session -> Error."""
    from chesslab.dataset import validate_split

    rows = []
    # s0: 2 sessions, wQ only in s0
    rows.extend(_row("wQ", "s0", "d1", "dark") for _ in range(5))
    rows.append(_row("wQ", "s0", "e1", "dark"))
    # wK in both sessions
    for _ in range(5):
        rows.append(_row("wK", "s0", "e1", "dark"))
        rows.append(_row("wK", "s1", "e1", "dark"))
    # empty fill
    for _ in range(30):
        rows.append(_row("empty", "s0", "c4", "light"))
        rows.append(_row("empty", "s1", "c4", "light"))

    split = {
        "splits": {"train": ["s0"], "val": [], "test": ["s1"]},
        "counts": {"train": 2 + 5 + 5 + 30, "val": 0, "test": 5 + 30},
        "warnings": [],
    }
    errors, warnings = validate_split(split, rows)
    assert any("wQ" in e and "s0" in e for e in errors)
    assert any("Val split is empty" in e for e in errors)


def test_validate_split_zero_errors():
    """≥3 sessions, each class in ≥2 sessions, non-empty Val+Test -> 0 Errors."""
    from chesslab.dataset import validate_split

    rows = []
    for si in ["s0", "s1", "s2"]:
        for _ in range(3):
            rows.append(_row("wQ", si, "d1", "dark"))
            rows.append(_row("wK", si, "e1", "dark"))
            rows.append(_row("empty", si, "c4", "light"))

    split = {
        "splits": {"train": ["s0"], "val": ["s2"], "test": ["s1"]},
        "counts": {"train": 9, "val": 9, "test": 9},
        "warnings": [],
    }
    errors, warnings = validate_split(split, rows)
    assert errors == []


def test_validate_split_occluded_absent_globally_no_error():
    """occluded globally not present -> no Error (optional)."""
    from chesslab.dataset import validate_split

    rows = []
    for si in ["s0", "s1", "s2"]:
        for _ in range(3):
            rows.append(_row("wQ", si, "d1", "dark"))
            rows.append(_row("wK", si, "e1", "dark"))
            rows.append(_row("empty", si, "c4", "light"))

    split = {
        "splits": {"train": ["s0"], "val": ["s2"], "test": ["s1"]},
        "counts": {"train": 9, "val": 9, "test": 9},
        "warnings": [],
    }
    errors, warnings = validate_split(split, rows)
    assert not any("occluded" in e for e in errors)


def test_run_split_allow_degenerate_stores_errors(tmp_path, monkeypatch):
    """allow_degenerate=True -> runs through, split.json has degenerate_errors."""
    from chesslab import config
    from chesslab.dataset import run_split

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    config.DATA.crop_pool.mkdir(parents=True)

    # wQ only in s0
    rows = []
    rows.extend(_row("wQ", "s0", "d1", "dark") for _ in range(5))
    rows.append(_row("wK", "s1", "e1", "dark"))
    rows.append(_row("empty", "s1", "c4", "light"))

    import json
    (config.DATA.crop_pool / "manifest.jsonl").write_text(
        "\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")

    rc = run_split(val_frac=0.3, test_frac=0.3, max_empty_ratio=99.0, seed=42,
                   allow_degenerate=True)
    assert rc == 0
    split = json.loads((config.DATA.reports / "split.json").read_text(encoding="utf-8"))
    assert "degenerate_errors" in split
    assert any("wQ" in e for e in split["degenerate_errors"])


def test_verify_clean_dataset(tmp_path):
    f = tmp_path / "c.png"
    cv2.imwrite(str(f), np.zeros((128, 96, 3), dtype=np.uint8))
    rows = [_row("wK", "s0", "e1", "dark", path=str(f))]
    split = {"splits": {"train": ["s0"], "val": [], "test": []}}
    assert verify(rows, split=split) == []

# --- Occupancy (2-class) collapse — specs/18-occupancy-model/02-two-class-model.md ------

def _build_pool(tmp_path, monkeypatch, n_sessions=4):
    """A crop pool on disk + a patched config.DATA; returns (session_ids, manifest path)."""
    import json

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    config.DATA.crop_pool.mkdir(parents=True)
    rows = []
    for si in range(n_sessions):
        sid = f"s{si}"
        for fi in range(3):
            for k, lab in enumerate(["wP", "wN", "bB", "bK", "empty", "empty", "empty", "empty"]):
                sq = f"{'abcdefgh'[k]}{fi + 1}"
                r = _row(lab, sid, sq, "light" if k % 2 else "dark",
                         path=f"data/squares/{lab}/{sid}_{fi}_{sq}.png")
                r["frame"] = str(fi)
                rows.append(r)
    mp = config.DATA.crop_pool / "manifest.jsonl"
    mp.write_text("\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    return [f"s{i}" for i in range(n_sessions)], mp


def test_a_narrower_class_mode_reuses_the_same_rows(tmp_path, monkeypatch):
    """The narrowing is METADATA: same crops, same order, only the label list shrinks."""
    import json

    from chesslab import dataset_build as db

    sids, _ = _build_pool(tmp_path, monkeypatch)
    a = db.build_dataset("pieces", sids, phash_enabled=False, pack=False)
    b = db.build_dataset("id13", sids, phash_enabled=False, pack=False, class_mode="pieces13")
    assert a["counts"]["final"] == b["counts"]["final"]
    ra = [json.loads(x) for x in
          (db.dataset_dir("pieces") / "manifest.jsonl").read_text(encoding="utf-8").splitlines()]
    rb = [json.loads(x) for x in
          (db.dataset_dir("id13") / "manifest.jsonl").read_text(encoding="utf-8").splitlines()]
    assert [r["path"] for r in ra] == [r["path"] for r in rb]
    assert [r["label"] for r in ra] == [r["label"] for r in rb]


def test_a_narrower_class_mode_preserves_the_per_session_split(tmp_path, monkeypatch):
    import json

    from chesslab import dataset_build as db

    sids, _ = _build_pool(tmp_path, monkeypatch)
    db.build_dataset("pieces", sids, phash_enabled=False, pack=False)
    db.build_dataset("id13", sids, phash_enabled=False, pack=False, class_mode="pieces13")
    sa = json.loads((db.dataset_dir("pieces") / "split.json").read_text(encoding="utf-8"))["splits"]
    sb = json.loads((db.dataset_dir("id13") / "split.json").read_text(encoding="utf-8"))["splits"]
    assert sa == sb


def test_piece_class_build_is_unchanged(tmp_path, monkeypatch):
    """`--classes pieces13` is the default since 2026-08-18: the explicit mode and the default
    must produce a byte-identical split.json. `occluded` is a coverage target now, not a class."""
    from chesslab import dataset_build as db

    sids, _ = _build_pool(tmp_path, monkeypatch)
    db.build_dataset("a", sids, phash_enabled=False, pack=False)
    db.build_dataset("b", sids, phash_enabled=False, pack=False, class_mode="pieces13")
    assert ((db.dataset_dir("a") / "split.json").read_bytes()
            == (db.dataset_dir("b") / "split.json").read_bytes())


def test_a_narrower_build_drops_occluded_rows_loudly(tmp_path, monkeypatch, capsys):
    """`pieces13` has no `occluded` output, so such a row is dropped - and the count is printed.

    This used to raise. That was right while a hand label was the only way an `occluded` row could
    appear, but renders with `--occlusion-p` produce them in bulk. The guard's real purpose was to
    keep the drop from being silent, and the printed count serves it.
    """
    import json

    from chesslab import dataset_build as db

    sids, mp = _build_pool(tmp_path, monkeypatch)
    rows = [json.loads(x) for x in mp.read_text(encoding="utf-8").splitlines()]
    rows[0]["label"] = "occluded"
    mp.write_text("\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    db.build_dataset("id13", sids, phash_enabled=False, pack=False, class_mode="pieces13")
    assert "dropped 1" in capsys.readouterr().out


def test_like_takes_the_donors_assignment_verbatim(tmp_path, monkeypatch):
    """The twin must train on the same sessions as the model it is compared against.

    `assign_sessions_to_splits` does not return a dataset's own recorded split when fed that
    dataset's own recorded parameters, so a plain rebuild silently moves sessions between train and
    test. `--like` is the only safe way to build a comparable dataset.
    """
    import json

    from chesslab import dataset_build as db

    donor = tmp_path / "datasets" / "donor"
    donor.mkdir(parents=True)
    (donor / "split.json").write_text(json.dumps(
        {"splits": {"train": ["s1", "s2"], "val": ["s3"], "test": ["s4"]}}), encoding="utf-8")

    class _P:
        datasets = tmp_path / "datasets"

    got = db._split_from("donor", {"s1", "s2", "s3", "s4"}, _P)
    assert got == {"train": ["s1", "s2"], "val": ["s3"], "test": ["s4"]}

    # A narrower selection keeps the donor's placement for what is present.
    assert db._split_from("donor", {"s1", "s4"}, _P) == {"train": ["s1"], "val": [], "test": ["s4"]}

    # A session the donor never placed is refused, not defaulted into train.
    with pytest.raises(ValueError, match="s9"):
        db._split_from("donor", {"s1", "s9"}, _P)


def test_add_test_extends_the_donor_split_without_touching_train(tmp_path):
    """A session recorded only to evaluate against belongs in test, and nowhere else.

    Train and val must come out byte-identical to the donor's, or every model trained against the
    donor stops being comparable — which is the one thing `--like` exists to prevent.
    """
    import json

    from chesslab import dataset_build as db

    donor = tmp_path / "datasets" / "donor"
    donor.mkdir(parents=True)
    (donor / "split.json").write_text(json.dumps(
        {"splits": {"train": ["s1", "s2"], "val": ["s3"], "test": ["s4"]}}), encoding="utf-8")

    class _P:
        datasets = tmp_path / "datasets"

    got = db._split_from("donor", {"s1", "s2", "s3", "s4", "new"}, _P, add_test=["new"])
    assert got["train"] == ["s1", "s2"] and got["val"] == ["s3"]
    assert got["test"] == ["s4", "new"]

    # Naming a session that is already in train would silently change what the donor's models saw.
    with pytest.raises(ValueError, match="already in donor's train or val"):
        db._split_from("donor", {"s1", "s2", "s3", "s4"}, _P, add_test=["s1"])

    # An extra session NOT named in --add-test is still refused rather than defaulted.
    with pytest.raises(ValueError, match="new"):
        db._split_from("donor", {"s1", "new"}, _P)


def test_pseudo_sessions_of_one_clip_never_straddle_the_split():
    """`composite.build_from_video` cuts a clip into `blocks` pseudo-sessions. Without the group
    they landed in different splits — comp13-occ-80-v1 had frame 664 in val and 672 in train, so
    val measured train. Declaring the group is what keeps a clip whole."""
    sizes = {f"comp-A-{i:02d}": 900 for i in range(6)} | {f"comp-B-{i:02d}": 300 for i in range(6)}
    groups = {sid: sid.rsplit("-", 1)[0] for sid in sizes}

    sp = assign_sessions_to_splits(sizes, val_frac=0.15, test_frac=0.15, seed=42, groups=groups)

    placed = {sid: name for name, sids in sp.items() for sid in sids}
    assert set(placed) == set(sizes)
    for clip in ("comp-A", "comp-B"):
        landed = {placed[sid] for sid in sizes if sid.startswith(clip)}
        assert len(landed) == 1, f"{clip} straddles {landed}"


def test_groups_default_to_one_per_session():
    """No `split_group` in the rows -> the old per-session behaviour, bit for bit."""
    rows = [{"session_id": "s1"}, {"session_id": "s2", "split_group": "g"}]
    assert dataset.groups_of(rows) == {"s1": "s1", "s2": "g"}
    assert (assign_sessions_to_splits(_UNEQUAL, 0.15, 0.15, 42)
            == assign_sessions_to_splits(_UNEQUAL, 0.15, 0.15, 42, groups=None))
