# Phase 07 — Settings screen restyle

## Why

`ui/SettingsScreen.kt` is a flat scroll of default Material controls, and it still hosts
the **overlay-view picker** (`OverlayRow`, `SettingsScreen.kt:149,186-214`) which phase
02 moved onto the Tracking screen. This phase restyles Settings to the new system and
removes that now-duplicated control.

## Design (decided — do not redesign)

File: `ui/SettingsScreen.kt` (+ its shared controls in `ui/Components.kt`:
`SettingSlider`/`SettingSwitch`/`SectionHeader`, `Components.kt:60-127` — restyle, keep
signatures). Depends on phase 02 having removed the Tracking screen's dependence on the
persisted `overlayView`.

### Remove the overlay-view row

Delete the `OverlayRow(settings.overlayView) { … }` call (`SettingsScreen.kt:149`) and
the `OverlayRow`/`overlayLabel` composables (`SettingsScreen.kt:186-214`). KEEP the
`OverlayView` enum and its DataStore persistence — only the Settings UI for it goes.

### Restyle (mockup: Settings)

- Everyday-first grouping is already right (Game, Camera, then Detection advanced,
  Recording, CNN, Experimental, Debug). Restyle `SectionHeader` to a mono uppercase
  label; each row becomes a themed `surface` card (label + optional sub-caption + control
  on the right) matching the mockup; `FilterChip` rows (resolution) restyle to the new
  chip look. Keep every existing setting and its `onUpdate` wiring
  (`SettingsScreen.kt:57-155`) — this is visual only.
- Add a small caption under Debug noting board views now live on the Tracking screen.
- If phase 05/06 landed, add an **Analysis** section: engine depth slider (maps to
  `AnalysisEngine` default depth — store as a new `TrackerSettings` field + DataStore
  key, mirroring the existing pattern in `TrackerSettings.kt`/`SettingsRepository`).
  If 05/06 not yet merged, skip this section (note in STATUS).

## Steps

1. `ui/SettingsScreen.kt` — remove `OverlayRow`/`overlayLabel` + its call — commit `refactor(android-ui): remove overlay-view picker from settings`
2. `ui/Components.kt` + `ui/SettingsScreen.kt` — restyle sections/rows/chips to the new system — commit `feat(android-ui): settings screen restyle`
3. (if 05/06 merged) Analysis depth setting + DataStore key — commit `feat(android-ui): analysis depth setting`

## Tests (write, run once, targeted)

- `:app:testDebugUnitTest --tests "com.chesslab.tracker.ui.*"` — existing
  SettingsRepository mapping tests must still pass; if a depth setting is added, extend
  the mapping test.

## Acceptance criteria

- [ ] `grep -rn "OverlayRow\|overlayLabel\|R.string.setting_overlay_view" android/app/src/main/kotlin/com/chesslab/tracker/ui/SettingsScreen.kt` → no hits.
- [ ] `OverlayView` enum + `SettingsRepository` `OVERLAY_VIEW` persistence still exist (untouched).
- [ ] Every pre-existing setting (game/camera/detection/recording/CNN/experimental/debug) is still present and wired to `onUpdate`.
- [ ] `:app:testDebugUnitTest --tests com.chesslab.tracker.ui.* :app:ktlintCheck :app:detekt` green.

## Do NOT

- Do not remove the `OverlayView` enum or its persistence.
- Do not change any setting's semantics or the live/constructor split
  (`TrackerSettings.requiresEngineRestart`).
- Do not re-add a board-view control here.
- Do not hardcode strings.
