# 53 — Status

| Phase | State | Note |
|---|---|---|
| 00 — confirm | `done` | 2026-08-08, `620aa97`; 003957 confirmed via `--yes` (38 reviewed); 115912 waits for the VIEW |
| 01 — export-session | `done` | 2026-08-08, `82b7d0b`+`8d87f49`; real export ran: 1 729 frames → 110 656 crops, slice untouched and green, yield 488 @cap4 vs 504 estimated |
| 02 — occluded proposals | `done` | 2026-08-09, `d764837`; 126 720 proposals over both sessions, 1 410 at `hi 0.7`; hand-checked precision **12/12** on a stratified 30-cell draw |
| 03a — scaffold + confirm view | `done` | 2026-08-08, `e21b656`+`aba57a3`; shadcn per user, 461 own lines, byte-preserving three-key write, server recomputes reviewed_plies |
| 03b — relabel streams | `done` | 2026-08-09, three commits merged `ee62a78`; bucket/tinder/drilldown WITH the brush; crops via homography from raw frames (`sharp`, review-PNG coverage only 3.5 %); one Enter = 60 rows proven |
| 04 — 14-class experiment | `measured, does not ship` | 2026-08-09 overnight; the class WORKS (path A: 0 phantoms, margin 2.3x better than the champion; `pOccluded` non-zero for the first time) but it does NOT buy dense evaluation — see the session log |

