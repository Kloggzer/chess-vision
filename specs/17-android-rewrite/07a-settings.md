# Phase 07a — settings: every `TrackerConfig` knob, live-tunable, with the Python default beside it

> Module `:app`, package `com.chesslab.tracker`. References:
> `src/chesslab/config.py::TRACK_DEFAULTS` `:590-646` (the knob list, the ranges, and the
> **help text — the comments there are the source for every help string in this screen**),
> `src/chesslab/move_tracker/app.py::_live_tuning_kwargs` `:23-52` and `::_apply_live_tuning`
> `:55-78` (which knobs Python re-tunes live and the exact side effects), and the
> `TrackerConfig` seam in `entry.md`.
> Runs in parallel with 07b and 07c — file ownership is strictly disjoint.
> You MAY read `android-legacy/**` for **Android API usage only** (DataStore, Compose
> idioms). You MUST NOT copy its architecture — it exposed a handful of knobs, not all.

## Files you own

| File | Contains |
|---|---|
| `android/app/src/main/kotlin/com/chesslab/tracker/ui/settings/SettingsScreen.kt` | the screen (groups, rows, reset actions, export) |
| `.../ui/settings/SettingsViewModel.kt` | state, apply/persist, restart-required tracking |
| `.../ui/settings/KnobCatalog.kt` | the knob metadata table (id, group, default, range, help, live/restart) |
| `.../ui/settings/KnobRow.kt` | one row composable (slider/stepper/switch + default chip + help) |
| `.../ui/settings/SettingsExport.kt` | "export settings as JSON" |
| `.../ui/Nav.kt` | routes for Settings **and** Debug (`ui/debug/DebugScreen`, 07b) |
| `.../service/SettingsRepository.kt` | DataStore persistence + `StateFlow<TrackerConfig>` + `debugEnabled` |
| `android/app/src/test/kotlin/com/chesslab/tracker/ui/settings/KnobCatalogTest.kt` | tests |
| `android/app/src/test/kotlin/com/chesslab/tracker/service/SettingsRepositoryTest.kt` | tests |

You own **nothing else**. `ui/debug/**` belongs to 07b; `analysis/**`, `ui/TrackingScreen.kt`,
`app/src/main/cpp/CMakeLists.txt` and `android/app/build.gradle.kts` belong to 07c.
Every dependency you need (DataStore, kotlinx-serialization) is already in
`android/gradle/libs.versions.toml` from 00a — if one is missing, **STOP** and record a
blocker; do not edit `build.gradle.kts`.

`service/TrackerService.kt` (06c) is owned by **nobody** this phase. You code against:

```kotlin
fun applyConfig(config: TrackerConfig)   // forwards to TrackerEngine.updateConfig + frame pipeline
fun restartTracker()                     // tear down + rebuild engine & pipeline with the current config
val configInUse: StateFlow<TrackerConfig>
```

Missing → **STOP**, record the blocker; the orchestrator adds it to 06c's file.

## Why

Forty-odd live-tuned thresholds decide whether the tracker works on a given board under a
given lamp. On the desktop they are `--flags` plus a live-tuning endpoint. On the phone,
`specs/12` D5 cut the tuning surface entirely, so a bad board/lighting combination is
unfixable in the field. This screen is the mobile equivalent of the CLI flags **plus**
`app.py`'s live-tuning endpoint, and it is a headline user requirement.

The second half of the requirement is *legibility*: a bare number is useless. Every row
shows the Python default next to the current value and one line of explanation lifted from
`config.py`, so the user can always tell how far they have drifted and get back.

## Design (decided — do not redesign)

### 1. `KnobCatalog` — one table, no magic numbers in composables

```kotlin
enum class KnobGroup { MOTION, EVIDENCE, VETOES, SCORING, CNN, CAMERA, GEOMETRY }

sealed interface KnobKind {
    data class Real(val min: Double, val max: Double, val step: Double) : KnobKind
    data class Count(val min: Int, val max: Int) : KnobKind
    data object Flag : KnobKind
}

data class Knob(
    val id: String,                 // TrackerConfig property name, e.g. "censusThr"
    val group: KnobGroup,
    val kind: KnobKind,
    val pythonDefault: String,      // rendered verbatim next to the value
    val live: Boolean,              // false ⇒ requires a tracker restart
    val help: String,               // one line, from config.py:590-646
    val get: (TrackerConfig) -> Any,
    val set: (TrackerConfig, Any) -> TrackerConfig,
)
```

