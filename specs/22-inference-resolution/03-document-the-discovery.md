# Phase 03 — Write down what the camera actually delivers

**Blocked by 00 (its verdict is the content). Runs in parallel with 02 — no shared files.**
**Docs only. Do not touch a line of code.**

## Why

Two facts were learned on 2026-07-29 and neither is derivable from the repo:

1. **Feeding the network more pixels than the camera produced costs accuracy.** The multi-scale
   GroupNorm champion `occ-v4-f3e20` reads 43 occupied squares as empty at 128 px and 18 at 96 px,
   both at zero phantoms, on the same crops.
2. **The entire test split is one session at 96.9 px/square** (`20260708-021722`), and the val
   split is one session at 173.2 px/square (`20260721-212830`). Every accuracy number this project
   has quoted for a real holdout is a number about one camera framing.

Fact 2 is the one that will bite someone: it is invisible in `split.json`, it is not in any doc,
and it silently bounds what any "real test accuracy" means.

## Design (decided — do not redesign)

Four edits, each in the place a reader is actually standing when they need the fact. Take the
numbers from `STATUS.md` (phase 00's verdict and table), **not** from this file — if they differ,
phase 00's measurement wins and this file is stale.

### 1. `docs/data-pipeline.md` — a section, the real home

`CLAUDE.md` already sends everyone here: *"Read this before touching anything under `data/`."*
Add a section **"Resolution: what the camera delivers, and what the net is fed"** covering:

- how to compute a session's native resolution (the corner quad in `data/sessions/<id>/log.jsonl`,
  mean edge length / 8), with the one-liner;
- the per-session table from `STATUS.md`, marked with which split each session **is**;
- that crops are built at 128 (`out_size`) and served at `infer_size`, and why those are two
  different things;
- the trap in plain words: a test split that is one session measures one framing.

### 2. `CLAUDE.md` — one bullet under "Known pitfalls (still true)"

Next to the existing *"Judge a session by unique crops, not size"* bullet, which already talks
about px/square and is where a reader will look:

> **Feeding more pixels than the camera produced costs accuracy.** The rig delivers ~97 px/square;
> the champion loses 43 → 18 misses when served at 96 instead of 128. The size is a per-model key
> (`infer_size` in the run's `config.json`), not an app constant. And note what the splits are:
> test is one session at 96.9 px/square, val one at 173.2 — a real-holdout number is a number
> about one framing.

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
