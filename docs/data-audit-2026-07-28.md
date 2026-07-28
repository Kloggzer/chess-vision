# Data poisoning audit — 2026-07-28

> Read-only investigation of the training data (`data/manifests/`, `data/squares/`,
> `data/sessions/`, `data/datasets/`). Nothing was modified, moved, rebuilt or trained.
> Companion to `docs/data-pipeline.md`, which is the authority on the pipeline itself.

## Verdict

**No label poisoning found.** All 20 active sessions and the 256,000-crop synthetic set are
geometrically correctly labelled — every session's occupancy pattern matches its FEN under the
identity transform and under no other member of the dihedral group; there is no transposed,
rotated or mirrored session, no foreign data, no archived session leaking into a current
dataset, and no split that puts one session on both sides. The one real defect is
**`data/datasets/occ-real` — the specs/18 baseline — is broken: 504 of its 10,560 rows point at
crop files that no longer exist**, so it can no longer be trained or evaluated. That is
breakage, not poisoning.

---

## Check table

| # | Check | Result | The number that justifies it |
|---|---|---|---|
| 1 | Label-vs-pixel: FEN occupancy vs measured occupancy, per session | **PASS** | Identity AUC **0.962–1.000** on all 18 sessions that contain pieces (§1) |
| 1b | Residual per-square disagreement is not label error | **PASS** | 1.67 % overall, but it is square-**colour**-correlated: 8.01 % on dark vs 0.85 % on light for occupied crops (§1.2) |
| 1c | Per-square *piece type* (wN vs wB vs wR …) matches pixels | **INCONCLUSIVE** | Not measurable with a pixel proxy — see §8 |
| 2 | Orientation / corner order (`[a8,h8,h1,a1]`) | **PASS** | Identity is the arg-max of all 8 dihedral transforms in every session; checkerboard parity **+1.66 to +1.98 sd**, correct sign in all 20 (§2) |
| 2b | Corner quads geometrically valid | **PASS** | 0 of 3,480 logged corner points outside the frame; all 20 quads wound the same way (CW) (§2.2) |
| 3 | Foreign / external ("chesscog") data in the pool | **PASS** | 0 rows. All 49,856 pool rows come from the 20 sessions in `data/sessions/`; the parked 378,752-row pool likewise contains only project sessions + `pretrain-synth` (§3) |
| 4 | Archived / parked sessions still inside a dataset | **FAIL** | `occ-real` lists 4 archived sessions and carries **440 of their rows (21.5 % of its train split)**; 504 of its rows have no file (§4) |
| 4b | Any *other* dataset referencing archived data | **PASS** | `occ-real2`, `occ-real3`, `occ-real3w`, `occ-synth`: 0 missing files, 0 archived sessions (§4) |
| 5 | Session appearing in more than one split | **PASS** | 0 overlaps in all 5 datasets (train∩val, train∩test, val∩test all empty) (§5) |
| 5b | Identical crops spanning train and holdout | **PASS** | 0 byte-identical crop pairs across the split boundary in any dataset (§5) |
| 5c | Near-identical crops spanning train and holdout | **PASS (with a caveat)** | 11.7 % of `occ-real3` train rows have a dhash-≤6 partner in the holdout, but their median pixel difference is **29 gray levels** (control: 70) and only 5–7 % are below 8 — structurally similar, not duplicates (§5) |
| 6 | Class distribution / impossible label histograms | **PASS** | 779 frames, **0** with ≠64 squares, >1 king, >8 pawns or >16 pieces per side (§6) |
| 6b | `occluded` appearing without manual labels | **PASS** | 0 `occluded` rows in the pool; `corrections.jsonl` does not exist, so there are no manual labels at all (§6) |
| 6c | Labels outside `config.CLASSES` | **PASS** | 0 in all 5 dataset manifests and in the pool (§6) |
| 7 | Pool ↔ disk consistency | **PASS** | 49,856 rows / 49,856 files / 0 missing / 0 orphans / 0 duplicate paths (§7) |
| 7b | The 20260719-175329 defect (one frame, two contradictory FENs) elsewhere | **PASS** | 0 duplicate frame references in all 20 active logs; positive control reproduces 35 in the archived session (§7) |
| 7c | Recorded FEN chains are internally consistent | **PASS** | 293 non-trivial transitions checked, **0** where the move distance disagrees with the logged ply gap (§7) |
| 8 | Synthetic set (`occ-synth`) labels vs packed pixels | **PASS** | Identity AUC **0.849** vs ≤0.550 for all 7 other transforms; 0/12,800 sampled manifest labels disagree with their FEN; packed-memmap row order matches the manifest for all 256,000 rows (§3.2) |
| 9 | Blind spots | see §8 | 504 `occ-real` rows unauditable (files gone); piece *type*; synth sampled at 200/4,000 boards |

