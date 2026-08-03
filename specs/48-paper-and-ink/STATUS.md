# 48 — Status

| Phase | State | Note |
|---|---|---|
| Entry | `done` | written 2026-08-03 from a reviewed and approved visual proposal; rule 6 added the same day |
| Implementation | `done` | 2026-08-03, three commits. Gate green with `--rerun-tasks`, smoke test green on `Chesslab_Agent2` |

## Measured before the pack was written

| Fact | Value |
|---|---|
| Dark surfaces `background` / `surface` / `surfaceRaised` | `#1A1714` / `#221E1A` / `#2E2822` — 20 luminance steps across all three |
| Light surfaces `background` / `surface` | `#F3EDE3` / `#FAF6EF` — 7 steps |
| Accents in use for the SAME act | `primary #DEA76A` on Home, `accent #B3CC84` in the banner |
| Monospace carrying structure | section labels, tab labels, the in-progress banner |
| Places the app shows pawns where the user reads | 3 (specs/47 §2.2) |
| Duplication on the screen meant to consolidate | "Games" as a disclosure row AND as a stat tile |

The proposal, with swatches, primitives, panels and before/after mockups:
<https://claude.ai/code/artifact/5922f053-df04-4e49-82d6-3edb53c411e5>

---

## What shipped

### The palette

| Token | Was | Is |
|---|---|---|
| `InkPalette.background` | `#1A1714` | `#100E0C` |
| `InkPalette.surface` | `#221E1A` | `#1B1713` |
| `InkPalette.surfaceRaised` | `#2E2822` | `#241F1A` |
| `InkPalette.outline` | `#574B3F` | `#453B31` |
| `PaperPalette.background` | `#F3EDE3` | `#EAE3D5` |
| `PaperPalette.surface` | `#FAF6EF` | `#FBF8F2` |
| `PaperPalette.surfaceRaised` | `#E8DFD1` | `#F2ECE1` |
| `PaperPalette.outline` | `#C3B49E` | `#B9A88E` |

Every card and tile is drawn with a 1 px `outline` border. Elevation by fill is retired: the app bar
sits on the GROUND with a rule under it (it was a solid 64 dp band of `surfaceRaised`), stat tiles
are a border and no fill, and `surfaceTint` is `Transparent` so Material cannot re-introduce a tonal
wash on a dialog or a menu.

### One accent

Material's `primary` **role** is the palette's `accent`, so every button, link, slider and progress
bar the framework colours for itself lands on the one hue with no call-site churn. The palette's own
`primary` is furniture and the two components that are furniture name it explicitly —
`chesslabSwitchColors()` and `chesslabChipColors()`. Home's *Resume* and the banner's *Resume* are
one colour.

### Monospace

`labelMedium` was the ONE monospace style and it was carrying the section labels, the tab labels, the
banner and the chips. It is the body face now — semibold, 1 sp tracking — and two styles are named
after what monospace is FOR: `Figures` (14 sp mono: evals, move numbers, counts, fps, every debug
table column, the ply nav) and `FiguresDisplay` (see judgement 4).

### The twelve primitives

All in `ui/Chrome.kt`, one implementation each, each KDoc'd with what it is NOT for: card · stat tile
· ruled disclosure row · section label · filled / outline / text / outlined-danger button · chip ·
severity stripe · empty state · **destructive confirmation**. `Card` and `SectionButton` left
`ui/settings/`, which six other packages were importing them from.

### The four IA changes

1. **Home is a launcher.** The four stat tiles and the `Games` row that counted the same thing as the
   `Games` tile are gone. Home is *Start / Resume*, the last three games, `All games ›` and
   `Settings ›`. The statistics are on Games as `LibraryStats`.
2. **Moments is the first tab**, always enabled, and it carries the rating card and the "Review this
   game" button so an ungraded game has somewhere to land.
3. **Board calibration** is a Settings row on the same `ROUTE_CAMERA` the tracker reaches.
4. **Names at the end** — already shipped by specs/47; nothing to do.

### Rule 6 — every irreversible action confirms

One `ConfirmDialog`, six call sites: delete game · discard a played game · reset all settings · reset
one group · delete a recorded session · recalibrate mid-game. Undo, Stop tracking and End game
deliberately get none.

---

## Line count

Measured over `android/app/src/**/kotlin`, blank lines and comments excluded, `d56424a` → HEAD:

