"""Das Wort des Menschen ist das letzte, auch fuer den Schueler (`matte-bad`, `matte-ok`)."""

from __future__ import annotations

import json

import pytest
import yaml

from chesslab import config
from conftest import write_jsonl


def _corpus(tmp_path, rows: list[dict], notes: list[dict]):
    paths = config.Paths(root=tmp_path / "data")
    rec = paths.recordings / "r1"
    rec.mkdir(parents=True)
    (rec / "session.yaml").write_text(yaml.safe_dump({"session_id": "rg-r1", "profile": "p"}),
                                      encoding="utf-8")
    (rec / "log.jsonl").write_text("".join(
        json.dumps({"frame": f"frames/{r['frame']}.png", "board": f"boards/{r['frame']}.webp",
                    "board_border": 0}) + "\n" for r in rows), encoding="utf-8")
    write_jsonl(rec / "matte.jsonl", rows)
    ledger = paths.root / "labels"
    ledger.mkdir(parents=True)
    (ledger / "review-notes.jsonl").write_text("".join(
        json.dumps({"session_id": "rg-r1", **n}) + "\n" for n in notes), encoding="utf-8")
    return paths


def _hand(frame: str, **extra) -> dict:
    return {"frame": frame, "concepts": {"hand": 0.9}, "coverage": {"a1": 0.9}, **extra}


def test_a_matte_the_human_called_wrong_teaches_nothing(tmp_path, monkeypatch) -> None:
    from chesslab import hand_gate

    monkeypatch.setattr(config, "DATA", _corpus(
        tmp_path, [_hand("000001"), _hand("000002")],
        [{"frame": "000002", "verdict": "matte-bad"}]))

    assert {r["stem"] for r in hand_gate.gate_rows()} == {"000001"}


def test_an_approved_temporal_row_does_teach(tmp_path, monkeypatch) -> None:
    from chesslab import hand_gate

    monkeypatch.setattr(config, "DATA", _corpus(
        tmp_path,
        [_hand("000001", source="upsert"), _hand("000002", source="upsert")],
        [{"frame": "000001", "verdict": "matte-ok"}]))

    assert {r["stem"] for r in hand_gate.gate_rows()} == {"000001"}, (
        "freigegeben lehrt, ungeprueft nicht — der Drei-Bilder-Sensor ist nicht SAM")


def test_a_pinned_holdout_is_kept_verbatim() -> None:
    from chesslab.hand_gate import holdout_sessions

    rows = [{"session": f"rg-{i}"} for i in range(10)]

    assert holdout_sessions(rows, 4, pinned=["rg-7", "rg-2"]) == ["rg-2", "rg-7"]


def test_a_pinned_holdout_that_is_not_in_the_corpus_is_refused() -> None:
    from chesslab.hand_gate import holdout_sessions

    with pytest.raises(ValueError, match="rg-weg"):
        holdout_sessions([{"session": "rg-1"}], 1, pinned=["rg-weg"])


def test_without_pinning_the_holdout_still_walks_with_the_corpus() -> None:
    """Der Grund fuer `pinned`: dieselbe Zahl waehlt bei mehr Sessions ANDERE aus."""
    from chesslab.hand_gate import holdout_sessions

    small = holdout_sessions([{"session": f"rg-{i}"} for i in range(8)], 4)
    grown = holdout_sessions([{"session": f"rg-{i}"} for i in range(20)], 4)

    assert small != grown
