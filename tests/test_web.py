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
    """Inference overlay: 64 per-square labels -> FEN position part (occluded counts as empty)."""
    from chesslab.labeling import labels_to_fen

    labels = {f"{f}{r}": "empty" for r in range(1, 9) for f in "abcdefgh"}
    labels["e1"] = "wK"; labels["e8"] = "bK"; labels["a1"] = "wR"; labels["d4"] = "occluded"
    fen = labels_to_fen(labels)
    assert fen == "4k3/8/8/8/8/8/8/R3K3"          # d4 (occluded) stays empty
    import chess
    assert chess.Board(fen + " w - - 0 1").piece_at(chess.E1).symbol() == "K"


def test_draw_target_pieces_writes_names_for_dense_fen():
    """coverage overlay: whole (even ILLEGAL) position drawn as piece names on the board."""
    from chesslab.web.util import _PIECE_NAMES_DE, _draw_target_pieces

    bs = 800
    corners = [[0, 0], [bs, 0], [bs, bs], [0, bs]]
    prof = CalibrationProfile(profile="t", camera_index=0, frame_size=(bs, bs), board_size=bs,
                              image_corners=corners, homography=compute_homography(corners, bs),
                              white_pov=True, crop=CropParams.default(bs))
    img = np.zeros((bs, bs, 3), dtype=np.uint8)
    # deliberately illegal, dense position (3 white queens) — the classifier needs no legality
    _draw_target_pieces(img, prof, "QQQ5/8/8/8/8/8/8/8 w - - 0 1")
    assert img.any()                                  # something was actually drawn
    assert _PIECE_NAMES_DE["Q"] == "Dame"


def test_manual_capture_explicit_labels_produce_entries(tmp_path):
    """Manual labeling: freely placed pieces are sliced via explicit per-square labels
    (no FEN needed); unmarked squares become empty."""
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
    rows = [json.loads(line) for line in manifest.read_text(encoding="utf-8").splitlines() if line.strip()]
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


