"""Bug hunt 2026-09-15 — four defects in the dataset-build path, each pinned by its own case."""

from __future__ import annotations

import json

import cv2
import numpy as np
import pytest

from chesslab import config, dataset, dataset_build
from chesslab.training import packs
from conftest import make_profile

SIDE = 8
CELLS = (("wP", "0000", "e2"), ("wK", "0001", "e1"), ("empty", "0002", "c4"))


def _write_pack(paths: config.Paths, name: str, sid: str, side: int) -> None:
    d = paths.packs / name
    d.mkdir(parents=True)
    rows = [{"path": f"mm://{name}/{frame}/{square}", "label": label, "session_id": sid,
             "frame": frame, "ply": int(frame), "square": square, "square_color": "light",
             "fen": "x", "out_size": [side, side], "coverage": 0.0}
            for label, frame, square in CELLS]
    (d / "manifest.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows),
                                      encoding="utf-8")
    packs.write_meta(d, rows, side, side)
    (d / packs._IMAGE).write_bytes(b"\x07" * (len(rows) * side * side * 3))


def test_preflight_projects_the_memmap_at_the_pack_size_not_the_pool_size(tmp_path, monkeypatch):
    """`--pack-size 80` on a 128 px pool projects 2.56x too much and refuses a disk that fits."""
    crop = tmp_path / "c.png"
    cv2.imwrite(str(crop), np.zeros((128, 128, 3), np.uint8))
    rows = [{"path": str(crop)} for _ in range(2_000)]
    paths = config.Paths(root=tmp_path)
    monkeypatch.setattr(dataset_build.shutil, "disk_usage",
                        lambda _p: type("U", (), {"free": 70_000_000})())
    dataset_build._preflight_disk_check(rows, [], True, paths=paths, pack_size=(80, 80))


def test_add_train_may_not_leave_a_session_in_the_donors_test_split(tmp_path):
    """`--add-train` on a donor TEST session put it in both — trained on and evaluated on."""
    paths = config.Paths(root=tmp_path)
    donor = paths.datasets / "donor"
    donor.mkdir(parents=True)
    (donor / "split.json").write_text(
        json.dumps({"splits": {"train": ["s1"], "val": [], "test": ["s2"]}}), encoding="utf-8")
    with pytest.raises(ValueError, match="already in"):
        dataset_build._split_from("donor", {"s1", "s2"}, paths, add_train=["s2"])


def test_like_adopts_the_donors_pack_size(tmp_path):
    """A 12 px pack donor must not produce an 80 px twin under a name that says otherwise."""
    paths = config.Paths(root=tmp_path)
    for sid in ("s1", "s2", "s3"):
        _write_pack(paths, f"{sid}-12", sid, 12)
    sids = ["s1", "s2", "s3"]
    dataset_build.build_dataset("donor", sids, rotations=(0,), phash_enabled=False,
                                val_frac=0.0, test_frac=0.0, paths=paths, pack_size=(12, 12),
                                allow_degenerate=True, from_packs=True, write_pack=False)
    dataset_build.build_dataset("twin", sids, rotations=(0,), phash_enabled=False,
                                paths=paths, like="donor", allow_degenerate=True, write_pack=False)
    rows = [json.loads(x) for x in
            (paths.datasets / "twin" / "manifest.jsonl").read_text(encoding="utf-8").splitlines()]
    assert {tuple(r["out_size"]) for r in rows} == {(12, 12)}


def test_render_stats_survives_a_label_seen_on_one_square_colour_only():
    """`compute_stats` tolerates an out-of-CLASSES label; `render_stats` indexed it in all three."""
    stats = dataset.compute_stats(
        [{"label": "occupied", "square_color": "dark", "session_id": "s"}])
    assert "occupied" in dataset.render_stats(stats)


# --- second wave: sessions, the matte lane and the hand gate ---------------------------------

def _profile_yaml(paths: config.Paths, name: str = "t", board_size: int = 64) -> None:

    corners = [[0.0, 0.0], [float(board_size), 0.0],
               [float(board_size), float(board_size)], [0.0, float(board_size)]]
    prof = make_profile(board_size, corners=corners, profile=name, camera_index=-1)
    paths.calibration.mkdir(parents=True, exist_ok=True)
    prof.save(paths.calibration / f"{name}.yaml")


