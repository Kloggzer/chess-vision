# 53 — CNN headroom: where data still buys tracking, and where it cannot

> Investigation only (2026-08-08). No code was changed, no training run, no data mutated.
> Every number is tagged **MEASURED** (verified today against the tree or by counting),
> **ESTIMATED** (arithmetic on measured inputs, assumptions named), or **HYPOTHESIS**.

## The thesis

**The user's version:** "Most of the recognition is now carried by the CNN. Do we still have
headroom in the CNN — keep training, more hard-negative rounds, better labeling, possibly with the
occluded class so we can extract it from the videos? There are several new videos now, they should
yield decent training data. So far we never looked at the frames with occlusion in them because
labeling was tedious — can we build something for that, does it even make sense?"

**The sharpened version this investigation supports:** Yes, the CNN carries the tracker now, and
yes, there is headroom — but it is *specific*, not generic. The model is already phantom-free on
its home domain (daylight, aligned crops), so "train more" on more of the same buys nothing
measurable. The headroom is three named gaps: (1) the **evening/night identity domain**, which the
corpus does not contain at all and which measurably feeds desync streaks and latched alarms;
(2) an **occluded class that exists at all** — the shipped model has none, and five shipped
safeguards silently read `pOccluded ≡ 0.0` because of it; (3) freshly **re-mined tails** on the new
footage. The deepest correction to the thesis: the biggest wins do not show up as classifier
accuracy — they route through *fewer chronic identity conflicts → fewer latched alarms → the
resync/bridge machinery (specs/37/39) firing on positions it can actually resolve*. And one ceiling
is structural and no amount of data lifts it: **observation rate**. At emulated phone rate
(`fps=15`) the same binary drops 67 → 42 plies on the fast-played video — missing clean windows
cannot be classified better, only observed more often (specs/26's 4-crop verify is that lever, not
this pack).

## Findings

1. **The CNN is the decider now — MEASURED.** Deciders across the five `candidate.json` files
   (`data/realgames/*/candidate.json`): `rec-20260808-003957` 39 of 42 plies `cnn_occupancy`
   (+3 `cnn_recovery`); `rec-20260808-115912` 60 of 72 `cnn_occupancy` (+10 recovery, 1 pair,
   1 overrule); `game-2026-08-02-kotlin` 10 occupancy / 16 recovery. The diff path is the
   gatekeeper (settle/motion/taint), the CNN is the commit engine. Corollary:
   `docs/tracker-flow.md`'s red band ("zero snapshots reach the engine") is **stale** — the break
   was the harness crop size, fixed in `cb10113` ("the crops were cut at 128 for a model that
   takes 80"); the doc should be updated separately.

2. **Error class A — night-light identity, MEASURED** (`specs/52-the-harness-runs-what-ships/STATUS.md`,
   "Findings from the first labeling days"): on the 00:39 recording (`rec-20260808-003957`),
   `id35-80` reads the never-moved c3 knight as `wP@0.951`, the c1 rook as `wB@0.816`, the e8 rook
   as `bB@0.804` — *while reading the actual event perfectly* (`c2 empty 1.000`, `e2 wQ 0.951`
   after Qxe2). Chronic conflicts feed the desync streak, latch the alarm, and
   `resolvesAlarmConflicts` then rightly refuses every bridge — no legal sequence turns a knight
   into a pawn. specs/52's own verdict: "the finding is TRAINING DATA (these evening videos are the
   corpus gap), not logic." This is **data-fixable**: the corpus's 23 sessions are rig/daylight
   captures; the evening domain exists only in the videos (`VID_20260802_222741` at 22:27,
   `rec-20260808-003957` at 00:39).

3. **Error class B — the occupancy tail is closed on the home domain, MEASURED** (CLAUDE.md,
   specs/32, specs/29): after the corpus re-alignment and the hard-negative fine-tune,
   `occ-v10bn35-13c-hn` reads **0 phantoms / 3 misses**, matching the 2-class full-width champion
   at a third of the width. The whole residual error was **150 crops of 73 602 empties** (0.2 %),
   100 of them on dark squares. The 13-class reader's occupancy bias
   (`1 − P(empty) − P(occluded)`, undecided softmax → 0.923 "occupied") is real arithmetic but a
   **TAIL, not a floor** — the 2026-08-01 correction in CLAUDE.md overturned the older memory note.
   What remains data-fixable here is small and must be **re-mined on the new footage**, not reused.

