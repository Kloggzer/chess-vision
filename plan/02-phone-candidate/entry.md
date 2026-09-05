# Phone candidate — moves from the phone's record instead of a PC replay

## What this is

A transferred bundle (`data/recordings/<name>/`, `docs/phone-transfer.md` "Where things land") already
carries the game the phone tracked and the user watched: `files/games/<id>.json` (`StoredGame`,
`GameRecord.kt:46`) with a `tsEpochMs` per ply, and `timeline.jsonl` with `video_sync` rows that tie the
phone clock to the video clock (`RecordedFrames.kt:22`). Today the chain ignores both and replays the
whole video on the PC (`jobs.ts:347 labelArgs`) — minutes at real time — only to obtain a frame per ply.

After this pack: a `:desktop phone-candidate <recordingDir>` verb writes `candidate.json` from record +
timeline + a geometry scan in seconds; the platform offers it as **Züge vom Handy übernehmen** wherever a
matching record exists and keeps the replay as the fallback; "Züge prüfen" stays the human gate.

| Phase | File | Concern | Depends on | Runs |
|---|---|---|---|---|
| 00 | 00-measure.md | frame offset phone-clock vs replay on three real bundles; chain-state audit | — | **alone, first** |
| 01 | 01-verb.md | `PhoneCandidate.kt`: the verb, `PhoneClock`, tests | 00 (the offset) | parallel with 02 |
| 02 | 02-platform.md | job kind `phone`, chain step, card wording, `hasSession` fix | 00 | parallel with 01 |
| 03 | 03-parity.md | verb on the three bundles vs replay, docs, TODO | 01, 02 | last, alone |

00 is an investigation: it measures and records, it fixes nothing. 01 and 02 meet only on the command
line stated under "Artifact authority" — 02 never imports Kotlin, 01 never touches TypeScript.

## Protocol

- Read this file completely, then only your phase file. `AGENTS.md` and `CLAUDE.md` apply verbatim;
  this pack supersedes where they differ. Trust the code over the spec; record discrepancies in
  `STATUS.md` → Notes. Blocked → STOP and write the blocker.
- Integration branch `feat/phone-candidate` (exists, off `main`). One branch AND worktree per phase:
  `git worktree add .claude/worktrees/pc-0N -b feat/pc-0N feat/phone-candidate`, run from the repo
  root with that relative path. The orchestrator merges; never merge yourself. Phase 00 and 03 work in
  the ROOT checkout on their branch (they need `data/` and a built desktop); 01 and 02 in worktrees.
- Commits exactly as the Steps name them, files staged explicitly, last line of the body
  `Spec: plan/02-phone-candidate/0N-*.md`. Never `git add -A`, `--no-verify`, amend, force, reset.
- Comments ≤ 5 lines, say why. Kotlin: `CommentBudgetTest` fails at 8+ consecutive comment lines and
  `android/config/comment-budget.txt` may only shrink (`uv run python android/scripts/comment_budget.py`
  after cleaning a file). TypeScript: `platform/app/lib/comment-budget.test.ts`, limit 5 for new blocks.

## Memory and compute contract

- Kotlin gate (from `android/`): `.\gradlew.bat :desktop:ktlintFormat` then
  `:desktop:ktlintCheck :desktop:test --tests '*PhoneCandidate*' --rerun-tasks`. `:desktop:detekt` is red
  before this pack — do not run it. Never `:desktop:installDist` in a worktree; the orchestrator builds.
- TypeScript gate (from `platform/app`): `npx prettier --write <files>`, `npx eslint <files>`,
  `npx vitest run lib/<file>.test.ts`, `npx tsc --noEmit -p .`. Never `npm run build`.
- Python (00, 03 only): `uv run pytest -q tests/test_candidate_move_chains.py`, `uv run ruff check`.
- Replays are heavy: ONE `replay … label` at a time (a JVM holds ~6 GB), only in Phase 00 and only
  for a bundle that has no `candidate.json`. Never fan out, never touch the emulator or the phone.

## Ownership registry — overrides any phase file that disagrees