`KnobCatalog.ALL` must contain **every** property of `TrackerConfig`. A test enumerates
`TrackerConfig::class.memberProperties` and fails on any knob missing from the catalog —
this is what stops the screen from silently going stale when the seam grows.

### 2. Live vs restart — mirror `_live_tuning_kwargs` EXACTLY

Python allows exactly these twelve to change while the tracker runs
(`app.py:23-52`). Nothing else. `live = true` for these and **only** these:

| Knob | Side effect on apply (`_apply_live_tuning` `:59-64`) |
|---|---|
| `motionThr` | none |
| `zThr` | none |
| `censusThr` | none |
| `censusZWeight` | none |
| `occlCensusThr` | none |
| `occlusionColorThr` | none |
| `minGridLineCoverage` | none |
| `motionMargin` | **reset the motion ROI**: `_prev_roi = None` (`:60`) — the ROI box moved, the previous ROI frame is not comparable |
| `overhang` | **invalidate the reference census cache**: `_ref_census_for = None` (`:62`) — cell boxes moved, the cached per-square census belongs to the old boxes |
| `motionHoldS` | none |
| `diffClaheClip` | **rebuild CLAHE**: `_clahe = None`, rebuilt on the next `_gray` call (`:64`) |
| `commitLlFloor` | none |

Android mapping of the three side effects (the engine owns two, `:app` owns the other):

- `TrackerEngine.updateConfig` performs the `overhang` cache invalidation internally
  (03a/03d own that code — you only call `updateConfig`).
- `motionMargin` and `diffClaheClip` are consumed by the **frame pipeline** (05b): the
  ROI motion score and the CLAHE object live there. `TrackerService.applyConfig` must
  forward to both. If the pipeline does not expose `resetMotionRoi()` / `rebuildClahe()`,
  **STOP** and record a blocker.

Every other knob is `live = false`. Its row shows an amber **"restart required"** chip as
soon as it deviates from the running value, and a sticky bottom bar appears with
**Apply & restart tracker** (calls `TrackerService.restartTracker()`). The UI must never
accept a restart-only edit and silently do nothing — that is the failure mode this rule
exists to prevent. Persist the edit immediately regardless; only the *effect* waits.

After a live apply, set the tracker note to `"tracker tuning updated live"` (Python
`app.py:65`) so the change is visible on the tracking screen.

### 3. Groups and help text (verbatim source: `config.py:590-646`)

Use these strings. They are condensed from the comments at the cited lines; keep the
numbers and the reasoning, drop nothing load-bearing.

**MOTION**
- `motionThr` (0.25, range 0.0–5.0, step 0.05) — "Motion gate: PERCENT of strongly-changed pixels. Low on purpose: a slow hand only moves a thin edge band between frames; wobble stays ~0 thanks to blur + motionPxThr." (`:591-593`)
- `motionPxThr` (20.0, 0–80, 1) — "Per-pixel delta above which a pixel counts as changed — desk wobble shifts everything by ~1 px (tiny deltas); a hand produces a compact region of strong deltas." (`:594-596`)
- `motionMargin` (0.10, 0.0–0.5, 0.01) — "Motion ROI beyond the board edge (fraction of board edge)." (`:622`) *live, resets the ROI*
- `motionHoldS` (0.4, 0.0–3.0, 0.05) — "Seconds the board must be motion-free before detection resumes (wall time)." (`:627-628`)
- `requireMotionForMove` (true) — "Only commit a move if a hand entered since the last reference (drift guard)." (`:635`)
- `motionRecencyS` (20.0, 0–120, 1) — "How long a hand entry stays 'recent' for the motion gate." (`:636`)
- `darkLumaThr` (18.0, 0–60, 1) — "Pre-CLAHE mean luma below which the frame is too dark to detect on; CLAHE would turn sensor noise into phantom changed squares." (constructor-only; see `entry.md`)

