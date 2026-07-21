# Synthetic Render Pipeline — Usage Guide

Generate a synthetic chessboard image dataset from scanned 3D pieces, rendered in Blender
EEVEE with a photo-textured board. For big runs the renders flow through
`chesslab dataset build-synth` straight into a packed memmap (no crop PNGs); the classic
`chesslab ingest synthetic` chain remains the tool for small sets and visual label checks.
Either way you can pretrain or augment your per-square classifier with unlimited,
perfectly labeled positions.

## Pipeline Overview

```mermaid
flowchart LR
    FEN[fens.py<br/>FEN list] --> RENDER[chesslab synth render<br/>render_board_v2.py<br/>Blender EEVEE, N shards]
    RENDER --> RAW[raw renders<br/>JPEG + JSON + FEN]
    RAW --> FUSE[chesslab dataset build-synth<br/>synth_build.py]
    FUSE --> PACKED[packed memmap<br/>manifest with mm:// rows]
    PACKED --> TRAIN[chesslab train]
    RAW -. small sets / debug overlays .-> INGEST[chesslab ingest synthetic<br/>ingest_adapters/synthetic.py]
    INGEST -.-> CROPS[square crop PNGs + manifest]
    CROPS -.-> DATASET[chesslab dataset build + pack]
    DATASET -.-> TRAIN
```

## Prerequisites

- **12 scanned pieces** in `synth_pieces/<class>/v1.obj` (+ `v1.png` texture, `v1.mtl`).
  Already present — do not regenerate unless you have new scans.
- **Board texture** in `synth_pieces/board_texture.png`. Generate from a rectified board photo:
  ```bash
  uv run chesslab synth board-texture --image scans/board/IMG_20260702_221301.jpg
  ```
- **Blender 5.1** at `C:\Program Files\Blender Foundation\Blender 5.1` (or override via
  `CHESSLAB_BLENDER` env var).

## Step-by-Step Workflow

### 1. Generate FENs

Create a list of diverse chess positions. The `fens.py` module can generate random positions;
alternatively, sample FENs from real PGNs.

```bash
# Generate 2000 random FENs
uv run python -c "
from synth.fens import random_fens, sample_fens_from_pgn
fens = random_fens(2000, seed=42)
with open('data/synth_fens.txt', 'w') as f:
    for fen in fens:
        f.write(fen + '\n')
"

# Targeted neighbour-bleed positions (2026-07-21): tall pieces (queens 2x) in
# stripes with guaranteed empty lines between them — every empty square gets
# 1-2 tall orthogonal neighbours whose 3D lean bleeds into its crop. This is
# the hard-negative material for the "empty dark square read as a piece" gap.
uv run python synth/fens.py data/fens_bleed.txt --mode bleed --n 3000 --seed 7
```

> **Per-view piece-material jitter** (`randomize_piece_materials`, 2026-07-21):
> every scanned piece material carries a neutral `PieceJitter` HSV node that the
> render loop perturbs per view — black pieces get a wide VALUE range (0.55-1.5)
> so the bright-crown outliers where a real bQ looks like a wQ enter training
> with the correct label (the bQ→wQ color-flip class). Smoke-render 8 frames and
> eyeball them before any big run.

> Use a diverse position list — basic position only gives you no class balance variety.

### 2. Render

```bash
uv run chesslab synth render --out data/synth_train --n 2000 --seed 42 \
    --res 1024 --fens data/synth_fens.txt --shards 4
```

Output per sample (in `data/synth_train/` or, with `--shards`, in `shard-<k>/` subdirs):
```
000000.jpg       # Top-down render, JPEG q90 (--res pixels, slightly randomized camera)
000000.json      # {"fen": "<placement>", "corners": [[x,y]×4]}
```

Renders are **JPEG quality 90**, not PNG — ~5× smaller and closer to the real webcam's
JPEG-compressed frames. The board is framed to fill the image (`--frame-frac`, default
0.80), which yields **~134 px per square at `--res 1024`** — matching the ~200 px/square
the real camera delivers far better than the old unframed ~51 px.

`--shards N` spawns N parallel Blender processes: one process leaves the GPU at ~20%,
4 shards reach ~90% (~4× wall-clock). Each shard writes to `<out>/shard-<k>/` with a
disjoint seed and an **interleaved** split of `--fens` (shard k gets lines k, k+N, …),
so every shard sees the same position mix and no FEN is rendered twice. Shard stdout goes
to `shard-<k>/render.log`.

