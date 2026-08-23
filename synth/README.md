# Synthetic Data Pipeline

Complete pipeline from 3D scan to labeled training data source:
Turntable photos → RealityScan → Isolation → Render → Build (fused) → Training.

## Asset Expectations

- **Blender Scene:** `synth/assets/Chess Scene.blend` (board, camera, lighting)
- **Piece Templates:** `synth_pieces/<X>.obj` + `<X>.png` (texture)
  - Naming scheme: `wP.obj`/`wP.png` (white pawn), `bN.obj`/`bN.png` (black knight),
    or `P.obj`/`P.png` (uncolored, then used for both colors).
  - Pieces without a scan fall back to procedural Staunton templates from the .blend.

## Corner Order (CONTRACT — DO NOT CHANGE)

Each rendering's JSON contains `corners: [a8, h8, h1, a1]` in **this order**.
A different order silently swaps all labels (mirroring/rotation).
Guardian test: `tests/test_ingest_synthetic.py::test_synthetic_ingest_orientation`.

## 1. Turntable Capture

```bash
# Handy als IP-Kamera (der uebliche Weg), ENTER pro Foto:
uv run python synth/capture_turntable.py --source https://<PHONE-IP>:4444/video/snapshot --out data/turntable/P/
# USB-Kamera mit gesperrter Optik (Pflicht fuer Photogrammetrie):
uv run python synth/capture_turntable.py --source 0 --exposure -6 --wb 4000 --focus 0 --out data/turntable/P/
```

Es gibt kein `--piece`: der Zielordner benennt die Figur.

**Anti-Flicker Note:** Dim room lights, disable camera image stabilization,
fix white balance and exposure (no auto mode). Camera on tripod.

## 2. RealityScan (Cloud)

Upload photos → download mesh + texture. Output is a `.obj` + `.png`/`.jpg`.

## 3. Prepare (isolate + decimate + quality report) — `chesslab synth prepare`

**Recommended path — Blender never needs to be opened.** Place scans under `<in>/<piece>/`
(piece name = directory name: `P`, `wN`, …; inside, the RealityScan output — preferably the raw
`.obj` + `*_diffuse.png`; `.glb` also works, but usually references its texture externally,
so put the diffuse PNG in the folder as well):

```bash
uv run chesslab synth prepare --in scans_export/ --out synth_pieces/
```

Per piece everything happens automatically (all steps as toggles):
- **Isolate:** Find support surface via PCA, keep piece cluster (`--keep-radius`, default 1.9),
  stand upright (base z=0, axis +Z).
- **Clean up:** keep only the largest connected component (`--no-keep-largest` disables),
  close open edges/base + normals outward (`--no-fill-holes`).
- **Decimate:** to `--target-tris` (default 20000; `0` = off). RealityScan delivers millions
  of triangles — 32 pieces' worth is unrenderable; 20k per piece is easily enough for 1024px renders.
- **Smooth:** Laplacian with volume preservation against scan bumps (`--smooth-iters`, 10 mild,
  25–40 strong, `0` = off).
- **Quality:** `<piece>_report.json` (triangles, holes, proportions) + `<piece>_preview.png`
  (orthographic side view). The summary marks [WARN] with a concrete hint.

