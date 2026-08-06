# Phase 03 — Adopt, and retire the Python

## Why

A confirmed candidate becomes a manifest entry, and the manifest is what the harnesses replay
forever. Once Kotlin can do that, `scripts/label_real_game.py` has no remaining job and must go —
two tools that both claim to say "what the tracker does on real footage" is exactly the situation
this pack exists to end.

## Design (decided — do not redesign)

New file `app/src/test/kotlin/com/chesslab/tracker/sim/RealGameAdopt.kt`.

### The refusal comes first

`--adopt` **refuses unless `confirmed` is `true`**, and that refusal is tested. The tracker's own
output is not ground truth: a tool that exported the machine's track unchecked would freeze the
tracker's mistakes into a fixture and then assert forever that it keeps making them. Python tests
this today (`label_real_game.py:606 adopt_entry`, refusal at `:623`) — carry the test over.

### The entry shape is whatever the READER parses

`sim/SimClips.kt:142 simClips()` is the authority, not the YAML by eye. Read that function and emit
what it consumes. From the committed entries and `specs/40/STATUS.md`:

- `file`, `source: real`, `start_fen`, the expected move list, `moves_uci`, `positions`, `corners`,
  `margin`, `board_size`, `frame_size`
- **`deterministic: true` is not optional.** The realtime replay drops frames by machine load, so two
  runs give different games unless the harness is told to decode deterministically.
- **`tracker: {}` — a real clip records shipped defaults and overrides nothing.** Above all it must
  NOT set `min_grid_line_coverage: 0.0`, which 20 of the 21 committed entries do: the grid gate is
  exactly the mechanism a real ArUco quad exercises, and a wrong `margin` jams it. Overriding it
  would hide the thing the clip was collected to test.
- `known_failure` / `known_committed` for material that does not reproduce its ground truth.

**A conflict to resolve, not to ignore:** an empty `tracker: {}` and the recorded `effective_config`
disagree about `settle/avg/confirm_frames` — the Python harness builds with `cnn_run=None` (4/3/2)
while a CNN-attached candidate records 3/2/1. Nothing depended on it while no real entry existed.
This phase creates the first one. Decide explicitly which wins, implement that, and write the
decision and its reason into `STATUS.md`.

### The video does not go in git

`data/` is gitignored. The **entry** is committed; the multi-hundred-MB file is dropped into
`data/testclips/` and a fresh clone skips cleanly — the convention already exists at
`tests/test_clips.py:26-38`, and `pyproject.toml:96` sets `addopts = "-m 'not clips'"`. Follow it
for the Kotlin side too: a missing video is a skip, never a failure.

### The deletion

- Delete `scripts/label_real_game.py` (757 lines).
- `scripts/replay_clip_cnn.py` (235 lines) is used by more than the labeller — it is described as the
  only offline Python instrument that reaches `_cnn_tick`. **Grep before deleting:**
  `grep -rn "replay_clip_cnn" --include=*.py --include=*.md .` Delete it only if nothing but the
  labeller imports it; otherwise leave it and say so in `STATUS.md`.
- Update every reference to the old command: `README.md`, `docs/`, `specs/40`. `grep -rn
  "label_real_game" . --include=*.md` and fix each hit to the new invocation.
- `uv run vulture` must stay silent afterwards — deleting a script can strand helpers in
  `src/chesslab/` that only it used. If it does, remove them in the same commit.

## Steps

### 1. `sim/RealGameAdopt.kt` (new) — commit `feat(sim): a confirmed candidate becomes a clip the harness replays`
Entry builder + the refusal, emitting what `simClips()` parses.

### 2. `sim/LabelRealGameTest.kt` (extend) — commit `feat(sim): adopt is one flag on the same harness`
`-Dchesslab.realgame.adopt=<name>`.

### 3. `scripts/label_real_game.py` (delete) + docs — commit `refactor: one harness, and it is the one that ships`
Delete, re-point every doc reference, keep `ruff`/`vulture`/`pytest` green.

## Tests (write, run once, targeted)

- `anUnconfirmedCandidateIsRefused` — the message names the review step.
- `theEntryCarriesTheKeysSimClipsParses` — build an entry, feed it through `simClips()`, assert it
  loads. **This is the one integration test across the seam** — do not test the writer against a
  hand-written expectation of the reader.
- `aRealEntryOverridesNothing` — `tracker` is empty and `min_grid_line_coverage` is absent.
- `deterministicIsSetOnRealEntries`.
- `aMissingVideoSkipsRatherThanFails`.

```
gradlew.bat :app:testDebugUnitTest --tests "*RealGameAdopt*" --tests "*LabelRealGameTest*"
uv run pytest -q && uv run ruff check src tests synth && uv run vulture
```

## Acceptance criteria

- `git ls-files scripts/label_real_game.py` — empty.
- `grep -rn "label_real_game" . --include=*.md --include=*.py` — no stale invocation anywhere.
- A confirmed candidate adopted through the Kotlin path loads via `simClips()` and runs in
  `CnnClipSimulationTest`'s machinery without special flags.
- `uv run vulture` silent; `uv run pytest -q` green.

## Do NOT / Out of scope

- Do not adopt the 2026-08-02 candidate. It is `confirmed: false` and a human has never reviewed it —
  that review is the user's, and phase 04 measures what the engine does regardless.
- Do not delete `scripts/replay_clip_cnn.py` without the grep above proving it unused.
- Do not modify the 21 existing manifest entries.
- Do not change `web/routers/realgames.py`.
