# Phase 01 — mine `hard_occupied`: the crops the model reads as empty

> Established pattern to mirror **exactly**: `scripts/mine_hard_empty.py`,
> `data/manifests/hard_empty.jsonl`, and the build wiring at
> `src/chesslab/dataset_build.py:299-307` → `src/chesslab/dataset.py::subsample_classes` `:90`.
> Read all three before writing a line of code. This phase is the mirror image of an existing
> mechanism; inventing a new one is a review failure.
>
> **This phase needs no GPU.** Mining is offline CPU inference over crops that already exist,
> plus a manifest write. Together with phase 00 it is the cheap half of this pack, and the
> two of them decide how much the expensive half in phase 02 has to do.

## Why

The dominant error is **piece → empty**: 8 826 misses against 226 phantoms across 87 424
confident square reads. That is not a diffuse weakness — the same squares fail over and over
(`f4` in 90 of 186 observations, `g1` in 42 of 42), which is the signature of a small, rare,
systematic slice of input space that the training set under-represents.

The repo already has the machinery for exactly this problem, built for the opposite
direction. `mine_hard_empty.py` was written in 2026-07-21 after the deployed model read the
empty dark square `h6` as `bB`: it scans real crops, finds the ones the deployed model
confidently gets wrong, writes them to a manifest, and the dataset build protects them from
the random class cap that would otherwise throw away precisely the rare hard cases. It
worked, and the pattern is understood.

Nothing mines the other direction. Occupied crops that the model reads as `empty` — the
error that actually costs moves — are invisible to the build and get sampled away like any
other pawn crop. This phase closes that gap.

## Files you own

| File | Contains |
|---|---|
| `scripts/mine_hard_occupied.py` | the offline miner over `squares.jsonl` (mirror of `mine_hard_empty.py`) |
| `android/app/src/test/kotlin/com/chesslab/tracker/sim/HardOccupiedExport.kt` | the harness-side crop exporter (new file) |
| `android/app/src/test/kotlin/com/chesslab/tracker/sim/CnnClipSimulationTest.kt` | the opt-in flag that turns the exporter on |
| `android/app/src/test/kotlin/com/chesslab/tracker/sim/ObsAudit.kt` | expose the per-observation miss list to the exporter (additive only) |
| `src/chesslab/dataset_build.py` | the priority-path wiring (extend `:299-307`) |
| `src/chesslab/dataset.py` | `subsample_classes` priority handling for the **piece** cap |
| `tests/test_dataset.py` | build-wiring tests |
| `specs/18-occupancy-model/STATUS.md` | your row + the mined counts |

You own **nothing else**. `mine_hard_empty.py`, `hard_empty.jsonl`, the engine, the training
code and every parity fixture are foreign.

## Design (decided — do not redesign)

### Two sources, one manifest

`data/manifests/hard_occupied.jsonl` is the single output, fed by two miners. They answer
different questions and the `source` field keeps them separable forever.

**Source A — the harness (primary).** The clip harness already knows the ground-truth FEN per
frame and already computes, per observation, exactly which squares the model got wrong and in
which direction (`ObsAudit.add`: `if (want) misses += 1 else phantoms += 1`). Export the crop
for every **miss** (`want == true`, `obs.occupied(sq) == false`) on a frame whose label is not
`occluded`. These are the failures that provably cost committed moves in the recorded
regressions.

> **Caveat that must be written into the manifest and into `STATUS.md`:** clip crops carry
> only ~**31 real pixels per square**. They are the crops on which the failure was *measured*,
> but they are a lower-resolution domain than a phone at 1080p (~112 px/square) or the user's
> real captures (~200 px/square). Tag them `source: "clip"` so any later analysis can weight,
> subset or exclude them. Do **not** silently blend them into the real pool.

**Source B — `squares.jsonl` (the exact `hard_empty` mirror).** `scripts/mine_hard_occupied.py`
scans **non-`empty`** rows of `data/manifests/squares.jsonl`, runs the deployed model, and
keeps every crop whose predicted class is `empty` with confidence ≥ `--conf-thr`. This is
`mine_hard_empty.py` with the label filter inverted, and it reads the **real camera** crops —
the domain that matters. Reuse `mine_hard_empty.py`'s `is_camera_session` / `_CAMERA_SESSION_RE`
guard and its `--include-synthetic` opt-out **verbatim in spirit**: the 2026-07-21 incident
where 697 of 786 "hard empties" turned out to be obsolete ~51 px/square synth renders is
recorded in that file's own docstring, and the identical trap exists here. Default OFF.
Skip `mm://` rows (fused synth packs have no files on disk).

### Manifest schema

One JSON object per line, keys in this order, matching `hard_empty.jsonl` field-for-field
where the fields mean the same thing:

