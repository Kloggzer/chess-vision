# 21 — Give the observation piece identity back, so the alarm can fire again

> Entry file for the spec pack. Every implementing agent reads **this file completely**, then exactly
> the phase file assigned to it. Python (`src/chesslab/move_tracker/tracker.py`) is the source of
> truth for tracker behaviour; the Kotlin engine is a 1:1 port and must stay one.

## What this is

The illegal-move alarm — the thing the user names as what *"hatte das Spiel wesentlich beruhigt auf
dem PC"* — **cannot fire on the shipped model, and has not been able to since specs/18.**

```python
# tracker.py:1966 — the ONLY escalation into _raise_alarm from the detection path
if (self._alarm is None and getattr(snap.obs, "label", None) is not None
        and guess_illegal_move(self.board, snap.obs, self.cnn_conf_thr)):
    self._raise_alarm(snap.obs, conflicts)

# cnn_recovery.py:440 — and the guess itself
if obs.label is None or obs.conf is None:
    return None
```

`occ-r3s-f3` — like **all 25 `occ-*` runs** — is 2-class `["empty", "occupied"]`. So `obs.label` is
always `None`, `guess_illegal_move` always returns `None`, and `_raise_alarm` is never reached.
Dead with it: `board_matches_identity`, `derive_moves_identity`, `guess_illegal_move`.

**The system kept the half that invents a legal story and lost the half that stops and asks.**
Recovery needs occupancy only, so it kept working; the alarm needs identity, so it went silent. That
is the shape of the 2026-07-28 runaway, where one played game became four stored fragments full of
captures that were never played.

### Why identity, and not another threshold — measured

Spec 20 phase 00 tried the threshold route and killed it with numbers (`specs/20-recovery-honesty/STATUS.md`):

- Of 20 accepted recovery sequences, **0 were inferred from absence**; the drafted rule would have
  rejected nothing.
- Structurally it cannot work on occupancy alone: a non-en-passant capture leaves its destination
  occupied **before and after**, so "destination confidently occupied" reads identically for a real
  capture and a fabricated one. The only occupancy signal a capture emits is at its **origin** — the
  absence one must distrust.
- Against the miss-heavy `occ-r3bn2-f3` the recovery invents `Nxe4` whose evidence profile is
  **indistinguishable** from four correct captures.

**Identity is the one axis on which a capture is readable.** That is what this pack restores.

### The architecture already exists — this pack does not invent it

- `model.py:373` — `HierarchicalHead`, a two-stage **occupancy → piece** head, selectable today with
  `chesslab train --head twostage`.
- `cnn_recovery.OccupancyObservation` already carries optional `label` / `conf`, and its own
  docstring states the design: *"Occupancy is derived from identity; identity makes it possible to
  distinguish captures/promotions … and to reliably separate shadows from real moves."*

What is missing is a trained two-stage run, an export that carries both outputs, and the Android
side filling `label`/`conf`.

## The safety property — binding on every phase

**Identity may never decide a commit.** Occupancy stays the accept/reject axis for the verify ladder,
the pair verify and recovery, exactly as today. Identity feeds **only**:

- `guess_illegal_move` → the alarm's "name a move" test,
- and, if phase 03's measurement supports it, `board_matches_identity` for the shadow separation.

Rationale, and it is not negotiable: specs/18 moved to occupancy because piece **type** accuracy was
0.46–0.59 while occupancy was ~0.99. Identity does not need to be good here. It needs to be
**right when it is confident** — and the alarm already gates on `label_confident(conf_thr)`.

## Phases

| Phase | File | Concern | Depends on | Scope |
|---|---|---|---|---|
| 00 | `00-is-identity-good-enough.md` | **Measure** confident-identity precision on real holdout crops, using runs that already exist. No training. **Gates the pack.** | — | `specs/21-*/STATUS.md`, `scratch/` |
| 01 | `01-twostage-model.md` | Train `--head twostage` on `occ-real3`; occupancy must not regress against `occ-r3s-f3`. | **00** | `src/chesslab/training/**`, `data/models/<new run>/` |
| 02 | `02-identity-on-device.md` | Export 14 logits; Python + Kotlin fill `label`/`conf`; measure the inference cost. | **01** | `src/chesslab/training/evaluate.py`, `.../move_tracker/**`, `android/core-cnn/**`, `android/app/.../cnn/**`, `android/core-engine/**` |
| 03 | `03-prove-the-alarm.md` | Prove the alarm fires on material where it should, and that recovery/commit behaviour is unchanged. | **02** | tests + `specs/21-*/STATUS.md` |

**This pack is sequential.** Each phase's output is the next one's input; none may start early. 00 is
cheap and decisive — if confident-identity precision is too low, **the pack stops there** and the
alarm needs a different mechanism entirely.

## Protocol for implementing agents

