# Phase 03 — Write down what the camera actually delivers

**Blocked by 00 (its verdict is the content). Runs in parallel with 02 — no shared files.**
**Docs only. Do not touch a line of code.**

## Why

Three facts were learned on 2026-07-29 and none is derivable from the repo:

1. **Feeding the network more pixels than the crop actually carries costs accuracy.** The
   multi-scale GroupNorm champion `occ-v4-f3e20` reads 43 occupied squares as empty at 128 px and
   **19 at 96 px**, both at zero phantoms, measured on crops cut straight from the frames.
2. **The sensor's resolution never reaches the model — `profile.board_size` does.** The warp goes
   through `board_size` first, and `data/calibration/phone.yaml` has `board_size: 800`,
   `pad_side: 0.05`. So every crop arrives as a **110 px box**, from either session, and 128 px
   upsamples. A 4K session at 173 px/square loses **42%** of its linear resolution at that warp,
   while `config.DEFAULT_BOARD_SIZE` is 1600. The deployment quantity is
   `board_size / 8 × (1 + 2·pad_side)`.
3. **Each split is one session**: test `20260708-021722` (96.9 px/square at the sensor, 74 boards),
   val `20260721-212830` (173.2, 78 boards). Every "real holdout" number this project has quoted is
   a number about one camera framing — and val is not even a clean holdout, because `best.pt` is
   selected on it at 128 px (`training/train.py:402-403`).

Facts 2 and 3 are the ones that will bite someone. Both are invisible in `split.json` and in every
doc, and together they bound what any "real test accuracy" means. **Fact 2 supersedes the sensor
framing** that `entry.md` was originally written on — write 2, not the stale version.

## Design (decided — do not redesign)

Four edits, each in the place a reader is actually standing when they need the fact. Take the
numbers from `STATUS.md` (phase 00's verdict and table), **not** from this file — if they differ,
phase 00's measurement wins and this file is stale.

### 1. `docs/data-pipeline.md` — a section, the real home

`CLAUDE.md` already sends everyone here: *"Read this before touching anything under `data/`."*
Add a section **"Resolution: what the camera delivers, and what the net is fed"** covering:

- how to compute a session's native resolution (the corner quad in `data/sessions/<id>/log.jsonl`,
  mean edge length / 8), with the one-liner — **and that it is not what the model sees**;
- the crop-box chain, which is: `board_size / 8 × (1 + 2·pad_side)` → resized to `infer_size`. With
  the two live values: profile `phone` at 800 → 110 px, Android at 1600 → 220 px;
- the per-session table from `STATUS.md`, marked with which split each session **is**, and that val
  doubles as the checkpoint-selection set;
- that crops are built at 128 (`out_size`) and served at `infer_size`, and why those are two
  different things;
- that an **untrained** size fails silently — 80 px costs the champion 133 misses against 96 px's
  19 — so `infer_size` must be one of the run's `scales`;
- the trap in plain words: a test split that is one session measures one framing, through one
  profile's `board_size`.

### 2. `CLAUDE.md` — one bullet under "Known pitfalls (still true)"

Next to the existing *"Judge a session by unique crops, not size"* bullet, which already talks
about px/square and is where a reader will look:

> **What the model sees is `board_size`, not the camera.** The warp goes through
> `profile.board_size` first (800 on the rig → a 110 px crop box, 1600 on Android → 220), so 128 px
> upsamples here and a 4K session loses 42% of its resolution at that warp. The champion goes
> 43 → 19 misses served at 96 instead of 128. The size is a per-model key (`infer_size`) and must be
> one of the run's `scales` — an untrained 80 px costs 133 misses, silently. And note what the
> splits are: test is one session, val is one session *and* the checkpoint-selection set.

Keep it to that length. `CLAUDE.md` is an index, not a report.

### 3. `README.md` — the export command

Wherever `chesslab export` is documented (`grep -n "chesslab export" README.md`), state that the
graph is exported at the model's `infer_size` and that the key is how a model's serving resolution
is changed. One or two sentences.

### 4. `docs/architecture-review/architecture-overview.md` — the component map

If the map names the crop size or the model input anywhere
(`grep -n "128\|out_size" docs/architecture-review/architecture-overview.md`), correct it to
distinguish build size from inference size. If it names neither, **change nothing** — do not
invent a new box for it.

## Steps

### 1. `docs/data-pipeline.md` — commit `docs(data): what the camera delivers vs what the net is fed`

### 2. `CLAUDE.md` + `README.md` — commit `docs: infer_size is a per-model key; the splits are single sessions`

### 3. `docs/architecture-review/architecture-overview.md` — commit `docs(arch): separate crop size from inference size` — **skip this commit entirely if the grep above finds nothing.**

## Tests

None — documentation. Verify by grep (below), not by test.

## Acceptance criteria

- `grep -n "px/square" docs/data-pipeline.md` hits, and the section contains the session table.
- `grep -n "infer_size" CLAUDE.md README.md docs/data-pipeline.md` hits in all three.
- `grep -rn "96.9\|173.2" docs/` hits — the split-is-one-session fact is written down with its
  numbers, not paraphrased away.
- Every number in the new text matches `specs/22-inference-resolution/STATUS.md`. State in your
  report that you checked this, and against which line.
- No file outside `docs/`, `README.md` and `CLAUDE.md` is modified: `git status --short` shows
  nothing else.

## Do NOT / out of scope

- Do not touch code, tests, assets, or `specs/` files other than appending to `STATUS.md`.
- Do not restate phase 00's numbers from this spec file if `STATUS.md` disagrees — the measurement
  wins and the disagreement is a discrepancy to record.
- Do not document the 4-crop verify batch or the BatchNorm/GroupNorm comparison. Both are real
  findings and neither is this pack's subject; a pointer sentence at most.
- Do not rewrite the specs under `specs/18`–`specs/21`. They are historical records of what was
  believed at the time.
