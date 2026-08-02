# 02 — The vote that was never taken

> **State:** `todo`. Owns `core-engine/EngineState.kt` (`recoveryConfirmer` construction only),
> `core-engine/CnnTick.kt` (the note at `:225` only), and
> `core-engine/.../EngineStateBuffersTest.kt`. Parallel-safe with 00 and 01.

## Why

`CnnTick.kt:222-223` states a safeguard the code does not have:

> Voting, not single-shot: the legacy port pushed a whole sequence onto the board on ONE glance
> (specs/12 D6). The recovery confirmer is what makes it multi-observation evidence.

Trace it with the CNN attached, which is every shipped configuration:

| | |
|---|---|
| `TrackerConfig.confirmFrames(cnnOn = true)` | `CONFIRM_FRAMES_CNN = 1` (`api/TrackerConfig.kt:76`, `:92`) |
| `EngineState.confirmFrames` | `config.confirmFrames(cnnOn)` (`EngineState.kt:386`) |
| `syncConfirmWindow` | `recoveryConfirmer = Confirmer(1)` (`EngineState.kt:309-315`) |
| `Confirmer.feed(key)` | `streak = 1`; `return streak >= 1` → **true on the first key** (`Confirmer.kt:26-28`) |

`EngineStateBuffersTest.kt:111` asserts it in so many words: *"the recovery confirmer moves with it"*
— one feed, `true`.

**So a four-ply rewrite of the game commits on one glance, which is precisely the defect the
confirmer was added to prevent.** The note at `CnnTick.kt:225` — `"CNN recovery checks $key…
(n/$confirmFrames)"` — is unreachable, and it prints the *wrong* threshold anyway: `confirmFrames` is
the diff channel's window, not the recovery confirmer's.

## What this does NOT fix, said first

**It would not have prevented the incident of 2026-08-02.** That bridge was derived identically three
times over — a *stable* wrong read, which is exactly what a domain gap produces
(`specs/37-a-way-back/STATUS.md:101-104`). Two votes would have delayed each re-commit by one
observation and changed nothing else. `EngineState.takenBack` is what addresses that case and it
shipped on 2026-08-02.

What this fixes is the *unstable* derivation: a beam search whose answer changes between two glances
currently commits whichever answer arrived first. `core-cnn/DeepSearch.kt:62-66` accepts a sequence
that beats the runner-up — the null hypothesis included, seeded at `:41-42` — by
`cnnMarginSquares = 1`. **One square.** A single chronically-misread square is one square
(`CLAUDE.md`: f4 misread in 90 of 186 observations). A derivation resting on that margin is exactly
the derivation that flips between observations, and today nothing looks twice.

This phase is worth doing because rewriting four plies of a game on one glance is indefensible on its
face, not because it would have saved that night. Do not oversell it in `STATUS.md`.

## Design (decided — do not redesign)

`EngineState.kt`: the recovery confirmer gets its own floor, independent of `confirmFrames`.

```kotlin
/**
 * The recovery confirmer needs at least this many observations, whatever `confirmFrames` says.
 *
 * `confirmFrames(cnnOn = true)` is 1, so the confirmer this class documents as "what makes it
 * multi-observation evidence" (`CnnTick.kt:222`) confirmed on the FIRST glance in every shipped
 * configuration — a four-ply rewrite of the game on one look at the board. The diff channel's 1 is
 * correct for what it gates (a candidate that already survived the LL floor, the ambiguity margin
 * and the motion gate); a recovery has survived none of those, because being stuck is its trigger.
 */
private const val RECOVERY_MIN_VOTES = 2
```

Both construction sites take the floor:

- `EngineState.kt:299` → `Confirmer(maxOf(RECOVERY_MIN_VOTES, confirmWindow))`
- `syncConfirmWindow` `EngineState.kt:314` → `recoveryConfirmer = Confirmer(maxOf(RECOVERY_MIN_VOTES, want))`

Expose the effective threshold so the note can print it:
`internal val recoveryVotes: Int get() = maxOf(RECOVERY_MIN_VOTES, confirmFrames)`.

`CnnTick.kt:225` becomes:

```kotlin
note = "CNN recovery checks $key… (${recoveryConfirmer.count}/$recoveryVotes)"
```

`syncConfirmWindow`'s early return (`EngineState.kt:311`) keys on `confirmFrames` moving, which is
still correct: the floor is a pure function of it.

## The risk that must be tested, not assumed

**The recovery confirmer is reset from seven places.** If any of them fires between two observations
while the tracker is stuck, the streak can never reach 2 and this change **silently disables
recovery** — a catastrophic regression that would look like a hardening. That is the exact failure
mode `specs/37-a-way-back/03-…md:60-75` warns about for the two levers it refused.

The resets: `CnnTick.kt:49` (fen moved), `:78` (inconclusive), `:179` (`matchOk`), `:203` (stable
mismatch with no moves), `:218` (take-back veto), `:234` (conflicts unresolved); `Guards.clearStuck`
(`Guards.kt:77`), which is called from `Commit.finishCommit` (`:188`), `Guards.detectGuards`
(`:33`), `CnnTick.onMatchOk` (`:185`), `commitRecovery` (`:292`) and `maybePatchAnomaly`
(`AnomalyPatcher.kt:84`); `Dispatch.kt:72` (a pending candidate raised); `VerifyPair.kt:162`;
`VerifySingle.kt:274` (a rejection).

