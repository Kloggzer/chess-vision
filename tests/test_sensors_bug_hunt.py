"""Red tests for proven defects in the sensor half of chesslab."""

import json
from pathlib import Path

import cv2
import numpy as np

from chesslab import composite, config, hand_gate, ingest, position_flags, temporal_matte

FEN = "8/8/8/8/8/8/8/K6k w - - 0 1"


def test_gate_scan_removes_the_stored_board_border_used_only_for_crops(tmp_path, monkeypatch):
    rec = tmp_path / "recordings" / "g"
    (rec / "boards").mkdir(parents=True)
    board = np.zeros((12, 12, 3), np.uint8)
    board[2:10, 2:10] = 255
    cv2.imwrite(str(rec / "boards" / "000001.png"), board)
    (rec / "log.jsonl").write_text(json.dumps({
        "frame": "frames/000001.png", "board": "boards/000001.png", "board_border": 2,
    }) + "\n", encoding="utf-8")
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    monkeypatch.setattr("chesslab.realgames.game_dir", lambda _name: rec)
    monkeypatch.setattr(hand_gate, "load_gate", lambda _tag: (object(), {"size": 8,
                         "perfect_recall": {"thr": 0.5}}, "cpu"))
    seen = []

    def fake_forward(_model, _device, images, _batch):
        seen.extend(images)
        return [[0.0] * 65 for _ in images]

    monkeypatch.setattr(hand_gate, "_forward", fake_forward)

    hand_gate.gate_scan("g")

    assert seen and np.all(seen[0] == 255), (
        "gate training strips each row's board_border, but gate_scan calls read_gate with paths "
        "only; inference therefore resized the black crop padding into the model input"
    )


def test_position_report_does_not_call_an_unmatted_frame_provably_clear(tmp_path, monkeypatch):
    rec = tmp_path / "recordings" / "g"
    rec.mkdir(parents=True)
    (rec / "session.yaml").write_text("session_id: rg-g\n", encoding="utf-8")
    (rec / "log.jsonl").write_text("", encoding="utf-8")
    (rec / "matte.jsonl").write_text(
        json.dumps({"frame": "000002", "coverage": {"a1": 0.0}}) + "\n",
        encoding="utf-8",
    )
    entry = {
        "frame": "frames/000001.png", "fen": FEN, "ply": 1,
        "settle_left": ["a1"], "settle_dev": [50.0] * 64, "settle_seen": [1.0] * 64,
    }
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    monkeypatch.setattr(position_flags, "read_session_meta", lambda _rec: {"session_id": "rg-g"})
    monkeypatch.setattr(position_flags, "read_log", lambda _rec: [entry])
    monkeypatch.setattr(position_flags, "read_matte", lambda _rec: {"000002": {"a1": 0.0}})
    monkeypatch.setattr("chesslab.temporal_flags.load_flags",
                        lambda _rec, _sid, _entries, _matte: ([], False))

    result = position_flags.position_flags()
    rows = [json.loads(line) for line in Path(result["path"]).read_text(encoding="utf-8").splitlines()]

    assert not [row for row in rows if row.get("frame") == "000001"], (
        "the session has a matte file but frame 000001 has no matte row; position_flags passed "
        "an empty mapping to frame_flags and published cov=0.0, turning unknown coverage into "
        "a provably clear training/review decision"
    )


def test_ingest_group_sanitizing_cannot_merge_distinct_games(tmp_path):
    items = [
        ingest.ImportItem(tmp_path / "one.png", [], FEN, "round/1"),
        ingest.ImportItem(tmp_path / "two.png", [], FEN, "round?1"),
    ]

    session_ids = ingest.synthesize_sessions(
        items, tag="external", profile_name="p", paths=config.Paths(root=tmp_path)
    )

    assert len(session_ids) == 2, (
        "distinct source groups 'round/1' and 'round?1' both sanitize to 'round-1' and were "
        "silently merged into one session, defeating the per-session leakage boundary"
    )


def test_temporal_adopt_rejects_proposals_after_the_source_changed(tmp_path, monkeypatch):
    rec = tmp_path / "recordings" / "g"
    (rec / "mattes").mkdir(parents=True)
    (rec / "session.yaml").write_text("session_id: rg-g\nprofile: p\n", encoding="utf-8")
    (rec / "log.jsonl").write_text(json.dumps({
        "frame": "frames/000001.png", "ply": 1, "board": "boards/000001.webp",
    }) + "\n", encoding="utf-8")
    proposals = tmp_path / "reports" / "temporal-mattes" / "g" / "local"
    proposals.mkdir(parents=True)
    cv2.imwrite(str(proposals / "000001.alpha.png"), np.full((8, 8), 255, np.uint8))
    (proposals / "proposals.jsonl").write_text(json.dumps({
        "frame": "000001", "alpha": "000001.alpha.png", "fraction_above_half": 1.0,
    }) + "\n", encoding="utf-8")
    (proposals / "proposals.meta.json").write_text(json.dumps({
        "source": [["log.jsonl", 1, 1]], "training_alpha_updated": False,
    }), encoding="utf-8")
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda _name: object())
    monkeypatch.setattr("chesslab.matte.coverage_of",
                        lambda _alpha, _entry, _profile: {"a1": 1.0})

    try:
        temporal_matte.adopt_proposals("rg-g")
    except (RuntimeError, ValueError):
        return
    raise AssertionError(
        "propose_session records a source fingerprint, but temporal-adopt never reads it and "
        "adopted an alpha after geometry/labels/boards changed underneath the proposal"
    )


