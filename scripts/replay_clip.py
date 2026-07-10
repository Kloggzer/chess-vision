"""Video-Replay-Harness (Spec 11, Teil 3 — Minimalversion): spielt einen Testclip
headless durch den MoveTracker und protokolliert Züge/Zustände/Noten.

Usage: uv run python scripts/replay_clip.py data/testclips/clipXX.mp4
           [--profile phone] [--no-cnn] [--realtime]

Ohne --realtime wird so schnell abgespielt, wie der Tracker Frames zieht (der
Loop-Sleep von 5 ms bleibt); der Clip ersetzt die Kamera via open_source-Patch.
"""

from __future__ import annotations

import argparse
import os
import sys
import time

import cv2


class VideoCap:
    """Kamera-Ersatz: liefert die Clip-Frames sequenziell, setzt `done` am Ende.
    Mit realtime=True wird auf Clip-fps gedrosselt (Motion-Gate wie live)."""

    def __init__(self, path: str, realtime: bool = False) -> None:
        self.cap = cv2.VideoCapture(path)
        if not self.cap.isOpened():
            raise SystemExit(f"kann {path} nicht öffnen")
        self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 30.0
        self.realtime = realtime
        self.done = False
        self._last = 0.0

    def read(self):
        if self.realtime:
            wait = self._last + 1.0 / self.fps - time.time()
            if wait > 0:
                time.sleep(wait)
            self._last = time.time()
        ok, frame = self.cap.read()
        if not ok:
            self.done = True
        return ok, frame

    def release(self) -> None:
        self.cap.release()


