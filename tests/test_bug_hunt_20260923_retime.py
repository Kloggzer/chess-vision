"""`retime` erhaelt ein gleichzeitiges menschliches Urteil in `candidate.json`."""
from __future__ import annotations

import json

import chess
import pytest

from chesslab import calibration, config, labeling, occluded_model, recording, retime
from chesslab.realgames import decode as rg_decode
from chesslab.session_store import recording as store_rec
from chesslab.state import GameState
from chesslab.training import torch_data

FPS = 30.0
PHONE = [30, 60]


def _fens() -> list[str]:
    board = chess.Board()
    out = [board.fen()]
    for san in ("e4", "e5"):
        board.push_san(san)
        out.append(board.fen())
    return out


@pytest.fixture
def game(monkeypatch, tmp_path):
    fens = _fens()
    gdir = tmp_path / "rec"
    gdir.mkdir()
    corners = [[0, 0], [1, 0], [1, 1], [0, 1]]
    cand = {"name": "rec", "start_fen": fens[0], "geometry": {"corners": corners},
            "moves": [{"ply": i + 1, "san": san, "frame": f, "fen_after": fens[i + 1]}
                      for i, (san, f) in enumerate(zip(("e4", "e5"), PHONE, strict=True))]}
    (gdir / "candidate.json").write_text(json.dumps(cand, indent=2), encoding="utf-8")
    model = tmp_path / "run"
    model.mkdir()
    (model / "config.json").write_text(json.dumps({"head": "occlusion"}), encoding="utf-8")

    classes = list(config.IDENTITY_CLASSES)
    squares = labeling.all_squares()
    truth = [[classes.index(GameState(f).labels()[s]) for s in squares] for f in fens]

    class FakeRecording:
        def __init__(self, video):
            pass

        def take(self, wanted, _rotate):
            for idx in wanted:
                yield idx, idx

    hooks = {"on_read": None}

    def reads(model_dir, cells, device="cpu"):
        if hooks["on_read"]:
            hooks["on_read"]()
            hooks["on_read"] = None
        idx = cells[0]
        pos = 0 if idx < PHONE[0] else 1 if idx < PHONE[1] else 2
        return [{"probs": [1.0 if c == truth[pos][i] else 0.0 for c in range(len(classes))], "coverage": 0.0}
                for i in range(64)]

    monkeypatch.setattr(store_rec, "game_dir", lambda name: gdir)
    monkeypatch.setattr(store_rec, "video_fps", lambda cand: FPS)
    monkeypatch.setattr(store_rec, "video_path", lambda name: tmp_path / "v.mp4")
    monkeypatch.setattr(rg_decode, "detect_rotation", lambda *a: None)
    monkeypatch.setattr(calibration, "load_profile", lambda name: object())
    monkeypatch.setattr(calibration, "crop_border_px", lambda prof: 0)
    monkeypatch.setattr(labeling, "effective_profile", lambda prof, pad: prof)
    monkeypatch.setattr(labeling, "crops_for_frame", lambda frame, corners, prof, out_size=None: [frame] * 64)
    monkeypatch.setattr(occluded_model, "all_reads", reads)
    monkeypatch.setattr(occluded_model, "model_classes", lambda model_dir: classes)
    monkeypatch.setattr(recording, "Recording", FakeRecording)
    monkeypatch.setattr(torch_data, "infer_size_of", lambda cfg: (80, 80))
    monkeypatch.setattr(retime, "_write_boards", lambda *a, **k: 0)
    return gdir, model, hooks


def _human_confirms(gdir):
    path = gdir / "candidate.json"
    doc = json.loads(path.read_text(encoding="utf-8"))
    doc.update(confirmed=True, confirmed_at="2026-09-23T12:00:00Z", reviewed_plies=[1, 2])
    path.write_text(json.dumps(doc, indent=2), encoding="utf-8")


def test_without_a_second_writer_retime_writes_its_frames(game):
    gdir, model, _hooks = game
    res = retime.retime("rec", model, progress=False)
    assert res["written"] is True
    doc = json.loads((gdir / "candidate.json").read_text(encoding="utf-8"))
    assert "retime" in doc["source"]
    assert all("frame_phone" in m for m in doc["moves"])


def test_a_confirmation_during_retime_survives_and_the_run_refuses(game):
    gdir, model, hooks = game
    hooks["on_read"] = lambda: _human_confirms(gdir)

    res = retime.retime("rec", model, progress=False)

    doc = json.loads((gdir / "candidate.json").read_text(encoding="utf-8"))
    assert doc.get("confirmed") is True
    assert doc.get("reviewed_plies") == [1, 2]
    assert res["written"] is False
    assert "candidate.json" in res.get("refused", "")


def test_a_confirmation_before_retime_is_carried_through(game):
    gdir, model, _hooks = game
    _human_confirms(gdir)
    res = retime.retime("rec", model, progress=False)
    doc = json.loads((gdir / "candidate.json").read_text(encoding="utf-8"))
    assert res["written"] is True
    assert doc["confirmed"] is True and doc["reviewed_plies"] == [1, 2]
