"""The confident-learning audit producer (`docs/cross-labeling-literature.md`, CONCEPT.md 4.2).

The thresholds are checked against a hand computation, not against a second implementation of the
same formula, and the boundary `p̂(j) == t_j` is pinned because the literature's Eqn. 1 says `≥`.
"""

import json

import pytest

from chesslab import audit_flags as mod
from chesslab import config
from chesslab.audit_flags import class_thresholds, confident_class, session_flags
from chesslab.realgames import game_dir

MODEL = "data/models/real14-ms-s3-hn-bn80"


def _row(frame, square, label, probs, session="rg-g"):
    return {"session_id": session, "frame": frame, "square": square, "fen_label": label,
            "proposed": "keep", "score": 0.0, "probs": probs}


def _write_proposals(name, rows, *, model=MODEL, header_model=True):
    path = game_dir(name) / "model-reads.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    header = {"hi": 0.7, "lo": 0.3}
    if header_model:
        header["model"] = model
    with path.open("w", encoding="utf-8") as fh:
        fh.write(json.dumps({"_thresholds": header}) + "\n")
        for row in rows:
            fh.write(json.dumps(row) + "\n")
    return path


#: One flaggable cell (wP read as wB) plus the wB cell that gives `t_wB` its support set.
_GOOD = [_row("001", "a1", "wP", {"wP": 0.1, "wB": 0.9}), _row("001", "b1", "wB", {"wB": 0.3})]