4. **Error class C — the occluded class does not exist in the shipped model, and five shipped
   safeguards are dead because of it. MEASURED, code-level.**
   `android/app/src/main/assets/cnn_model/id35-80/config.json` lists 13 classes:
   `empty` + 12 pieces, **no `occluded`** (specs/29 excluded it: zero corpus examples). In
   `core-cnn/Observations.kt:35`, `po = if (iOccluded >= 0) probs[iOccluded] else 0.0` — so with
   the shipped model `pOccluded ≡ 0.0` on every square, always. Everything downstream of that
   probability is a no-op today:
   - `Taint.readsOccludedAnywhere()` (`core-engine/Taint.kt:108`) — never true;
   - the resting-hand veto (`Taint.kt:157`) — never fires;
   - the recovery clean-board gate (`CnnTick.kt:378-380`, `RECOVERY_OCCLUDED_LIMIT = 0`, the
     2026-08-07 finger-in-frame defence) — never refuses a vote *on its occluded arm*;
   - `cleanCommitsOnly`'s `handInFrame` occluded arm — part of why the strict gate "never fired"
     in specs/52's A/B;
   - the observation ledger's `occl=` count (`TrackerStack.kt:166`) — **structurally zero**.
     Verified: no `occl=[1-9]` appears anywhere on disk. ⚠ This corrects the working assumption
     that the ledger already yields "thousands of hand-window markers" — it yields thousands of
     *timestamped observation* markers; the hand flag in them is constantly 0 until a served model
     has the class. The engine's hand handling today rests entirely on the pixel side (motion,
     census/shadow veto, the ">2 changed squares" heuristic).
   Old 14-class models exist (`data/models/p1-isolate … tiny-p3`, synth-occluder era) but none is
   near deployment quality. So "occluded from real videos" is not a nice-to-have label: it is the
   **only way to turn five already-written, already-tested safeguards on**.

5. **The corpus today — MEASURED** (`data/manifests/squares.jsonl`, counted 2026-08-08):
   **117 440 rows, 23 sessions**; `empty` 73 602, `wP` 11 090, `bP` 10 943, rooks ~2.8 k, bishops
   ~2.7 k, knights ~2.6 k each, queens ~1.36 k, kings 1 425 each, **`occluded` 0**. The minority
   pieces (Q/K ~1.4 k) are the classes the night-light errors land on-adjacent to (R→B, N→P
   confusions; identity over Q/R/N/B is 0.818, CLAUDE.md).

6. **The new videos' geometry is good enough to slice from — MEASURED.** Each candidate carries a
   median quad in image pixels plus `board_size`: `rec-*` videos sit at **114–115 px/square at the
   sensor**, warped at `board_size 928` (cell 116); `win-…` at 152.5 px/square, `board_size 1248`.
   Nothing upsamples (device reference: ~98 px/square). Clock error ≤ 1 ms. `candidate.json` is
   key-for-key what a session `log.jsonl` row needs: corners (constant median quad), a FEN timeline
   (`moves[].fen_after` + `frame`), frame count, fps.

7. **The label timeline is the binding constraint, not the pixel count — MEASURED + ESTIMATED.**
   Raw square-images are deceptively plentiful (63 000 decoded frames × 64 ≈ **4.0 M** across the
   five videos) but almost none of it is *usable*: labels exist only inside quiet intervals between
   *verified* commits, and the fixed camera makes everything else a duplicate. Counted from the
   candidates (see table below): the reenactment videos are hand-dense — `rec-20260808-003957` has
   only **~30 s of quiet, known-position footage** (895 frames at a 2 s hand margin, ESTIMATED
   margin) across 42 plies. What actually bounds the yield is `per_cell_cap` arithmetic: a video
   contributes at most `cap × distinct (square,label) cells`, and the five videos hold **103–162
   cells each** (MEASURED from the FEN timelines). Honest total at the default cap 4: **~2 300
   crops**; at cap 16 (the lighting-capture lesson, §5.10/§5.11 of `docs/data-pipeline.md`):
   **~9 100**. Against a 117 k-row pool that is small — *except* that every one of the evening-video
   crops lands in a domain the pool holds **zero** of, and marginal value is per-domain, not
   per-row.

8. **Both PGN-backed games are only partially frame-anchored — MEASURED.** The candidates stop at
   the last verified commit: `rec-20260808-003957` labels 42 plies of the real game's ~68
   (Carlsen–Shevchenko, ends 34.Nxc7+; the free-running quiet run reached 67 plies ending `Nxc7+`,
   specs/52), `rec-20260808-115912` labels 72 of ~238 (Erigaisi–Carlsen, 119 moves). A PGN gives
   the SAN truth for the whole game but **no frame timestamps** past the last commit — the ledger
   plus an LCS score run can extend the anchoring, but only human review makes an interval
   trustworthy. Neither PGN is stored in the repo; that should be fixed while memory is fresh.

