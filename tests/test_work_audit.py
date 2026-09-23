"""Semantic work audit: duplicates are about domain keys, not identical Python call stacks."""

import json

from chesslab.work_audit import WorkAudit, activate, deactivate, object_revision, run_fuzzy, span


def test_repeated_semantic_keys_keep_execution_cost_and_mark_the_repeat():
    audit = WorkAudit(seed=7)
    token = activate(audit)
    try:
        with span("FramePipeline.onFrame"):
            audit.record_work("BGR to Gray conversions", ("frame", 4), seconds=0.2,
                              processed_bytes=300)
            audit.record_work("BGR to Gray conversions", ("frame", 4), seconds=0.3,
                              processed_bytes=300)
    finally:
        deactivate(token)

    report = audit.report()
    op = report["operations"]["BGR to Gray conversions"]
    assert op == {
        "calls": 2,
        "unique_keys": 1,
        "avoidable_calls": 1,
        "total_seconds": 0.5,
        "avoidable_seconds": 0.3,
        "total_bytes": 600,
        "avoidable_bytes": 300,
    }
    assert report["dominant_avoidable_call_path"] == [
        "FramePipeline.onFrame", "BGR to Gray conversions"]


def test_interval_union_counts_overlapping_video_decodes_once():
    audit = WorkAudit()
    audit.record_interval("video frames", "clip.mp4", 0, 100)
    audit.record_interval("video frames", "clip.mp4", 50, 150)
    audit.record_interval("video frames", "other.mp4", 0, 9)

    assert audit.report()["intervals"]["video frames"] == {
        "requests": 3,
        "requested_units": 212,
        "unique_units": 161,
        "avoidable_units": 51,
    }


def test_object_revisions_reuse_one_object_identity_without_retaining_it():
    class Box:
        pass

    audit = WorkAudit()
    token = activate(audit)
    try:
        value = Box()
        assert object_revision(value) == object_revision(value)
        assert object_revision(Box()) != object_revision(value)
    finally:
        deactivate(token)


def test_fuzzy_run_is_reproducible_and_serializable(tmp_path):
    first = run_fuzzy(seed=847291, frames=500, board_revisions=2)
    second = run_fuzzy(seed=847291, frames=500, board_revisions=2)
    assert first.report() == second.report()

    report = first.report()
    assert report["operations"]["FEN serializations"]["avoidable_calls"] == 498
    assert report["operations"]["BGR to Gray conversions"]["avoidable_calls"] == 500
    assert report["operations"]["Grid sweeps"]["avoidable_calls"] == 417
    assert report["operations"]["Legal move generations"]["avoidable_calls"] > 0

    path = first.write_json(tmp_path / "work.json")
    assert json.loads(path.read_text(encoding="utf-8"))["metadata"]["seed"] == 847291
    assert "Dominant avoidable call path:" in first.format_text()


def test_game_state_memoizes_fen_per_revision():
    from chesslab.state import GameState

    audit = WorkAudit()
    token = activate(audit)
    try:
        game = GameState()
        assert game.fen() == game.fen()
        game.push_uci("e2e4")
        assert game.fen() == game.fen()
    finally:
        deactivate(token)

    op = audit.report()["operations"]["FEN serializations"]
    assert (op["calls"], op["unique_keys"], op["avoidable_calls"]) == (2, 2, 0)


def test_frame_scan_reuses_the_gray_raster():
    import cv2
    import numpy as np

    from chesslab.framescan import cell_means
    from chesslab.work_audit import measure

    padded = np.zeros((160, 160, 3), np.uint8)
    audit = WorkAudit()
    token = activate(audit)
    try:
        with measure("BGR to Gray conversions", ("frame", 1), processed_bytes=padded.nbytes):
            gray = cv2.cvtColor(padded, cv2.COLOR_BGR2GRAY)
        assert len(cell_means(padded, 128, 16, gray=gray)) == 64
    finally:
        deactivate(token)

    op = audit.report()["operations"]["BGR to Gray conversions"]
    assert (op["calls"], op["avoidable_calls"]) == (1, 0)


def test_repeated_manifest_loads_are_visible_to_the_profiler(tmp_path):
    from chesslab.dataset import load_manifest

    manifest = tmp_path / "manifest.jsonl"
    manifest.write_text('{"path":"a.png","label":"empty"}\n', encoding="utf-8")
    audit = WorkAudit()
    token = activate(audit)
    try:
        load_manifest(manifest)
        load_manifest(manifest)
    finally:
        deactivate(token)

    op = audit.report()["operations"]["manifest loads"]
    assert (op["calls"], op["avoidable_calls"], op["avoidable_bytes"]) == (
        2, 1, manifest.stat().st_size)
