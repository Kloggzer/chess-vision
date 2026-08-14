# Adversarial review — `docs/labeling-ux/CONCEPT.md`

> Read on 2026-08-15 against the working tree at `2d6acba`. Every claim below was checked against
> the file or the code named. Nothing was committed and no file outside this one was touched.

## Verdict

**Phases 1–2: ship with changes. Phases 3–5: needs rework.**

The measurement half of this document is the best thing in the repo's docs. 40+ numbers were
spot-checked and the overwhelming majority are exact — including the ones the whole argument rests
on (`251 413 / 0 probs`, `6 635`, `3 976`, `34.8 %`, `4 639`, the six pending machine steps, the 17
PGNs). The diagnosis is earned.

The design half is not held to the same standard. Three defects are blocking:

1. **§7.5's "known-good first render" pairs a model with an eval it never ran** — the one place the
   document's own ground rule ("every number maps to an on-disk artifact") is broken.
2. **The proposed keymap makes tonight's fixed case slower**, and its `z` undo cannot undo.
3. **Autopilot has no engine, and §5.4 contradicts §5.5** on the single question that decides
   whether unattended heavy compute is safe.

Findings below, by severity.

---

## S1 — §7.5 renders an eval that does not exist on disk

`CONCEPT.md:719-721`:

```
real14-ms-s2-refine-bn80  auf  labeled-rg-2026-08-08-00-39-57-80
  phantoms 331 · misses 350 · crop_acc 0.830 · occupied_piece_acc 0.602
```

Those four numbers exist exactly once on disk, in
`C:\Users\mariu\project\chess-vision\data\_perf\ms-champ-realgame-holdout.json` (331 / 350 /
0.8295904 / 0.6023320). That file's `model` is
`data\models\id35-80-before-hn-20260812\model.onnx` — **not** `real14-ms-s2-refine-bn80`.

`real14-ms-s2-refine-bn80` appears in three `_perf` files (`real14-ms-s2-occluded-a.json`,
`-b.json`, `-turntable-test.json`), all with **0 phantoms**, and none of them on the pack
`labeled-rg-2026-08-08-00-39-57-80`. The two runs that *did* use that pack are
`real13-ms-s2-real-bn80` (615/229) and `real13-ms-s3-hn-bn80` (185/371).

D2 (`CONCEPT.md:175-177`) attributes the same confusion counts correctly. §7.5 does not. A document
whose header promises *"where a number does not exist yet, this document says so instead of
inventing it"* (`CONCEPT.md:5-6`) cannot ship a mockup that composes a model name and an eval result
that were never in the same file.

**Fix:** relabel the block with the model `_perf` actually names, or mark it `BEISPIEL` and drop the
model line.

---

## S2 — "a mathematical ceiling of 7.9 %" is false; the arithmetic behind it is exact

`CONCEPT.md:41` and `CONCEPT.md:132`. The three stream sizes reproduce to the digit — I recomputed
them from `occluded-proposals.jsonl` with the file's own `hi=0.7 / lo=0.3`: confirm 1 225, unsure
5 230, control 180, sum **6 635** of 83 484. The claim that this is a *ceiling* is what fails.

`streams.tsx:172-184` renders the `board` tab with `accepts={undefined}`, so `drilldown.tsx`
receives **all 1 320 frames**, and `drilldown.tsx:60` builds a 64-square overlay on each. The brush
can write any of 84 480 cells, and every write lands in `corrections.jsonl`, which is exactly what
`app/page.tsx:19-20` counts as `done`. Nothing caps the bar at 7.9 %.

The real defect is smaller and still worth the rework: the denominator counts cells that **no
workflow routes a human to**, so the bar moves imperceptibly. That is a *pacing* problem, not a
mathematical one. Overstating it as a ceiling invites the reviewer to check one number and stop.

**Fix:** replace "mathematical ceiling" with "the guided queues cover 6 635 of 83 484 cells (8 %);
the remaining 92 % are reachable only by free-hand drilldown".

---

## S3 — The keymap regresses the exact case `lib/selection.ts` was written to fix tonight

`selection.ts:4-6` — the file the concept lists as must-survive (`CONCEPT.md:107`) — records the
complaint verbatim:

```
 * The confirm button used to commit the FLAGS instead of the selection: twelve proposals wrote
 * twelve rows even when the human wanted three ("ich will nur die Reihe unten rechts markieren,
 * kann aber dann nicht die 3 committen", 2026-08-15).
```