**EVIDENCE**
- `zThr` (3.0, 0.5–10.0, 0.1) — "z-Score above which a square is considered 'changed'." (`:597`)
- `censusThr` (40.0, 0–255, 1) — "Structural change (census, 0..255); higher ⇒ more squares veto as shadow. 160 vetoed real dark-on-dark ARRIVALS as shadows (black rook onto dark f8 → O-O blocked, Rg8 committed). 40 is the clip-validated floor; real cast shadows stay below it." (`:603-606`)
- `censusZWeight` (1.0, 0.0–3.0, 0.1) — "Structural evidence fusion: z_eff = max(z_gray, w·z_census). Census is illumination-invariant structure — lifts dark-on-dark moves the gray absdiff misses without raising zThr. 0 = off." (`:607-609`)
- `overhang` (0.25, 0.0–1.0, 0.05) — "Extend diff/occlusion cells toward the back rank (fraction of cell)." (`:623`) *live, invalidates the ref census cache*
- `diffClaheClip` (2.0, 0.0–8.0, 0.1) — "CLAHE contrast boost on the diff image (0=off; ~2-3 lifts dark moves)." (`:634`) *live, rebuilds CLAHE*
- `detectScale` (0.5, 0.25–1.0, 0.05) — "Detection warp scale (0.5 = half-res board; 1.0 = off)." (`:641`) **restart**

**VETOES**
- `maxChanged` (6, 1–20) — "Occlusion gate." (`:602`)
- `occlCensusThr` (24.0, 0–255, 1) — "Baseline occlusion needs structure above this (census 0..255 ≈ Hamming 0.75): strong absdiff WITHOUT structure/chroma anomaly is a cast shadow, not a hand. 0 = legacy." (`:610-612`)
- `occlusionColorThr` (3.0, 0.0–10.0, 0.1) — "Color-outlier veto: Mahalanobis sigma vs board gamut (lower=more sensitive, 0=off). The historic 1.5 was 'tuned' while the gamut was never built (veto dead); now that it is live, 1.5 over-fires — 3.0 is the validated-conservative start." (`:629-631`)
- `minGridLineCoverage` (0.5, 0.0–1.0, 0.05) — "Grid-line occlusion gate: min visible-line fraction (0=off)." (`:632`)
- `cornerJumpPx` (6.0, 0.0–40.0, 0.5) — "Warp corner jump ⇒ base truth geometrically invalid → reacquire." (`:626`) **restart**

**SCORING**
- `ambiguityMarginLl` (2.0, 0.0–10.0, 0.1) — "best − second in log-likelihood units (~e² factor)." (`:598`)
- `commitLlFloor` (2.0, 0.0–20.0, 0.1) — "Min ABSOLUTE loglik a voting candidate needs to commit (0=off). A sole-viable candidate has infinite margin, so only an absolute floor stops weak phantoms (live: f6h5 @ 0.44 swallowed a castle; real moves score ~12-24). Endpoint candidates are exempt." (`:637-640`)
- `reanchorLlFloor` (-4.0, -20.0–0.0, 0.5) — "Re-anchor only if even the best move LL lies below this." (`:599`) **restart**
- `llK` (1.0, 0.1–5.0, 0.1) — "Log-likelihood temperature (constructor-only in Python)." **restart**
- `usePrior` (true) — "Use the move prior as a tie-break." **restart**
- `nudgeTimeoutS` (5.0, 0–60, 1) — "Nudge patch (occupied squares) after this many seconds stuck." (`:600`) **restart**
- `driftWindowS` (30.0, 0–180, 1) — "Drift patch (empty squares) — more conservative." (`:601`) **restart**

**CNN** (all **restart**)
- `cnnConfThr` (0.85, 0.0–1.0, 0.01) — "CNN square confidence 'reliable'." (`:613`)
- `cnnCooldownS` (2.0, 0–30, 0.5) — "Minimum interval between recovery observations." (`:614`)
- `cnnCheckIntervalS` (10.0, 0–120, 1) — "Periodic CNN check." (`:615`)
- `verifyWindow` (8, 1–30) — "Max CNN frames per pre-commit verify." (`:616`)
- `cnnMinAgreement` (0.97, 0.5–1.0, 0.01) — "Recovery/verify agreement threshold." (`:617`)
- `cnnMarginSquares` (1, 0–8) — "Recovery margin in SQUARES (capture = 1 square difference)." (`:618-619`)
- `recoveryMaxPlies` (4, 1–10) — "CNN deep recovery: max half-moves the conflict-guided search may bridge." (`:619`)
- `minConfidentBoard` (32, 0–64) — "Whole-board match needs plenty of clear view." (`:620`)
- `minConfidentRecovery` (8, 0–64) — "Recovery remains operational with partial occlusion." (`:621`)
- `desyncObsN` (3, 1–10) — "Consecutive stable-mismatch CNN ticks before the illegal-move alarm." (`:642`)
- `verifyObsVotes` (2, 1–5) — "Consecutive same-outcome CNN observations per verify decision (never act on one glance)." (`:643`)
- `observerIntervalS` (0.0, 0.0–5.0, 0.05) — "Min seconds between CNN observation starts; 0 = free-running (desktop). Raise on battery/thermal-constrained devices (Android port)." (`:644-645`)
- `cnnVerify` (true) — "Run the pre-commit CNN verify at all."

