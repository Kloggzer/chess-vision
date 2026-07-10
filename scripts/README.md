# Utility Scripts

These scripts live under `scripts/` and are run directly with `uv run python scripts/<name>`.
They are not part of the `chesslab` CLI — they exist for one-off or diagnostic tasks in the
synthetic-pieces and video-testing pipelines.

### `replay_clip.py`
Replay a test clip headless through the move tracker and log moves/states/scores.
Use `--realtime` to throttle to real-time speed; without it the clip runs as fast as
possible (no camera needed).

### `generate_blender_testclips.py`
Render deterministic move sequences with the existing `synth_assets/Chess Scene.blend`
and assemble compact regression videos under `tests/data/testclips/`. The generated
manifest contains the exact SAN sequence and render calibration corners, so no camera or
interactive calibration is needed during replay.

```text
uv run python scripts/generate_blender_testclips.py --scenario opening
uv run pytest -m clips -v
```

### `dump_warp.py`
Grab a single frame from a clip, run marker detection + warp, and save
`raw.jpg` (with corners overlaid) and `warp.jpg` (with rectified grid) for visual
inspection of the calibration geometry.

### `decimate_pieces.py`
Reduce triangle count on the prepared piece OBJ files (`synth_pieces/<piece>/v1.obj`)
to a target budget (default 35k triangles per piece) using pymeshlab quadric edge
collapse. UVs are preserved. Keeps the Blender render pipeline from crashing on GPUs
with limited memory.

### `reduce_video.py`
Downscale 8K test clips to a tracker-friendly resolution (default 1920 px wide, 30 fps
cap) using OpenCV. No ffmpeg required.

### `probe_video.py`
Quick diagnostic: prints resolution, fps, frame count, and readability of the first
and penultimate frames for each video file passed as argument.

### `wb_textures.py`
White-balance and gentle tone correction for the scanned piece textures in
`synth_pieces/`. Removes the colour cast from the scan lighting. Use with
`--strength 0.3–0.5` — full strength over-corrects and makes sets look inconsistent.

### `match_texture_tone.py`
Match the colour tone of one piece texture to a reference piece using Reinhard
colour transfer in Lab space. Useful when two scan sessions had different lighting
(e.g. a black pawn that came out grey).

### `inspect_detectors.py`
Visualize what the move-tracker's **shadow** and **occlusion** detectors actually see,
so you can tune (crank) their thresholds against real footage. Given a clear reference
board and a current view (with a shadow/hand), renders a 4-panel montage: the live
overlay (magenta=changed, cyan=shadow-veto, orange=occlusion), the per-square occlusion
Mahalanobis-sigma heatmap, the census (structure) heatmap, and the normalized diff. Also
prints a per-square table and the sigma range so you can pick a threshold that separates
the board from the hand. Preview crank values inline via `--census-thr /
--occlusion-color-thr / --shadow-frac`.

```
uv run python scripts/inspect_detectors.py --profile phone --clip game.mp4 --ref-sec 1 --cur-sec 4 --out insp
uv run python scripts/inspect_detectors.py --profile phone --ref clear.jpg --cur withhand.jpg --out insp
```

---

## Standalone tools (`tools/`)

`tools/calibrate_from_frame.py` and `tools/feed_preview.py` are standalone helpers
for the phone-camera feed when `chesslab calibrate` cannot open the camera source
directly (e.g. an HTTPS snapshot URL).

- **`calibrate_from_frame.py`** — Grab a single frame from an IP camera snapshot URL,
  detect ArUco markers (ids 0–3), build a `CalibrationProfile`, and save it with a
  control overlay for visual margin adjustment.
- **`feed_preview.py`** — Quick live preview: grab frames from any source (camera
  index, stream URL, or still image) and split into an 8×8 grid. Without `--profile`
  uses a naive uniform grid; with `--profile` applies the real calibration rectification.
