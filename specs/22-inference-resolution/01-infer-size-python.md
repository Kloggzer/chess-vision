# Phase 01 — `infer_size`: one value, written by the exporter, read by everyone

**Blocked by 00. Lands ALONE — phase 02 codes against the contract this phase defines.**

## Why

Three files independently derive the network's input size from `config.json["out_size"]`, which
actually means "the size the crops on disk were built at". Those two things have been the same
number until now. Making them differ needs a name of its own, in exactly one place, or the next
reader will fix the "inconsistency" back.

## Design (decided — do not redesign)

### The key IS the configuration

A model's inference resolution is a property **of that model**, so it lives in that model's
`config.json` and nowhere else:

```json
"infer_size": [96, 96]
```

Changing a model's resolution is editing that key and re-exporting. There is no parameter to
thread through call sites, no app-side constant, and no second copy to keep in sync. `out_size` is
**not** touched — not in `config.json`, not in manifests, not in datasets; it keeps meaning "the
size the crops on disk were built at".

**Exactly one reader.** Add to `src/chesslab/training/torch_data.py`, next to `input_repr_of`
(`:134`):

```python
def infer_size_of(cfg: dict) -> tuple[int, int]:
    """(W, H) the network is fed. A model property, read from its own config.json.

    Runs exported before specs/22 carry no key and were served at their crop size."""
    raw = cfg.get("infer_size") or cfg["out_size"]
    return int(raw[0]), int(raw[1])
```

**And it must be a size the run was trained on.** Phase 00 measured what an untrained size does:
`occ-v4-f3e20` (`scales: [32, 64, 96, 128]`) reads **133** occupied squares as empty at 80 px
against 38 at 64 and 19 at 96, and 916 at 48. The failure is silent — no exception, just a hundred
squares gone. So the **writer** validates, once, where the value enters:

```python
scales = cfg.get("scales")
if scales and (w not in scales or h not in scales):
    print(f"[FAIL] --infer-size {w}x{h} is not one of this run's trained scales {scales}. "
          "Untrained sizes fail silently: 80px costs this backbone 133 misses against 96px's 19.")
    return 1
```

Square sizes only (`w == h`); the trained `scales` are scalars. A run with no `scales` key was
trained at one size — then `infer_size` must equal `out_size`. Do **not** put this check in
`infer_size_of`: reading a config is not the place to reject one, and every consumer would pay for
it on every call.

Every consumer calls this. `grep -rn "cfg\[.out_size.\]" src/chesslab/serving.py` must come back
empty when the phase is done — that grep is the acceptance criterion for "one reader".

**Exactly two writers.** `training/train.py` writes it once at run creation (default: `out_size`,
so every new run is explicit rather than relying on a fallback), and a human edits it when a model
should be served at a different size. The exporter **reads** it like everyone else.

### The CLI

`src/chesslab/cli.py:650` gains one option, for convenience only — it writes the key, it is not a
second source of truth:

```python
infer_size: str | None = typer.Option(
    None, "--infer-size",
    help="Set the model's inference size WxH (e.g. 96x96) in its config.json, then export at it. "
         "Omit to use what the model already declares. ~97 px/square is what the camera delivers "
         "— see specs/22."),
```

Parse with the existing `labeling.parse_out_size` (`src/chesslab/labeling.py:85`) — do not write a
second parser.

### The exporter

`src/chesslab/training/evaluate.py`, `run_export` (`:135`):

```python
def run_export(run: str, fmt: str = "torchscript",
               infer_size: tuple[int, int] | None = None) -> int:
```

- When `infer_size` is given, write it into the run's `config.json` **first**, then read the size
  back through `infer_size_of(cfg)` — so the exported graph is always what the config declares,
  never a value that only existed in an argument.
- The traced example becomes `torch.randn(ONNX_BATCH, input_repr_of(cfg)[1], h, w)` with
  `w, h = infer_size_of(cfg)` (currently `:153`).
- **`ONNX_BATCH` stays 64 and stays static.** Read the comment at `:157` before touching anything
  near it — a dynamic batch dim has already shipped twice and broken the app both times.
- The model card (`build_model_card`, `src/chesslab/training/data.py:189`) gains the same key,
  next to its existing `out_size`.
- TorchScript is traced at the same size — one size per export, never two.

### The consumers ask the object they already hold

