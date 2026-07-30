# 25 — Normalization endgame: can anything but GroupNorm ship?

> Entry file for the spec pack. Every implementing agent reads **this file completely**, then
> exactly the phase file assigned to it.
>
> **The protocol of `specs/22-inference-resolution/entry.md` applies verbatim** — memory
> constraints, heavy-compute limit, repo rules, git hygiene, linters, definition of done. Only the
> deltas are below. Branch per phase, see *Git hygiene*.

## What this is

GroupNorm ships today and cannot be made fast: its statistic depends on the input, so it never
folds into the preceding convolution. Measured on the real graph, that costs **573 nodes and
30.6 ms per 64 crops against 124 nodes and 6.5 ms** once the norms fold
(`src/chesslab/training/model.py:23-38`) — **4.7x**, and it is also why the QNN partition breaks.

BatchNorm folds, and on 2026-07-30 it was eliminated as a candidate: see *What is already
established*. This pack asks whether anything else can buy the fold, and closes the question either
way.

| Spec | Phase | Depends on | Runs |
|---|---|---|---|
| `00-precise-bn-warm-start.md` | The one untested BN variant: real statistics BEFORE the finetune. | — | **first, alone** — cheapest, and a positive result changes 01 |
| `01-domain-specific-bn.md` | DSBN: joint synth+real training, one BN statistic per domain. | 00 (informational only) | parallel with 02 after 00 reports |
| `02-normalizer-free.md` | ScaledStdConv2d + SkipInit: no normalization in the graph at all. | — | parallel with 01 |

**01 and 02 both add one branch to `_norm_layer`/`build_model`** — see *Ownership registry*. They
are otherwise disjoint and run in separate worktrees.

**Negative results are the expected outcome of this pack and are a complete deliverable.** Three of
four candidates have already died; do not narrate a win. A phase that measures "worse than
GroupNorm" and records the numbers honestly is DONE, not failed.

## What is already established — do not re-establish

Measured 2026-07-30, all on the `occ-real6` **test** split (110 boards / 7 040 crops / 2 353
occupied) via `scripts/sweep_infer_size.py --paths a` (path A = crops re-sliced from the session
frames, the serving path; path B is a cross-check only).

| Model | px | Norm / scales | Phantoms | Misses | Anchor · Phone | Margin (empty p99.9 / max) |
|---|---|---|---:|---:|---|---|
| `occ-v6-f5nd` | 80 | GN 48–96 | **0** | 11 | 9/0 · 2/0 | 0.238 / 0.343 |
| `occ-v4-f5nd` | 128 | GN 32–128 | 2 | 17 | 12/0 · 5/2 | 0.245 / 0.629 |
| `occ-v5bn1-f5` | 128 | BN single | 21 | 111 | 85/1 · 26/20 | 0.806 / 0.962 |
| `occ-v4bn1-f3` | 128 | BN single | 35 | 37 | 26/2 · 11/33 | 0.975 / 0.997 |
| `occ-v4bn-f3` | 128 | BN 32–128 | 154 | 25 | 3/87 · 22/67 | 0.999 / 1.000 |
| `occ-v5bn-f5` | 128 | BN 32–128 | 244 | 17 | 0/148 · 17/96 | 1.000 / 1.000 |
| `occ-v6bn2-f5nd` | 80 | BN 48–96, real5nd | 660 | 44 | 21/530 · 23/130 | 0.972 / 0.994 |
| `occ-v6bn2-f5nd-adabn80` | 80 | ↑ + AdaBN | 1140 | 6 | 1/917 · 5/223 | 1.000 / 1.000 |