9. **Hard-negative rounds have a written recipe and known traps — MEASURED (documented).**
   `scripts/mine_hard_empty.py --criterion occupancy --occ-thr 0.10` takes the tail (mining only
   already-failing crops found 27 — too few to reach a batch); mine at the **served**
   `--infer-size`; the keep-list is a **global hidden training input** — park it under
   `data/_parked/` between experiments (current: `2026-07-31-spec29-01-hard-empty/`); twins reuse
   `split.json` **verbatim** (splits are not reproducible from parameters); every path-A number is
   re-measured in the same run as its reference; keep-lists mined on pre-realignment geometry mine
   an artefact and are never reused. Expected magnitude of a new round over the exported videos:
   **low hundreds of crops** (last round: 150/73 602 on the home domain; the night domain will
   inflate it — HYPOTHESIS until measured). Gap: **no identity hard-positive miner exists** —
   `mine_hard_empty.py` mines empties only; the c3-knight-as-pawn class of error has no offline
   mining tool today.

10. **The counter-thesis is real and bounded — MEASURED** (specs/52, `fps=<n>` stride):
    at emulated phone rate the same binary drops `rec-20260808-003957` **67 → 42 plies** and VID
    `20/2/5 → 18/4/10`, while the slow-played `rec-20260807` stays at 25/0/0. Observation *rate*
    limits fast play, and no classifier quality creates windows that were never observed. But the
    two levers are coupled, not competing: `rec-20260807`'s own candidate (static-quad label run)
    committed **20 of 25 plies as `cnn_recovery`** — a tracker that spends its life re-deriving
    bridges because chronic identity conflicts keep poisoning agreement. Fewer chronic conflicts →
    fewer latched alarms → `resolvesAlarmConflicts` and the two-vote bridge machinery act on
    resolvable positions. Data feeds structure.

## What the new videos are worth

Counted from `data/realgames/*/candidate.json` (2026-08-08). "Cells" = distinct (square, label)
pairs across the labeled FEN timeline — the unit `per_cell_cap` caps on. Quiet frames assume a 2 s
hand margin per commit (ESTIMATED); everything else MEASURED.

| video | when | frames · fps | px/sq sensor | labeled plies (of true) | quiet known-FEN | cells (occupied) | crop yield cap4 / cap16 | special value |
|---|---|---|---|---|---|---|---|---|
| `rec-20260808-003957` | 00:39 | 10 139 · 30 | 114.5 | 42 (~68, PGN exists) | ~30 s | 126 (71) | 504 / 2 016 | **night light** — the measured identity-gap video |
| `rec-20260808-115912` | 11:59 | 21 425 · 30 | 114.6 | 72 (~238, PGN exists) | ~30 s | 162 (100) | 648 / 2 592 | most positions; daylight |
| `rec-20260807-135238` | 13:52 | 8 821 · 30 | 114.4 | 25 (ends in illegal O-O-O) | ~168 s | 103 (56) | 412 / 1 648 | slow play → most quiet footage |
| `VID_20260802_222741` | 22:27 | 9 576 · 30 | 116.3 | 22 confirmed (+ tail to mate unreviewed) | ~62 s | 103 (56) | 412 / 1 648 | **evening light**, already human-confirmed 22 plies |
| `win-20260807-125257` | 12:52 | 12 747 · 60 | 152.5 | 4 trustworthy of 7 (3 fabricated) | ~17 s | 77 (39) | 308 / 1 232 | mostly unusable until the 60 fps case is solved |
| **total** | | 62 708 | | | | | **~2 284 / ~9 136** | |

Reading: **thousands, not hundreds of thousands** — the fixed-camera lesson (§5.5: track sessions
are 10–25 % unique) and the cap arithmetic dominate. The value is concentrated in (a) the two
evening videos' occupied cells (~127 cells ≈ 500–2 000 night-domain piece crops — the exact class
of crop the corpus has zero of), and (b) the occluded windows, which no current pipeline extracts
at all. Extending `rec-20260808-115912`'s anchoring toward its full 238 plies (via ledger + PGN +
review) would roughly double its cells; that is review effort, not code.