**CAMERA** (all **restart**)
- `alignEvery` (3, 1–30) — "ArUco marker detection every N-th frame (most expensive per-frame op; camera fixed)." (`:624`)
- `alignScale` (0.5, 0.25–1.0, 0.05) — "ArUco on a downscaled frame (0.5 = half-res, ~3× faster; ±1 px inside the tracker dead-zone)." (`:625`)
- `liveAlign` (true) — "Re-detect the markers while tracking."
- `reconnectGraceS` (2.0, 0–30, 0.5) — "Auto-reattach the camera after this many seconds of no frames (0=off)." (`:633`)
- **Resolution mode** — an app-level enum, not a `TrackerConfig` field: `AUTO | R1080 | R1440 | R2160`. Persist it in `SettingsRepository` beside the config. Its help line must repeat the calibration trap from commit `a7dab73`: *"Never trust the requested resolution — the pipeline calibrates against the DELIVERED size."*

**GEOMETRY** (all **restart**)
- `boardSize` (1600, 640–2560, 32) — "Full-resolution warp size; `detSize = boardSize * detectScale`." (`config.DEFAULT_BOARD_SIZE`)
- **Board orientation** — which physical corner is `a8` (`[a8, h8, h1, a1]`, `entry.md`
  invariant 11). App-level, persisted with the calibration profile. Help line: *"Wrong
  a8 assignment silently transposes every label."*
- **Model selection** — which ONNX asset (list the `.onnx` files in `assets/models/`) and
  the requested execution provider (`AUTO | QNN | NNAPI | CPU`). Persisted here, consumed
  by 05c. The *actually selected* EP is displayed by 07b's CNN-state panel — this screen
  shows only the request.

### 4. Reset actions

