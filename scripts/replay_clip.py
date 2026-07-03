"""Video-Replay-Harness (Spec 11, Teil 3 — Minimalversion): spielt einen Testclip
headless durch den MoveTracker und protokolliert Züge/Zustände/Noten.

Usage: uv run python scripts/replay_clip.py data/testclips/clipXX.mp4
           [--profile phone] [--no-cnn] [--realtime]

Ohne --realtime wird so schnell abgespielt, wie der Tracker Frames zieht (der
Loop-Sleep von 5 ms bleibt); der Clip ersetzt die Kamera via open_source-Patch.
"""

from __future__ import annotations

import argparse
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


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("clip")
    ap.add_argument("--profile", default="phone")
    ap.add_argument("--no-cnn", action="store_true")
    ap.add_argument("--realtime", action="store_true")
    ap.add_argument("--no-live-align", action="store_true")
    a = ap.parse_args()

    from chesslab import config
    from chesslab.move_tracker import tracker as trk

    cap = VideoCap(a.clip, realtime=a.realtime)
    trk.open_source = lambda src: cap                    # Kamera-Patch

    mt = trk.MoveTracker(
        profile=a.profile, source="0",
        live_align=not a.no_live_align,
        cnn_run=None if a.no_cnn else config.MOVE_TRACKER_DEFAULT_RUN,
    )
    mt.reset_to_start()
    mt.start()

    events: list[str] = []
    last_note, last_hist = "", 0
    last_tick = 0.0
    t0 = time.time()
    while not cap.done and time.time() - t0 < 900:
        time.sleep(0.05)
        s = mt.status()
        dbg = s["debug"]
        vframe = int(cap.cap.get(cv2.CAP_PROP_POS_FRAMES))
        vtime = vframe / cap.fps
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
    mt.stop()

    s = mt.status()
    print("=" * 78)
    print(f"CLIP: {a.clip}")
    print(f"Züge ({len(s['history'])}): {' '.join(s['history']) or '—'}")
    print(f"End-FEN: {s['fen']}")
    print(f"Letzte Note: {s['note']}")
    print("-" * 78)
    for e in events:
        print(e)
    return 0


if __name__ == "__main__":
    sys.exit(main())
