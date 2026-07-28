# 20 — Recovery honesty: stop inventing captures, stop fragmenting games

> Entry file for the spec pack. Every implementing agent reads **this file completely**, then
> exactly the phase file assigned to it. Python (`src/chesslab/move_tracker/tracker.py`) remains the
> source of truth for tracker behaviour; the Kotlin engine is a 1:1 port and must stay one.

## What this is

On 2026-07-28 a played game came out of the device as **four stored fragments in three minutes**,
full of captures that were never played:

```
0052  e4 e5 Nf3 Nc6 b4 b5 Nc3 Nd4 Nxb5 Nxb5 Nxe5 d6 Nc4 d5 exd5 Bxb4     (7 of 16 cnn_recovery)
0053  Rxa3 h5 g4 hxg4 Qxg4 g5 Qxg5 f6 Qxf6                               (from a fabricated FEN)
0054  Qc3 dxc3 Nf6 Rg1 Ne4 f3                                            (white has almost nothing left)
```

The user's report: *"die app ist komplett wild vom echten brett weg"*, and separately *"eine Naht
in der game historie ist für mich als Nutzer unverständlich"*.

### The mechanism, measured

`cnn_recovery` bridges a desync by searching up to `recovery_max_plies` (4) of **legal** moves from
the believed board and scoring each final position by how many *confident* squares it explains
(`cnn_recovery.py:318-375`). It accepts when

```python
best >= self.min_agreement                      # 0.97 of the confident squares
and (best_hits - max(second_hits, 0)) >= self.margin_squares    # 1
```

When the model reads occupied squares as **empty**, the cheapest legal story for "fewer pieces" is a
**capture** — and each fabricated capture removes a piece from the model, widening the gap and making
the next one likelier. That is the cascade above.

The error direction is not symmetric and never has been. `tracker.py:2334-2340` already records it:

> Measured over 1366 clip observations the model's errors are **8826 misses (piece→empty) vs 226
> phantoms (empty→piece)**, and they are systematic per square (f4 misread in 90 of 186
> observations), so neither the margin nor more votes can outrun them.

### Two things measured and RULED OUT. Do not re-litigate them.

| Hypothesis | Verdict | Evidence |
|---|---|---|
| Raise `cnn_margin_squares` from 1 | **Rejected** | A capture differs from its non-capture sibling by exactly one square (`tracker.py:2333`), so a higher margin rejects the *correct* hypothesis. Measured on `newclip.mp4`: margin 1 → `e4 Nc6 Nf3 e5 h4 h5`; margin 2 → loses `h4 h5`; margin 3 → loses `e5` too. |
| The shipped model is simply bad | **Rejected as the whole story** | Swapping to `occ-r3s-f3` (2026-07-28, `46c16d6`) reduces the miss pressure but does not change the acceptance rule. The same rule accepted the cascade under three different models; recoveries per model on the same clip were 3 / 3 / 5. |

### The principle this pack applies

`tracker.py:2341` states it for the *overrule* rung and proves it with the `blender-queenside`
incident:

> Therefore the overruling move must be **READ, not inferred from absence**: its origin confidently
> EMPTY and its destination confidently OCCUPIED — the 39×-rarer error direction.

That rule is applied to the overrule rung and **not** to the deep recovery search. Closing that gap
is phase 01. Nothing else in this pack changes acceptance thresholds.

---

## Phases

| Phase | File | Concern | Depends on | Scope (files it may touch) |
|---|---|---|---|---|
| 00 | `00-measure-ambiguity.md` | **Measure** how often the recovery's accepted sequence is inferred from absence, and what an evidence requirement would cost. **Fixes nothing.** | — | `specs/20-recovery-honesty/STATUS.md`, throwaway scripts under `scratch/` |
| 01 | `01-read-not-inferred.md` | Recovery may not accept a move whose evidence is absence. Python first, then the Kotlin port. | **00** | `src/chesslab/move_tracker/cnn_recovery.py`, `.../tracker.py`, `src/chesslab/config.py`, `tests/test_cnn_recovery.py`, `tests/test_move_tracker.py`, `android/core-engine/**`, `android/core-engine/src/test/resources/parity/**` |
| 02 | `02-one-game-one-record.md` | A seam must not fragment the library. One played game = one stored record. | — | `android/app/src/main/kotlin/com/chesslab/tracker/games/**`, `.../ui/games/**`, `android/app/src/test/kotlin/com/chesslab/tracker/games/**` |
| 03 | `03-synth-noise-floor.md` | The cleanest tenth of synthetic crops carries too little sensor noise. Measure, fix the floor, prove with a visual probe. **No retrain.** | — | `synth/degrade.py`, `synth/README.md`, `docs/synth-pipeline.md`, `tests/test_synth_degrade.py` (new) |

**01 depends on 00 and must not start before it reports.** 00 decides the *shape* of the evidence
requirement; implementing first and measuring after is how a confident wrong diagnosis ships.

**02 and 03 may run in parallel with each other and with 00.** File scopes are disjoint: 02 is the
Android game record, 03 is the synth pipeline, 00 writes only STATUS.md. Neither publishes a
contract the others consume.

---

## Protocol for implementing agents

- **Branch:** `spec-20-recovery-honesty`, created from the current `spec-19-live-hardening` HEAD.
  Never commit to `main`. All phases share the branch.
- **Trust the code over the spec.** Line numbers drift. If a cited anchor is wrong, find the symbol
  and **record the correction in STATUS.md**. Never edit around a mismatch silently.
