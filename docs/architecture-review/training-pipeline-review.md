# Training pipeline review — synthetic data → trained model

Review date: 2026-07-19 · Branch `lens-and-pipeline-hardening` @ `059f391`

**Note (2026-08-20):** the browser UI this review measures against no longer exists — the
FastAPI/React layer (`src/chesslab/web/`) was deleted on 2026-08-07 and `platform/app` is a
different tool with a different scope. The **CLI-completeness** half still reads true; every
`web/*` file reference is history. `chesslab collect` went on 2026-08-20 as well.

Scope: the full path from synthetic asset generation to a trained and exported
model, assessed for **CLI completeness** and **browser-UI completeness**, since
the stated goal is to drive the whole pipeline either way.

---

## 1. The pipeline as it exists today

```
turntable photos ──▶ RealityScan ──▶ synth prepare ──▶ synth_pieces/*.obj
                                                            │
                                    fens.py ────────────────┤
                                                            ▼
                                                    synth render (Blender)
                                                            │  {i}.png + {i}.json
                                                            ▼
                                                    ingest synthetic
                                                            │  sessions/ + squares__<tag>/
                                                            ▼
                                                    dataset build ──▶ dataset pack
                                                            │           packed_images.u8
                                                            ▼
                                                          train
                                                            │  best.pt
                                                            ▼
                                              eval / reliance / gradcam
                                                            ▼
                                                export ──▶ quantize
```

### Canonical command sequence (CLI)

```bash
uv run chesslab doctor --gpu                                    # train needs a ROCm GPU

python synth/capture_turntable.py --source 0 --out scans/P/     # (1) NOT a chesslab command
#   RealityScan cloud reconstruction                            # (2) FULLY MANUAL
uv run chesslab synth prepare --in scans_export/ --out synth_pieces/
uv run chesslab synth board-texture --image board.jpg           # optional
python synth/fens.py data/synth_fens.txt --n 200 --seed 42      # (3) NOT a chesslab command
uv run chesslab synth render --out data/synth_raw --n 200 --fens data/synth_fens.txt

uv run chesslab ingest synthetic data/synth_raw --tag synth --limit 50 --debug-overlay 8
uv run chesslab ingest synthetic data/synth_raw --tag synth    # auto-builds + auto-packs

uv run chesslab train --dataset synth --head twostage --backbone mobilenet_v3_small
uv run chesslab eval --run data/models/run-<ts> --split test
uv run chesslab reliance --run data/models/run-<ts>
uv run chesslab export --run data/models/run-<ts> --format all
uv run chesslab quantize --run data/models/run-<ts>
```

The CLI covers the chain end-to-end **except** steps (1)–(3), which drop out of
the `chesslab` namespace into bare `python synth/*.py` invocations.

---

## 2. Coverage matrix

| Stage | CLI | UI | Note |
|---|---|---|---|
| Turntable capture | ✗ (raw script) | ✗ | `synth/capture_turntable.py` |
| RealityScan reconstruction | ✗ | ✗ | manual cloud step, unavoidable |
| Mesh prepare | ✓ `synth prepare` | ✓ Scan tab | the one well-covered synth stage |
| Board texture | ✓ `synth board-texture` | ✗ | |
| FEN list generation | ✗ (raw script) | ✗ | `synth/fens.py` |
| **Blender render** | ✓ `synth render` | ✗ | UI builds the assets but cannot render with them |
| **Ingest** | ✓ `ingest synthetic` | ✗ | UI only displays already-ingested sessions |
| Collect (real capture) | ✓ | ✓ | |
| Slice | ✓ | ✓ | |
| Dataset build | ✓ | ~ partial | UI cannot set `--source-manifest` / `--no-pack`; split fractions inert |
| Pack | ✓ `dataset pack` | ✗ | only rides along inside build; no re-pack from UI |
| Train | ✓ | ✓ | UI omits `--seed`/`--out`, hardcodes `--no-amp` |
| Eval | ✓ | ✓ | 120 s subprocess timeout |
| Reliance / Grad-CAM | ✓ / ✗ | ✓ / ✓ | Grad-CAM is UI-only, no CLI equivalent |
| Export | ✓ 4 formats | ~ ONNX only | `training.py:271` hardcodes `--format onnx` |
| **Quantize (INT8/Hexagon)** | ✓ | ✗ | zero web references |
| Experiment bake-off | ✓ | ✗ | |

