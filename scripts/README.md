# Utility scripts

Small, standalone helpers — occasionally used, not part of the core pipeline.
Run them with `uv run python scripts/<name>.py`.

| Script | Purpose |
|---|---|
| `replay_clip.py` | Video replay harness: plays a test clip headless through the MoveTracker and logs moves/states/grades. Also imported by `tests/test_clips.py` (`pytest -m clips`). |
| `dump_warp.py` | Diagnostics: pull a frame from a clip, visualize marker detection + warp. `--lines` tests the experimental line-based board detection. |
| `decimate_pieces.py` | Decimate prepared piece OBJs (`synth_pieces/<piece>/v1.obj`) to a target triangle count (default 35k), optional `--smooth` (Taubin). Preserves UVs (pymeshlab). |
| `reduce_video.py` | Downscale 8K test clips to a tracker-friendly resolution (OpenCV, no ffmpeg needed). |
| `probe_video.py` | Quick video check: resolution, fps, frame count, first/last frame readable. |
| `wb_textures.py` | White balance + gentle tone correction for the piece textures in `synth_pieces/`. Warning in the header: full-strength WB overshoots. |
| `match_texture_tone.py` | Match a piece texture's color tone to a reference piece (Reinhard transfer in Lab space). |

## tools/

`tools/` contains standalone helpers for the **phone camera feed**
([android-ip-camera](https://github.com/DigitallyRefined/android-ip-camera) on the phone):

- `tools/calibrate_from_frame.py` — create a calibration profile from a single frame of
  the phone feed (ArUco detection, no interactive preview needed).
- `tools/feed_preview.py` — live preview of the feed with marker/warp overlay.
