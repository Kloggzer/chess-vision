# 54 — A screen anyone can read

> **Status:** `todo`. Seven files, one branch each. 00 lands alone (it owns the enums every
> later phase renders), then 01 → 02 → 03 on the tracking screen; 04 is two disjoint
> assignments that may run in parallel with each other, and 04-B may also run beside 01–03;
> 05 is last. **06 (the logo) is independent of all of them** and only collides with 04-A.

The user, 2026-08-12: *"ich möchte dass du die tracking view überarbeitest: das soll mehr
richtung normalos gehen"* — and, over the review of the sketch: *"[Accept CNN] ist noch nicht
gut genug und fliegt daher erstmal raus"*, *"mit cameralight und camera view direkt in der
ersten view"*, *"das spiel beenden soll immer speichern, ggf fragen ob aufgegeben oder
unentschieden etc"*, *"mache bitte gleich mit localization"*.

## What is wrong today

specs/49 fixed the LAYOUT of this screen. What it did not touch is what the screen says, and
that is still an instrument talking to its builder:

| On screen now | Anchor | Why a guest cannot use it |
|---|---|---|
| `WAITING` / `MOVING` | `StatusUiModel.kt:254` | pipeline states, not game states |
| `14.8 fps` + `camera 30` | `StatusUiModel.kt:289,296` | the most prominent number on the screen, and inert |
| `POSITION LOST` | `StatusUiModel.kt:133` | an accusation with no object |
| `Accept CNN position` | `AlarmCard.kt:105` | names an implementation, and see below |
| `Board disagrees on: a7, c7, b8 (+3)` | `AlarmCard.kt:129` | algebraic notation as an error message |
| `New baseline` | `AlarmCard.kt:108` | a term from the diff algorithm |
| nowhere | — | **whose turn it is, and which move number** |

And two behaviours:

- **Ending a game can throw it away.** `TrackerModal.DISCARDING` (`TrackingScreen.kt:96`) is a
  full destructive branch on the screen you play in front of.
- **The result is guessed from the position.** `resultFromFen` (`GameRecord.kt:207`) returns
  `*` for anything that is not mate or stalemate, so every normally-ended game is stored as
  "Game in progress" (`GameDashboard.kt:6`). A resignation or an agreed draw cannot be
  expressed at all.

**`Accept CNN position` is removed, not renamed.** It cannot be honest from this screen:
`onAcceptCnnRequested` (`TrackingViewModel.kt:188`) builds its preview from
`status.debug?.cnnReads`, and that payload is only assembled while the DEBUG screen is
composed (`DebugSession.setDebugEnabled`, `DebugSession.kt:32`). From the tracking screen
`AcceptCnnPreview.complete` is therefore false and the dialog lists only what the app
*believes* would change — an irreversible primary action with an unknown outcome. Phase 02
moves it behind the debug screen, where the reads it needs exist.

## Localization: the resource path exists and is dead

`app/src/main/res/values/strings.xml` holds **171 entries**; exactly **three** are referenced
anywhere (`app_name`, `notif_channel`, `notif_title` — `ChesslabApp.kt:40`,
`TrackerNotification.kt:86`). Everything else describes UI that was deleted (`action_reset_game`,
`debug_card`, `alarm_banner`). The whole Compose surface hardcodes English.

Measured 2026-08-12, capitalised string literals per package under `ui/`
(`grep -rhoE '"[A-Z][^"]{2,}"' <pkg> --include=*.kt | wc -l`):

| Package | Literals | Localized by this pack |
|---|---|---|
| `ui/tracking` | 70 | phases 01, 02, 03 |
| `ui/review` | 136 | phase 04-B |
| `ui/settings` minus `KnobCatalog.kt` | 88 | phase 04-B |
| `ui/camera` | 31 | phase 04-A |
| `ui/games` | 24 | phase 04-A |
| `ui/home` + `ui/*.kt` (Chrome) | 33 | phase 04-A |
| `ui/analysis` | 16 | phase 04-B |
| `ui/debug` | 20 | **no** |
| `ui/settings/KnobCatalog.kt` | 54 | **no** |

`ui/debug/` and the tuning knobs stay English on purpose: behind the developer door
(specs/51) the vocabulary IS English — `census threshold`, `z threshold` — and translating it
makes it unfindable.

## The structural consequence, and why 00 lands alone

Three pure model functions currently return English:

```kotlin
StatusUiModel.kt:254  private fun stateLabel(state: String): String = "WAITING" | "MOVING" | …
UndoLabel.kt:39       fun undoLabel(lastCommit: List<String>): String = "Undo" | "Undo 4 moves"
GameDashboard.kt:6    internal fun resultHeadline(result: String): String = "White wins" | …
```

`StatusUiModel.kt`'s own KDoc says *"No Compose type appears in this file on purpose"*. This
pack sharpens that rule:

> **The pure UI models carry no human-readable string. They return enums and counts; the
> Compose layer resolves them against resources.**

