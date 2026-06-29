"""Web/relabel tests — corrections store, slice label-override, and (optional) /api/stats."""

import json

import chess
import cv2
import numpy as np
import pytest
import yaml

from chesslab.calibration import CalibrationProfile, CropParams, compute_homography
from chesslab.labeling import load_corrections, slice_session, upsert_corrections


def test_labels_to_fen_estimation():
    """Inference-Overlay: 64 Per-Feld-Labels -> FEN-Stellungsteil (occluded zählt als leer)."""
    from chesslab.web.app import _labels_to_fen

    labels = {f"{f}{r}": "empty" for r in range(1, 9) for f in "abcdefgh"}
    labels["e1"] = "wK"; labels["e8"] = "bK"; labels["a1"] = "wR"; labels["d4"] = "occluded"
    fen = _labels_to_fen(labels)
    assert fen == "4k3/8/8/8/8/8/8/R3K3"          # d4 (occluded) bleibt leer
    import chess
    assert chess.Board(fen + " w - - 0 1").piece_at(chess.E1).symbol() == "K"


def test_draw_target_pieces_writes_names_for_dense_fen():
    """coverage-Overlay: ganze (auch ILLEGALE) Stellung als Figurennamen aufs Brett zeichnen."""
    from chesslab.web.app import _PIECE_NAMES_DE, _draw_target_pieces

    bs = 800
    corners = [[0, 0], [bs, 0], [bs, bs], [0, bs]]
    prof = CalibrationProfile(profile="t", camera_index=0, frame_size=(bs, bs), board_size=bs,
                              image_corners=corners, homography=compute_homography(corners, bs),
                              white_pov=True, crop=CropParams.default(bs))
    img = np.zeros((bs, bs, 3), dtype=np.uint8)
    # bewusst illegale, dichte Stellung (3 weiße Damen) — der Klassifikator braucht keine Legalität
    _draw_target_pieces(img, prof, "QQQ5/8/8/8/8/8/8/8 w - - 0 1")
    assert img.any()                                  # es wurde tatsächlich etwas gezeichnet
    assert _PIECE_NAMES_DE["Q"] == "Dame"


def test_manual_capture_explicit_labels_produce_entries(tmp_path):
    """Manuell-Labeln: frei platzierte Figuren werden per expliziter Per-Feld-Labels gesliced
    (keine FEN nötig); nicht markierte Felder werden empty."""
    from chesslab.collect import SessionWriter

    bs = 800
    corners = [[0, 0], [bs, 0], [bs, bs], [0, bs]]
    prof = CalibrationProfile(profile="t", camera_index=0, frame_size=(bs, bs), board_size=bs,
                              image_corners=corners, homography=compute_homography(corners, bs),
                              white_pov=True, crop=CropParams.default(bs))
    frame = np.full((bs, bs, 3), 255, dtype=np.uint8)
    sdir = tmp_path / "sessions" / "man1"
    w = SessionWriter(sdir, session_id="man1", profile="t", mode="manual",
                      camera_index=0, frame_size=(bs, bs), notes="manual")
    # corners mitgeben -> slice warpt daraus (kein Marker-Detect nötig); occluded geht hier mit
    w.capture(frame, ply=0, fen="8/8/8/8/8/8/8/8 w - - 0 1", corners=corners,
              labels={"e4": "wB", "d5": "bN", "h1": "occluded"})
    w.close()

    manifest = tmp_path / "m.jsonl"
    stats = slice_session(sdir, profile=prof, manifest_path=manifest, squares_root=tmp_path / "sq")
    rows = [json.loads(l) for l in manifest.read_text(encoding="utf-8").splitlines() if l.strip()]
    by_sq = {r["square"]: r["label"] for r in rows}
    assert len(rows) == 64
    assert by_sq["e4"] == "wB" and by_sq["d5"] == "bN" and by_sq["h1"] == "occluded"
    assert by_sq["a1"] == "empty"                      # nicht markiert -> leer
    assert sum(1 for v in by_sq.values() if v == "empty") == 61