def test_reviewed_can_be_set_on_a_recording(tmp_path):
    """`rg-<ts>` lives under recordings/, so the hand-built sessions/ path never found one."""
    from chesslab import sessions

    paths = config.Paths(root=tmp_path)
    d = paths.recordings / "2026-01-01"
    d.mkdir(parents=True)
    (d / "session.yaml").write_text("session_id: rg-2026-01-01\nprofile: t\n", encoding="utf-8")
    (d / "log.jsonl").write_text("", encoding="utf-8")
    assert sessions.set_session_reviewed("rg-2026-01-01", True, paths)["reviewed"] is True


def test_write_boards_keeps_the_store_of_rows_it_never_rewrites(tmp_path, monkeypatch):
    """The pop is over ALL rows, the write-back only over those with corners — the rest lose
    their `board` while the webp stays on disk, and every reader is log-driven."""
    import cv2
    import numpy as np

    from chesslab import labeling, realgames, sessions

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = config.DATA.recordings / "rec"
    (sdir / "frames").mkdir(parents=True)
    (sdir / "boards").mkdir(parents=True)
    bs = 64
    rows = [{"frame": "frames/000000.png", "corners": [[0, 0], [bs, 0], [bs, bs], [0, bs]]},
            {"frame": "frames/000001.png", "board": "boards/000001.webp",
             "board_size": bs, "board_border": 4, "board_straightened": True}]
    for row in rows:
        cv2.imwrite(str(sdir / row["frame"]), np.zeros((bs, bs, 3), np.uint8))
    cv2.imwrite(str(sdir / "boards" / "000001.webp"), np.zeros((bs + 8, bs + 8, 3), np.uint8))
    (sdir / "session.yaml").write_text("session_id: rg-rec\nprofile: t\n", encoding="utf-8")
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    _profile_yaml(config.DATA, board_size=bs)

    monkeypatch.setattr(sessions, "session_dir", lambda sid, paths=None: (sdir, False))
    monkeypatch.setattr(labeling, "_profile_for_session",
                        lambda meta, name: __import__("chesslab.calibration", fromlist=["x"])
                        .load_profile("t"))
    monkeypatch.setattr(realgames, "board_from_frame", lambda job: None)

    sessions.write_boards_session("rg-rec")
    after = [json.loads(x) for x in
             (sdir / "log.jsonl").read_text(encoding="utf-8").splitlines() if x.strip()]
    assert after[1].get("board") == "boards/000001.webp"


def test_the_gate_teacher_is_silent_about_a_frame_sam_refused():
    """`alpha_worker` writes a `skipped` row with neither concepts nor coverage — read as
    "no hand" that trains the student to call the most occluded frames in the corpus clean."""
    from chesslab.hand_gate import gate_label

    assert gate_label({"frame": "000001", "ply": 3, "skipped": "zone too big"}) is None


def test_a_skipped_matte_row_is_not_a_matte_for_adopt(tmp_path, monkeypatch):
    """`have` counted SAM's refusals, so the frames with NO alpha at all were the ones the
    temporal pass refused to fill — straight into the Coverage Matte Trap."""
    import cv2
    import numpy as np

    from chesslab import temporal_matte

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    bs = 64
    rec = config.DATA.recordings / "rec"
    (rec / "mattes").mkdir(parents=True)
    _profile_yaml(config.DATA, board_size=bs)
    (rec / "session.yaml").write_text("session_id: rg-rec\nprofile: t\n", encoding="utf-8")
    (rec / "log.jsonl").write_text(json.dumps(
        {"frame": "frames/000010.png", "ply": 3, "board": "boards/000010.webp",
         "corners": [[0, 0], [bs, 0], [bs, bs], [0, bs]],
         "board_size": bs, "board_border": 0, "dirty_reason": "occluded"}) + "\n", encoding="utf-8")
    (rec / "matte.jsonl").write_text(
        json.dumps({"frame": "000010", "ply": 3, "skipped": "zone too big"}) + "\n",
        encoding="utf-8")
    d = config.DATA.reports / "temporal-mattes" / "rec" / "local"
    d.mkdir(parents=True)
    cv2.imwrite(str(d / "000010.png"), np.full((bs, bs), 255, np.uint8))
    (d / "proposals.jsonl").write_text(json.dumps(
        {"frame": "000010", "alpha": "000010.png", "fraction_above_half": 0.9}) + "\n",
        encoding="utf-8")

    monkeypatch.setattr(temporal_matte, "require_fresh_proposals", lambda *a, **k: None)
    monkeypatch.setattr(temporal_matte, "session_dir", lambda sid, paths=None: (rec, False))
    assert temporal_matte.adopt_proposals("rg-rec")["adopted"] == 1


