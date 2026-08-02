# 02 — The clip the harnesses run

> Owns the `--adopt` path of `scripts/label_real_game.py`, entries in
> `tests/data/testclips/manifest.yaml`, and on the Kotlin side
> `android/app/src/test/kotlin/com/chesslab/tracker/sim/SimClips.kt` and `sim/ClipPipeline.kt` with
> their tests. Needs a confirmed candidate from 01. **Can land last, or not at all** — the Python
> half is independently useful and the Kotlin half is the only part that touches Android.

## Why

A confirmed move list is not yet a test. Two things stand between them, one trivial and one that
would jam a real clip silently.

**The Python harness already accepts real clips and nobody has fed it one.** `tests/test_clips.py`
was built for exactly this: two clip directories on purpose, because "the real 30 fps phone
recordings are tens to hundreds of megabytes and CANNOT be committed, so their manifest ENTRY is
committed (corners, margin, ground truth, why it fails) while the file itself is dropped into the
gitignored `data/testclips/`" (`:26-38`). It has `deterministic: true` for a reproducible
virtual-clock replay (`:49-77`), and `known_failure` / `known_committed` for material that does not
yet reproduce its ground truth (`:120-131`). Every field a real clip needs already exists. The
adopt step is a YAML append.

**The Kotlin harness would run a real clip 6–8 % too large.** `ClipPipeline` builds its geometry as
`BoardGeometry(boardSize = clip.boardSize)` (`ClipPipeline.kt:63`), and `BoardGeometry.margin`
defaults to `margins4(0.0)` (`Corners.kt:60`). `warpFromCorners` then computes
`computeHomography(corners, geom.boardSize, geom.margin)` (`Warp.kt:55`) with that zero. For the
Blender clips that is correct — their corners *are* the field corners — and for anything detected
from ArUco it is the defect the Python side fixed in `721901a`: markers sit in the label border, so
the quad lies outside the playing field, the grid lines miss `_grid_line_coverage`'s band and the
tracker sits in `occluded` forever — **2232 of 2996 frames, zero commits**
(`emit_parity_fixtures.py:244-252`). The Kotlin sim has always had `margin` in its geometry and has
never plumbed it in from a fixture.

## Design

### What a real clip records, and why it is not the Blender recipe

This is the decision the pack turns on. `trackerConfigOf` (`SimClips.kt:205-252`) takes **every**
field from the fixture and reads no Kotlin default — proven with `motionHoldS = 5.00`, a value that
would freeze the tracker, changing nothing (`:213-215`). So a recorded config is frozen for the life
of the fixture, and a real clip's config is a permanent statement about what that clip tests.

The Blender clips carry per-clip overrides. Every one of them sets `min_grid_line_coverage: 0.0`
(see `tests/data/testclips/manifest.yaml`), plus `overhang: 0.0` and `census_thr: 40.0` — the grid
gate is **off** across the whole corpus, and the comment in `test_clips.py:85-86` records why: "the
clips were shot on a different board than the live setup the defaults are tuned for."

**A real clip records the shipped defaults and overrides nothing.** Specifically it must **not**
disable the grid gate, because the grid gate is the mechanism that a real ArUco quad exercises and
that a wrong `margin` jams — the one failure mode the synthetic corpus is structurally unable to
show. A real clip that carried the Blender overrides would be permanently exempt from the defaults
it exists to test, and would have re-created the blind spot this pack was written to close.

The concrete rule: the entry records `margin` (from the profile — the number that makes the geometry
right) and the effective config as the tracker actually ran it, with an **empty `tracker:` override
map**. If a real clip cannot commit a single move at the defaults, that is a finding about the
defaults or about the footage, and it is recorded as `known_failure` — never bought off with an
override.

Phase 00's `candidate.json` carries `effective_config` (`_effective_config(mt)` already exists at
`emit_parity_fixtures.py:629`) so the adopt step copies rather than re-derives.

### Excerpts, cut after confirmation

A whole game is minutes to tens of minutes of video and does not belong in git. The candidate says
where the interesting moments are — every `cnn_recovery` ply and every `illegal` one carries a
`frame` and a `t` — so cut a handful of short excerpts around them rather than one long clip. This
also makes the corpus *representative* in the way the brief asked for: each excerpt is a few seconds
around the path that fails, instead of forty minutes of the path that works.

Cut with **ffmpeg**, an established tool, re-encoding rather than stream-copying so the excerpt
starts on a keyframe and frame 0 is frame 0.

