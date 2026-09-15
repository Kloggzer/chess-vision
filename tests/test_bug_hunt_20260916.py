"""Funde der Bug-Jagd vom 2026-09-16 — je Fund ein roter Test, der Fix steht aus."""

import json
from dataclasses import replace

import cv2
import numpy as np
import pytest
import yaml

from chesslab.calibration import CropParams, compute_homography
from conftest import make_profile

FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def _slice_profile(corners):
    prof = make_profile(128, corners=corners, profile="p", out_size=(32, 32))
    return replace(prof, frame_size=(320, 240), board_size=128, image_corners=corners,
                   homography=compute_homography(corners, 128, 0.0),
                   crop=CropParams(cell=16.0, pad_side=0.05, out_size=(32, 32)), margin=0.0)


def test_a_corrected_cell_on_a_skipped_frame_gets_no_invented_coverage(tmp_path, monkeypatch):
    """SAM hat diesen Frame NIE gemessen (`skipped`), der Crop geht trotzdem mit 0.0 ins Training."""
    from chesslab import config
    from chesslab.labeling import slice_session

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = tmp_path / "data" / "sessions" / "s1"
    (sdir / "frames").mkdir(parents=True)
    corners = [[20, 20], [300, 20], [300, 220], [20, 220]]
    for stem in ("000001", "000002"):
        cv2.imwrite(str(sdir / "frames" / f"{stem}.png"), np.full((240, 320, 3), 128, np.uint8))
    (sdir / "log.jsonl").write_text(
        json.dumps({"frame": "frames/000001.png", "fen": FEN, "ply": 1, "corners": corners}) + "\n"
        + json.dumps({"frame": "frames/000002.png", "fen": FEN, "ply": 2, "corners": corners,
                      "dirty": True, "dirty_reason": "occluded"}) + "\n", encoding="utf-8")
    (sdir / "session.yaml").write_text(
        yaml.safe_dump({"session_id": "s1", "profile": "p", "mode": "track"}), encoding="utf-8")
    (sdir / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "coverage": {"a8": 0.12}}) + "\n"
        + json.dumps({"frame": "000002", "skipped": "zone too big"}) + "\n", encoding="utf-8")
    (sdir / "corrections.jsonl").write_text(
        json.dumps({"session_id": "s1", "frame": "000002", "square": "d4", "label": "wP"}) + "\n",
        encoding="utf-8")

    slice_session(sdir, profile=_slice_profile(corners), manifest_path=tmp_path / "m.jsonl",
                  squares_root=tmp_path / "squares", out_size=(32, 32))
    rows = [json.loads(line) for line in
            (tmp_path / "m.jsonl").read_text(encoding="utf-8").splitlines()]
    corrected = [r for r in rows if r["frame"] == "000002" and r["square"] == "d4"]
    assert corrected, "die Korrektur muss die Zelle eines dirty-Frames freigeben"
    assert corrected[0].get("coverage") is None, (
        "SAM hat diesen Frame uebersprungen — eine gemessene 0.0 ist erfunden")


def test_timing_flags_do_not_report_an_unmeasured_cell_as_matte_free():
    """`frame_flags` schreibt None, wenn keine Matte da ist — `timing_flags` schreibt 0.0."""
    from chesslab.position_flags import timing_flags

    entries = [{"frame": "frames/000005.png", "fen": FEN, "ply": 1}]
    intervals = [{"ply": 1, "moved": ["e2"], "dev": 9.0, "seen": True}]
    rows = timing_flags(entries, intervals, {}, "s1")
    assert rows, "die bewegten Felder muessen eine Karte bekommen"
    assert rows[0]["matte_cov"] is None, "ohne Matte ist die Coverage ungemessen, nicht 0.0"


@pytest.mark.xfail(reason="_frame_count macht aus einem unlesbaren Container 0 Frames",
                   strict=True)
