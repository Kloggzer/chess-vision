# Sensor audit: missing evidence and an unmasked temporal probe

`scripts/sensor_agreement.py` audits recorded boards without modifying session logs,
mattes, training labels or loss masks. `settle_dev` already uses SAM: reference frames
are filtered by coverage, and covered pixels are excluded from the comparison.
It is not an independent occlusion detector. Fully masked cells have deviation zero
and `settle_seen = 0`; that zero is not evidence that the board is unchanged.

The audit now separates measured, unseen, missing and invalid settle readings.
Only readings with `settle_seen >= SETTLE_SEEN_MIN` enter settle distributions.
Missing coverage has its own group. Grooves use the stored board size, border and
profile orientation, instead of treating the padded raster as an unpadded board.
Unsupported geometry and unreadable boards are counted explicitly. The field audit
in `scripts/matte_cell_audit.py` uses the same geometry and missing-coverage rules.
The prompt probe reports eligible proxy cells and extra coverage, not accuracy.

## Experimental temporal sensor

The optional temporal score compares each square with a pixel median of other
export-selected `boards/` frames with exactly the same ply and FEN. It does not
read SAM masks or coverage to build or measure this reference. The target frame
is excluded and at least five other reference frames are required. Export stock
selection is still a heuristic; this is not independence from the whole pipeline.

Two values are saved per cell:

- `temporal_raw`: mean absolute RGB residual after per-channel brightness centring,
  over the full crop, including pixels that SAM would exclude.
- `temporal_normalized`: that residual divided by the reference crop's RMS contrast,
  with a configurable floor of 8 intensity units. This is an experimental score,
  not a calibrated probability or coverage fraction.

Use `--reference-stock all` for a sensitivity check. It can contaminate the median
with hands when dirty frames dominate; it is deliberately not the default.
Wrong positions, geometric shifts, structured shadows and contaminated clean stock
can also produce high scores. A persistent occluder in all reference views remains
undetectable. Do not automatically turn these scores into coverage labels.

```powershell
$env:PYTHONPATH = 'src'
.venv/Scripts/python.exe scripts/sensor_agreement.py --session rg-2026-09-06-20-27-33 --temporal --out data/reports/sensor-agreement-stock.jsonl
```

## Validation-session observations, 2026-09-11

The corrected run inspects all 548 boards (35,072 cells), including frames lacking
settle measurements or mattes; the earlier table covered only their overlap.
Of 1,080 cells flagged by both grooves and matte, 1,006 are insufficiently visible,
49 lack a settle reading, and only 25 are measurable (median deviation 13.68).
Thus the previous zero median does not establish median contamination.

With the export stock reference, the normalized temporal score's median / p90 is
0.880 / 1.266 for the both-flags group (1,031 measurable cells), versus
0.059 / 0.154 for the neither-flags group (11,902 measurable cells).
These are agreement groups, **not human-labelled positives and negatives**.

Visual spot checks of the earlier problem frames and counterexamples:

| Frame / square | Score | Observation |
| --- | ---: | --- |
| 006078 / e1 | 0.432 | Translucent blur over the piece; raw deviation only 18.27. |
| 010917 / b2 | 0.952 | A hand obscures the piece; raw deviation 34.61. |
| 016461 / f8 | 1.045 | Blur obscures the piece; raw deviation 38.10. |
| 006078 / c7 | 0.077 | Clean current crop. Using all peers instead gives 0.88 because the reference contains a hand. |
| 007602 / a1 | 1.906 | A piece differs from an empty reference; high score does not specifically mean occlusion. |
| 017217 / h1 | unavailable | Too few export-stock peers. The all-peers reference contains blur and falsely implicates the clean current crop. |

The probe provides useful candidates below the fixed raw threshold of 45, but a
better occlusion error rate is not established. Calibrate against manually reviewed
cells, include clean controls and position mismatches, and evaluate on separate
sessions before changing a production filter. Keep appearance uncertainty separate
from coverage regression targets.

## Wiring and three-frame mask proposals, 2026-09-11

`chesslab session temporal-scan <id>` writes `data/reports/temporal/<rec>.jsonl` (header with a
source stamp over log, session.yaml, every board and the profile) and regenerates the audit
cards: cells over `TEMPORAL_AUDIT_CUT` (0.4) join `position-flags.jsonl` with reason
`temporal`. The lane shows them as "Bildabweichung … · Hand oder Stellung prüfen", never as a
hand or coverage claim. A changed source marks the scan stale; `position-flags` then warns and
drops the temporal cards instead of serving old ones. Settle cards still require a matte.

`chesslab session temporal-mattes <id>` proposes an alpha per flagged frame from the nearest
clean `boards/` neighbours on both sides (≤ 5 s apart, at most one ply between, target ply
inside). Each side is a per-pixel MEDIAN of up to `--peers` (5) clean frames of that
neighbour's interval — same ply and FEN, so the board is provably static — which takes sensor
noise and a single blurred view out of the plate. Pixels must differ from BOTH plates, so
either endpoint of the move is not a hand.
`--method local` fits I = t·B + F per 61-px window, endpoint chosen per 31-px neighbourhood.
The fit is only trusted on textured patches with 0 ≤ t ≤ 1: t > 1 (a bright hand over a dark
piece) punched holes into opaque arms (009564: strength 99 at the holes, 49 on the arm) and now
falls back to the direct difference. `solid_blobs` then drops islands under
`TEMPORAL_MATTE_MIN_AREA` (0.3 % of the raster, a fingertip on one cell is ~1.5 %), fills
enclosed holes, closes alpha dips with a 51-px ellipse and sets the blob core to its 80th
alpha percentile, so piece texture under the arm no longer punches spots; the silhouette is
blurred (σ 7) and re-thresholded for a smooth outline, grown by `TEMPORAL_MATTE_GROW` (4 px).
Deliberately insensitive (user, 2026-09-11): `low`/`high` 24/48 and blobs need alpha > 0.5, so a
faint blur like 006078 is NOT a hand — 29 of 145 candidate frames get an empty mask. Last,
`refine_edges` runs closed-form matting (`pymatting`, Levin 2008) with the silhouette as trimap
(core 15 px in = foreground, 20 px out = unknown): the rim then follows the image's own hand
edge, fingers separate and motion blur becomes a gradient — 0.3–0.7 s per frame on the CPU;
KNN matting looked the same at 5 s. `--no-refine` keeps the silhouette.