Phase 00 does exactly that and nothing else, because every later phase renders those enums.

## Dependency table

| Phase | Concern | Depends on | Parallel? |
|---|---|---|---|
| 00 | the models speak no language — enums, pruned `strings.xml`, the guard | — | **lands alone** |
| 01 | the game ends with a result | 00 | after 00 |
| 02 | the screen reads like a game (the good path) | 01 (same file) | after 01 |
| 03 | when it goes wrong, it says what to do (the bad path) | 02 (same file) | after 02 |
| 04-A | `ui/home`, `ui/games`, `ui/camera`, `ui/*.kt` against resources | 00, 01 (`ui/games`) | ∥ 04-B |
| 04-B | `ui/review`, `ui/analysis`, `ui/settings` against resources | 00 | ∥ 04-A, **and ∥ 01–03** |
| 05 | Deutsch | all | last |
| 06 | the app has a face — logo, splash, Home | — | any time, **never beside 04-A** |

Both 04 assignments are described in the single file
`04-every-player-facing-string-is-a-resource.md`; the recipe is identical and only the scope
differs.

The tracking screen is one file, so 01 → 02 → 03 is a chain, not a preference. The split is by
concern: 01 is how a game **ends**, 02 is the **nominal** screen, 03 is what it says when the
board and the app **disagree**.

## Shared contracts (authoritative — a phase file that disagrees is wrong)

**The enums, owned by phase 00.** A phase that needs a case 00 does not emit records a gap in
STATUS.md and never invents one.

```kotlin
// ui/tracking/StatusUiModel.kt — replaces stateText: String
enum class TrackerLabel { LIVE, HAND_OVER_BOARD, POSITION_LOST, CAMERA_OFF, NOT_TRACKING }

// games/GameRecord.kt — the PGN result tag, typed
enum class GameResult(val tag: String) {
    WHITE("1-0"),
    BLACK("0-1"),
    DRAW("1/2-1/2"),
    UNFINISHED("*"),
    ;

    companion object {
        fun of(tag: String): GameResult = entries.firstOrNull { it.tag == tag } ?: UNFINISHED
    }
}
```

`StoredGame.result` stays a `String` on disk (`GameRecord.kt:57`) — the JSON format does not
change and no migration is needed. `GameResult` is the in-memory type at every boundary that
asks a human.

**String resource naming.** `<screen>_<thing>`, lowercase, no abbreviations:
`tracking_state_live`, `alarm_headline`, `endgame_result_white`, `games_result_draw`. Plurals
go through `<plurals name="tracking_take_back">` with `%1$d`, never through string
concatenation — German needs a different plural rule than English and a hand-built
`"Undo $n moves"` cannot express it.

**One authority per string.** `values/strings.xml` is the only place a user-visible English
word is written after the phase that owns it has landed. `values-de/strings.xml` is written by
phase 04 alone and adds **no keys** — a key missing there is a gap for 04's report, not an
invitation to invent one in English.

**Locale discipline.** `Locale.ROOT` stays mandatory for everything written to disk or the
wire — PGN, `DecisionLog`, export filenames, `%.1f` in diagnostics. The user locale is for
display only. Grep before touching a `String.format`: `grep -rn "Locale.ROOT" android/`.

## Protocol for implementing agents

- Branch `specs-54-<phase>` off `main`. Conventional commits exactly as named in each phase's
  Steps, one concern per commit. Stage explicitly — never `git add -A`.
- Trust the code over this spec; record every discrepancy in `STATUS.md`. If blocked, STOP and
  write the blocker rather than widening scope.
- **Tests once, targeted.** From `android/`:
  `gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.ui.tracking.*"`, or the
  module's own `:tracker-runtime:test`. The full gate line is the orchestrator's.
- **Gradle reports GREEN on stale tasks.** For the phase's final run pass `--rerun-tasks`; an
  assertion you changed can sit `UP-TO-DATE` behind an unchanged classpath (CLAUDE.md).
- **Formatters own style.** `gradlew.bat :app:ktlintFormat` — never hand-edit a style finding.
- Lint scoped to the modules you touched, once, at the end: `:app:ktlintCheck :app:detekt`,
  `:tracker-runtime:ktlintCheck :tracker-runtime:detekt`. **Zero new findings, and no
  `@Suppress` or baseline entry to get there** — fix it or record a blocker.
- No new dependencies. Nothing in this pack needs one; if you think it does, that is a blocker.
- **The shared tree will not compile mid-phase** if another agent is mid-file. Gate in an
  isolated copy (`git worktree` at HEAD plus your own files) and say so in your report. Never
  edit another phase's file to go green.

## Repo rules these phases will actually hit

- **`ui/` may not carry a bare `.dp` literal** — `DpLiteralGuardTest` enforces it and the scale
  is twelve tokens in `ui/theme/Dimens.kt`. A new component size is a named `private val` in
  the file that draws it.