def test_an_unreadable_segment_is_not_counted_as_zero_frames(tmp_path):
    """`_locate` addiert diese 0 auf `base` — jeder spaetere Frame-Index zeigt auf die falsche Zeile."""
    from chesslab.recording import _frame_count

    broken = tmp_path / "video-001.mp4"
    broken.write_bytes(b"not a container")
    with pytest.raises((OSError, ValueError)):
        _frame_count(broken)


@pytest.mark.xfail(reason="video_fps raet 30.0, wo capture_import.container_fps abbricht",
                   strict=True)
def test_a_candidate_without_a_clock_does_not_get_an_invented_frame_rate():
    """28,63 ist gemessen, 15 bei der Erfassung — 30,0 verschiebt jedes Intervall lautlos."""
    from chesslab.realgames import video_fps

    with pytest.raises(ValueError):
        video_fps({"moves": []})


@pytest.mark.xfail(reason="base_time faellt auf JETZT zurueck — genau die Exportzeit, die der "
                          "Docstring ausschliesst", strict=True)
def test_a_candidate_without_created_at_gets_no_invented_wall_clock():
    """Der Rueckfall landet als `ts` jeder Log-Zeile und als `created_at` der session.yaml."""
    from chesslab.realgames import base_time

    with pytest.raises(ValueError):
        base_time({"moves": []})


@pytest.mark.xfail(reason="val_checkpoint_score ist nur visible_piece_acc, nicht der gewichtete "
                          "Score aus CHECKPOINT_WEIGHTS", strict=True)
def test_the_logged_checkpoint_score_is_the_weighted_one():
    """`_checkpoint_rank[0]` ist `visible_piece_acc` — identisch zu `val_piece_acc` daneben."""
    from chesslab.training.data import CHECKPOINT_WEIGHTS
    from chesslab.training.train import _checkpoint_rank

    bd = {"visible_piece_acc": 0.80, "visible_occupied_acc": 0.90, "calibration": 0.70}
    weighted = sum(w * bd[k] for k, w in CHECKPOINT_WEIGHTS.items())
    assert _checkpoint_rank(bd, 0.70)[0] == pytest.approx(weighted)


@pytest.mark.xfail(reason="`soft` liest visible_max nicht, train.py meldet die Maske trotzdem",
                   strict=True)
def test_the_soft_coverage_weight_honours_visible_max():
    """`--visible-max` steht in der config.json und im Protokoll; im `soft`-Verlust wirkt es nicht."""
    import torch

    from chesslab.training.occlusion import coverage_weight

    cov = torch.tensor([0.30])
    assert coverage_weight(cov, "soft", 0.05).item() != coverage_weight(cov, "soft", 0.50).item()


@pytest.mark.xfail(reason="ein Frame, den `board_from_frame` nicht schneiden konnte, verliert "
                          "seinen `board`-Zeiger im Log", strict=True)
def test_a_failed_board_rewrite_keeps_the_pointer_to_the_board_on_disk(tmp_path, monkeypatch):
    """Der Pop laeuft ueber ALLE `todo`-Zeilen, zurueckgeschrieben wird nur die gelungene."""
    from chesslab import calibration, config, labeling, realgames, sessions

    bs, border = 64, 4
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = config.DATA.recordings / "rec"
    (sdir / "frames").mkdir(parents=True)
    (sdir / "boards").mkdir(parents=True)
    quad = [[0, 0], [bs, 0], [bs, bs], [0, bs]]
    rows = []
    for i in range(2):
        rel = f"boards/{i:06d}.webp"
        cv2.imwrite(str(sdir / f"frames/{i:06d}.png"), np.zeros((bs, bs, 3), np.uint8))
        cv2.imwrite(str(sdir / rel), np.zeros((bs + 2 * border, bs + 2 * border, 3), np.uint8))
        rows.append({"frame": f"frames/{i:06d}.png", "corners": quad, "board": rel,
                     "board_size": bs, "board_border": border, "board_straightened": True})
    (sdir / "session.yaml").write_text("session_id: rg-rec\nprofile: t\n", encoding="utf-8")
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")

    corners = [[0.0, 0.0], [float(bs), 0.0], [float(bs), float(bs)], [0.0, float(bs)]]
    prof = make_profile(bs, corners=corners, profile="t", camera_index=-1, source="test")
    monkeypatch.setattr(sessions, "session_dir", lambda sid, paths=None: (sdir, False))
    monkeypatch.setattr(labeling, "_profile_for_session", lambda meta, name: prof)
    monkeypatch.setattr(calibration, "straighten_board", lambda board, *a, **kw: board)

    def _board(job):
        stem = job[1].split("/")[-1].split(".")[0]
        if stem == "000001":
            return None
        rel = f"boards/{stem}.webp"
        return {"board": rel, "board_size": bs, "board_border": border}

    monkeypatch.setattr(realgames, "board_from_frame", _board)
    sessions.write_boards_session("rg-rec")

    on_disk = [json.loads(x) for x in
               (sdir / "log.jsonl").read_text(encoding="utf-8").splitlines() if x.strip()]
    assert on_disk[1].get("board") == "boards/000001.webp", (
        "das Brett liegt noch auf der Platte, aber kein Leser findet es mehr")