```json
{"path": "data/squares/wB/20260706-130834_0044_f4.png", "label": "wB", "pred": "empty",
 "conf": 0.93, "session_id": "20260706-130834", "square": "f4", "square_color": "dark",
 "run": "tiny-p3", "source": "squares"}
```

- `path` — repo-relative POSIX path, **the join key** into `squares.jsonl`. It is what
  `priority_paths` matches on; a path that is not in the crop manifest is dead weight.
- `label` — the true class from the FEN (any of the 12 piece classes; never `empty`, never
  `occluded`).
- `pred` / `conf` — what the deployed model said. For source A, `pred` is `"empty"` and
  `conf` is `p_empty / (p_occ + p_empty)` — the renormalised 2-way confidence, so the number
  is comparable across a 14-class and a 2-class model (phase 00's rule; use the same
  denominator).
- `source` — `"squares"` (source B) or `"clip"` (source A). **Required.**
- Source A additionally carries `clip` (the clip name) and `frame` (the frame index), and its
  `session_id` is the synthetic id `clipsim-<clip>`. It must NOT reuse a real session id —
  a per-session split (entry.md constraint 4) would then mix rendered and real frames into
  one split unit.
- Merge is **de-duplicated by `path`**, newest write wins, exactly as `mine_hard_empty.py`
  merges. `--out` defaults to `data/manifests/hard_occupied.jsonl`.

### Export path (source A)

Clip crops do not exist on disk; the harness makes them in memory. Write them under
`data/squares_hard/<clip>/<frame>_<square>.png` — a **separate tree**, never into
`data/squares/`, so the real crop pool stays exactly what `slice` produced and a bad export
is one `rm -rf` away from undone. `data/**` is gitignored (CLAUDE.md), so nothing lands in
the repo.

The exporter is **opt-in** and off by default:
`-Pchesslab.sim.exporthard=data/squares_hard`. An ordinary harness run must be
byte-identically unchanged, and `CnnClipSimulationTest` must stay a pure measurement when
the flag is absent.

### Size cap

**5 000 rows total, hard.** Both miners take `--limit` / a Kotlin equivalent, both default to
2 500 per source, and the merge refuses to write past 5 000 with a loud `[FAIL]`.

The cap is not arbitrary. `hard_empty.jsonl` protects 89 real crops against 219 849 `empty`
rows — a homeopathic, deliberately surgical set. `priority_paths` **bypasses the random cap**,
so an unbounded hard set silently becomes the training distribution: mine 50 000 misses and
you have replaced a balanced dataset with a hard-example-only one, which is a documented way
to destroy calibration. When a source overflows, keep the **highest-confidence** misreads
(`conf` descending) — the crops the model is most confidently wrong about are the ones worth
the budget.

### Build wiring

`dataset_build.py:299-307` currently builds `priority_paths` from `hard_empty.jsonl` alone.
Extend it to read both manifests and pass the **union**, keeping the existing print line and
adding a symmetric one:

```
[i] hard-empty keep list: N crops protected from the empty cap
[i] hard-occupied keep list: M crops protected from the piece cap
```

`build_dataset`'s return dict gains `"hard_occupied_protected": M` beside the existing
`"hard_empty_protected"`.

**The important part — `subsample_classes` needs the mirror it does not have yet.** Today
(`dataset.py:112-127`) `priority_paths` is honoured **only** inside the `empty` bucket; the
piece cap (`max_class_ratio`, applied at `:118-124`) samples randomly with no protection at
all. A mined hard-occupied crop would therefore be capped away by exactly the mechanism it
exists to survive. Add the same three-line pattern to the piece branch:

```python
if piece_cap is not None and len(v) > piece_cap:
    if priority_paths:
        hard = [r for r in v if r.get("path") in priority_paths]
        rest = [r for r in v if r.get("path") not in priority_paths]
        fill = max(0, piece_cap - len(hard))
        v = hard + (rng.sample(rest, fill) if len(rest) > fill else rest)
    else:
        v = rng.sample(v, piece_cap)
```

Same deliberate overshoot semantics as the empty branch (if the hard set alone exceeds the
cap, all of it is kept — "they are the point"), same docstring language. Extend the existing
docstring rather than writing a second paragraph that says the same thing twice.

**One `priority_paths` set, not two.** A path is either protected or not; which manifest it
came from is recorded in the manifest, not in the build. Do not add a second parameter.

## Steps

### 1. Python miner — commit `feat(scripts): mine_hard_occupied — real crops the model reads as empty`

### 2. Build wiring — commit `feat(dataset): hard_occupied keep list survives the piece cap`
`dataset_build.py` union + counter; `dataset.py::subsample_classes` piece-branch protection
and docstring.

### 3. Build tests — commit `test(dataset): mined hard crops survive both the empty and the piece cap`

