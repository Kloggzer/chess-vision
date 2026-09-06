# STATUS — plan/02-phone-candidate

| Phase | File | State | Note |
|---|---|---|---|
| 00 | 00-measure.md | done 2026-09-06 | `ea18f45b` script, `docs(status)` below; rule order and offset in Notes |
| 01 | 01-verb.md | todo | |
| 02 | 02-platform.md | done 2026-09-06 | `951316c8`, `ff9daceb`, `2795f763` on `feat/pc-02`; chain 22, jobs 23, chain-run 3 (+6) |
| 01 | 01-verb.md | done 2026-09-06 | `17b1b549` clocks, `47cc0e82` verb, on `feat/pc-01`; `PhoneCandidateTest` 8/8, `RecordedFramesTest` 2/2 |
| 02 | 02-platform.md | todo | |
| 03 | 03-parity.md | done 2026-09-06 | `2e9bd627` lanes, `341ec0f2` NaN fix, `27091abe` script, `e2afd205` docs, on `feat/pc-03`; 20-41-33 66 plies median 0 max 4 in 440 s vs replay 1 325 s, 14-33-02 8 plies in 19 s (replay refused), 16-20-19 24 plies in 400 s (replay crashed) |

## Dependencies

00 first, alone (it fixes the rule order and `PHONE_FRAME_OFFSET`). 01 ∥ 02 after 00 is merged into
`feat/phone-candidate`. 03 after both, in the root checkout, after `:desktop:installDist`.

## Manual steps

- Phase 00 runs up to three `replay … label` jobs, one at a time, minutes each, on the user's machine.
- Phase 03 needs `:desktop:installDist` after the 01 merge.

## Notes / discrepancies

- Review 1 (2026-09-06, fresh Opus agent): 17 findings — `video_sync` rows carry no wall clock,
  bundle layouts differ, one bundle has no record, a two-segment record, paired plies share one
  instant, `round(t·fps)` unsafe across segments. Folded in.
- Review 2 (2026-09-06, fresh Opus agent, on the revised pack): the replay ALREADY labels phone
  bundles from the record (`PhoneLog.kt`, `decider phone_log`, pre-roll time rule) — the pack was
  re-based on that: same writer, same decider, `source.crop` kept (read by `realgames.py:546`),
  `gameRecordFor`/`PlyMark.committed`/`videoNsAt` made internal instead of copied, step and job
  kind renamed `phone-record` (`"phone"` is a `ReferenceOrigin`), `chain-run.ts` dispatch and lock
  on the requested step, `videoOf` gains the mirrored top-level video, `chain-run.test.ts` in the
  registry, Phase 00 uses `chesslab.recording.Recording` for the segment walk and measures three
  rules plus the replay's own, the contradictory segment refusal removed, `videoNsAt`'s real type
  (`Double`, `List<Pair<Long, Long>>`) stated.

- Review 3 (2026-09-06, fresh Opus agent): 02 implementable as is; folded in for 00/01/03:
  `DATA_DIR` made internal (registry), `RecordedFrames.videoNsAt` qualified, `replayBoardGeometry`
  positional with the RECORDING dir and `.withCropOf(spec)` (verb gains `model=`, default real14-80),
  Phase 00 opens its own `cv2.VideoCapture` per segment with the `ConcatFrameSource` offset rule,
  monotone time rule with an `afterNs` bound (transpositions), the `Mat` is never released, the
  refusal set is one closed list in entry.md, anchors `decodeStoredGame :33`, `position :156`,
  `chain.ts:34`, `chain-run.ts :14/:30/:36`, `gameMarks :106-133`, `committed :270-283`,
  `ScannedGeometry` 15 parameters.

## Notes — Phase 02 discrepancies

- **`hasPhoneRecord` is a REQUIRED field, so three fixtures outside the registry had to gain a
  line.** `lib/drain.test.ts`, `lib/queues.test.ts` and `lib/backlog.test.ts` each build a
  `const CHAIN: ChainState = {…}` literal; without `hasPhoneRecord: false` `tsc --noEmit` fails.
  One line each, no behaviour, no assertion touched. The alternative (an optional field) would
  have contradicted the Design.