def test_corrections_upsert_last_wins(tmp_path):
    p = tmp_path / "corr.jsonl"
    upsert_corrections([{"session_id": "s1", "frame": "0000", "square": "e2", "label": "empty"}], p)
    upsert_corrections([
        {"session_id": "s1", "frame": "0000", "square": "e2", "label": "wN"},   # overwrite
        {"session_id": "s1", "frame": "0001", "square": "a1", "label": "bK"},
    ], p)
    c = load_corrections(p)
    assert c[("s1", "0000", "e2")] == "wN"      # last write wins
    assert c[("s1", "0001", "a1")] == "bK"
    assert len(c) == 2


def _identity_session(tmp_path, bs=800):
    corners = [[0, 0], [bs, 0], [bs, bs], [0, bs]]
    prof = CalibrationProfile(profile="t", camera_index=0, frame_size=(bs, bs), board_size=bs,
                              image_corners=corners, homography=compute_homography(corners, bs),
                              white_pov=True, crop=CropParams.default(bs))
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
    overrides = {("s1", "0000", "e2"): "empty"}   # e2 is wP at start; correct it to empty
    stats = slice_session(sdir, profile=prof, manifest_path=manifest, squares_root=squares,
                          label_overrides=overrides)
    assert stats["overrides"] == 1
    rows = [json.loads(l) for l in manifest.read_text(encoding="utf-8").splitlines() if l.strip()]
    e2 = next(r for r in rows if r["square"] == "e2")
    assert e2["label"] == "empty"
    assert (squares / "empty" / "s1_0000_e2.png").exists()
    # a non-overridden square keeps its FEN label
    assert next(r for r in rows if r["square"] == "e1")["label"] == "wK"


def test_api_stats_endpoint(tmp_path, monkeypatch):
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    from chesslab import config
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    config.DATA.manifests.mkdir(parents=True)
    row = {"path": "data/squares/wK/x.png", "label": "wK", "session_id": "s1", "frame": "0000",
           "ply": 0, "square": "e1", "square_color": "dark", "fen": "x", "out_size": [96, 128], "ts": "t"}
    (config.DATA.manifests / "squares.jsonl").write_text(json.dumps(row) + "\n", encoding="utf-8")

    from chesslab.web.app import create_app
    client = TestClient(create_app())
    r = client.get("/api/stats").json()
    assert r["total"] == 1
    assert r["counts"]["wK"] == 1
    assert r["counts"]["empty"] == 0


def test_train_guards_too_few_sessions(tmp_path, monkeypatch):
    """/api/train must auto-create the split and refuse with a clear message instead of
    crashing on a missing split.json or launching a doomed run from a single session."""
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    from chesslab import config
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    config.DATA.manifests.mkdir(parents=True)

    from chesslab.web.app import create_app
    client = TestClient(create_app())

    # No manifest at all -> guided 400, no crash.
    r = client.post("/api/train", json={})
    assert r.status_code == 400
    assert "Datensatz" in r.json()["detail"]

    # One session only -> per-session split yields an empty train set -> clear 400.
    rows = [{"path": f"data/squares/{lab}/x{i}.png", "label": lab, "session_id": "s1",
             "frame": "0000", "ply": 0, "square": "e1", "square_color": "dark", "fen": "x",
             "out_size": [96, 128], "ts": "t"} for i, lab in enumerate(["wK", "bK", "empty"])]
    (config.DATA.manifests / "squares.jsonl").write_text(
        "\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    r = client.post("/api/train", json={})
    assert r.status_code == 400
    assert "Sessions" in r.json()["detail"]
    assert (config.DATA.manifests / "split.json").exists()  # split was auto-created


def test_calibrate_endpoints_no_camera(tmp_path, monkeypatch):
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    import cv2
    from fastapi.testclient import TestClient

    from chesslab import config
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    from chesslab.web.app import create_app
    client = TestClient(create_app())

    # margin update
    assert client.post("/api/calibrate/margin", json={"margin": 0.09}).json()["margin"] == 0.09
    # marker sheet generation (no camera needed) -> served under /img
    url = client.post("/api/calibrate/markers").json()["url"]
    assert url.startswith("/img/")
    assert cv2.imread(str(config.DATA.calibration / "markers.png")) is not None
    # camera status without an open camera
    assert client.get("/api/camera/status").json()["open"] is False