| | files | lines | code |
|---|---|---|---|
| main sources before | 156 | 22 838 | 15 371 |
| main sources after | 157 | 23 327 | 15 606 |
| **delta** | **+1** | **+489** | **+235** |
| tests before | 88 | 10 784 | 8 134 |
| tests after | 89 | 10 912 | 8 206 |

**Read it honestly. The pack asked this not to grow the tree and it grew it by 235 code lines.**
`Chrome.kt` went 151 → 363 (+212) and `LibraryStats.kt` is +40, so **everything else together is
−17 — flat, not negative**, exactly as specs/47 found. The vocabulary is where the growth is, and
two thirds of that is genuinely new surface rather than moved code: the four button primitives, the
severity stripe, the empty state, the rule, `StatRow`, `percent`, `Figure` and `ConfirmDialog` did
not exist before. Rule 6 alone is a primitive plus six call sites and it arrived after the estimate.

What the vocabulary bought back is invisible in this table: `PrimaryButton` (Home),
`SectionButton` (settings), `ActionButton` (tracker) and four hand-rolled `TextButton { Text(color =
Accent) }` shapes collapsed into four named ones, and `Card`/`StatTile` are now one drawing each
rather than four. The next screen is cheaper; this one was not.

---

## Judgement calls the pack did not cover

1. **`PaperPalette`'s numbers are mine.** The entry gives the four dark hexes and says "do the same
   arithmetic" for light without values. The same arithmetic is not the same *direction*: dark bought
   its edge by taking the ground DOWN, and light cannot. So the light ground moved AWAY from the
   cards (9 steps → 22) and the light rule moved TOWARD the ink (`#C3B49E` → `#B9A88E`), where the
   dark rule went the other way. `PaperPalette.surfaceRaised` was also *darker* than its `surface` —
   the stack was inverted there and nowhere else — and now sits between the ground and the card.
2. **The mockups' accent `#c3dd8f` was not used.** The artifact's phone mockups carry their own
   colours and their "next" accent is one step brighter than the palette's. "No new colour is
   invented" won: the accent is `#B3CC84`, unchanged.
3. **Material's `primary` role carries the accent rather than every call site being edited.** The
   alternative was ~40 explicit `color = Accent` arguments and a permanent invitation to forget one.
   The cost is that the two furniture components need explicit colours, which is two helpers.
4. **`FiguresDisplay` is NOT monospace, and that is a correction to the design.** The proposal's stat
   tile specimen is tagged `num-mono`; built at 22 sp on the device, `1 of 1` came out with the `of`
   floating between two wide gaps and `69 %` read as two separate words. What a large number needs to
   line up with the one beside it is **tabular figures** (`tnum`), not a monospace FACE — the face
   brings a typewriter's letter spacing with it. `Figures` at 14 sp is genuinely monospace and looks
   right; the display size is the body face with `tnum`.
5. **Two more irreversible actions than the pack listed**, both now confirmed:
   **resetting ONE settings group** (the same tuning loss as resetting all of them, in one tap) and
   **deleting a recorded session** (those frames are the only copy; nothing on the phone reads them
   back, so the loss is discovered on the PC or not at all).
6. **One action the pack listed is not irreversible, and it did NOT get a dialog.**
   `SessionCapture.capReached` only STOPS the recorder — it never prunes. Lowering the storage limit
   below what is on disk deletes nothing and is undone by raising it again. A dialog reading
   "12 sessions, 141 MB, will be deleted to fit" would have been a lie in the UI. It gets a sentence
   instead, shown only while the limit is exceeded: *"Recording is stopped: what is on disk is
   already over this limit. Nothing is deleted — raise the limit and it resumes."*
7. **The discard confirmation is a second dialog on top of the end-game dialog.** `EndGameDialog`
   already interrupts, but its *Discard* was a one-tap destructive outcome inside it. It reads
   `Discard…` now and opens the confirmation. Two stacked dialogs is clunky and it is what the rule
   asks for; the alternative was making the end-game dialog itself destructive-by-default.
8. **"Cancel is the default focus" is not implementable as written.** Compose's `AlertDialog` gives
   no button initial focus at all. What the primitive guarantees instead is that *nothing* takes
   focus, so no keyboard or accessibility gesture reaches the destructive button before the harmless
   one, and that tapping outside cancels.