# --- third wave: the operator surface --------------------------------------------------------

def _parked_session(paths: config.Paths) -> None:
    """A session whose boards are on disk and whose source frames are parked elsewhere."""
    d = paths.recordings / "rec"
    d.mkdir(parents=True)
    (d / "session.yaml").write_text("session_id: rg-rec\nprofile: t\n", encoding="utf-8")
    (d / "log.jsonl").write_text(json.dumps(
        {"frame": "frames/000000.png", "board": "boards/000000.webp",
         "corners": [[0, 0], [64, 0], [64, 64], [0, 64]]}) + "\n", encoding="utf-8")
    _profile_yaml(paths)


@pytest.mark.parametrize("verb", ["scan", "autofix"])
def test_a_parked_session_is_reported_not_raised(tmp_path, monkeypatch, verb):
    """Both verbs return an ERROR DICT for a parked session; the CLI indexed the success keys."""
    from typer.testing import CliRunner

    from chesslab.cli import app

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    _parked_session(config.DATA)
    result = CliRunner().invoke(app, ["session", verb, "rg-rec"])
    assert result.exit_code == 1 and "[FAIL]" in result.output


def test_pack_refuses_a_pad_side_it_cannot_apply(tmp_path, monkeypatch):
    """`--pool` re-decodes crops that were already cut; the pad belongs to the pool, so accepting
    the flag and dropping it is how two framings end up in one training set."""
    from typer.testing import CliRunner

    from chesslab.cli import app

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    result = CliRunner().invoke(
        app, ["session", "pack", "--session", "s1", "--pool", "comp", "--pad-side", "0.10"])
    assert result.exit_code == 1 and "--pad-side" in result.output


def test_alpha_worker_skips_a_dirty_row_that_never_got_a_board(tmp_path, monkeypatch):
    """Every neighbouring comprehension guards `board`; this one subscripted it and took the
    whole session down inside `alpha_worker_all`'s catch, as a silent `[ERR]`."""
    from chesslab import matte

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    d = config.DATA.recordings / "rec"
    d.mkdir(parents=True)
    _profile_yaml(config.DATA)
    (d / "session.yaml").write_text("session_id: rg-rec\nprofile: t\n", encoding="utf-8")
    (d / "log.jsonl").write_text(json.dumps(
        {"frame": "frames/000001.png", "dirty": True, "dirty_reason": "occluded"}) + "\n",
        encoding="utf-8")
    assert matte.alpha_worker("rec", progress=False)["frames"] == 0


def test_no_dirty_reaches_the_path_every_export_actually_takes():
    """`--dirty/--no-dirty` was only ever read in the `--no-scan` branch, so the flag was a
    no-op on the default scan path and the whole dirty pile was written regardless."""
    from chesslab import realgames as rg

    candidate = {"geometry": {"corners": [[0, 0], [1, 0], [1, 1], [0, 1]]},
                 "moves": [{"frame": 0, "ply": 1,
                            "fen_after": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"}],
                 "reviewed_plies": [1], "frames": 120, "fps": 30}
    scan = [{"idx": i, "gate": 0.9 if i < 36 else 0.1, "grid": [], "cells": [200.0] * 64}
            for i in range(0, 120, 3)]
    assert any(r.get("dirty") for r in rg.plan_scanned(candidate, scan, margin_frames=0))
    kept = rg.plan_scanned(candidate, scan, margin_frames=0, dirty=False)
    assert kept and not any(r.get("dirty") for r in kept)