**`start_fen` for an excerpt is derived, never entered.** It is the position after the confirmed
prefix, computed with `python-chess`. That is why excerpts are cut *after* confirmation and not
before: before confirmation the prefix is the tracker's guess, and a wrong `start_fen` transposes
the whole excerpt with nothing downstream to catch it.

**How much lead-in an excerpt needs is not known.** The tracker enters a clip with no reference
frame and builds one over `settleFrames` / `avgFrames` / `confirmFrames`, whose values are
CNN-conditional and fixed at construction (`replay_clip_cnn.py:108-111`). Cutting too close to the
first move gives the tracker no baseline and produces a failure that belongs to the cut, not to the
tracker. **Measure it**: cut one excerpt at several lead-ins and record where the committed line
stops changing. Do not pick a number from this document — there is none in it.

Size budget: the twenty committed Blender clips total 11 MB. Keep the real excerpts in the same
order of magnitude. Anything larger stays in gitignored `data/testclips/` with only its entry
committed, which `test_clips.py:34-38` already supports and which costs nothing but a skip on a
fresh clone.

### Adopt

```
uv run python scripts/label_real_game.py --adopt <name> [--excerpt <ply-range>]
```

- **Refuses unless `candidate.json` reads `confirmed: true`.** This is the second half of the trap's
  defence and the refusal is tested. A tracker's own output must not be able to become a fixture by
  any path.
- Appends a manifest entry: `file`, `source: real`, `start_fen`, `erwartete_zugliste` (the confirmed
  SANs), `moves_uci`, `positions`, `corners`, `margin`, `board_size`, `frame_size`,
  `deterministic: true`, and an empty `tracker: {}`.
- `deterministic: true` is not optional. `test_clips.py:52-56`: the realtime replay "drops frames
  according to machine load, so two runs of the same clip give different games. That is tolerable
  for a pass/fail move list on short renders and NOT tolerable for the real recordings, whose value
  is exactly the list they produce today — a pin has to be reproducible."
- **Expect the first real clip to be a `known_failure`.** In the game that motivated this pack the
  tracker committed 55 of 91 moves through recovery and the user corrected three by hand, so the
  replay reproducing the human's list would be the surprise. `known_failure` carries the reason and
  `known_committed` pins what it produces today, and `test_clips.py:126-130` then **fails when it
  starts matching the ground truth** and asks to be promoted. That is a working ratchet, not a
  weakening.

### Kotlin: three changes, all in the sim harness

`:core-engine` and `:core-geometry` are not touched. Nothing in `main` is touched.

1. **Plumb `margin`.** `SimClip` gains a `margin: List<Double>`; `ClipPipeline.kt:63` becomes
   `BoardGeometry(boardSize = clip.boardSize, margin = clip.margin)`. Blender clips supply
   `margins4(0.0)` and stay **byte-identical** — that is the acceptance criterion, not an
   aspiration. `margins4` is `Corners.kt:40` and takes the uniform case; the four-value form exists
   because "the markers are glued on by hand" (`Corners.kt:53-58`) and is not needed here.
2. **A clip may carry its own `fps` and `effectiveConfig`.** `simClips()` (`SimClips.kt:127-153`)
   takes the clip list from `parity/index.json` and reads `fps` + `effectiveConfig` from
   `parity/<name>/meta.json`. A real clip has no parity fixture and should not get one — the parity
   set is 46 MB of recorded planes for eighteen short renders, it exists to prove the Kotlin port
   matches Python, and that question is already answered. So: when `parity/<name>/meta.json` is
   absent, read `fps` and `effective_config` from the clip's own `labels.json`. Blender clips keep
   reading the parity meta and are unaffected.
3. **`frame_labels` becomes optional.** `truthFenOf` (`SimClips.kt:168-173`) calls
   `getValue("frame_labels")` and throws without it. A real clip has none — see `entry.md`: its only
   consumer is `ObsAudit`, which has no assertion in it (`ObsAudit.kt:23-174`). Return an empty list;
   `ClipRun.kt:166-168` already guards with `getOrNull` and simply contributes nothing to the audit.
   The report must **say** the clip contributed no audit rows rather than printing a silent zero.

**Real clips run as an alternate clip set, reported and not asserted.** The mechanism exists:
`simClipDir` reads `-Pchesslab.sim.clips` (`SimClips.kt:38-53`) and its KDoc insists a re-render
"goes into its OWN directory … never by overwriting the fixtures", and
`assertBaselineReproducesGroundTruth` (`CnnClipSimulationTest.kt:180-190`) already **prints instead
of asserting** when `usingDefaultClips()` is false, because a set with no proven Python baseline
"has no Python reference, so its diff-only rate is a MEASUREMENT of the new pixels". That is exactly
the right status for a first real clip. Put them in `tests/data/testclips-real/` and run with
`-Pchesslab.sim.clips=tests/data/testclips-real`.

