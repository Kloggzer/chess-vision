"""Regression: the clip-replay harness must never record into the real dataset.

`scripts/replay_clip.replay()` runs a full MoveTracker headless. The live tracker defaults to
`auto_record=True` ("a correctly tracked game = free auto-labeled data"), which auto-starts a
SessionWriter into `config.DATA.sessions` on the first committed move. In a headless replay that
leaked synthetic sessions (`__clip_replay_*`, 400x400 pre-warped boards) into `data/sessions`.
The harness now forces `auto_record=False`; this guards that it stays off.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

_ROOT = Path(__file__).resolve().parents[1]


class _FakeCV2Cap:
    """Minimal cv2.VideoCapture stand-in: yields a few blank frames, then EOF."""

    def __init__(self, path: str, n: int = 3) -> None:
        self._n = n
        self._i = 0

    def isOpened(self) -> bool:
        return True

    def get(self, prop):
        import cv2

        return {
            cv2.CAP_PROP_FPS: 10.0,
            cv2.CAP_PROP_FRAME_WIDTH: 64.0,
            cv2.CAP_PROP_FRAME_HEIGHT: 64.0,
            cv2.CAP_PROP_POS_FRAMES: float(self._i),
        }.get(prop, 0.0)

    def read(self):
        if self._i >= self._n:
            return False, None
        self._i += 1
        return True, np.zeros((64, 64, 3), dtype=np.uint8)

    def release(self) -> None:
        pass


def test_replay_forces_auto_record_off_and_writes_no_session(monkeypatch, tmp_path):
    from chesslab import config

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))

    sys.path.insert(0, str(_ROOT / "scripts"))
    import replay_clip

    from chesslab.move_tracker import tracker as trk

    monkeypatch.setattr(replay_clip.cv2, "VideoCapture", lambda p: _FakeCV2Cap(p))

    captured: dict = {}

    class _SpyTracker:
        """Records constructor kwargs; drains the patched capture so replay's loop ends."""

        def __init__(self, **kwargs) -> None:
            captured.update(kwargs)

        def reset_to_start(self, *a, **k) -> None:
            pass

        def start(self) -> None:
            cap = trk.open_source("0")  # replay patched this to return its VideoCap
            while cap.read()[0]:
                pass

        def status(self) -> dict:
            return {"state": "idle", "history": [], "fen": "", "note": "",
                    "game_over": False, "result": None,
                    "debug": {"motion": 0.0, "n_changed": 0, "changed_vals": [],
                              "candidate": None, "best_score": 0, "second_score": 0,
                              "stable_count": 0, "stuck_reason": None}}

        def stop(self) -> None:
            pass

    monkeypatch.setattr(trk, "MoveTracker", _SpyTracker)

    replay_clip.replay("dummy.mp4", cnn_run=None, realtime=False, max_wall_s=5.0)

    assert captured.get("auto_record") is False
    sessions_dir = config.DATA.sessions
    assert not sessions_dir.exists() or not any(sessions_dir.iterdir()), \
        "replay must not write any session into config.DATA.sessions"