---

## §1 — Label vs pixel on the real sessions

### 1.1 Method

Labels come from the FEN, so a poisoned label is almost always a geometry error and every crop
in the affected frame looks plausible on its own. The test therefore has to be **label-free**:
compute an occupancy score from the pixels alone, then ask how well the FEN's occupancy ranks
against it, and repeat under all 8 dihedral transforms of the board.

The existing crops in `data/squares/` are used directly — they *are* the pipeline's output, so
this audits what training actually consumes rather than a re-derivation. Each 128×128 crop is a
board cell expanded by `pad_side` (0.05 in both live profiles), so the cell interior is
`[10:118]`. Score = `max(|median(centre) − median(4 cell-corner patches)|, std(centre))`:
contrast against the local board colour, or texture, whichever is stronger. Scores are
rank-normalised within each frame, then pooled per session and scored with a Mann-Whitney AUC
against the FEN's occupancy bitboard.

Cost: ~4 min single-threaded for the 10-frames-per-session sample, ~9 min for all 779 frames.
The procedure is spelled out in §9; no script was committed.

### 1.2 Result

Identity is the arg-max in every session, and no competing transform comes close except where
the position itself is symmetric.

| session | frames | occupied/squares | AUC identity | next-best transform | parity (sd) |
|---|---:|---:|---:|---|---:|
| 20260630-010216 | 8 | 128/512 | 0.9897 | fliplr 0.990 † | +1.96 |
| 20260630-014453 | 10 | 320/640 | 0.9991 | fliplr 0.999 † | +1.95 |
| 20260630-080531 | 10 | 320/640 | 0.9995 | fliplr 1.000 † | +1.88 |
| 20260630-081608 | 10 | 320/640 | 0.9995 | fliplr 1.000 † | +1.88 |
| 20260708-020419 | 10 | 320/640 | 0.9681 | rot180 0.845 | +1.98 |
| 20260708-021722 | 10 | 241/640 | 0.9620 | rot180 0.673 | +1.97 |
| 20260708-195420 | 10 | 306/640 | 0.9870 | rot180 0.737 | +1.97 |
| 20260709-132058 | 5 | 160/320 | 0.9934 | flipud 0.960 | +1.67 |
| 20260709-141209 | 10 | 311/640 | 0.9975 | fliplr 0.899 | +1.66 |
| 20260709-195159 | 9 | 283/576 | 0.9905 | flipud 0.886 | +1.86 |
| 20260709-201444 | 3 | 96/192 | 0.9925 | fliplr 0.925 | +1.96 |
| 20260709-202406 | 1 | 32/64 | 0.9961 | flipud 0.956 | +1.96 |
| 20260709-212059 | 2 | 64/128 | 0.9858 | rot180 0.977 | +1.96 |
| 20260710-001623 | 2 | 64/128 | 0.9663 | rot180 0.936 | +1.97 |
| 20260721-193821 | 10 | 0/640 (empty board) | n/a | n/a | +1.86 |
| 20260721-194538 | 10 | 0/640 (empty board) | n/a | n/a | +1.80 |
| 20260721-200810 | 10 | 320/640 | **1.0000** | flipud 0.896 | +1.92 |
| 20260721-205618 | 10 | 252/640 | 0.9885 | rot180 0.676 | +1.94 |
| 20260721-212830 | 10 | 215/640 | 0.9741 | flipud 0.610 | +1.98 |
| 20260722-190224 | 6 | 192/384 | 0.9969 | flipud 0.967 | +1.95 |