def test_session_review_endpoints_show_frame_and_board(tmp_path, monkeypatch):
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    from chesslab import config
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = config.DATA.sessions / "review1"
    (sdir / "frames").mkdir(parents=True)
    bs = 96
    corners = [[0, 0], [bs, 0], [bs, bs], [0, bs]]
    prof = CalibrationProfile(profile="t", camera_index=0, frame_size=(bs, bs), board_size=bs,
                              image_corners=corners, homography=compute_homography(corners, bs),
                              white_pov=True, crop=CropParams.default(bs))
    config.DATA.calibration.mkdir(parents=True)
    prof.save(config.DATA.calibration / "t.yaml")
    frame = np.full((bs, bs, 3), 180, dtype=np.uint8)
    cv2.imwrite(str(sdir / "frames" / "0000.png"), frame)
    (sdir / "log.jsonl").write_text(
        json.dumps({
            "frame": "frames/0000.png",
            "ply": 0,
            "fen": chess.Board().fen(),
            "move_san": None,
            "corners": corners,
        }) + "\n",
        encoding="utf-8",
    )
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "review1", "profile": "t", "mode": "play"}),
        encoding="utf-8",
    )

    from chesslab.web.app import create_app
    client = TestClient(create_app())
    details = client.get("/api/sessions/review1/review?idx=99")
    assert details.status_code == 200
    body = details.json()
    assert body["index"] == 0
    assert body["count"] == 1
    assert body["entry"]["fen"] == chess.Board().fen()
    assert body["overlay_available"] is True

    real = client.get(body["frame_url"])
    assert real.status_code == 200
    assert real.headers["content-type"].startswith("image/png")
    overlay = client.get(body["overlay_url"])
    assert overlay.status_code == 200
    assert overlay.headers["content-type"].startswith("image/jpeg")
    board = client.get(body["board_url"])
    assert board.status_code == 200
    assert board.headers["content-type"].startswith("image/svg+xml")
    assert b"<svg" in board.content


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
    assert "dataset" in r.json()["detail"]

    # One session only -> per-session split yields an empty train set -> clear 400.
    rows = [{"path": f"data/squares/{lab}/x{i}.png", "label": lab, "session_id": "s1",
             "frame": "0000", "ply": 0, "square": "e1", "square_color": "dark", "fen": "x",
             "out_size": [96, 128], "ts": "t"} for i, lab in enumerate(["wK", "bK", "empty"])]
    (config.DATA.manifests / "squares.jsonl").write_text(
        "\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    r = client.post("/api/train", json={})
    assert r.status_code == 400
    assert "sessions" in r.json()["detail"]
    # Since Rework 02 (hard split validation) a degenerate split is NO longer
    # written — the 400 text instead guides toward data collection.
    assert not (config.DATA.manifests / "split.json").exists()


def test_dataset_api_degenerate_guard(tmp_path, monkeypatch):
    """POST /api/datasets with degenerate sessions -> 400, detail contains class names.
    With allow_degenerate -> 200."""
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    from chesslab import config
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    config.DATA.manifests.mkdir(parents=True)
    config.DATA.squares.mkdir(parents=True)
    for cls in config.CLASSES:
        (config.DATA.squares / cls).mkdir(parents=True, exist_ok=True)

    # wQ only in s1, wK in s1+s2
    rows = [
        {"path": (config.DATA.squares / "wQ" / "x.png").as_posix(), "label": "wQ",
         "session_id": "s1", "frame": "0000", "ply": 0, "square": "d1",
         "square_color": "dark", "fen": "x", "out_size": [96, 128], "ts": "t"},
        {"path": (config.DATA.squares / "wK" / "x.png").as_posix(), "label": "wK",
         "session_id": "s1", "frame": "0000", "ply": 0, "square": "e1",
         "square_color": "dark", "fen": "x", "out_size": [96, 128], "ts": "t"},
        {"path": (config.DATA.squares / "wK" / "x.png").as_posix(), "label": "wK",
         "session_id": "s2", "frame": "0000", "ply": 0, "square": "e1",
         "square_color": "dark", "fen": "x", "out_size": [96, 128], "ts": "t"},
        {"path": (config.DATA.squares / "empty" / "x.png").as_posix(), "label": "empty",
         "session_id": "s2", "frame": "0000", "ply": 0, "square": "c4",
         "square_color": "light", "fen": "x", "out_size": [96, 128], "ts": "t"},
        # third session so the session-based split can actually be assigned
        # (minimum-3-sessions guard) and validate_split really produces the error.
        {"path": (config.DATA.squares / "wK" / "x.png").as_posix(), "label": "wK",
         "session_id": "s3", "frame": "0000", "ply": 0, "square": "e1",
         "square_color": "dark", "fen": "x", "out_size": [96, 128], "ts": "t"},
        {"path": (config.DATA.squares / "empty" / "x.png").as_posix(), "label": "empty",
         "session_id": "s3", "frame": "0000", "ply": 0, "square": "c5",
         "square_color": "dark", "fen": "x", "out_size": [96, 128], "ts": "t"},
    ]
    import json

    import cv2
    import numpy as np
    for r in rows:
        cv2.imwrite(r["path"], np.zeros((128, 96, 3), dtype=np.uint8))
    (config.DATA.manifests / "squares.jsonl").write_text(
        "\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")

    from chesslab.web.app import create_app
    client = TestClient(create_app())

    # ohne allow_degenerate -> 400, no zombie dataset on disk
    r = client.post("/api/datasets", json={"name": "deg", "session_ids": ["s1", "s2", "s3"]})
    assert r.status_code == 400
    assert "wQ" in r.json()["detail"]
    assert not (config.DATA.datasets / "deg").exists()

    # with allow_degenerate -> 200, error documented in split
    r = client.post("/api/datasets", json={"name": "deg2", "session_ids": ["s1", "s2", "s3"],
                                           "allow_degenerate": True, "rotate": False})
    assert r.status_code == 200
    assert r.json()["counts"]["final"] == 6
    split = json.loads((config.DATA.datasets / "deg2" / "split.json").read_text(encoding="utf-8"))
    assert any("wQ" in e for e in split["degenerate_errors"])


def test_scan_upload_endpoint(tmp_path, monkeypatch):
    """POST /api/scan/upload accepts a mesh file + optional texture."""
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    monkeypatch.setattr("chesslab.web.routers.scan.SCANS_ROOT", tmp_path / "scans")
    from chesslab.web.app import create_app
    client = TestClient(create_app())

    # Valid upload
    r = client.post("/api/scan/upload", data={"name": "testK"},
                    files={"mesh": ("test.obj", b"fake mesh data", "application/octet-stream")})
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert data["dir"] == "testK"
    assert data["mesh"] == "mesh_testK.obj"
    assert (tmp_path / "scans" / "testK" / "mesh_testK.obj").exists()

    # With texture
    r2 = client.post("/api/scan/upload", data={"name": "testQ"},
                     files={"mesh": ("test.glb", b"glb", "application/octet-stream"),
                            "texture": ("tex.png", b"png", "image/png")})
    assert r2.status_code == 200
    assert r2.json()["texture"] == "mesh_testQ_diffuse.png"
    assert (tmp_path / "scans" / "testQ" / "mesh_testQ_diffuse.png").exists()

    # Invalid name (special chars)
    r3 = client.post("/api/scan/upload", data={"name": "bad/name"},
                     files={"mesh": ("x.obj", b"x", "application/octet-stream")})
    assert r3.status_code == 400

    # Invalid extension
    r4 = client.post("/api/scan/upload", data={"name": "bad"},
                     files={"mesh": ("x.stl", b"x", "application/octet-stream")})
    assert r4.status_code == 400

    # Missing mesh
    r5 = client.post("/api/scan/upload", data={"name": "bad"})
    assert r5.status_code == 422  # FastAPI validation error


def test_scan_models_lists_scans(tmp_path, monkeypatch):
    """GET /api/scan/models lists scan directories with meshes."""
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    scans_dir = tmp_path / "scans"
    monkeypatch.setattr("chesslab.web.routers.scan.SCANS_ROOT", scans_dir)

    d = scans_dir / "wP"
    d.mkdir(parents=True)
    (d / "mesh_wP.obj").write_text("obj")
    (d / "diffuse.png").write_text("tex")

    d2 = scans_dir / "wQ"
    d2.mkdir(parents=True)
    (d2 / "mesh_wQ.obj").write_text("obj")
    (d2 / "tex.png").write_text("tex")

    from chesslab.web.app import create_app
    client = TestClient(create_app())
    r = client.get("/api/scan/models")
    assert r.status_code == 200
    scans = r.json()["scans"]
    by_dir = {s["dir"]: s for s in scans}
    assert "wP" in by_dir
    assert "wQ" in by_dir


def test_scan_prepare_endpoint(tmp_path, monkeypatch):
    """POST /api/scan/prepare starts a background preparation."""
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    scans_dir = tmp_path / "scans"
    monkeypatch.setattr("chesslab.web.routers.scan.SCANS_ROOT", scans_dir)
    monkeypatch.setattr("chesslab.web.routers.scan._repo_root", lambda: tmp_path)
    (tmp_path / "synth_pieces").mkdir(parents=True)

    d = scans_dir / "wP"
    d.mkdir(parents=True)
    (d / "mesh_wP.obj").write_text("obj")
    (d / "tex.png").write_text("tex")

    # Mock prepare_scan
    def _fake_prepare(item, out_dir, *, target_tris=20000, fill_holes=True,
                      smooth_iters=10, make_preview=True, seed=42):
        return {"piece": item.name, "verts": 100, "tris_before": 100, "tris_after": 50,
                "decimated": True, "target_tris": 20000, "smooth_iters": 10,
                "fill_holes": True, "center_component_frac": 1.0,
                "boundary_edges": 0, "nonmanifold_edges": 0,
                "dims": [1.0, 1.0, 1.0], "height_ratio": 1.0}
    monkeypatch.setattr("chesslab.meshprep.prepare_scan", _fake_prepare)

    from chesslab.web.app import create_app
    client = TestClient(create_app())

    r = client.post("/api/scan/prepare", json={"dir": "wP", "piece": "wP2"})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["piece"] == "wP" and body["variant"] == "v2"
    # Provenance .src is written into the piece folder under the variant stem.
    assert (tmp_path / "synth_pieces" / "wP" / "v2.src").read_text() == "wP"


def test_scan_models_and_files_variant_aware(tmp_path, monkeypatch):
    """models/preview/obj/delete address pieces by <piece>/<variant>."""
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    monkeypatch.setattr("chesslab.web.routers.scan.SCANS_ROOT", tmp_path / "scans")
    monkeypatch.setattr("chesslab.web.routers.scan._repo_root", lambda: tmp_path)
    piece_dir = tmp_path / "synth_pieces" / "wP"
    piece_dir.mkdir(parents=True)
    (piece_dir / "v1.obj").write_text("obj-bytes")
    (piece_dir / "v1.png").write_text("tex")
    (piece_dir / "v1_preview.png").write_text("prev")
    (piece_dir / "v1_report.json").write_text('{"piece": "wP", "variant": "v1", "verts": 5000}')
    (piece_dir / "v1.src").write_text("pawn_scan")

    from chesslab.web.app import create_app
    client = TestClient(create_app())

    pieces = client.get("/api/scan/models").json()["pieces"]
    entry = next(p for p in pieces if p["id"] == "wP/v1")
    assert entry["piece"] == "wP" and entry["variant"] == "v1"
    assert entry["source_dir"] == "pawn_scan" and entry["has_preview"] is True

    assert client.get("/api/scan/model/wP/v1.obj").text == "obj-bytes"
    assert client.get("/api/scan/prepare/preview/wP/v1").status_code == 200
    assert client.get("/api/scan/prepare/preview/wP/v1?kind=clay").status_code == 204

    r = client.delete("/api/scan/piece/wP/v1")
    assert r.status_code == 200 and "v1.obj" in r.json()["removed"]
    assert not piece_dir.exists()  # empty folder pruned