- **`ChesslabScaffold` owns the screen's side margin.** No screen sets its own.
- **Icon-only controls need a `contentDescription`** — `scripts/android-ui.ps1 tap-text` /
  `tap-description` read Compose semantics, so a control without one is unreachable for every
  agent and smoke test. Phase 02 adds two icon buttons; both get one, and both keep a TEXT
  twin in the `⋯` menu.
- **A label that changes wording breaks text-driven control.** `scripts/android-smoke.ps1:67-69`
  waits for the literal `Start tracking` / `Stop tracking`. Those two strings are **frozen** by
  this pack in English; anything else a script matches on changes together with the script, in
  the same commit.
- **Never `gradlew :app:installEmulator`** — it installs on every attached emulator, including
  another agent's. Use `scripts/android-emulator.ps1 -Avd <yours> -Port <yours>`.
- **Never install on the PHONE.** It has twice destroyed the stored games. Everything in this
  pack is decidable on the emulator.
- detekt's unused rules only see `private` scope — an `internal` function nobody calls is
  invisible to the gate. Delete what you orphan; do not leave it for the linter.

## Ownership registry (overrides any phase file that disagrees)

| File | Owned by | May be extended by | Notes |
|---|---|---|---|
| `ui/tracking/StatusUiModel.kt` | 00 | 02, 03 | 00 makes it string-free; 02 adds turn/move; 03 replaces `infoLine` |
| `ui/tracking/UndoLabel.kt` | 00 | — | `undoLabel` → `undoCount` |
| `ui/review/GameDashboard.kt` | 00 (`resultHeadline` only) | 04-B | 00 touches ONE function here |
| `games/GameRecord.kt` | 00 (`GameResult`) | 01 | enum declared by 00, wired by 01 |
| `games/LiveGame.kt`, `GameSessionController.kt`, `GameStore.kt` | 01 | — | `rename` → `updateDetails` |
| `ui/tracking/TrackingScreen.kt` | 01 | 02, 03 | the chain's reason |
| `ui/tracking/LastMoves.kt` (new) | 02 | — | `ui/review/MoveList.kt` is NOT touched |
| `res/drawable/ic_camera_light.xml`, `ic_camera_view.xml` | 02 | — | hand-authored vectors, no icon dependency |
| `ui/tracking/AlarmCard.kt`, `BoardCanvas.kt` | 03 | — | |
| `ui/tracking/AcceptCnnDialog.kt` → `ui/debug/` | 03 | — | moved, not deleted |
| `core-engine/api/PlayerNote.kt` (new), `TrackerStatus.kt` | 03 | — | additive field with a default only |
| `tracker-runtime/service/StatusPublisher.kt` | 03 | — | `resolveNote` unchanged |
| `service/TrackerNotification.kt` | 03 | — | wording must match the screen |
| `ui/debug/DebugSession.kt`, `DebugSessionBinding.kt`, `DebugViewModel.kt`, `CnnReadsPanel.kt` | 03 | — | never localized |
| `ui/games/**` | 01 | 04-A | 01 adds the result editor, 04-A converts the package |
| `ui/home/HomeScreen.kt` | 04-A | 06 | **06 and 04-A must not run concurrently** |
| `res/values/strings.xml` | 00 (prune + convention) | 01, 02, 03, 04-A, 04-B | append-only after 00 |
| `res/values-de/strings.xml` | 05 | — | adds no keys |
| `res/xml/locales_config.xml`, `AndroidManifest.xml` | 05 | 06 (`android:icon`) | different attributes, same file — sequence them |
| `res/mipmap-anydpi-v26/**`, `ic_launcher_*`, `values-v31/themes.xml` | 06 | — | |
| `app/src/test/.../ui/theme/StringLiteralGuardTest.kt` | 00 | 04-A, 04-B | each adds its packages to the guard's list |
| `app/src/test/.../StringResourceParityTest.kt` (new) | 05 | — | |
| `scripts/android-smoke.ps1` | 05 | — | locale assertion only |

## Definition of done, and the gate

A phase is done when its Acceptance criteria hold, its targeted tests ran once green
(`--rerun-tasks` on the final run), its modules lint clean with no new suppressions, and
`STATUS.md` carries its session-log entry.

The **orchestrator** — not a phase agent — runs the full gate on the merged tree:

```
gradlew.bat :app:ktlintCheck :app:detekt :core-engine:detekt :core-geometry:detekt :core-cnn:detekt :tracker-runtime:detekt :tracker-runtime:ktlintCheck :desktop:detekt :desktop:ktlintCheck :core-engine:test :core-geometry:test :core-cnn:test :tracker-runtime:test :app:testDebugUnitTest --rerun-tasks
```

plus one emulator smoke run per agent AVD:
`.\scripts\android-emulator.ps1 -Avd Chesslab_Agent1 -Port 5554 -Clip blender-opening -RestartExisting`,
which must print `Camera feed confirmed` — not merely reach `Stop tracking`.
