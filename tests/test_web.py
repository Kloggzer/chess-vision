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
    from chesslab.labeling import labels_to_fen

    labels = {f"{f}{r}": "empty" for r in range(1, 9) for f in "abcdefgh"}
    labels["e1"] = "wK"; labels["e8"] = "bK"; labels["a1"] = "wR"; labels["d4"] = "occluded"
    fen = labels_to_fen(labels)
    assert fen == "4k3/8/8/8/8/8/8/R3K3"          # d4 (occluded) bleibt leer
    import chess
    assert chess.Board(fen + " w - - 0 1").piece_at(chess.E1).symbol() == "K"


def test_draw_target_pieces_writes_names_for_dense_fen():
    """coverage-Overlay: ganze (auch ILLEGALE) Stellung als Figurennamen aufs Brett zeichnen."""
    from chesslab.web.util import _PIECE_NAMES_DE, _draw_target_pieces

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
    # Seit Rework 02 (harte Split-Validierung) wird ein degenerierter Split NICHT mehr
    # geschrieben — der 400-Text leitet stattdessen zur Datenaufnahme an.
    assert not (config.DATA.manifests / "split.json").exists()


def test_dataset_api_degenerate_guard(tmp_path, monkeypatch):
    """POST /api/datasets mit degenerierten Sessions -> 400, detail enthält Klassennamen.
    Mit allow_degenerate -> 200."""
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    from chesslab import config
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    config.DATA.manifests.mkdir(parents=True)
    config.DATA.squares.mkdir(parents=True)
    for cls in config.CLASSES:
        (config.DATA.squares / cls).mkdir(parents=True, exist_ok=True)

    # wQ nur in s1, wK in s1+s2
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
        # dritte Session, damit der sessionbasierte Split überhaupt zugeteilt werden kann
        # (mindestens-3-Sessions-Guard) und wirklich validate_split den Fehler liefert.
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

    # ohne allow_degenerate -> 400, kein Zombie-Datensatz auf Platte
    r = client.post("/api/datasets", json={"name": "deg", "session_ids": ["s1", "s2", "s3"]})
    assert r.status_code == 400
    assert "wQ" in r.json()["detail"]
    assert not (config.DATA.datasets / "deg").exists()

    # mit allow_degenerate -> 200, Fehler im Split dokumentiert
    r = client.post("/api/datasets", json={"name": "deg2", "session_ids": ["s1", "s2", "s3"],
                                           "allow_degenerate": True, "rotate": False})
    assert r.status_code == 200
    assert r.json()["counts"]["final"] == 6
    split = json.loads((config.DATA.datasets / "deg2" / "split.json").read_text(encoding="utf-8"))
    assert any("wQ" in e for e in split["degenerate_errors"])


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


def test_scan_upload_endpoint(tmp_path, monkeypatch):
    """POST /api/scan/upload accepts a mesh file + optional texture, writes .clean marker."""
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    monkeypatch.setattr("chesslab.web.routers.scan.SCANS_ROOT", tmp_path / "scans")
    monkeypatch.setattr("chesslab.web.scan.SCANS_ROOT", tmp_path / "scans")  # also patch the module-level ref
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
    assert data["clean"] is True
    assert (tmp_path / "scans" / "testK" / ".clean").exists()
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


def test_scan_models_includes_clean(tmp_path, monkeypatch):
    """GET /api/scan/models surfaces .clean marker for uploaded meshes."""
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    scans_dir = tmp_path / "scans"
    monkeypatch.setattr("chesslab.web.routers.scan.SCANS_ROOT", scans_dir)
    monkeypatch.setattr("chesslab.web.scan.SCANS_ROOT", scans_dir)

    d = scans_dir / "uploadedP"
    d.mkdir(parents=True)
    (d / "mesh_uploadedP.obj").write_text("obj")
    (d / "diffuse.png").write_text("tex")
    (d / ".clean").touch()

    d2 = scans_dir / "scannedQ"
    d2.mkdir(parents=True)
    (d2 / "mesh_scannedQ.obj").write_text("obj")
    (d2 / "tex.png").write_text("tex")
    # NO .clean marker

    from chesslab.web.app import create_app
    client = TestClient(create_app())
    r = client.get("/api/scan/models")
    assert r.status_code == 200
    scans = r.json()["scans"]
    by_dir = {s["dir"]: s for s in scans}
    assert by_dir["uploadedP"]["clean"] is True
    assert by_dir["scannedQ"]["clean"] is False


