# STATUS — 24 frame the board

Branch: `spec-24-frame-the-board` (from `main`).
This file is the ONLY hand-off between agents. Append to your own phase's row and to the session
log; never rewrite another phase's entry.

## Phases

| Phase | Concern | State | Owner | Notes |
|---|---|---|---|---|
| 00 | What does framing actually buy on the device? | todo | — | Measurement only. **Gates the pack, including closing it.** |
| 01 | Zoom set once, then calibrate | todo | — | Blocked by 00, and only if 00 says BUILD. |
| 02 | `AUTO` picks the capture mode from the measurement | todo | — | Blocked by 01. |

States: `todo` → `in progress` → `done` | `blocked`.

**Strictly sequential. `STOP` after phase 00 is an expected, valid end state.**

## What is already established (do not re-establish)

Measured 2026-07-30.

- **Framing in the existing corpus**, first frame, corner quad against frame size:

  | session | fills | of the area | px/square | at 85% fill |
  |---|---:|---:|---:|---:|
  | `20260730-145846` (phone) | 62% | 38% | 228.7 | 316 |
  | `20260730-131226` (phone) | 61% | 37% | 227.8 | 319 |
  | `20260721-212830` (USB 4K) | 69% | 47% | 173.2 | 214 |
  | `20260721-205618` (USB 1440p) | 69% | 47% | 115.4 | 143 |

  So zooming to 85% fill buys **1.24–1.4× linear** on this material — not the 2.7× that
  `AppSettings.resolutionMode`'s docstring implies. **No session here was recorded through the
  Android app's own camera**, which is the framing the docstring describes and phase 00 measures.

- **The gain is capped downstream, twice.** `measuredBoardSize` clamps the warp to 320…1280 px
  (≤160 px/square) — the phone's 1830 px board edge is already clamped today. At `infer_size = 80`
  the crop box at that clamp is `1280/8 × 1.2 = 192 px`, i.e. **2.4× more than the network can
  represent**.

- **A 2× warp change did nothing for occupancy.** specs/23 phase 00 swept 800/1200/1600 against
  input size: ±10 misses of 1715, no consistent direction. A 1.3× framing change needs a better
  argument than that one had.

- **The zoom is part of the calibrated geometry**, not a free knob: `OpticsLock` pins 1.0 because
  *"the profile's marker quad was measured at whatever zoom was in force"*. Calibrate after
  zooming, never before; a wrong quad silently transposes every label.

- **Digital zoom stops being real** where the sensor crop reaches the output resolution. Past that
  it is upscaling.

- **Lens undistortion is zoom-dependent.** `data/lens/calib.npz` was solved at one zoom; the phone
  path does not undistort at all (`undistorted: false`, no calibration).

- **The model declares its input size** (`infer_size`, specs/22) and the crop size follows it
  (`withCropSizeOf`, specs/23 phase 01). The best candidate as of 2026-07-30 is `occ-v6-f5nd` at
  **80 px** (11 misses / 0 phantoms across both test sessions).

- **Phantoms are the veto, misses are tolerable** (user, 2026-07-30). Rank on phantoms; report the
  sharpest phantom-free threshold, never below 0.5.

## Deliberately out of scope

- `data/calibration/*.yaml` and the Python rig's `board_size` — a re-slicing and retraining
  question, and specs/23 phase 00 measured no inference-time benefit.
- Raising `measuredBoardSize`'s 1280 clamp. If phase 00 or 01 shows it is now the binding limit,
  record it here; changing it alters the warp for every existing profile.
- Optical zoom / lens switching on multi-camera phones.
- Auto-panning or correcting board position. Framing only.

## Session log

<!-- Append: date — phase — what was measured/changed — the numbers — what is left. -->
