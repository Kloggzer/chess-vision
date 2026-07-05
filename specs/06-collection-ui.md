# Stage 6 — Collection-UI: Training Data Assistant (`collect_ui.py`)

## Purpose

When capturing training data, the user lacks an overview: Which classes are
already well covered? Which piece types are almost completely missing? On which
square colors has a piece never been seen? This stage extends the `collect` loop
(Stage 3) with a **second OpenCV window** — a live dashboard that continuously
answers these questions and proactively suggests the next positions.

No new mandatory dependency. No separate process. The window opens next to the
existing camera window as soon as `--ui` is passed.

## Dependencies on other stages (important)

- **Stage 2 (`state.py`):** Coverage is derived from the FEN — via the same
  label logic (`label_for` / the central mapping). Stage 6 does **not** invent its own
  label mapping.
- **Stage 3 (`collect.py`):** Provides the data source (session logs, see below) and the
  loop into which the dashboard is hooked.
- **Stage 4 (`split.json`):** Optional, only for the standalone view.
- **Independent of Stage 5.** Stage 6 can be built directly after Stage 4; it is used
  during *collection*, long before training.

## Data Source — Session Logs, NOT the Manifest (critical)

`collect` writes **only** raw frame + FEN per confirmed position to `log.jsonl`
(Stage 3, Part 1). The labeled manifest `squares.jsonl` is created **only later** by
`slice` (Stage 3, Part 2). During a running `collect` session, the positions
just captured therefore do **not yet exist** in the manifest.

That is why the dashboard computes coverage **directly from the session logs**:

- For each line in each `data/sessions/<id>/log.jsonl`: take the FEN, derive the 64
  square labels via the central mapping (Stage 2), compute `square_color` for each square
  deterministically (`(file_idx + rank_idx) % 2`).
- Aggregate across all sessions → counts per class and per (class × square color).

This yields **exactly** the same numbers that a later `slice` would produce (each
logged position = 64 crops), but is available **immediately during capture**. This way
coverage updates right after each capture.

> The manifest (`squares.jsonl`) is **optionally** read as a secondary source if it
> exists — only in standalone mode (`chesslab ui`) after a `slice`, to sanity-check
> already-sliced crops against the log-derived data. For the live view,
> the session logs are authoritative.

## CLI

```
chesslab collect pgn  ... [--ui] [--target 200]
chesslab collect live ... [--ui] [--target 200]
```

`--ui` activates the dashboard window. `--target N` sets the target number of samples per
non-`empty` class (default from `config.py`, see below). Without `--ui` the behavior is
**bit-identical** to Stage 3 — no behavioral change to the capture logic.

Additionally, the dashboard is available standalone to inspect the current state
**without** a running capture:

```
chesslab ui [--sessions data/sessions] [--manifest data/manifests/squares.jsonl]
```

Standalone aggregates across **all** session logs (same derivation as above).
`--manifest` is optional and informational only.

## Configuration (config before code)

All thresholds live in `config.py` (or YAML), not hardcoded in the rendering code:

```python
ui_target_per_class: int = 200     # Target per non-empty class (= stats threshold Stage 4)
ui_empty_target_ratio: float = 1.5 # empty target = ratio * largest piece class (cf. max-empty-ratio)
ui_warn_frac: float = 0.5          # < 50 % target -> red, 50-99 % -> yellow, >= 100 % -> green
ui_total_target: int = 5000        # Total crop target for the progress bar (Area A)
```

`--target` overrides `ui_target_per_class` at runtime.

## Window Layout

Fixed OpenCV canvas (e.g. 900×700 px), re-rendered after each captured position. Four areas:

```
┌─────────────────────────────────────────────────────┐
│  SESSION PROGRESS                            [Area A] │
│  Sessions: 3 | Frames: 47 | Derived Crops: 3 008     │
├───────────────────────┬─────────────────────────────┤
│  CLASS COVERAGE        │  LIGHT/DARK MATRIX   [Area C] │
│  [Area B]              │                              │
├───────────────────────┴─────────────────────────────┤
│  NEXT RECOMMENDED POSITION                  [Area D] │
│  FEN: … | Reason: bQ missing on light squares        │
└─────────────────────────────────────────────────────┘
```

### Area A — Session Progress

- Number of sessions, logged frames, total derived crops from them (frames × 64).
- Current mode (PGN / Live) and session ID (during live operation).
- Progress bar toward `ui_total_target`.

### Area B — Class Coverage (Bar Chart)

13 horizontal bars in the canonical order from `config.py`:

```
empty  ████████████████████ 1840
wP     ████████             320
wN     ██                    80  ← WARN
…
```

- Bar width relative to `ui_target_per_class`.
- Color: **green** ≥ 100 %, **yellow** `ui_warn_frac`–99 %, **red** < `ui_warn_frac`.
- `empty` is separate with its own target (`ui_empty_target_ratio` × largest piece class) and
  light blue color — visually distinct because `empty` dominates the statistics.

### Area C — Light/Dark Matrix