† The four 30.06 sessions are `web:sweep` coverage layouts — whole ranks are filled, so their
*occupancy* is exactly left-right symmetric and `fliplr` necessarily ties identity. The tie is
broken by the parity column: `fliplr` maps a1 (dark) to h1 (light), so a mirrored session would
show a **negative** parity. All four are strongly positive. The two `lighting-capture` sessions
hold an empty board (`8/8/8/8/8/8/8/8`), so occupancy AUC is undefined there; parity is the only
orientation evidence for them and it is correct (§2).

### 1.3 What the residual 1.67 % disagreement is — and what it is not

Running the same detector over **all 779 frames** (49,856 crops, not a sample) and taking the
top-*k* squares per frame (*k* = number of pieces in the FEN) gives 416 mismatched pairs, i.e.
1.67 % of all squares. The errors are strongly persistent per square — e.g. `c7` in 74/74 frames
of `20260708-021722` — which looks alarming until it is broken down by square colour:

| square colour | occupied crops read as EMPTY | empty crops read as OCCUPIED |
|---|---:|---:|
| dark | **375 / 4,679 (8.01 %)** | 22 / 20,249 (0.11 %) |
| light | 41 / 4,850 (0.85 %) | **394 / 20,078 (1.96 %)** |

The direction of the error is determined by the square's colour: dark-on-dark pieces vanish for
the proxy and light squares' shadows/specular highlights read as pieces. A FEN-derived label
error cannot correlate with square colour — the FEN knows nothing about how a square renders.
This is therefore proxy-detector bias, and it is the same dark-square weakness the project has
measured before (`docs/`, hard-empty mining). The persistent squares are exactly the ones a
piece never leaves during a recording: `c7`, `a7`, `e7` (all dark) with a black pawn on them.

`20260721-193821`, `20260721-194538` and `20260721-200810` disagree on **0.00 %** of squares.

---

## §2 — Orientation

### 2.1 Checkerboard parity

Independent of occupancy: estimate each square's board colour from the four cell-corner patches
(piece-free even when the square is occupied), then compare squares the label says are light
against squares the label says are dark, on FEN-empty squares only.

All 20 sessions, including the two all-empty lighting captures, give **+1.66 to +1.98 standard
deviations in the correct direction**. A 90°/270° rotation or either mirror flips a1's colour
and would invert this sign. Nothing is inverted. Combined with §1 this closes the dihedral
group: rotations and transposes are excluded by the occupancy AUC, the two mirrors by parity.

### 2.2 Corner geometry

`log.jsonl` corners are stored per frame in `[a8, h8, h1, a1]` order.

- All 870 log rows across the 20 sessions carry corners (0 rows fall back to marker detection),
  and all 3,480 corner points lie **inside** their frame (0 out-of-bounds).
- All 20 quads have the same winding (positive shoelace area = clockwise in image coordinates),
  so no session has its corner list reversed.
- Camera pose differs between session groups (the rig was re-mounted: the 30.06 `default`
  profile group sits at a completely different image location than the 07.08 `phone` group),
  which is expected and harmless — the warp uses per-frame corners, not the profile's.
- Resolution from the corners (mean quad edge ÷ 8): **96.7 – 214.4 px/square**, minimum
  `20260708-020419` at 96.7. Nothing is below the device's ~98 px/square by more than a rounding.

Both live profiles agree on the parameters that could silently transpose labels:
`white_pov: true`, `margin: 0.05`, `board_size: 800`, `pad_side: 0.05`, `out_size: [128,128]`
(`data/calibration/default.yaml`, `data/calibration/phone.yaml`). A `white_pov` mismatch between
the two profiles would have rotated every 30.06 session 180° against every `phone` session; it
does not exist.