Profiled 2026-09-11 (145 frames, 952-px raster): 112 s → 63 s single-process, 22 s with
`--workers 4` (contiguous chunks, one plate cache per process). What moved: ellipse closings on
float alpha 20 s → 0.8 s with rect kernels; the exposure median over all 900k pixels 14 s → 0.3 s
on every 8th pixel; closed-form at half resolution 12 s; boards read once per process. Alpha is
written as 8-bit PNG (6 ms, 60 KB) — lossless webp took 200 ms per RGBA frame and OpenCV reads a
grey webp back as three channels; the RGBA view is `--rgba`, lossy webp, off by default.

`--device cuda` (`temporal_matte_gpu.py`) runs the fit in torch: 9–17 ms per frame against
230 on the CPU, but the first call pays ~9 s of MIOpen kernel tuning per process, and the rim
stays closed-form on the CPU (a colour guided filter, 12 ms, was visibly worse — kept out).
Full run 47 s against 63 s single-process CPU; `--workers 4` on the CPU (22 s) still wins,
and cuda runs in one process. Worth it only once the closed-form rim and the reads move too.
`chesslab session temporal-adopt <id>` then turns every proposal with a cell over `MATTE_DIRTY`
into a matte row the way SAM's worker writes them — `mattes/<stem>.webp` plus a `matte.jsonl`
line with `source: temporal` — but only for frames that have NO SAM row and no matte file:
SAM stays the authority where it cut. Our own rows and files are replaced whole on a rerun, so
the pass is repeatable; the matte lane lists the new frames for the same human check, with
`temporal` in the concepts instead of `hand`/`person`. First pass over 23 sessions, 2026-09-11:
449 frames adopted, most of them SAM `--limit` backlog rather than SAM refusals (00-39-57 alone
186 of 461 candidate frames). `occluders alpha-worker <name> --temporal` measures exactly those
frames with SAM afterwards: SAM's row lands behind ours and wins in `read_matte`, its file
overwrites ours — the pair is the first cell-level agreement measurement of the two sensors.
`TEMPORAL_MATTE_MIN_AREA` rose from 0.3 % to 0.6 %: single pieces under the hand's shadow
survived at 0.3 % (three to four blobs per frame in 00-39-57), a fingertip on a cell is 1.5 %.
The pass is idempotent only because the candidate filter ignores OUR coverage (`sam_matte`):
with `read_matte` the adopted frames dropped out of the next run's proposals (650 → 631 on
00-39-57) and adopt then deleted its own rows; a file without any row counts as ours, since SAM
writes row and file together (0 orphans in six untouched sessions).
Measured on 00-39-57 after SAM re-cut the 183 adopted frames (1.95 s/frame, not the 12 s
of old): 2 906 cells flagged by both, 293 only temporal (rim and motion blur), 9 only SAM —
90.6 % agreement on flagged cells. SAM's contour is the better one and is the base.

`chesslab session temporal-upsert <id>` closes the gap the other way round, and only whole:
where SAM has a row but found NOTHING (no cell over 0.15) and temporal has a cell over 0.5, the
temporal matte replaces the frame's matte — never per cell, a cell-level merge was rejected
(user, 2026-09-11: SAM's contour is accepted wherever SAM found a hand). The row becomes
`source: upsert` with `merged_at`; SAM's file survives as `<stem>.sam.webp`, a hand-fixed
`.fixed` alpha is never replaced, and a rerun undoes earlier upserts first. The matte lane
reopens an upserted frame whose verdict is OLDER than `merged_at` (`verify.reopened`). Over all
23 sessions (2026-09-11 night): SAM re-cut the 1 298 adopted frames at ~2 s each; cell agreement
86.9 % (15 714 both, 2 360 only temporal, 19 only SAM); 154 frames upserted where SAM found
nothing, 3 229 stayed with SAM. SAM's blind spots are a dark hand at the board edge (08-30
16-20-19, 8 of 11) and the phone footage (VID_20260824: 21 and 11). Known
false positive: an arm's shadow on the h-file (11-59-12 001008) — that is what the lane is for.
Output of the proposals goes to `data/reports/temporal-mattes/<rec>/local/`
as review proposals; SAM mattes and training coverage are untouched. On the val session:
145 proposals, 19 frames without bracketing views, opaque arms at 0.28–0.33 of the raster.

## The SOP, one press (2026-09-12)

`chesslab session temporal-pass <name>` runs the whole thing: `temporal-scan` → `temporal-mattes
--workers 4` → `temporal-adopt` → `occluders alpha-worker --temporal` (own process, only when
something was adopted) → `temporal-upsert` → `realgames position-flags`, and writes
`data/reports/temporal-mattes/<name>/pass.json`. That file is the chain's marker: the web chain
(`lib/chain.ts`) offers the step **Hände nachmatten** after `matte` and before `model-read`, as a
job like the others (`lib/jobs.ts` verb `session temporal-pass`), and moves on once the file
exists. The 23 sessions of the 2026-09-11 batch carry a `pass.json` assembled from the batch
logs, marked as such in a `note` field.