Compact 13×2 table: each class × {light, dark}. The columns correspond to the
manifest values **`light`** and **`dark`** from Stage 3.

```
       light  dark
empty   ✓      ✓
wN      ✓      ✗  ← missing (light=ok, dark=0)
wB      ✗      ✓  ← missing
…
```

- ✓ (green) when ≥ 1 sample of this (class × square color).
- ✗ (red) when no samples. A stronger signal than the bare count: a piece learned on only one
  square color will systematically misrecognize the other in real operation.

### Area D — Recommended Next Position

One-line recommendation plus a FEN for `collect live --start-fen`:

```
Recommendation: wN missing on dark square, bQ < 50 %
FEN: r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 6
[Press g: copy FEN to clipboard]
```

**Recommendation logic (deterministic, prioritized — no randomness, no seed needed):**
1. (Class × square color) with ✗ (missing square-color coverage) → highest priority.
2. Class below `ui_warn_frac` of the target number.
3. Class below 100 % of the target number.

**FEN Generation (requirements):**
- The FEN must place the sought piece on a square of the **specifically missing square color**
  (for priority 1). A piece on the wrong square color does not fill the gap.
- The FEN must be **structurally valid** (exactly one king per color, no pawns on
  rank 1/8, plausible piece counts) — otherwise `chess.Board`/`--start-fen` rejects it.
- Recommended implementation: a small **static library** of pre-verified template FENs per
  (class × square color) in `collect_ui.py`. No runtime search logic, therefore
  deterministic and testable. Alternatively, programmatic generation via `chess.Board.set_piece_at`
  on a defined skeleton, followed by `is_valid()` check.

> The FEN is a suggestion, not a command. The user physically sets up the position and
> triggers capture as usual.

## Key Binding (a single key loop — important)

OpenCV HighGUI has **one** global `waitKey` loop; key presses cannot be
assigned to a specific window. Therefore:

- The dashboard window is **purely display-only** and processes **no** keys of its own.
- The existing `collect` key loop (Stage 3) remains the sole key owner and gains
  **one** additional key:
  - `g` = copy the recommended FEN from Area D to the clipboard (via `pyperclip`,
    optional). If `pyperclip` is missing → WARN at startup, `g` is a no-op.
- No `q` collision: `q` retains its Stage 3 meaning (end session) and closes
  **both** windows. There is no separate "close dashboard" key.

In standalone mode (`chesslab ui`) there is only one window; there `q` exits the view
and `g` copies the FEN.

## Integration into `collect`

The dashboard is an optional module — `collect.py` imports `collect_ui.py` only when
`--ui` is set. Minimal interface:

```python
# collect_ui.py
class CollectDashboard:
    def __init__(self, sessions_dir: Path, target_per_class: int = 200): ...
    def update(self) -> None:
        """Re-aggregate session logs and re-render window. Call after each capture."""
    def recommended_fen(self) -> str | None:
        """Currently recommended FEN (for key g in the collect loop)."""
    def close(self) -> None: ...
```

`collect.py` calls `dashboard.update()` after every written log entry (including after
`undo`). The dashboard holds **no** in-memory state that would need to be kept consistent
with the loop — it reads the logs fresh on every `update()`.

## Rendering Details

Everything with `cv2` primitives (`cv2.rectangle`, `cv2.putText`, `cv2.line`). No external
plot libraries.

- Background dark gray; font `cv2.FONT_HERSHEY_SIMPLEX`, size 0.45–0.55.
- Window position next to the camera window (`cv2.moveWindow`).
- `cv2.WINDOW_NORMAL`, fixed base canvas size.

## Acceptance Criteria (Definition of Done)

- `chesslab collect live --ui` opens a second window; **after each capture** the
  class coverage changes visibly — and this happens **before** any `slice`, because the numbers come
  from the session logs (FEN→label), not from the manifest.
- Bar colors (green/yellow/red) match `ui_warn_frac`; light/dark matrix
  shows ✗ correctly for (class × square color) with no samples.
- The recommendation (Area D) names the class/square color with the worst coverage;
  the output FEN contains that piece on the **correct** square color and is
  `chess.Board`-valid (unit test).
- `chesslab ui` opens the dashboard standalone and aggregates across all session logs,
  even if **no** `slice` has been run yet.
- Without `--ui`, `collect` is bit-identical to Stage 3 (regression smoke test).
- `pyperclip` missing → clean WARN, key `g` is a no-op, no exception.

## Pitfalls

- **Manifest ≠ live state:** The manifest grows only during `slice`. The live coverage
  **must** come from the session logs, otherwise the dashboard will not show the
  positions just captured.
- **No session yet:** no logs → "0 Crops", all classes red. Correct and
  helpful, not an error.
- **Single key loop:** Do not try to separate keys per window — the dashboard is
  display-only, the collect loop owns the keyboard.
- **Square color of the recommendation:** A recommended FEN that places the piece on the wrong
  square color does not fill the ✗ gap — priority 1 must hit the color.
