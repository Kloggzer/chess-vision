# Phase 07b — on-device debug menu: timings, evidence heatmap, 64-crop grid, CNN reads, decision log

> Module `:app` (package `com.chesslab.tracker.ui.debug`) plus the two engine API files
> named below. References: `src/chesslab/move_tracker/tracker.py` — perf log `:853-854`,
> `:1734-1743`; `cnn_crops_jpeg` `:3772-3800` (commit `6e31e35`, served as `GET /crops.jpg`);
> `_record_decision` `:2642-2681` and `_DECIDER_REASON` `:2631-2640`; Android per-stage
> timing commit `9cd562a` (logcat tag `chesslabPerf`, throttled 1/s, in `TrackerService.kt`).
> Runs in parallel with 07a and 07c — file ownership is strictly disjoint.
> You MAY read `android-legacy/**` for **Android API usage only** (Compose, bitmap tiling,
> `dumpCrops`' extraction call shape). You MUST NOT copy its architecture — legacy had no
> debug surface at all; `specs/12-android-parity/STATUS.md` **D5** cut it deliberately and
> that cut is the liability this phase repays.

## Files you own

| File | Contains |
|---|---|
| `android/core-engine/src/main/kotlin/com/chesslab/engine/api/DebugPayload.kt` | **new** engine-side debug types (decision log entry, stage timings) |
| `android/core-engine/src/main/kotlin/com/chesslab/engine/api/TrackerStatus.kt` | adds the one nullable `debug` field (see "Seam change") |
| `android/core-engine/src/main/kotlin/com/chesslab/engine/DecisionLog.kt` | the ring buffer + `recordDecision` port |
| `android/app/src/main/kotlin/com/chesslab/tracker/service/DebugPayloadAssembler.kt` | fuses `TrackerStatus.debug` + CNN observer output into `DebugState` |
| `.../ui/debug/DebugScreen.kt` | tabbed host (6 panels) |
| `.../ui/debug/TimingsPanel.kt`, `EvidencePanel.kt`, `CropGridPanel.kt`, `CnnReadsPanel.kt`, `DecisionLogPanel.kt`, `CnnStatePanel.kt` | the panels |
| `.../ui/debug/DecisionLogExport.kt` | text export + share |
| `android/core-engine/src/test/kotlin/com/chesslab/engine/DecisionLogTest.kt` | tests |
| `android/app/src/test/kotlin/com/chesslab/tracker/ui/debug/DebugStateTest.kt` | tests |

You own **nothing else**. `ui/settings/**`, `ui/Nav.kt` and `service/SettingsRepository.kt`
belong to 07a (the Debug route and the `debugEnabled` switch are 07a's — you only *consume*
`SettingsRepository.debugEnabled`). `analysis/**`, `ui/TrackingScreen.kt`,
`android/app/build.gradle.kts` belong to 07c. `service/TrackerService.kt` is owned by
nobody this phase; you code against:

```kotlin
fun setDebugEnabled(on: Boolean)          // gates the extra payload assembly
val uiState: StateFlow<UiState>           // 06c's single published snapshot; UiState.debug is your field
val latestObservation: CnnObservationSnapshot?   // 05c: probs + crops of the last CNN glance
```

Missing → **STOP**, record the blocker; the orchestrator adds it to 06c/05c.

## Why

Every previous Android debugging session went through `adb logcat` and one-off dumps
(`endpointStats`, `dumpCrops`). On a phone, on a real board, in a tournament hall, that is
not a workflow. The three questions that actually decide a live session are:

1. *Where is the frame time going?* (the 4 fps → 15-20 fps work of `9cd562a`/`4a7609e`
   was only possible because the desktop has a perf log; the phone had none until that
   commit, and it is logcat-only.)
2. *Which squares are changed, which were shadow-vetoed, which are occlusion-tainted?*
   `entry.md` invariant 2 — shadow veto **preserves** z, occlusion veto **zeroes** it —
   is the single most silent failure in the whole system. Seeing the three sets
   colour-coded is the fastest possible diagnosis.
3. *Is the CNN actually running, on which execution provider, and what does it read?*
   MEMORY, 2026-07-22: the CNN attach failed **silently** for an entire session. Loud is
   the requirement.

## Design (decided — do not redesign)

### Seam change (declare it, do not sneak it)

`entry.md` freezes `TrackerStatus` and forbids a side channel to the UI. The debug screen
must therefore be a pure function of the published snapshot. Add exactly **one** nullable
field:

```kotlin
// api/TrackerStatus.kt — the ONLY change to this file
val debug: DebugPayload? = null,
```

Record this in `STATUS.md` under *Discrepancies* as an intentional seam extension, with a
one-line justification. No other field, no side channel, no second flow.

```kotlin
// api/DebugPayload.kt (new)
data class DebugPayload(
    val decisions: List<DecisionRecord>,       // newest last, ring-capped
    val engineStageMs: Map<String, Double>,    // engine-internal sub-stages
)

data class DecisionRecord(                     // port of tracker.py::_record_decision :2650-2674
    val tsMs: Long,
    val ply: Int,
    val uci: String,
    val san: String,
    val fenBefore: String,
    val fenAfter: String,
    val decider: String,                       // see DECIDER_REASON below
    val reason: String,
    val priorUsed: Boolean,
    val bestScore: Double,
    val secondScore: Double,
    val margin: Double,                        // bestScore - secondScore
    val changed: List<String>,
    val changedVals: List<Pair<String, Double>>,
    val shadowVetoed: List<String>,
    val occludedVetoed: List<String>,
    val gridCoverage: Double,
    val zThr: Double,
    val motion: Double,
    val cnnAgreement: Double,
    val cnnBestMove: String?,
    val stuckReason: String?,
    val verifyOutcomes: List<String>,          // the vote sequence that led here (entry.md invariant 13)
    val accepted: Boolean,                     // false ⇒ candidate REJECTED; Python only logs commits, we log both
)
```

`DECIDER_REASON` is a verbatim port of `tracker.py:2631-2640`:
`diff` → "frame-diff (no CNN verify)", `diff_pair` → "frame-diff double move (fast play,
no CNN verify)", `cnn_pair` → "CNN occupancy confirmed double move (fast play)",
`cnn_occupancy` → "CNN occupancy confirmed", `cnn_overrule` → "CNN overruled the diff
move", `diff_after_verify` → "diff accepted (CNN uncertain, clear view)", `cnn_recovery` →
"CNN recovery (diff was stuck)", `cnn_resync` → "manual CNN resync". `priorUsed` appends
`" + prior tie-break"` (`:2648-2649`).

