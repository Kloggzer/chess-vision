"""The confident-learning audit producer (`docs/cross-labeling-literature.md`)."""

import json

import pytest

from chesslab import audit_flags as mod
from chesslab import config
from chesslab.audit_flags import class_thresholds, confident_class, session_flags
from chesslab.session_store.recording import game_dir

#: Deliberately NOT a run on disk: these tests are about flag selection, and the guard has
#: its own. A real path would be read under the monkeypatched data root, where its split
#: is absent — which `check_not_circular` refuses since 2026-09-14.
MODEL = "data/models/_not-on-disk-audit-fixture"


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
def test_a_cell_confirmed_in_reviewed_is_not_asked_again():
    # "FEN stimmt" lands in reviewed.jsonl, not corrections.jsonl — reading only the latter would
    # hand every confirmation back on the next run.
    _write_proposals("g", _GOOD)
    assert mod.audit_flags()["flags"] == 1

    reviewed = game_dir("g") / "reviewed.jsonl"
    reviewed.write_text(json.dumps({"session_id": "rg-g", "frame": "001", "square": "a1",
                                    "label": "wP"}) + "\n", encoding="utf-8")
    assert mod.audit_flags()["flags"] == 0


@pytest.mark.usefixtures("data_root")
def test_occupancy_scope_keeps_the_empty_dispute_and_drops_the_type_one():
    # t_wP = 0.1 over the two wP cells, t_wB = t_empty = 0.3 from their own support cell.
    _write_proposals("g", [
        _row("001", "a1", "wP", {"wP": 0.1, "wB": 0.9}),
        _row("002", "a1", "wP", {"wP": 0.1, "empty": 0.9}),
        _row("003", "b1", "wB", {"wB": 0.3}),
        _row("004", "c1", "empty", {"empty": 0.3}),
    ])
    assert mod.audit_flags()["flags"] == 2

    r = mod.audit_flags(occupancy_only=True)
    rows = [json.loads(x) for x in r["path"].read_text(encoding="utf-8").splitlines()]
    assert [(x["frame"], x["predicted"]) for x in rows] == [("002", "empty")]
    assert (r["scope"], r["dropped_by_scope"]) == ("occupancy", 1)


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


# --- Klassen, die das Modell gar nicht ausgibt (gefunden 2026-09-08) --------------------------

def test_a_class_the_model_cannot_output_never_wins():
    """Ein Label aus dem Ledger, fuer das das Modell keine Einheit hat — `occluded` aus der Zeit,
    als Verdeckung von Hand gemalt wurde — bekommt aus Gleichung 2 die Schwelle 0, weil seine
    mittlere Selbstsicherheit null IST. Danach besteht es auf JEDER Zelle, ohne je eine Aussage
    gewesen zu sein: 3 548 von 9 807 Flags, alle mit prob 0.0."""
    thresholds = {"wP": 0.9, "empty": 0.9, "occluded": 0.0}
    probs = {"wP": 0.2, "empty": 0.3}
    # Ohne die Klassenliste gewinnt `occluded` mit Wahrscheinlichkeit 0.0.
    assert confident_class(probs, thresholds) == "occluded"
    # Mit ihr faellt es raus und nichts besteht die Schwelle.
    known = {"empty", "wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK"}
    assert confident_class(probs, thresholds, known) is None


def test_a_known_class_still_wins_normally():
    """Der Filter darf nur die unbekannte Klasse kosten, nicht die Aussage."""
    thresholds = {"wP": 0.5, "empty": 0.5, "occluded": 0.0}
    probs = {"wP": 0.95, "empty": 0.1}
    known = {"wP", "empty"}
    assert confident_class(probs, thresholds, known) == "wP"
    assert confident_class(probs, thresholds) == "wP"