- **If blocked, STOP** and write the blocker into STATUS.md with what you tried. A half-applied
  change to the detection path is worse than no change.
- **Prove every regression test RED first.** Mutate the fix away, run the test, confirm it fails,
  restore, confirm it passes. Report both runs. A green test that was never red proves nothing.
- **Every mutation script must `assert` its target string was found.** A script that silently
  matched nothing and reported success cost a full cycle in this repo already.
- **Negative results are expected and acceptable.** "This did not improve the metric" is a finding.
  Do not narrate a win.

## The parity contract (phase 01 only, and it is absolute)

1. Land the change in **Python** first and measure it there.
2. `uv run pytest -m clips` must be **21/21**. It takes ~7½ minutes. If a clip breaks, the change is
   wrong for the regression set and stops there, whatever it does for the live recording.
3. Regenerate fixtures:
   `uv run python scripts/emit_parity_fixtures.py --all --out android/core-engine/src/test/resources/parity`
4. **Inspect the fixture diff.** If nothing changed, the new rule never fires on the 18 clips and is
   inert there — say so in STATUS.md. That is information, not a pass.
5. Port to Kotlin identically.
6. `ClipReplayParityTest` must be **18/18, zero diverging frames**, against the new fixtures.

The fixtures are emitted with `cnn_run=None`, so they exercise the diff path only. A change confined
to the recovery search is structurally incapable of moving them — **if `ClipReplayParityTest` moves,
you changed the diff path by accident and must stop.**

## Repo rules you must not violate

- `src/chesslab/config.py` is the ONLY source of truth for tracker defaults. A new knob is added
  there, in `TRACK_DEFAULTS`, and mirrored in Kotlin `TrackerConfig` — never hardcoded.
- Corner order is `[a8, h8, h1, a1]`; squares are `a1`..`h8`.
- `data/` is gitignored: **park, never delete.** `sessions.archive_session(id, reason, paths)` takes
  a required reason.
- Code, comments and docs are **English**.
- No `Any` across a module boundary; pass a primitive (FEN string, uci string, id) instead.

## Heavy-compute contract

Renders, training and exports are allowed but must be **conservative: ONE worker, minimum size,
never fan out.** A full-tilt render has crashed this machine before. No phase in this pack needs a
retrain — phase 03 explicitly does not.

## Static analysis

- Python: `uv run ruff check src tests scripts synth` — zero new findings.
- Kotlin: run `:app:ktlintFormat` (the formatter owns style; do not hand-edit style findings), then
  `ktlintCheck` and `detekt` scoped to the module you touched. No `@Suppress` and no baseline
  additions to go green — fix it or record a blocker.
- If detekt's `LongMethod` fires, extract a genuinely cohesive unit. **Treat "the linter forced this
  shape" as a smell to surface, never as a design.**

## Ownership registry — this table overrides any phase file that disagrees

| File | Created/owned by | May be extended by | Notes |
|---|---|---|---|
| `specs/20-recovery-honesty/STATUS.md` | this pack | **every** phase | Append to your own row only; never rewrite another phase's. |
| `src/chesslab/move_tracker/cnn_recovery.py` | 01 | — | 00 may READ it and must not write it. |
| `src/chesslab/config.py` | 01 | — | Only if 00's measurement calls for a new knob. |
| `android/core-engine/**` | 01 | — | Including the regenerated `parity/` tree. |
| `android/app/.../games/**`, `.../ui/games/**` | 02 | — | `GameSessionController`, `LiveGame`, `GameRecord`, `GameStore`, the Games screen. |
| `synth/degrade.py` | 03 | — | |
| `scratch/` | anyone | anyone | Throwaway measurement scripts. Not committed. |

## Evidence available to every phase

- **`data/_device/20260728-runaway/`** — 77 MB pulled off the device: 23 sessions with 130 frames,
  47 game records including the four runaway fragments. This is the primary evidence.
- **The real clip** used for every measurement in this file:
  `C:/Users/mariu/AppData/Local/Temp/claude/c--Users-mariu-project-chess-vision/d931e039-adee-4c07-aa69-73b598e75146/scratchpad/newclip.mp4`
  with `corners.json` beside it (margin `0.045`, 1080×1920, 30 fps, ~102 px/square, camera fixed to
  within 1.9 px over 83 s). Copy both into `scratch/` at the start; do not rely on the temp path.
- **`scripts/replay_clip_cnn.py`** — the ONLY offline instrument that exercises the verify ladder and
  recovery with a real CNN. Deterministic: same clip, same args, same game.
  `uv run python scripts/replay_clip_cnn.py CLIP corners.json 0.045 0.055 occ-r3s-f3 '{"knob": v}'`
- **`scripts/sweep_clip_params.py`** — diff-only replay with a virtual clock, for A/B over knobs.
- The shipped model is **`occ-r3s-f3`** (`46c16d6`). Use it for every measurement so numbers compare.

## Definition of done (per phase)

- Its own STATUS.md row moved to `done`, with the measured numbers in the session log.
- Tests named in the phase file exist, were proven red first, and pass.
- Static analysis clean for the module touched.
- Phase 01 additionally: `pytest -m clips` 21/21, fixtures regenerated and their diff described,
  `ClipReplayParityTest` 18/18.

The **orchestrator** runs the merged gate before any of this is considered finished: `uv run pytest
-q`, `uv run ruff check src tests scripts synth`, all Gradle module tests, `ktlintCheck`, `detekt`,
`:app:assembleDebug`. Per-agent green lights are measured against partial trees and are not
trustworthy.