def test_scan_prepare_isolate_flag(tmp_path, monkeypatch):
    """POST /api/scan/prepare accepts isolate flag and passes it through."""
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    scans_dir = tmp_path / "scans"
    monkeypatch.setattr("chesslab.web.routers.scan.SCANS_ROOT", scans_dir)
    monkeypatch.setattr("chesslab.web.scan.SCANS_ROOT", scans_dir)
    # Also patch _repo_root so synth_pieces is in tmp_path
    monkeypatch.setattr("chesslab.web.routers.scan._repo_root", lambda: tmp_path)
    (tmp_path / "synth_pieces").mkdir(parents=True)


    d = scans_dir / "wP"
    d.mkdir(parents=True)
    (d / "mesh_wP.obj").write_text("obj")
    (d / "tex.png").write_text("tex")

    # We mock prepare_scan to check isolate was passed through
    captured_isolate = []
    def _fake_prepare(item, out_dir, *, isolate=True, **kw):
        captured_isolate.append(isolate)
        return {"piece": item.name, "verts": 100, "tris_before": 50, "tris_after": 50,
                "decimated": False, "target_tris": 20000, "smooth_iters": 10,
                "plane_eps": 0.1, "fill_holes": True, "plane_inliers": 0,
                "center_component_frac": 1.0, "piece_vertex_frac": 1.0,
                "scale_mm_per_unit": None, "plate_diameter_mm": None,
                "boundary_edges": 0, "nonmanifold_edges": 0,
                "dims": [1.0, 1.0, 1.0], "height_ratio": 1.0, "pattern_margin": 3.0}
    monkeypatch.setattr("chesslab.meshprep.prepare_scan", _fake_prepare)

    from chesslab.web.app import create_app
    client = TestClient(create_app())

    # isolate=true (default)
    r1 = client.post("/api/scan/prepare", json={"dir": "wP", "piece": "wP"})
    assert r1.status_code == 200
    assert captured_isolate[-1] is True

    # isolate=false
    r2 = client.post("/api/scan/prepare", json={"dir": "wP", "piece": "wP", "isolate": False})
    assert r2.status_code == 200
    assert captured_isolate[-1] is False


def test_crop_math_two_cubes_box_local():
    """Unit-check: two separated cubes, crop box around one → only that cube's faces remain,
    output in box-local coords (centroid at origin, axis-aligned)."""
    import trimesh

    from chesslab.web.routers.scan import _quat_to_matrix

    # Build two separated unit cubes: cube A centered at (0, 0, 0), cube B at (5, 0, 0)
    def make_cube(cx: float):
        v = np.array([
            [cx - 0.5, -0.5, -0.5], [cx + 0.5, -0.5, -0.5],
            [cx + 0.5,  0.5, -0.5], [cx - 0.5,  0.5, -0.5],
            [cx - 0.5, -0.5,  0.5], [cx + 0.5, -0.5,  0.5],
            [cx + 0.5,  0.5,  0.5], [cx - 0.5,  0.5,  0.5],
        ], dtype=np.float64)
        f = np.array([
            [0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6],
            [0, 4, 5], [0, 5, 1], [1, 5, 6], [1, 6, 2],
            [2, 6, 7], [2, 7, 3], [3, 7, 4], [3, 4, 0],
        ], dtype=np.int32)
        return trimesh.Trimesh(vertices=v, faces=f, process=False)

    a = make_cube(0)
    b = make_cube(5)
    merged = trimesh.util.concatenate([a, b])

    # Crop box: centered at (0, 0, 0), half-extents (0.6, 0.6, 0.6), no rotation
    center = np.array([0.0, 0.0, 0.0])
    half_ext = np.array([0.6, 0.6, 0.6])
    q = np.array([0.0, 0.0, 0.0, 1.0])  # identity quaternion
    R = _quat_to_matrix(q)

    # Verify identity matrix
    assert np.allclose(R, np.eye(3), atol=1e-10)

    vertices = np.asarray(merged.vertices, dtype=np.float64)
    local = (vertices - center) @ R

    face_local = local[merged.faces]
    face_centroids = face_local.mean(axis=1)
    inside = np.all(np.abs(face_centroids) <= half_ext, axis=1)
    kept_faces = merged.faces[inside]

    # Only cube A's 12 triangles should remain (cube B is at x=5, far outside 0.6)
    assert len(kept_faces) == 12, f"expected 12 faces from cube A, got {len(kept_faces)}"

    # Re-express in box-local coords
    kept_vert_idx = np.unique(kept_faces.flatten())
    old_to_new = {int(vi): ni for ni, vi in enumerate(kept_vert_idx)}
    new_faces = np.array([[old_to_new[vi] for vi in tri] for tri in kept_faces], dtype=np.int32)
    new_verts = local[kept_vert_idx]

    # Verify: all vertices are within half_ext in each axis
    assert np.all(np.abs(new_verts[:, 0]) <= half_ext[0] + 1e-10)
    assert np.all(np.abs(new_verts[:, 1]) <= half_ext[1] + 1e-10)
    assert np.all(np.abs(new_verts[:, 2]) <= half_ext[2] + 1e-10)

    # Verify: vertex coordinates match the original cube A (centered at origin) in box-local
    # Cube A vertices should be at ±0.5 in each axis
    assert np.allclose(np.abs(new_verts), 0.5, atol=1e-10)
    # Should have 8 unique vertices
    assert len(new_verts) == 8

    # Verify the centroid is at origin (since center=(0,0,0) and cube is centered)
    centroid = new_verts.mean(axis=0)
    assert np.allclose(centroid, [0, 0, 0], atol=1e-10)


def test_quat_to_matrix_orthogonal():
    """_quat_to_matrix produces orthonormal rotation matrices."""
    from chesslab.web.routers.scan import _quat_to_matrix

    # 90° rotation around Z axis
    angle = np.pi / 2
    q = np.array([0, 0, np.sin(angle / 2), np.cos(angle / 2)])  # [x, y, z, w]
    R = _quat_to_matrix(q)

    # R should be orthonormal: R^T @ R = I
    assert np.allclose(R.T @ R, np.eye(3), atol=1e-10)
    # det should be 1
    assert np.allclose(np.linalg.det(R), 1.0, atol=1e-10)

    # Applying R to [1, 0, 0] should give [0, 1, 0] (90° CCW around Z)
    v = R @ np.array([1.0, 0.0, 0.0])
    assert np.allclose(v, [0, 1, 0], atol=1e-10)