def replay(clip: str, profile: str = "phone", cnn_run: str | None = None,
           realtime: bool = False, live_align: bool = True,
           start_fen: str | None = None, max_wall_s: float = 900.0,
           tracker_kwargs: dict | None = None, corners: list | None = None,
           frame_size: list | tuple | None = None, board_size: int | None = None,
           promotion: str = "q") -> dict:
    """Clip headless durch den MoveTracker spielen. Gibt {history, fen, note, events} zurück.
    Auch vom pytest-Harness (`tests/test_clips.py`, Marker `clips`) genutzt.
    `tracker_kwargs` überschreibt einzelne MoveTracker-Parameter (Schwellen-Tuning).
    `promotion` (q/r/b/n): ohne CNN pausiert der Tracker bei Umwandlungen auf die
    Figurenwahl; headless wird sie automatisch mit dieser Figur (Default Dame) beantwortet."""
    from chesslab.move_tracker import tracker as trk

    cap = VideoCap(clip, realtime=realtime)
    original_open_source = trk.open_source
    trk.open_source = lambda src: cap                    # Kamera-Patch

    temp_profile = None
    if corners:
        from chesslab.calibration import (
            CalibrationProfile,
            CropParams,
            compute_homography,
            profile_path,
        )

        size = tuple(
            frame_size
            or (
                int(cap.cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                int(cap.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            )
        )
        target = int(board_size or min(size))
        profile = f"__clip_replay_{os.getpid()}_{time.time_ns()}"
        temp_profile = profile_path(profile)
        CalibrationProfile(
            profile=profile, camera_index=-1, frame_size=size, board_size=target,
            image_corners=corners, homography=compute_homography(corners, target, 0.0),
            white_pov=True, crop=CropParams.default(target), margin=0.0, source=clip,
        ).save(temp_profile)
        live_align = False

    mt = None
    try:
        mt = trk.MoveTracker(profile=profile, source="0", live_align=live_align, cnn_run=cnn_run,
                             **(tracker_kwargs or {}))
        mt.reset_to_start(start_fen)
        mt.start()

        events: list[str] = []
        last_note, last_hist = "", 0
        last_tick = 0.0
        # State/veto/alarm trace over the whole run — lets a test assert occlusion, shadow and
        # failure behaviour, not only the final move list (see tests/test_clips.py `expect_*`).
        states: set[str] = set()
        shadow_vetoed: set[str] = set()
        occluded_vetoed: set[str] = set()
        tainted: set[str] = set()
        stuck_reasons: set[str] = set()
        notes: set[str] = set()
        alarm_seen = False
        max_motion = 0.0
        t0 = time.time()
        while not cap.done and time.time() - t0 < max_wall_s:
            time.sleep(0.05)
            s = mt.status()
            # Without a CNN the tracker pauses a detected promotion for the piece choice.
            # Headless we answer it automatically (default: queen) so the move commits.
            if s.get("promotion_pending"):
                mt.choose_promotion(promotion)
            dbg = s["debug"]
            vframe = int(cap.cap.get(cv2.CAP_PROP_POS_FRAMES))
            vtime = vframe / cap.fps
            states.add(s["state"])
            shadow_vetoed.update(dbg.get("shadow_vetoed") or [])
            occluded_vetoed.update(dbg.get("occluded_vetoed") or [])
            tainted.update(dbg.get("tainted") or [])
            if dbg.get("stuck_reason"):
                stuck_reasons.add(dbg["stuck_reason"])
            if s.get("note"):
                notes.add(s["note"])
            alarm_seen = alarm_seen or s.get("alarm") is not None
            max_motion = max(max_motion, dbg.get("motion") or 0.0)
            if len(s["history"]) > last_hist:
                for san in s["history"][last_hist:]:
                    events.append(f"[video {vtime:6.1f}s] ZUG: {san}   ({s['note']})")
                last_hist = len(s["history"])
            if s["note"] != last_note:
                last_note = s["note"]
                events.append(f"[video {vtime:6.1f}s] NOTE {s['state']:8s} {last_note}")
            if time.time() - last_tick >= 0.5:               # Dauer-Telemetrie
                last_tick = time.time()
                events.append(
                    f"[video {vtime:6.1f}s] tick {s['state']:8s} motion={dbg['motion']:.2f} "
                    f"changed={dbg['n_changed']} vals={dbg['changed_vals'][:4]} "
                    f"cand={dbg['candidate']} best={dbg['best_score']} 2nd={dbg['second_score']} "
                    f"stable={dbg['stable_count']} stuck={dbg['stuck_reason']}")
        time.sleep(1.0)
        s = mt.status()
        return {"history": s["history"], "fen": s["fen"], "note": s["note"], "events": events,
                "states": sorted(states), "shadow_vetoed": sorted(shadow_vetoed),
                "occluded_vetoed": sorted(occluded_vetoed), "tainted": sorted(tainted),
                "stuck_reasons": sorted(stuck_reasons), "notes": sorted(notes),
                "alarm_seen": alarm_seen, "max_motion": round(max_motion, 3),
                "game_over": s.get("game_over", False), "result": s.get("result")}
    finally:
        if mt is not None:
            mt.stop()
        trk.open_source = original_open_source
        cap.release()
        if temp_profile is not None:
            temp_profile.unlink(missing_ok=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("clip")
    ap.add_argument("--profile", default="phone")
    ap.add_argument("--no-cnn", action="store_true")
    ap.add_argument("--realtime", action="store_true")
    ap.add_argument("--no-live-align", action="store_true")
    ap.add_argument("--start-fen", default=None)
    a = ap.parse_args()

    from chesslab import config

    res = replay(a.clip, profile=a.profile,
                 cnn_run=None if a.no_cnn else config.MOVE_TRACKER_DEFAULT_RUN,
                 realtime=a.realtime, live_align=not a.no_live_align, start_fen=a.start_fen)
    print("=" * 78)
    print(f"CLIP: {a.clip}")
    print(f"Züge ({len(res['history'])}): {' '.join(res['history']) or '—'}")
    print(f"End-FEN: {res['fen']}")
    print(f"Letzte Note: {res['note']}")
    print("-" * 78)
    for e in res["events"]:
        print(e)
    return 0


if __name__ == "__main__":
    sys.exit(main())
