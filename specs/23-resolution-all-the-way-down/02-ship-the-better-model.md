# Phase 02 — Ship the model that reads the board better

**Blocked by 00 (which size) AND 01 (the app must be able to produce it). Starts only when both are
committed. If phase 00 recorded STOP, this phase does not run.**

## Why

The app ships `occ-r3s-f3`: **95 misses / 152 phantoms** on the real holdout. `occ-v4-f3e20` reads the
same session at **43 / 0** — fewer than half the squares missed, and no invented occupancy at all. A
miss licenses a fabricated capture and cascades into a whole invented game, so this is the accuracy
change the last two packs were groundwork for.

## Design (decided — do not redesign)

### 1. Read the verdict, do not re-derive it

`specs/23-resolution-all-the-way-down/STATUS.md`, phase 00's table, names the `infer_size` to ship.
Use that value. It is one of `[32, 64, 96, 128]` — the run's trained `scales`, enforced by the
exporter. If the table names STOP, stop.

### 2. Export and swap

```bash
uv run chesslab export --run data/models/occ-v4-f3e20 --format all --infer-size <from STATUS>x<...>
```

Copy `model.onnx`, `model.qnn.onnx` and `config.json` into
`android/app/src/main/assets/cnn_model/`. **Never hand-edit the asset's `config.json`** — that is how
the shipped graph and its description drifted apart in `b24f1f3`.

`occ-v4-f3e20` is 2-class `["empty", "occupied"]`, the same head the app already consumes
(`requireExpectedClasses` accepts the 2-class occupancy order), so no Kotlin change should be needed.
**Verify that rather than assuming it** — the run's `config.json` is the authority for `classes`,
`normalize.mode`, `input_repr` and `in_chans`, and `ModelSpec` reads all four.

### 3. Prove the swap on device-shaped inputs before it is called done

The seam test specs/22 built (`ModelSpecGraphSeamTest`) already loads the real asset through a real
ORT session. Extend it, or add next to it:

- the declared graph shape matches the new `infer_size`;
- 64 real crops at that size run through `OnnxSquareClassifier.open` and return 64 × 2 probabilities;
- **the crop pipeline actually produces that size** — phase 01's wiring, exercised end to end rather
  than in isolation. If this fails, the blocker is phase 01's and belongs in `STATUS.md`.

### 4. What this phase must NOT quietly become

- **Not a batch change.** `ONNX_BATCH = 64` and `require(crops.size == batch)` stay. The 4-crop verify
  batch (35.1 ms → 3.67 ms on desktop CPU) is a separate, larger change.
- **Not a norm change.** `occ-v4-f3e20` is GroupNorm and stays GroupNorm; the BatchNorm question was
  settled by measurement (293 phantoms against 0 at a matched operating point).
- **Not a threshold change.** Ship argmax, as today.

## Steps

### 1. asset — commit `feat(android): ship occ-v4-f3e20, which reads the board better`

### 2. tests — commit `test(android): the shipped asset's size reaches the crop pipeline`

### 3. `STATUS.md` — commit `docs(specs): phase 02 — what shipped and what it measured`

## Tests (write, run once, targeted)

```
gradlew.bat :app:testDebugUnitTest --tests '*ModelSpec*'
```

Run **once**. Do NOT run `assembleDebug` — the orchestrator gates the merged tree.

## Acceptance criteria

- `android/app/src/main/assets/cnn_model/config.json` carries `infer_size` equal to phase 00's value
  and `classes` `["empty", "occupied"]`.
- `.venv/Scripts/python.exe -c "import onnx; m=onnx.load('android/app/src/main/assets/cnn_model/model.onnx'); print([d.dim_value for d in m.graph.input[0].type.tensor_type.shape.dim])"`
  prints `[64, 3, S, S]` with `S` = that value.
- The asset's three files are sha256-identical to the ones under `data/models/occ-v4-f3e20/` — the
  copy is a copy, nothing was regenerated in between.
- Targeted Kotlin tests green.
- `gradlew.bat :app:ktlintCheck :app:detekt` — zero new findings.

## Do NOT / out of scope

- Do not touch `src/chesslab/**`, `docs/**`, `README.md`, `CLAUDE.md`.
- Do not change the batch, the norm, the threshold, or `board_size`.
- Do not delete or overwrite the previous asset's history — the old model stays reachable in git.
- Do not park or archive any dataset or run. `data/` is gitignored: park, never delete.