Branch: `specs-53-<phase>` per phase, off `main`. DIRECTION.md remains the investigation of
2026-08-08 (with the user's dirty-frames amendment); where DIRECTION and this pack disagree,
the pack wins (known: `game.pgn` → `reference.pgn`).

## The bar this pack is judged against (from specs/52 STATUS, 2026-08-08 — MEASURED)

| video | today, baseline | today, n=1 + dense eval | phase 04 must reach |
|---|---|---|---|
| rec-20260807 (score) | 25/0/0 | 14/11/6 (veto) | **25/0/0 under dense eval** |
| rec-20260808-115912 | 61 plies | 229 plies, 0 invented | **≥ 200 under dense eval** |
| rec-20260808-003957 | 67 plies | 33 plies | no baseline regression |

## Session log

### 2026-08-08 — phase 00 implemented (`620aa97`, merged `62b325b`)

`src/chesslab/realgames.py` (159 lines, eight flat functions, no classes), `realgames_app` in
`cli.py`, three targeted tests. Full gate: 450 passed, ruff clean. LCS is a verbatim port of
`RealGameScore.scoreMoves` including the tie-break (truth advances → out-of-order commits read
as invented). One signature deviation, deliberate: `confirm(name, *, yes, ask=None)` — `ask` is
a plain callable so the prompt-free decision logic stays pure; the CLI passes a
`typer.confirm` closure.

**Spec discrepancy found by the implementing agent (the pack's 00 file was wrong):** the
acceptance note "85/87 and 229/229 LCS are on record" conflates specs/52 REPLAY results with
the candidates ON DISK, which hold 42 and 72 plies. Dry-run against the real files:
- `rec-20260808-003957`: 42 plies vs 67 truth — matched 38, invented 4 (all the tail from
  frame 005421 on: the recording ends before the game), missed 29. `--yes` is correct here.
- `rec-20260808-115912`: 72 plies vs 237 — matched 65, invented 7, and several of the seven
  (`Nxb8`, `Rxb8`, `Rb4`) also appear as missed truth plies — the resync-era duplicate case
  the interactive gate exists for. This one wants the human pass, not `--yes`.

Still owed for the phase's acceptance: the two real confirm runs (003957 via `--yes`,
115912 interactively with the user).

### 2026-08-08 — phases 01 and 03a in parallel (merged `ae9401f`)

Two Opus agents, one supervisor, disjoint file scopes — but ONE shared checkout, so the 03a
commits stacked onto `specs-53-01` (content unharmed; future parallel agents get worktrees).
Orchestrator gate on the merged stack: 454 Python tests + ruff clean, eslint + tsc + 2 route
tests green.

**01 (exporter):** `chesslab realgames export-session` + `--report-only`. Real run: 5 419
frames decoded strictly forward in 2 m 07 s, 1 729 PNGs, slice `[OK] … 110 656 crops` with
`git diff labeling.py` EMPTY. Yield 488 @cap4 / 1 952 @cap16 (DIRECTION estimated 504/2 016 on
42 plies; 38 are reviewed — the caps key on (session, square, label) and are NOT additive
across quiet/dirty). Notable deviations, all sound: a `desktop` calibration profile is created
FROM the candidate (never invented — the ClipDriver lesson; `out_size` 128 = the pool's unit,
cell 116 px so ~1:1); intervals end at the next commit even if unreviewed; frames before ply 1
are not exported. Flag for the orchestrator: the static median quad reads 34/44 alignment pass
(77 %), worst max 5.61 px vs the 4.64 gate — the open Hebel-3 quad question, not this phase's.

**03a (confirm view):** Next.js MVP under `platform/app/` (shadcn per user amendment — three
components, no kitchen sink). `/confirm/<name>` renders the 7 unmatched 115912 plies with
review PNGs and duplicate badges; POST recomputes `reviewed_plies` server-side from the file
and writes the three confirmation keys byte-preservingly (`JSON.rawJSON` reviver keeps `0.0`
as `0.0`; tmp+rename). chess.js SANs verified 237/237 identical to python-chess on the real
PGN. Smoke against the real data: 200, 7 cards, 3 duplicate badges, candidate md5 unchanged.

### 2026-08-09 (overnight, unattended) — phase 04: the class exists and works; the bar still stands

The user labeled 2 114 occluded cells through the MVP (473 on 003957, 1 641 on 115912;
3 199 raw rows, last-line-wins nets to 2 114 — 2 111 `occluded` plus 3 piece corrections). Both
sessions re-sliced with the corrections applied (`(473 corrections)` / `(1641 corrections)`),
so `occluded` exists in the crop pool for the first time.

#### Four training rounds, and what each one measured

| # | train corpus | occluded | path-A misses | path-A phantoms | margin p99.9/max |
|---|---|---|---|---|---|
| 1 | donor + rg (50 % rg), 14c, from SCRATCH | 2 114 | — | — | val_acc 0.08, unusable |
| 2 | donor + rg (50 % rg), 14c, warm start, lr 1e-3 / 3e-4 | 2 114 | 0 / 0 | **133 / 105** | 0.64 / 0.52 |
| 3 | donor + rg (50 % rg), **13c** control | dropped | **165** | 0 | 0.39 |
| 4 | donor + rg capped to 5.3 % | 2 114 | 1 | **2** | 0.155 |
| 5 | donor + **occluded rows only** (1.8 %) | 2 114 | 8 | **0** | **0.028 / 0.087** |
| — | champion `occ-v10bn35-13c-hn` (reference, same run) | — | 3 | 0 | 0.065 / 0.328 |

Three findings, each measured, not reasoned:

1. **A 14-class head does not train from scratch in 15 epochs** (val_acc 0.08). `--resume` from
   the champion is mandatory — the resume path already handles the class-count change by design
   (276 tensors adopted, 2 skipped).
2. **The export DROWNED the corpus.** The two exported sessions contributed 63 354 of 127 162
   train rows — **50 %**, each 2-3x the largest donor session. Round 3 isolates the variable: at
   13 classes the same corpus produces 165 misses and no phantoms, at 14 classes 105-133
   phantoms. So the collapse is the DOMAIN DOMINANCE, not the new class. Capping the rg
   contribution to 5.3 % took phantoms 105 → 2; contributing **only** the occluded rows (1.8 %)
   took them to **zero, with the best margin any model has scored here** (0.028/0.087 against
   the champion's 0.065/0.328). Rule for every future export: the new session is a SUPPLEMENT,
   and `--source-manifest` with a per-cell pre-cap is how you make it one.
   A geometry hypothesis was tested first and REFUTED: `session scan` reads 3.16 / 2.97 px
   median after `autofix`, inside the 3.0-5.8 px band CLAUDE.md records for the good corpus.
3. **`pOccluded` is alive.** With `occl14-80` served, the ledger prints `occl=` non-zero **772
   times** on rec-20260807 — the first time the five safeguards have had a sensor at all.

#### Judge 2, the replay A/B — and the honest failure

| video / arm | blind 13c (today's record) | 14c `occl14-80` |
|---|---|---|
| rec-20260807, baseline | 25 / 0 / 0 | **24 / 1 / 0** |
| rec-20260807, dense eval + resync | 14 / 11 / 6 | **17 / 8 / 12** |
| rec-20260808-115912, dense eval + resync | 229 plies, 0 invented | **106 plies** |

The baseline arm is a wash (one miss, no phantoms — acceptable). The dense arm is **worse on
both videos**: on the calm one the class finds three more plies and invents six more, on the
blitz one it reaches 106 of the blind model's 229. So the missing `occluded` sensor was NOT the
thing that made dense evaluation unsafe — the specs/52 hypothesis ("an observation that could
say 'this read contains a hand' would gate exactly the reads that break the calm video") is
**refuted as stated**. The safeguards fire (772 and 2 789 non-zero `occl=` reads); the phantoms
come anyway.

#### A crash the new model exposed — fixed, and the fix is the interesting part

The blitz run died at ply 70: `MoveGeneratorException … ArrayIndexOutOfBoundsException: Index 64`
out of `DeepSearch.expand` → `legalMoves` → `generateCastleMoves` → `isKingAttacked` →
`getPawnAttacks(Square.NONE)`. Traced end to end: **an auto-resync had adopted a position where
the side NOT to move stood in check.** `cnnAdoptedFen` only counted kings, and such a board
generates moves perfectly well — so the guard passed it, the deep search then captured the
exposed king with a legal move, and the NEXT generator call on the kingless result threw, four
call layers and dozens of plies away from the adoption that caused it.

The guard is now REACHABILITY, not playability: flip the side to move on a probe board and
refuse the adoption if the opponent is in check (`TrackerEngine.reachable`, plus
`ResyncTest.aPositionWithTheOpponentInCheckIsNeverAdopted` which reproduces the exact board).
With it the blitz run completes clean — 106 plies, zero exceptions. Note the ordering: the
first guard I wrote (“can it generate moves”) passed the crashing position, and only writing
the failing test proved it. This defect predates the 14-class model — nothing about it is
occluded-specific — it needed a model that steered the search there.

**The model does not ship**, per the pack's own criterion (rec-20260807 must hold 25/0/0 under
dense evaluation). It is kept as `data/models/occ-14c-occl-lre3` and staged as
`android/app/src/main/assets/cnn_model/occl14-80` for the follow-up, NOT wired as a default.

#### What the next session should look at, in order

- **Where do the 12 phantoms come from?** The decisive frames are written; the question is
  whether they are resync adoptions of hand-distorted positions (then `autoResyncObsN` needs
  the occluded gate the resync path does NOT currently apply) or verify-ladder commits.
- **`P_OCCLUDED_THR = 0.5` against a head trained on 2 114 crops** is very likely too strict;
  the ledger's per-read distribution is on disk and would answer it in minutes.
- **2 114 crops from 2 sessions is a thin class** — the user's remaining tinder band (~7 000
  cells) and every future video widen it. This round is a floor, not a verdict on the class.
- The pack's other phases are unaffected and stand.

### 2026-08-09 — phase 02: the shadow/occluder boundary, measured (`d764837`)

`src/chesslab/occluded.py` (294 lines, 16 flat functions, no classes), `realgames propose-occluded`
in `cli.py`, three targeted tests (+95 lines in `tests/test_realgames.py`). No CNN output enters
the score anywhere; `census_thr`/`colorThr` are copied from the engine with the source cited in
the constants block, never re-tuned. `uv run pytest tests/test_realgames.py -q` → **10 passed**;
ruff check + format clean on all three files.

**Both artifacts exist and validate.** `data/realgames/<name>/occluded-proposals.jsonl`, line 1
`{"_thresholds": {"hi": 0.7, "lo": 0.3}}`, every row exactly the six pinned keys:

| session | rows | `occluded` @0.7 | p50 | p90 | p99 | >0.5 | =1.0 | invalid |
|---|---|---|---|---|---|---|---|---|
| rg-rec-20260808-003957 | 48 640 | 495 (1.02 %) | 0.015 | 0.230 | 0.701 | 1 748 | 41 | 0 |
| rg-rec-20260808-115912 | 78 080 | 915 (1.17 %) | 0.011 | 0.242 | 0.719 | 2 872 | 148 | 0 |

Producer runtime 2 m 55 s and 4 m 39 s, one worker, sequential. No ply was skipped in either
session.

#### The 30-cell confusion table (hi = 0.7, lo = 0.3)

**How the 30 were classified.** Cells were drawn with `numpy` seed 42, stratified over the three
score bands (12 / 9 / 9) across BOTH sessions, and each was then rendered from the session frame
through the same warp the scorer uses — the cell plus a 1.5-cell halo of context, with the cell
outlined — and classified by looking at it: `occluder` = a foreign object (hand, wrist, watch,
sleeve) covers the cell, `shadow` = darkened with the content intact, `clean` = neither. The
review PNGs under `data/realgames/*/frames/` were NOT used for this: they carry the tracker's
colour verdict overlay over every changed cell, which hides exactly the pixels the call rests on.
Stratifying by band is what makes precision at `hi` directly estimable — band A is a uniform draw
from the population `score > hi`.

| band | n | occluder | shadow | clean |
|---|---|---|---|---|
| A: score > 0.7 (proposed `occluded`) | 12 | **12** | 0 | 0 |
| B: 0.3 < score ≤ 0.7 (the UI's Tinder band) | 9 | 8 | 0 | 1 |
| C: score ≤ 0.3 | 9 | 0 | 0 | 9 |

**precision(occluder | score > 0.7) = 12/12 = 1.00**, above the 0.9 bar. `lo = 0.3` is confirmed
from the other end: band C is 9/9 clean, so nothing under it needs a human. Both defaults stand.

Two honest riders. **Recall at `hi` is low** — band B is 8/9 occluder, so most occluded cells sit
in the review band, not in the proposal. That is the right trade here (a wrong `occluded` label
poisons training; a miss only leaves the FEN label), but phase 03's UI carries the bulk of the
work and phase 04 should not expect the `hi` set alone to be the class. **No `shadow` cell
appeared at all** in 30 draws — the named false-positive class did not materialise, so the census
channel's shadow-invariance is untested by this table and only by `tests/test_realgames.py`'s
synthetic contract.

### 2026-08-09 — phase 03b: the streams, and the brush (merged `ee62a78`)

Built in its own worktree in parallel with 02, against the pinned schema — and finished against
02's REAL artifact when it landed mid-task: 48 640 proposals of 003957 → confirm stream 828,
control 180, tinder 6 955, 760 drilldown frames. Cell crops are cut from the RAW session frames
through the candidate's homography (`lib/warp.ts`, round-trips against the stored calibration
matrix to 1e-3 px) — the review PNGs cover only 3.5 % of proposal frames and were measured out.
One dependency added: `sharp` (exact pin; already in the lockfile via next) for PNG codec only;
a 60-crop page is 2.05 s cold / 0.56 s warm. Corrections writer validates every row (14-class
whitelist, square regex, path guards) and appends; one `Enter` on a clean bucket page wrote 60
schema-valid rows (the acceptance bar), and the agent parked its 64 smoke rows to
`data/_parked/2026-08-08-specs53-03b-smoke/`. Orchestrator gate on the merged main: 457 Python
tests + ruff clean; eslint, tsc, 12 vitest tests green.

Open UX question for the first real pass: band B holds ~7 000 cells across both sessions and is
8/9 occluder by the calibration draw — the bucket grid can serve it (human catches the ~1/9
exceptions), but phase 04 may not need the whole band labeled; decide against the dataset's
class-balance needs, not completionism.

#### What had to be corrected, both found by measuring

- **Census against a MEDIAN patch does not work, and the phase file's step 1 says to do it.** The
  median is denoised, a single frame is not, so sensor noise alone put quiet cells 14-61 raw
  census units from their own median — several times `occlCensusThr` (24). Every cell saturated at
  1.00. The reference is therefore K quiet SAMPLES compared frame-to-frame (symmetric in noise),
  scored by the **second-smallest** mismatch (ViBe's ">= 2 close samples", so one lucky sample
  cannot clear a cell), with each cell's floor and scale taken from the leave-one-out comparisons
  among the same samples. The colour reference stays a per-cell median — a mean over ~16k pixels
  has no such asymmetry. Approved by the orchestrator before it was written.
- **A quiet window is not a clean window, and this one inverted the producer.** Phase 01's 1 s
  margin declares the middle of an interval hand-free; on 115912 whole quiet windows are covered
  by a resting hand or forearm, so the reference was built from the occluder and the CLEAN dirty
  frames scored highest — four hand-checked cells at 0.70-0.95 with nothing in them. Fix:
  `quiet_pool` draws from a ±3-interval window and `keep` admits a neighbour row only for the
  cells whose LABEL it shares (the confirmed FEN timeline knows this; no pixel does). The two
  worst went 0.95 → 0.00 and 0.71 → 0.00, and band-A precision went 8/12 → 12/12.

#### Deviations, and the temptations declined

- Step 1's "clean median per interval (Gray)" is superseded as above; the per-interval MEDIAN
  survives as the colour reference and as the test's subject (`median_is_per_interval_not_global`
  keeps its name and asserts the property the name means).
- 294 lines against the ~220 asked for. The overrun is `quiet_pool` plus `ruff format` exploding
  the comprehensions and dict literals; the function count did not grow beyond flat helpers.
- Declined: a shared "background model" abstraction over census/chroma (two channels do not need
  a framework), caching crops across intervals (would have cut ~40 % of the runtime and added a
  lifetime to reason about), and a `--span`/`--samples` CLI knob (two constants nobody has
  measured a second value for yet — a knob would invite tuning without a table).

### 2026-08-09 — the dense arm's phantoms, named and priced (`5d6d26a`)

Phase 04 left the dense-evaluation bar unmet with **12 phantoms** on rec-20260807-135238 and two
named suspects: resync adoptions of hand-distorted positions, or verify-ladder commits. **Both are
wrong.** All 12 are `cnn_recovery`. The 7 resyncs that ran in the same pass invented nothing, and
the ladder contributed none.

#### What they are — MEASURED

They arrive in bursts at one frame (4103 two, 4519 one, 4767 four, 6641 two, 8437 three), and two
bursts sit **on** a missed real ply:

| missed, label frame | invented, run frame |
|---|---|
| `Bd7` 4770 | `Rc7 Kd1 Rd7 Ke1` 4767 |
| `Qb4` 6635 | `b4 Qxb4+` 6641 |

The same board difference explained by a LONGER sequence. `Kd1` followed by `Ke1` is a round trip
that changes nothing — it is parity filler, because the observation demands two BLACK moves and
those cannot be consecutive. The placement-keyed dedup in `_note` cannot collapse it: there is no
shorter legal path to that placement.

The mechanism is the ranking in `deriveMovesDeepFull`: hits first, length only as a tiebreak, with
`marginSquares = 1`. One extra explained square bought four plies — and B↔R is the identity head's
documented top confusion, so that square is exactly what a misread supplies.

#### The occluded threshold is NOT involved — MEASURED, hypothesis refuted

`P_OCCLUDED_THR = 0.5` was the other open question. At four of the five phantom frames the head
reads `occl=0` across the eight preceding observations; at 4767 a hand of 20-21 cells had just
cleared. **No lower threshold prevents any of the 12.** The per-observation distribution is sharply
bimodal — 3 638 of 4 410 at zero, then a broad hump at 13-20 cells, max 27 — which is a hand and
forearm, not a jittery threshold. Do not spend a round retuning it.

#### The price, over the whole regression set (one observation cache, `tmp/batch/20260809-100544`)

| video | mode | cost 0 | cost 1 | cost 2 |
|---|---|---|---|---|
| rec-0807 | dense | 17/8/**12** | 15/10/**1** | 10/15/**0** |
| rec-0807 | default | 25/0/**0** | 25/0/**0** | 25/0/**0** |
| VID_20260802 | default | 20/2/**5** | 20/2/**5** | 20/2/**5** |
| 003957 | default | 67 plies | 67 plies | **14** plies |
| 115912 | default | 61 plies | **51** plies | **51** plies |

~~`cnnPlyCostSquares` **ships at 0** — behaviour unchanged.~~ Cost 2 is phantom-free for a bad
reason: it commits no recovery at all (0 of 17 deciders), and 003957 collapses. Cost 1 removes 11
of the 12 dense phantoms but buys nothing in the served configuration, which has none, while
115912 loses 10 plies whose correctness no reference can settle. ~~**It is the setting for dense
evaluation, not for the phone.**~~

**Overturned 2026-08-09, same day, default is now 1.** The "served configuration has no phantoms"
premise did not survive the first reference-PGN confirm: 003957's served replay fabricated a
3-ply bridge at ply 39 — `g4/Bxg4/Kg3` in one burst at frame 005489, then `Bf3`, against the
played `Kxf3` — and never re-anchored, losing the remaining 29 of 67 plies. A fabricated bridge
is exactly the failure this price exists for, and unlike 115912's 10 plies this one IS settled by
a reference. The known cost stands as measured above: 115912 keeps 51 instead of 61 plies, and
one single-ply phantom (`Qg5`, frame 4103) is out of any length price's reach.

#### What is still open

- **The dense bar is still unmet**: 15/10/1 is not 25/0/0. One `Qg5` recovery phantom survives at
  cost 1, at frame 4103 — a SINGLE-ply bridge, which no length price touches.
- **VID_20260802's 5 phantoms do not move at any cost.** They are not bridges and remain unexplained.
- Ply count on a video with no reference PGN (003957, 115912) is not accuracy. The 10 plies cost 1
  loses on 115912 could be real moves or phantoms; nothing on disk decides it.

#### A defect found on the way, and the one it caused

Chasing the `disagree` filter's 26-cell board (frame 004266 of 003957) refuted both guesses — every
one of the 8 neighbour offsets scores worse than 0/0, and no position in the game matches the
reading better than the labeled one (best rival 40/64 against 38/64). It is simply a badly read
frame. But it surfaced this: **760 of 760 dirty rows carried no `unknown_squares`**, though all 38
segments had a non-empty `next_touches`. The exporter fix of the same morning had never reached the
data, because re-running the export meant decoding the whole video again. `decode_frames` now keeps
frames already on disk (`1ef855b`).

That made re-export cheap, and the first cheap re-export **overwrote the geometry repair**: 11
fitted quads (and 7 on the other session) replaced by the candidate's median, corners moving up to
16 px — a seventh of a cell, past alignment's 4 % criterion, silently. Rolled back from the
pre-export copy and fixed properly: repaired per-frame geometry is carried over, keyed on evidence
of repair rather than on `corners_source` alone, because `scan` writes its verdict without touching
that field (`d35ce69`). Both sessions now hold the repair (11 and 7 quads, align medians 3.16 and
2.97 px) AND the protection (380 and 610 rows), with a key-by-key diff against the pre-export logs
showing `unknown_squares` as the only difference.

**Consequence for phase 02:** the proposals on disk predate this and hold 790 + 1 280 cells (1.6 %)
on squares the exporter now refuses to vouch for, 198 of them proposed `occluded`. Regenerate
before the next labeling pass.

## 2026-08-09, evening — the grid grooves as the model-free hand sensor, and 003957 read in full

The ply-39 break of 003957's reference confirm, dissected on the run's own overlay frames:

- Frame 5421 (`g4`, decider `cnn_occupancy`): a resting hand over f2..h5, engine `waiting` —
  `motionHoldS` expired (a resting hand makes no motion), the grid COVERAGE gate did not trip
  (whole-line binary at 50 % hit fraction: a corner hand erases a third of three lines, coverage
  stays ~1.0), the census core read `occluded 0`, and `pOccluded` ≡ 0.0 under `id35-80`. The
  verify confirm rung read g4 "confidently occupied" — hand pixels under the 1−P(empty) reader —
  and committed the fabricated move through the hand.
- Frame 5489 (the 3-ply bridge, `cnn_recovery`): board already CLEAN — the bridge ran on the
  stuck arm against a position that was wrong for two seconds. No hand gate can catch it; the
  ply price can.

**The sensor** (`core-geometry/GridOcclusion.kt`): the alignment fit's band-wise groove read,
kept per segment instead of collapsed into lines — 2 axes × 9 lines × 8 bands = one segment per
cell edge, a square reads occluded at ≥ 2 missing edges. Resolution is load-bearing: full-res
crop warp 2 / 11 / 2 missing segments on clean / hand / clean frames (the 11 clustered exactly
under the hand); at detSize 30-40 of 144 and the signal drowns. Stamped onto `CnnSnapshot` where
the crops are cut (observer thread, once per observation), consumed by the verify ladder (no
vote under a hand), the recovery vote and `handInFrame()`, behind `gridHandGate` (default on).

**Measured, replay of 003957 against its 67-ply reference PGN (`id35-80`):**

| run | config | matched | invented | missed |
|---|---|---|---|---|
| baseline (confirmed 2026-08-09) | cost 0, no gate | 38/67 | 4 (`g4` + bridge) | 29 |
| `set:gridHandGate=false` | cost 1 | 38/67 | 1 (`g4`) | 29 |
| default | cost 1 + gate | **67/67** | **0** | **0** |

The attribution is clean: the ply price kills the bridge (no `cnn_recovery` decider left), the
grid arm kills the hand-committed entry, and with both the tracker reads the whole game through
the diff+verify path. The sensor reads a hand on ~39 % of this blitz-paced video's frames and
cost zero real moves — a verify vote just waits for the first clean glance after the hand
leaves. Every eyeballed "far from any commit" flag was a real hand (the game outlived the
tracker's old break, so hands continue after the last baseline commit).