**Minor, not poisoning:** the four 30.06 sessions' `session.yaml` claims
`frame_size: [1360, 1020]` while the frames on disk are 3072×4096. Slicing does not read
`frame_size` (it uses the logged corners), so no crop is affected, but the metadata is wrong.

---

## §3 — Foreign / contaminated data

### 3.1 The historic "chesscog" contamination is gone

| where | rows | provenance |
|---|---:|---|
| `data/manifests/squares.jsonl` | 49,856 | 20 session ids, all present in `data/sessions/`, all `YYYYMMDD-HHMMSS` |
| `data/manifests/squares.jsonl.bak` | 14,784 | 11 project sessions (a 26.07 hand copy, no code writes it) |
| `C:/Users/mariu/project/chesslab-parked-20260725/manifests/squares.jsonl` | 378,752 | 29 project sessions + 10 `pretrain-synth__synth-00N` (own Blender renders) |

**Zero rows anywhere carry a `chesscog` or `chessred` provenance.** No `data/squares__*`
directory and no `data/manifests/squares__*.jsonl` variant pool exists, which is where an
`ingest --tag` would have put them. Every row in every manifest has a `data/squares/` path.

The only residue of the external-dataset experiments is code (`ingest_adapters/chesscog.py`,
`chessred.py`) and an empty placeholder profile `data/calibration/pretrain-chesscog.yaml`.
Nothing reads either in a current build.

Every dataset's `source_manifest` is `data/manifests/squares.jsonl` and nothing else; no dataset
row points outside `data/squares/` or the `mm://` packed namespace.

### 3.2 The synthetic set is correctly labelled

`occ-synth` (256,000 crops, 12.6 GB packed memmap) was audited through the memmap directly:

- Manifest row order **==** `packed_meta.json` path order for all 256,000 rows (so no row is
  reading another row's pixels).
- 0 all-black crops in 12,800 sampled.
- 0 / 12,800 sampled manifest labels disagree with the label derived from that board's FEN.
- Dihedral test on 200 sampled boards: identity **0.8487**, next best `antitrans` 0.5501, every
  other transform 0.44–0.52. Parity **+1.96 sd**. White-vs-black piece AUC **0.820**.
- Per shard (41 shards, 6 boards each): 0.751 – 0.949, a smooth continuum with **no outlier
  shard**. The lower absolute AUC vs the real sessions is the known synthetic resolution gap
  (renders carry far fewer real px/square), not a labelling defect.
- The renders declare `occluded_squares: []` in **2,000/2,000** sampled `*.json`, so there is no
  "occluder rendered over the square, labelled from the FEN" poisoning in this set.

---

## §4 — FAIL: `occ-real` references archived and hand-removed data

`data/datasets/occ-real` was built 2026-07-26 over 11 sessions. Four of them
(`20260707-145830`, `-153955`, `-154409`, `-155917`) were archived on 2026-07-27 via
`archive_session`, which purges the crops **and** the pool rows; one frame of
`20260721-205618` had its 64 crops removed by hand the same day
(`data/_parked/20260727-occluded-frame/`). A dataset is a snapshot and does not follow
(`docs/data-pipeline.md` §5.9), so:

```
data/datasets/occ-real/manifest.jsonl : 10,560 rows
  → 504 rows whose file does not exist on disk
      20260707-155917  145   (train)
      20260707-154409  133   (train)
      20260707-145830  114   (train)
      20260707-153955   48   (train)
      20260721-205618   64   (test)
```

Reproduce:

```bash
.venv/Scripts/python.exe -c "
import json,os,collections
rows=[json.loads(l) for l in open('data/datasets/occ-real/manifest.jsonl',encoding='utf-8')]
miss=[r for r in rows if not os.path.exists(r['path'])]
print(len(miss),'of',len(rows)); print(collections.Counter(r['session_id'] for r in miss))"
```

**Consequence.** `SquareDataset.__getitem__` calls `Image.open(r["path"])` with no fallback
(`src/chesslab/training/torch_data.py:435`), so `chesslab train --dataset occ-real` and any
eval over it now raise `FileNotFoundError`. The dataset that every `specs/18-occupancy-model/`
number was measured against, and that the shipped Android model `occ-act-f3` was trained on
(`data/models/occ-act-f3/config.json`), **can no longer be re-run**. It was deliberately kept
byte-identical so the numbers stayed reproducible; the archiving that happened afterwards
removed the pixels underneath it, which defeats that intent.

**Second-order finding worth recording.** Of `occ-real`'s 2,048 train rows, **440 (21.5 %) came
from the four sessions later archived as "~59 px/square … the blurriest material in the corpus"**
(`data/sessions_archive/index.jsonl`). Broken down: 260 of the 717 train `empty` crops
(**36.3 %**) and 180 of the 1,331 train `occupied` crops. The shipped occupancy baseline was
therefore trained with a third of its scarce class coming from material that has since been
judged below device resolution. This is a data-quality statement, not a mislabelling one — but
it is the most load-bearing number in the audit for anyone comparing `occ-real` against
`occ-real2`/`occ-real3`.

No other dataset is affected: `occ-real2`, `occ-real3`, `occ-real3w` and `occ-synth` all resolve
100 % of their rows and reference no archived session.

---

## §5 — Split integrity and duplicate leakage

**Sessions never straddle a split.** In all five datasets, `train ∩ val`, `train ∩ test` and
`val ∩ test` are empty, and every session appearing in `manifest.jsonl` is named in exactly one
split list.

**No identical crop crosses the boundary.** MD5 over the decoded pixels of 28,215 of the 28,719
distinct crop files referenced by the four real datasets (the 504 missing `occ-real` rows of §4
cannot be hashed): **0** train rows share pixel content with any holdout row, in any dataset.

**Near-duplicates**, measured with the pipeline's own `dataset_build.dhash` at the configured
`phash_hamming = 6`, within class, LSH-banded:

| dataset | train | with a dhash-≤6 partner in holdout | of which `empty` | of which `occupied` |
|---|---:|---:|---:|---:|
| occ-real | 1,608 | 128 (8.0 %) | 98 / 457 (21.4 %) | 30 / 1,151 (2.6 %) |
| occ-real2 | 1,649 | 126 (7.6 %) | 91 / 479 (19.0 %) | 35 / 1,170 (3.0 %) |
| occ-real3 | 13,320 | 1,562 (11.7 %) | 1,434 / 11,142 (12.9 %) | 128 / 2,178 (5.9 %) |
| occ-real3w | 13,320 | 1,562 (11.7 %) | 1,434 / 11,142 (12.9 %) | 128 / 2,178 (5.9 %) |

(`occ-real`'s train column is 1,608, not its nominal 2,048 — the 440 unhashable archived rows of
§4 are excluded. `occ-real3` and `occ-real3w` share a byte-identical `manifest.jsonl` and differ
only in `max_empty_ratio`, which `train.py` applies from `split.json` at load time, so their
pre-subsample leakage figures are necessarily equal.)

This looks worse than it is. Sampling 300 of the flagged `occ-real3` pairs and measuring their
mean absolute pixel difference:

| set | median MAD | p10 | fraction < 8 gray levels |
|---|---:|---:|---:|
| flagged `empty` pairs | 29.1 | 10.5 | 0.07 |
| flagged `occupied` pairs | 33.7 | 9.0 | 0.05 |
| control: random same-class pairs | 70.2 / 70.4 | 22.0 / 41.1 | 0.00 |

The flagged pairs are genuinely more similar than chance but nowhere near identical — a
different session, a different mount and different lighting, showing the same kind of square.
dhash is doing its job (97.1 % of `empty` crops have a distinct dhash, so the hash is not
degenerate on flat crops), but Hamming ≤ 6 on a 64-bit hash is a *structural* similarity
threshold, and the hamming distribution of the flagged pairs is skewed to the far edge
(734 at 6, 455 at 5, exactly **1** at 0). Verdict: **no leakage that would inflate a holdout
metric materially**. Worth re-checking if `phash_hamming` is ever raised.

Note the asymmetry that makes this measurable at all: dedup runs on the train split only
(`docs/data-pipeline.md` §5.1), so within-train near-duplicates are already gone (0.0 % baseline)
while the untouched holdout can still contain lookalikes.

---

## §6 — Class distribution

Per-session 14-class histograms over the pool are all consistent with the physical inventory
(`config.DEFAULT_INVENTORY`) and with real play — e.g. `20260708-021722` shows pieces
disappearing over 74 frames (wN 26, bN 24 against wP 446) exactly as captures accumulate.

Per-frame checks over all 779 frames: **0** frames with ≠64 crops, **0** with more than one wK
or bK, **0** with more than 8 pawns of a colour, **0** with more than 16 pieces of a colour.

`occluded`: **0 rows** in the pool, **0** in any dataset manifest. This is correct and
self-consistent — `occluded` can only come from manual labels, and
`data/manifests/corrections.jsonl` **does not exist**, so no manual label has ever been
recorded. `config.to_occupancy_class` raises on `occluded`, so a stray one would stop a build
rather than be binned; nothing has had to.

No label outside `config.CLASSES ∪ {occupied}` appears in any of the five dataset manifests.

The three 30.06 sweep sessions report `pawn_on_backrank` in 8 FENs each. That is by design, not
corruption: `mode: play`, `notes: web:sweep`, and `config.DEFAULT_INVENTORY`'s docstring states
"Legality does not matter: the FEN serves only as a label source".

**Absent inputs, worth knowing:** `data/manifests/hard_empty.jsonl` does **not** exist, so the
mined-hard-empty protection wired into `dataset_build.build_dataset` (`priority_paths`,
`dataset_build.py:340`) was inert for the `occ-real2`/`occ-real3`/`occ-real3w` builds.
`docs/data-pipeline.md` §7 still lists it as "live and useful". The mined file survives only in
the parked tree (`chesslab-parked-20260725/manifests/hard_empty.jsonl`, 89 rows, all `empty`,
all from sessions that still exist).

---

## §7 — Pool integrity and the log-level defects

`data/manifests/squares.jsonl` is exactly consistent with `data/squares/`:

```
rows 49,856 | unique paths 49,856 | files on disk 49,856
rows with missing file 0 | orphan files 0 | duplicate paths 0
rows where the label directory != the label field 0
rows where the filename != <sid>_<frame>_<square> 0
pool sessions not in data/sessions/ 0 | data/sessions/ with no pool rows 0
archived sessions still in the pool 0
```

Cross-checked against the session logs, all 20 sessions:

- **0 duplicate frame references** and **0 frames carrying two different FENs**. This is the
  defect that got `20260719-175329` archived (its reason in `data/sessions_archive/index.jsonl`
  states 35 such frames, i.e. 2,240 contradictorily-labelled crops). The same check run against
  that archived session as a positive control reproduces **35/56 frames**, confirming the check
  detects the defect. No live session has it.
- **0 frames flagged `unusable` that still have rows in the pool** — every session has been
  re-sliced since its flags were set, so `docs/data-pipeline.md` §5.3's trap is currently not
  biting anything.
- **0 manifest/log FEN mismatches** and **0 missing frame files**.
- **FEN chains are internally consistent.** 293 non-trivial transitions in the `track`
  recordings were checked with a ≤3-ply breadth-first search: in **every** case the minimum
  number of legal moves between two consecutively logged positions equals the logged ply gap.
  There is no fabricated position — the apparent "illegal jumps" (e.g. `20260721-205618` ply
  54→62) are simply plies for which no frame was written.

---

## §8 — What could NOT be checked (do not read these as passes)

1. **Piece type.** The pixel proxy measures occupancy and, weakly, piece colour
   (white-vs-black luminance AUC 0.60–0.84 per session, positive everywhere, which rules out a
   180° colour swap). It **cannot** tell a `wN` label on a bishop's pixels. A type-level
   mislabel would require either a trained 14-class model's confusion analysis (compute the
   constraints forbid) or human review. For the occupancy models currently shipped this is
   moot; for any future 14-class run it is an open hole.