**Shape of the gap:** the UI owns the *middle* (collect → slice → build → train →
eval → ONNX) plus one asset-prep corner. Both *ends* are CLI-only — the synthetic
generator that feeds pretraining, and the deployment tail.

---

## 3. Findings

Ordered by how much damage each can do.

### F1 — Dataset build silently discards the UI's val/test split fractions

`components/Dataset.tsx:339` posts `val_frac` and `test_frac`:

```js
buildM.mutate({ name: name.trim(), session_ids, per_cell_cap: cap,
                phash_enabled: phash, phash_hamming: hamming, rotate,
                val_frac: valFrac, test_frac: testFrac });
```

`DatasetCreateRequest` (`web/schemas.py:37-48`) declares neither field, and
`routers/datasets.py:73-78` never forwards them. Pydantic drops unknown keys
without error, so `build_dataset` always falls back to
`config.DEFAULT_VAL_FRAC` / `DEFAULT_TEST_FRAC`.

The two number inputs at `Dataset.tsx:355-356` are therefore **inert controls
that look functional**. A user who sets val=0.10/test=0.30 gets 0.15/0.15 and no
indication otherwise. Either wire them through or remove them; leaving a control
that lies about the artifact it produces is the worst of the three options.

### F2 — Rotation default disagrees between CLI and UI

CLI `--rotate/--no-rotate` defaults to **off**, with the explicit reasoning
(`cli.py:384-386`) that it "quadruples the train split on disk and contradicts
the fixed-camera assumption." The UI defaults it **on** (`schemas.py:44`
`rotate: bool = True`, `Dataset.tsx:317` `useState(true)`).

The same named dataset built through the two front doors is a different dataset —
4× the disk, and augmentation the fixed-camera geometry argues against. Pick one
default and make both paths share it.

### F3 — phash default is wrong for synthetic data, and nothing warns

`dedup_phash`'s own docstring (`dataset_build.py:107-110`) says synthetic callers
"usually want `phash_enabled=False` outright" — otherwise the dedup pass runs for
hours to days on a large synth set. The `ingest` auto-build path correctly passes
`phash_enabled=False` (`ingest.py:282-284`), but a **manual** `dataset build` and
**every UI build** default it to enabled, with no warning.

This is a footgun that presents as a hang, not an error.

### F4 — No job abstraction; three ad-hoc mechanisms instead

- **Training**: a single global `Popen` in `web/state.py:50`, stdout to one fixed
  path `data/models/web_train.log` opened with `"w"` (`training.py:65`) — **every
  new run truncates the previous run's log**. Progress is polling only
  (`Training.tsx:171`, 2.5 s), and the "stream" is the last 8 lines re-read per
  request (`training.py:150`). No WebSocket or SSE exists anywhere in the codebase.
- **Mesh prepare**: a bare daemon thread + status singleton (`scan.py:232-234`),
  no cancellation.
- **Everything else** blocks the HTTP request: dataset build (`datasets.py:73`),
  slice (`sessions.py:304`), eval/export (`subprocess.run(..., timeout=120)`),
  Grad-CAM and reliance (torch in-request).

**Nothing survives a server restart.** `TRAIN` is in-memory and the child is not
in a process group, so restarting uvicorn orphans a running training: the status
endpoint reports `idle` while the subprocess keeps writing to the run dir.

Given the stated goal of driving the pipeline from the browser, this is the
central structural gap — a 12-hour training job is managed by a mechanism with
no durable state, no real log stream, and a log file that the next run erases.

### F5 — Export from the UI cannot reach the deployment target

`training.py:271` hardcodes `"--format", "onnx"`. TorchScript, `qnn` and
`onnx-qnn` are unreachable from the browser, and `chesslab quantize` — the INT8/QDQ
step that the Hexagon NPU path actually requires — has no endpoint at all. The
Android deployment tail is CLI-only.

### F6 — Session IDs are computed but never surfaced

`ingest --no-build` leaves you needing `--sessions <ids>` for `dataset build`, but
the ids (`<tag>__synth-000`, …) are only reported as a *count* (`cli.py:367-368`).
`summary["session_ids"]` exists at `ingest.py:274` and is simply not printed, and
there is no `chesslab sessions list`. This is the sharpest usability break in the
CLI chain.

### F7 — Two orientation-failure modes are silent

