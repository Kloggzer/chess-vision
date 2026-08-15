"""The `occluded-proposals.summary.json` sidecar — CONCEPT.md docs/labeling-ux/CONCEPT.md 6.3.

`/corpus` needs per-session stream counts on nine sessions at once without parsing 33 MB of
proposal rows, so `propose_occluded` writes a sidecar of a few hundred bytes beside the jsonl.
`stream_counts` mirrors `splitStreams` (`platform/app/lib/proposals.ts:97-103`) exactly, and the
`_thresholds` header gains `model`/`written_at` as additive keys — both checked against the real
predicates/formula, not re-derived here.
"""

import json
from pathlib import Path

import pytest

from chesslab import config, occluded
from chesslab.occluded import stream_counts, write_proposals, write_summary


def _row(frame, score):
    return {
        "session_id": "rg-g",
        "frame": frame,
        "square": "e2",
        "fen_label": "wQ",
        "proposed": "occluded" if score > 0.7 else "keep",
        "score": score,
    }


def _js_control(below: int) -> int:
    """Independent re-implementation of `splitStreams`' downsample count — the cross-check."""
    import math

    step = max(1, math.ceil(below / 180))
    return len([i for i in range(below) if i % step == 0])


def test_confirm_and_unsure_match_the_ui_score_predicates():
    rows = [_row("1", 0.9), _row("1", 0.71), _row("2", 0.7), _row("2", 0.5), _row("3", 0.29)]
    counts = stream_counts(rows, hi=0.7, lo=0.3)
    # score > hi -> confirm; lo <= score <= hi -> unsure; score < lo -> below (control pool).
    assert counts["confirm"] == 2
    assert counts["unsure"] == 2


@pytest.mark.parametrize("below", [0, 1, 179, 180, 181, 360, 361, 1000])
def test_control_count_matches_the_js_downsample_for_any_pool_size(below):
    rows = [_row(str(i), 0.0) for i in range(below)]  # all below lo=0.3
    assert stream_counts(rows, hi=0.7, lo=0.3)["control"] == _js_control(below)


def test_write_summary_counts_boards_and_cells_and_stamps_provenance(tmp_path):
    rows = [
        _row("004211", 0.9),
        _row("004211", 0.5),  # same board, second cell
        _row("004300", 0.1),
    ]
    path = write_summary(
        tmp_path / "occluded-proposals.summary.json",
        rows,
        hi=0.7,
        lo=0.3,
        model=Path("data/models/real14-ms-s3-hn-bn80"),
        written_at="2026-08-15T12:00:00+00:00",
    )
    summary = json.loads(path.read_text(encoding="utf-8"))
    assert summary["boards"] == 2
    assert summary["cells"] == 3
    # The SET, not just its size: `boardProgress` intersects it with the judged frames.
    assert summary["frames"] == ["004211", "004300"]
    assert summary["by_stream"] == {"confirm": 1, "unsure": 1, "control": 1}
    assert summary["hi"] == 0.7 and summary["lo"] == 0.3
    assert summary["model"] == str(Path("data/models/real14-ms-s3-hn-bn80"))
    assert summary["written_at"] == "2026-08-15T12:00:00+00:00"


def test_write_summary_is_atomic_no_tmp_file_survives(tmp_path):
    path = tmp_path / "occluded-proposals.summary.json"
    write_summary(path, [_row("1", 0.9)], hi=0.7, lo=0.3, model=None, written_at="x")
    assert path.exists()
    assert not list(tmp_path.glob("*.tmp"))
    assert json.loads(path.read_text(encoding="utf-8"))["model"] is None


def test_write_proposals_never_leaves_a_partial_file_under_the_real_name(tmp_path):
    """A row that will not serialize kills the write mid-way — the old file must survive it."""
    path = tmp_path / "occluded-proposals.jsonl"
    path.write_text("OLD\n", encoding="utf-8")
    with pytest.raises(TypeError):
        write_proposals(path, [_row("1", 0.9), {"probs": object()}], hi=0.7, lo=0.3)
    assert path.read_text(encoding="utf-8") == "OLD\n"
    assert not list(tmp_path.glob("*.tmp"))


def test_write_proposals_header_carries_model_and_written_at_additively(tmp_path):
    path = write_proposals(
        tmp_path / "occluded-proposals.jsonl",
        [_row("1", 0.9)],
        hi=0.7,
        lo=0.3,
        model=Path("data/models/real14-ms-s3-hn-bn80"),
        written_at="2026-08-15T12:00:00+00:00",
    )
    header = json.loads(path.read_text(encoding="utf-8").splitlines()[0])["_thresholds"]
    assert header["hi"] == 0.7 and header["lo"] == 0.3
    assert header["model"] == str(Path("data/models/real14-ms-s3-hn-bn80"))
    assert header["written_at"] == "2026-08-15T12:00:00+00:00"


def test_a_pre_existing_header_without_the_new_keys_still_parses(tmp_path):
    """Additive-only: a file written before this change has no `model`/`written_at` at all."""
    path = tmp_path / "occluded-proposals.jsonl"
    path.write_text(json.dumps({"_thresholds": {"hi": 0.7, "lo": 0.3}}) + "\n", encoding="utf-8")
    header = json.loads(path.read_text(encoding="utf-8").splitlines()[0])["_thresholds"]
    assert header == {"hi": 0.7, "lo": 0.3}


def test_propose_occluded_writes_both_files_with_matching_provenance(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    session_dir = config.DATA.sessions / "rg-g"
    session_dir.mkdir(parents=True)
    (session_dir / "log.jsonl").write_text("", encoding="utf-8")

    rows = [_row("004211", 0.9), _row("004300", 0.1)]
    monkeypatch.setattr(occluded, "proposal_rows", lambda *a, **k: (rows, []))

    result = occluded.propose_occluded("g", hi=0.7, lo=0.3)

    proposals_path = config.DATA.root / "realgames" / "g" / "occluded-proposals.jsonl"
    summary_path = config.DATA.root / "realgames" / "g" / "occluded-proposals.summary.json"
    assert result["path"] == proposals_path
    assert result["summary_path"] == summary_path

    header = json.loads(proposals_path.read_text(encoding="utf-8").splitlines()[0])["_thresholds"]
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    assert header["model"] is None and summary["model"] is None
    assert header["written_at"] == summary["written_at"]
    assert summary["boards"] == 2 and summary["cells"] == 2
    assert summary["frames"] == ["004211", "004300"]
