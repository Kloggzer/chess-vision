# 22 — Infer at the resolution the camera actually delivers

> Entry file for the spec pack. Every implementing agent reads **this file completely**, then
> exactly the phase file assigned to it. Python (`src/chesslab/serving.py`,
> `src/chesslab/move_tracker/`) is the source of truth; the Kotlin side is a 1:1 port and must
> stay one.

## What this is

The CNN is fed 128×128 crops that carry **110 px of real detail**. Everything above that is
interpolation, and it is not free: on the real holdout the multi-scale GroupNorm champion
`occ-v4-f3e20` reads 43 occupied squares as empty at 128 px and **19 at 96 px** — with zero
phantoms at both — while computing 1.8× fewer pixels.

> ⚠ **Phase 00 corrected the mechanism. Read this before quoting any px/square number.**
> The sensor's resolution never reaches the model. `crops_for_frame` warps to
> `profile.board_size` **first**, and `data/calibration/phone.yaml` — the profile BOTH sessions use
> — has `board_size: 800` with `pad_side: 0.05`. So every crop, from either session, arrives as a
> **110 px box** (`800/8 × 1.10`) before it is resized to the network's input. 128 px therefore
> **upsamples** on this rig, whatever the camera did.
> The quantity that matters is `board_size / 8 × (1 + 2·pad_side)`, **not** px/square at the
> sensor. Android's `TrackerConfig.boardSize` and `config.DEFAULT_BOARD_SIZE` are both 1600 → a
> 220 px box → the phone **downsamples** to 128. That is the argument for a per-model key, and it
> is a stronger one than the sensor story this pack was written on.

Measured 2026-07-29 (tensor-resize curve, `occ-real3` test split, 4 736 crops / 1 715 occupied):

| input | 32 px | 64 px | 96 px | 128 px |
|---|---|---|---|---|
| misses / phantoms | 227 / 0 | 39 / 0 | **18 / 0** | 43 / 0 |

And the native resolution of every session, computed from the corner quads in
`data/sessions/<id>/log.jsonl`:

| session | px/square | role |
|---|---|---|
| `20260708-021722` | **96.9** | the entire test split (4 736 crops, 74 boards) |
| `20260721-212830` | 173.2 | the entire val split |
| `20260721-193821` / `-194538` | 116.0 / 114.7 | the two largest training sessions |
| `20260630-080531` / `-014453` | 213.8 / 214.0 | training |
| `20260708-195420`, `20260709-141209` | 103.3 / 102.3 | training |

**Phase 00 is done. Verdict: R-NATIVE** — `infer_size` is a per-model, per-deployment value, 96 for
the fixed rig. The numbers, the caveats and seven spec discrepancies are in `STATUS.md`; the three
that bind the remaining phases:

1. **The mechanism is the crop box, not the sensor** (see the warning above). Phases 01 and 03 say
   that; the sensor framing is stale.
2. **`infer_size` must be one of the run's own `scales`.** The curve is violently non-monotone at
   untrained sizes: `occ-v4-f3e20` at 80 px reads **133** occupied squares as empty on test, worse
   than both neighbours (64 px → 38, 96 px → 19); at 48 px it collapses to 916. A plausibility band
   like `32..512` would accept 80 and silently lose a hundred squares per split.
3. **96 px is not an improvement for the model currently bundled.** `occ-r3s-f3` goes from 95/152
   at 128 px to 74/243 at 96 px — fewer misses, 91 more phantoms, and worse at the matched
   operating point. Phase 02 therefore lands the *mechanism* and leaves that asset at 128. Serving
   at 96 arrives with the model that wants it.

The val leg of the verdict is confounded and known to be: `best.pt` is selected on val **at
128 px** (`training/train.py:402-403`), so val preferring 128 is what checkpoint selection alone
produces. The test leg is clean and is what "96 for the fixed rig" rests on.

## Why this is worth a pack rather than a one-line edit

The size is hard-coded in three places that must agree or the model silently reads garbage:

- `src/chesslab/training/evaluate.py:153` bakes `out_h, out_w` from the run's `config.json` into
  the ONNX graph (`ONNX_BATCH = 64` at `:132`, deliberately static — see the comment at `:157`).
- `src/chesslab/serving.py:76` reads `out_size` for cropping (`crops_for_model`, `:208`) and for
  preprocessing (`predict_arrays`, `:343`).