### 4. Harness exporter — commit `test(android): export hard-occupied clip crops from the simulation audit`
`HardOccupiedExport.kt`, the `ObsAudit` accessor, the opt-in flag.

### 5. Mine and record — no commit
Run both miners against `data/models/tiny-p3` at the phase-00 adopted threshold. Record the
counts, the class breakdown, the top offending squares and the source split in `STATUS.md`.
`data/**` is gitignored — the manifest itself is **not** committed, exactly as
`hard_empty.jsonl` is not.

## Tests

**Python** (`tests/test_dataset.py`, appended):

| Test | Guards |
|---|---|
| `test_hard_occupied_survives_piece_cap` | a piece class far over `max_class_ratio`, one row in `priority_paths` → that row is in the output. The core of this phase. |
| `test_hard_empty_still_survives_empty_cap` | the existing behaviour is untouched. Regression floor. |
| `test_priority_overshoot_keeps_all_hard_rows` | more hard rows than the cap → all kept, deliberately over the cap. |
| `test_no_priority_paths_is_pure_random_cap` | `priority_paths=None` reproduces the old sampling **for the same seed**, byte for byte. Determinism floor. |
| `test_build_reports_both_keep_lists` | `build_dataset`'s return dict carries both counters. |

`uv run pytest -q tests/test_dataset.py`

**Miner** — a small unit test (or a `--dry-run` self-check) proving:
the label filter selects non-`empty` rows only; `mm://` rows are skipped; synthetic sessions
are excluded unless `--include-synthetic`; the merge de-duplicates by `path`; the cap keeps
the highest-`conf` rows.

**Kotlin** — `HardOccupiedExportTest`: with the flag absent, zero files are written and the
`SimResult` is unchanged; with the flag set and a stub audit carrying two misses, exactly two
PNGs and two manifest lines appear, both tagged `source: "clip"` with a `clipsim-` session id.

`.\gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.sim.HardOccupiedExportTest"`

## Acceptance criteria

- `grep -n "hard_occupied" src/chesslab/dataset_build.py` hits ≥ 2 (read + counter).
- `grep -n "priority_paths" src/chesslab/dataset.py` hits inside the **piece** cap branch,
  not only the empty branch — verify by line number against `subsample_classes`.
- `python scripts/mine_hard_occupied.py --help` runs and lists `--run`, `--source`,
  `--conf-thr`, `--limit`, `--out`, `--include-synthetic`, `--montage`.
- The miner produces a **montage PNG** of the worst offenders, as `mine_hard_empty.py` does.
  Per the memory note *"Immer Probe liefern"*, a mining change ships a visual probe: the user
  iterates visually and must be able to see what the model failed to see.
- Every emitted line validates against the schema above, including a non-empty `source`.
- Total rows ≤ **5 000**; the merge fails loudly past it.
- `uv run pytest -q` green apart from the 3 pre-existing `tests/test_camera.py` failures;
  `uv run ruff check src tests scripts` clean.
- `:app:testDebugUnitTest` green; `:app:ktlintFormat` then `:app:detekt` clean.
- An ordinary harness run **without** `-Pchesslab.sim.exporthard` writes no files and reports
  the same numbers as before this phase — quote both, before and after, in `STATUS.md`.
- `.\gradlew.bat :core-engine:test` green, `ClipReplayParityTest` **18/18, zero diverging
  frames** (nothing here touches the diff path).
- `STATUS.md` records: rows mined per source, the true-class breakdown, the top-10 offending
  squares, the size-cap outcome, and one sentence on the ~31 px/square limitation of the
  `source: "clip"` rows.

## Do NOT

- Do NOT write mined crops into `data/squares/`. Separate tree, always.
- Do NOT reuse a real `session_id` for clip-derived rows — that corrupts the per-session split
  (entry.md constraint 4) by mixing rendered and real frames into one split unit.
- Do NOT drop the `source` field or merge the two miners' output into an untagged pool. The
  2026-07-21 incident (697 of 786 "hard empties" were obsolete synth) happened because the
  origin was not recorded.
- Do NOT scan synthetic sessions by default. Default OFF, exactly as `mine_hard_empty.py`.
- Do NOT raise or remove the 5 000 cap because "more data is better". `priority_paths`
  bypasses the balance mechanism; an unbounded hard set *becomes* the distribution.
- Do NOT add a second `priority_paths` parameter, a per-source weight, or a new cap knob.
  One set, one cap, one code path.
- Do NOT modify `scripts/mine_hard_empty.py` or `data/manifests/hard_empty.jsonl`.
- Do NOT retrain anything in this phase. Mining produces a manifest; phase 02 consumes it.
- Do NOT commit anything under `data/` — it is gitignored and stays that way.