`corners` are the projected board corners in order `[a8, h8, h1, a1]` (exact by construction).
`fen` is the piece placement field only (no turn/castling/en-passant info).

### 3. Verify Labels (Mandatory)

Before building the full dataset, run a visual check to confirm that the FEN labels match
the rendered pieces. An incorrect corner mapping silently flips all labels. The **classic
ingest** is the tool for this — it materializes real overlay PNGs you can eyeball:

```bash
uv run chesslab ingest synthetic data/synth_train --tag pretrain-synth \
    --limit 32 --debug-overlay 8 --no-build
```

Inspect the overlay PNGs: do the piece letters on each square match the rendered pieces?

### 4. Build the Fused Dataset

```bash
uv run chesslab dataset build-synth pretrain-synth --renders data/synth_train \
    --cap 8 --val-frac 0.05 --test-frac 0.05
```

`build-synth` (`src/chesslab/synth_build.py`) goes **renders → packed memmap in one pixel
pass**: each selected frame is loaded once, warped once (at `--board-size` 1100 px,
~137 px/square — matching the framed renders), and its crops are written straight into
`data/datasets/<name>/packed_images.u8`. No crop PNGs are materialized and no phash dedup
runs (synth scenes have no near-duplicates) — on a 100k-per-class set that skips a ~60 GB
middle copy of millions of small files. Manifest rows carry virtual `mm://` paths; all
consumers (train/evaluate/experiment/serving/gradcam/reliance) read the memmap.

Notes on the flags:

- `--cap` (default 4) caps crops per `(session, square, piece)`. With
  `synth render --views-per-scene 4` one scene's 4 views already fill the default cap
  and keep only ~68% of the focus classes — use **`--cap 8`** for large balanced runs.
- `--val-frac` / `--test-frac`: the synth holdout is **uncapped**; 0.05 shrinks the memmap
  considerably vs the defaults on big runs.
- `--rotate` (OFF by default): records 90° rotation augmentation in `dataset.yaml`; it is
  applied **on the fly at train time**, nothing is materialized.
- Shard subdirs are found recursively and become distinct pseudo-sessions (the shard path
  is part of the session group) — a frame-stem collision across shards hard-fails instead
  of silently serving one shard's labels with another's pixels.

The build ends by printing the **per-class train counts** — the number that decides
whether the render run was big enough for your class targets.

The classic chain (`ingest synthetic` → crop PNGs → `dataset build` → `dataset pack`)
still exists and remains the right tool for **small sets**, `--debug-overlay` checks, and
anything that needs real crop files. `dataset pack` refuses fused datasets (already packed).

### 5. Train

Pretrain on synthetic data, then fine-tune on real sessions:

```bash
# Pretrain
uv run chesslab train --dataset pretrain-synth --backbone mobilenet_v3_small \
    --head twostage --epochs 30 --batch-size 32

# Fine-tune (replace <pretrain-run> with the actual run name)
uv run chesslab train --dataset <real-sessions> --resume <pretrain-run>
```

Training on a fused dataset always reads the packed memmap; `--bg-p` background
randomization needs crop files and is ignored there (with a notice).

## Important Notes

- **Assets are pre-built.** The `synth_pieces/` directory contains finished, decimated
  meshes (~35k triangles each). Do not regenerate unless you have new scans. If you need
  to: `chesslab synth prepare`, then `scripts/decimate_pieces.py` to get stable Blender
  meshes (50k+ triangles crashes the native Blender on this machine).
- **No flips; 90° rotation is opt-in and train-time only.** Flips stay forbidden
  (they would break square-color/geometry). 90/180/270° rotation is available as an
  **optional on-the-fly train-time augmentation** (`--rotate` on `dataset build` /
  `dataset build-synth`, applied by `_RandomRot90` in `training/torch_data.py`) — off by
  default because it contradicts the fixed-camera assumption and diverse renders already
  carry the variance. Builds never materialize rotated files.
- **Photometry parity.** The `--photometry` flag during ingest (default: `none`) must match
  the fine-tune dataset's photometry setting.
- **Batch size.** Each render takes ~seconds; batch size is limited by Blender memory and
  GPU VRAM.

## Fallstricke (from real experience — do not skip)

1. **`--debug-overlay` is not optional.** A silent label flip ruins the entire training run.
   Five minutes of visual inspection saves hours.
2. **Blender renders run only on this machine** (Blender 5.1 at the standard install path).
3. **Camera variety is limited** — `--seed` varies pose/lighting marginally. The augment
   pipeline handles the rest.