**Assess quality:** View the preview (upright? base on bottom? gaps?) + read [WARN] hints.
`height_ratio` outside ~0.9–4.0 almost always means: isolation caught the background
(domed support surface!) or the piece is lying down — flatten the support surface or adjust `--keep-radius`.
Many `boundary_edges` = real scan holes: take additional photo passes at 2–3 camera heights
(especially low for constrictions like the pawn's neck). Absolute size does not matter: the
renderer normalizes to target height.

Manual (a single scan, same flags):

```bash
blender --background --python synth/isolate_piece.py -- \
    scan.obj diffuse.png "synth_pieces/P.obj" "synth_pieces/P_preview.png" --target-tris 20000
```

## 4. Generate FEN List

```bash
uv run python synth/fens.py data/synth_fens.txt --n 200 --seed 42
```

## 5. Rendering

### Via CLI (recommended)

```bash
uv run chesslab synth render --out data/synth_raw --n 200 --fens data/synth_fens.txt
```

Output per sample: `<i>.jpg` (JPEG q90 — smaller and closer to the real webcam's JPEG
frames than PNG) + `<i>.json` (FEN + corners). The board is framed to fill the image
(`--frame-frac 0.80` → ~134 px/square at `--res 1024`).

Options:
- `--blend` — Blender scene (default: `synth/assets/Chess Scene.blend`)
- `--pieces-dir` — Piece templates (default: `synth_pieces/`)
- `--n` — Number of renderings (default: 200)
- `--seed` — Seed (default: 42)
- `--fens` — FEN list (otherwise fallback to starting position)
- `--res` — Resolution in px (default: 1024)
- `--shards` — Parallel Blender processes; output in `<out>/shard-<k>/` with disjoint
  seeds and an interleaved FEN split (1 proc ≈ 20% GPU, 4 shards ≈ 90%, ~4× wall-clock)
- `--blender` — Blender executable (default: `blender`, via env `CHESSLAB_BLENDER`)

### Raw with Blender (Alternative)

```bash
blender --background "synth/assets/Chess Scene.blend" \
    --python synth/render_board_v2.py \
    -- --out data/synth_raw --n 200 --seed 42 --res 1024 \
       --fens data/synth_fens.txt --pieces synth_pieces
```

## 5b. Camera-Look Degradation (optional, DESTRUCTIVE)

```bash
uv run python synth/degrade.py data/synth_raw/shard-0   # rewrites the renders IN PLACE
```

Mild contrast / warm-shift / defocus / sensor-noise / JPEG pass that closes the "EEVEE is
razor-sharp" sim-to-real gap. **Not idempotent** — a second pass double-degrades, and
`data/synth_occ_v1` was *not* run through it. Copy the renders first if unsure.

The sensor-noise σ is injected at board resolution but only ~0.26 of it survives the warp to a
128×128 crop, so it is calibrated at **crop** level (σ 16–22, 2026-07-28). Check any change with

```bash
uv run python synth/measure_noise.py data/datasets/occ-synth --label empty --n 400
```

which prints p10/p50/p90 of the high-frequency energy of `empty` crops. See
[`docs/synth-pipeline.md`](../docs/synth-pipeline.md#3b-camera-look-degradation-synthdegradepy--optional-destructive)
for the measured real-vs-synth table and `docs/synth-pipeline-noise.png` for the visual probe.

## 6. Build the Dataset

**Visual check BEFORE anything else** (classic ingest, materializes overlay PNGs):
```bash
uv run chesslab ingest synthetic data/synth_raw --tag synth-check --limit 32 --debug-overlay 8 --no-build
```
The overlay PNGs show the rectified crop + FEN label — verify that the pieces land on the
correct squares.

Then the **fused build** (the entry point for synth datasets — renders go straight into
the packed training memmap, no crop PNGs, no phash):
```bash
uv run chesslab dataset build-synth synth --renders data/synth_raw \
    --cap 8 --val-frac 0.05 --test-frac 0.05
```
Shard subdirs from `--shards` are found recursively and become distinct pseudo-sessions.
Manifest rows carry virtual `mm://` paths; training/eval read the memmap. `--rotate`
records optional 90° augmentation, applied on-the-fly at train time (nothing on disk).
See [`docs/synth-pipeline.md`](../docs/synth-pipeline.md) for flag guidance (`--cap 8`
with `--views-per-scene 4`, holdout sizing).

The classic chain (`chesslab ingest synthetic data/synth_raw --tag synth` → crop PNGs →
`dataset build`) remains available for small sets and anything needing real crop files.

## 7. Training

```bash
uv run chesslab train --dataset synth --head twostage --backbone mobilenet_v3_small
```

Or pretrain → finetune with the synth dataset as the first curriculum stage.
