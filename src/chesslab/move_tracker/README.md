# Move Tracker (experimental) — board digitization without a CNN

Tracks your game on a **fixed-mounted** board: starting from a known position, every move
is determined via **frame differencing + legality** (python-chess) — **no neural network,
no training data required**.

**Per-frame flow:** warp onto the board (geometry from the chesslab profile) → motion
gating (hand in view? → wait) → when calm, per-square difference against the reference
image → among all **legal** moves pick the one whose touched squares best explain the
change (castling/en passant/captures included) → apply the move, update the reference.

## Start

```bash
# Phone IP cam (MJPEG) — or --source 0 for a local camera.
# Phone app: https://github.com/DigitallyRefined/android-ip-camera
# (install the app, enter the URL it displays)
chesslab track --profile phone --source https://<PHONE-IP>:4444/video/m.jpeg
# then open:  http://127.0.0.1:8001
```

In the UI: **Start** (begins from the initial position) · **Reset reference** (= "I just
set up the initial position", resets the reference) · **Undo**. Left: live camera with
what the computer believes (piece letters + last move in yellow); right: the
reconstructed board + move list + FEN.

**Usage:** set up the initial position → **Start** → play normally. After each move (hand
away, board calm) the move appears on the right. If something slips / a move is missed →
**Undo** or **Reset reference**.

## Parameters (all tuning knobs)

Defaults live in **one** place: the `MoveTracker(...)` constructor in `tracker.py`.
Change them there permanently, or override per run via CLI flag (`chesslab track`) or API
body (`POST /api/start`).

| Parameter | Default | Effect | Increase when … | Decrease when … | Where |
|---|---|---|---|---|---|
| `profile` | `"phone"` | chesslab calibration profile (geometry/warp). File `data/calibration/<name>.yaml`. | — | — | CLI `--profile`, API body |
| `source` | `"0"` | Camera: `0`/`1` = local webcam, URL = IP cam (MJPEG `…/video/m.jpeg`). | — | — | CLI `--source`, API body |
| `motion_thr` | `3.0` | Motion threshold (mean frame-to-frame difference) for "hand in view". | Detection is stuck on "moving" (light/sensor noise). | Moves get detected *while* the hand is still over the board. | `tracker.py`, CLI `--motion-thr`, API body |
| `change_thr` | `16.0` | Brightness difference (0–255) at which a square counts as "changed". | Ghost moves from shadows/light. | Real moves are missed (low piece↔square contrast). | `tracker.py`, CLI `--change-thr`, API body |
| `settle_frames` | `4` | How many calm frames must pass before checking at all. | Checks happen too early (board not fully calm). | Detection feels sluggish. | `tracker.py` |
| `confirm_frames` | `2` | How often the same move must be confirmed in a row before committing. | Still ghost moves from single noise frames. | Detection should react faster (`1`). | `tracker.py`, CLI `--confirm-frames` |
| `ambiguity_margin` | `= change_thr` | Minimum score gap to the second-best move; otherwise "ambiguous", no commit. | Too often "ambiguous" on clear moves. | Two similar moves get confused. | `tracker.py` |
| `live_align` | `True` | Track markers live vs. freeze the calibration geometry. | Camera/setup drifts over the session (markers compensate). | Tripod camera, firmly anchored (no drift). | `tracker.py`, CLI `--no-live-align` |
| `avg_frames` | `3` | Moving average over N calm gray frames (denoised) for the per-square diff. | High sensor/light noise, sudden exposure jumps. | Latency should be minimal. | `tracker.py`, CLI `--avg-frames` |
| `max_changed` | `6` | Max changed squares before the frame is discarded as "occluded/unstable". | Hand triggers many squares that get misread as a move. | Castling (4 squares + shadow) gets suppressed. | `tracker.py`, CLI `--max-changed` |
| `cnn_run` | newest run with weights | Model run for CNN recovery/verification; selectable in the UI dropdown; `''` = feature off. | — | — | UI select, CLI `--cnn-run`, API body |
| `cnn_conf_thr` | `0.85` | Softmax confidence above which a square counts for occupancy evaluation (occluded never counts). | The CNN "sees" moves that aren't (uncertain model). | Too few confident squares → the CNN never speaks up. | `tracker.py` |
| `cnn_cooldown_s` | `2.0` | Minimum gap between recovery observations (CPU ~100–300 ms each). | CPU load disturbs the stream. | Recovery should retry faster. | `tracker.py` |
| `cnn_check_interval_s` | `10.0` | Interval of the periodic CNN verification on a calm board. | Constant load unwanted. | Deviations should surface faster. | `tracker.py` |
| `--host`/`--port` | `127.0.0.1`/`8001` | Web UI address. | — | — | CLI |

**Examples:**

```bash
# per run via CLI:
chesslab track --profile phone --source 1 --port 8002

# change heuristics permanently → tracker.py, MoveTracker.__init__:
#   motion_thr=3.0  change_thr=16.0  settle_frames=4  confirm_frames=2  ambiguity_margin=None
# (ambiguity_margin=None means "= change_thr")

# live without restart via API (motion_thr/change_thr are sent by the Start button):
curl -X POST http://127.0.0.1:8001/api/start \
  -H 'Content-Type: application/json' \
  -d '{"profile":"phone","source":"https://<PHONE-IP>:4444/video/m.jpeg","motion_thr":4,"change_thr":20}'
```

> Note: `confirm_frames` and `ambiguity_margin` are currently only adjustable via
> `tracker.py` (constructor default), not via CLI/API. `motion_thr`/`change_thr` support
> both.

## CNN recovery & verification (automatic)

With `cnn_run` set (default: best available model), a CNN observer runs alongside the
frame-diff detection and evaluates **only the occupancy** per square (empty/occupied/
occluded — the tracker knows piece identity from the move history; occluded squares NEVER
count as occupied):

- **Automatic recovery:** if the diff path gets stuck ("no legal move fits" or "too much
  change"), the CNN observes the board and proposes the legal move whose resulting
  occupancy best explains the observation (capture/castling/en passant included). Commits
  only after `confirm_frames` consistent observations (no single-shot).
- **Periodic verification:** on a calm board the CNN checks every `cnn_check_interval_s`
  whether game state and board still agree. An unambiguously explaining move is adopted
  (via voting); otherwise the UI badge **CNN: deviates** warns with the conflicting
  squares in the note.
- **Manual:** the **Resync via CNN** button (or `POST /api/resync_cnn`) checks immediately
  and applies an unambiguous move directly; without one, the conflicting squares are
  reported.
- Promotion variants are identical at the occupancy level → deliberately no decision
  (user hint instead of guessing). If the model run is missing on disk, the feature
  disables itself silently (note on first attempt).

## Limitations (experimental)

- The starting position must be known (initial position or FEN resync; the CNN provides
  occupancy, not piece identity — reading arbitrary positions remains future work).
- Thresholds are heuristic — see the table; adapt to your light/board.

## Next steps

- Read an arbitrary starting position via CNN (full classification instead of occupancy).
- PGN export / Stockfish analysis of the running game.
