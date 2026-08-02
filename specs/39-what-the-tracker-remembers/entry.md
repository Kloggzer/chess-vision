# 39 — What the tracker remembers

> **Status:** `todo`. Three phases, sequential in value but independent in files. 00 first — it is
> the only one that produces evidence, and the two big ideas this pack **refuses** to spec are
> gated behind it.

## The question this pack answers

> *"Apart from undo, do other functions base their decisions on previous decisions? Would that raise
> quality?"*

**Answer: almost nothing does, and for the most part it should stay that way.** The engine is greedy
per observation with very short memory, and the assessment behind this pack (see "What was examined
and refused" below) found that most ways of adding memory here make the tracker *confidently wrong
for longer* — which is the failure it already has, not a cure for it.

Three things survived that review. Two of them are not memory at all; they are safeguards that the
code claims to have and does not.

## The three findings

### 1. The recovery confirmer is single-shot in the shipped configuration

`CnnTick.kt:222-223` says, in its own words:

> Voting, not single-shot: the legacy port pushed a whole sequence onto the board on ONE glance
> (specs/12 D6). The recovery confirmer is what makes it multi-observation evidence.

It is not true with a CNN attached. `TrackerConfig.confirmFrames(cnnOn = true)` is
`CONFIRM_FRAMES_CNN = 1` (`api/TrackerConfig.kt:76`, `:92`); `EngineState.syncConfirmWindow`
(`EngineState.kt:309-315`) rebuilds `recoveryConfirmer = Confirmer(1)`; and `Confirmer.feed`
returns `streak >= 1` on the first key it ever sees (`Confirmer.kt:26-28`).
`EngineStateBuffersTest.kt:111` asserts exactly this today.

**A four-ply rewrite of the game commits on one glance.** The note at `CnnTick.kt:225`
(`"CNN recovery checks … (n/1)"`) is unreachable. Phase 02.

### 2. The standoff cannot escalate, by construction

The terminal state of 2026-08-02 — `no_legal_move` / `cnn_desync` forever at `cnnAgree = 0.980` —
has a named mechanism:

- `desyncEvidence` (`Alarm.kt:68-86`) escalates only when `guessIllegalMove` returns non-null;
- `guessIllegalMove` (`core-cnn/AlarmGuess.kt:46-48`) returns non-null only for **exactly one**
  observed-empty-expected-occupied square **and exactly one** observed-occupied-expected-empty
  square;
- at agreement 0.980 over ~60 confident squares the conflict set is about **one** square, so the
  shape is 1-and-0 or 0-and-1 — never 1-and-1.

So `desyncObs` counts up without bound, `desyncSince` is formatted into a note (`Alarm.kt:81-85`)
and read by nothing, and **there is no path out that does not involve a human noticing.** The user
did not notice; the user's words were *"I tried to recover but it's impossible."* Phase 01.

### 3. The evidence needed to settle the big questions is one field short

The rotating NDJSON file (`docs/diagnostics.md`) already carries every committed and refused
decision. Two holes make the two most valuable queries unreliable:

- **An undo leaves no row.** `clearAlarm` returns early when no alarm is latched
  (`api/TrackerEngine.kt:738`), so an ordinary undo writes nothing; and when an alarm *was* latched
  the row is written at `ply = history.size` **before** the pops and then dropped by the trim at
  `:262-263`. Recorded as "opened, not fixed" in `specs/37-a-way-back/STATUS.md:38-43`.
- **A repeated identical rejection is invisible.** `recordRejection` folds it and returns without
  calling the sink (`DecisionLog.kt:131`), so a two-minute standoff and a single hiccup produce the
  same file. The 68 + 65 rows of the incident are 133 *alternations* between two stuck reasons, not
  133 frames — the non-alternating case leaves nothing at all.

Phase 00 closes both. Together they make one label harvestable for free: **was this recovery bridge
true?** A bridge followed by ordinary diff commits was true; a bridge followed by an undo row was
not. That label is the single missing input to the open question `specs/37-a-way-back/STATUS.md:88`
records as "the valuable question", and nothing else in this pack or outside it produces it.

## What was examined and refused

Recorded so nobody re-proposes them without new evidence.

| Idea | Verdict |
|---|---|
| Beam / multi-hypothesis over positions | Already designed and parked: `specs/10-multi-hypothesis/DIRECTION.md`. Structurally the right tool, and it does **not** address these failures — its own text says "Does NOT fix illegal moves: no branch contains an illegal move." The 2026-08-02 bridge was legal. Gate on phase 00's data. |
| HMM / Viterbi smoothing over the position chain | Bad match **here**. Smoothing assumes conditionally independent observation noise; this model's errors are systematic per square (`CLAUDE.md`: "f4 misread in 90 of 186 observations"). Correlated noise makes a smoother *more* confident in the wrong answer over time. |
| Lower a gate when a candidate keeps failing it | Refused. It manufactures phantoms, and phantoms are the veto metric (`CLAUDE.md`). |
| Suppress a chronically-conflicting square in the recovery channel | Plausible — it is the exact fabrication driver, since `cnnMarginSquares = 1` means a bridge needs to explain **one** more square than the null hypothesis (`core-cnn/DeepSearch.kt:62-66`, and the null hypothesis *is* seeded at `:41-42`). But the same square is also the only evidence that a real desync happened, so suppressing it cuts both ways. **Undecidable without phase 00's query 4.** |
| Feed the believed position into the CNN (logit prior / extra input channels / two-crop change detection) | All three improve the *verify* path and none helps *recovery*, which is where 13 of 21 commits and all of the failures were. Variants 1 and 2 actively hurt it: the prior is by construction wrong exactly when recovery runs. See the assessment; not this pack's scope. |

## What this pack must not do

- **Do not bound `recoveryMaxPlies`, and do not make a legitimate 3–4 ply bridge harder to derive.**
  Settled by the user, `specs/37-a-way-back/STATUS.md:59-70`. Phase 02 adds one observation of
  latency to the recovery path and changes nothing about which sequences are derivable.
- **Do not add a second memory of a human rejection.** `EngineState.takenBack` is it
  (`TakenBack.kt`), it shipped on 2026-08-02, and it has not been through a live game yet.
- **Do not touch the CNN, the model assets, or the training pipeline.**

## Ownership

The table overrides any phase file that disagrees.

| File | Owned by | May be extended by | Notes |
|---|---|---|---|
| `core-engine/DecisionLog.kt` | **00** | — | the fold, and only the fold |
| `core-engine/api/DebugPayload.kt` (`DebugDecision`) | **00** | — | one new field; `DiagnosticsRecordsTest` pins the key set |
| `app/.../diagnostics/DiagnosticsRecords.kt` | **00** | — | mirror of the above; hand-written on purpose |
| `core-engine/api/TrackerEngine.kt` | **00** (`undo` only) | **01** (nothing) | 00 adds the post-trim user row; no other function |
| `docs/diagnostics.md` | **00** | — | the query section |
| `core-engine/Alarm.kt` | **01** | — | `desyncEvidence` only |
| `core-engine/api/TrackerConfig.kt` | **01** | — | one new knob |
| `app/.../settings/ConfigKnobs.kt`, `ui/settings/KnobCatalog.kt` | **01** | — | the same knob, both tables |
| `core-engine/EngineState.kt` | **02** | — | `recoveryConfirmer` construction only |
| `core-engine/CnnTick.kt` | **02** | — | the note at `:225` only |
| `core-engine/.../EngineStateBuffersTest.kt` | **02** | — | `:111` asserts the current single-shot behaviour and must be inverted |

00, 01 and 02 share no source file and may run **in parallel**. 00 is worth landing first anyway:
it is the one that produces evidence, and the other two change behaviour it would measure.

## Protocol

- `:core-engine` may depend only on chesslib and the Kotlin stdlib; single-threaded; no wall clock.
  `ClasspathPurityTest.kt:25` bans `\bsynchronized\b|\bAtomic[A-Z]|\bMutex\b|@Volatile` by regex and
  must pass unchanged. **No library answer is available inside the engine** — everything here is
  hand-written by necessity, which is also why every phase is small.
- The engine has **no clock**: `nowS` comes from `FrameInput.timestampMs` (`EngineState.kt:36`).
  Any "how long has this gone on" must be expressed in `nowS` deltas or in observation counts, never
  in wall time.
- `android/**/bin/` is a stale gitignored copy. Exclude it from every grep; never edit a file there.
- Gate: `gradlew.bat :app:ktlintCheck :app:detekt :app:testDebugUnitTest :core-engine:test
  :core-geometry:test --rerun-tasks`. Gradle reports green on stale tasks; the flag is not optional.
  `:core-engine:detekt` is **red before this pack** on two pre-existing `MagicNumber` hits in
  `DecisionLog.toLogLine` — do not fix them here (`specs/35-one-seam-per-concern` phase 00 moves that
  function) and do not add a third.
- Restructure to satisfy detekt. Never `@Suppress`, never a baseline entry. Use `ktlintFormat` for
  style rather than hand-editing.
- Branch `feat-what-the-tracker-remembers`. One conventional commit per numbered step. Stage
  explicitly; never `git add -A` across phases.
- **Every phase changes engine runtime behaviour.** Each must state what it does to a game that is
  currently working, and every change must be covered by a test **proven red first** — run the new
  test against the unmodified behaviour and record in `STATUS.md` that it failed.
- Trust the code over this spec. Record every discrepancy in `STATUS.md`; if blocked, STOP and write
  the blocker rather than guessing.