`DecisionLog` is a fixed-capacity ring (**64** entries) inside the engine. It holds **no
images** — Python's `_recent_decisions` carries warped BGR copies (`:2675-2679`) for the
feedback dataset; on the phone that is memory the tracker cannot afford. Text only.

### Cost gate (binding)

`DebugPayload` is assembled **only** when `debugEnabled` is true.

- `TrackerEngine` keeps recording into `DecisionLog` always (it is a bounded list of
  strings and doubles, appended at most once per committed/rejected move — not per frame).
- `TrackerStatus.debug` is `null` unless debug is on.
- `DebugPayloadAssembler` allocates **nothing** per frame when debug is off: no crop
  bitmaps, no probability maps, no heatmap arrays. Assert this with a test that runs
  1000 synthetic frames with debug off and asserts the assembler produced zero
  `DebugState` objects.
- Crop bitmaps (panel 3) are built **on demand**, when the crop tab is visible, at most
  **2 Hz**. Never on the analyzer thread — build on `Dispatchers.Default` from the
  immutable `CnnObservationSnapshot`.

### Panel 1 — per-stage timings

Source: `TrackerStatus.stageTimingsMs` (already in the seam) plus `TrackerStatus.fps`.
Stages, in this order: `warp`, `gray`, `motion`, `evidence`, `veto`, `score`, `cnn`,
`total`. Python's counterpart is `_perf_log` (`tracker.py:853-854`, `:1734`), dumped every
100 frames to `data/_perf/perf_loop.log` (`:1737-1743`); Android's is the `chesslabPerf`
logcat line from `9cd562a`, throttled 1/s.

Render: a horizontal stacked bar per frame budget + a table with **last / median / p95**
over a rolling 120-frame window, plus fps (instantaneous and 5 s median). Colour `total`
red above 66 ms (the ≥15 fps acceptance line of phase 09). Keep the `chesslabPerf` logcat
line — the panel and the log both stay.

### Panel 2 — evidence heatmap

An 8×8 board grid of `TrackerStatus.z` (fused per-square z), oriented a8 top-left
(`entry.md` invariant 11: corner order `[a8, h8, h1, a1]`; **do not** reuse the CNN crop
order here). Cell fill = sequential ramp on z, `zThr` marked on the legend. Overlays,
which must be **visually distinct from each other**, not three shades of one colour:

| Set | Encoding | Meaning |
|---|---|---|
| `changed` | thick solid outline | survived every veto, feeds the hypothesis |
| `shadowVetoed` | diagonal hatch, **z still rendered** | removed from `changed` but z PRESERVED (invariant 2) |
| `occlusionVetoed` | solid scrim, **z rendered as 0** | z ZEROED (invariant 2) |

Add a legend line stating exactly that: *"shadow keeps z, occlusion zeroes it"*. Show
`diffs` and `census` channels as two switchable alternates of the same grid (the seam
carries both) — dark-on-dark moves are visible in census and invisible in gray, and being
able to flip between them is how that gets diagnosed. Footer: `bestLl`, `secondLl`,
`bestUci`, `changed.size` vs `maxChanged`, `gridLineCoverage`, `motion`.

### Panel 3 — 64-crop CNN input grid

The Android equivalent of `GET /crops.jpg` (`tracker.py::cnn_crops_jpeg:3772-3800`). It
shows the **exact model-input crops**, taken from the same code path inference uses (05c's
preprocessing output, before normalization — the bordered full-resolution warp of
`entry.md` invariant 1, *not* the detection warp), tiled 8×8 in
`labeling.all_squares()` order = `a1,b1,…,h1,a2,…,h8` (invariant 11), each tile labelled
with its square name. Match Python's presentation so the two are comparable side by side:
128 px tile width, a 16 px dark label header, thin border.

**This grid is the ground truth for crop parity.** Phase 09 step 5 compares it against
Python's `GET /crops.jpg` on the same physical position; a mismatch here means the CNN is
being fed different pixels than the desktop model was trained/evaluated on, which no
threshold tuning can fix. State that in the panel's own header text so nobody "cleans up"
the rendering later.

Long-press a tile → full-size crop + that square's probability vector.

### Panel 4 — CNN reads

Per square: label, confidence, and `p_occ` / `p_empty` / `p_occluded`. Sorted by
confidence descending, with a toggle for ascending (the low-confidence tail is what you
actually hunt). Squares whose read **conflicts with the believed FEN** are highlighted and
pinned to the top of a separate "conflicts" section — this is `resyncCheck`'s conflict set
made visible. Show `nConfident` against `minConfidentBoard` and `minConfidentRecovery`,
because those two gates are why a glance is silently ignored.

### Panel 5 — decision log

One row per detected **or rejected** move, newest first:
`ts · ply · SAN (uci) · decider + reason · best/second LL (margin) · prior? · stuck reason
· verify outcome sequence`. Expanding a row shows `fenBefore` → `fenAfter`, `changed`
with values, `shadowVetoed`, `occludedVetoed`, `gridCoverage`, `motion`, `cnnAgreement`,
`cnnBestMove`.

**Export as a text file** via `DecisionLogExport`: one record per line, tab-separated,
plus a header block with the app version, the full `TrackerConfig`, and the model asset +
EP in use. Shared with `ACTION_SEND` (`text/plain`) — app-private cache file, no storage
permission.

### Panel 6 — CNN state

Loud, top of the tab, colour-coded:

- attach state: `ATTACHED | ATTACHING | FAILED(reason) | DISABLED`;
- **the execution provider actually selected** by 05c — not the one requested in settings.
  Render request → actual as `QNN (requested) → NNAPI (actual)` and colour it amber when
  they differ, red on `FAILED`;
- model asset name, input shape, last infer ms, observations/s, and the last error string
  verbatim.

`FAILED` also raises a persistent banner on the debug entry row **and** a one-shot
notification, because the recorded bug is that a silent failure survived a whole session.
The banner is not dismissible while the state is `FAILED`.

### Navigation

Reachable only from the settings screen (07a owns the route and the `debugEnabled`
switch). Never on the tracking flow. Closing the screen calls
`TrackerService.setDebugEnabled(false)` unless the user pinned the switch on.

## Steps

### 1. `DebugPayload` + `DecisionLog` + `TrackerStatus.debug` — commit `feat(android-engine): decision log ring + DebugPayload seam field (port of _record_decision)`

### 2. `DebugPayloadAssembler` with the off-path zero-allocation gate — commit `feat(android-app): debug payload assembly gated behind debugEnabled (no cost when closed)`

### 3. Timings + evidence heatmap panels — commit `feat(android-ui): debug panels — per-stage timings and the changed/shadow/occlusion evidence heatmap`