- **A `phone-record` bundle falls out of `/`'s queues and out of the backlog.** `queues.ts:73`
  splits `blocked` on `step === "label"`, `isBare` (`:46`) likewise, and `backlog.ts:12-13`
  lists `JobStep`/`JOB_STEPS` as the four old job steps. Those files belong to no phase of this
  pack, so nothing was changed there — but a bundle with a record now shows on its card only,
  not in the `blocked` lane, and `/reparatur`'s drain will never pick it up. Phase 03 or the
  orchestrator should decide whether `phone-record` joins `JOB_STEPS`.
- **Existing chain.test.ts fixtures had to become real export rows.** Two tests wrote `log.jsonl`
  as `{}` and as `frame`/`dirty` rows; under the new `hasSession` neither is an export any more,
  so both now carry a `board` key. Test COUNT unchanged (19 → 22, the three new ones).
- The `refused: ` prefix is matched on the whole log, not on `lastRunOf(text)` — as the Design
  states ("the LAST line starting with `refused: `"). A retry appends to the same file, so the
  last line is this run's; a run that prints nothing falls back to `exit <code>`.
- No prettier in the repo (`package.json` has no dependency and no script), so the Design's
  `npx prettier --write` step was skipped and the surrounding style matched by hand.
- `npx next typegen` was run once in the worktree: without `.next/types` `tsc --noEmit -p .`
  reports pre-existing `RouteContext`/`PageProps`/`LayoutProps` errors in files this phase never
  touched. It generates route types only — no build, nothing committed (`.next` is ignored).

## Phase 00 — decisions for Phase 01

- **rule order: `frame`, then `decision`, then `wall`** — as the Design has it, nothing dropped.
  All three medians against the replay are `+0.0` frames (measured on 2026-08-16-20-41-33, the only
  bundle with a replay reference), so the "median differs by more than one frame" criterion drops
  none. The order follows COVERAGE, which is what actually separates them: `frame` 66/66, 4/8,
  16/24 — a paired or batch commit never puts the intermediate position on a `frame` row; `decision`
  66/66, 7/8, 21/24; `wall` 66/66, 8/8, 24/24, the only rule that is always there.
- **`PHONE_FRAME_OFFSET = 0`** — median of `frame − replay` is `+0.0` (66 plies), max `−4`;
  `decision` and `wall` are `+0.0` / max `−5`. Within ±1, so no constant offset.
- Bundles measured: `2026-08-16-20-41-33` (66 plies, replay reference from its existing
  `candidate.json`, `decider phone_log` ×66), `2026-08-30-14-33-02` (8 plies, replay REFUSED),
  `2026-08-30-16-20-19` (24 plies of segment 0, replay CRASHED). Those are the newest three of the
  20 bundles whose record names their session; no other bundle without a `candidate.json` has a
  video at all, so a third replay had nothing to run on.
- `log.jsonl` chain audit (`chain.ts:87` = `sessionDir` = `gameDir`, `nextStep` with the candidate
  confirmed):
  - `2026-08-30-14-33-02`: top-level `log.jsonl` YES, first row has `board` NO (it is the phone's
    commit-photo log: `frame`, `ply`, `fen`, `ts`, `move_san`) → `step_after_confirm = model-read`.
    **The `export` rung is skipped**, exactly the break 02 is to fix.
  - `2026-08-30-16-20-19`: no top-level `log.jsonl` → `export`. Correct.
  - `2026-08-16-20-41-33`: `log.jsonl` YES with `board` → `labeln` (a real export, matted, read).
    Correct.

## Notes — Phase 00 discrepancies

- **The replay cannot label either 08-30 bundle. Both replays failed, both deterministically.**
  - `2026-08-30-16-20-19`: `gameMarks` (`PhoneLog.kt:121`) walks the FLAT `moves` list and throws
    on the seam — `IllegalArgumentException: game record has an illegal move b2b3 at ply 25 in
    2kr1bnr/3b1ppp/pp1P4/1p6/2P1P3/1P6/P4PPP/RNB2RK1 w - - 0 13`, uncaught, after 402 s. It is the
    pack's own `segments[0]`-only decision, measured: 01's verb must read `segmentsOrOne()[0]`, and
    the replay's crash is the strongest argument the verb has.
  - `2026-08-30-14-33-02`: `GeometryScan` refuses — `only 39 sampled frames align to the board's own
    grid (need 100 for a median quad to stand on)`; 471 frames, sampled every 10 → 48. The verb uses
    the same scan (`LabelVerb.kt:125-135`), so it will refuse this bundle with
    `refused: no frame aligned to the grid`. A 31 s recording cannot clear a gate of 100 samples.
  Neither was retried; a second run reproduces the same refusal.
