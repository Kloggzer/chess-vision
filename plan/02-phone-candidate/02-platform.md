# Phase 02 — Platform: the `phone` step before the replay, and an honest `hasSession`

## Why

`nextStep` (`chain.ts:117-128`) offers `label` (the replay) for every bundle without a candidate. A
bundle with a game record naming its session can be answered in seconds by `phone-candidate`; the
replay should be the fallback, offered when the phone step refused. And `hasSession` (`chain.ts:28`)
mistakes the phone's own `log.jsonl` for an export (Phase 00 audited it).

## Design (decided — do not redesign)

`lib/chain.ts`:

```ts
export type ChainStep = "phone" | "label" | "confirm" | "export" | "matte" | "model-read" | "labeln";
// ChainState gains:
hasPhoneGame: boolean;   // files/games/*.json with sessionId == the one dir under files/sessions
// hasSession becomes: log.jsonl exists AND its first non-empty line parses with a "board" key
// (an export row, realgames.write_board); the phone's commit log has "frame" but no "board".
```

`nextStep`: `if (!state.hasCandidate) return state.hasPhoneGame ? "phone" : "label";` — the rest unchanged.
A failed `phone` job does NOT change the state; the card offers the replay beside it (below).

`lib/jobs.ts`: `JobKind` gains `"phone"`; `export function phoneArgs(recordingDir: string): string[]`
→ `["phone-candidate", recordingDir]`; `enqueuePhone(name)` mirrors `enqueueLabel` (`:325-334`,
same queue, same `guard`); `runPhone(job)` mirrors `runLabel` (`:569-`): refuses like it when the
desktop binary is missing, runs `runDesktop(binary, phoneArgs(gameDir(name)), running, log)` with
log `<name>.phone.log`; exit 1 → state `failed`, `reason` = the stdout line starting with `refused:`
(read the log; fall back to `exit 1`). Exit 0 → `done`, `candidate: name`.

`lib/chain-run.ts`: `:14` admits `"phone"`; `:36` routes `phone` to `enqueuePhone`.

`app/chain-actions.tsx`: `STEP.phone` with the wording from entry.md (Artifact authority); when
`job?.kind === "phone" && job.state === "failed"`, render a second button "Züge am PC neu erkennen"
that posts `{ step: "label" }` — the same pattern as `lensRefused` (`chain-actions.tsx`, `lensRefused`).
`chain-run.ts` must then accept `label` while the disk's next step is `phone`: extend the 409 check
(`:14-30`, find via `grep -n "409" lib/chain-run.ts`) so `label` is allowed whenever `hasCandidate`
is false. Nothing else on the card changes.

## Steps

1. `feat(platform): hasSession means an exported log, not the phone's commit log` + tests.
2. `feat(platform): job kind phone runs desktop phone-candidate` + tests.
3. `feat(platform): the chain offers Züge vom Handy übernehmen before the replay` + tests.

## Tests

Append to `lib/chain.test.ts` (fixture helpers at `:13-24`, `:86-90`):

- `reads a bundle with a game record as 'phone', without one as 'label'` — write
  `files/games/<id>.json` with `{"sessionId":"20260813-121055", …}` (only `sessionId` matters here).
- `the phone's own log.jsonl is not an exported session` — top-level `log.jsonl` whose row has
  `frame` and no `board` → `hasSession false`; a row with `board` → `true`.
- `a failed phone job leaves the step at phone` (nextStep is pure: assert on state only).

Append to `lib/jobs.test.ts` (find via `ls platform/app/lib/*.test.ts`; if none tests `labelArgs`,
create `lib/jobs-phone.test.ts`):

- `phoneArgs names the verb and the recording dir` — `["phone-candidate", "<abs>"]`.
- `a refused: line becomes the job's reason` — feed a fake log text to the parser you extract for
  it (`export function refusalOf(log: string): string | null`).

Commands (from `platform/app`): `npx prettier --write <files>`; `npx eslint <files>`;
`npx vitest run lib/chain.test.ts lib/jobs-phone.test.ts` (or `lib/jobs.test.ts`); `npx tsc --noEmit -p .`;
`npx vitest run lib/comment-budget.test.ts`.

## Acceptance

- All commands exit 0; the five new tests pass; existing `chain.test.ts` count + 3.
- `grep -n '"phone"' platform/app/lib/chain.ts platform/app/lib/jobs.ts platform/app/lib/chain-run.ts platform/app/app/chain-actions.tsx` hits in all four.
- `grep -c "board" platform/app/lib/chain.ts` ≥ 1 (the `hasSession` rule).

## Do NOT

- Do not touch Kotlin, `docs/`, `README.md`, `TODO.md` (03) or the confirm page.
- Do not auto-confirm: `reviewed_plies` is written only by the confirm page's API.