**Interaction count, "3 of 12 flagged, commit, next board".**

*Today* the fast path is `toggleFlags` (`drilldown.tsx:245`, the "alle 12 flags ab" button), then
click the 3 real cells back on, then `Enter`. Restoring a de-flagged cell costs **two** clicks when
`brush === proposal === occluded`, because `cycleNext` dedups the order to `[occluded, base, empty]`
and one click from `base` lands on `empty` (`selection.ts:103`). So: 1 + 3×2 + 1 = **8**
interactions, or **10** if you click 9 flags off individually.

*Proposed* (`CONCEPT.md:381-393`): `Backspace` is redefined as "all flags off → **next**" — that is
today's `rejectQueue`, which commits and advances. **No key is bound to `toggleFlags`**, and it is
absent from the §1.4 keep-list (`CONCEPT.md:105-112`) and from §3.2's merge table. There is also no
cell cursor: `←/→` are spent on stepping *boards* (`CONCEPT.md:388`), yet `Space` is defined as
"open the accelerator for **the cursor square**" (`CONCEPT.md:385`) — a cursor nothing can move.

Net: the stream is presented as keyboard-first and the most common per-board operation still needs
the mouse, at the same or worse cost. The concept never counts interactions for any case, so this
never surfaced.

**Fix (one sentence):** bind `f` to `toggleFlags` (flags off, **stay**), move board-stepping to
`,`/`.` or `PgUp/PgDn`, and give `←↑→↓` a cell cursor with `Space` toggling the flag under it.

---

## S4 — `z` cannot undo a commit; `reviewed.jsonl` has no tombstone

`CONCEPT.md:397-399` justifies the new undo:

> *Corrections are append-only with last-line-wins (`labeling.py:251`), so an undo is a superseding
> row.*

True for the **training label**, false for the **UI state that governs the stream**. `commit()`
(`drilldown.tsx:294-306`) writes rejected flags to `reviewed.jsonl`, and `judgedKeys`
(`corrections.ts:101-107`) merges both ledgers into one `frame|square` map. `open()`
(`drilldown.tsx:93-100`) calls a board finished when every accept cell is in that map. A superseding
row *overwrites the label* but the key stays present — so the cell remains "judged", the board never
reopens, and the user cannot get back to what they just undid. `tinder.tsx:126` undid an in-memory
stack before writing, which is not the same problem.

`z` therefore needs either a tombstone value (a new semantic in an existing file — permitted by
§9.1's additive rule, but **undeclared**) or a rewrite of the two ledgers, which §9.1 forbids.

**Fix:** declare a `"retract": true` key on the superseding row and make `decidedKeys` delete rather
than set on it — one line in `corrections.ts:88`, and Python still ignores the key.

---

## S5 — Autopilot has no engine, and §5.4 contradicts §5.5

**No ticker.** §5.1 (`CONCEPT.md:469-471`) states the rule — *"When the slot is idle, take the
oldest … and run it"* — but never says what runs the loop. There is no `instrumentation.ts` in
`platform/app`, and the only timers in the codebase are client-side (`chain-actions.tsx:45`,
`transfers/board.tsx:55`). If the loop is driven by page loads, the promise *"a synced recording
works its way to the stream by itself"* (`CONCEPT.md:32-33`) holds only while a browser tab is open
— which is the failure D0 describes, moved one level down. Phase 1's exit check
(`CONCEPT.md:826-828`) would pass anyway, because the reviewer will have a tab open.

**Retry contradiction.** `CONCEPT.md:516-517`: *"Autopilot may retry **once** without lens."*
`CONCEPT.md:531`: *"**No automatic retries.** A failed step waits for a human forever."* Pick one.

The retry is also largely unnecessary: `lensFor` (`jobs.ts:460-462`) already returns `false` for any
recording under `files/sessions/` — i.e. every LAN-transferred phone recording — so the fail-closed
case Autopilot would be retrying around barely arises for the recordings the transfer delivers.
§5.4's second bullet reads as if `lensFor` did not exist.

**Compute guard is narrower than claimed.** §5.5's four guards (`CONCEPT.md:527-534`) all describe
the app's own single slot (`jobs.ts:56-58`, a serialized promise chain — verified, and
`globalThis`-pinned so hot reload does not fork it). None of them sees a training run or a render
the user started **from a terminal**. The user rule is one heavy job on the *machine*, not one in
the *web app*. Autopilot is the first thing in this repo that starts a ~6 GB replay with nobody
watching, and it has no cross-process interlock.

