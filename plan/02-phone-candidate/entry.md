# Phone candidate — the record's plies without the tracker's replay

## What this is

A transferred bundle (`data/recordings/<name>/`) carries the game the phone tracked:
`files/games/<id>.json` (`StoredGame`, `GameRecord.kt:46`) with a `tsEpochMs` per ply, and
`files/sessions/<sid>/timeline.jsonl` with `frame` rows (`fen`, `elapsedNs`, `wallTsMs`;
`SessionTimeline.kt:50-62`), `decision` rows (`ply`, `uci`, `accepted`, `elapsedNs`; `:88-106`) and
`video_sync` rows (`elapsedNs` → `durationNs`; `:77-86`).

The replay label ALREADY uses the record: `LabelVerb.kt:82` builds a `PlyTimeline` from it
(`PhoneLog.kt:68 sessionTimeline`, `gameMarks :106`) and writes those plies as `decider = "phone_log"`
(`LabelVerb.kt:270-282 PlyMark.committed`). What costs minutes is everything else the replay does —
running the tracker and the CNN over every frame — and what it adds for a phone bundle is only the
geometry scan and a frame index per ply. This pack keeps exactly those two and drops the rest.

Bundle layouts differ: `2026-08-30-14-33-02` mirrors `video.mp4`/`timeline.jsonl`/`settings.json` at
the top level, `2026-08-30-16-20-19` has them only under `files/sessions/<sid>/`,
`2026-08-24-22-43-46` has no `files/games/`. Readers use `files/sessions/<sid>/` FIRST (what
`chain.ts:52-64 videoOf` and `jobs.ts:251 videoInput` read), then the top level.

| Phase | File | Concern | Depends on | Runs |
|---|---|---|---|---|
| 00 | 00-measure.md | which bundles carry a record; the three time rules against each other and the replay; chain audit | — | **alone, first**, root checkout |
| 01 | 01-verb.md | `PhoneCandidate.kt`: verb `phone-candidate`, `PhoneClock`, `FrameClock`, tests | 00 (rule order + offset) | parallel with 02, worktree |
| 02 | 02-platform.md | job kind + chain step `phone-record`, fallback, `hasSession` fix, `videoOf` top level | 00 | parallel with 01, worktree |
| 03 | 03-parity.md | verb on the measured bundles vs replay, docs, TODO | 01, 02 | last, alone, root checkout |

00 measures and records, it fixes nothing. 01 and 02 meet only on the command line below.

## Protocol

- Read this file completely, then only your phase file. `AGENTS.md` and `CLAUDE.md` apply verbatim;
  this pack supersedes where they differ. Trust the code over the spec; record discrepancies in
  `STATUS.md` → Notes. Blocked → STOP and write the blocker.
- Integration branch `feat/phone-candidate` (off `main`). 01/02: `git worktree add
  .claude/worktrees/pc-0N -b feat/pc-0N feat/phone-candidate` from the repo root. 00/03: the ROOT
  checkout on `feat/pc-0N` (they need `data/` and the built desktop). The orchestrator merges.
- Commits exactly as the Steps name them, files staged explicitly, last body line
  `Spec: plan/02-phone-candidate/0N-*.md`. Never `git add -A`, `--no-verify`, amend, force, reset.
- Comments ≤ 5 lines, say why. Kotlin: `CommentBudgetTest` fails at 8+ consecutive comment lines,
  `android/config/comment-budget.txt` only shrinks. TypeScript: `platform/app/lib/comment-budget.test.ts`,
  `platform/app/comment-budget.txt` (`app/chain-actions.tsx 7` — do not grow it). Python: ruff only for `scripts/`.

## Memory and compute contract

- Kotlin gate (from `android/`): `.\gradlew.bat :desktop:ktlintFormat -q`, then
  `.\gradlew.bat :desktop:ktlintCheck :desktop:test --tests '*PhoneCandidate*' --rerun-tasks -q`, once
  `.\gradlew.bat :app:testDebugUnitTest --tests '*CommentBudget*' -q`. `:desktop:detekt` is not part of
  the gate. `:desktop:installDist` only in the root checkout (00, 03).
- TypeScript gate (from `platform/app`): `npx prettier --write <files>`, `npx eslint <files>`,
  `npx vitest run <your test files>`, `npx tsc --noEmit -p .`. Never `npm run build`.
- Python (00, 03): `uv run ruff check scripts/…`; 03 also `uv run pytest -q tests/test_candidate_move_chains.py`.
- Replays: ONE `replay … label` at a time (~6 GB), only Phase 00, only bundles with a record and
  without `candidate.json`, at most three. Never touch the phone or the emulator.

## Ownership registry — overrides any phase file that disagrees

