# 24 — Frame the board: spend the sensor on the squares, not the table

> Entry file for the spec pack. Every implementing agent reads **this file completely**, then
> exactly the phase file assigned to it. The protocol of
> `specs/22-inference-resolution/entry.md` applies verbatim — memory constraints, heavy-compute
> limit, repo rules, git hygiene, linters, definition of done. Only the deltas are below.
> Branch: `spec-24-frame-the-board`, cut from `main`.

## The idea, and the honest state of its evidence

A camera pointed at a chessboard spends most of its pixels on the table. Zooming so the board
fills the frame multiplies the resolution per square at no capture cost, and the app already
knows exactly how much of the frame the board occupies — the ArUco quad says so every frame.
`OpticsLock` already holds `cameraControl` and already calls `setZoomRatio(1.0f)`; what is
missing is the decision of what value to set.

**But the gain is smaller than the idea suggests, and it may be zero for the task we ship
today.** Measured on the real sessions in this corpus (first frame, corner quad against frame
size):

| session | board fills | of the area | px/square | at 85% fill |
|---|---:|---:|---:|---:|
| `20260730-145846` (phone) | 62% | 38% | 228.7 | 316 |
| `20260730-131226` (phone) | 61% | 37% | 227.8 | 319 |
| `20260721-212830` (USB 4K) | 69% | 47% | 173.2 | 214 |
| `20260721-205618` (USB 1440p) | 69% | 47% | 115.4 | 143 |

So filling the frame buys **1.24–1.4× linear**, not the 2.7× that `AppSettings.resolutionMode`'s
docstring implies ("the board fills roughly a third of the frame's width"). That docstring
describes the Android app's own camera from a seated position and is **unmeasured** — no session
in this corpus was recorded through it.

And downstream the gain is capped twice:

- `measuredBoardSize` clamps the warp to **320…1280 px**
  (`tracker/geometry/CalibrationStore.kt`), i.e. at most 160 px/square, whatever the sensor
  delivered. The phone's 1830 px board edge is already clamped to 1280 today.
- At `infer_size = 80` (the candidate this pack was proposed alongside) the crop box at that
  clamp is `1280/8 × 1.2 = 192 px` — **2.4× more than the network can represent**.

**Conclusion to hold on to: for 2-class occupancy at 80 px, resolution is not the bottleneck, and
this pack may correctly end at phase 00 with "do not build it".** That is a valid and expected
outcome. Where it would pay is piece identity, a larger `infer_size`, or a user who sits much
further away than these sessions — and phase 00 exists to find out whether that user is the one
holding the phone.

## Phases

| Spec | Phase | Depends on | Runs |
|---|---|---|---|
| `00-what-does-framing-buy.md` | Measure the app's own framing and the zoom curve on the device | — | **alone, first. Gates the pack.** |
| `01-zoom-at-calibration.md` | Set the zoom once, then calibrate — never the other way round | 00 | after 00 |
| `02-resolution-from-measurement.md` | `AUTO` picks the capture mode from measured px/square and the model's `infer_size` | 01 | last |

If phase 00 finds the app's real framing already above ~60% and the crop box comfortably above
`infer_size`, **stop after 00**. Write the numbers into `STATUS.md` and close the pack.

## The invariant every phase must respect

**Zoom changes the geometry. Calibrate AFTER zooming, never before.** `OpticsLock`'s own comment
states the rule: *"1.0 IS the calibrated state by definition, since the profile's marker quad was
measured at whatever zoom was in force."* A profile made at one zoom and used at another
describes a board that is not there, and a wrong quad silently transposes every label — the worst
failure mode in this repo.

The sequence is therefore fixed: **find markers at the current zoom → compute the factor → set it
→ re-calibrate → freeze.** One shot at setup. Not a control loop: a live regulator will hunt, and
every correction invalidates the profile it was measured against.

Two more constraints that fall out of the optics:

- **Digital zoom is not free resolution.** It crops the sensor. While the crop stays larger than
  the output resolution you gain real pixels; past that point it is upscaling and gains nothing.
  The useful factor is `min(fill-the-frame, sensor_width / output_width)`.
- **Lens undistortion is zoom-dependent.** `data/lens/calib.npz` was solved at one zoom. The
  phone path does not undistort (`undistorted: false`, no calibration), so it is unaffected — but
  nothing may silently apply a calibration measured at a different zoom.

## Facts established elsewhere — do not re-establish

- `OpticsLock` freezes focus, exposure, white balance and zoom once the picture settles, and pins
  zoom to 1.0 (`camera/OpticsLock.kt`).
- `measuredBoardSize` derives `boardSize` from the corner quad, rounds to a multiple of 16 and
  clamps to 320…1280. Android already sizes its warp from the measurement; there is no
  board-size setting to remove.
- The model declares its input size (`infer_size`, specs/22) and the crop size follows it
  (`withCropSizeOf`, specs/23 phase 01).
- Crop box in warped pixels is `boardSize / 8 × (1 + 2·padSide)`; `padSide` defaults to 0.10.
- `resolutionMode` (AUTO/1080p/1440p/2160p) is a restart-required knob read in
  `TrackerService:221/263/288`.

## Out of scope

- Any change to `data/calibration/*.yaml` or to the Python rig's `board_size`. That is a
  re-slicing and retraining question (specs/23 phase 00 measured no inference-time benefit).
- Optical zoom / lens switching on multi-camera phones. Digital zoom on the bound camera only.
- Auto-panning or any attempt to correct board position. Framing only.