- `android/app/src/main/kotlin/com/chesslab/tracker/cnn/ModelSpec.kt:56` **hard-requires** the
  model's `out_size` to be 128×128 and refuses to load anything else.

Python and Kotlin must move together: they are a parity pair, and a resolution split between them
is exactly the kind of divergence the parity harness exists to catch.

## Scope boundary — three things this pack does NOT do

1. **No retraining.** `occ-v4-f3e20` and the bundled run are both multi-scale runs
   (`scales: [32, 64, 96, 128]` in their `config.json`), so 96 is a size they were trained on.
   Inference resolution only.
2. **No model swap.** The pack re-exports the **currently bundled** run at the new size. Whether
   `occ-v4-f3e20` replaces it is a separate decision; record it in `STATUS.md`, do not act on it.
3. **No batch change.** `ONNX_BATCH = 64` and `require(crops.size == batch)`
   (`OnnxSquareClassifier.kt:161`) stay exactly as they are. The 4-crop verify batch is a
   separate, larger change (measured: 35.1 ms → 3.67 ms per call on desktop CPU) and mixing it in
   makes both unreviewable.

## Phases

| Spec | Phase | Depends on | Runs |
|---|---|---|---|
| `00-confirm-the-rule.md` | Which rule holds, R-FIXED or R-NATIVE? | — | **alone, first. Gates the pack.** |
| `01-infer-size-python.md` | `infer_size` as the one authoritative value; export + serving honour it | 00 | **lands alone** (defines the contract) |
| `02-infer-size-android.md` | Kotlin reads it; the 128 guard becomes a real graph assertion | 01 | after 01 |
| `03-document-the-discovery.md` | The finding, in the docs that are actually read | 00 | parallel with 02 (no shared files) |

Phase 01 is a **contract provider**: it defines the `infer_size` key that 02 and 03 describe.
Never run 01 and 02 concurrently — 02 would compile against a half-written contract.

## The one authoritative value — a per-model config key, not a parameter

The resolution is **a property of a model**, so it lives with the model: one key in that model's
`config.json`, editable per model, read by everything.

```json
"infer_size": [96, 96]
```