2. **The 504 `occ-real` rows.** Their crop files are gone, so their labels cannot be audited at
   all. They were audited indirectly only insofar as `20260721-205618` (64 of them) is a live
   session that passes every other check.
3. **`occ-synth` coverage.** 200 of 4,000 boards (5 %) for the dihedral test, 6 boards per shard
   for the per-shard scan, 2,000 of 4,000 render JSONs for the occlusion check. A defect
   affecting <1 % of boards would be missed. Full coverage would mean reading all 256,000 packed
   crops — roughly 25 minutes single-threaded, no GPU; cheap if wanted.
4. **`data/_parked/20260727-orphan-synth-v2-diverse/`** (260 sessions, pointers only) was not
   pixel-audited because its renders were deleted. It reaches no manifest and no dataset, so it
   cannot poison anything.
5. **Absolute label correctness at the ~1 % level.** The per-frame check's residual is dominated
   by proxy-detector bias (§1.3), so it bounds label error from above at ~1.7 % of squares but
   cannot bound it below. Nothing in the data suggests a systematic error at that scale; a
   session-wide one would have shown as a depressed identity AUC.

---

## §9 — Reproducing this

Everything below is read-only, single-threaded, CPU-only. The analysis scripts were written to
a scratch directory and are not committed; each section above states the measurement precisely
enough to re-derive. The three that carry the load:

**Dihedral label-vs-pixel (§1, §2).** For each session, sample frames, read the 64 existing
crops per frame from `data/squares/`, score each crop as
`max(|median(centre) − median(cell-corner patches)|, std(centre))` on the `[10:118]` interior,
rank-normalise within the frame, build the 8×8 board in `[row = 8 − rank][col = file]`, and
compute a Mann-Whitney AUC of each of the 8 dihedral transforms against the FEN's occupancy.

**Cross-split leakage (§5).**

```bash
.venv/Scripts/python.exe -c "
import sys; sys.path.insert(0,'src')
from chesslab.dataset_build import dhash, _band_ranges, _hamming
# hash every crop referenced by a dataset, index the holdout by LSH band, query the train rows
"
```

**Integrity and log defects (§4, §7).**

```bash
.venv/Scripts/python.exe -c "
import json,os,glob,collections
pool=[json.loads(l) for l in open('data/manifests/squares.jsonl',encoding='utf-8')]
paths=set(r['path'] for r in pool)
disk=set(p.replace(chr(92),'/') for p in glob.glob('data/squares/*/*.png'))
print(len(pool), len(paths), len(disk), len(paths-disk), len(disk-paths))"
```

---

## §10 — Recommended follow-ups (none executed)

1. **Decide what `occ-real` is for.** It is currently neither reproducible nor rebuildable —
   rebuilding it changes the specs/18 numbers, leaving it means the baseline cannot be
   re-measured. Either restore the four archived sessions and re-slice (the archive reasons say
   how), or explicitly retire `occ-real` and re-baseline on `occ-real2`, recording in
   `specs/18-occupancy-model/` that the old numbers are historical.
2. **Record the 21.5 %.** `occ-real`'s train split drew 36.3 % of its `empty` crops from the
   sessions later archived as too blurry. Any `occ-real` vs `occ-real2/3` comparison should
   carry that footnote.
3. **Correct `docs/data-pipeline.md` §7** — `hard_empty.jsonl` is described as live but no
   longer exists in `data/manifests/`, so the last three builds had no hard-empty protection.
4. **Fix the four 30.06 `session.yaml` `frame_size` fields** (they say 1360×1020; the frames are
   3072×4096). Harmless today, misleading to anything that starts trusting the field.
5. **Consider a `dataset verify` gate** that fails when a dataset's `manifest.jsonl` references a
   path that no longer exists — that single check would have caught §4 the day it happened.
