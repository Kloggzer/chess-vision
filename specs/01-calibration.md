# Stage 1 — Calibration (`calibration.py`)

## Purpose

Determine the geometric relationship between the camera image and the board **once** and save it
as a reusable profile. As long as camera and board remain stationary, this profile
deterministically provides the 64 square crops for every subsequent frame.

## CLI

```
chesslab calibrate new      --camera 0 [--profile default] [--board-size 800]
chesslab calibrate check    [--profile default] [--camera 0]
chesslab calibrate list
```

- `new`: interactive creation of a new profile.
- `check`: live overlay of the 8x8 grid onto the camera image for visual inspection.
- `list`: show existing profiles in `data/calibration/`.

## Workflow of `calibrate new`

1. Open camera with `cv2.VideoCapture(camera_index)`. If no frame arrives: clear
   error message (see Edge Cases), exit code != 0.
2. Show live image in an OpenCV window. User presses `c` (capture) for a
   still image to click on (frozen image allows more precise clicking).
3. User clicks **four board corners in fixed order**: `a8, h8, h1, a1`
   (in the image: the upper outer corner of square a8 first, etc.). Each placed corner is
   shown as a point + order index. `u` = undo last point, `r` = reset.
4. Compute the **homography** `H` from the four image points and the four target points
   of a square with side length `board_size` using `cv2.getPerspectiveTransform`.
5. Ask/determine orientation: which physical side plays from "below" (White
   at bottom is default). Saved as `white_pov: true/false`.
6. Preview: warp the image with `H` and draw the 8x8 grid + square labels.
   User confirms with `s` (save) or discards with `q`.
7. Write profile as YAML to `data/calibration/<profile>.yaml`.

## Data Model — Calibration Profile (YAML)

```yaml
profile: default
created_at: "2026-06-25T20:00:00Z"
camera_index: 0
frame_size: [1280, 720]        # measured resolution of the source
board_size: 800                # side length of the rectified board square in px
image_corners:                  # clicked image points, order a8,h8,h1,a1
  - [x_a8, y_a8]
  - [x_h8, y_h8]
  - [x_h1, y_h1]
  - [x_a1, y_a1]
homography: [[...],[...],[...]] # 3x3, row-major
white_pov: true                 # White plays from the bottom edge of the image
crop:
  cell: 100                     # board_size / 8
  pad_up: 1.6                   # Crop height = cell * (1 + pad_up) extended UPWARD
  pad_side: 0.15                # lateral extension per side, * cell
  out_size: [96, 128]           # [W, H] of the saved square crops (H > W!)
```

### Notes on the `crop` block (critical)

- 3D pieces protrude upward in the image (toward the back rank). A strict
  100x100 cell crop would decapitate queens/kings. Therefore the crop is extended **upward**:
  height = `cell * (1 + pad_up)`, anchored at the **lower** edge of the square.
- `out_size` is intentionally **taller than wide** (e.g. 96x128) so the full piece
  fits. Training and inference pipelines must use exactly the same `out_size`.
- `pad_up`/`pad_side` are defaults; they can be overridden and re-evaluated in
  Stage 3 (`slice`) without re-capturing.

## Square Mapping (authoritative reference for all stages)

Implement a pure function that lives centrally (e.g. in `labeling.py`, used by Stage 1
only for preview):

```
def square_to_crop_box(square: str, profile) -> tuple[int,int,int,int]
    # square e.g. "e4" -> (x0, y0, x1, y1) in the rectified board_size image
```

Mapping rules in the rectified image (origin top-left):
- Column (file) `a..h` -> x-index `0..7`; row (rank) `8..1` -> y-index `0..7`.
- With `white_pov: true`, `a8` is top-left, `h1` is bottom-right (standard board image).
- With `white_pov: false`, map the board rotated by 180°.
- Base cell: `x0c = col*cell`, `y0c = row*cell`, then extend the crop upward/sideways
  according to `crop` and clamp to image boundaries.

## Acceptance Criteria (Definition of Done)

- `chesslab calibrate new` creates a valid YAML profile; a second invocation with the same
  `--profile` prompts before overwriting.
- `chesslab calibrate check` shows the grid cleanly aligned with the real
  squares; labels `a1`/`h8` appear at the positions expected by the orientation.
- `square_to_crop_box("a8", ...)` and `("h1", ...)` return boxes at the correct
  opposite corners (verified by unit test).
- Profile is loadable without a camera (pure YAML deserialization, for tests/Stage 3).

## Edge Cases

- Camera unavailable / wrong index -> error message with hint to try available
  indices; clean exit.
- On Windows, optionally allow `cv2.CAP_DSHOW` backend for more stable webcam opening
  (config flag).
- Fewer/more than 4 clicks before `save` -> block `save`, display a hint.
- Very oblique angle: warp preview may distort; that is okay as long as the grid
  fits. User decides visually.