9. **`DangerAction` keeps Material's roomy side padding** where the other three use a tight
   `ACTION_PADDING`. Three outline buttons only fit across a phone at 8 dp; at 8 dp inside a dialog
   the outline hugged the word and read as a badge rather than a button.
10. **The `Accept CNN position` button is ACCENT-filled inside a danger-bordered card.** It was
    filled `danger`. Rule 2 says danger is state and state is not an accent — the stripe, the border
    and the headline carry the alarm; the button is the way out of it. It is the tracker's one filled
    button while the alarm is up, which is why `Stop tracking` is outlined while running.
11. **Rule 5 was already closed by specs/47 for the UNIT; the PRESENTATION was not.** Nothing in the
    app printed pawns. But `53 %` (review), `53%` (eval bar), `−10%` (score sheet) and `69%`
    (accuracy) were four formatters for one quantity. One `percent()` decides now, `SLOT_WIDTH` grew
    40 → 52 dp so the space is not a reason to disagree, and a test asserts the four writers produce
    the same string. `moveImpactLabel` also stopped being able to print `−0 %`.
12. **`SectionHeading` uppercases its own text** so a call site writes "Recent games" the way it
    would say it. The rendered label is unchanged, which keeps the screenshots comparable.
13. **`TrackingScreen`'s five modal booleans became one `TrackerModal` state.** Detekt's `LongMethod`
    forced a restructure rather than a suppression, and at most one of those five could ever be up —
    an invariant five independent flags did not enforce.
14. **`SettingsList`/`landing` take one `SettingsNav` holder** rather than six threaded callbacks,
    for the same reason (`LongParameterList`, no suppression).

---

## What running it changed

- **A row of stat tiles was ragged**, because one note wrapped to two lines and the other did not.
  `StatRow` gives the row an intrinsic height and each tile fills it; the accuracy note lost
  "over" and the frames note lost "recorded" to stop the wrap at its source.
- **`FiguresDisplay` was monospace for one build.** See judgement 4 — it was wrong on the device and
  right in the mockup.
- **The `Delete` button read as a badge.** See judgement 9.
- **The smoke test asserted a Home row that no longer exists.** `scripts/android-smoke.ps1` checked
  for `Games`; Home's library row is `All games` now.
- **`PaperAndInkTest` caught the design's own claim.** The first version asserted the ground had
  moved away from the cards in both palettes. It has not in DARK — 17 steps before, 17 after — and
  that is deliberate: the answer to a flat screen is a hairline, not more contrast. The test asserts
  the rule's visibility and the stack's order instead, which is what actually changed.

---

## Verification

| | |
|---|---|
| Gate | `:app:ktlintCheck :app:detekt :core-engine:detekt :core-engine:ktlintCheck :core-engine:test :core-geometry:test :app:testDebugUnitTest --rerun-tasks` — **BUILD SUCCESSFUL**, 93 tasks executed |
| Emulator | `Chesslab_Agent2` / `emulator-5556`, headful x86_64 API 35, 1440x3200 @ 560 dpi |
| Smoke | `Camera feed confirmed: camera 26 fps` |
| Stored game | `2026-08-02_2159`, the recovered 83-ply game, survived every install |
| Suppressions | none. No `@Suppress`, no baseline entry. Three detekt findings (two `LongMethod`, one `LongParameterList`) and one `MagicNumber` were restructured or named |
| Spacing | `Dimens.kt` untouched; `DpLiteralGuardTest` green, still 12 tokens |
| Screenshots | `screenshots/{light,dark}/paper-*.png`, 13 per theme, beside specs/47's `after-*.png` |

New tests: `PaperAndInkTest` (the rule's visibility, the surface stack's order, Material's `primary`
being the accent, monospace confined to the figure styles) and
`EvalBarLabelTest.everyWriterOfAPercentageWritesTheSameString`.

## Not done, and why

- **Anything on the reference phone.** No physical device was attached at any point. Every verdict
  here is at 560 dpi / 411 dp; the phone is ~600 dpi / ~384 dp.
- **The camera screen's chrome is unchanged.** `CameraChrome.kt` is deliberately always `InkPalette`
  over a photograph and is not scaffolded; none of the five rules bites there.
- **`PieceWhite`/`PieceBlack` are still the same hex in both palettes.** Stated by specs/47, still
  true, still works — board contrast is carried by `BoardLight`/`BoardDark`.
