# 27 — Can a local verify be as safe as the whole board?

> Entry file. Every implementing agent reads **this file completely**, then exactly its phase file.
> The protocol of `specs/22-inference-resolution/entry.md` applies verbatim; only deltas below.
> Branches are cut from the pack commit on `spec-24-frame-the-board`, **not from `main`**.

## What this is, and what it is not

specs/26 proved a factor of **8.2** is available on the CNN call: a batch-4 graph produces
*numerically identical* probabilities to the batch-64 one (max abs diff **exactly 0.0**, verified on
4 synthetic crops and on all 7 040 crops of `occ-real6`), at 8.5 % of the cost. The exporter can
already emit it (`chesslab export --batch N`, on branch `spec-26-01-four-crops`).

It is not reachable, because **nothing asks for four crops.** A move hypothesis touches an origin
and a destination square, but every rung of the verify ladder consumes a whole-board observation:

- `boardMatchesIdentityFull` (`core-cnn/.../Recovery.kt:267`) takes the label-confident squares and,
  **below `minConfidentBoard` (default 32), returns `inconclusive = true` — never a mismatch.**
- `resyncCheck` (`Recovery.kt:231`) reports `checked = o.confidentSquares(config.confThr).size`.
- `VerifySingle.Signals.confidentCount` counts over `Squares.ALL`; rung 1 fires only at
  `>= minConfidentBoard`. `VerifyPair.tick` runs `resyncCheck` over the whole board twice.

A 4-square observation has at most 4 confident squares, so it is *always* below the threshold and
the rung *always* returns inconclusive. **Lowering `minConfidentBoard` is not the fix** — it is a
burden-of-proof rule, not a tuning knob, and the reason it exists is in the KDoc: it is the
"blind-glance guard". Under a hand covering the board, a local check matches **vacuously** — it
agrees because it saw nothing, and that is indistinguishable from agreeing because it saw the right
thing.

**So this pack does not wire up four crops.** It answers the question that has to come first:
*what safety property does the whole-board check provide, and can it be provided locally with equal
hardness?* If the answer is no, the 8.2x stays on the shelf and that is a complete, valuable result.

| Spec | Phase | Depends on | Runs |
|---|---|---|---|
| `00-what-does-the-whole-board-catch.md` | Characterise the guard on the existing clip corpus. Measure only. | — | **first, alone** |
| `01-local-verify-behind-a-flag.md` | Only if 00 finds the property is reproducible locally. | 00 | gated by 00 |

**Phase 00 may conclude "STOP" and that is an expected end state.** specs/25 and 26 landed six
negatives between them; the value of this pack is a decided question, not a shipped speedup.

## The rule that governs this pack

Phantoms are the veto. A phantom is an empty square read as occupied; it licenses a fabricated
capture, and the recovery machinery then cascades an entire imaginary game out of it. **A change
that is faster and admits one phantom is rejected.** Misses are recoverable; phantoms are not.

This is a stricter setting than specs/26, because the change under test is in the *decision* logic
rather than in the arithmetic. specs/26's phases could hold their floor by construction — same
weights, same crops, provably identical outputs. Nothing here holds by construction, so everything
here must be measured.

## The measurement of record

**The clip corpus, not a benchmark.** `android/app/src/test/kotlin/com/chesslab/tracker/sim/` —
`CnnClipSimulationTest`, `SimClips`, `ObsAudit` — replays committed frames of real tracker sessions
through the engine and compares move-by-move. That harness caught five real bugs during the Android
rewrite and ran 18 clips at zero divergence against the Python tracker.

Report per change, for the whole corpus: **moves emitted, moves missed, illegal/fabricated moves,
and every divergence from the recorded ground truth.** A change that alters even one clip's move
list has changed behaviour and must justify it.

Do **not** invent a new harness. Do **not** report a latency number as evidence of safety.

## Established — do not re-derive

- Batch 4 vs batch 64: identical outputs (0.0), 8.5 % of the cost, both graphs optimise to the same
  410 nodes. The fragmentation is topological, not batch-dependent — so a small batch does not
  reduce the node traversal, only the work per node.
- The CNN costs **32 ms cool and idle, 66 ms inside the tracker, 125 ms live at 39–41 °C** (max 654).
  The graph is not the bottleneck; load and heat are. Fewer crops per observation therefore buys
  twice: less time *and* less heat, which is the only self-reinforcing loop available.
- Graph-level optimisation is closed from three sides (specs/25, specs/26 phases 04 and 05). Do not
  reopen it here.
- `occ-v6-f5nd` at 80 px is the resolution optimum, measured across `[48, 64, 80, 96]`: 64 px
  triples the misses (27 of 33 on the phone session), 48 px gives 14 phantoms, 96 px gives 4.

## Repo rules

- Kotlin: `gradlew.bat :app:ktlintCheck :app:detekt` from `android/`, use `ktlintFormat` for style.
  detekt's unused-code rules only see **private** scope — an `internal` or `public` function nobody
  calls is invisible to every tool in this repo, so do not leave one behind.
- Python parity: `uv run pytest -q` must stay green; the Kotlin engine is a port and
  `tests/test_cnn_recovery.py` pins the Python side of the same behaviour.
- The engine seam speaks FEN and primitives, never `Any` (`Recovery.kt:280`).
- Never commit anything under `data/`. Branch per phase, atomic conventional commits.
- **Worktree bootstrap**: a worktree has no `data/` (gitignored) and no `.venv`; junction `data/` in,
  set `PYTHONPATH` to your own `src/`, and verify `chesslab.__file__` resolves inside your worktree
  before running anything. Build Android from *your* worktree's `android/`.

## Ownership registry — overrides any phase file that disagrees

| file | owner | notes |
|---|---|---|
| `core-cnn/.../Recovery.kt` | **01** | 00 must not modify it; `boardMatchesIdentityFull` is the guard under study |
| `core-cnn/.../Resync.kt` | **01** | |
| `core-cnn/.../CnnConfig.kt` | **01** | any new knob lands here, with a default that preserves today's behaviour |
| `app/src/test/.../sim/` | **00** | 00 may ADD an audit that measures; it may not change what the harness asserts |
| `scripts/sweep_infer_size.py` | nobody | frozen |

## Definition of done

Code committed, scoped lint green, the **whole clip corpus** re-run with its divergences reported,
and a STATUS row stating what was measured and what it excludes. Negative results are complete
deliverables.