### 4. Crop grid + CNN reads — commit `feat(android-ui): debug panels — 64-crop model-input grid and per-square CNN reads`

### 5. Decision log + export + CNN state — commit `feat(android-ui): debug panels — decision log with export and a loud CNN attach/EP state`

Run once:
`.\gradlew.bat :core-engine:test --tests "com.chesslab.engine.DecisionLogTest"` and
`.\gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.ui.debug.*"`

## Tests

| Kotlin test | Guards |
|---|---|
| `decisionLogIsRingCappedAt64` | oldest dropped, newest kept |
| `decisionReasonMatchesPythonTable` | all 8 `_DECIDER_REASON` entries verbatim (`tracker.py:2631-2640`) |
| `priorUsedAppendsTieBreakToReason` | `:2648-2649` |
| `rejectedCandidatesAreLoggedToo` | `accepted == false` path — Python logs only commits; we must see rejections |
| `decisionCarriesNoBitmaps` | reflection: no image-typed property on `DecisionRecord` |
| `debugPayloadIsNullWhenDisabled` | 1000 frames, debug off → `status().debug == null` every time |
| `assemblerAllocatesNothingWhenDisabled` | zero `DebugState` emissions over 1000 frames |
| `heatmapSeparatesShadowFromOcclusion` | UI-model assert: shadow cell keeps its z, occlusion cell reads 0 (invariant 2) |
| `heatmapUsesA8TopLeft` | index mapping test against corner order `[a8,h8,h1,a1]` |
| `cropGridUsesAllSquaresOrder` | tile 0 == `a1`, tile 7 == `h1`, tile 63 == `h8` (invariant 11) |
| `cropGridSourcesTheBorderedFullResWarp` | fake pipeline: the grid reads the crop warp, not `grayDet` (invariant 1) |
| `cnnReadsHighlightFenConflicts` | conflicting square appears in the conflicts section |
| `cnnStateShowsActualEpNotRequested` | requested QNN + actual NNAPI renders both and flags the mismatch |
| `cnnAttachFailureIsNotDismissible` | banner state survives a dismiss call while `FAILED` |
| `decisionExportContainsConfigHeader` | exported text contains the config block and one line per record |

## Acceptance criteria

- `grep -rn "debugEnabled" android/app/src/main/kotlin/com/chesslab/tracker/service/DebugPayloadAssembler.kt` hits the gate.
- `grep -rn "Bitmap\|createBitmap" android/core-engine/src/main/kotlin/com/chesslab/engine/` returns **nothing** (the engine stays pixel-free).
- `grep -n "val debug" android/core-engine/src/main/kotlin/com/chesslab/engine/api/TrackerStatus.kt` hits exactly once, and `STATUS.md` carries the discrepancy note.
- `grep -rn "shadow keeps z" android/app/src/main/kotlin/com/chesslab/tracker/ui/debug/EvidencePanel.kt` hits the legend.
- `grep -rn "crops.jpg" .../ui/debug/CropGridPanel.kt` hits the parity note.
- `grep -rn "chesslabPerf" android/app/src/main/kotlin/` still hits — the logcat line stays.
- All 15 tests green; `:core-engine:ktlintFormat`/`detekt` and `:app:ktlintFormat`/`detekt` clean.
- `STATUS.md` row 07b `done` + the seam discrepancy note.

## Do NOT

- Do NOT add a second flow, binder callback, or broadcast to feed the debug UI.
  Everything goes through the published snapshot (`entry.md`: "no phase may add a side
  channel to the UI").
- Do NOT extend `TrackerStatus` beyond the one `debug` field.
- Do NOT build crops, heatmap arrays, or probability maps while `debugEnabled` is false,
  and never on the analyzer thread.
- Do NOT store warped images in `DecisionLog` (Python does; the phone cannot).
- Do NOT render the crop grid in corner order or the heatmap in `all_squares()` order —
  they are different orders and swapping them is invariant 11's failure mode.
- Do NOT collapse `changed` / `shadowVetoed` / `occlusionVetoed` into one visual channel.
- Do NOT put the debug entry on the tracking screen.
- Do NOT touch `ui/settings/**`, `ui/Nav.kt`, `service/SettingsRepository.kt`,
  `analysis/**`, `ui/TrackingScreen.kt`, `service/TrackerService.kt`, or
  `android/app/build.gradle.kts`.
- Do NOT add `synchronized`/`Atomic*`/`@Volatile` to `:core-engine` (`entry.md` hard rule 2).
- Do NOT read `android-legacy/**` for logic.
