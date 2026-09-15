"""Label corrections and the label-override path `slice` reads.

These lived in `test_web.py` and are not web tests: `load_corrections` is read by
`labeling.slice_session`, and the override is what lets a human label beat the
FEN for one square. They were rescued when the web UI was deleted.

The WRITE side is gone with it: no Python writes the file any more (`docs/data-pipeline.md`), so
the format is readable and currently unwritable. That is a gap for the new UI to close.
"""

import json

import chess
import cv2
import numpy as np
import yaml

from chesslab.labeling import CROP_SUFFIX, slice_session
from conftest import identity_corners, make_profile


def test_labels_to_fen_estimation():
    """Inference overlay: 64 per-square labels -> FEN position part (occluded counts as empty)."""
    from chesslab.labeling import labels_to_fen

    labels = {f"{f}{r}": "empty" for r in range(1, 9) for f in "abcdefgh"}
    labels["e1"] = "wK"; labels["e8"] = "bK"; labels["a1"] = "wR"; labels["d4"] = "occluded"
    fen = labels_to_fen(labels)
    assert fen == "4k3/8/8/8/8/8/8/R3K3"          # d4 (occluded) stays empty
    import chess
    assert chess.Board(fen + " w - - 0 1").piece_at(chess.E1).symbol() == "K"


def test_manual_capture_explicit_labels_produce_entries(tmp_path):
    """Manual labeling: freely placed pieces are sliced via explicit per-square labels
    (no FEN needed); unmarked squares become empty."""
    from chesslab.session_writer import SessionWriter

    bs = 800
    corners = identity_corners(bs)
    prof = make_profile(bs, profile="t")
    frame = np.full((bs, bs, 3), 255, dtype=np.uint8)
    sdir = tmp_path / "sessions" / "man1"
    w = SessionWriter(sdir, session_id="man1", profile="t", mode="manual",
                      camera_index=0, frame_size=(bs, bs), notes="manual")
    # supply corners -> slice warps from them (no marker detect needed); occluded works here
    w.capture(frame, ply=0, fen="8/8/8/8/8/8/8/8 w - - 0 1", corners=corners,
              labels={"e4": "wB", "d5": "bN", "h1": "occluded"})
    w.close()

    manifest = tmp_path / "m.jsonl"
    slice_session(sdir, profile=prof, manifest_path=manifest, squares_root=tmp_path / "sq")
    rows = [json.loads(line) for line in manifest.read_text(encoding="utf-8").splitlines() if line.strip()]
    by_sq = {r["square"]: r["label"] for r in rows}
    assert len(rows) == 64
    assert by_sq["e4"] == "wB" and by_sq["d5"] == "bN" and by_sq["h1"] == "occluded"
    assert by_sq["a1"] == "empty"                      # not marked -> empty
    assert sum(1 for v in by_sq.values() if v == "empty") == 61


def _identity_session(tmp_path, bs=800):
    prof = make_profile(bs, profile="t")
    d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    frame = np.full((bs, bs, 3), 255, dtype=np.uint8)
    s, off = 80, 80
    for mid, (cx, cy) in {0: (off, off), 1: (bs - off, off), 2: (bs - off, bs - off), 3: (off, bs - off)}.items():
        m = cv2.cvtColor(cv2.aruco.generateImageMarker(d, mid, s), cv2.COLOR_GRAY2BGR)
        frame[cy - s // 2:cy + s // 2, cx - s // 2:cx + s // 2] = m
    sdir = tmp_path / "sessions" / "s1"
    (sdir / "frames").mkdir(parents=True)
    cv2.imwrite(str(sdir / "frames" / "0000.png"), frame)
    (sdir / "log.jsonl").write_text(
        json.dumps({"frame": "frames/0000.png", "ply": 0, "fen": chess.Board().fen()}) + "\n", encoding="utf-8")
    (sdir / "session.yaml").write_text(yaml.safe_dump(
        {"session_id": "s1", "profile": "t", "mode": "live", "created_at": "t",
         "camera_index": 0, "frame_size": [bs, bs]}), encoding="utf-8")
    return sdir, prof


def test_slice_applies_label_override(tmp_path):
    sdir, prof = _identity_session(tmp_path)
    manifest = tmp_path / "m.jsonl"
    squares = tmp_path / "sq"
    # e2 is wP at start; the session's own ledger corrects it to empty
    (sdir / "corrections.jsonl").write_text(
        json.dumps({"session_id": "s1", "frame": "0000", "square": "e2", "label": "empty"}) + "\n",
        encoding="utf-8")
    stats = slice_session(sdir, profile=prof, manifest_path=manifest, squares_root=squares)
    assert stats["overrides"] == 1
    rows = [json.loads(line) for line in manifest.read_text(encoding="utf-8").splitlines() if line.strip()]
    e2 = next(r for r in rows if r["square"] == "e2")
    assert e2["label"] == "empty"
    assert (squares / "empty" / f"s1_0000_e2{CROP_SUFFIX}").exists()
    # a non-overridden square keeps its FEN label
    assert next(r for r in rows if r["square"] == "e1")["label"] == "wK"
