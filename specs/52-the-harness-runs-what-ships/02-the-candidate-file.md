# Phase 02 — The candidate file, and frames that are what they claim

## Why

The review UI, `--adopt` and every downstream consumer speak one contract: `candidate.json` plus a
directory of review JPEGs. Phase 00 produces the plies and phase 01 the geometry; this phase writes
them in the shape `src/chesslab/web/routers/realgames.py` already reads, so the existing review page
keeps working with no change on the Python side.

It also fixes a defect measured on 2026-08-06 in the Python writer, which this implementation must
not reproduce:

```
000168.jpg … 000172.jpg  ==  000228.jpg … 000232.jpg   (byte-identical)
```

Pixel comparison against the decoded video showed the **later** indices are correct: the writer
paired current frames with stale indices. `_ReviewFrames`' own docstring
(`scripts/label_real_game.py:402-412`) explains why that is fatal — "h.264 seeking by frame index is
approximate, so a review page that sought would show a NEARBY frame while claiming it is the one."
Writing during the decode was supposed to make the claim true. It did not.

## Design (decided — do not redesign)

New file `app/src/test/kotlin/com/chesslab/tracker/sim/RealGameCandidate.kt`.

### The JSON

Serialise with kotlinx-serialization (already on the test classpath). **The key set is fixed** — read
`data/realgames/game-2026-08-02/candidate.json` and match it exactly:

```
name, video, confirmed, created_at, source, effective_config, geometry, clock,
start_fen, moves[], note, observations, frames, frames_written
```

- `video` is **relative to `data/`**, POSIX separators, no `..`, no drive letter. Python asserts this
  (`label_real_game.py:467 relative_video`) and so must this. On Windows the naive path carries `\`
  and a drive letter — convert deliberately, and test it.
- `confirmed` is **always `false` on write.** Only the review route flips it; only `--adopt` reads it.
  A tool that could write `true` is a tool that can freeze the tracker's mistakes into a fixture.
- `moves[]` rows: `ply`, `san`, `uci`, `frame`, `t`, `decider`, `alarm`, `fen_after` — snake_case in
  JSON, from phase 00's `RealGamePly`.
- `effective_config` is the config the engine **actually ran**, read off the live engine, not the
  config file. `SimClips.kt:226 trackerConfigOf` reads every field from the fixture and no Kotlin
  default — a fixture records what the simulation runs forever, so it must record the truth.
- `source` carries `cnn_run`, `obs_s`, `profile`, `context`, `start_frame`, **and `crop`** — the
  crop the model declared (specs/45). specs/41's defect was exactly a harness inventing a profile
  field; a candidate that does not record its crop can not be reproduced.
- `created_at`: UTC, `…Z`, seconds precision.

### The review frames

`RealGameFrames`, driven by phase 00's `onFrame(index, mat)` — the index and the picture arrive in
one call and are **never stored apart**. That single rule is the whole fix.

- Write the commit frame and a symmetric neighbourhood of `context` (default 2) on each side.
- Frames *before* the commit come from a ring buffer. **The ring stores a defensive copy** — OpenCV
  reuses buffers and JavaCV's grabber certainly does; storing the `Mat` reference and writing it
  later yields the picture that happened to be current at write time. `ClipFrames.kt:13-14` already
  warns "the caller owns nothing".
- Filenames are `%06d.jpg` of the **decode index of that picture**. Never of a ply, never of a
  neighbouring commit.
- Never write an index twice; a batch commit shares one picture across its plies.

## Steps

### 1. `sim/RealGameCandidate.kt` (new) — commit `feat(sim): the candidate is written where the review already reads it`
The serialisable model and writer, key-for-key against the file on disk.

### 2. same file — commit `feat(sim): a review frame is the frame it says it is`
`RealGameFrames`, ring with defensive copies, index-with-picture, no double writes.

### 3. `sim/LabelRealGameTest.kt` (extend) — commit `feat(sim): the harness writes a candidate`
End to end over a short committed clip: measure, replay, write, into `data/realgames/<name>/`.

## Tests (write, run once, targeted)

- `everyWrittenFrameHoldsThePictureItsNameClaims` — **the regression test for the defect above.**
  Run over a short clip; for each written JPEG, decode the same index from the video independently
  and assert the mean absolute pixel difference is small (JPEG at quality 88 is lossy — compare
  against a tolerance, and assert it is *closer to its own index than to any other written index*).
  Confirm the test fails against a deliberately off-by-N writer before you keep it; report that it
  was proven red.
- `theRingStoresCopiesNotReferences` — mutate the source `Mat` after buffering; the written picture
  is unchanged.
- `videoPathIsRelativeToDataWithForwardSlashes` — on Windows too.
- `confirmedIsAlwaysFalseOnWrite`.
- `aBatchCommitSharesOnePictureAcrossItsPlies` — two plies, one frame, one file.
- `theCandidateHasExactlyTheKeysTheReviewReads` — compare the emitted key set against the literal
  set in this file; a new key is a deliberate act.

```
gradlew.bat :app:testDebugUnitTest --tests "*RealGameCandidate*" --tests "*LabelRealGameTest*"
```

## Acceptance criteria

- `python -c "import json;d=json.load(open('data/realgames/<name>/candidate.json'));print(sorted(d))"`
  prints the same sorted key list as the 2026-08-02 file.
- `GET /api/realgames` on `chesslab web` lists the new candidate with its move count and
  `confirmed:false`; the review page renders its board and frames. **Verify this by running it** —
  the contract is the point of the phase.
- No two written JPEGs are byte-identical unless the video's own frames are.

## Do NOT / Out of scope

- Do not change `web/routers/realgames.py`, `GameReview.tsx`, or the JSON shape. If the shape is
  wrong, that is a finding for `STATUS.md`, not an edit.
- Do not write into `data/sessions/` or `data/manifests/`, and do not run `slice`.
- Do not implement `--adopt` — phase 03.
- Do not commit anything under `data/` (gitignored).