**The missing exporter is small — MEASURED against the pipeline docs.** `chesslab slice` needs only
a session directory: `frames/*.png` + `log.jsonl` rows of `{frame, fen, corners}` +
`session.yaml` (`docs/data-pipeline.md` §2). A confirmed candidate supplies all three: sample k
frames per quiet interval, stamp each with the interval's `fen_after` and the candidate's median
quad (already in image pixels, `[a8,h8,h1,a1]` — same convention), `mode: track`. Slicing, capping,
dataset build, split handling all exist. What does **not** exist: (a) the exporter itself
(video + candidate.json → session), (b) any producer for `occluded` rows — `corrections.jsonl` has
a live read path (`run_slice → label_overrides`) and **no writer** since the web UI deletion
(`docs/data-pipeline.md` §7), and FEN cannot say "occluded" by definition. A variant pool
(`slice --variant-tag`) or a new field in the exported log rows are the two candidate homes.

## The occluded class: three producers, one honest

The circularity trap, named: **the model must never receive its own occluded reads as ground
truth** — a class trained on what the current model already believes converges on the belief, not
the hand. Today the trap cannot even be sprung (the shipped model has no occluded output, finding 4),
but the producers must be ranked before one exists:

1. **The model's own reads / the old 14-class synth models — circular, rejected.** Any
   `pOccluded`-derived label, once a 14-class model serves, is self-training. The synth occluder
   footprint (`docs/synth-pipeline.md`) stays a legitimate *synthetic* producer (the label comes
   from the renderer's geometry, not a model) but is domain-limited — it never taught a real hand.

2. **Ledger / taint hand-windows — currently empty, and weakly circular even later.** The
   `chesslabObs` `occl=` field is structurally 0 with the shipped model (finding 4). Even with a
   14-class model, ledger hand flags are model reads (producer 1 in disguise). The engine's
   *pixel-side* taints (motion, census) are model-free, but which frames the engine examined is
   itself downstream of tracker state. Verdict: usable as a **proposer** of candidate windows,
   never as the **labeler**.

3. **Pixel diff against the known static position, inside human-confirmed intervals — honest.**
   Within a confirmed interval the board is known and static; a reference frame (median or early
   quiet frame of the interval) defines what every square looks like unoccluded. Squares whose
   pixels deviate strongly during the commit-adjacent windows (the complement of the quiet
   intervals — precisely where the arm sweeps) are occluded, by pixel evidence + confirmed PGN,
   **no model in the loop**. The label needs no statement about what is *under* the hand — which is
   exactly why FEN can't produce it and diff can. Threshold tuning has prior art: the census/shadow
   veto's cream-on-light lesson (memory: `census_thr` 40) says shadows will be the false-positive
   class to calibrate against, and the review JPEGs are the calibration set.

The **review JPEGs** (200–325 per video, 5-frame windows straddling each commit — i.e. hand-rich by
construction) are the cheap human layer: reviewing them confirms the SANs (which the FEN labels
need *anyway*) and spot-checks the diff producer's occluded proposals in the same pass. That is the
answer to "labeling was tedious": nobody labels squares; a human confirms ~40–70 SANs per game
against a known PGN and eyeballs montages.

Whether a **14-class model** should then ship is a separate, gated question. specs/29 excluded the
class because the corpus had zero examples ("a class with no training examples whose logit can
still win an argmax on unusual input"). Real occluded crops dissolve that argument's premise, and
the reader arithmetic *improves*: a hand square moving mass into `occluded` pulls `pOcc` down
instead of masquerading as a piece. But specs/29's bar stands: measured against the current
champion in the same run, phantoms are the veto. HYPOTHESIS until measured.

## Conclusions

**Worth doing, in order:**

1. **Confirm the two PGN-backed labels and store the PGNs in-repo** (review JPEGs + LCS score
   runs). Cheapest step, unlocks everything else; nothing downstream is trustworthy on
   `confirmed: false` candidates. `VID_20260802` is already confirmed for 22 plies.
2. **Build the small exporter** (video + confirmed candidate → session; quiet-interval sampling;
   commit-window frames tagged for the occluded producer). This turns every future tracked game
   into free labels — the compounding asset the thesis is really about.
3. **Night-identity fine-tune** (the measured, chronic, structure-feeding gap): slice the evening
   videos, build a twin dataset under a new name (split.json of the parent verbatim; the evening
   sessions land in **train** — they are the domain being added, and val/test must not silently
   become the new domain), fine-tune `id35-80`'s recipe. Judge by (a) `sweep_infer_size --paths a`
   same-run vs the current model — phantoms veto; (b) **replay A/B on the two evening videos** —
   desync-streak length, latched alarms, recovery-decider share. The second judge is the thesis's
   real metric.
4. **Occluded producer + first real occluded corpus** (producer 3 above), then the gated 14-class
   experiment against specs/29's bar. Even if 14-class loses, the crops cost almost nothing once
   the exporter exists, and the five dead safeguards are the standing reason to keep trying.
5. **Re-mine hard empties** over the enlarged corpus (occupancy criterion, served size, fresh
   keep-list, parked afterwards). Small expected yield; cheap; do it last so it mines the
   post-fine-tune model.

**Not worth doing:**

- Generic "more training" on the existing corpus/domain — the home-domain tail is 3 misses /
  0 phantoms; there is nothing left to squeeze that a val_acc curve could even see (CLAUDE.md:
  `val_acc` has ranked runs in reverse).
- Treating the ledger as an occluded-label source today (it is structurally silent, finding 4).
- Reusing any pre-realignment keep-list or any pre-realignment path-A number as a reference.
- Chasing observation-rate limits with model quality — that budget belongs to the 4-crop verify
  export (specs/26 lever) and the specs/37/39 structure work, not to data.

**Binding pitfalls for whoever implements** (all from CLAUDE.md, restated because every one has
already cost a day): per-session splits, never random; twin datasets copy `split.json` verbatim;
`id35-80` is BatchNorm — **sweep the learning rate per normalizer or do not compare**; class
weights and `max_empty_ratio` are functions of the class list (a 14-class build changes the phantom
defence as a side effect); `hard_empty.jsonl` is a global hidden input — park it; path-A references
re-measured in the same run; `infer_size` must be a trained scale; `--patience 25` below
`val_acc` ~0.98; new sessions → new dataset name, never in place.

## Open questions

1. **Where do the frame anchors past the last commit come from?** LCS against the PGN plus the
   observation ledger can propose them; does review of, say, plies 73–238 of `rec-20260808-115912`
   pay for itself, or is the marginal domain value of those positions (same light, same pieces)
   already near zero after the first 72?
2. **How large is the night-domain identity error set, exactly?** specs/52 measured three chronic
   squares on one video via onnxruntime over the observer's crops; a full sweep over both evening
   videos' quiet intervals (same tooling) would size the fine-tune before it is run — and double as
   the identity hard-positive miner that does not exist yet (finding 9).
3. **Does the diff-based occluded producer survive shadows?** The census veto history says
   cream-on-light shadows imitate occlusion; calibrate the producer's threshold on the review
   JPEGs before trusting a single label. HYPOTHESIS that census + luma margin suffices.
4. **Is 14-class worth shipping even if it matches (not beats) 13-class on phantoms?** The value is
   in the five safeguards, not the classifier row — what is the measured live effect of a working
   resting-hand veto and recovery clean-board gate on the fast-played videos?
5. **`win-20260807` (60 fps)** stays parked until the dt-normalisation question (specs/52 Hebel 4)
   is answered; its data yield is near zero anyway (17 s quiet, 4 trustworthy plies).

## Proposed phases (not implemented)

- **00 — the label is confirmed or it is nothing.** Human review of `rec-20260808-003957` and
  `rec-20260808-115912` against their PGNs (stored under `data/realgames/<name>/game.pgn` and
  referenced from the candidate); `confirmed: true` + `reviewed_plies` written the way
  `game-2026-08-02` already models. Deliverable: two confirmed FEN-per-interval timelines, PGNs
  in-repo.
- **01 — a video becomes a session.** The exporter (confirmed candidate + video → session
  directory), quiet-interval sampling with a declared hand margin, commit-window frames tagged.
  Gate: `chesslab slice` runs unmodified on the output; report raw vs unique vs capped yield
  against this document's table before any dataset is built.
- **02 — the night fine-tune.** Twin dataset (split verbatim, evening sessions in train),
  rate-swept fine-tune of the shipping recipe, judged by same-run path-A sweep (phantom veto) AND
  replay A/B on both evening videos (desync streaks, alarms, recovery share). Ships only if both
  judges agree.
- **03 — occluded exists.** The pixel-diff producer over commit windows, review-JPEG calibration,
  occluded rows into a variant pool; then the gated 14-class experiment against specs/29's bar,
  measured with the five `pOccluded` consumers live in a replay A/B.
- **04 — the tail, re-mined.** `mine_hard_empty --criterion occupancy --occ-thr 0.10 --infer-size
  <served>` over the post-02 model and enlarged corpus; keep-list used for one build, then parked.
