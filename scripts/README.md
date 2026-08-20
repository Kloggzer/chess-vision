# Utility Scripts

These scripts live under `scripts/` and are run directly with `uv run python scripts/<name>`.
They are not part of the `chesslab` CLI — they exist for one-off or diagnostic tasks in the
synthetic-pieces and video-testing pipelines.

The three `android-*.ps1` scripts are the exception: they run directly in PowerShell and
provide the reproducible Android emulator/ADB workflow described in
[`docs/android-emulator.md`](../docs/android-emulator.md). `replay-batch.ps1` is a fourth
PowerShell script and belongs to the Kotlin side — it builds `:desktop` once and runs the whole
replay regression set in parallel.

`replay_clip.py`, `generate_blender_testclips.py` and `inspect_detectors.py` were deleted with
the Python move tracker — their subject was the tracker's detectors and the clip replay harness,
both Kotlin now. The rendered clips they produced are still in `tests/data/testclips/`.

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

---

## Live camera: gone from Python (2026-08-20)

`capture_empty_session.py`, `calibrate_from_frame.py`, `feed_preview.py` and the three
`probe_camera*.py` were deleted with `chesslab.camera`. Kotlin owns the live camera and the
calibration on the device; a second Python implementation could only diverge, and nothing
compared the two. `synth/capture_turntable.py` survives because photogrammetry scanning is a
different job — it carries its own snapshot grabber now.
