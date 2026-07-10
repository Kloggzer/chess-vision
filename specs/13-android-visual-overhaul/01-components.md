# Phase 01 — Shared components & overlay layer

## Why

The screens are built from raw Material3 defaults (`AssistChip`, `Button`, plain
`Text`) with per-screen literals. To restyle four screens consistently we need one set
of themed building blocks first — and a **floating overlay layer**, because today's
transient messaging (alarm banner, recovery card, calibrate prompt) is inserted into
the Compose `Column` and reflows the board every time state changes. The user asked
for overlays instead, so the board never moves.

## Design (decided — do not redesign)

All new/updated components live in `ui/Components.kt` (extend it) and a new
`ui/Overlays.kt`. Everything reads `MaterialTheme.colorScheme` / `BoardPalette`
(phase 00) — no local color literals. Keep the existing a11y contracts (48 dp min,
`contentDescription`, `clearAndSetSemantics` on the switch label — see `Components.kt:96-116`).

### Status pill — replaces `StatusChip`

`Components.kt:41-58` has `StatusChip` (a disabled `AssistChip`). Replace with a
`StatusPill` that renders a colored dot + label, color from `statusLabel` (keep the
existing `TrackerState`→color map at `Components.kt:31-39` but repoint to the new
tokens: WAITING/VERIFYING→`secondary`(info), TRACKING→`primary`, OCCLUDED→`tertiary`
(amber), STUCK→`error`). Pulsing dot for TRACKING/STUCK via `rememberInfiniteTransition`
(respect `prefers-reduced-motion` is N/A on Android; gate the pulse off if
`Settings.Global` animator duration scale is 0 — optional). Keep the
`contentDescription = label` and ≥48 dp semantics.

```kotlin
@Composable fun StatusPill(state: TrackerState, modifier: Modifier = Modifier)
```

Update the two call sites: `TrackingScreen.kt:190` (TrackingHeader) — phase 02 does
the swap, but define `StatusPill` here and keep `StatusChip` as a thin delegate for
one commit so the build stays green.

### Segmented control — the board-view primary switch

```kotlin
@Composable fun SegmentedToggle(
    options: List<String>, selectedIndex: Int, onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
)
```

Pill-group, elevated background on the selected segment (`surfaceVariant`), min 46 dp,
each segment `contentDescription`. Used by phase 02 for `Rendered | Video`.

### Sub-tab chip row — debug views under Video

```kotlin
@Composable fun SubTabRow(
    labels: List<String>, selected: Int, onSelect: (Int) -> Unit,
    accentFor: (Int) -> Color = { MaterialTheme.colorScheme.primary },
)
```

Mono labels, outlined when off, filled-accent when on (Diff selected → magenta via
`accentFor`). Used by phase 02.

### Board frame container

```kotlin
@Composable fun BoardFrame(video: Boolean = false, content: @Composable BoxScope.() -> Unit)
```

Rounded 12 dp container with the warm-wood gradient border for the rendered board and
a cool border for `video = true`. Wraps the board/camera child; phases 02/03 put the
board and overlays inside it (it must be a `Box` so overlays can absolutely-position).

### Buttons

Thin wrappers so every screen uses the same four: `PrimaryButton`, `GhostButton`
(outlined), `QuietButton` (text), `DangerButton` (error-tinted). ≥46 dp. Replace ad-hoc
`Button/OutlinedButton/TextButton` usages in later phases.

### Mono key–value row — debug readout

`Components.kt` has no such row; the debug card builds `DebugRow` privately in
`TrackingScreen.kt:379-389`. Promote a public `KeyValueRow(label, value, highlight: Boolean = false)`
(mono value, `tabular-nums` via `TextStyle(fontFeatureSettings="tnum")`, `SpaceBetween`).
Phase 02 (debug panel) and phase 06 (provenance) reuse it.

### Overlay layer — `ui/Overlays.kt` (new)

Composables meant to be dropped **inside a `Box`** (the screen root or `BoardFrame`)
and positioned with `Modifier.align` + padding, so they float over content and never
participate in column layout:

```kotlin
// centered pill near the top of the board; auto-dismiss handled by caller state
@Composable fun BoxScope.OverlayToast(text: String, san: String? = null, modifier: Modifier = Modifier)

// red banner pinned to the top of the board frame
@Composable fun BoxScope.OverlayBanner(text: String, modifier: Modifier = Modifier)

// action card anchored above the bottom nav (Align.BottomCenter), translucent + blur-ish
@Composable fun BoxScope.OverlayCard(
    title: String, body: String, attn: Boolean = false,
    actions: @Composable RowScope.() -> Unit, modifier: Modifier = Modifier,
)
```

Backgrounds use `surface`/`error`-tinted `Color.copy(alpha = …)` (Compose has no
backdrop-blur; approximate with ~0.94 alpha + `shadow`/`border`). Each overlay is a
`LiveRegion` where it replaces an announcement (the alarm banner keeps the
`liveRegion = Assertive` + `contentDescription` the current `AlarmBanner` has at
`TrackingScreen.kt:290-298`).

## Steps

1. `Components.kt` — `StatusPill` (+ keep `StatusChip` delegate), `KeyValueRow`, button wrappers — commit `feat(android-ui): themed status pill, buttons, key-value row`
2. `Components.kt` — `SegmentedToggle`, `SubTabRow`, `BoardFrame` — commit `feat(android-ui): segmented toggle, sub-tab row, board frame`
3. `ui/Overlays.kt` (new) — `OverlayToast`/`OverlayBanner`/`OverlayCard` — commit `feat(android-ui): floating overlay layer (toast, banner, action card)`

## Tests (write, run once, targeted)

- `:app:testDebugUnitTest --tests "com.chesslab.tracker.ui.ComponentsTest"` — a Compose
  UI test (or semantics test if the harness supports it) asserting `StatusPill` exposes
  the right `contentDescription` per state and `SegmentedToggle` reports selection.
  If the module has no Compose-UI-test dependency, assert the pure `statusLabel`
  mapping instead and note it in STATUS.

## Acceptance criteria

- [ ] `grep -rn "AssistChip" android/app/src/main/kotlin/com/chesslab/tracker/ui/Components.kt` → no hits (StatusPill replaced it).
- [ ] `StatusPill`, `SegmentedToggle`, `SubTabRow`, `BoardFrame`, `PrimaryButton`, `GhostButton`, `QuietButton`, `DangerButton`, `KeyValueRow` all exist and are `@Composable`.
- [ ] `ui/Overlays.kt` defines `OverlayToast`, `OverlayBanner`, `OverlayCard`, all `BoxScope`-scoped.
- [ ] Every interactive component keeps `.heightIn(min = 48.dp)` and a `contentDescription`.
- [ ] `:app:ktlintCheck :app:detekt` zero new findings.

## Do NOT

- Do not edit any screen file (`TrackingScreen`, `CalibrationScreen`, `SettingsScreen`,
  `HistoryScreen`) — phases 02/03/06/07 consume these components.
- Do not introduce color literals — read `MaterialTheme.colorScheme` / `BoardPalette`.
- Do not remove the a11y semantics from the components you replace.