@pytest.mark.xfail(reason="train_gate schreibt `hand-gate-bn`, load_gate liest "
                          "`hand-gate-bn-mnv4-640`", strict=True)
def test_the_untagged_gate_run_is_the_one_the_scan_loads(tmp_path, monkeypatch):
    """Ohne `--tag` ist der frisch trainierte Lauf unadressierbar; der Scan serviert still den alten."""
    from chesslab import config, hand_gate

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    out = config.DATA.models / hand_gate.GATE_DIR
    out.mkdir(parents=True)
    (out / hand_gate.CARD_FILE).write_text(
        json.dumps({"backbone": "mobilenet_v3_small"}), encoding="utf-8")
    with pytest.raises(FileNotFoundError) as caught:
        hand_gate.load_gate("")
    assert hand_gate.DEFAULT_GATE not in str(caught.value), (
        "load_gate sucht unter einem Tag, den kein Trainingslauf je schreibt")


@pytest.mark.xfail(reason="ohne Index raet plate_long_side WORK_SIZE statt abzubrechen",
                   strict=True)
def test_a_plate_pool_without_an_index_is_not_silently_declared_1920(tmp_path):
    """Der Docstring nennt den Schaden selbst: jede Hand um Faktor zwei falsch im Bild."""
    from chesslab.composite import plate_long_side

    (tmp_path / "a.webp").write_bytes(b"")
    with pytest.raises((OSError, ValueError)):
        plate_long_side(tmp_path)


def test_the_watchdog_replay_refuses_an_occlusion_run_by_name(tmp_path):
    """`--replay` traegt laut Docstring das Ergebnis des Werkzeugs — auf jedem heutigen Lauf stirbt es."""
    import importlib.util

    from chesslab.training.train import _compact_metrics

    root = __import__("pathlib").Path(__file__).resolve().parents[1]
    spec = importlib.util.spec_from_file_location("_wd", root / "scripts" / "train_watchdog.py")
    watchdog = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(watchdog)

    full = [{"epoch": e, "val_occupied_acc": 0.9, "val_macro_recall": 0.8,
             "val_checkpoint_score": 0.7, "val_occ_mae": 0.1} for e in range(1, 25)]
    occ = [_compact_metrics(dict(r)) for r in full]
    run = tmp_path / "run"
    run.mkdir()
    (run / "metrics.jsonl").write_text("".join(json.dumps(r) + "\n" for r in occ), encoding="utf-8")
    # Laut statt KeyError: SD_OCC und SD_MACRO sind gegen `val_occupied_acc`/`val_macro_recall`
    # geeicht, und die streicht `_compact_metrics` aus jedem Occlusion-Lauf. Eine
    # `visible_`-Spalte einzusetzen misst etwas anderes unter derselben Schwelle — das braucht
    # eine Neu-Eichung, keinen Rename (offene Entscheidung, docs/offene-entscheidungen.md).
    with pytest.raises(SystemExit, match="val_occupied_acc"):
        watchdog.replay(occ, [run])
