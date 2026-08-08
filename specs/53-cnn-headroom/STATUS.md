# 53 — Status

| Phase | State | Note |
|---|---|---|
| 00 — confirm | `done` | 2026-08-08, `620aa97`; 003957 confirmed via `--yes` (38 reviewed); 115912 waits for the VIEW |
| 01 — export-session | `done` | 2026-08-08, `82b7d0b`+`8d87f49`; real export ran: 1 729 frames → 110 656 crops, slice untouched and green, yield 488 @cap4 vs 504 estimated |
| 02 — occluded proposals | `done` | 2026-08-09, `d764837`; 126 720 proposals over both sessions, 1 410 at `hi 0.7`; hand-checked precision **12/12** on a stratified 30-cell draw |
| 03a — scaffold + confirm view | `done` | 2026-08-08, `e21b656`+`aba57a3`; shadcn per user, 461 own lines, byte-preserving three-key write, server recomputes reviewed_plies |
| 03b — relabel streams | `todo` | after 01+03a; ∥ 02 |
| 04 — 14-class experiment | `todo` | last; success bar = dense-evaluation table in entry.md |

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
