# 51 — Status

| Phase | State | Note |
|---|---|---|
| — | `done` | shipped 2026-08-04, branch `worktree-agent-a920ac19b32c6c997` |

## Measured before the pack was written

| Fact | Value |
|---|---|
| Tracker-tuning groups on Settings | 6 — Motion, Evidence, Vetoes, Scoring, CNN, Camera |
| Knobs behind them | ~37, curated down from 46 on 2026-08-02 by `KnobCatalog` |
| Genuine user settings mixed among them | Spoken moves, Recording, Analysis — three |
| Files in `ui/debug/` | 13 panels, all reachable from one Settings row |
| Existing gate mechanism | `debugEnabled` app setting, driving `DebugRow` |

## What shipped

**Settings is the Android Settings pattern**, and holds six rows under three headings:

| Heading | Row | Summary (states the CURRENT value) |
|---|---|---|
| Board | Board calibration | Point the camera at the board and fit the grid |
| Board | Board orientation | White plays from the bottom |
| Playing | Spoken moves | `Off` / `Deutsch · Words` |
| Playing | Analysis | `Off` / `Stockfish · 400 ms a move` |
| Playing | Recording | `Off` / `On · up to 250 MB` |
| Advanced | Developer | Tracker tuning, diagnostics, export and reset |

It fits one screen at 1440×3200 with the last rule at y=2279 of 3200 — no scrolling, measured on
the emulator.

**Developer** holds the search bar, the six tuning groups, `Device & model`, the debug-panel row and
the export/reset footer. Nothing was deleted; every knob and every one of the 13 debug panels is
still reachable, through one door.

## Judgement calls the pack left open

**The developer door has no gate — no switch, no tap count.** Nothing behind it is dangerous to
*look at*; the danger is a stray tuning knob, and a knob needs a deliberate slider drag rather than
a stumble. A hidden entrance would recreate exactly what `specs/12` D5 cost: a bad board under a
strange lamp with no way to fix it in the field. `debugEnabled` keeps its real job one row deeper,
which is gating the debug PAYLOAD's cost, not access to it.

**Board orientation is a player's setting and stayed out front.** The pack asked whether Camera is
the user's; the answer taken here is that four of `Device & model`'s five choices (camera resolution,
CNN model, CNN graph, execution provider) are the machine's and went behind the door, while *which
physical corner is a8* describes the board in front of the user, not the device reading it — and
getting it wrong silently transposes every label. It is its own `SettingsPlace.Board` subpage with
the chips lifted out of `AppSettingsSection`.

**`ROUTE_DEBUG` survives, and no route disappeared.** The instruction was *remove the menu*; what
came out is the row beside "Spoken moves". The debug screen keeps its own route because
`TrackerStatus.debug` is assembled only while that screen is composed, and thirteen tabbed panels do
not belong inside a settings `LazyColumn`. `ChesslabNavHost` is therefore unchanged — there is no
alias route to clean up this time.

**Home keeps the chevron and takes no icon.** Android's Settings could drop the arrow because a
leading pictogram plus a summary stating the current value carry the affordance between them; the
"All games" row on Home has neither — it is a launcher door, not a setting — so the chevron is the
only thing on it that says it goes somewhere.

**The search field's trailing icon is the magnifier when the field is empty and a ✕ when it has
text.** The user asked for "magnifying glass icon to the right" and named Android's own Settings as
the reference; those two agree everywhere except on how a filled field is cleared, and the ✕ is the
only affordance that can empty it.

**`DisclosureRow` gained `icon` and `chevron` BEFORE `onOpen`, not after.** Putting the action last
keeps every existing trailing-lambda call site compiling unchanged — including
`ui/review/GameReviewScreen.kt`, which another agent is editing in parallel. Adding the parameters
after `onOpen` broke that file and Home at once.

**The Recording summary calls `RecordingSettings.load()` from the row.** The prefs cache is the
DEFAULT until the tracker service has wired itself, so without it the row reads "Off" over a running
recorder.

## What the pack got wrong once built

- The pack says *"Keep it lean. This is a move, and a move should not add."* It added **+210 lines**
  in `ui/settings/` (`SettingsScreen.kt` 384 → 552, `SettingsPlace.kt` 79 → 116), plus 30 changed
  lines in `Chrome.kt`. Most of it is the six summary strings and the three row composables that
  read them — the Android pattern's "state the current value" half is not free, because a summary
  that describes the destination needs no data while a summary that states the value needs a flow
  per row. The rest is the second listing (`developer`) and `parentOf`. Nothing here is duplicated
  logic; it is the price of the pattern the user asked for by name.
- The pack assumed `debugEnabled` was a candidate gate for the door. It is not the same thing: it
  gates the payload's COST, and using it for access would mean a developer screen whose diagnostics
  are dark until a switch nobody can see is flipped.

## Verification

- `gradlew.bat :app:ktlintCheck :app:detekt :core-engine:detekt :core-engine:ktlintCheck
  :core-engine:test :core-geometry:test :app:testDebugUnitTest --rerun-tasks` — green.
- `KnobCatalogTest` green; no knob gained or lost. `SettingsNavTest` gained `parentOf` and summary
  coverage.
- Screenshots: `screenshots/{light,dark}/door-0{1,2,3}-*.png`, emulator `Chesslab_Agent3` (5558),
  1440×3200.
- *Reset all to Python defaults* still opens its confirmation (rule 6), verified by tapping it on
  the device; the per-group reset keeps its dialog too.
