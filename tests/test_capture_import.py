"""Phase 01: ein Erfassungs-Buendel wird zu Brettern, und der Video-Index wird GERECHNET."""

import json
from pathlib import Path

import pytest

from chesslab import config
from chesslab.capture_import import import_capture, video_ns_at
from conftest import make_profile, write_jsonl

FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
#: Die wahren Brettecken im Testbild, und das grobe Quad, das das Buendel-Log statt dessen fuehrt
#: — der Grid-Fit muss es auf die Rillen zurueckziehen, sonst schneidet der Import daneben.
CORNERS = [[40, 40], [600, 40], [600, 440], [40, 440]]
COARSE = [[x + 4, y] for x, y in CORNERS]
BOARD_SIZE = 256
NS = 1_000_000_000
#: Die Geraeteuhr steht beim Videostart auf dieser Zahl — `elapsed_ns` ist nicht die Videozeit.
SYNC_BASE = 187_635_000_000_000
REFERENCE_LOG = Path("data/recordings/2026-09-06-21-29-35/log.jsonl")


def _profile(name="desktop"):
    from chesslab.calibration import (
        profile_path,
    )

    prof = make_profile(BOARD_SIZE, corners=CORNERS, frame_size=(640, 480), profile=name,
                        camera_index=-1, source="test")
    prof.save(profile_path(name))


def _board():
    """Ein Brett mit lesbaren Rillen — der Grid-Fit misst genau die 18 Linien, nichts sonst."""
    import numpy as np

    img = np.full((480, 640, 3), 170, np.uint8)
    (x0, y0), w, h = CORNERS[0], 560, 400
    for k in range(9):
        x, y = x0 + k * w // 8, y0 + k * h // 8
        img[y0 - 10:y0 + h + 10, x - 3:x + 3] = 30
        img[y - 3:y + 3, x0 - 10:x0 + w + 10] = 30
    return img


def _video(path, frames, fps):
    import cv2

    board = _board()
    w = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), fps, (640, 480))
    for _ in range(frames):
        w.write(board)
    w.release()


#: Drei Schritte, je einen Frame lang: das Ende eines Schritts ist der Beginn des naechsten,
#: der letzte hat keinen Nachfolger und bleibt damit ein einzelner Frame.
DEFAULT_STEPS = ((1, 1.0, None), (2, 1.0 + 1 / 30, None), (3, 1.0 + 2 / 30, None))


def _bundle(tmp_path, monkeypatch, *, steps=DEFAULT_STEPS, fps=30, frames=200,
            capture=True, timeline=True, syncs=True, drop_elapsed=None):
    """Eine Aufnahme mit Buendel: Log, `capture.json`, `timeline.jsonl`, Video, Kalibrierprofil.

    `steps` sind `(ply, Beginn in VIDEO-Sekunden, Ende oder None)`; die Geraeteuhr liegt um
    `SYNC_BASE` daneben, damit kein Test `elapsed_ns` versehentlich fuer die Videozeit haelt.
    """
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    _profile()
    bundle = config.DATA.recordings / "g" / "files" / "sessions" / "20260913-000000"
    bundle.mkdir(parents=True)
    bundle.joinpath("log.jsonl").write_text("".join(
        json.dumps({"frame": f"frames/{i:04d}.jpg", "ply": ply, "fen": FEN, "move_san": "d4",
                    "ts": "2026-09-13T10:00:00Z", "corners": COARSE}) + "\n"
        for i, (ply, _, _) in enumerate(steps)), encoding="utf-8")
    if capture:
        out = []
        for i, (ply, start, end) in enumerate(steps):
            step = {"ply": ply, "orientation_deg": 45 * i,
                    "elapsed_ns": SYNC_BASE + round(start * NS)}
            if end is not None:
                step["elapsed_ns_end"] = SYNC_BASE + round(end * NS)
            if drop_elapsed == i:
                del step["elapsed_ns"]
            out.append(step)
        bundle.joinpath("capture.json").write_text(
            json.dumps({"shot_id": "wq-light-sehr-hell", "height": "normal", "steps": out}),
            encoding="utf-8")
    if timeline:
        rows = [{"seq": k, "kind": "video_sync", "elapsedNs": SYNC_BASE + k * NS,
                 "durationNs": k * NS} for k in range(12)] if syncs else []
        rows.append({"seq": 99, "kind": "frame", "elapsedNs": SYNC_BASE})
        write_jsonl(bundle / "timeline.jsonl", rows)
    _video(bundle / "video.mp4", frames, fps)
    return bundle


def test_three_steps_make_three_boards_and_three_rows(tmp_path, monkeypatch):
    _bundle(tmp_path, monkeypatch)
    res = import_capture("g")

    session = res["session_dir"]
    assert len(res["rows"]) == 3
    assert sorted(p.name for p in (session / "boards").iterdir()) == \
        ["000030.webp", "000031.webp", "000032.webp"]
    assert len((session / "log.jsonl").read_text(encoding="utf-8").strip().splitlines()) == 3


def test_without_capture_json_it_refuses_and_writes_nothing(tmp_path, monkeypatch):
    _bundle(tmp_path, monkeypatch, capture=False)
    with pytest.raises(FileNotFoundError, match="capture.json"):
        import_capture("g")

    session = config.DATA.recordings / "g"
    assert not (session / "log.jsonl").exists() and not (session / "boards").exists()