Two of those are live during a stuck board and must be checked by hand before writing code:

- **`AnomalyPatcher.kt:84`** — `clearStuck()` when every hot square was patched. Runs on the same
  stuck frames recovery is waiting on.
- **`VerifySingle.reject` (`:274`)** — a rejected verify. Only reachable with a pending candidate,
  and `detectGuards` (`Guards.kt:21`) refuses to generate one while `pending != null`; state in
  `STATUS.md` whether it can interleave.

**If the streak provably cannot reach 2 in the stuck state, STOP and record it.** The fix is then to
give the recovery confirmer its own reset set, which is a different and larger phase.

## What this does to a game that is currently working

A recovery commits one observation later. When stuck, `evaluationDue` (`CnnTick.kt:61-66`) gates on
`cnnCooldownS = 2.0`, so that is **+2 s on the rebuild path** — against a path that already waits out
`settleFrames` of stuck-ness plus the cooldown. Nothing about which sequences are *derivable*
changes: `recoveryMaxPlies` is untouched, `deriveMovesDeep` is untouched, and a legitimate 3–4 ply
bridge that reads the same twice commits exactly as before, two seconds later. That is the constraint
`specs/37-a-way-back/STATUS.md:59-70` sets and this phase stays inside it.

## Steps

1. `core-engine/EngineState.kt` — `RECOVERY_MIN_VOTES`, both construction sites, `recoveryVotes` —
   commit `fix(engine): a recovery is not decided by one glance`
2. `core-engine/CnnTick.kt` — the note prints the recovery confirmer's own threshold —
   commit `fix(engine): the recovery note counts the right votes`

## Tests (write, run once, targeted)

`core-engine/src/test/kotlin/com/chesslab/engine/EngineStateBuffersTest.kt`:

- **`confirmFramesFollowsTheCnnAttach` (`:98-112`) must be edited**: line 111 asserts the single-shot
  behaviour this phase removes. Invert it — one feed returns `false`, a second identical feed returns
  `true` — and keep the diff confirmer's assertion at `:110` unchanged. Note the edit in `STATUS.md`;
  a test that had to be inverted is a finding, not a chore.

`core-engine/src/test/kotlin/com/chesslab/engine/CnnTickTest.kt`:

- `aBridgeNeedsTwoObservations` — a stuck engine, an identity observation deriving a 3-ply bridge;
  assert nothing is committed after the first `cnnTick` and the note names the count, and that the
  identical observation on the next tick commits. **Prove it red first** — the first half must fail
  against the current single-shot behaviour.
- `aBridgeThatChangesBetweenGlancesNeverCommits` — two observations deriving different sequences;
  assert no commit at all. This is the case the phase actually defends.
- `theStreakSurvivesTheStuckFramesBetweenObservations` — drive real frames between the two
  observations so the whole stuck-state path runs (`markStuck`, `maybePatchAnomaly`, `detectGuards`);
  assert the second observation still commits. **This is the test that catches the silent-disable
  risk above and it is the acceptance criterion of the phase.**

```
gradlew.bat :core-engine:test --tests "com.chesslab.engine.EngineStateBuffersTest" --tests "com.chesslab.engine.CnnTickTest" --rerun-tasks
```

Then the clip suite, because it is the only end-to-end evidence recovery still works:

```
gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.sim.*" --rerun-tasks
```

Report the clip results explicitly. **A clip that used to commit and now stalls is a blocker, not a
tuning problem.**

## Acceptance criteria

- `grep -n "RECOVERY_MIN_VOTES" android/core-engine/src/main/kotlin/com/chesslab/engine/EngineState.kt`
  hits three times (the constant and both construction sites).
- `grep -n "confirmFrames" android/core-engine/src/main/kotlin/com/chesslab/engine/CnnTick.kt`
  returns nothing — the note reads `recoveryVotes`.
- `theStreakSurvivesTheStuckFramesBetweenObservations` passes.
- The sim clip suite has the same pass set as before the change, named clip by clip in `STATUS.md`.
- `recoveryMaxPlies`, `deriveMovesDeep`, `cnnMarginSquares` and `minAgreement` are untouched:
  `git diff --stat` names only `EngineState.kt`, `CnnTick.kt` and the two test files.

## Do NOT

- Do not raise `RECOVERY_MIN_VOTES` above 2. Each vote costs a `cnnCooldownS` on the path the user
  is already waiting on, and there is no evidence for a larger number.
- Do not change `confirmFrames`, `CONFIRM_FRAMES_CNN`, or the diff channel's confirmer. The 1 is
  correct there — that candidate cleared three gates a recovery clears none of.
- Do not touch `deriveMovesDeep`, `cnnMarginSquares`, `recoveryMaxPlies` or `resolvesAlarmConflicts`.
  Bounding what a recovery may derive is explicitly out (`entry.md`).
- Do not "fix" the reset sites by making `clearStuck` spare the recovery confirmer. That is a real
  candidate change and it belongs to its own phase with its own evidence; here it would be an
  unmeasured behaviour change smuggled in under a two-line fix.