No consumer learns a new fact; the one they already carry gains a field.

`src/chesslab/serving.py`:

- `RunSpec` (`:52`) gains `infer_size: tuple[int, int]`, filled by `run_spec` (`:61`) via
  `infer_size_of(cfg)`. `RunSpec` is already "tells all consumers how to crop a frame for this
  model" (its own docstring, `:52`) — this is that sentence, one field wider.
- `crops_for_model` (`:208`) passes `spec.infer_size` to `labeling.crops_for_frame`, not
  `spec.out_size`. **This is the behavioural change**: the frame is cropped straight to the
  inference size, with no intermediate 128 px step and no double resampling.
- `predict_arrays` (`:329`) and `predict_rows` (`:413`) call `infer_size_of(cfg)`. The fast path at
  `:346` ("all crops already at out_size") must compare against the inference size, or it will
  silently take the slow path forever.
- `_graph_predictor` / the `out_h, out_w` it is constructed with (`:256`, `:297`) follow the same
  value.

### What must NOT change

Training, dataset building and evaluation keep using `out_size`. `chesslab eval` measures the
model on the crops as built; it is not a deployment path. If you find yourself editing
`train.py`, stop — you are outside this phase.

## Steps

### 1. `src/chesslab/training/torch_data.py` — commit `feat(training): infer_size_of, the one place the inference size comes from`

### 2. `src/chesslab/training/evaluate.py` + `src/chesslab/training/data.py` — commit `feat(export): export the graph at an explicit inference size`

### 3. `src/chesslab/cli.py` — commit `feat(cli): export --infer-size`

### 4. `src/chesslab/serving.py` — commit `feat(serving): crop and predict at the model's inference size`

## Tests (write, run once, targeted)

Find the home first: `grep -rln "run_spec\|predict_arrays" tests`. Add there, do not create a
parallel file.

1. `test_infer_size_falls_back_to_out_size` — a `config.json` without the key yields
   `infer_size == out_size`. This is the compatibility guarantee for every shipped model.
2. `test_run_spec_reads_infer_size` — with `"infer_size": [96, 96]` and `"out_size": [128, 128]`,
   `RunSpec.infer_size == (96, 96)` and `RunSpec.out_size == (128, 128)`. Both, in one assertion
   block — the point is that they differ.
3. `test_export_rejects_an_untrained_size` — a run with `scales: [32, 64, 96, 128]` and
   `--infer-size 80x80` exits non-zero and the message names the trained scales. This is the
   silent-failure guard; it is the most valuable test in this phase.
4. `test_export_bakes_infer_size_into_the_graph` — export a tiny run with `infer_size=(96, 96)`,
   load the `.onnx` with `onnx.load`, assert the input shape is `[64, 3, 96, 96]` and that the
   run's `config.json` now carries the key. **This is the artifact-authority test**: the graph and
   the JSON must agree.
5. `test_crops_for_model_uses_infer_size` — a stub frame through `crops_for_model` returns crops of
   the inference size, not 128.

```
.venv/Scripts/python.exe -m pytest tests/<file> -q
```

Run it **once**. Do not run the full suite.

## Acceptance criteria

- `grep -rn "cfg\[.out_size.\]" src/chesslab/serving.py` returns **nothing** — every serving read
  goes through `infer_size_of`.
- `grep -rn "infer_size" src/chesslab | grep -c .` ≥ 6 and every hit is either the helper, the
  exporter, the CLI option, or a serving consumer.
- `grep -n "ONNX_BATCH = 64" src/chesslab/training/evaluate.py` still hits — the batch is
  untouched.
- `.venv/Scripts/python.exe -c "import onnx; m=onnx.load('data/models/occ-v4-f3e20/model.onnx'); print(m.graph.input[0])"` shows `96` twice after running
  `uv run chesslab export --run data/models/occ-v4-f3e20 --format onnx --infer-size 96x96`.
- `uv run ruff check src tests` clean, zero new findings.

## Do NOT / out of scope

- Do not touch `training/train.py`, dataset building, or any manifest. `out_size` is theirs.
- Do not change `ONNX_BATCH`, the batch requirement, or anything about dynamic axes.
- Do not touch anything under `android/`. That is phase 02, and it starts only after this one is
  committed.
- Do not re-export or replace the bundled Android asset here — phase 02 owns that file.
