# Phase 02 — Platform: the `phone-record` step before the replay, and an honest `hasSession`

## Why

`nextStep` (`chain.ts:118-129`) offers `label` (the replay) for every bundle without a candidate. A
bundle with a record naming its session can be answered in seconds by `phone-candidate`; the replay
becomes the fallback when that step refused. `hasSession` (field `:34`, check `:87`) takes any
`log.jsonl` in `gameDir(name)` for an export, but `2026-08-30-14-33-02` carries the phone's own commit
log there. And `videoOf` (`:52-64`) never looks at a mirrored top-level `video.mp4`.

## Design (decided — do not redesign)

`lib/chain.ts`:

```ts
export type ChainStep = "phone-record" | "label" | "confirm" | "export" | "matte" | "model-read" | "labeln";
// ChainState gains
hasPhoneRecord: boolean;   // a files/games/*.json (not index.json) whose sessionId is the one dir under files/sessions
// hasSession: log.jsonl exists AND its first non-empty line parses with a "board" key
//   (realgames.write_board rows); the phone's commit log has "frame" and no "board".
// videoOf: after the session dirs, also gameDir(name)/video.mp4 (the mirrored copy).
```

`nextStep`: `if (!state.hasCandidate) return state.hasPhoneRecord ? "phone-record" : "label";` — the
rest unchanged. A failed `phone-record` job leaves the state as it is; the card offers the replay.

`lib/jobs.ts`: `JobKind` (`:24`) gains `"phone-record"`; `export function phoneArgs(recordingDir: string):
string[]` → `["phone-candidate", recordingDir]`; `export function refusalOf(log: string): string | null`
→ the LAST line starting with `refused: `, without the prefix, else null; `enqueuePhoneRecord(name)`
mirrors `enqueueLabel` (`:325-334`, same queue, same `guard`); `runPhoneRecord(job)` mirrors `runLabel`
(`:569-`): the missing-binary refusal as there, `runDesktop(binary, phoneArgs(gameDir(name)), running, log)`
with log `<name>.phone-record.log`; exit ≠ 0 → `failed`, `reason = refusalOf(logText) ?? "exit <code>"`;
exit 0 → `done`, `candidate: name`.

`lib/chain-run.ts`: the admit list (`:14`) gains `"phone-record"`; the 409 (`:13`, `step !== state.step`)
also passes when `step === "label" && !state.hasCandidate`; the heavy lock (`:30`,
`claimHeavyLock(state.step, name)`) is claimed with the REQUESTED step; the dispatch (`:36`) branches on
the requested step: `"label"` → `enqueueLabel`, `"phone-record"` → `enqueuePhoneRecord`, else
`enqueueChain(name, step)` with `step` narrowed to the kinds `enqueueChain` accepts. `jobs.ts` imports
`gameDir` from `@/lib/data` (it does not today); `runPhoneRecord` sets `running.command` like `runLabel`
(`jobs.ts:605`); `chain-run.test.ts:14-17` mocks `@/lib/jobs` with a literal that gains `enqueuePhoneRecord`.

`app/chain-actions.tsx`: `STEP["phone-record"]` with entry.md's wording; when
`job?.kind === "phone-record" && job.state === "failed"`, a second button "Züge am PC neu erkennen" posts
`{ step: "label" }` — the `lensRefused` pattern (`:305`). Nothing else on the card changes.

## Steps

1. `feat(platform): hasSession means an exported log, and videoOf sees the mirrored video` + tests.
2. `feat(platform): job kind phone-record runs desktop phone-candidate` + tests.
3. `feat(platform): the chain offers Züge vom Handy übernehmen before the replay` + tests.

## Tests

Append to `lib/chain.test.ts` (helpers `:16-25`; `:85-87` writes a `.pgn` under `files/games` — the new
test writes a `.json` there with `{"sessionId": "<the fixture's session dir name>"}`):

- `reads a bundle with a record naming its session as 'phone-record', without one as 'label'`.
- `the phone's own log.jsonl is not an exported session` — a row with `frame` and no `board` → false; with `board` → true.
- `a mirrored top-level video.mp4 counts when no session dir has one`.

Append to `lib/jobs.test.ts` (`labelArgs` is tested at `:72`):

- `phoneArgs names the verb and the recording dir`.
- `refusalOf takes the last refused line and ignores everything else` — interleaved stdout/stderr text.

Append to `lib/chain-run.test.ts` (it drives `startStep`, `:19/:47/:55`):

- `label is admitted while the disk says phone-record, and claims the lock as label`.

Commands (from `platform/app`): `npx prettier --write <files>`; `npx eslint <files>`;
`npx vitest run lib/chain.test.ts lib/jobs.test.ts lib/chain-run.test.ts lib/comment-budget.test.ts`;
`npx tsc --noEmit -p .`.

## Acceptance

- All commands exit 0; six new tests pass; the three files' previous counts unchanged.
- `grep -c '"phone-record"' platform/app/lib/chain.ts platform/app/lib/jobs.ts platform/app/lib/chain-run.ts platform/app/app/chain-actions.tsx` → ≥ 1 in each.
- `grep -c '"board"' platform/app/lib/chain.ts` ≥ 1 (0 today).

## Do NOT

- Do not touch Kotlin, `docs/`, `README.md`, `TODO.md` (03) or the confirm page.
- Do not auto-confirm: `reviewed_plies` is written only by the confirm page's API.