- **The monotone rule as written refuses both 08-30 bundles.** Plies committed in one batch share a
  `tsEpochMs`: 8 moves on 4 instants (14-33-02), 124 on 102 (16-20-19), and plies 1–4 of 16-20-19 all
  land on frame 102, 21–24 all on 2412. A bound that demands a STRICTLY later `elapsedNs` per ply
  therefore refuses [`ply n is out of order`] on the very bundles the verb exists for. Recommendation
  for 01: the bound is non-strict for plies whose `tsEpochMs` is equal (a batch commit shares one
  frame); refuse only on a ply whose time goes BACKWARD. Two plies on one frame is what the phone
  recorded, and the replay's own `crossed()` puts them on one frame too.
- **A shared `decision` row is consumed by the first ply of the pair.** With "the first ply then
  shares it", ply 1 takes the `cnn_pair` row and ply 2 then finds nothing after the bound
  (14-33-02: `f_decision` covered 7/8, ply 2 is the hole). Harmless — `wall` catches it — but the
  rule is not "each ply of a pair gets the row", it is "one of them does".
- **`recordedFrameGate` reads the TOP level, `sessionTimeline` the session dir.** `sessionDirOf`
  (`DesktopMain.kt:894`) resolves `data/recordings/<name>/timeline.jsonl`, so the frame gate is
  active only for the mirrored bundle (14-33-02); 08-16 and 16-20-19 replay every decoded frame.
  That is why `f_preroll` reproduces `f_replay` EXACTLY on 08-16 (66/66, max 0): with no gate, the
  replay's frame is the first decoded frame at/after the mark, which is what the script computes.
  Where a gate IS active the replay's frame can only be later — 01's own decode pass has no gate,
  which is the right choice, but the two are then not comparable frame-for-frame.
- **Python reproduces Kotlin's frame index bit for bit.** `cv2` `grab()` + `CAP_PROP_POS_MSEC` per
  segment with `offset += the segment's last POS_MSEC` (`ConcatFrameSource`) gave the replay's index
  on all 66 plies of 08-16. The walk grabs instead of reads — the pixels are not wanted — which is
  what makes it 23 s for 10 571 frames over 12 segments.
- `2026-08-30-14-33-02` is ARCHIVED: its top-level `session.yaml` carries `archived_reason` — the
  engine committed ply 8 as `Nxd4` where `Nxe5` was played, so the record's ply 8 (and `log.jsonl`
  from there) is wrong. It stays a valid TIMING measurement; it is not material for labels.
- Deviation from the Design's command line: the replay was run with `quiet` added. Without it the
  board window opens and `TrackerView.awaitStep` can PAUSE the run on a stuck engine
  (`DesktopMain.kt:723`), which an unattended subprocess never recovers from. `quiet` changes
  nothing that is measured (`DesktopMain.kt:289`, "no window, for scripted runs").
- `--list` covers all 37 bundles with a `files/sessions/<sid>/`, not only the three known ones: 20
  carry a record, 16 of those have no video (the pre-2026-08-13 transfers), and `2026-08-13-01-01-25`
  has a timeline but no video.

## Notes — Phase 01 discrepancies

- **`FrameClock` was already taken.** `DesktopMain.kt:785` carries a private `class FrameClock` —
  the ENGINE's clock (wall time live, else the frame's PTS). Two same-named classes in one package
  are a redeclaration error, and the registry lets 01 touch `DesktopMain.kt` only for the
  `FILE_TOOLS` entry and the usage line, so the Design's class is named `PhoneFrameClock` here.
  Same API (`indexAt`), same role; nothing outside `PhoneCandidate.kt` and its test names it.
- **`spec` is `ModelSpec?`, not `ModelSpec`.** `desktopModelSpec(model)` returns null when a model
  has no readable `config.json` (it prints and carries on), and `withCropOf` takes a nullable spec.
  A non-null parameter would have forced the verb to refuse a model the replay tolerates.
- **`PhoneFrameClock` gained `size`.** `LabelOutcome.frames` is "how many frames this run saw", and
  the only witness of that in the five-argument overload is the number of collected timestamps.
- **`PhoneClock.order` has a default** — the Phase 00 order — so the verb builds it with one
  argument and only the tests state an order.
- **The five-argument overload resolves the video too** and can therefore refuse `no video.mp4`:
  step 7 needs `relativeVideo(video, File(DATA_DIR))`, which the Design puts in that overload.
