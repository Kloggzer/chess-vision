# Synthetic Data Pipeline — Resource Efficiency Review

*Scope: `chesslab synth render` → `ingest synthetic` → `dataset build` + pack → `train`.
Analysis of the code as of branch `lens-and-pipeline-hardening` (2026-07-20). No code changed.*

*Every `file.py:NNN` below is a line number from that snapshot and most have moved since —
search for the symbol, not the line. `photometric.py` was deleted on 2026-08-20.*

Machine context: 32 GB RAM, ~260 GB free disk, single GPU. Last full generation:
66k renders (~60 GB PNG) → 2.9M crop PNGs (~61 GB) → 101 GB memmap (2M crops incl. 4×
rotation) ≈ **222 GB for one dataset generation** — three on-disk copies of the same pixels.

## Executive summary

| # | Issue | Proposal | Est. saving / gain | Effort |
|---|-------|----------|--------------------|--------|
| 1 | **Rotation augmentation is materialized 3×**: `_apply_rotations` writes a new PNG per non-zero rotation (`dataset_build.py:150-176`) *and* the pack writes every manifest row — rotated rows included — into the memmap (`pack.py:155`). At 2M rows the memmap is 4× larger than the unique pixels. | Rotate **on the fly** in `PackedSquareDataset.__getitem__` (`np.rot90` on the copied array is ~free); manifest keeps `rot` per row but `path` points at the base crop, pack dedups to unique crops. | **~75 GB memmap + ~45 GB rotated PNGs** at the 2M scale; memmap 101 → ~25 GB (fits page cache!) | M |
| 2 | Raw renders are full-res **PNG** (`render_board_v2.py:1172`, ~0.9 MB each → ~60 GB / 66k). | Render to **JPEG q≈90** (`scene.render.image_settings.file_format = "JPEG"` + `quality`), optionally behind `--render-format`. JPEG artifacts *match* the real webcam source (MJPG/YUY2→JPEG-ish), so realism improves if anything. | **~45-50 GB** (60 → ~10-14 GB) | S |
| 3 | **Crop-PNG intermediate copy** (~61 GB): `slice_session` writes 64 PNGs per frame (`labeling.py:359`), which exist only to be re-decoded once by the pack. | Long term: fuse ingest→pack (slice directly into the memmap / sharded container). Short term: `ingest --purge-renders` style flag is *not* recommended (keep-data rule); instead rely on #2 making renders cheap to keep. | **~60 GB** (big bet, see D3) | L |
| 4 | Render parallelism is **manual** (4 hand-launched Blender shard processes to reach 85-90 % GPU vs ~20 % single). | Built-in `synth render --shards N`: spawn N Blender subprocesses with `seed+i`, `--n n/N`, out subdirs `out/shard-i`. **No merge step needed** — `ingest_adapters/synthetic.py:28` already uses `root.rglob("*.json")`. | ~4× wall-clock, one command, deterministic | S-M |
| 5 | Ingest is **single-process** (sequential `slice_session` loop, `ingest.py:168-177`); 8 parallel ingests were launched by hand. | `ingest --workers N`: per-session `ProcessPoolExecutor`; each worker slices to a per-session temp manifest, parent concatenates (manifest append is the only shared write). | ~6-8× ingest wall-clock | M |
| 6 | Training epoch over a **>RAM memmap** = ~100 GB of effectively uncached random 48 KB reads per epoch (`shuffle=True`, `train.py:257`). | Primary fix is #1 (25 GB memmap ≈ cacheable). Additionally a **chunk-shuffled Sampler** (permute blocks of ~8k contiguous indices, shuffle within block) turns random I/O near-sequential with negligible shuffle-quality loss. | Epoch-1 cold time ↓ 5-10×; no page thrash | S |
| 7 | **Per-worker RAM on Windows spawn**: `PackedSquareDataset.self.rows` keeps the full row-dict list (`torch_data.py:195`) and is pickled into every DataLoader worker (6 by default, `train.py:253`) → ~1-2 GB × workers at 2M rows. | Don't ship `rows` to workers (only the two int64 arrays are needed for `__getitem__`); keep rows parent-side for evaluate grouping. | several GB RAM during training | S |
| 8 | Ingest warps at `--board-size 900` = 112 px/square (`cli.py:347`) while renders now carry ~134 px/square → resolution silently thrown away before the 128 px crop. | Use/`default` `--board-size 1100` (≈137 px/square) for synthetic ingest. | quality, ~free (crops stay 128²) | S |
| 9 | Render res: is 1024 wasteful? | **No — it is the floor.** `frame_frac 0.80` ⇒ board max extent ≈ 819 px ⇒ ~102 px/square nominal (up to ~134 on the near side). The 128² crop incl. `pad_side 0.1` wants ~135 px source. Don't lower res; if anything raise `--frame-frac` toward 0.85 rather than `--res`. | avoids a silent quality regression | — |
| 10 | 2.5D compositing (10-100× render speedup). | **Previously evaluated and rejected by the user (final decision 2026-07-06)** — full per-scene 3D lighting is a hard requirement; even the lit-sprite-atlas hybrid was rejected. Not re-proposed. `--shards` (#4) + `views_per_scene` are the sanctioned levers. | n/a | — |

Combined effect of #1+#2 for the upcoming re-render (details below): **peak disk ~95-130 GB
instead of ~222 GB**, memmap small enough that epochs ≥2 run at page-cache speed.

---

## Stage 1 — Render (`synth/render_board_v2.py`, `chesslab synth render` in `cli.py:754`)

**What it does well already:** scene reuse (`use_persistent_data`, `render_board_v2.py:1175`) with
`--views-per-scene` (piece placement built once, camera/light per view); subsurf only for
procedural fallback pieces (`:847-850`); EEVEE TAA samples as the speed knob (`set_engine_fast`,
`:1113`).

### Disk: PNG output (proposal #2)
`main()` hardcodes `scene.render.image_settings.file_format = "PNG"` (`:1172`). A 1024² render
compresses to ~0.9 MB PNG; JPEG q90 is ~130-180 KB with no visible loss at the 128-crop level —
and the deployment camera delivers compressed frames anyway, so mild JPEG texture is
domain-*matching*, not domain gap. Ingest reads via `cv2.imread` (`ingest.py:198` /
`labeling.slice_session`), which is format-agnostic; the adapter matches `jf.with_suffix(".png")`
(`ingest_adapters/synthetic.py:30`) — that one line needs to try `.jpg` too. Estimated: 66k
frames drop from ~60 GB to ~10-14 GB. Effort S.

### Throughput: built-in sharding (proposal #4)
Observed: one Blender process ≈ 1.55 s/frame at ~20 % machine utilization; 4 manual shard
processes ≈ 4× and 85-90 % GPU. `synth_render` (`cli.py:754-832`) already builds the full
subprocess command; a `--shards N` option would:

- split `--n` into N parts, pass `--seed seed*1000+i` (disjoint RNG streams),
- optionally stride the FEN file per shard (or just rely on distinct seeds — FENs are cycled
  by `scene_idx % len(fens)`, `render_board_v2.py:1198`, so shards starting at index 0 with the
  same FEN file would render the **same positions**; either slice the FEN list per shard or
  offset the start index),
- write to `out/shard-00 … shard-0N` and run N `subprocess.Popen` concurrently.

No downstream change: `iter_items` recurses with `rglob` and groups pseudo-sessions by
`int(stem) // 100`, so shard subdirectories ingest as-is (per-shard stems collide across shards
into the same group name → those sessions simply merge; view-pairs of one scene still stay in
one chunk because they are consecutive within a shard). Effort S-M.

### `views_per_scene` tuning
Scene build per FEN = importing nothing (templates are prebuilt), just linking ~32 objects +
material randomization — cheap (~0.1-0.3 s) versus ~1.55 s/view render. At `views=4` the build
overhead is already amortized to <5 %; raising to 8 saves ~3 % more wall-clock but halves
position diversity per frame budget. **4 is the right setting**; do not raise for speed reasons.

### Resolution (proposal #9)
Commit 37d56db (frame the board, `BOARD_FRAME_FRAC = 0.80`, `render_board_v2.py:872`) fixed the
51 px/square waste. Now: usable px/square ≈ `res × frame_frac / 8` ≈ 102 nominal (134 near-edge
under perspective). The crop pipeline needs `cell × (1 + 2×pad_side) = cell × 1.2` ≈ 135 px of
source for a clean 128² crop. So 1024 is **slightly under**, not over — lowering `--res` would
reintroduce the synth-crop-resolution gap. If more px/square are wanted, `--frame-frac 0.85` is
free; `--res 1280` costs ~1.56× render time.

---

## Stage 2 — Ingest (`src/chesslab/ingest.py`, `ingest_adapters/synthetic.py`)

Sessions are synthesized as metadata only (frames point at the original renders — good, no
copy, `ingest.py:132`). The cost is `slice_imported` (`:157-180`): a sequential per-session loop
over `labeling.slice_session`, each frame decoded, warped once, and split into 64 PNG writes
(`labeling.py:359`).

- **Parallelism (proposal #5):** sessions are fully independent (own `log.jsonl`, disjoint crop
  output dirs per label are shared but filenames are unique per frame/square). The only shared
  mutable artifact is the variant manifest `squares__<tag>.jsonl`. A `--workers N` pool where
  each worker returns its manifest lines (or writes `squares__<tag>.<sid>.jsonl` parts that the
  parent concatenates) parallelizes cleanly. The manual 8-process run proved the workload
  scales; building it in removes the foot-gun of hand-partitioning session lists. Effort M.
- **Warp resolution (proposal #8):** `ingest_cmd` defaults `--board-size 900` (`cli.py:347`,
  112.5 px/square) — tuned for the phone source, but it now *down*samples the 134 px/square
  renders before cropping. For synthetic ingest pass/raise to ~1100. Zero cost (crop out_size
  stays 128², `config.py:59`).
- **Crop-PNG copy (proposal #3):** see "Big bets" below. Note the crop PNGs are not purely
  redundant today: `dedup_phash` reads them (disabled for synth anyway — `dataset_build.py:97`
  docstring says synthetic sets should run `phash_enabled=False`) and the web UI browses them.
  The `bg_p > 0` reason for needing them is gone with the augment itself (2026-08-21). A fused path
  must either keep a small sample of PNGs for inspection or render crops from the memmap.

---

## Stage 3 — Dataset build + pack (`dataset_build.py`, `training/pack.py`)

### The rotation multiplier (proposal #1 — the single largest saving)
`build_dataset` applies rotations only to train rows, but **materializes** them:
`_apply_rotations` (`dataset_build.py:150-176`) decodes each crop and writes
`<stem>_r{deg}.png` under the dataset dir — 3 extra PNGs per train crop with
`(0, 90, 180, 270)`. These rows then flow into `manifest.jsonl`, and `pack_dataset` packs
**every manifest row** (`pack.py:155`: `items = [(i, r["path"]) for i, r in enumerate(rows)]`)
— so the 101 GB memmap holds each unique train crop **four times, merely rotated**. (Contrary
to a note floating around: the rotations are *not* manifest-only — they cost full disk twice.)

Fix: keep `rot` in the manifest row but leave `path` = base crop; pack only unique paths;
`PackedSquareDataset` stores a per-row `rot` int8 array next to `idx`/`labels` and applies
`np.rot90(arr, k)` in `__getitem__` before the PIL conversion — a 128² uint8 rot90 is a view +
copy, microseconds, and (unlike the photometric transforms) exactly reproduces the baked pixels.
Savings at the 2M-row scale: memmap 101 → ~25 GB, plus ~45 GB of `_r{deg}.png` never written,
plus 4× faster pack. `_preflight_disk_check` (`dataset_build.py:179`) then shrinks accordingly.
Effort M (touches `_apply_rotations`, `_manifest_digest` semantics, `PackedSquareDataset`,
`load_packed` path→index mapping).

Also worth restating: rotation contradicts the fixed-camera rule (`dataset_build.py:15`,
CLAUDE.md) and is off by default (`config.py:201`); if the next pretrain doesn't need it, simply
not passing `--rotate` realizes the same 4× saving with zero work.

### Pack RAM profile at 32 GB — already sound
- Chunks of 256 MB (`_PACK_CHUNK_BYTES`, `pack.py:68`); each worker maps **only its chunk**
  (`pack.py:87`, explicitly fixed after the WinError-1455 commit-charge blowup), so peak commit ≈
  workers × (256 MB map + one decoded PIL image) ≈ 2-3 GB with the default
  `min(8, cpu)` workers (`pack.py:156`). No change needed.
- Minor: `progress_path.write_text` per completed chunk (`pack.py:164`) rewrites the full done-list
  each time — O(chunks²) bytes but trivially small. Ignore.
- The file allocation via `truncate` (`pack.py:121`) creates a sparse-ish file — fine.

### Dedup
`dedup_metadata` cap and the LSH-banded `dedup_phash` are fine algorithmically; for synth the
correct configuration is already documented in code (`per_cell_cap` high / phash off,
`dataset_build.py:106-111`, and `run_ingest` passes exactly that, `ingest.py:282-284`). One RAM
note: `build_dataset` holds all rows as dicts in memory (~2-3 GB at 4M rows) — acceptable,
below the pack/training peaks.

---

## Stage 4 — Train (`training/train.py`, `training/torch_data.py`)

### Read pattern over a >RAM memmap (proposal #6)
`DataLoader(shuffle=True)` (`train.py:257`) over `PackedSquareDataset` issues one 48 KB
`memmap` slice per item at a uniformly random offset. With a 101 GB file on 32 GB RAM the page
cache can hold <⅓, so **every epoch** re-reads ~70-100 GB from disk in random order — this is
the "epoch-1 is cold" pain, except it never warms. Two-part remedy:

1. **Shrink the file below RAM** (proposal #1): ~25 GB (or less, see plan) means epoch 1 warms
   the cache and epochs 2+ run at memory speed — the original design intent of the pack
   (`pack.py:1-8`) restored.
2. **Chunk-shuffled sampler** for whatever still exceeds RAM: a custom `Sampler` that permutes
   blocks of ~8192 consecutive memmap indices and shuffles inside each block. Reads become
   ~400 MB sequential runs; the manifest is written in session order, and since synth
   pseudo-sessions are 100 near-i.i.d. frames, block-local shuffling is statistically harmless
   (real datasets: blocks span sessions — still fine because the split already isolates
   sessions). ~30 lines in `train.py`/`torch_data.py`. Effort S.

Not recommended: RAM-preload of the full array (doesn't fit) or switching the packed format to
JPEG-in-shards just for training (adds a decode per item; the memmap+rot fix is simpler and
sufficient at this scale — revisit only if datasets grow past ~60 GB unique pixels,
see WebDataset note below).

### Windows spawn worker cost (proposal #7)
With `num_workers=6, persistent_workers=True, prefetch_factor=4` (`train.py:253-256`), each
spawn worker unpickles the whole dataset object. `PackedSquareDataset` deliberately keeps only
small arrays for the memmap — but **also keeps `self.rows`** (`torch_data.py:195`, "kept for
board-accuracy grouping in evaluate"), the full list of 2M row-dicts, ≈1-2 GB pickled into
*each* of 6 workers → up to ~10 GB of duplicated RAM plus slow worker startup. Fix: pop
`rows` from `__getstate__` (workers never touch it) or move the evaluate-grouping data out of
the Dataset. Same applies to `SquareDataset` (rows are needed there for paths, but a
slimmed row tuple would do). Effort S.

Prefetch memory is fine: 6 workers × 4 × batch 32 × 128²×3 float32 ≈ 150 MB.

---

## Big bets (D3)

- **Fuse ingest→pack (skip crop PNGs entirely).** Feasible because for synth the whole
  curation chain is metadata-only: split is per pseudo-session (known at slice time), cap-dedup
  needs no pixels, phash is off, rotation moves on-the-fly (#1). Shape: `slice_session` gains a
  sink abstraction (PNG-dir sink today; memmap/shard sink new), `build_dataset` consumes rows
  whose `path` is `pack:<index>`. Saves the full ~60 GB middle copy and one full decode+encode
  pass. Costs: web UI crop browsing, bg-randomization donor pool (`torch_data.py:100`), and
  `dataset verify` all assume files — each needs a packed-aware read path. Effort L; worth it
  only if disk stays the binding constraint after #1+#2 (it likely does not for 100k/class).
- **WebDataset / LMDB sharding** (memory note `synth-pipeline-perf-ideas`): the memmap already
  solved the million-small-files problem; sharded *compressed* storage additionally solves
  size (JPEG-encoded crops ≈ 8-10× smaller → 2M crops ≈ 10-12 GB, fully RAM-cacheable) at the
  price of per-item decode and a new dependency. Right call **only** if fused ingest→pack is
  built anyway — then write shards instead of a raw memmap. Otherwise skip.
- **2.5D compositing:** rejected (user decision 2026-07-06, incl. the hybrid sprite-atlas
  variant). Kept here only so the next reviewer doesn't re-open it.

---

## Recommended plan for the ~100k-train-slices-per-class re-render

Targets: peak disk < 150 GB, GPU saturated, no RAM thrash. Assumes 12 piece classes × 100k +
capped `empty` ≈ **1.4-1.6M unique train crops** ≈ 55-65k frames at 4 views/scene
(random FENs average ~2 instances of the rarest piece types per frame).

**Before rendering (code, in order of leverage):**
1. Rotation on the fly (#1) — or simply build without `--rotate` if the pretrain doesn't need it.
2. JPEG render output (#2) + adapter `.jpg` match.
3. `synth render --shards 4` (#4) and `ingest --workers 8` (#5).
4. Drop `self.rows` from pickled dataset state (#7).
5. (Optional, 30 lines) chunk-shuffled sampler (#6).

**Render:** `--res 1024 --frame-frac 0.80..0.85 --views-per-scene 4 --samples 24 --shards 4`,
JPEG q90. Expected: ~55-65k frames at ~0.4 s/frame effective ≈ **7-9 h wall-clock**, renders
**~10-14 GB** on disk.

**Ingest:** `--board-size 1100` (#8), 8 workers ≈ 1-2 h. Crop PNGs ~21 KB × ~4M raw crops ≈
**~45-60 GB** (this remains the largest intermediate until fusion lands; with `per_cell_cap`
irrelevant for synth, consider slicing only the frames you will keep — n is chosen up front, so
raw ≈ final here).

**Build + pack:** phash off, no rotation materialization. Memmap = unique final crops:
~1.6M × 49 KB ≈ **~78 GB**... which still exceeds RAM. Two options:
- accept it and rely on the chunk-shuffled sampler (#6) — sequential ~400 MB runs stream at
  NVMe speed, no thrash; or
- train multi-scale anyway (`--scales 64 96 128`, existing flag): if the deployment resolution
  study (multi-res memory) lands on ≤96 px, pack at 96² instead of 128² → 1.6M × 27 KB ≈
  **44 GB**, page-cacheable minus a small remainder. Decide before packing; the pack size is
  `out_size`-driven (`pack.py:110`).

**Peak disk:** renders 14 + crop PNGs 60 + memmap 78 ≈ **~150 GB worst case**, ~115 GB with the
96² pack — inside budget without deleting anything mid-run (keep-data rule intact). After a
successful pack the crop PNGs are the natural candidate to archive/move off-disk *manually* if
space is needed for a second dataset generation.

**Train:** defaults are already right (`num_workers 6`, persistent workers, prefetch 4,
pin_memory). With #1/#7 in place, RAM during training ≈ model + CUDA + ~2 GB workers, leaving
~25 GB of page cache for the memmap.