**Fix:** name the ticker (a `setInterval` in `instrumentation.ts`, or an explicit "tick on request +
tick on job completion"); delete the lens retry; add a lockfile or a GPU/JVM-busy probe as guard 5,
or state plainly that Autopilot must be paused during training.

---

## S6 — Phase 3's `x` writes to a file Phase 5 creates; Phase 2's exit check is invalidated by Phase 1

The claim under review is *"phases ship alone"* (`CONCEPT.md:816`). Two breaks:

- **`x` (board is junk) ships in Phase 3** (`CONCEPT.md:836`) and is specified to *"write nothing,
  never show it again"* (`CONCEPT.md:391`), with §4.2 pointing at *"the UI-only ledger of §7"*
  (`CONCEPT.md:404-405`). `review-notes.jsonl` is **Phase 5** (`CONCEPT.md:848-850`). Between the
  two, `x` is a keystroke with no persistence — "never show it again" survives until reload.
- **Phase 2's exit check hard-codes `1 158/3 976`** (`CONCEPT.md:832-833`). Phase 1's own exit check
  is that `2026-08-14-20-48-55` gains proposals (`CONCEPT.md:827`). That session's log has 637 rows
  and **219 dirty** — so running Phase 1 first adds up to +219 boards and Phase 2's stated exit
  number is wrong before Phase 2 starts.

**Most likely to stall: Phase 4.** It is the only phase whose cost is not in the app — it requires
re-running `propose-occluded --model` over nine sessions on the single slot, and
`check_not_circular` (`occluded_model.py:52`, verified) will *refuse* the two sessions the shipped
BatchNorm models were trained on (`occ-rg-2026-08-07-13-52-38`, `occ-rg-2026-08-08-00-39-57` are
both in `split.json` `splits.train`). Those two are the corpus's largest — 83 484 + 30 364 of the
251 413 proposal rows, **45 %**. So the `Modell ≠ FEN` lane goes live on 55 % of the corpus at best,
and §11's falsification test for it (`CONCEPT.md:898-901`) cannot run on the sessions that matter
most. Nothing later depends on Phase 4, so it can stall without blocking — but §4.2's lane bar
(Phase 3) ships a permanently-empty `Modell≠FEN 0 ⚠` chip until it lands.

---

## S7 — The "5.3 % rule in `TODO.md`" is not a rule and is not in `TODO.md`

`CONCEPT.md:641-649` draws a cap line labelled `Regel: Ergänzung, nie die Masse (TODO.md:203)` at
**5.3 %** and stamps `⚠ über der Regel` on the 34.8 %.

`TODO.md:203` is verbatim as quoted (`CONCEPT.md:188-189`) — and it contains **no percentage**. It
says a supplement must not be the bulk, and that 50 % cost 105 phantoms. The 5.3 % comes from
`specs/53-cnn-headroom/STATUS.md:85` and `:98`, where it is **one measured configuration** (`donor +
rg capped to 5.3 % → 2 phantoms`), not a threshold anyone declared.

The chart's own annotation (`CONCEPT.md:649`) is honest about this. The label above it is not.
Rendering a warning against a number no artifact declares as a cap is the same class of error as
inventing telemetry — the document just invented a *threshold* instead of a *measurement*.

**Fix:** label the line `gemessen: 5.3 % → 2 Phantome (specs/53 STATUS:85)` and drop
`⚠ über der Regel`; the honest verdict is "34.8 %, and the only measured point below it is 5.3 %".

---

## S8 — Every ledger figure in the document was stale within 18 minutes of being written

| figure | doc (`CONCEPT.md`) | disk, checked now |
|---|---:|---:|
| `corrections.jsonl` rows | 12 674 (`:576`) | **14 467** |
| occluded rows | 12 459 (`:42`, `:626`) | **14 166** |
| piece identities | 100 (`:170`) | **141** |
| `reviewed.jsonl` rows | 2 512 (`:576`) | **2 669** |
| boards touched | 1 158 / 29.1 % (`:572`) | **1 183 / 29.8 %** |
| `zuletzt gearbeitet` | 2026-08-15 00:12 (`:577`) | 2026-08-14T22:30:24Z (**00:30 local**) |
| POOL vs SNAPSHOT | 69 % not in dataset (`:42`) | **72.5 %** |

Every one of these was **correct when written** — the doc's own class breakdown sums to 12 674 and
its identity subset to exactly 100, so the read was internally consistent. The user simply kept
labeling for another 18 minutes.

This is not sloppiness; it is the concept's own best argument, unstated. But it also means the
numbers are quoted throughout as if durable (`§0`, `D2`, `§6.2`, `§7.1`), and Phase 2's and Phase 4's
exit checks are written against them. **Fix:** stamp every hard number with its read time, and write
the exit checks as *relations* ("the header names a non-zero identity count that exceeds the one
shown at Phase 2") rather than literals.

---

## S9 — The `FEN unklar` lane does not live in the stream it is counted against

`CONCEPT.md:374` sources the lane from `data/sessions/rg-<n>/log.jsonl`; the header's denominator
(`CONCEPT.md:337`, `:571`) comes from the proposal files. These are different corpora:

- `occluded.py:333,338` skips unknown squares, so a board's unknown cells produce **no proposal
  row** (verified: `1 320 × 64 − 83 484 = 996` unknown cells on dirty frames for `00-39-57`).
- The session's total is **1 627** (verified). The remaining **631** sit on *non-dirty* frames,
  which produce no proposals at all — so those boards are not in the 3 976 and cannot be positioned
  in a stream whose index is `n/3976`.
- Corpus-wide the same split applies: `4 639` is exact **only because it includes
  `rg-2026-08-14-20-48-55`**, the tenth session, which the D1 table (`CONCEPT.md:139-148`) omits
  because it has no proposal file. The nine listed sessions sum to 4 439.

Also, D5's *"no surface can show them"* (`CONCEPT.md:211`) is too strong: `drilldown.tsx:570-574`
already prints `FEN unknown on <squares>` on every board that has them. What is missing is a
*queue*, not a *display*.

---

## S10 — Killing the buckets loses cell-reachability the board cannot recover

§3.2 (`CONCEPT.md:254`) folds `bucket · occluded` and `· unsicher` into *"a grid accelerator inside
the board, opened per square with `Space`"*. That inverts the reachability:

Today the bucket iterates **cells** (5 230 unsure on `00-39-57`), grouped by square across frames
(`bucket.tsx:66-72`), independent of which boards you stop at; exceptions thrown out of a bucket are
routed onto the hand queue (`streams.tsx:57-66`). After the merge you reach a cell only by first
landing on the board that owns it — and a board is "open" only if the *lane's* accept set has an
undecided cell on it (`drilldown.tsx:93-100`). On this session the hand lane covers **355 of 1 320
boards** (measured). The unsure cells on the other 965 boards become unreachable from the Unsicher
lane as specified.

The `Unsicher 5230` chip (`CONCEPT.md:336`) counts cells while every other chip counts boards, which
is the same unit confusion D1 diagnoses.

**Fix:** keep the bucket as a lane *renderer* (cells, grouped by square) rather than as an
accelerator reachable only from a board.

---

## S11 — Auto-commit at the game boundary races Autopilot, and this is a Phase 1 × Phase 3 interaction

`writeConfirmation` (`data.ts:156`) sets `doc.confirmed = true`. `nextStep` (`chain.ts:117-118`)
then returns `"export"`. Autopilot (shipped in Phase 1) takes the oldest game whose next step is a
machine step — so the export job can be **queued within milliseconds** of the boundary commit that
§4.1 makes automatic and silent (`CONCEPT.md:304-307`).

`z` is then advertised as undoing *"one card, including across a game boundary"* (`CONCEPT.md:302`)
and as *"strictly stronger than a button, because it also works after the write"*
(`CONCEPT.md:326-327`). It does not work after the export has started: `export_session`
(`realgames.py:645`) has already read `reviewed_plies`, and there is no path in the concept that
cancels a running job or rolls back `data/sessions/rg-<n>/`.

Neither phase has this defect alone. §9.2's "each ships alone" framing is what hides it.

**Fix:** Autopilot must hold `export` for N seconds after a boundary commit, or the boundary commit
must be the thing that enqueues the export (so `z` can dequeue it).

Related, unaddressed: nothing stops Autopilot from running `propose-occluded` on the session the
user is **currently labeling**. The `loadProposals` cache is mtime-keyed (`proposals.ts:51`), so the
rewritten file changes the board list under the user's cursor on the next request. §9.3's row on
re-proposing (`CONCEPT.md:863`) only addresses whether *decisions* survive, not whether the *session
in progress* does.

---

## S12 — The read model is not costed, and one cache is not hot-reload-durable

§6.2 (`CONCEPT.md:589-590`): *"All of these are `wc -l`-cheap and mtime-cached … the same pattern
`lib/proposals.ts:46` already uses for a 6.5 MB file."*

- **The stream denominator is not `wc -l`.** `Bretter im Strom` (`CONCEPT.md:571`) is
  `|distinct frame|` over **all nine** proposal files: 251 413 lines, ~33 MB, `JSON.parse` per line
  (`proposals.ts:71-84`), and the parsed rows are **retained** in the cache for all nine sessions
  simultaneously. Extrapolating the 6.5 MB precedent to 5× that, resident, is a different claim than
  the one made.
- **That cache does not survive hot reload.** `proposals.ts:46` is a plain module-level `Map`. The
  jobs queue two files over deliberately pins itself to `globalThis` for exactly this reason
  (`jobs.ts:53-58`: *"a queue that resets on every hot reload would start a…"*). Every dev-server
  reload re-parses 251 413 rows on the next stream request.
- **`judgedKeys` has no cache at all.** `decidedKeys` (`corrections.ts:76-93`) reads and splits the
  whole ledger per call, and `page.tsx:19` calls it once per game. It is 17 k rows today and grows
  monotonically; §6.2's per-lane figures multiply the calls.
- **`/corpus` needs a group-by over 241 195 manifest rows** (`CONCEPT.md:638`). §9.3 promises
  "mtime-keyed cache, the pattern `lib/proposals.ts:46` already uses" — but that pattern is the one
  that does not survive reload. This is the closest the concept comes to requiring a new artifact
  without declaring one: an index would be the honest answer, and it is not in §1.3 or §9.1.

**Fix:** pin the caches to `globalThis` like `jobs.ts:56`, and state that the stream header reads a
per-file `{boards, cells}` summary written by `propose-occluded` — declared as an additive artifact
— rather than nine full parses.

---

## S13 — Smaller citation and framing errors

| `CONCEPT.md` | claim | disk |
|---|---|---|
| `:323` | `realgames.py:635` is the confirm gate | signature is 633; the `raise` is **645** |
| `:695` | `realgames.frame_activity` at `realgames.py:709` | **719** (709 is `STATIC_INTERVAL_S`) |
| `:432` | *"the grid's cell is 109 px (`bucket.tsx:19`)"* | `bucket.tsx:19` is `const MIN_CELL = 104` |
| `:678` | *"Five packs exist today"* | **10** `summary.json` in 5 bundles (`2026-08-13-13-48-18` alone has 5). `/corpus` must pick one per bundle; unaddressed |
| `:252`, `:298`, `:776` | bare `cards.tsx:184 / :178 / :353` | those are `app/confirm/[name]/cards.tsx` (429 lines); §1.2 `:75` names `app/cards.tsx` (161 lines) as `cards.tsx`. Two files, one shorthand |
| `:337` | header reads `Brett 1159/3976 · 29.1 %` | 1 183 is *boards touched anywhere*, not a position in the stream — using it as `n/N` in a newest-first ordering is wrong |
| `:300` | `x` in the Züge stream flags the recording useless | undefined whether the already-buffered keeps for that game are written or dropped |

Also unaddressed by any section, though implied by the four pain points:

- **Archived games.** `page.tsx:65` and `queues.ts:68` filter `archived` out of every list. The
  streams' "every board of every session" (`CONCEPT.md:331`) never says they inherit that filter.
- **Concurrent writes during a dev-server reload** — raised in the brief, absent from §9.3.

---

## Confirmations — what the author measured right

Every one of these I reproduced independently from the file or code named.

| `CONCEPT.md` | claim | verified |
|---|---|---|
| `:134`, `:160-161` | 251 413 proposal rows across 9 files; **0** with `probs`; **9 655** with `grid_score` | exact, all three |
| `:132` | `00-39-57`: 83 484 rows, confirm 1 225 + unsure 5 230 + control 180 = **6 635** | exact — recomputed with the file's own `hi 0.7 / lo 0.3` |
| `:148`, `:571` | **3 976** distinct boards with proposals corpus-wide | exact |
| `:139-147` | all nine sessions' log rows and `dirty` counts | **9/9 exact** |
| `:154` | `lib/jobs.ts:549` spawns propose with no `--model` | exact: `const args = ["run","chesslab","realgames",verb,job.name];` |
| `:156` | `occluded.py:384-385` writes `pixel_score`/`probs` only with a model | exact lines |
| `:166` | `query.ts:42` makes `DISAGREE` false without `probs`; `filter.tsx:88` is the hard-coded fallback | both exact |
| `:170-172` | 100 identity corrections, breakdown summing to 12 674 | internally exact at write time (see S8) |
| `:175-177` | `bP→bB 555`, `wN→wP 408`, `wR→wP 344` in `ms-champ-realgame-holdout.json` | exact |
| `:208` | **4 639** unknown cells corpus-wide; 1 627 on `00-39-57` | exact (caveat in S9) |
| `:203-205` | `occluded.py:333,338` skips them; `labeling.py:365-379` drops them unless corrected | exact, incl. the human-correction override at `:371` |
| `:193-196` | train 209 643 · occluded 3 901 · empty 106 707 · one game 38 235 (18.2 %) | **9/9 split.json figures exact**; `rg-VID_20260802_222741` is one game, no `occ-` variant |
| `:194` | real-game share **34.8 %** = 72 939 crops | exact and *derivable*: manifest has no split field, but `split.json` partitions by session and the sets are disjoint — 8 rg/occ-rg train sessions sum to 72 939 / 209 643 |
| `:638` | 241 195 manifest rows; the four per-session counts | exact, all four |
| `:636` | no dataset on disk carries `per_session` | confirmed — no `stats.json` under `data/datasets/`; it exists only in memory at `dataset.py:83` |
| `:62-66` | 1 label · 4 export · 1 propose · **17** adopt-pgn | **all exact**, and the 4 export-waiting games *are* `confirmed:true` — disjoint from the 4 pending confirm, no contradiction |
| `:310-311` | the 4 pending games are exactly those named, all `moves: []` | exact |
| `:575` | Σ `reviewed_plies` = **262** | exact |
| `:667-670` | `20-48-55`: sampled 338 → accepted 35/2 240, quarantine 3/192, proposals 63/925 | **all six exact** |
| `:676-678` | both `summary.json` schemas are live on disk | confirmed (4 old, 6 new) |
| `:685-690` | nothing on disk carries illumination; `stats.json`'s light/dark is square colour | confirmed |
| `:188-189`, `:419-421`, `:741` | `TODO.md:203`, `:90`, `:102` | all three land on the exact line quoted |
| `:112`, `:475` | `POST /api/chain/<name>` 409s on a step that is not the disk's next | verified in the route — including the `useless` 409. `adopt-pgn` bypasses it but `adoptPgn` (`chain.ts:131`) refuses to overwrite, so the conclusion holds |
| `:466-468` | `lib/jobs.ts` is a genuine single slot | verified: `queue.running = queue.running.then(...)`, `globalThis`-pinned at `jobs.ts:56` |
| `:806-813` | `load_corrections` ignores unknown keys; nothing in Python reads `reviewed.jsonl` | verified at `labeling.py:251-262` — it takes four keys and `c["label"]` unconditionally, which is also the correct basis for §8's "never one file with a `kind` field" |
| — | `chain.ts:91/114/129`, `crops.ts:21` (24), `tinder.tsx:31` (150) `:81` `:126`, `session.ts:109`, `data.ts:128`, `queues.ts:66`, `cli.py:725`, `sweep_infer_size.py:162`, `occluded_model.py:52`, `realgames.py:502`, `docs/data-pipeline.md` §12.4 (9 260 of 9 290) | all correct |

---

## Summary of required changes

**Before Phase 1 ships:** name the Autopilot ticker; resolve §5.4 vs §5.5; add a cross-process
compute guard or state the pause requirement (S5).

**Before Phase 2 ships:** correct §7.5's model attribution (S1); correct the "ceiling" framing (S2);
correct the 5.3 % label (S7); restate the exit checks as relations and cost the read model (S8, S12).

**Before Phase 3 ships:** bind `toggleFlags` and give the board a cell cursor (S3); specify `z`'s
tombstone (S4); give `x` a place to write or move it to Phase 5 (S6); resolve the boundary-commit /
Autopilot race (S11); keep the bucket as a lane renderer (S10).
