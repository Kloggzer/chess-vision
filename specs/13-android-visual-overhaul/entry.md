# 13 — Android visual overhaul (dark tournament) + games library & analysis

> Entry file for the spec pack. Every implementing agent reads THIS file completely,
> then exactly one phase file. `specs/08-android-tracker/entry.md` is the origin pack
> for the app; its **Git hygiene / Static-analysis / Dependency-management /
> Memory-constraint** sections apply verbatim here and are only summarized below.
> The Python tracker (`src/chesslab/**`) is reference-only and stays untouched.

## What this is

A ground-up **visual overhaul** of the Android tracker app plus two real feature
builds the overhaul surfaced. Approved via mockups (dark tournament / broadcast);
the mockup HTML is the visual reference (design system + every screen state).

Three things change:

1. **A brand identity.** Today `ui/theme/Theme.kt` uses Android **dynamic color**
   with the default `light/darkColorScheme()` — no palette, type, or shapes. That is
   the root cause of the generic look. Replace it with a committed dark-tournament
   `ColorScheme`, custom typography (mono for chess notation/clock/data), and shapes.
2. **The board becomes the hero with an on-board view switch.** The Rendered-vs-Video
   choice — and under Video the raw camera + every debug overlay — is currently the
   `overlayView` chip row buried on the Settings screen. Promote it to a two-level
   toggle on the Tracking screen and remove it from Settings.
3. **History → a multi-game library with on-device analysis.** Today the app holds
   only the single live game (`UiState.moves`) and shares one PGN. Persist finished
   games as PGN files, bundle **Stockfish** for eval/accuracy, and build a games
   library + per-game analysis screen that merges engine accuracy with the tracker's
   existing decision provenance.

Also: transient messaging (move announcements, illegal-move alarm, recovery actions,
the calibrate prompt) becomes a **floating overlay layer** so the board never reflows;
and manual calibration gets a **real zoom loupe** (a magnified crop of the camera
frame under the finger — the current `drawLoupe` only draws a translucent crosshair,
so on-pixel corner placement is impossible).

Visual reference (mockup, dark, all screens/states):
`C:\Users\mariu\.claude\jobs\ab82b6bb\tmp\chesslab-overhaul-mockups.html`
(republishable Artifact). Decisions log: memory `android-visual-overhaul`.

## Design tokens (decided — do not redesign)

Dark, single-committed theme (the app may still ship a matching light scheme, but the
identity is dark). Custom `ColorScheme`, **dynamic color OFF by default**.

| Token | Hex | Role |
|---|---|---|
| bg base | `#0C0F14` | `background` |
| surface | `#151A21` | `surface` / cards |
| elevated | `#1D242E` | app bar, sheets, active chips (`surfaceVariant`) |
| hairline | `#2A323D` | `outline` / dividers |
| text | `#E7EBF0` | `onBackground`/`onSurface` |
| muted | `#8B97A6` | secondary text |
| accent emerald | `#35D399` | `primary` — live/tracking, primary buttons |
| info cyan | `#45B6F5` | waiting / verifying |
| amber | `#F5A524` | occluded / soft-stuck |
| red | `#F26D6D` | `error` — stuck / alarm |
| board light / dark | `#E9D6AC` / `#96703F` | warm-wood squares |
| overlay marks | changed `#FF3DE1` · shadow `#22D3EE` · occlusion `#F5A524` | debug square highlights |

Type: system sans for chrome (tight tracking on headings); **monospace**
(`FontFamily.Monospace`) for the move strip, clock, eval, and debug readouts.
Status→color: `WAITING_BOARD`→info, `TRACKING`→accent, `OCCLUDED`→amber,
`VERIFYING`→info, `STUCK`/alarm→red.

## Phases and dependencies

| Phase | File | Concern | Depends on | Parallel group | Model |
|---|---|---|---|---|---|
| 00 | `00-design-system.md` | `theme/` Color/Type/Shape, gate off dynamic color, centralize board/overlay palette | — | foundation | opus |
| 01 | `01-components.md` | Shared components: status pill, segmented control, board frame, buttons, mono rows, **overlay layer** | 00 | — | opus |
| 02 | `02-tracking.md` | Tracking screen rebuild + **two-level board toggle**; overlays; remove overlay-view from Settings surface | 00, 01 | UI | opus |
| 03 | `03-calibration.md` | Calibration restyle + **real zoom loupe** | 00, 01 | UI | opus |
| 04 | `04-game-storage.md` | Persist finished games (PGN + provenance sidecar), `GameStore` | — | data | codewhale |
| 05 | `05-analysis-engine.md` | Bundle **Stockfish** (UCI), `AnalysisEngine` interface + accuracy classifier | — | data | fable |
| 06 | `06-games-analysis-ui.md` | Games library + Analysis screens (eval bar, scrubber, accuracy, merged provenance); nav rename | 00, 01, 02, 04, 05 | — | opus |
| 07 | `07-settings.md` | Settings restyle; overlay-view row removed (now on Tracking) | 00, 01, 02 | UI | codewhale |

Parallelism:
- **04 and 05 start immediately** — disjoint packages (`record/`+service hook,
  `analysis/`+native), no dependency on the theme work. They feed 06.