Wrong a8-corner assignment transposes every label with no error raised. The only
defense is eyeballing `--debug-overlay` PNGs, which is unenforced and easy to
skip. The synthetic renderer emits corners `[a8,h8,h1,a1]` by construction and is
covered by `test_synthetic_ingest_orientation`, so synth is safe — but the real
ingest paths are not.

### F8 — `--bg-p > 0` silently disables the pack — RESOLVED 2026-08-21

Background randomization needed the individual crop files, so a 50+ GB
`packed_images.u8` was silently ignored for such a run. The augment was removed
(0 of 10 shipped models used it, never measured), and with it the branch — the
packed loader is now unconditional.

### F9 — Stale synth documentation

`synth/README.md:97` and `:20-24` reference `synth/render_chessboard.py`, **which
does not exist** — the real script is `render_board_v2.py`. The "Raw with Blender"
alternative is broken as written. `ingest_adapters/synthetic.py:1` repeats the
stale name. The README's option list (`:84-91`) omits nine real `synth render`
options including `--board-texture`, `--occlusion-p` and `--borderless-p`.

### F10 — Web surface has no auth and serves all of `data/`

`app.py:32` mounts the entire `data/` root at `/img` unauthenticated; there is no
auth, CORS or dependency anywhere in `web/`. The only mitigation is the bind
address (`config.py:531`, `127.0.0.1`). Acceptable for a single-user localhost
tool — worth stating explicitly as a constraint before this is ever bound to
`0.0.0.0`.

### F11 — Dead endpoints

`POST /api/split`, `POST /api/slice`, `POST /api/reslice`, `GET /api/sessions`,
`GET /api/datasets/{name}` have no caller in `frontend/src`.

### F12 — Cache never evicts

`manifest_cache` retains fully materialized `by_label` and `stats_rows` for every
manifest ever touched, with no eviction (`manifest_cache.py:23-59`). A 300k-crop
pool plus per-dataset manifests all stay resident.

---

## 4. What I would do, in order

**To make the CLI complete** (small, mechanical):

1. Print `session_ids` in the ingest summary; add `chesslab sessions list` (F6).
2. Wrap the three orphan scripts as `chesslab synth capture` / `chesslab synth fens`
   so the chain is uniformly `chesslab ...` (steps 1 and 3).
3. Fix the stale `render_chessboard.py` references and the option list (F9).
4. Default phash off — or warn — when the source manifest is a synth variant (F3).

**To make the UI complete** (this is the real work):

5. Introduce **one job abstraction** — a persisted job record (id, kind, args,
   state, log path, pid), per-job log files, and SSE for the tail. Then move
   training, dataset build, pack, slice, eval, export and quantize onto it.
   This single change resolves F4 and unblocks 6–8 below. It is the prerequisite
   for "drive the pipeline from the browser" being true rather than partly true.
6. Add endpoints for the missing stages: `synth render`, `ingest`, `dataset pack`,
   `quantize`, and export formats beyond ONNX (F5).
7. Fix or remove the inert val/test inputs (F1); reconcile the rotate default (F2).
8. Reconcile the UI train form with the CLI (`--seed`, `--out`, and stop
   hardcoding `--no-amp`).

**Note on order:** 5 before 6. Adding a Blender render or a quantize endpoint to
the current inline-blocking model would put a multi-hour job on a threadpool
worker with no cancellation and no restart survival — it would make the coverage
matrix look complete while making the system less usable, not more.

---

## 5. What is in good shape

Worth recording, since a review that only lists defects misrepresents the codebase:

- **The pack resume path is genuinely well hardened** (`059f391`). The manifest
  digest closes a real mislabeling hole, `packed_meta.json` refuses to publish on
  an incomplete pack, and `load_packed` verifies independently at training time —
  defense in depth, with regression tests for each.
- **Split-before-dedup** (`dataset_build.py:302-311`) keeps val/test as complete
  64-square boards while dedup and rotation touch train only. This is the correct
  and non-obvious choice.
- **Per-session splitting** is enforced throughout, closing the leakage trap.
- **The disk preflight now runs before the rmtree** and samples 32 rows for its
  size projection rather than trusting `row[0]` (which was near-always a
  compressible `empty` crop).
- **Windows-specific memmap handling** in `pack.py:74-78` — workers map only their
  own slice to dodge the commit-limit `WinError 1455` — is the kind of detail that
  is only ever written after being bitten by it.
