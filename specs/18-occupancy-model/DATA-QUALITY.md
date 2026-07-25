# DATA-QUALITY — occupancy training data audit (2026-07-25)

Investigation only. No pipeline code, mesh or dataset was modified. All crops were produced
through the **production path** (`calibration.warp_board_for_crops` → `labeling.crop_square`,
`geometry="warp"`, `photometry="none"`, the sessions' own calibration profiles). Nothing was
written to `data/squares`, `data/manifests` or `data/sessions`.

Scratch outputs (absolute paths, all PNG/JSON):
`C:\Users\mariu\AppData\Local\Temp\claude\c--Users-mariu-project-chess-vision\d931e039-adee-4c07-aa69-73b598e75146\scratchpad\dq\`

---

## TL;DR

1. **The measured failure mode is BLACK PIECE ON DARK SQUARE, not cream-on-light.**
   Hypothesis 1 as stated is **refuted**. Pooled over 7,744 real crops from 6 sessions,
   occupied-vs-empty separability (d′ of centre luma) is
   `w/light 2.44 · w/dark 1.87 · b/light 5.62 · **b/dark 0.90**`.
   The 12 squares with the worst occupied/empty overlap (c7, h2, a7, e7, f6, d8, g1, **f4**,
   g3, b6, d6, b8) are **all dark squares**; the 5 best (c6, b7, b3, a8, a6) are **all light
   squares**. `f4` — the square the STATUS.md clip lost 90 times in 186 observations — is a
   dark square and lands 8th on that list, computed with no knowledge of the clip.
   Cream-on-light is one of the *easiest* combinations in this data.

2. **It is an exposure problem, and it is fixable at capture time.** The ambiguity of b/dark
   tracks the dark square's brightness almost perfectly across sessions:
   dark-square luma 45 → 81 % of black-on-dark crops photometrically indistinguishable from
   empty; luma 51 → 71 %; luma 74 → 20 %; luma 90 → **0 %**. Lifting the dark squares from
   ~45–51 to ~90 removes the failure mode. This is one lighting change, not a modelling problem.

3. **Synth is not the reason the model is over-cautious in the way I expected, but it does not
   fix it either.** Freshly rendered synth reproduces the b/dark hard case faithfully
   (d′ 0.78 vs real 0.90) — so it *is* teaching the hard case. But synth invents an extra
   hard case real capture does not have: **w/light** (52–66 % of synth white-on-light crops sit
   inside the empty distribution vs 0–9 % for real). Synth therefore teaches
   "a piece can be invisible" in a situation where the real camera shows it clearly — a direct
   push toward the observed **8,826 misses vs 226 phantoms**.

4. **A concrete resolution bug: the `phone` profile throws away ~30 % of the camera's
   resolution and then upscales.** `board_size: 800` → 100 px/square in the warp → crop box
   110 px → **upscaled** to 128. The camera delivers 117–175 px/square. Synth, meanwhile, is
   warped at `config.SYNTH.warp_board_size = 1100` (137 px/square) and **downscaled** to 128.
   Real and synth crops are not the same domain.

5. **The 260 `synth-v2-diverse__*` sessions are dangling.** Their renders
   (`data/synth_v2_diverse/*.png`) **do not exist on disk** — not in the repo, not on C:, not
   on D:. Only 260 `log.jsonl` files survive: 23,002 frame rows / 9,679 unique FENs / camera
   poses. They are a **recipe, not an asset**. Anything built from them today would fail.

---

## Part A — the real capture path

### Sessions chosen and why

`data/sessions/` holds 290 dirs; only **30 are real** (the other 260 are the dangling synth
sessions). Selection covers the two never-ingested sessions the brief names, plus the
resolution range (1080p → 4K), the two profiles in use (`phone`, `default`), and 4 distinct
capture days.

| session | frames | frame size | profile | why chosen |
|---|---|---|---|---|
| `20260719-175329` | 56 (91 log rows, 31 flagged `unusable`) | 2560×1440 | phone | required; never ingested |
| `20260722-190224` | 6 | 2560×1440 | phone | required; never ingested; newest capture |
| `20260721-212830` | 79 | 3840×2160 | phone | only 4K session |
| `20260721-194538` | 297 | 2560×1440 | phone | the **empty-board** session (see below) |
| `20260708-021722` | 74 | 1920×1080 | phone | largest 1080p session, different day |
| `20260706-130834` | 55 | 1080×1920 (portrait) | phone | different day + portrait framing |
| `20260630-081608` | 16 | 3072×4096 | default | oldest day, other profile |

### Resolution — hypothesis 2

| session | source px/square | warp px/square | crop box px → out | net scale |
|---|---|---|---|---|
| `20260630-081608` | **214.4** | 100.0 | 110 → 128 | ×1.16 **up** |
| `20260721-212830` | **174.7** | 100.0 | 110 → 128 | ×1.16 **up** |
| `20260719-175329` | 138.3 | 100.0 | 110 → 128 | ×1.16 **up** |
| `20260721-194538` | 125.3 | 100.0 | 110 → 128 | ×1.16 **up** |
| `20260722-190224` | 116.8 | 100.0 | 110 → 128 | ×1.16 **up** |
| `20260708-021722` | 96.9 | 100.0 | 110 → 128 | ×1.16 **up** |
| `20260706-130834` | 65.2 | 100.0 | 110 → 128 | ×1.16 **up** |

The camera is **not** the bottleneck above 1080p. `data/calibration/phone.yaml` and
`default.yaml` both carry `board_size: 800`; `slice` has no `--board-size` override, it uses
the profile. So every real crop is decimated to 100 px/square and then interpolated up to
128 px. `config.DEFAULT_BOARD_SIZE` is **1600** and `config.SYNTH.warp_board_size` is **1100** —
the profiles are stale relative to both.

**Verdict on hypothesis 2: partially supported, but not the cause of the misses.** Sharpness
does not predict the failure: `20260708-021722` has the *lowest* Laplacian variance measured
(47.8 empty / 55.0 occupied) yet only 9 % b/dark ambiguity, while `20260719-175329`
(lap 72.6/95.6) sits at 71 %. Resolution is a real but separate waste.

Sharpness (median variance-of-Laplacian on the 128 px crop):

| session | empty | occupied |
|---|---|---|
| `20260721-212830` (4K) | 569.0 | 706.9 |
| `20260630-081608` | 352.5 | 409.7 |
| `20260721-194538` | 382.4 | — |
| `20260722-190224` | 232.2 | 331.1 |
| `20260719-175329` | 72.6 | 95.6 |
| `20260706-130834` | 63.8 | 82.2 |
| `20260708-021722` | 47.8 | 55.0 |

`20260719-175329` is soft for its resolution (138 px/square but lap 96, vs `20260722-190224`
at 117 px/square and lap 331) — motion blur / focus, and 31 of its 91 log rows are already
flagged `unusable`. One frame (`0000.png`) has a **PNG CRC error** and cannot be decoded.

### Contrast per (piece colour × square colour) — the core measurement

Contrast = median |mean luma of the central disc (r < 0.26 of crop) − mean luma of the four
corner patches (own-square board surface)|. d′ = separability of the central disc's luma
between occupied crops and empty crops **of the same square colour**. "ambiguous" = fraction
of occupied crops whose (centre luma, crop std) falls inside the 5–95 % box of the empty
population of the same square colour — i.e. crops a photometric reader cannot call.

Pooled over all 6 sessions with pieces (2,661 occupied / 5,083 empty crops):

| combination | n | \|contrast\| median | d′ centre | frac \|c\|<8 | frac \|c\|<15 |
|---|---|---|---|---|---|
| w/light (cream on cream) | 619 | 62.7 | 2.44 | 0.024 | 0.069 |
| w/dark | 708 | 58.9 | 1.87 | 0.052 | 0.088 |
| b/light | 712 | 19.7 | 5.62 | 0.236 | 0.365 |
| **b/dark (black on brown)** | **622** | **18.3** | **0.90** | 0.209 | 0.365 |

(`b/light` has low local contrast but huge d′: a black piece on a bright square is dark
against 205–246 luma — trivially separable. Low |contrast| there is a specular highlight
artefact, not ambiguity.)

Per session, fraction of occupied crops inside the empty 5–95 % box:

| session | w/light | w/dark | b/light | **b/dark** |
|---|---|---|---|---|
| `20260706-130834` | 0.09 | 0.00 | 0.00 | **0.81** |
| `20260719-175329` | 0.02 | 0.16 | 0.02 | **0.71** |
| `20260630-081608` | 0.06 | 0.02 | 0.00 | **0.35** |
| `20260721-212830` | 0.01 | 0.00 | 0.00 | **0.20** |
| `20260708-021722` | 0.00 | 0.00 | 0.00 | **0.09** |
| `20260722-190224` | 0.00 | 0.00 | 0.00 | **0.00** |

**The whole spread is explained by exposure of the dark squares** (median centre luma,
`bdark_stats.json`):

| session | empty dark sq | black piece on dark | Δ | b/dark ambiguous | empty light sq | white piece on light | Δ |
|---|---|---|---|---|---|---|---|
| `20260706-130834` | 45.5 | 37.1 | **8.4** | 0.81 | 193.3 | 132.7 | 60.5 |
| `20260719-175329` | 51.4 | 36.6 | **14.8** | 0.71 | 204.4 | 134.9 | 69.5 |
| `20260721-212830` | 73.6 | 52.1 | **21.6** | 0.20 | 235.4 | 184.9 | 50.6 |
| `20260722-190224` | 89.7 | 67.1 | **22.7** | 0.00 | 245.8 | 189.7 | 56.1 |

Below luma ~50 the dark squares are in the sensor's crushed-black/noise region: the piece is
only 8–15 luma steps away from the board and the difference drowns. Above ~85 the same piece
is 23 steps away on a quieter part of the response curve and the case becomes trivial.

Radial d′ profile (occupied vs empty per annulus, `radial.json`) — this is the number that
kills the "maybe the model just needs to look elsewhere in the crop" idea. For real b/dark the
profile is **flat at 0.50–0.86 across every radius from the centre to the crop edge**. There is
no region of the crop that carries the signal. Compare real b/light which peaks at 5.54, real
w/dark at 2.27, real w/light at 1.99.

### Piece mass outside its own cell — hypothesis 3

Method: pairs of frames in the same session where square *s* is occupied in A and empty in B
**and all 8 neighbours carry identical content**; the |A−B| energy (>12 luma noise floor) in
the 3×3 cell block around *s* is attributed to that piece plus its shadow.

| session | pairs | own cell | cell behind ("up") | cell in front | left+right |
|---|---|---|---|---|---|
| `20260708-021722` | 59 | **0.745** | 0.014 | 0.005 | 0.074 |
| `20260719-175329` | 37 | **0.713** | 0.041 | 0.008 | 0.117 |
| `20260722-190224` | 2 | 0.596 | 0.127 | 0.108 | 0.082 |
| `20260721-212830` | 32 | **0.507** | 0.042 | 0.106 | 0.128 |
| `20260706-130834` | 45 | **0.490** | 0.116 | 0.076 | 0.115 |

Independent check via the radial profile: apparent piece diameter is 0.77–1.10 **cells**
(w/dark 0.84, w/light 0.84, b/light 1.10, b/dark 0.77).

**Verdict on hypothesis 3: real, but small and NOT upward.** Only 1.4–12.7 % of a piece's
signal lands in the rank behind it. The leakage that exists is mostly **lateral** (7–13 %,
shadows) and it is symmetric, so it cannot be recovered by `pad_up`. The camera is confirmed
near-top-down (measured board-quad side spread 0.9–8.2 %, diagonal ratio 1.002–1.010).
**`pad_up = 0.0` is correct — do not change it.**

### Class balance — hypothesis 4

Parked slice manifest `C:\Users\mariu\project\chesslab-parked-20260725\manifests\squares.jsonl`,
378,752 rows:

| source | rows | empty | share of set |
|---|---|---|---|
| 10 × `pretrain-synth__synth-00*` | 320,000 | 174,313 (54.5 %) | **84.5 %** |
| 29 real sessions | 58,752 | 45,536 (**77.5 %**) | 15.5 % |

Real-session concentration: `20260721-194538` alone contributes **14,528 rows = 24.7 % of all
real crops**, and *every one of them is `empty`* — it is a 297-frame recording of a **completely
empty board** (`fen: 8/8/8/8/8/8/8/8` on all 297 rows; verified visually,
`montage_20260721-194538.png`). Top three sessions (`…194538`, `…193821`, `…212830`) = 53 % of
all real crops; the 20260721 day = 63 %.

**Verdict on hypothesis 4: NOT the primary cause, with a caveat.** `config.DEFAULT_MAX_EMPTY_RATIO
= 1.5` and `DEDUP.per_cell_cap = 4` mean `dataset build` caps `empty` at 1.5× the largest piece
class and caps 4 crops per (session, square, piece) — so `…194538` can contribute at most 256
crops to a built dataset, not 14,528. The 77.5 %-empty figure is a *slice-manifest* artefact.
I could **not verify the actual trained mix**: `data/datasets/` no longer exists and
`data/manifests/split.json` is a stale June-30 split (1,536 train crops). If the retained
occupancy model was built with `--max-empty-ratio` left at default, class prior is not the
explanation; if it was raised, it is. **This should be checked against the run config of the
model that produced the STATUS.md numbers before anything else is changed.**

---

## Part B — generation tooling and the "diverse" synth suite

### B1. What the 260 `synth-v2-diverse__*` sessions actually are

**Their pixels are gone.** Every row points at
`C:/Users/mariu/project/chess-vision/data/synth_v2_diverse/<n>.png`; that directory does not
exist. Searched: repo tree, `C:\` recursive (depth 6), `D:\` recursive (depth 5), the parked
dir. `.claude/settings.local.json` still contains the allow-listed command that deleted the
derived crops (`data\squares__synth-v2-diverse`), which is consistent with the raw renders
having been cleaned up for disk space as well.

What survives is metadata only, and it is genuinely diverse:

- 260 sessions, **23,002 frames**, 76–100 frames each (60 sessions at exactly 100).
- **9,679 unique FENs** across 23,002 frames — i.e. ~2.4 frames per position, so most frames
  are distinct positions, not re-renders of the same board.
- Camera pose spread from the logged corner quads: board-quad **side spread 1.5 %–14.5 %**
  (median 5.3 %) and board area 127k–707k px² → **44.6 to 105.1 px/square**, a 2.4× range.
  Board rotation in-plane covers all orientations (the quads are arbitrarily rotated, not
  axis-aligned like the real captures).

So the "diverse" claim is real for **position, in-plane rotation, obliqueness and camera
distance**. Lighting, board texture and background variation **cannot be measured** — that
information only existed in the deleted pixels.

**This suite is a recipe, not an asset.** It would have to be re-rendered. Since the render
seed/flags for it are not recorded anywhere in the repo, re-rendering would not reproduce it
exactly either.

### B2. The tooling — what can be generated today

- **Blender 5.1.2 is installed** at `C:\Program Files\Blender Foundation\Blender 5.1` and the
  pipeline runs: I rendered 24 boards end-to-end successfully.
- Assets present: `synth_pieces/` (12 classes, scanned meshes + `board_texture.png` +
  6 material .blend variants), `synth_assets/Chess Scene.blend`.
- FEN banks on disk: `data/fens_p1.txt` (3,000), `data/fens_p2.txt` (15,000),
  `data/fens_bleed.txt` (3,000 neighbour-bleed hard negatives).
- Entry points: `chesslab synth render` → `synth/render_board_v2.py`, then either
  `chesslab dataset build-synth` (fused, `mm://` memmap, warp at 1100 px) or
  `chesslab ingest synthetic` (crop PNGs + `--debug-overlay`).

Controllable per run (`synth/render_args.py`, all exposed on the CLI):
`--n --seed --fens --res --board-texture --views-per-scene --samples --max-obliqueness
--piece-scale --cam-distance-jitter --occlusion-p --isolate-p --borderless-p --frame-frac
--shards`, plus per-view HSV jitter of every piece material (`randomize_piece_materials`) and
per-scene board and world/background randomisation (`randomize_board`, `randomize_world`).

**Throughput (measured, single Blender process, one job, incl. process startup):**
24 renders (12 scenes × 2 views, `--res 1024 --samples 24`) in **23.7 s** → ~1.0 render/s ≈
**3,600 boards/h ≈ 230k labelled crops/h** on one worker. The docs claim `--shards 4` reaches
~4× wall-clock; **not verified here** — a multi-shard run was deliberately not executed
(machine in use).

**Documentation error found:** `docs/synth-pipeline.md` claims `--frame-frac 0.80` yields
"~134 px per square at `--res 1024`". Measured from the rendered corner quads: **82.2 px/square**
(board fills ~64 % of the frame, not 80 %). 134 px/square is arithmetically impossible at
`--res 1024` — it would need the board to be 1,072 px wide in a 1,024 px image. `--res` must be
raised (or `--frame-frac` fixed) if synth is to match the real camera's px/square.

### B3. Synth judged on the occupancy yardstick

Measured through the **build-synth** crop path (`ingestion_profile`, `board_size = 1100`),
on 24 freshly rendered boards (`--max-obliqueness 0.10 --frame-frac 0.80 --res 1024`,
obliqueness 0.042–0.087 as logged) plus the 8 surviving `data/synth_bleed_smoke` renders:

| source | frames | src px/sq | warp px/sq | lap empty | lap occ | empty frac |
|---|---|---|---|---|---|---|
| fresh probe (2026-07-25) | 24 | **82.2** | 137.5 | 69.1 | 83.5 | 0.665 |
| `synth_bleed_smoke` | 8 | 76.4 | 137.5 | 75.2 | 91.3 | 0.541 |
| real (range) | — | 65–214 | 100.0 | 48–569 | 55–707 | 0.50–0.65 |

Contrast, same metric as Part A:

| combination | fresh synth d′ / ambiguous | smoke synth d′ / ambiguous | real pooled d′ / ambiguous range |
|---|---|---|---|
| w/light | 1.33 / **0.52** | 1.36 / **0.66** | 2.44 / 0.00–0.09 |
| w/dark | 2.49 / 0.25 | 4.13 / 0.00 | 1.87 / 0.00–0.16 |
| b/light | 6.28 / 0.00 | 6.87 / 0.00 | 5.62 / 0.00–0.02 |
| **b/dark** | **0.78 / 0.81** | **0.37 / 0.68** | **0.90 / 0.00–0.81** |

Radial d′ profiles confirm it: synth b/dark peaks at **0.81** (fresh) / **0.40** (smoke)
against real's **0.86** — same flat, signal-free regime.

**The decisive question, answered:** *Yes*, synth reproduces the low-contrast case the real
camera suffers from — in fact it reproduces it slightly harder. Synth is **not** "cleanly lit
and high-contrast everywhere". So the "synth can't teach the failure" worry is **ruled out**.

But two real domain gaps show up instead:

1. **Synth invents a hard case real capture does not have.** Synth w/light: empty light square
   at 177 luma, white piece at 147 → Δ30, 52–66 % ambiguous. Real: 193–246 vs 133–190 → Δ50–70,
   0–9 % ambiguous. Synth's light squares are too dim and/or its white pieces too bright. A
   model pretrained on this learns "a white piece on a light square can be invisible" — the
   exact prior that produces misses rather than phantoms. Given synth was **84.5 %** of the
   parked training set, this is a strong candidate contributor to the 39× miss asymmetry, and
   it also fits the repo's prior evidence that synth-heavy moves went *backwards* on real test
   data (`borderless-attention-vs-accuracy`, `three-phase-curriculum-result`).
2. **Crop-scale mismatch.** Real profiles use `pad_side: 0.05` (crop box = 1.10 cell,
   **upscaled** 110→128); synth uses `config.CROP.pad_side = 0.10` (crop box = 1.20 cell at
   1100 px = 165 px, **downscaled** to 128). The same piece therefore occupies ~9 % more of the
   frame in a real crop than in a synth crop, and the two are resampled in opposite directions.
   Apparent piece diameters are otherwise comparable (real 0.77–1.10 cells, synth 0.62–1.13),
   so this is purely a framing/config drift, and it is trivial to remove.

---

## Part C — visual samples

All under
`C:\Users\mariu\AppData\Local\Temp\claude\c--Users-mariu-project-chess-vision\d931e039-adee-4c07-aa69-73b598e75146\scratchpad\dq\`:

| file | what it shows |
|---|---|
| `board_grid_20260721-212830.png` (also `…-190224`, `…-130834`, `…-021722`, `…-194538`, `…081608`) | full warped board with the production crop boxes drawn |
| `board_grid_synth.png`, `board_raw_synth.png` | same for a fresh synth render |
| `montage_20260721-212830.png` (+ same 5 sessions) | 8×8 montage of all 64 crops of one frame, occupied squares outlined green |
| `combos_real.png` | the four (piece colour × square colour) combinations side by side, real |
| **`lowcontrast_pair_real.png`** | **b/dark: occupied vs empty — the pair the model confuses** |
| `highcontrast_pair_real.png` | w/dark control: the same layout for an easy combination |
| **`real_vs_synth_combos.png`** | **real (top row) vs synth (bottom row) for each of the four combinations** |
| **`lowcontrast_real_vs_synth.png`** | **b/dark occupied vs empty, real and synth stacked — how well synth stands in** |
| `summary.json`, `synth_summary.json`, `bdark_stats.json`, `radial.json`, `fill.json` | every number in this document |

Two things are visible in `real_vs_synth_combos.png` that no metric states: synth edge crops
carry **saturated pink/green/teal world-randomisation background** that never occurs in real
capture, and the real pieces are decorated (dotted pattern) in a way the meshes reproduce well.

---

## Verdicts on the four hypotheses

| # | hypothesis | verdict |
|---|---|---|
| 1 | Low contrast, top-down; **cream on light** | **Refuted as stated.** Cream-on-light is one of the easiest cases (d′ 2.44, 0–9 % ambiguous). The correct version — **black piece on dark square** — is strongly **supported**: d′ 0.90 pooled, up to 81 % of occupied crops photometrically inside the empty distribution, all 12 worst squares dark, including the clip's `f4`. Driver is dark-square exposure (luma 45 → 81 % ambiguous; luma 90 → 0 %). |
| 2 | Effective resolution | **Supported as waste, ruled out as cause.** Camera 65–214 px/square is decimated to 100 by `board_size: 800` and then upscaled to 128. But the softest session (lap 48) has 9 % b/dark ambiguity and a sharper one (lap 96) has 71 % — sharpness does not predict the failure. |
| 3 | Piece mass outside its own cell | **Supported but small, and not upward.** 49–75 % of a piece's signal stays in its own cell; only 1.4–12.7 % lands in the rank behind, 7–13 % laterally. Confirms `pad_up = 0.0`. |
| 4 | Class balance | **Inconclusive.** Slice manifest is 77.5 % empty on the real side and one empty-board session is 25 % of all real crops, but `max_empty_ratio 1.5` + `per_cell_cap 4` should neutralise that at build time. The built dataset and its config are deleted, so the *trained* mix cannot be recovered. Check the run config before acting. |

---

## Capture guidance — every number measured above

1. **Light the board so the dark squares read ≥ 85 luma in the crop.** This is the single
   change that matters. Measured: 45.5 → 81 % b/dark ambiguous, 51.4 → 71 %, 73.6 → 20 %,
   89.7 → **0 %**. `20260722-190224` already achieves it — reproduce that lighting setup.
   Practically: diffuse light from two sides (the montages show a strong directional falloff —
   in `20260706-130834` the h-file dark squares are visibly darker than the a-file ones), and
   expose for the *dark* squares, accepting that light squares climb to 240+. Light squares can
   afford it: white-on-light Δ was 50.6–69.5 luma in every session, with 0–9 % ambiguity even
   at 245 luma.
   **Verify before capturing, not after:** grab one frame, crop `f4`/`c7`/`a7` empty and read
   the mean luma. Below 85, fix the light; do not start the session.
2. **1440p is enough — 4K is not needed.** 1440p delivered 117–138 px/square; the 4K session
   delivered 175. If the warp is fixed to 1100 px (137 px/square), 1440p already exceeds it.
   4K buys sharpness (lap 707 vs 331) but at 19 fps and double the disk (289 MB for 56 frames
   at 1440p PNG already).
3. **Keep the camera where it is.** Measured board-quad side spread 0.9–8.2 %, diagonal ratio
   1.002–1.010 — genuinely near-top-down, and only 1.4–12.7 % of a piece's signal escapes into
   the rank behind. Nothing about the geometry needs to change.
4. **Sessions and positions.** The parked real set was 29 sessions but 63 % of its crops came
   from one day and 25 % from one static empty board; per-session splitting then leaves very
   few *independent* sessions, and 297 frames of a motionless empty board are 297 near-duplicates.
   Target: **≥ 12 sessions across ≥ 4 different days/lighting setups**, each with **≥ 40 distinct
   positions** and pieces genuinely moved between frames — that is ~500 frames = ~32,000 crops,
   comparable to the whole previous real set but with 4× the session diversity. Split
   per session as always.
   Deliberately include **dark-square-heavy positions**: put black pieces on c7, a7, h2, e7,
   f6, d8, g1, f4, g3, b6, d6, b8 — the 12 squares measured worst. `synth/fens.py --mode bleed`
   already generates targeted position lists; the equivalent for real capture is a scripted
   position list, not free play.
5. **Do not repeat the 297-frame empty-board recording.** Empty is the class the model already
   over-predicts and near-duplicate frames are exactly what `per_cell_cap` exists to discard.
   ~30 empty-board frames across the different lighting setups is plenty.

## Real vs synth mix

- **Do not go synth-heavy.** The parked set was **84.5 % synth**, and the repo's own history
  (`borderless-attention-vs-accuracy`, `three-phase-curriculum-result`) records synth-heavy
  moves regressing on real test data. This audit adds a mechanism: synth's w/light is 52–66 %
  ambiguous where real is 0–9 %, so synth actively teaches false invisibility.
- **Fix the synth photometry before rendering more of it.** Synth light squares sit at 177 luma
  vs real 193–246, and synth white pieces at 147 vs real 133–190. Until the synth w/light Δ is
  ~50–70 luma like real (it is ~30 today), more renders make the miss bias worse, not better.
  Render 8 frames, measure the four combinations, then commit to a big run — this is cheap.
- **Suggested mix once photometry is fixed:** synth for *pretraining only* and no more than
  ~50 % of the fine-tune mix, with the fine-tune stage dominated by the fresh real capture.
  Synth's genuine value here is that it *does* reproduce the b/dark hard case (d′ 0.78 vs real
  0.90) and can generate it at 3,600 boards/h with controlled position content — it is the only
  cheap source of dark-square hard positives.
- **Budget guidance from throughput:** one worker produces ~230k crops/h. The bottleneck is not
  render volume, it is whether the renders match the real domain. Spend the time on the
  8-frame photometry check, not on volume.

## Pipeline parameters — what to change, what to leave

| parameter | current | verdict |
|---|---|---|
| `CROP.pad_up` | `0.0` | **Correct, leave it.** Only 1.4–12.7 % of a piece's signal reaches the rank behind; raising it imports neighbour content for almost no gain. |
| `crop.pad_side` in `phone.yaml` / `default.yaml` | `0.05` | **Change to `0.10`** to match `config.CROP.pad_side` and the synth path. Today real crops are 1.10 cell and synth crops 1.20 cell — a 9 % scale mismatch between pretrain and fine-tune domains. (Also: real b/light apparent diameter is 1.10 cells, i.e. exactly at the current box edge.) |
| `board_size` in `phone.yaml` / `default.yaml` | `800` | **Change to `1100`** (= `config.SYNTH.warp_board_size`, 137.5 px/square). Today real crops are decimated to 100 px/square and then **upscaled** 110→128, while synth is **downscaled** 165→128. At 1100 both become downscales and both match. The camera already supplies 117–175 px/square at 1440p/4K. Note this re-slices everything and changes live inference geometry — verify the live path reads the same profile (it does: `crops_for_frame` uses `profile.crop`). |
| `CROP.out_w/out_h` | `128×128` | **Correct, leave it.** Square box → square out, no letterboxing. |
| capture resolution (`CAMERA` 2560×1440) | 1440p | **Correct, leave it** — see guidance 2. |
| `--frame-frac` / `--res` on synth render | `0.80` / `1024` | Measured 82 px/square, not the documented 134. Either raise `--res` to ~1600 or fix the framing; and correct `docs/synth-pipeline.md`. |

## Things that would make the new capture a waste of effort

1. **Capturing before fixing the lighting.** If dark squares come out at 45–51 luma again, the
   new sessions carry the same unlearnable b/dark class and the miss rate will not move.
   Check one frame's empty dark-square luma before recording anything.
2. **Leaving `board_size: 800` in the profiles.** Whatever the camera delivers is decimated to
   100 px/square and then upscaled — a 4K capture and a 1080p capture end up nearly identical.
3. **Not knowing what the failing model was actually trained on.** `data/datasets/` and the
   build config are gone; `data/manifests/split.json` is a stale June-30 split. Whether class
   balance (hypothesis 4) matters at all cannot be settled without the run config of the model
   behind STATUS.md. Recover it from the run dir under `data/models/` before choosing a mix.
4. **Assuming the 260 `synth-v2-diverse__*` sessions are usable.** They are dangling references;
   any build over them fails on missing files. Either delete them or re-render — and note the
   render flags used for them were never recorded, so the suite is not reproducible as-is.
5. **Rendering more synth before fixing synth's w/light photometry.** More of a domain that
   teaches false invisibility on the *easiest* real combination will deepen the exact bias
   being investigated.

## Known gaps in this audit

- Lighting/texture/background diversity of the 260 `synth-v2-diverse__*` sessions **cannot be
  measured** — the renders are deleted. Only pose, position and framing survive.
- Multi-shard render throughput was **not measured** (machine in use); only single-worker
  ~1.0 render/s is established.
- The *trained* class mix of the model behind the STATUS.md numbers **cannot be recovered** from
  what is on disk.
- All contrast/d′ numbers are **photometric proxies** for what a CNN sees; they bound the signal
  available in luma but a CNN also uses texture and edges. The independent per-square ranking
  (12/12 worst squares dark, 5/5 best light, `f4` present) is what makes the b/dark conclusion
  robust rather than the absolute d′ values.
- `20260719-175329/frames/0000.png` is corrupt (PNG CRC error) and was skipped.

---

# Synth photometry fix (2026-07-26)

Acts on the finding above: *"synth invents a hard case real capture does not have — w/light"*.
Pipeline change only (`synth/`); no mesh, dataset, session or manifest was touched.

## Mechanism — two light-tile albedo sources, neither of them exposure

`randomize_board` gives every scene one of two board looks. **Both** put the light tile below
the real camera's 193–246 band, for different reasons, and the dark tile of both was already
inside the real 45–90 band:

1. **Procedural boards** (`BOARD_PROCEDURAL_P = 0.50`, plus every borderless scene).
   `_rand_square_colors` picked the light tile as `hsv(any hue, sat 0.55–1.0, val 0.80–1.0)`.
   HSV *value* is not luminance: a saturated blue at value 0.9 is linear luma 0.26 and renders
   at ~100–140 — **darker than the white piece standing on it**. Measured per-frame empty-light
   luma across the 24-frame probe ran from **102** to 214.
2. **The photo board** (`synth_pieces/board_texture.png`). Measured on the file: light tiles
   **191 sRGB**, dark tiles **43** (ratio 4.4). It is a *photograph at its own exposure* used
   as albedo, and it renders at ~169 light / ~48 dark. Its dark tiles are already exactly where
   the real camera puts them; only its light tiles are short.

**Why not exposure.** Light energy, world ambient strength, the `HueSat` *Value* jitter and the
view transform all scale the light AND dark tile together. Lifting light 169 → 207 that way is
×1.53 in linear, which drags empty-dark 90 → 111 and the black-piece-on-dark case out of the
low-signal regime the model must learn. **Light-tile albedo is the only knob that moves one
without the other**, and the paired per-frame table below shows it moved exactly one.

## The change (`synth/render_board_v2.py`)

- `_rand_square_colors`: light tile saturation `0.55–1.0 → 0.05–0.35`, value `0.80–1.0 → 0.85–1.0`.
  Guarantees linear luma ≥ 0.58 for **every** hue (worst case blue) = albedo ≥ 204 sRGB, while the
  hue stays fully random, so the anti-shortcut property (board carries no piece information) holds.
  **Dark tile untouched.**
- `make_textured_board_material`: a luminance-masked multiplier on the photo texture
  (`RGBToBW → MapRange → MixRGB MULTIPLY`, constants `BOARD_LIGHT_GAIN 1.60`,
  `_LO 0.15`, `_HI 0.45` in linear luma). Gain is 1.0 at dark-tile level (0.024 linear) and full
  at light-tile level (0.523). Multiplicative rather than a mix toward white, so the wood grain
  keeps its relative contrast.
- RNG draw count and order are unchanged, so before/after render the **same scenes, cameras,
  lights, FENs and piece jitter** — the comparison below is paired frame-by-frame.

## Measured — 24-frame probe, one Blender worker (`-t 1`), 30 s

`--n 24 --seed 42 --views-per-scene 2 --res 1024 --samples 24 --max-obliqueness 0.10
--frame-frac 0.80 --fens data/fens_p2.txt`, cropped through the build-synth path
(`ingestion_profile`, `board_size = 1100`), same metric as Part B3.

Centre-disc median luma (pooled, 1,536 crops):

| | empty light | white on light | Δ | empty dark | black on dark | Δ |
|---|---|---|---|---|---|---|
| synth **before** | 169.1 | 139.5 | **29.6** | 90.4 | 55.3 | 35.2 |
| synth **after** | **207.2** | 143.9 | **63.3** | **90.4** | 56.3 | 34.1 |
| real `20260722-190224` | 245.8 | 189.7 | 56.1 | 89.7 | 67.1 | 22.7 |
| real band (6 sessions) | 193–246 | 133–190 | 50–70 | 45–90 | 37–67 | 8–23 |

Fraction of occupied crops inside the empty distribution's 5–95 % (centre, std) box:

| combination | pooled before | pooled after | **per-frame** before | **per-frame** after | real per session |
|---|---|---|---|---|---|
| **w/light** | 0.75 | **0.19** | 0.16 | **0.03** | 0.00–0.09 |
| w/dark | 0.46 | 0.56 | 0.01 | 0.01 | 0.00–0.16 |
| b/light | 0.00 | 0.00 | 0.00 | 0.00 | 0.00–0.02 |
| **b/dark** | 0.90 | **0.91** | 0.10 | **0.12** | 0.00–0.81 |

d′ of centre luma: w/light **0.84 → 2.53** (real pooled 2.44), w/dark 1.48 → 1.53,
b/light 4.54 → 8.11, **b/dark 1.32 → 1.29**.

**Black-on-dark is preserved, provably.** Empty-dark median is bit-identical per frame in all 24
frames (e.g. `000000` 131.9 → 132.0, `000004` 35.4 → 35.4, `000018` 45.4 → 45.4). The black piece
rose 1–3 luma in some frames — indirect bounce off the now-brighter light squares — so the b/dark
delta *shrank* slightly (37.4 → 35.6 per frame) and d′ fell (1.32 → 1.29). The hard case got
marginally harder, not easier.

The pooled dark-square columns (w/dark 0.46 → 0.56, b/dark 0.90) are an artefact of pooling: the
procedural dark tile still spans luma 30–150 across scenes, so the pooled empty-dark 5–95 % box is
[34.8, 143.5] and swallows almost any occupied crop. Per frame the same crops are 0.01 / 0.10–0.12.
When comparing synth to the real per-session numbers, use the per-frame column.

## Residual gaps

- 4 of 24 frames still sit below the real light-square floor of 193 (162, 170, 173, 177). All four
  are photo-texture boards where `randomize_board`'s `Value` jitter (`0.75–1.20`) landed low. That
  jitter multiplies **both** tiles, so it was deliberately not raised.
- w/light per-frame ambiguity 0.03 is inside the real band (0.00–0.09); pooled 0.19 is not, and
  won't be while board colour is randomized per scene by design.
- Not verified without a bigger render: behaviour at `--borderless-p > 0` / `--isolate-p > 0`
  (borderless boards share `_rand_square_colors`, so they inherit the fix, but none were rendered);
  behaviour at scale; and of course any effect on trained accuracy.
- `data/synth_bleed_smoke` on disk is **pre-fix** — its numbers in Part B3 no longer describe the
  pipeline.

## Documentation correction — `--frame-frac` px/square

`docs/synth-pipeline.md` claimed `--frame-frac 0.80` yields **~134 px/square at `--res 1024`**.

| | px/square at `--res 1024` |
|---|---|
| documented | ~134 — impossible: needs a board 8 × 134 = 1072 px wide in a 1024 px image |
| arithmetic ceiling `1024 × 0.80 / 8` | 102.4 |
| **measured** (24-frame probe) | **79.0** (min 71.3, max 99.6); Part B3's probe measured 82.2 |

Cause, now documented: `frame_board()` scales the lens until the board's **axis-aligned bounding
box** fills `--frame-frac` of the frame (measured fill 0.785 — the flag does what it says), but the
board is randomly rotated in-plane, so the board *side* is shorter than that box by up to √2 —
102 px/square axis-aligned, 72 px/square at 45°, ~79 on average. Corrected in
`docs/synth-pipeline.md` and in the two code comments that carried the same figure as "~102"
(`synth/render_board_v2.py` `BOARD_FRAME_FRAC`, `synth/render_args.py` `frame_frac`). The
`chesslab synth render --frame-frac` help string in `src/chesslab/cli.py` still says "~102" and was
left alone to keep this change out of `src/`.

## Visual probe

- `…\scratchpad\photo\photometry_crops.png` — white-on-light and black-on-dark, three rows each:
  synth before / synth after (same frame and square) / real `20260722-190224`, centre luma printed
  on every crop.
- `…\scratchpad\photo\photometry_boards.png` — full warped boards, before / after / real, for a
  procedural board and a photo-texture board.

Full paths under
`C:\Users\mariu\AppData\Local\Temp\claude\c--Users-mariu-project-chess-vision\d931e039-adee-4c07-aa69-73b598e75146\scratchpad\photo\`
(`before/`, `after/` = the two 24-frame render sets; `stats.py`, `pair.py`, `diag.py`, `visual.py`
= the measurement scripts; `stats_before.json`, `stats_after.json` = every number above).