Nobody passes a size. There is exactly **one reader** (`infer_size_of`, phase 01), exactly **two
writers** (the exporter, and a human editing that model's `config.json`), and every consumer
already holds the object that carries it — `RunSpec` in Python, `ModelSpec` in Kotlin. Changing a
model's inference resolution is: edit its key, re-export, ship. No code change, no CLI flag to
remember, no second place to keep in sync.

Rules, binding on every phase and every consumer:

- `out_size` keeps its existing meaning: **the size the crops on disk were built at** (128×128).
  It stays untouched, in the manifest rows and in every dataset. Do not repurpose it.
- `infer_size` is **the size the exported graph takes and the size consumers must resize crops
  to**. When the key is absent, consumers fall back to `out_size` — every model exported before
  this pack keeps working unchanged.
- The exported `model.onnx` input shape is `[64, C, infer_size[1], infer_size[0]]`. The graph is
  the ground truth; `config.json` describes it. **A consumer that finds a disagreement must fail
  loudly, not resize to whatever it prefers.**

## Protocol for implementing agents

- Branch `spec-22-inference-resolution`, cut from `spec-20-recovery-honesty` (the current
  branch). Never commit to `main`.
- **Trust the code over this spec.** Line numbers drift; the symbol names and grep commands are
  the durable anchors. Where the code contradicts the spec, follow the code and record the
  discrepancy in `STATUS.md` under your phase.
- **If blocked, STOP** and write the blocker into `STATUS.md` with file, line and evidence. Do
  not invent a workaround that changes another phase's contract.
- Append to your own row in `STATUS.md` and to the session log. Never rewrite another phase's
  entry.

## Memory-constraint contract

- Run tests **once**, **targeted** to the paths your phase touches
  (`.venv/Scripts/python.exe -m pytest tests/test_serving.py -q`, or
  `gradlew.bat :app:testDebugUnitTest --tests '*ModelSpec*'`).
- Do **NOT** run the full `pytest`, a full `assembleDebug`, `pytest -m clips`, or the Android
  instrumentation suite. That is the orchestrator's gate, on the merged tree.
- Per-agent green lights are measured against a partial tree and are not trustworthy on their
  own — say in your report what you actually ran.

## Heavy-compute contract

**Phase 00 is evaluation only — no training, no rendering, no Blender.** It runs forward passes
over at most two splits at seven sizes, `num_workers` 4, batch 256, on one process. Do not fan
out, do not sweep additional models "while we are at it", and never start a training run from
inside a phase. An agent's full-tilt render has crashed this machine before.

## Repo rules you will actually hit

- **English** in code, comments and docs.
- **uv is the package manager**; `pyproject.toml` is the single source. No new dependency is
  needed by this pack — if you think you need one, that is a blocker, not a decision.
- The canonical class list lives in exactly one place (`config.CLASSES`). Do not add a second
  place for the resolution either — that is the whole point of `infer_size`.
- Python gate: `uv run ruff check src tests` (or `.venv/Scripts/python.exe -m ruff`). Zero NEW
  findings; no `# noqa` added to get green.
- Android gate: **ktlint + detekt**, configured in `android/build.gradle.kts:8-20`, detekt config
  at `android/config/detekt/detekt.yml`. Run `gradlew.bat :app:ktlintFormat` and let the
  formatter own style — do not hand-edit style findings. Zero NEW detekt findings; no
  `@Suppress` and no baseline entries to pass.
- `gradlew.bat` is invoked through PowerShell on this machine; the Stockfish submodule must be
  initialised before an app build.
- **Do not commit** `data/`, `scans/`, `synth_pieces/`, `wheels/` — they are gitignored.

## Git hygiene

- Atomic conventional commits, exactly as named in each phase's Steps. One concern per commit,
  no drive-by fixes, no squashing phases together.
- Stage explicitly; never `git add -A` across scopes. `git status` must show no unrelated files
  before each commit.
- Never `--no-verify`, never `--force`, never amend or rebase a commit that another agent wrote.
- The re-exported `.onnx` asset in `android/app/src/main/assets/cnn_model/` **is** committed (it
  is not under `data/`); the run directory under `data/models/` is not.

## Ownership registry

**This table overrides any phase file that disagrees with it.**

| file | created/owned by | may be extended by | notes |
|---|---|---|---|
| `src/chesslab/training/evaluate.py` | 01 | — | `run_export`, `ONNX_BATCH`. 02 must not touch it. |
| `src/chesslab/serving.py` | 01 | — | `RunSpec`, `crops_for_model`, `predict_arrays`. |
| `src/chesslab/cli.py` | 01 | — | only the `export` command's new option. |
| `tests/test_serving.py` | 01 | — | if the file does not exist, find the right home via `grep -rln "predict_arrays" tests`. |
| `android/.../cnn/ModelSpec.kt` | 02 | — | the `CROP_SIZE` guard lives and dies here. |
| `android/.../cnn/OnnxSquareClassifier.kt` | 02 | — | graph-shape assertion only; batch stays 64. |
| `android/app/src/main/assets/cnn_model/*` | 02 | — | re-exported asset + its `config.json`. |
| `docs/data-pipeline.md`, `docs/architecture-review/`, `README.md`, `CLAUDE.md` | 03 | — | 02 must not edit docs; 03 must not edit code. |
| `specs/22-inference-resolution/STATUS.md` | all | all | append only, your own row and the log. |

## Artifact authority

The **exported `model.onnx` input shape is the schema**. `config.json`'s `infer_size` describes
it; the Kotlin `ModelSpec` and the Python `RunSpec` code against what the graph actually
declares. A consumer that needs a value the graph does not carry records a gap in `STATUS.md` —
it never invents one.

## No untyped seams

The size crosses the Python→Kotlin boundary as **two integers in JSON**, never as a struct, an
`Any`, or an implicit convention. Phase 02 owns the one integration test that runs the real ORT
session against the real bundled asset and asserts the declared shape and the spec agree — a
test with a fake session on either side proves nothing about the seam.

## Definition of done, per phase

1. Every acceptance criterion in the phase file passes, checked by the exact command given.
2. Targeted tests written and run **once**; the report states what was run and the result.
3. Scoped linter clean, zero new findings, no suppressions.
4. `STATUS.md` row updated and a session-log entry appended, including honest negative results
   ("96 px did not improve X" is a valid and expected outcome).
5. The orchestrator — not the phase agent — re-runs the full gate (`uv run pytest -q`,
   `uv run ruff check src tests synth`, `gradlew.bat assembleDebug`) on the merged tree.