def test_composite_provenance_records_the_crop_padding_needed_for_recut(tmp_path, monkeypatch):
    prof = ingest.ingestion_profile("p", 320, (8, 8))
    captured = {}

    class Capture:
        def get(self, _key):
            return 1

        def release(self):
            pass

    def fake_boards(*_args, **_kwargs):
        crops = [np.zeros((8, 8, 3), np.uint8)] * 64
        yield 0, crops, dict.fromkeys(composite.all_squares(), 0.0), prof

    monkeypatch.setattr(cv2, "VideoCapture", lambda _path: Capture())
    monkeypatch.setattr(cv2, "imwrite", lambda *_args, **_kwargs: True)
    monkeypatch.setattr(composite, "composed_boards", fake_boards)
    monkeypatch.setattr(composite, "_replace_session_in_manifest", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(composite, "_write_provenance",
                        lambda _root, _clip, entry: captured.update(entry))

    composite.build_from_video(
        tmp_path / "video.mp4", tmp_path / "plates", tmp_path / "crops",
        tmp_path / "manifest.jsonl", FEN, clean=True, pad_side=0.2,
    )

    assert captured.get("pad_side") == 0.2, (
        "build_from_video generated crops with pad_side=0.2 but omitted that value from "
        "composite.json, so a later source recut cannot reproduce the original field of view"
    )


def test_composite_does_not_publish_manifest_rows_when_crop_encoding_fails(tmp_path, monkeypatch):
    prof = ingest.ingestion_profile("p", 320, (8, 8))

    class Capture:
        def get(self, _key):
            return 1

        def release(self):
            pass

    def fake_boards(*_args, **_kwargs):
        crops = [np.zeros((8, 8, 3), np.uint8)] * 64
        yield 0, crops, dict.fromkeys(composite.all_squares(), 0.0), prof

    monkeypatch.setattr(cv2, "VideoCapture", lambda _path: Capture())
    monkeypatch.setattr(cv2, "imwrite", lambda *_args, **_kwargs: False)
    monkeypatch.setattr(composite, "composed_boards", fake_boards)
    monkeypatch.setattr(composite, "_write_provenance", lambda *_args, **_kwargs: None)
    published = []
    monkeypatch.setattr(composite, "_replace_session_in_manifest",
                        lambda _path, _sid, rows, **_kwargs: published.extend(rows))

    try:
        composite.build_from_video(
            tmp_path / "video.mp4", tmp_path / "plates", tmp_path / "crops",
            tmp_path / "manifest.jsonl", FEN, clean=True,
        )
    except OSError:
        return
    raise AssertionError(
        f"all 64 cv2.imwrite calls returned false, but build_from_video published "
        f"{len(published)} manifest rows pointing at crop files that do not exist"
    )


def test_clean_composite_uses_a_per_frame_mesh_when_the_clip_fit_fails(monkeypatch):
    prof = ingest.ingestion_profile("p", 320, (8, 8))
    frame = np.zeros((32, 32, 3), np.uint8)
    corners = [[0, 0], [31, 0], [31, 31], [0, 31]]
    sentinel_mesh = object()
    captured = {}

    class Capture:
        def release(self):
            pass

    monkeypatch.setattr(cv2, "VideoCapture", lambda _path: Capture())
    monkeypatch.setattr(composite, "read_forward", lambda _video, _stride: iter([(0, frame)]))
    monkeypatch.setattr(composite, "median_mesh", lambda _cap, _profile: None)
    monkeypatch.setattr(composite, "mesh_for", lambda _frame, _corners, _profile: sentinel_mesh)
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda _name: prof)
    monkeypatch.setattr("chesslab.calibration.detect_board_corners_aruco", lambda _frame: corners)

    def fake_crops(_frame, _corners, _profile, **kwargs):
        captured["mesh"] = kwargs.get("mesh")
        return [np.zeros((8, 8, 3), np.uint8)] * 64

    monkeypatch.setattr(composite, "crops_for_frame", fake_crops)
    list(composite.composed_boards(Path("video.mp4"), None, board_size=320))

    assert captured["mesh"] is sentinel_mesh, (
        "when the clip-wide grid fit fails, occluded frames retry mesh_for inside "
        "composite_frame but clean frames silently cut at nominal eighths with mesh=None"
    )