| File | Created by | May be written by | Notes |
|---|---|---|---|
| `scripts/phone_candidate_offset.py` | 00 | 03 (one option) | the measurement |
| `android/desktop/src/main/kotlin/com/chesslab/desktop/PhoneCandidate.kt` | 01 | 01 only | verb, `PhoneClock`, `FrameClock` |
| `…/desktop/RecordedFrames.kt` | exists | 01 only: `videoNsAt` → `internal` | |
| `…/desktop/PhoneLog.kt` | exists | 01 only: `gameRecordFor` → `internal` | |
| `…/desktop/LabelVerb.kt` | exists | 01 only: `PlyMark.committed` → `internal`; extract `cropJson(geometry)` from `sourceJson` | no behaviour change |
| `…/desktop/DesktopMain.kt` | exists | 01 only: `FILE_TOOLS` entry `:847-862` + usage line `:283` | |
| `android/desktop/src/test/kotlin/com/chesslab/desktop/PhoneCandidateTest.kt` | 01 | — | |
| `platform/app/lib/jobs.ts`, `chain.ts`, `chain-run.ts`, `app/chain-actions.tsx` | exist | 02 only | |
| `platform/app/lib/chain.test.ts`, `jobs.test.ts`, `chain-run.test.ts` | exist | 02 (append) | |
| `docs/phone-transfer.md`, `platform/app/README.md`, `TODO.md` | exist | 03 only | durable facts |
| `plan/02-phone-candidate/STATUS.md` | exists | every phase: own row, Notes, Session log | |

## Artifact and schema authority

- **Command line (01↔02 contract):** `desktop.bat phone-candidate <recordingDir> [force=1]` from
  `desktopWorkDir()` (`jobs.ts:370`), `<recordingDir>` = absolute `gameDir(name)` (`data.ts:50`).
  Exit 0 and `candidate.json` written. Exit 1 and exactly one stdout line starting `refused: ` for:
  no session dir / several; no record naming the session / several; empty first segment; an illegal
  move; a ply outside the video; an existing candidate without `force=1`. Nothing else is parsed.
- **`candidate.json`** is `RealGameCandidate.kt:157 candidateJson` + `writeCandidate` (`:259`,
  `confirmed:false` hardcoded). Plies are `PlyMark.committed(frame, timeMs)` — `decider = "phone_log"`,
  the vocabulary the replay already uses; no second name. `source` = `{"kind":"phone","game":<id>,
  "session":<sid>,"rule":"frame|decision|wall","offset_frames":N}` PLUS the `crop` block
  `sourceJson` writes (`LabelVerb.kt:339-352`) — `realgames.py:546` and `session.ts:175` read
  `source.crop`. `reviewed_plies` is never written here.
- **The time rule** (`PhoneClock`, 01), per ply, first that applies, then `videoNsAt(elapsedNs, syncs)`
  (`RecordedFrames.kt:49-61`, returns `Double` ns, takes `List<Pair<Long, Long>>` of (elapsedNs,
  durationNs) — made `internal`, called as is):
  1. `frame`: the first `frame` row whose `fen` has the ply's `fenAfter` placement and side to move
     (compare the first two FEN fields, `RealGameScore.kt:158 position`) → its `elapsedNs`;
  2. `decision`: else the accepted `decision` row with this `ply` → `elapsedNs` (a `cnn_pair` writes
     one row for the second ply of the pair — the first ply then shares it);
  3. `wall`: else the `frame`/`event` row nearest in `wallTsMs` to `tsEpochMs`, `elapsedNs +
     (tsEpochMs − wallTsMs)·1e6` (both are `System.currentTimeMillis()`: `TrackerService.kt:382`,
     `RecordingBundleHost.kt:147`, `GameSessionWiring.kt:118`).
  Phase 00 measures all three against each other and against the replay's existing pre-roll rule
  (`PhoneLog.kt:130`, `preRollMs + (ts − firstTs)`); it may reorder them or drop one, and it fixes
  `PHONE_FRAME_OFFSET`. 01 implements what `STATUS.md` → Notes says.
- **Frame index** = the first decoded frame whose `timestampMs ≥ videoMs`, collected in the verb's
  own decode pass (`FrameSource.next(): Mat?`, `timestampMs`, `FrameSource.kt:23-50`) — never
  `round(t·fps)` (`ConcatFrameSource.fps` is the first segment's nominal rate, `RecordingSource.kt:45-48`;
  the replay's `frame` is a decoded index and `realgames.decode_frames :632-690` walks forward by it).
- **Geometry**: `GeometryScan(src.fps) { println("  $it") }`, `offer(mat, src.timestampMs)` per
  decoded frame, `result()` — the ten lines of `LabelVerb.kt:125-135`, without lens. `BoardGeometry`
  for the crop block: `replayBoardGeometry(quad, sessionDir, configFile = null)` (`ReplayGeometry.kt:20`)
  with `quad = cornersToFlat(scan.corners)`, as `DesktopMain.kt:390` does.
- **Segments**: `game.segmentsOrOne()` (`GameRecord.kt:201`); the candidate is `segments[0]` only
  (`startFen`, `moves`), `note` = "<n> plies after a seam omitted" when more exist.
  `2026-08-30-16-20-19` is `[24, 100]` → 24 plies. `test_candidate_move_chains` wants one legal line.
- **Wording** (`chain-actions.tsx STEP`, 02): label "Züge vom Handy übernehmen"; what "Die am Handy
  erkannte Zugfolge wird mit ihren Video-Zeiten übernommen — Sekunden statt Minuten."; hint
  "schreibt candidate.json aus files/games + timeline.jsonl". Fallback button "Züge am PC neu erkennen".

## Parallel hazards

- 01 and 02 share no file; each gates in its worktree; the orchestrator re-runs the full gate.
- No untyped seam: Kotlin reads the record through `GameRecord.kt`'s `decodeStoredGame` (`:41`);
  TypeScript reads `candidate.json` as today; the only cross-language contract is the command line.
- `"phone"` already names a `ReferenceOrigin` in `chain.ts:173`; the step and job kind are
  `"phone-record"`, so greps stay meaningful.