| File | Created by | May be written by | Notes |
|---|---|---|---|
| `scripts/phone_candidate_offset.py` | 00 | 03 (reuse, not rewrite) | the measurement |
| `android/desktop/src/main/kotlin/com/chesslab/desktop/PhoneCandidate.kt` | 01 | 01 only | verb + `PhoneClock` |
| `android/desktop/src/main/kotlin/com/chesslab/desktop/LabelVerb.kt` | exists | 01 only (`scanGeometry` visibility) | |
| `android/desktop/src/main/kotlin/com/chesslab/desktop/DesktopMain.kt` | exists | 01 only (`FILE_TOOLS` entry + usage line) | |
| `android/desktop/src/test/kotlin/com/chesslab/desktop/PhoneCandidateTest.kt` | 01 | — | |
| `platform/app/lib/jobs.ts`, `chain.ts`, `chain-run.ts`, `app/chain-actions.tsx` | exist | 02 only | |
| `platform/app/lib/chain.test.ts`, `lib/jobs.test.ts` (find via `ls platform/app/lib/*.test.ts`) | exist | 02 (append) | |
| `docs/phone-transfer.md`, `platform/app/README.md`, `TODO.md` | exist | 03 only | durable facts |
| `plan/02-phone-candidate/STATUS.md` | exists | every phase: own row, Notes, Session log | |

## Artifact and schema authority

- **The command line is the 01↔02 contract.** `desktop.bat phone-candidate <recordingDir>
  [force=1]`, run from `desktopWorkDir()` (`jobs.ts:370`) like every other verb. `<recordingDir>` is
  the absolute `gameDir(name)` (`data.ts:50`). Exit 0 and `candidate.json` written; exit 1 and one
  line starting with `refused:` on stdout for every refusal (no record, more than one record naming
  the session, more than one `GameSegment`, an illegal move, a ply outside the video, an existing
  candidate without `force=1`). 02 codes against this text; it invents no other signal.
- **`candidate.json` keys** are exactly `RealGameCandidate.kt:157 candidateJson` — the verb calls
  it and `writeCandidate` (`:259`, which hardcodes `confirmed: false`). New content only inside
  existing keys: `moves[].decider = "phone"`, `source = {"kind":"phone","game":<id>,"session":<sid>,
  "syncs":<n>,"offset_frames":<PHONE_FRAME_OFFSET>}`. `reviewed_plies` is never written here.
- **Time bridge, the ONE rule** (`PhoneClock`, 01): a ply's video time is the `video_sync` row
  nearest in `wallTsMs` to the move's `tsEpochMs`, plus the wall-clock difference (slope 1, the
  reasoning of `RecordedFrames.kt:49 videoNsAt`). `frame = round(videoS * fps) + PHONE_FRAME_OFFSET`,
  `fps` from the geometry scan (`ScannedGeometry.fps`, `GeometryScan.kt:52`). `PHONE_FRAME_OFFSET`
  is a `const val` in `PhoneCandidate.kt` whose value Phase 00 measured — 01 reads it from
  `STATUS.md`, never guesses.
- **Geometry** comes from the video, not the phone: the same scan `prepareLabel` runs
  (`LabelVerb.kt:102-124`, `scanGeometry` at `:125`, made `internal`), without lens. The phone's
  `log.jsonl` corners are in its analysis frame, not the video's.
- **Wording** of the step lives in `chain-actions.tsx` `STEP` (02): label "Züge vom Handy übernehmen",
  what "Die am Handy erkannte Zugfolge wird mit ihren Video-Zeiten übernommen — Sekunden statt Minuten.",
  hint "schreibt candidate.json aus files/games + timeline.jsonl". The replay button keeps its text.

## Parallel hazards

- 01 and 02 share no file. Both gate in their worktree; the orchestrator re-runs the full gate.
- Nothing crosses a boundary untyped: Kotlin reads `StoredGame` through `GameRecord.kt`'s own
  decoder (`GAMES_JSON`, `:14`; find the reader via `grep -n "decodeFromJsonElement(StoredGame" GameRecord.kt`),
  TypeScript reads `candidate.json` as it does today.
- One integration test per boundary: 01's `PhoneCandidateTest` runs the real verb on a fixture
  bundle; 02's `jobs.test.ts` case runs `phoneArgs` and the refusal parsing; 03 runs the real verb
  on real bundles.

## Definition of done (per phase)

Steps committed as named, phase tests green once, lint clean on touched files, `STATUS.md` row
updated with date, commits, counts, and the exact next step.