**Do not add real clips to the default catalogue in this phase.** The default set is the one with a
proven baseline, and promoting a clip that does not reproduce its ground truth would turn the one
move assertion into a pin — which is the Python side's job, where the `known_failure` ratchet exists
to do it honestly.

## Steps

1. **`feat(scripts): a confirmed game becomes a manifest entry`** — `--adopt`, refusing an
   unconfirmed candidate, writing the entry with an empty `tracker:` map.
2. **`feat(scripts): excerpts around the moves that were rebuilt`** — ffmpeg cut, `start_fen`
   derived from the confirmed prefix, lead-in as an argument.
3. **`fix(android-sim): the clip's margin reaches its geometry`** — `SimClip.margin` and
   `ClipPipeline`.
4. **`feat(android-sim): a clip may carry its own fps and config`** — the `labels.json` fallback
   when no parity meta exists.
5. **`feat(android-sim): frame_labels is optional`** — empty truth, and the report saying so.

## Tests

Python (`tests/test_real_game_candidate.py`, unmarked — no footage):

- `--adopt` on a candidate with `confirmed: false` refuses, and `manifest.yaml` is byte-unchanged.
- An adopted entry has an **empty** `tracker` map, a non-zero `margin`, and does not set
  `min_grid_line_coverage`. This is the pack's central decision and it gets an explicit test.
- The derived `start_fen` for an excerpt starting at ply *n* equals the position after replaying
  the first *n* confirmed moves.
- A manifest with a real entry still parses through `test_clips.py::_entries`, and an entry whose
  file is on neither path is skipped (`test_clips.py:34-38`) — a fresh clone must stay green.

Kotlin:

- `BoardGeometry` receives the clip's margin; a fixture with margin `0.06` produces a different warp
  than one with `0.0` (a test that fails without the change).
- **Every committed Blender clip produces byte-identical results.** The parity fixtures are the
  contract; if this moves, the change is wrong.
- A clip with no `parity/<name>/meta.json` loads its `fps` and `effectiveConfig` from `labels.json`.
- A clip with no `frame_labels` loads, runs, and contributes no audit rows — and the report says so.
- A clip whose `labels.json` carries neither a parity meta nor an `effective_config` fails with a
  clear message. It must not fall through to `TrackerConfig`'s defaults: that is the exact trapdoor
  `SimClips.kt:196-198` records for `verifyTimeoutS`, "the same value today, and an invisible
  trapdoor the moment it stopped being."

## Acceptance

- `uv run pytest -m clips` runs the real entry when the video is present and skips it cleanly when
  it is not.
- `gradlew.bat :app:ktlintCheck :app:detekt :app:testDebugUnitTest --rerun-tasks` green. **The flag
  is not optional**: measured 2026-08-02, a plain invocation reported BUILD SUCCESSFUL while
  `ModelSpecTest` was in fact red.
- `-Pchesslab.sim.clips=tests/data/testclips-real` runs the real clip and reports its diff-only rate
  instead of asserting it.
- The committed clip set's simulation output is unchanged, verified by diffing the run report
  against one taken before the change.
- `uv run pytest -q`, `uv run ruff check src tests synth scripts`, `uv run vulture` clean.

## Do NOT

- **Do not add a per-clip `tracker:` override to a real entry, and above all do not set
  `min_grid_line_coverage: 0.0`.** That is the Blender recipe and it disables the one gate real
  geometry exists to exercise. A clip that needs an override to pass is a `known_failure`, not a
  tuned clip.
- **Do not overwrite `tests/data/testclips/`.** Those exact files produced
  `android/core-engine/src/test/resources/parity/`, and `ClipReplayParityTest` is only meaningful
  against them (`SimClips.kt:38-48`). Real clips go in their own directory.
- **Do not generate parity fixtures for a real clip.** 46 MB of recorded planes exists to prove the
  Kotlin port matches Python; that question is answered and a real clip does not re-open it.
- **Do not add a real clip to `parity/index.json` or the default sim catalogue** in this phase.
- **Do not touch `:core-engine` or `:core-geometry`.** The margin plumbing is entirely in the test
  harness; `Warp.kt:55` already applies `geom.margin` correctly.
- **Do not let a missing `effectiveConfig` fall through to Kotlin defaults.** Fail loudly.
- **Do not commit the source video.** Excerpts only, and only within the size budget.
- Do not `@Suppress` a detekt finding or add a baseline entry; restructure instead.