- **The fixture bundle lives under `data/`, not in a `@TempDir`.** `relativeVideo` refuses any video
  outside `data/` (`RealGameCandidate.kt:239`, and 01 may not touch that file), so a temp directory
  elsewhere fails before anything is written. `PhoneCandidateTest` builds under
  `data/tmp/phone-candidate-test` and deletes it per test; an empty `data/tmp/` is left behind.

## Notes — Phase 03 discrepancies

- **The verb could not write a candidate at all: the phone spells an unset override `NaN`.**
  `settingsJson` (01) copied `settings.json` verbatim into `effective_config`, and
  `writeCandidate` died on it — `JsonEncodingException: Unexpected special floating-point value
  NaN`, after the whole 440 s geometry scan. All three measured bundles carry one. Fixed in
  `PhoneCandidate.kt` (registry says "01 only", but 01 is merged and the parity numbers are this
  phase's deliverable): the envelope goes through `ConfigCodec.decode` and `effectiveConfigJson`,
  which is what the replay writes and what maps the three optional Int knobs to null. Own commit
  `341ec0f2`, named `fix(desktop)`, not one of the three Steps.
- **`ConfigCodec` reports schema 4 against the current 5, so `effective_config` is DEFAULTS.** The
  2026-08-16 recording predates the current envelope; the note is printed rather than swallowed.
  The replay records defaults there too (it never loads `settings.json` without `config=`), so the
  two candidates still agree — but the block is not the phone's true knobs on old bundles.
- **Phase 00's prediction that `2026-08-30-14-33-02` refuses is FALSIFIED.** The ≥ 100-aligned-
  samples gate is not in `GeometryScan` but in the replay's `reportGeometry`/`geometryRefusals`
  (`LabelVerb.kt:142-155`), which the verb's ten lines do not include. `scan.result()` is non-null
  at 39 of 48 aligned samples, so the verb wrote 8 plies in 19 s on the footage the replay refuses.
  Whether that is a feature (short recordings become labelable) or a missing gate is a decision
  nobody has taken — the quad stands on 39 samples.
- **`real14-80` is not among the desktop's bundled models any more** (`android/app/src/main/assets/
  cnn_model/` holds `p4*` only), so `desktopModelSpec` returns null and the crop block keeps the
  geometry default: `out_size [128,128]` where the 2026-08-16 replay wrote `[80,80]`. A replay run
  today would do the same — it is the checkout's assets, not the verb.
- **`2026-08-16-20-41-33`'s live candidate is now UNCONFIRMED.** The Design's `force=1` replaced a
  CONFIRMED candidate carrying 66 `reviewed_plies`; the chain moved `labeln` → `confirm`. Nothing
  is lost — `candidate.json.replay-2026-09-06` is the kept copy, and `copy candidate.json.replay-
  2026-09-06 candidate.json` puts the human's review back. The session, its mattes and its
  model-reads are untouched.
- **Step 0 needed more than the three named edits.** `blocked`/`isBare`/`JOB_STEPS` alone would
  have contradicted themselves: `backlog.ts` skips a `label` bundle with no video and sends a
  broken one to Reparatur, and without the same two rules for `phone-record` the 16 record-carrying
  bundles WITHOUT a video (Phase 00, `--list`) would be bare on `/` and queued in the drain at the
  same time. Both guards now go through `proposesCandidate`. `drain.test.ts` and two `toEqual`
  literals gained the new key (no assertion changed).
- **No `phone-record` button in the left panel.** `app/shell.tsx`'s `STEPS` belongs to no phase of
  this pack, so the drain counts `phone-record` but only the card can start it. One row in that
  list would close it.
- **"Sekunden statt Minuten" (02's wording, `chain-actions.tsx`) is wrong by measurement.** 440 s
  against the replay's 1 325 s on the same bundle — a third, because the geometry scan still
  decodes every frame. `chain-actions.tsx` is 02's file; the docs say the measured thing.
- `tests/test_candidate_move_chains.py` has ONE failure, reported not fixed:
  `test_log_rows_agree_with_the_move_they_name[2026-08-30-14-33-02]`. The phone's own commit log
  writes the en-passant field as `-` where the candidate (chesslib) writes `e6`/`d6` — 2 rows,
  plies 2 and 4, same position. A replay candidate would fail it identically: the verb's `san` and
  `fen_after` match the kept replay's on all 66 plies of 20-41-33.

## Session log

### 2026-09-06 — Phase 03, root checkout, branch `feat/pc-03`

Four commits: `2e9bd627` (lanes and backlog), `341ec0f2` (the NaN fix, unplanned), `27091abe`
(`--replay-candidate`), `e2afd205` (docs, README row, TODO line). The verb ran once per bundle,
one at a time; no replay was run in this phase.

**2026-08-16-20-41-33** — the only bundle with a replay reference. Kept as
`candidate.json.replay-2026-09-06` before the run. Verb `exit 0` in **440 s**, 66 plies, rules
`frame` (the record's positions are all on `frame` rows). The replay that wrote the kept candidate
took **1 325 s** (`data/inbox/jobs.jsonl`: label queued 19:54:53.679Z, done 20:16:58.709Z, and the
candidate's `created_at` is that second) — the verb is **3.0×** faster, both dominated by the same
full decode.

```
   verb vs kept replay: 66/66 plies, median +0.0, median |d| 0, max |d| 4, 31 of 66 differ by 1-4
   san and fen_after identical on all 66 plies; deciders phone_log on both sides
 ply san       f_frame  f_decision   f_wall  f_preroll   f_verb  f_replay
   1 d4            931         924      924        929      931       929
   2 Nf6          1107        1107     1107       1106     1107      1106
  ...
  64 Qb6         12366       12366    12366      12370    12366     12370
  66 Kb8         12848       12848    12848      12849    12848     12849
   frame     covered 66/66  median +0.0  max -4
   verb      covered 66/66  median +0.0  max -4
   chain: log.jsonl=yes board=yes step_after_confirm=labeln
```

**2026-08-30-14-33-02** — Phase 00 predicted `refused: no sampled frame aligned to the board's
grid`. It did NOT refuse: `exit 0` in **19 s**, 8 plies, rules `wall|frame|decision` (see the
discrepancy above — the sample gate lives in the replay, not in the scan). The replay refused this
footage in 20 s, so there is no reference column; the verb's frames are the script's own cascade on
all 8 plies (92, 94, 193, 193, 276, 276, 441, 441 — `f_replay` below IS the verb's candidate).

```
   frame     covered 4/8  median +0.0  max +0
   decision  covered 7/8  median +0.0  max +0
   wall      covered 8/8  median +0.0  max -2
   chain: log.jsonl=yes board=no step_after_confirm=model-read
```

**2026-08-30-16-20-19** — `exit 0` in **400 s**, 24 plies of segment 0, `note` "100 plies after a
seam omitted". The replay CRASHED on the seam after 402 s (Phase 00), so again no reference; the
verb's 24 frames equal the cascade exactly, batch commits shared (plies 1-4 on frame 102, 21-24 on
2412).

```
   frame     covered 16/24  median +0.0  max +0
   decision  covered 21/24  median +0.0  max +0
   wall      covered 24/24  median +0.0  max +0
   chain: log.jsonl=no board=no step_after_confirm=export
```

Gates: `uv run pytest -q tests/test_candidate_move_chains.py` → 48 passed, 7 skipped, **1 failed**
(the en-passant spelling of 14-33-02's phone log, see Notes). `npx vitest run` 45 files / 320 tests,
`lib/chain.test.ts` 22, `npx eslint` and `npx tsc --noEmit -p .` clean, `uv run ruff check
scripts/phone_candidate_offset.py` clean. Kotlin: `:desktop:ktlintFormat`, `:desktop:ktlintCheck
:desktop:test --tests '*PhoneCandidate*' --tests '*RecordedFrames*' --rerun-tasks` exit 0,
`:app:testDebugUnitTest --tests '*CommentBudget*'` exit 0, `:desktop:installDist` after the fix.
`chainState` without a browser (`npx tsx`, `CHESSLAB_DATA_DIR` set): all three measured bundles
`confirm`, `2026-08-24-22-43-46` `label`.

**Next step:** the orchestrator merges `feat/pc-03` into `feat/phone-candidate`. Two decisions are
left to a human: whether `2026-08-16-20-41-33`'s confirmed candidate goes back (the kept copy is on
disk), and whether the verb should carry the replay's ≥ 100-sample geometry gate.

### 2026-09-06 — Phase 02, worktree `.claude/worktrees/pc-02`, branch `feat/pc-02`

Three commits, one per Step: `951316c8` (`hasSession`/`videoOf`), `ff9daceb` (job kind
`phone-record`), `2795f763` (the step, the fallback button, the wording).

Gate from `platform/app`, all exit 0: `npx eslint lib/chain.ts lib/jobs.ts lib/chain-run.ts
app/chain-actions.tsx lib/chain.test.ts lib/jobs.test.ts lib/chain-run.test.ts`;
`npx vitest run` (45 files, 318 tests — the four named files hold 49: chain 22, jobs 23,
chain-run 3, comment-budget 1); `npx tsc --noEmit -p .`.

Acceptance greps: `"phone-record"` is 2 in each of `chain.ts`, `jobs.ts`, `chain-run.ts`,
`chain-actions.tsx`; `"board"` is 1 in `chain.ts`.

**Next step:** the orchestrator merges `feat/pc-02` into `feat/phone-candidate`. Phase 03 then
runs the verb of Phase 01 against `2026-08-16-20-41-33` in the ROOT checkout after
`:desktop:installDist`, and decides the `JOB_STEPS`/`queues.ts` question in the discrepancies
above. Nothing on the platform side waits on 01 — the card offers `Züge vom Handy übernehmen`
today, and the job fails with the missing-binary reason until `phone-candidate` exists.
### 2026-09-06 — Phase 01, worktree `.claude/worktrees/pc-01`, branch `feat/pc-01`

`17b1b549` the clocks, `47cc0e82` the verb. Gate from `android/`:
`:desktop:ktlintFormat`, then `:desktop:ktlintCheck :desktop:test --tests '*PhoneCandidateTest*'
--tests '*RecordedFramesTest*' --rerun-tasks -q` (exit 0, 8 + 2 tests), once
`:app:testDebugUnitTest --tests '*CommentBudget*' -q` (exit 0, no budget entry added).

Acceptance greps all as specified: `"phone-candidate" to ::phoneCandidate` 1, `internal fun
videoNsAt` 1, `internal fun gameRecordFor` 1, the three `LabelVerb` symbols 3, `.release()` 0,
`"phone_log"` 0.

**Next step:** merge `feat/pc-01` into `feat/phone-candidate` (02 is independent and shares no
file), then Phase 03 in the root checkout after `:desktop:installDist`. The verb has NOT been run
on a real bundle — Phase 03 is the first time it meets `2026-08-16-20-41-33`, and Phase 00 predicts
it will refuse `2026-08-30-14-33-02` with `refused: no sampled frame aligned to the board's grid`.

### 2026-09-06 — Phase 00, root checkout, branch `feat/pc-00`

`uv run python scripts/phone_candidate_offset.py <name>`, verbatim.

**2026-08-16-20-41-33** — `--no-replay` (candidate present since 2026-08-16, `decider phone_log`
×66; no replay run for it). Decode walk 24 s.

```
== 2026-08-16-20-41-33 sid=20260816-204133 record=2026-08-16_2049.json
   segments=[66] measured=66 plies of segment 0
   record deciders: cnn_occupancy=56 cnn_overrule=2 cnn_recovery=8
   timeline: 13388 frame, 67 accepted decision, 1961 event, 13390 video_sync rows (20260816-204133)
   decode walk: 14319 frames of 9 segments in 24 s, last 497.9 s
   candidate deciders: phone_log=66
 ply san       f_frame  f_decision   f_wall  f_preroll  f_replay
   1 d4            931         924      924        929       929
   2 Nf6          1107        1107     1107       1106      1106
   3 c4           1232        1232     1232       1231      1231
   4 e6           1354        1354     1354       1353      1353
   5 Nf3          1497        1497     1497       1497      1497
   6 Bb4+         1674        1674     1674       1676      1676
   7 Nbd2         1837        1837     1837       1837      1837
   8 Be7          2115        2115     2115       2116      2116
   9 e4           2504        2504     2504       2504      2504
  10 d5           2664        2664     2664       2664      2664
  11 Bd3          2844        2844     2844       2845      2845
  12 c5           3049        3049     3049       3050      3050
  13 e5           3478        3478     3478       3478      3478
  14 Nfd7         3637        3637     3637       3637      3637
  15 O-O          3806        3806     3806       3806      3806
  16 Nc6          4093        4093     4093       4093      4093
  17 Re1          4238        4238     4238       4238      4238
  18 cxd4         4411        4411     4411       4412      4412
  19 cxd5         4610        4610     4610       4610      4610
  20 exd5         4784        4784     4784       4784      4784
  21 Nb3          4930        4930     4930       4930      4930
  22 Nc5          5129        5129     5129       5129      5129
  23 Nxc5         5287        5287     5287       5288      5288
  24 Bxc5         5464        5464     5464       5464      5464
  25 Ng5          5615        5615     5615       5615      5615
  26 Be6          5775        5775     5775       5775      5775
  27 Nxe6         5918        5918     5918       5918      5918
  28 fxe6         6076        6076     6076       6076      6076
  29 Qh5+         6260        6260     6260       6260      6260
  30 Kd7          6426        6426     6426       6425      6425
  31 a3           6548        6548     6548       6548      6548
  32 a5           6741        6741     6741       6743      6743
  33 Bd2          7130        7130     7130       7131      7131
  34 g6           7273        7273     7273       7274      7274
  35 Qe2          7450        7450     7450       7450      7450
  36 a4           7571        7571     7571       7571      7571
  37 Rac1         7695        7695     7695       7695      7695
  38 Qb6          7923        7922     7923       7922      7922
  39 Rc2          8032        8032     8032       8033      8033
  40 Rhf8         8193        8193     8193       8194      8194
  41 Rec1         8331        8331     8331       8332      8332
  42 Be7          8527        8527     8527       8529      8529
  43 g3           8686        8685     8686       8685      8685
  44 Qb3          8835        8835     8835       8836      8836
  45 Kg2          8979        8979     8979       8979      8979
  46 Rac8         9136        9136     9136       9136      9136
  47 h4           9276        9276     9276       9276      9276
  48 Kc7          9436        9436     9436       9437      9437
  49 Bh6          9601        9601     9601       9601      9601
  50 Rf7          9765        9765     9765       9765      9765
  51 Rd2          9899        9899     9899       9899      9899
  52 Kb8         10178       10178    10178      10180     10180
  53 Qg4         10483       10483    10483      10486     10486
  54 Nd8         10628       10628    10628      10629     10629
  55 Rxc8+       10792       10792    10792      10792     10792
  56 Kxc8        10951       10951    10951      10952     10952
  57 Bc2         11113       11113    11113      11113     11113
  58 Qc4         11274       11274    11274      11276     11276
  59 Bd3         11418       11418    11418      11418     11418
  60 Qb3         11563       11563    11563      11563     11563
  61 h5          11683       11683    11683      11684     11684
  62 gxh5        11830       11830    11830      11830     11830
  63 Qxh5        11975       11975    11975      11976     11976
  64 Qb6         12366       12366    12366      12370     12370
  65 Bf4         12618       12618    12618      12618     12618
  66 Kb8         12848       12848    12848      12849     12849
   frame     covered 66/66  median +0.0  max -4
   decision  covered 66/66  median +0.0  max -5
   wall      covered 66/66  median +0.0  max -5
   preroll   covered 66/66  median +0.0  max +0
   chain: log.jsonl=yes board=yes step_after_confirm=labeln
```

**2026-08-30-14-33-02** — replay ran (20 s) and REFUSED the footage, so `f_replay = -`. Decode walk
1 s. (Table from the `--no-replay` re-run; the numbers are identical.)

```
== 2026-08-30-14-33-02 sid=20260830-143302 record=2026-08-30_1433.json
   segments=[8] measured=8 plies of segment 0
   record deciders: cnn_pair=2 cnn_recovery=4 diff_after_verify=2
   timeline: 377 frame, 7 accepted decision, 34 event, 379 video_sync rows (20260830-143302)
   decode walk: 471 frames of 1 segments in 1 s, last 31.7 s
   candidate deciders: -
 ply san       f_frame  f_decision   f_wall  f_preroll  f_replay
   1 e4              -          92       92         92         -
   2 e5             94           -       92         92         -
   3 d4              -         193      193        193         -
   4 d5            193         193      193        193         -
   5 Nf3             -         276      276        276         -
   6 Nc6           276         276      276        276         -
   7 Nxe5            -         441      441        441         -
   8 Nxd4          441         441      441        441         -
   frame     covered 4/8  vs replay: -
   decision  covered 7/8  vs replay: -
   wall      covered 8/8  vs replay: -
   preroll   covered 8/8  vs replay: -
   chain: log.jsonl=yes board=no step_after_confirm=model-read
```

Replay, last lines (`tmp/phone-candidate-2026-08-30-14-33-02-replay.log`):

```
  PASSED the absolute gate: 39 of 48 sampled (81,3 % — the rate measures playing speed, not footage quality; the gate is >= 100 aligned samples)
this footage cannot become a candidate:
  - only 39 sampled frames align to the board's own grid (need 100 for a median quad to stand on). Is the board mostly out of shot, or the footage very short?
```

**2026-08-30-16-20-19** — replay ran 402 s and CRASHED on the seam, so `f_replay = -`. Decode walk
23 s over 12 segments.

```
== 2026-08-30-16-20-19 sid=20260830-162019 record=2026-08-30_1631.json
   segments=[24, 100] measured=24 plies of segment 0
   record deciders: cnn_occupancy=8 cnn_pair=2 cnn_recovery=14
   timeline: 10572 frame, 124 accepted decision, 2022 event, 10470 video_sync rows (20260830-162019)
  replay exit 1 in 402 s
   decode walk: 10571 frames of 12 segments in 23 s, last 704.2 s
   candidate deciders: -
 ply san       f_frame  f_decision   f_wall  f_preroll  f_replay
   1 d4              -           -      102        102         -
   2 d5              -           -      102        102         -
   3 e4              -           -      102        102         -
   4 e5            102         102      102        102         -
   5 Nf3             -         182      182        181         -
   6 Nc6           182         182      182        181         -
   7 Nxe5          291         291      291        290         -
   8 Nxe5            -         295      295        295         -
   9 dxe5          295         295      295        295         -
  10 Qe7           461         461      461        461         -
  11 Bb5+          529         529      529        528         -
  12 Bd7           594         594      594        593         -
  13 Qxd5          791         791      791        791         -
  14 c6           1381        1381     1381       1380         -
  15 Qd6          1850        1850     1850       1850         -
  16 Qxd6         1937        1937     1937       1937         -
  17 exd6         2010        2010     2010       2009         -
  18 cxb5         2086        2086     2086       2085         -
  19 O-O          2206        2206     2206       2205         -
  20 O-O-O        2296        2296     2296       2295         -
  21 b3              -        2412     2412       2412         -
  22 a6              -        2412     2412       2412         -
  23 c4              -        2412     2412       2412         -
  24 b6           2412        2412     2412       2412         -
   frame     covered 16/24  vs replay: -
   decision  covered 21/24  vs replay: -
   wall      covered 24/24  vs replay: -
   preroll   covered 24/24  vs replay: -
   chain: log.jsonl=no board=no step_after_confirm=export
```

Replay, last lines (`tmp/phone-candidate-2026-08-30-16-20-19-replay.log`):

```
geometry: 10571 frames, sampled every 10 -> 1058
  PASSED the absolute gate: 881 of 1058 sampled (83,3 % …)
Exception in thread "main" java.lang.IllegalArgumentException: game record has an illegal move b2b3 at ply 25 in 2kr1bnr/3b1ppp/pp1P4/1p6/2P1P3/1P6/P4PPP/RNB2RK1 w - - 0 13
	at com.chesslab.desktop.PhoneLogKt.gameMarks(PhoneLog.kt:121)
	at com.chesslab.desktop.PhoneLogKt.sessionTimeline(PhoneLog.kt:74)
	at com.chesslab.desktop.LabelVerbKt.replayPlanFor(LabelVerb.kt:82)
	at com.chesslab.desktop.DesktopMainKt.replayRun(DesktopMain.kt:334)
```

`--list` (37 bundles, abridged to the ones that matter here; the full list is one line per bundle):

```
2026-08-16-20-41-33 sid=20260816-204133 record=2026-08-16_2049 moves=66 segments=[66] instants=66 video=session timeline=session settings=session candidate=yes log.jsonl=yes board=yes step_after_confirm=labeln
2026-08-24-22-43-46 sid=20260824-224346 record=- log.jsonl=no board=no step_after_confirm=export
2026-08-30-14-33-02 sid=20260830-143302 record=2026-08-30_1433 moves=8 segments=[8] instants=4 video=session+top timeline=session+top settings=session+top candidate=no log.jsonl=yes board=no step_after_confirm=model-read
2026-08-30-16-20-19 sid=20260830-162019 record=2026-08-30_1631 moves=124 segments=[24, 100] instants=102 video=session timeline=session settings=session candidate=no log.jsonl=no board=no step_after_confirm=export
```
