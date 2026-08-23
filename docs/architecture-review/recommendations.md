# Recommendations (prioritized)

Ordered by benefit-per-effort for the project goal "reliable move tracking".
References (C/H/M/L) → [issues-and-concerns.md](issues-and-concerns.md).
Training/data quality has its own roadmap: [training-accuracy-improvements.md](training-accuracy-improvements.md).

**Note (2026-08-20):** R4 and the web/`move_tracker` items in R7 are moot — the Python tracker and
the FastAPI/React layer went on 2026-08-07, `collect*`, `experiment.py`, `geometry3d.py` and
`photometric.py` on 2026-08-20. The training and dataset recommendations still stand.

---

## R1 — A canonical "frame → model-ready crops" facade (resolves C1, H4, parts of M5)

**What:** A public function in the core, e.g. in `labeling.py` or a new `serving.py`:

```python
def load_run(run_dir) -> (model, cfg)          # public, replaces _load_run imports
def crops_for_model(frame, corners, profile, run_cfg) -> list[np.ndarray]
    # applies geometry (warp/box3d) AND photometry AND out_size from the run config
```

`slice`, `web/inference.predict_arrays`, and the upcoming move_tracker CNN resync use only
this path.

**Why first:** This is the single point where an architecture defect directly costs model accuracy
(Train/Serve skew: photometry models currently deliver random outputs via `predict_arrays`).
Every further training improvement is worthless if inference sees different crops than training.
Effort: ~1 day.

## R2 — Safety-net tests for the dark subsystems (resolves C3)

**What:**
- `tests/test_move_tracker.py`: `normalize_diffs` (median baseline), `best_legal_move`
  (synthetic diff maps: simple move, capture, castling, ambiguity, "both endpoints must
  change"), voting behavior. All without camera — pure functions.
- Synthetic adapter test: check in example JSON (from a real render), verify corner order
  `[a8,h8,h1,a1]` and label derivation against known FEN.

**Why:** The detection algorithm has recently undergone heavy refactoring (rolling average, max_changed,
live_align) and will be refactored further (CNN recovery) — without tests every change is flying blind.
The corner test protects against the most expensive error of all (silent label rotation of the entire
synth dataset). Effort: ~1 day.

## R3 — Harden the web layer: locks, make errors visible, log handles (resolves H1, H2, H3)

**What:** One `threading.Lock` per state dict; replace `except Exception` with logging + error field in
the response (especially auto-slice `app.py:794,1008`); close train log handle after `Popen`;
`logging.basicConfig` in the web process. move_tracker: `_STATE` transitions under lock,
`stop()` with `join(timeout=2)`.

**Why:** Low effort (~½ day), eliminates the "why did it break and nobody says anything"
class of problems that consumes the most debugging time in a camera/subprocess system.

## R4 — Observer seam in move_tracker before the CNN integration (resolves M3)

**What:** Cut `_try_detect` so that candidate suppliers are swappable:
a frame-diff observer delivers `(move, score, second_score)`, an optional CNN observer delivers
occupancy deltas; a combination stage decides (diff primary, CNN as arbiter for
ambiguity/recovery). No big framework — two functions with the same signature suffice.

**Why:** The CNN recovery integration is imminent. Without a seam, `_try_detect` grows into a
second god module; with a seam, the CNN is a 30-line addition and individually testable (R2).

## R5 — Make split validation hard (resolves C2, supports the training roadmap)

**What:** `dataset split` fails (exit ≠ 0, clear message) when (a) a class occurs in only one
session, (b) the test split is empty, (c) train/val share the same piece-file assignment
(heuristically checkable via session FENs). Optional `--allow-degenerate` for conscious experiments.

**Why:** The warnings already existed and were (understandably) overlooked — the
result was weeks of bake-off runs with limited informative value. A hard error at the right
place is cheaper than any retrospective analysis.

## R6 — Make the synth pipeline reproducible (resolves H5, M from Issue 8/10)

**What:** Paths (`--blend`, `--pieces-dir`, `--out`) and resolution as arguments/config instead of
cwd-relative; a `synth/README.md` with the full command chain; optional
`chesslab synth render` subcommand as orchestration.

**Why:** According to the training roadmap, synth data is the leverage against data scarcity — therefore
generation must be repeatable, not dependent on operator memory.

## R7 — Medium-priority cleanup

- Extract `_resize_keep_aspect` from `labeling` → removes import cycle (M1).
- Pydantic models for `/api/train` and `/api/datasets` (M2); rest as needed.
- Split `web/app.py` into feature routers (train/collect/inference/scan) — only makes sense
  once R3 has introduced state locks.
- Move label→FEN helpers from `web/app.py:60–84` to `labeling`/`config` (M5).
- Move move_tracker to `src/chesslab/move_tracker/` + CLI subcommand once it leaves prototype
  status (M4). Add `live_align`/`avg_frames`/`max_changed` to the README parameter table.

## Consciously NOT recommended (now)

- **SSE/WebSockets instead of polling** (L1): extra effort without noticeable benefit in local operation.
- **OpenAPI client generation** (L2): only worthwhile once the API is stabilized.
- **Async refactor of FastAPI handlers:** The blocking operations already run in subprocesses/
  threads; an async refactor would be cosmetic with regression risk.
- **Continue debugging factored head:** empirically inferior; re-evaluate only after data expansion
  (see training roadmap P6).
