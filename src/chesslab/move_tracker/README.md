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
# Install the free app: https://github.com/DigitallyRefined/android-ip-camera
# (install the app on your phone, enter the URL it displays as --source)
chesslab track --profile phone --source https://<PHONE-IP>:4444/video/m.jpeg
# then open:  http://127.0.0.1:8001
```

> **720p is enough:** set your phone/IP cam to 720p — ArUco markers detect at half-res
> anyway, and the detection warp runs at `detect_scale=0.5` by default. 1080p only helps
> dataset collection/slicing where crop quality matters for the CNN.

In the UI: **Start** (begins from the initial position) · **Reset reference** (= "I just
set up the initial position", resets the reference) · **Undo**. Left: live camera with
what the computer believes (piece letters + last move in yellow); right: the
reconstructed board + move list + FEN.

**Usage:** set up the initial position → **Start** → play normally. After each move (hand
away, board calm) the move appears on the right. If something slips / a move is missed →
**Undo** or **Reset reference**.

## Parameters (all tuning knobs)

Defaults live in **one** place: `config.TRACK_DEFAULTS` (`src/chesslab/config.py`).
Override per run via CLI flag (`chesslab track --help` for the full list) or API body
(`POST /api/start`). The most important knobs (live-tuned values as of 2026-07-06):

| Parameter | Default | Effect | Increase when … | Decrease when … |
|---|---|---|---|---|
| `motion_thr` | `0.25` | Motion gate: **percent of pixels** whose brightness changed by > `motion_px_thr` (wobble-immune; the old mean-based metric is gone). | Stuck on "moving" (compression noise). | A slow hand slips under the gate. |
| `motion_px_thr` | `20` | Per-pixel delta that counts as motion. | Video noise trips the gate. | Low-contrast hands are missed. |
| `motion_hold_s` | `0.2` | Seconds the board must be motion-free (WALL TIME, re-armed on every motion frame) before detection resumes. Also the occlusion-latch expiry. | Residue commits right after the hand leaves. | Fast/blitz play misses moves. |
| `motion_recency_s` | `20` | A candidate only commits within N s of the last motion — old drift is not a move. | Legit moves rejected as "last motion Ns ago". | Drift ghosts within the window. |
| `z_thr` | `3.0` | z-score (per-square noise model) above which a square counts as "changed". | Ghost squares from noise. | Low-contrast moves missed. |
| `ambiguity_margin_ll` | `2.0` | Min LL gap best vs. second-best move; below → "ambiguous"/prior tie-break. | Similar moves get confused. | Too often "ambiguous". |
| `census_thr` | `160` | Structural-change threshold for the shadow veto (higher ⇒ more squares vetoed as shadow). | Shadows commit as moves. | Real moves vetoed as shadow. |
| `occlusion_color_thr` | `1.5` | Hand veto: NN-Mahalanobis sigma vs. the 64 reference-square colors (`0` = off). Flagged squares are latched until occlusion-free for `motion_hold_s`. | Pieces falsely flagged as hand. | Hand/sleeve not flagged. |
| `min_grid_line_coverage` | `0.5` | Grid-line gate: skip detection when fewer interior grid lines are visible (big occluder). | — | Board pattern has weak lines. |
| `max_changed` | `6` | Changed+occluded squares above this ⇒ occluded/unstable, no commit. | Hand triggers ghost moves. | Castling+shadow suppressed. |
| `settle_frames` / `confirm_frames` / `avg_frames` | CNN on: `3/1/2`, off: `4/2/3` | Calm frames before checking / same-candidate votes / gray averaging window. | Noise/ghosts. | Sluggish detection. |
| `align_every` / `align_scale` | `3` / `0.5` | ArUco marker detection every N-th frame, on a downscaled frame (most expensive per-frame op; camera is fixed). | — | Camera drifts fast. |
| `recovery_max_plies` | `4` | CNN deep recovery: max half-moves the conflict-guided search bridges when the tracker is behind. | Desyncs deeper than 2 plies. | False multi-move adoptions. |
| `cnn_run` | newest run | Model for CNN verify/recovery (`''` = off). Verify runs pre-commit on every candidate incl. pairs. | — | — |
| `cnn_cooldown_s` / `cnn_check_interval_s` | `2` / `10` | Recovery retry gap / periodic board-vs-state check (pre-commit verify is NOT throttled by these). | CPU load. | Faster recovery/warnings. |

```bash
chesslab track --profile phone --source https://<PHONE-IP>:4444/video/m.jpeg \
  --motion-hold 0.3 --occlusion-color-thr 1.5 --census-thr 160
```

> Live tuning: the debug card shows every gate live (`motion`, `hold_left_s`,
> `motion_age_s`, `changed_vals`, veto lists, `grid_coverage`); each committed move has a
> popover in the moves list with the decider + evidence at commit time.

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