- **00 → 01** is the UI foundation and must land first.
- **02 and 03 run in parallel** after 01 (disjoint files; both may read
  `ui/Components.kt` but only 01 writes it). **07 depends on 02** because 02 removes
  the overlay-view control that 07 must not re-add, and both touch
  `ui/SettingsScreen.kt`/`ChesslabNavHost.kt` — serialize 07 after 02.
- **06 is last** — it integrates storage (04) + engine (05) behind the new components.

Shared-file flags:
- `ui/ChesslabNavHost.kt` — touched by **02** (tracking route signature) and **06**
  (History→Games route + Analysis route). 06 runs after 02; edit disjoint composables.
- `ui/OverlayBoard.kt` — owned by **02** (adds first-class Rendered mode).
- `service/TrackerSettings.kt` — **02** may drop the persisted `overlayView` default's
  UI exposure but must KEEP the enum + persistence (engine/debug still use it).

## Git hygiene (binding — per `specs/08-android-tracker/entry.md`)

- One branch for the whole pack: **`android-visual-overhaul`**. Never commit to `main`.
- Atomic conventional commits exactly as named in each phase's Steps; one concern per
  commit; no drive-by edits outside your phase's file scope.
- Stage explicitly (`git add <paths>`), never `git add -A`/`.` — parallel phases share
  the worktree; `git status` must show no unrelated files in your commit.
- Phase 05 adds native build artifacts — update `android/.gitignore` for any
  `.cxx/`, NDK intermediates BEFORE the first build; commit no compiled `.so`/`.o`.
- Never `--no-verify`, force-push, amend/rebase pushed or foreign commits, or
  `git reset --hard` shared state. Failing gate → fix the cause or STOP + blocker in
  `STATUS.md`.
- codewhale phases (04, 07): commit ALL work before `codewhale exec` (it reverts
  out-of-scope changes on exit); no parallel codewhale runs on uncommitted state;
  codewhale must not commit — the supervisor reviews and commits.

## Static code analysis (binding)

- ktlint + detekt on `:app` (and `:engine` if touched), config already present
  (`android/config/detekt/detekt.yml`). **Formatting is automated:** run
  `./gradlew :app:ktlintFormat` — never hand-edit whitespace/imports/wrapping.
- Every phase runs, once at the end, scoped: `./gradlew :app:ktlintCheck :app:detekt`
  (+ `:engine:` equivalents if the phase touched `:engine`). **Zero NEW findings; no
  `@Suppress`/baseline additions to get green** — fix or STOP with a blocker.
  Existing principled detekt tuning (Compose `MagicNumber`/`LongParameterList`
  ignores, `TooManyFunctions` threshold, `MaxLineLength 140`) may be reused; a new
  screen that legitimately needs a threshold bump records it as a discrepancy, it is
  not a silent baseline.
- Android Lint (`:app:lintDebug`) and repo-wide sweeps are the orchestrator's gate.

## Dependency management (binding)

- ALL deps via the Gradle **version catalog** (`android/gradle/libs.versions.toml`),
  resolved from Maven Central / Google Maven / the existing JitPack repo. Pin exact
  versions (no `+`). Never vendor jars/AARs or copy SDK sources.
- **Stockfish (phase 05) is the exception that needs care:** it is a native C++ tree,
  not a Maven artifact, and the no-vendored-binary rule stands — do NOT commit
  prebuilt `.so`/executables. Acceptable routes, decided in 05: (a) a maintained
  GPL-compatible Maven/JitPack Stockfish-Android artifact if one exists and is
  license-clean, else (b) **build from source via the NDK** with the Stockfish source
  as a pinned git submodule + `externalNativeBuild`. Either way: license is **GPL-3.0**
  (compatible with this GPL-3.0-or-later app — record the check in STATUS.md). No new
  runtime dependency ships without a STATUS.md note + license line.

## Protocol for implementing agents

- Git-hygiene section applies verbatim.
- **Trust the code over this spec** when they disagree — cite the real symbol; record
  every discrepancy in `STATUS.md` under "Discrepancies".
- If blocked, STOP, write the blocker to `STATUS.md`, do not improvise around it.
- Update your phase row in `STATUS.md` (`todo → in_progress → done`) and append a
  session-log line on finish.
- Keep the existing behavior contracts intact: **accessibility** (≥48 dp targets,
  `contentDescription` on icons, `LiveRegion` move announcements, per-square board
  semantics), all user-facing text in `strings.xml` (English), `sp` for text. The
  overhaul restyles — it must not regress a11y.
- Do not touch `src/chesslab/**` (Python) — reference only.

## Memory-constraint contract (non-negotiable)

- Run tests **once, targeted**: `cd android && ./gradlew :app:testDebugUnitTest
  --tests "com.chesslab.tracker.<yourpkg>.*"`. `:app:assembleDebug` only where a phase
  explicitly allows it (00, 06).
- Do NOT run full `./gradlew build`, lint-all, connected/instrumented tests, or the
  Python suite — orchestrator's job.
- No emulator/device interaction inside a phase agent.

## Definition of done (per phase)

Phase acceptance criteria pass, named commits exist, `STATUS.md` updated. The
orchestrator runs the full gate afterwards: `./gradlew :app:testDebugUnitTest
:app:assembleDebug :app:ktlintCheck :app:detekt :app:lintDebug` (+ `:engine:` if
touched) plus the repo Python gates to prove nothing Python-side changed, and drives
the app on a device to verify each screen/state visually against the mockup.
