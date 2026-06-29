"""Stage 4 — dataset stats / split / verify (headless)."""

import json

import cv2
import numpy as np

from chesslab import config
from collections import Counter

from chesslab.dataset import (
    compute_class_weights,
    compute_stats,
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
        for k in range(10):
            rows.append(_row("wP", sid, "a2", "light" if k % 2 else "dark"))
        rows.append(_row("wK", sid, "e1", "dark"))
        for k in range(60):
            rows.append(_row("empty", sid, "c4", "light" if k % 2 else "dark"))
    return rows


def test_compute_stats_counts_and_warnings():
    rows = _dataset()
    stats = compute_stats(rows, min_samples=200)
    assert stats["num_sessions"] == 4
    assert stats["counts"]["wP"] == 40
    assert stats["counts"]["empty"] == 240
    assert stats["light"]["wP"] == 20 and stats["dark"]["wP"] == 20
    # wK only on dark squares -> warning; wP under 200 -> warning
    assert any("wK" in w and "dunkel" in w for w in stats["warnings"])
    assert any("wP" in w and "200" in w for w in stats["warnings"])
    # bN absent entirely
    assert any(w.startswith("Klasse bN") for w in stats["warnings"])


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


def test_class_weights_largest_class_has_smallest_weight():
    counts = {c: 0 for c in config.CLASSES}
    counts["empty"] = 1000
    counts["wP"] = 100
    counts["wK"] = 10
    w = compute_class_weights(counts)
    present = {c: w[c] for c in ("empty", "wP", "wK")}
    assert present["empty"] == min(present.values())   # largest class -> smallest weight
    assert present["wK"] == max(present.values())       # rarest -> largest
    assert w["bN"] == 0.0                                # absent -> 0


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
    assert any("fehlt" in p for p in problems)
    assert any("out_size" in p for p in problems)
    assert any("unbekanntes Label" in p for p in problems)
    assert any("UND" in p for p in problems)


def test_verify_clean_dataset(tmp_path):
    f = tmp_path / "c.png"
    cv2.imwrite(str(f), np.zeros((128, 96, 3), dtype=np.uint8))
    rows = [_row("wK", "s0", "e1", "dark", path=str(f))]
    split = {"splits": {"train": ["s0"], "val": [], "test": []}}
    assert verify(rows, split=split) == []
