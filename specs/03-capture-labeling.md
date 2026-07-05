# Stage 3 — Capture & Auto-Labeling (`collect.py`, `labeling.py`)

## Purpose

The core. Connects calibration (Stage 1) and game state (Stage 2): captures
frames, splits them into 64 square crops, and **automatically labels each crop from the FEN**.
Capture and slicing are separated so that slicing remains reproducible and re-parameterizable.

## Part 1 — Capture (`collect`, in `collect.py`)

Writes **raw frame + FEN** per confirmed position into a session log. No slicing here.

### CLI
```
chesslab collect pgn  --pgn <file> [--profile default] [--camera 0] [--every 1] [--session <id>]
chesslab collect live [--start-fen <FEN>] [--profile default] [--camera 0] [--session <id>]
```

### Session Layout
```
data/sessions/<session_id>/
  session.yaml          # Metadata (see below)
  frames/0000.png       # Raw frame (undistorted, full camera image)
  frames/0001.png
  log.jsonl             # One capture entry per line
```

`session_id` default = Timestamp `YYYYMMDD-HHMMSS`. `session.yaml`:
```yaml
session_id: "20260625-201500"
profile: default              # Calibration profile used
mode: pgn                     # or live
source_pgn: "games/kasparov.pgn"   # pgn mode only
created_at: "2026-06-25T20:15:00Z"
camera_index: 0
frame_size: [1280, 720]
notes: "Daylight, ceiling light off"
```

`log.jsonl` per line:
```json
{"frame": "frames/0007.png", "ply": 7, "fen": "rnbqkbnr/pp....", "ts": "...", "move_san": "Nf3"}
```

### Capture Loop (shared by both modes)
1. Open camera, load profile. **Warn** if `frame_size` deviates from the profile resolution
   (the homography will not fit then).
2. Live preview with grid overlay (warp-back or show warp window),
   plus current FEN / expected next move (PGN mode).
3. User makes the physical move; trigger capture via key (`Space`):
   - save the current raw frame,
   - write an entry to `log.jsonl` with the **current** FEN (after the move),
   - advance state (PGN: next move; live: previously typed-in move).
4. Keys: `Space` = capture, `u` = undo last capture + half-move, `s` = Skip without photo,
   `q` = quit session (writes `session.yaml`).
5. Multiple captures of the same position are allowed and encouraged (slight variance).
   They inherit the same `ply`/`fen`.

> Help recommendation: 1–2 frames per position; vary lighting between sessions
> (day/night, lamp on/off) — this covers the most common real-world error source.

## Part 2 — Slicing & Labeling (`slice`, in `labeling.py`)

Reads session logs, produces labeled square crops + manifest entries. **Pure,
repeatable step** — simply re-run when crop parameters change.

### CLI
```
chesslab slice --session <id> [--profile default]
               [--pad-up 1.6] [--pad-side 0.15] [--out-size 96x128]
chesslab slice --all                         # slice all sessions
```
Crop parameters override the profile defaults from Stage 1 when set.

### Per-Frame Flow
1. Load raw frame, warp to `board_size` square using the profile homography
   (`cv2.warpPerspective`).
2. For all 64 squares: `square_to_crop_box(square, profile)` (core function from
   Stage 1) -> crop from the rectified image, resize to `out_size`.
3. Label via `GameState.label_for(square)` from the FEN stored in the log
   (orientation according to `white_pov`).
4. Save crop and append manifest line.

### Output Layout
```
data/squares/<class>/<session>_<frame>_<square>.png     # ImageFolder-compatible
data/manifests/squares.jsonl                            # one line per crop (append)
```

`squares.jsonl` per line (full schema, used by Stage 4):
```json
{
  "path": "data/squares/wK/20260625-201500_0007_e1.png",
  "label": "wK",
  "session_id": "20260625-201500",
  "frame": "0007",
  "ply": 7,
  "square": "e1",
  "square_color": "dark",          // Square color a1=dark ... computed, not guessed
  "fen": "rnbqkbnr/...",
  "out_size": [96, 128],
  "ts": "..."
}
```

`square_color` deterministically computed (`(file_idx + rank_idx) % 2`), because Stage 4
needs coverage of "every piece on light AND dark".

## Acceptance Criteria (Definition of Done)

- `collect` writes valid sessions (Frames + `log.jsonl` + `session.yaml`); `undo`
  removes frame **and** log line consistently.
- `slice` on a session with N logged positions produces exactly `64*N` crops and the same
  number of manifest lines; labels are verifiable against a known test FEN.
- Re-`slice` with a different `--pad-up` produces new crops without requiring a new capture
  (reproducibility demonstrated).
- Spot check: for the starting position there are exactly 16 `empty` rows … i.e. 32 occupied +
  32 empty crops, and a king crop (`e1->wK`) visually shows the entire piece (crop extended
  upward, not decapitated).
- Wrong orientation is made visible by comparing `label_for` versus the visible crop in a
  debug command (`slice --preview <session>`).