def test_rows_carry_the_keys_of_an_exported_log(tmp_path, monkeypatch):
    """Nichts Eigenes: `slice` und alles danach duerfen keinen Unterschied sehen."""
    if not REFERENCE_LOG.is_file():
        pytest.skip(f"{REFERENCE_LOG} liegt nicht im Arbeitsbaum")
    known = set(json.loads(REFERENCE_LOG.read_text(encoding="utf-8").splitlines()[0]))
    _bundle(tmp_path, monkeypatch)
    res = import_capture("g")

    for row in res["rows"]:
        assert set(row) <= known, f"erfundene Schluessel: {set(row) - known}"
        assert {"frame", "ply", "fen", "corners", "board", "board_size", "board_border"} <= set(row)


def test_ply_is_carried_and_move_san_never_appears(tmp_path, monkeypatch):
    _bundle(tmp_path, monkeypatch)
    res = import_capture("g")

    assert sorted(r["ply"] for r in res["rows"]) == [1, 2, 3]
    for row in res["rows"]:
        assert "move_san" not in row and "moveSan" not in row


def test_the_frame_name_is_computed_from_the_device_clock(tmp_path, monkeypatch):
    """Die n-te Zeile ist NICHT der n-te Frame: 3,9 s Videozeit sind bei 30 fps Frame 117."""
    _bundle(tmp_path, monkeypatch, steps=[(1, 3.9, None)])
    res = import_capture("g")

    assert [r["frame"] for r in res["rows"]] == ["frames/000117.png"]
    assert [r["board"] for r in res["rows"]] == ["boards/000117.webp"]


def test_the_container_fps_decides_the_index(tmp_path, monkeypatch):
    """Dieselbe Videozeit liegt bei 15 fps auf einem anderen Frame — 30 anzunehmen verschoebe
    jeden Namen um den Faktor 2, und zwar lautlos."""
    _bundle(tmp_path, monkeypatch, steps=[(1, 3.9, None)], fps=15, frames=80)
    slow = import_capture("g")

    assert slow["fps"] == pytest.approx(15.0)
    assert [r["frame"] for r in slow["rows"]] == ["frames/000059.png"]


def test_an_unbelievable_fps_aborts(tmp_path, monkeypatch):
    from chesslab.capture_import import container_fps

    bundle = _bundle(tmp_path, monkeypatch)
    with pytest.raises(ValueError, match="Bildrate"):
        container_fps(bundle / "not-a-video.mp4")


def test_a_step_is_a_window_and_yields_several_rows(tmp_path, monkeypatch):
    """Ein Drehschritt ist statisch — jeder Frame im Fenster traegt dieselbe Stellung."""
    _bundle(tmp_path, monkeypatch, steps=[(7, 1.0, 1.0 + 4 / 30)])
    res = import_capture("g")

    assert [r["frame"] for r in res["rows"]] == [f"frames/{i:06d}.png" for i in range(30, 34)]
    assert {r["ply"] for r in res["rows"]} == {7}


@pytest.mark.parametrize("broken", [{"drop_elapsed": 1}, {"timeline": False}, {"syncs": False}])
def test_a_missing_link_to_the_video_aborts_and_writes_nothing(tmp_path, monkeypatch, broken):
    _bundle(tmp_path, monkeypatch, **broken)
    with pytest.raises((ValueError, FileNotFoundError)):
        import_capture("g")

    session = config.DATA.recordings / "g"
    assert not (session / "log.jsonl").exists() and not (session / "boards").exists()


def test_video_ns_at_matches_the_kotlin_reference():
    """Gegen `RecordedFrames.videoNsAt` (`android/desktop/.../RecordedFrames.kt:49`): NAECHSTER
    Anker plus verstrichene Systemzeit, Steigung 1. Zwischen den Ankern interpoliert laese 1700
    rund 353 statt 200 — genau die Schaetzung, die der Kotlin-Docstring verwirft."""
    syncs = [(1000, 10), (2000, 500), (5000, 900)]

    assert video_ns_at(500, syncs) == -490.0, "vor dem ersten Anker gilt der erste, Steigung 1"
    assert video_ns_at(1400, syncs) == 410.0, "naeher an 1000 als an 2000"
    assert video_ns_at(1700, syncs) == 200.0, "naeher an 2000 — rueckwaerts, nicht interpoliert"
    assert video_ns_at(2000, syncs) == 500.0, "genau auf dem Anker"
    assert video_ns_at(9000, syncs) == 4900.0, "hinter dem letzten Anker gilt der letzte"


def test_the_grid_fit_runs_before_the_boards_are_cut(tmp_path, monkeypatch):
    """Ohne ihn blieben die Ecken das grobe Quad, keine Zeile truege `grid_lines`, und ohne die
    findet `meshes_for_boards` nichts — jedes Brett kaeme gebogen heraus."""
    from chesslab.realgames.boards import FIT_SOURCE

    _bundle(tmp_path, monkeypatch)
    res = import_capture("g")

    assert res["fit"][FIT_SOURCE] == 3 and res["no_mesh"] == 0
    for row in res["rows"]:
        assert row["grid_lines"]["x"] and row["grid_lines"]["y"]
        assert row["board_straightened"] is True
        assert row["corners"] != COARSE, "das ArUco-Quad darf nicht stehenbleiben"


def test_a_second_run_overwrites_cleanly(tmp_path, monkeypatch):
    _bundle(tmp_path, monkeypatch)
    first = (import_capture("g")["session_dir"] / "log.jsonl").read_text(encoding="utf-8")
    session = import_capture("g")["session_dir"]

    assert (session / "log.jsonl").read_text(encoding="utf-8") == first
    assert len(list((session / "boards").iterdir())) == 3