- Per-group: **Reset group to Python defaults** in every group header.
- Global: **Reset all to Python defaults** at the bottom, behind a confirm dialog.
- Both write `TrackerConfig()` values (the data-class defaults, which are `config.py`'s by
  `entry.md`'s seam definition) for the affected knobs and follow the live/restart rules.
- A row whose value differs from the Python default renders a **modified** dot; the group
  header shows the count of modified knobs in that group.

### 5. Persistence

`SettingsRepository` (DataStore Preferences, one key per knob id, plus the app-level keys
`resolutionMode`, `orientation`, `modelAsset`, `epRequest`, `debugEnabled`) exposes:

```kotlin
val config: StateFlow<TrackerConfig>
val appSettings: StateFlow<AppSettings>
val debugEnabled: StateFlow<Boolean>     // read by 07b; only THIS file writes it
suspend fun update(mutate: (TrackerConfig) -> TrackerConfig)
suspend fun setDebugEnabled(on: Boolean)
suspend fun resetGroup(group: KnobGroup)
suspend fun resetAll()
```

Unknown/absent keys fall back to the `TrackerConfig` default — a config written by an
older build must never crash the app or produce a partially-default engine.

### 6. Export settings as JSON

`SettingsExport.toJson(config, appSettings, appVersion, deviceModel)` → pretty JSON with
three sections: `config` (all knobs), `nonDefault` (only the deviations — the part a bug
report actually needs), and `app` (version, device, model asset, requested EP, resolution
mode, orientation). Surfaced as **Share** (`ACTION_SEND`, `text/plain`) — no file
permission, no external storage.

### 7. Navigation

`ui/Nav.kt` gets two routes: `settings` and `debug`. The Debug entry is a row at the
**bottom** of the settings screen (`Debug menu`, with a `debugEnabled` switch next to it),
never on the main tracking flow. Toggling the switch calls
`SettingsRepository.setDebugEnabled` **and** `TrackerService.setDebugEnabled` so 07b's
extra payload is not assembled while the screen is closed.

## Steps

### 1. `SettingsRepository` + tests — commit `feat(android-app): DataStore-backed TrackerConfig repository with per-knob keys and default fallback`

### 2. `KnobCatalog` + completeness test — commit `feat(android-app): knob catalog — every TrackerConfig field with Python default, range and help`

### 3. Settings screen + rows + reset actions — commit `feat(android-ui): settings screen — grouped knobs, Python defaults inline, per-group and global reset`

### 4. Live apply vs restart-required — commit `feat(android-app): live tuning mirrors app.py _live_tuning_kwargs; restart-only knobs say so`

### 5. Model / camera / geometry section + JSON export + nav — commit `feat(android-ui): model & camera selection, settings JSON export, debug route`

Run once:
`.\gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.ui.settings.*" --tests "com.chesslab.tracker.service.SettingsRepositoryTest"`

## Tests

| Kotlin test | Guards |
|---|---|
| `catalogCoversEveryTrackerConfigProperty` | reflection over `TrackerConfig::class.memberProperties`; zero missing, zero extra |
| `catalogDefaultsEqualTrackerConfigDefaults` | every `Knob.pythonDefault` parses back to `Knob.get(TrackerConfig())` |
| `liveKnobsAreExactlyThePythonTwelve` | the `live == true` set equals the twelve `_live_tuning_kwargs` names — the whole point of the rule |
| `motionMarginApplyResetsMotionRoi` | fake pipeline records `resetMotionRoi()` |
| `overhangApplyInvalidatesRefCensus` | fake engine records `updateConfig` with the new overhang |
| `diffClaheClipApplyRebuildsClahe` | fake pipeline records `rebuildClahe()` |
| `restartOnlyKnobMarksRestartRequired` | editing `detectScale` sets the flag and does **not** call `applyConfig` |
| `restartOnlyKnobStillPersists` | the edit survives a repository reload |
| `resetGroupOnlyTouchesItsGroup` | other groups unchanged |
| `resetAllRestoresPythonDefaults` | `config == TrackerConfig()` |
| `repositoryFallsBackToDefaultForUnknownKey` | a preferences store with a deleted key yields the default |
| `exportContainsOnlyDeviations` | `nonDefault` empty on a pristine config, exactly one entry after one edit |

## Acceptance criteria

- `grep -c "Knob(" android/app/src/main/kotlin/com/chesslab/tracker/ui/settings/KnobCatalog.kt`
  ≥ the number of `TrackerConfig` properties (currently 41).
- `grep -n "live = true" .../KnobCatalog.kt | wc -l` == 12.
- `grep -n "resetMotionRoi\|rebuildClahe" .../SettingsViewModel.kt` hits both.
- `grep -rn "restart" .../ui/settings/SettingsScreen.kt` hits the restart chip and the
  sticky apply bar.
- `grep -rn "0\.25\|40\.0\|3\.0" .../ui/settings/SettingsScreen.kt` finds **no** literals —
  numbers live only in `KnobCatalog.kt`.
- All 12 tests green; `:app:ktlintFormat` then `:app:detekt` clean.
- `STATUS.md` row 07a `done`.

## Do NOT

- Do NOT invent a live-tunable knob Python does not re-tune live. The twelve are the
  contract; anything else changes mid-flight state the engine caches.
- Do NOT silently accept a restart-only edit. Say "restart required" or refuse.
- Do NOT drop the side effects: a `motionMargin` change without `resetMotionRoi()` diffs
  two ROIs of different sizes; an `overhang` change without invalidating the reference
  census compares new boxes against old cached values.
- Do NOT hard-code defaults in composables — `KnobCatalog` is the only place.
- Do NOT edit `android/app/build.gradle.kts`, `ui/debug/**`, `analysis/**`,
  `ui/TrackingScreen.kt`, `service/TrackerService.kt`, or anything under `core-*`.
- Do NOT read `android-legacy/**` for logic or for which knobs to expose — it exposed a
  subset and that subset is not the requirement.
- Do NOT write settings to external storage.