def test_session_flags_drops_the_unknown_class():
    """Der echte Fall: das Label hat eine HOHE Schwelle (Gleichung 2 mittelt ueber alle wP-Zellen)
    und faellt auf DIESER Zelle durch. Dann besteht nur noch `occluded` mit 0.0 — eine Klasse,
    fuer die das Modell keine Einheit hat, deren Schwelle deshalb 0 ist."""
    rows = [
        # Beurteilt und `occluded` gelabelt: bringt die Klasse mit Schwelle 0 herein.
        {"session_id": "rg-x", "frame": "000003", "square": "c3", "fen_label": "empty",
         "probs": {"empty": 0.9}},
        # Zwei wP-Zellen: die sichere hebt die Schwelle, die unsichere faellt durch.
        {"session_id": "rg-x", "frame": "000001", "square": "a1", "fen_label": "wP",
         "probs": {"wP": 0.9}},
        {"session_id": "rg-x", "frame": "000002", "square": "b2", "fen_label": "wP",
         "probs": {"bN": 0.4}},
    ]
    judged = {("rg-x", "000003", "c3"): "occluded"}
    with_all = session_flags(rows, judged, model="m", ts="t")
    with_known = session_flags(rows, judged, model="m", ts="t",
                               classes=["empty", "wP", "wN", "wB", "wR", "wQ", "wK",
                                        "bP", "bN", "bB", "bR", "bQ", "bK"])
    bad = [f for f in with_all if f["predicted"] == "occluded"]
    assert bad, "Vorbedingung: der Defekt tritt auf"
    assert all(f["prob"] == 0.0 for f in bad), "und zwar mit Wahrscheinlichkeit null"
    assert not any(f["predicted"] == "occluded" for f in with_known)


def test_the_models_coverage_rides_along_as_a_second_opinion():
    """Die 14. Spalte ist ein eigener Sigmoid, keine Klasse. Das Mass bleibt die Matte
    (`--visible`); dies ist die zweite Meinung, wo SAM eine Hand uebersehen hat."""
    rows = [
        # Eine bQ-gelabelte Zelle, damit bQ ueberhaupt eine Schwelle bekommt.
        {"session_id": "rg-x", "frame": "000002", "square": "b2", "fen_label": "bQ",
         "probs": {"bQ": 0.9}, "model_cov": 0.01},
        # Die Zelle, die auffliegt: FEN sagt wP, das Modell sagt sicher bQ.
        {"session_id": "rg-x", "frame": "000001", "square": "a1", "fen_label": "wP",
         "probs": {"bQ": 0.99}, "model_cov": 0.87},
    ]
    got = [f for f in session_flags(rows, {}, model="m", ts="t", classes=["wP", "bQ"])
           if f["square"] == "a1"]
    assert got and got[0]["model_cov"] == 0.87
    # Ohne `model_cov` in der Lesart taucht das Feld gar nicht erst auf.
    for r in rows:
        r.pop("model_cov")
    bare = [f for f in session_flags(rows, {}, model="m", ts="t", classes=["wP", "bQ"])
            if f["square"] == "a1"]
    assert bare and "model_cov" not in bare[0]


def test_include_judged_finds_the_wrong_hand_correction():
    """Die blinde Stelle, die am 09.09. vier falsche Korrekturen im Test-Split versteckte: das
    Urteil selbst nimmt die Zelle aus dem Lauf, also ist eine falsche Korrektur unfindbar."""
    rows = [
        _row("001", "a7", "empty", {"empty": 0.0, "bB": 1.0}),
        _row("002", "b7", "bB", {"bB": 0.9}),
    ]
    judged = {("rg-g", "001", "a7"): "bP"}
    assert session_flags(rows, judged, model=MODEL, ts="t") == []
    flags = session_flags(rows, judged, model=MODEL, ts="t", include_judged=True)
    assert [(f["frame"], f["predicted"]) for f in flags] == [("001", "bB")]
    # Die Karte muss sagen, WAS der Mensch geschrieben hat — sonst zeigt die Lane die FEN und
    # verschweigt den Widerspruch, um den es geht.
    assert flags[0]["judged"] == "bP"
    assert flags[0]["fen_label"] == "empty"


def test_an_unjudged_flag_carries_no_judged_field():
    flags = session_flags(_GOOD, {}, model=MODEL, ts="t", include_judged=True)
    assert flags and "judged" not in flags[0]


@pytest.mark.usefixtures("data_root")
def test_skip_leaves_the_session_out_and_says_so():
    """Ausblenden muss laut sein: eine stille Session waere von einer fehlenden nicht zu
    unterscheiden, und die Lane zaehlte sie als 0 statt als ungemessen."""
    _write_proposals("g", _GOOD)
    r = mod.audit_flags(skip=("g",))
    assert r["flags"] == 0
    assert [s["session"] for s in r["skipped"]] == ["g"]
    assert "--skip" in r["skipped"][0]["reason"]