@pytest.fixture
def data_root(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    config.DATA.reports.mkdir(parents=True)
    return config.DATA.root


def test_threshold_is_the_mean_self_confidence_of_the_cells_labelled_that_class():
    cells = [("wP", {"wP": 0.9}), ("wP", {"wP": 0.5}), ("wP", {"wB": 0.99}), ("wB", {"wB": 0.6})]
    t = class_thresholds(cells)
    assert t["wP"] == pytest.approx((0.9 + 0.5 + 0.0) / 3)  # absent = below the sparse floor
    assert t["wB"] == pytest.approx(0.6)
    assert "empty" not in t  # no support set, no threshold — the `occluded` case


def test_a_class_at_exactly_its_threshold_still_counts():
    t = {"wP": 0.5, "wB": 0.5}
    assert confident_class({"wP": 0.4, "wB": 0.5}, t) == "wB"
    assert confident_class({"wP": 0.4, "wB": 0.49}, t) is None


def test_the_given_label_competes_in_the_argmax():
    t = {"wP": 0.3, "wB": 0.3}
    assert confident_class({"wP": 0.6, "wB": 0.4}, t) == "wP"


def test_flags_only_the_cells_whose_confident_class_is_not_their_label():
    rows = [
        _row("001", "a1", "wP", {"wP": 0.9}),
        _row("002", "a1", "wP", {"wP": 0.1, "wB": 0.9}),
        _row("003", "a1", "wB", {"wB": 0.9}),
    ]
    flags = session_flags(rows, {}, model=MODEL, ts="t")
    assert [(f["frame"], f["fen_label"], f["predicted"]) for f in flags] == [("002", "wP", "wB")]
    assert flags[0]["prob"] == 0.9
    assert flags[0]["margin"] == pytest.approx(0.8)
    assert flags[0]["fold"] == 0 and flags[0]["model"] == MODEL and flags[0]["ts"] == "t"


def test_a_cell_a_human_already_answered_is_never_flagged_but_still_sets_the_threshold():
    rows = [
        _row("001", "a1", "wP", {"wP": 0.1, "occluded": 0.9}),
        _row("002", "a1", "wP", {"wP": 0.1, "occluded": 0.8}),
    ]
    judged = {("rg-g", "001", "a1"): "occluded"}
    # t_occluded = 0.9 — the human's cell is its only support, so 0.8 stays under it.
    assert session_flags(rows, judged, model=MODEL, ts="t") == []
    rows.append(_row("003", "a1", "wP", {"wP": 0.05, "occluded": 0.95}))
    flags = session_flags(rows, judged, model=MODEL, ts="t")
    assert [(f["frame"], f["predicted"]) for f in flags] == [("003", "occluded")]


@pytest.mark.usefixtures("data_root")
def test_flags_are_written_margin_descending():
    # t_wB = 0.5 from the two wB cells; t_wP = 0.4167 from the three wP ones.
    _write_proposals("g", [
        _row("001", "a1", "wB", {"wB": 0.4}),
        _row("002", "a1", "wB", {"wB": 0.6}),
        _row("003", "a1", "wP", {"wP": 0.9}),
        _row("004", "a1", "wP", {"wP": 0.3, "wB": 0.5}),
        _row("005", "a1", "wP", {"wP": 0.05, "wB": 0.9}),
    ])
    r = mod.audit_flags()
    rows = [json.loads(x) for x in r["path"].read_text(encoding="utf-8").splitlines()]
    assert [x["frame"] for x in rows] == ["005", "004"]
    assert [x["margin"] for x in rows] == [0.85, 0.2]


@pytest.mark.usefixtures("data_root")
def test_a_file_without_probs_or_without_a_model_is_skipped_and_named():
    _write_proposals("no-probs", [])
    bare = _write_proposals("no-model", [_row("001", "a1", "wP", {"wB": 0.9})],
                            header_model=False)
    _write_proposals("good", _GOOD)
    assert bare.exists()

    r = mod.audit_flags()

    skipped = {s["session"]: s["reason"] for s in r["skipped"]}
    assert set(skipped) == {"no-probs", "no-model"}
    assert "probs" in skipped["no-probs"] and "model" in skipped["no-model"]
    assert r["sessions"] == ["rg-g"] and r["cells_scanned"] == 2 and r["flags"] == 1
    summary = json.loads(
        (config.DATA.reports / "audit-flags.summary.json").read_text(encoding="utf-8"))
    assert summary["per_class"] == {"wP": 1}
    assert summary["skipped"] == r["skipped"] and summary["written_at"] == r["written_at"]


@pytest.mark.usefixtures("data_root")
def test_a_model_trained_on_the_session_is_skipped_with_the_guard_reason(monkeypatch):
    _write_proposals("g", _GOOD)
    monkeypatch.setattr(mod, "circularity_reason", lambda m, s: "TRAINED on it")
    r = mod.audit_flags()
    assert r["flags"] == 0 and r["skipped"] == [{"session": "g", "reason": "TRAINED on it"}]


@pytest.mark.usefixtures("data_root")
def test_the_run_is_idempotent_and_replaces_the_whole_file():
    _write_proposals("g", _GOOD)
    first = mod.audit_flags()
    first["path"].write_text("STALE\n" * 5, encoding="utf-8")
    second = mod.audit_flags()
    assert second["flags"] == first["flags"] == 1
    assert len(second["path"].read_text(encoding="utf-8").splitlines()) == 1


def test_write_flags_never_leaves_a_partial_file_under_the_real_name(tmp_path):
    path = tmp_path / "audit-flags.jsonl"
    path.write_text("OLD\n", encoding="utf-8")
    with pytest.raises(TypeError):
        mod.write_flags(path, [{"square": "a1"}, {"square": object()}])
    assert path.read_text(encoding="utf-8") == "OLD\n"
    assert not list(tmp_path.glob("*.tmp"))


def test_a_retracted_verdict_reopens_the_cell(tmp_path):
    path = tmp_path / "corrections.jsonl"
    path.write_text(
        json.dumps({"session_id": "rg-g", "frame": "001", "square": "a1", "label": "occluded"})
        + "\n"
        + json.dumps({"session_id": "rg-g", "frame": "001", "square": "a1", "label": "occluded",
                      "retract": True}) + "\n",
        encoding="utf-8")
    assert mod.ledger_labels(path) == {}


def test_a_later_ledger_retracts_an_earlier_one(tmp_path):
    reviewed = tmp_path / "reviewed.jsonl"
    corrections = tmp_path / "corrections.jsonl"
    row = {"session_id": "rg-g", "frame": "001", "square": "a1", "label": "occluded"}
    reviewed.write_text(json.dumps(row) + "\n", encoding="utf-8")
    corrections.write_text(json.dumps({**row, "retract": True}) + "\n", encoding="utf-8")
    assert mod.ledger_labels(reviewed) == {("rg-g", "001", "a1"): "occluded"}
    assert mod.ledger_labels(reviewed, corrections) == {}