- **Branch:** `spec-21-identity-for-the-alarm`, from `spec-20-recovery-honesty` HEAD. Never `main`.
- **Trust the code over the spec.** Line numbers drift; correct them in STATUS.md, never silently.
- **If blocked, STOP** and write the blocker with what you tried.
- **Prove every regression test RED first**, and report both runs. Mutation scripts must `assert`
  their target string was found.
- **Negative results are the point of phase 00.** "Identity is not reliable enough" is a valid and
  valuable outcome. Do not narrate a win.

## Heavy-compute contract — read this before training anything

- **ONE worker. Minimum size. Never fan out.** A full-tilt render has crashed this machine.
  `--num-workers 4` is the ceiling; 12 coincided with a crash.
- Only **one** training may hold the GPU (`data/models/.train.lock`).
- Phase 00 requires **no** training at all — nine 14-class runs already exist (`tiny-p3`,
  `p3-finetune`, `p3-light`, `tiny-light`, `p1-isolate`, `p2-boards`, `tiny-p1`, `tiny-p2`,
  `p3-bleedfix`). Use them.
- Never judge a run by `val_acc`: val is a single session of near-identical frames and reads 1.0000
  for every candidate. The real holdout and the clip harness are the measures.

## The parity contract (phase 02, and it is absolute)

1. Land it in **Python** first, measure there.
2. `uv run pytest -m clips` **21/21** (~7 min).
3. Regenerate fixtures:
   `uv run python scripts/emit_parity_fixtures.py --all --out android/core-engine/src/test/resources/parity`
4. Inspect the diff. Fixtures run `cnn_run=None`, so an **empty diff is expected**; a non-empty one
   means the diff path moved by accident — stop.
5. Port to Kotlin identically. 6. `ClipReplayParityTest` **18/18, zero divergence**.

## Repo rules you must not violate

- `src/chesslab/config.py` is the ONLY source of tracker defaults; mirror new knobs in Kotlin
  `TrackerConfig`.
- The exported ONNX batch is **fixed at 64** (`evaluate.ONNX_BATCH`). A dynamic batch makes the
  Android session answer `[64,3,128,128]` with `[1,2]` and kills the CNN silently. This has shipped
  three times. `BundledGraphShapeTest` guards it — do not weaken it.
- `data/` is gitignored: **park, never delete.** `archive_session(id, reason, paths)` needs a reason.
- Classes are the 14 in `config.CLASSES`; `occluded` never comes from a FEN.
- English only, in code, comments and docs.

## Static analysis

`uv run ruff check src tests scripts synth` clean. Kotlin: `ktlintFormat` first (the formatter owns
style), then `ktlintCheck` + `detekt` for the module you touched. No `@Suppress`, no baseline entries.

## Ownership registry — overrides any phase file that disagrees

| File | Owner | Notes |
|---|---|---|
| `specs/21-identity-for-the-alarm/STATUS.md` | all phases | Append to your own row only. |
| `src/chesslab/training/**` | 01, then 02 for the export | 01 trains, 02 exports. |
| `src/chesslab/move_tracker/**` | 02 | Filling `label`/`conf`, and nothing else. |
| `android/core-cnn/**`, `android/app/.../cnn/**`, `android/core-engine/**` | 02 | Including the regenerated `parity/` tree. |
| `data/models/**` | 01 | New run under a NEW name. Never overwrite `occ-r3s-f3`. |
| `scratch/` | anyone | Throwaway. Not committed. |

## Evidence available to every phase

- **Real holdout, unseen by every occ-* run**: sessions `20260708-021722` (test split of `occ-real3`,
  absent from `occ-real`) and `20260721-212830` (val split of both) — 9,728 crops.
- **`data/_device/20260728-runaway/`** — 23 sessions, 130 frames, 47 game records including the four
  runaway fragments.
- **`scripts/replay_clip_cnn.py`** — the only offline instrument that exercises the verify ladder,
  recovery and the alarm with a real CNN. Deterministic.
- The shipped baseline is **`occ-r3s-f3`**; every occupancy comparison is against it.

## Definition of done (per phase)

Own STATUS.md row `done` with the measured numbers; named tests exist, proven red first, passing;
static analysis clean. Phase 02 additionally: clips 21/21, fixtures diffed, parity 18/18.

The **orchestrator** runs the merged gate before anything counts as finished: `uv run pytest -q`,
`uv run pytest -m clips`, `uv run ruff check src tests scripts synth`, every Gradle module test,
`ktlintCheck`, `detekt`, `:app:assembleDebug`. Per-agent green lights measure partial trees and are
not trustworthy.

**Known pre-existing failure, not yours:** `tests/test_camera.py` has 3 failures from `dba6f29`
(2026-07-21, `_UndistortCapture` wrapping vs `LatestFrame`/backcompat assertions). Do not fix them in
this pack; do not let them mask a new one.
