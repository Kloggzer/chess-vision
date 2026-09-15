"""Temporal evidence creates review candidates, never masks or automatic labels."""

import json

import pytest

from chesslab import config, temporal_flags

FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def entry(**kw):
    return {"frame": "frames/000001.png", "fen": FEN, "ply": 0, **kw}


def measurement(**kw):
    return {"frame": "000001", "square": "a2", "temporal_normalized": .5,
            "temporal_raw": 18., "reference_stock": "boards", "reference_peers": 5, **kw}


def flags(cell=None, row=None, coverage=None):
    return temporal_flags.candidate_flags([cell or measurement()], [row or entry()],
                                         coverage or {}, "rg-test", .4)


def test_low_raw_deviation_still_reaches_review_without_fabricating_coverage():
    result = flags()[0]
    assert result["reason"] == "temporal"
    assert result["fen_label"] == "wP"
    assert result["temporal_score"] == .5
    assert result["matte_cov"] is None


@pytest.mark.parametrize("change", [
    {"temporal_normalized": .399}, {"temporal_normalized": None},
    {"temporal_normalized": float("nan")}, {"reference_peers": 4},
    {"reference_stock": "all"}, {"square": "z9"},
])
def test_insufficient_or_untrusted_evidence_does_not_generate_cards(change):
    assert flags(measurement(**change)) == []


def test_live_matte_and_exporter_exclusions_take_precedence():
    assert flags(coverage={"000001": {"a2": .16}}) == []
    assert flags(coverage={"000001": {"a2": .15}})
    assert flags(row=entry(unusable=True)) == []
    assert flags(row=entry(unknown_squares=["a2"])) == []
    assert flags(row=entry(ambiguous_squares=["a2"])) == []


def test_duplicate_measurements_generate_only_one_card():
    result = temporal_flags.candidate_flags([measurement(), measurement()], [entry()], {}, "rg-test", .4)
    assert len(result) == 1


def test_changed_source_invalidates_saved_measurements(tmp_path, monkeypatch):
    report = tmp_path / "temporal.jsonl"
    monkeypatch.setattr(temporal_flags, "report_path", lambda _: report)
    monkeypatch.setattr(temporal_flags, "source_stamp", lambda _: ["new source"])
    report.write_text(json.dumps({"_schema": 1, "_session_id": "rg-test",
                                  "_cut": .4, "_source": ["old source"]}) + "\n",
                      encoding="utf-8")
    assert temporal_flags.load_flags(tmp_path, "rg-test", [entry()], {}) == ([], True)


def test_position_report_merges_sources_without_duplicates(tmp_path, monkeypatch):
    from chesslab import position_flags

    rec = tmp_path / "recordings" / "test"
    rec.mkdir(parents=True)
    (rec / "log.jsonl").write_text("", encoding="utf-8")
    (rec / "session.yaml").write_text("", encoding="utf-8")
    (rec / "matte.jsonl").write_text("", encoding="utf-8")
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    monkeypatch.setattr(position_flags, "read_session_meta", lambda _: {"session_id": "rg-test"})
    monkeypatch.setattr(position_flags, "read_matte", lambda _: {})
    monkeypatch.setattr(position_flags, "read_log", lambda _: [entry(settle_left=["a2"])])
    monkeypatch.setattr(temporal_flags, "load_flags", lambda *args: (flags(), False))
    result = position_flags.position_flags()
    assert result["flags"] == 1
    row = json.loads(result["path"].read_text().splitlines()[1])
    assert row["reason"] == "changed"
    assert row["temporal_score"] == .5