**The selection rule (the user's, binding):** phantoms are the **veto** — a model with phantoms is
disqualified whatever its misses. Among phantom-free models, rank by **margin** (how close P(occupied)
comes to 1 on truly empty crops), then by misses. At 2 353 occupied crops, **miss differences below
~8 are noise**; the phantom column and the margin are the load-bearing signals.

Three causes have been **excluded by measurement**, not by argument:

- **Not the data.** `occ-v6bn2-f5nd` trained on `occ-real5nd`, the exact corpus that produced the
  champion.
- **Not the scale band.** `--scales 48,64,80,96` (the champion's) gave BN 660 phantoms.
- **Not the statistics of the finished model.** `scripts/adabn_recalibrate.py` re-measured them on
  real 80 px crops: the shift is **0.034 σ mean / 0.21 max**, i.e. they already fit — and installing
  the corrected ones made it **worse** (660 → 1140 phantoms, margin 1.000/1.000).

What remains unexplained is the **weights**: the BN real-finetune plateaus at `val_acc` 0.93 where
GroupNorm reaches 0.987, and it *starts* at 0.74 where GroupNorm starts at 0.972. On resume **BN
adopts 278 tensors, GN 140** — the difference is the running statistics, carried over from the
synthetic `p2v4`. Phase 00 tests whether that bad start is the whole story.

### Traps that already cost a run

- **`--patience` is keyed to `occ_board_acc`, which is floored.** Board accuracy requires all 64
  squares correct; at `val_acc` 0.93 that is 0.93^64 ≈ 1 %, i.e. **exactly 0** over 24 val boards.
  A model that has not converged is therefore early-stopped *and* gets its checkpoint chosen
  blindly ("best by occ_board_acc=0.0000"). **Every training run in this pack passes
  `--patience 25`.** `occ-v6bn-f5nd` was killed at epoch 9/20 by exactly this.
- **`resume` is not recorded in any `config.json`.** Provenance lives only in the `.sh` and the log.
  Every phase writes its resume parent into `STATUS.md`.
- **Training-val numbers do not predict the veto.** `occ-v4bn-f3` reached `occ_acc` 0.982 in
  training and produced 154 phantoms on test. Never conclude from the training log.
- **An untrained `infer_size` fails silently** — 80 px once cost a model 133 misses against 96 px's
  19. Every size served must be in the run's `scales`. `chesslab export --infer-size` validates this;
  use it rather than hand-editing `config.json`.

## Tooling that already exists — use it, do not rebuild it

- `scripts/adabn_recalibrate.py` — re-estimates BN statistics at ONE resolution on path-A crops,
  no gradients. `--calib-dataset` draws the frames from a different dataset than the run's own
  (the warm-start case). Writes a new run dir; never modifies the source.
- `scripts/sweep_infer_size.py` — the measurement of record. `--dataset occ-real6` evaluates on a
  corpus other than the run's own; **this is safe here** because `occ-real6`'s train and val session
  lists are byte-identical to `occ-real5nd`'s and only its test split is extended by the held-out
  phone session `20260730-145846`. It prints per-session misses/phantoms and the empty-crop margin.
- `scripts/run_v6_lowres.sh` — the champion's recipe, verbatim. Copy it for new chains.

## Repo rules you must not violate

- `uv run pytest -q`, `uv run ruff check src tests synth`, `uv run vulture` (currently silent —
  keep it silent, do **not** add a whitelist). Prefer `.venv/Scripts/python.exe -m ruff` /
  `-m pytest`: `uv run` rebuilds the package and fails while `chesslab.exe` is in use.
- The canonical class list lives in exactly one place, `config.CLASSES`. Paths, crop params and
  split ratios live in `config.py`/YAML, never inline.
- **`data/` is gitignored — park, never delete.** Failed runs stay under `data/models/`; they are
  the evidence for the exclusion chain.
- Code, comments and docs in English. Comments explain *why*, never *what*.
- The dev box is a Windows ROCm build: `build_model` returns `PrimitiveBatchNorm2d`, not
  `nn.BatchNorm2d` (`model.py:66-96`). It subclasses the stock module and `stock_batchnorm` swaps
  the real one back at export. **`momentum=None` is NOT cumulative averaging there** — it falls back
  to 0.1 (`model.py:53`). Never rely on that flag; accumulate statistics explicitly.

## Heavy-compute contract — read this twice

The GPU is the user's own machine and is also used for gaming. An agent that fans out training
crashed a live game once already.

- **Exactly one training run may be in flight across the whole pack.** Before any `chesslab train`,
  create `data/_perf/.gpu-lock` containing your phase number; remove it when the run exits. If the
  file exists and is not yours, **wait or stop and record it in `STATUS.md`** — never run anyway.
- One chain per phase, `--num-workers 4`, minimum epochs that answer the question. No throughput
  benchmarking, no hyper-parameter sweeps, no "let me try one more seed".
- Evaluation (`sweep_infer_size.py`) is cheap (~16 s for 110 boards) and needs no lock.

## Git hygiene

- **One branch per phase**: `spec-25-00-warm-start`, `spec-25-01-dsbn`, `spec-25-02-normalizer-free`.
  Each agent works in its own `git worktree`. Never commit to `main`.
- **Cut from the commit that carries this pack** (`2120406` on `spec-24-frame-the-board`), NOT from
  `main`. `main` has neither `specs/25-normalization-endgame/` nor the two tools this pack depends
  on — `scripts/adabn_recalibrate.py` does not exist there at all, and `sweep_infer_size.py` has no
  `--dataset` override. Corrected 2026-07-30 after phase 00 hit it.
- Atomic conventional commits exactly as named in each phase's Steps. Stage explicitly; never
  `git add -A` across scopes. `data/` is gitignored — no model artefacts in a commit.
- Never `--no-verify`, never force-push, never touch another phase's branch. If a gate fails, fix
  the cause or STOP and write the blocker into `STATUS.md`.

## Static-analysis contract

`ruff` is the linter, `vulture` the dead-code detector, both configured in `pyproject.toml`. Phase
agents run **once, scoped to the files they touched**, at the end:

```
.venv/Scripts/python.exe -m ruff check <your files>
.venv/Scripts/python.exe -m pytest -q tests/test_training.py
```

Zero NEW findings. Do **not** add `# noqa` or a vulture whitelist to go green — fix it or record a
blocker. The repo-wide gate (`ruff check src tests synth`, full `pytest`, `vulture`) is the
orchestrator's job on the merged tree; a per-agent green light measured in an isolated worktree is
not trustworthy.

## Ownership registry — this table overrides any phase file that disagrees

| file | created by | may be extended by | notes |
|---|---|---|---|
| `src/chesslab/training/model.py` | exists | **01 and 02, one branch each** | Both add a norm mode to `_norm_layer` (`:118`) and to the two `build_model` conversion sites (`:344-347`, `:361-364`, `:427-430`, `:436-439`). Keep the diff to that one branch plus one new import so the merge is trivial. Do not refactor the file. |
| `src/chesslab/training/norm_dsbn.py` | **01** | — | new; DSBN module lives here, not in `model.py` |
| `src/chesslab/training/norm_nf.py` | **02** | — | new; ScaledStdConv/SkipInit conversion lives here, not in `model.py` |
| `src/chesslab/training/train.py` | exists | **01 only** | the joint-domain loader is 01's; 02 needs no training-loop change |
| `src/chesslab/cli.py` | exists | 01 and 02, `--norm` help text only | the option already exists (`:573`); extend its help string, nothing else |
| `scripts/adabn_recalibrate.py` | exists | **00 only** | |
| `scripts/sweep_infer_size.py` | exists | **nobody** | frozen for this pack; it is the measurement of record |
| `specs/25-normalization-endgame/STATUS.md` | this pack | every phase, own row only | never rewrite another phase's entry |

## Artifact authority

`scripts/sweep_infer_size.py`'s path-A output **is** the number. A phase reporting accuracy from
`chesslab eval`, from the training log, or from its own harness has not measured the thing this pack
is about. Every phase reports the same six fields: phantoms, misses, per-session split, margin
p99.9, margin max, and the `infer_size` it was served at.

## Definition of done (per phase)

1. Code committed on the phase branch, scoped lint green, targeted tests green.
2. One chain trained (if the phase trains), `--patience 25`, resume parent recorded.
3. `infer_size` set via `chesslab export --infer-size WxH` (validates against `scales`).
4. Measured with `scripts/sweep_infer_size.py --dataset occ-real6 --splits test --paths a`.
5. `STATUS.md` row filled with the six fields, the verdict against the champion's 0 phantoms /
   margin 0.343, and — if negative — the mechanism the phase excluded.

The orchestrator runs the full gate on the merged tree and decides what, if anything, ships.
