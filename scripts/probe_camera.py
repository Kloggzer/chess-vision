"""Probe USB/UVC cameras for the resolution + framerate they *actually* deliver.

Thin CLI wrapper over `chesslab.camera` — the real logic (device enumeration, MJPG-forced
mode probing, real-fps timing) lives in the library and is shared with `chesslab cameras`.

Run:  uv run python scripts/probe_camera.py                # list + probe all
      uv run python scripts/probe_camera.py --index 1      # probe one index
      uv run python scripts/probe_camera.py --grab 40      # more frames per mode
"""

from __future__ import annotations

import argparse

from chesslab.camera import cli_cameras


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--index", type=int, default=None, help="probe only this index")
    ap.add_argument("--grab", type=int, default=20, help="frames to time per mode")
    a = ap.parse_args()
    raise SystemExit(cli_cameras(index=a.index, do_probe=True, grab=a.grab))


if __name__ == "__main__":
    main()
