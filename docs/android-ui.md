# Android UI — primitives, rules, spacing

The design system of the Android app: what a screen may be built from, what it must obey, and what
it may measure in. Recovered from the retired spec packs `specs/47` ("one interface") and `specs/48`
("paper and ink"); the packs are gone, this page is the reference.

Facts only. Every row names its spec and, where it exists, the Kotlin that implements it. Verified
against the tree on 2026-08-20 — drift is listed at the bottom rather than hidden.

Related: `docs/android-emulator.md` (how to look at these screens), `CLAUDE.md` §Android
(contentDescription and the 12 dp token rule as a working convention).

## The 6 rules

`specs/48` calls them "the five rules" and lists six — the sixth was added by the user on
2026-08-03. Both the heading and the acceptance criterion still say five; that is a spec defect, not
a missing rule.

| # | Rule | Enforced by |
|---|---|---|
| 1 | Containers are separated by a **rule**, not by a fill difference. | `ui/Chrome.kt:185` `Rule`; test `PaperAndInkTest.theRuleIsVisibleAndTheSurfaceStackIsInOrder` |
| 2 | **One accent.** Actionable is `accent`; `primary` is furniture; state is not an accent. | `ui/theme/Color.kt:51-58`; test `PaperAndInkTest.materialsPrimaryRoleIsTheOneAccent` |
| 3 | **One filled button per screen**, and it is what the screen is for. Destructive is outlined, never filled. | `Chrome.kt:433-437`, `:492-498` — **KDoc only, not test-enforced** |
| 4 | **Monospace is for figures that align.** Never a heading, never a label, never prose. | `Chrome.kt:415-421` `SectionHeading`; test `PaperAndInkTest.theOnlyMonospaceStyleIsTheOneNamedAfterFigures` |
| 5 | **One quantity, one unit.** Win expectancy is per cent — beside the board, in the list, in the tracker. Pawns appear nowhere the user reads. | `Chrome.kt:622` `percent()`, `ui/analysis/EvalBar.kt:66-72`; test `EvalBarLabelTest.everyWriterOfAPercentageWritesTheSameString` |
| 6 | **Every irreversible action confirms.** A rule with a component, not a preference. | `Chrome.kt:593` `ConfirmDialog`, six call sites |

Rule 5 closes a defect `specs/47` §2.2 found: win expectancy was shown in three places in
inconsistent units.

## The 12 primitives

*"Every screen is built from these; if a screen needs a twelfth, either it is genuinely new or the
screen is wrong."* Each is KDoc'd with **what it is not for** — that column below is verbatim from
`specs/48`, and it is the load-bearing half.

| # | Primitive | Not for | Implementation today |
|---|---|---|---|
| 1 | Card | a single value — a lone value is a tile | `ui/Chrome.kt:307` |
| 2 | Ruled row | the rule belongs *between* rows, never around them | `Chrome.kt:185` `Rule` |
| 3 | Disclosure row | its subtitle says what you will find, not what the screen is called | `Chrome.kt:385` |
| 4 | Stat tile | a number nobody measured; a zero on a fresh install (the empty state replaces the grid) | `Chrome.kt:332`, `StatRow` `:357` |
| 5 | Buttons — filled / outline / text / outlined-danger | more than one filled per screen; a filled destructive | `Chrome.kt:439` / `:456` / `:476` / `:500` |
| 6 | Chip group | selection uses `primary`, so it never competes with the filled button | **deleted** — see drift |
| 7 | Switch row | a consequence needing a paragraph — that needs its own subpage | `ui/settings/Preferences.kt:36`, `ui/settings/KnobRow.kt:33` |
| 8 | Status header | the only place allowed to be loud | `ui/tracking/TrackingScreen.kt:639` `StatusLine` (unnamed as a primitive) |
| 9 | Severity stripe | colour alone — the 3 px edge is the point; three levels, no more | `Chrome.kt:533` |
| 10 | Eval bar | any unit but per cent | `ui/analysis/EvalBar.kt:86`, `:133` |
| 11 | Section label | monospace | `Chrome.kt:423` `SectionHeading` |
| 12 | Destructive confirmation — *"the only one that may interrupt"* | (see rule 6) | `Chrome.kt:593` `ConfirmDialog` |

**The two lists in `specs/48` do not agree.** Its `entry.md` design table is the one above;
its `STATUS.md` "twelve primitives" list drops *switch row*, *status header* and *eval bar*, splits
the four buttons into four entries, and adds **empty state** (`Chrome.kt:557` `EmptyState`). Both
are recorded; neither was reconciled before the pack was retired.

## The 12 spacing tokens

`specs/47` collapsed 26 ad-hoc dp values into these. One 4 dp grid, with a 2 dp half-step for
optical pairs inside one text block. All twelve exist unchanged in
`android/app/src/main/kotlin/com/chesslab/tracker/ui/theme/Dimens.kt`.

| Group | Token | dp | For | Dimens.kt |
|---|---|---:|---|---|
| `Space` | `hair` | 2 | title ↔ subtitle in the same block; nothing else | `:25` |
| | `xs` | 4 | icon ↔ label, chips in a row | `:28` |
| | `sm` | 8 | siblings inside a card | `:31` |
| | `md` | 12 | screen side margin, card inner padding | `:34` |
| | `lg` | 16 | between sections | `:37` |
| | `xl` | 24 | above a new block on a long page | `:40` |
| `Radius` | `sm` | 8 | chips, inline blocks | `:46` |
| | `md` | 12 | cards, panels | `:49` |
| | `lg` | 16 | sheets, dialogs | `:52` |
| `Stroke` | `hairline` | 1 | — **not spacing; must not be drawn from `Space`** | `:57` |
| | `thick` | 3 | — | `:58` |
| `Touch` | `min` | 48 | Material's minimum touch target — a rule, not a layout choice | `:64` |

Guard: `DpLiteralGuardTest.everyDpLiteralInTheUiIsANamedComponentSize` and
`.theScaleHasTwelveTokens`. *"A `.dp` literal in a `ui/` file is either a component **size** with a
name, or it is a bug."* 13 component sizes stay named and local. Live usage under
`android/app/src/main/kotlin`: `Space` 194, `Stroke` 26, `Radius` 15, `Touch` 5.

Decision recorded with the scale: 6 dp became 8 dp (`Space.sm`), moving 24 gaps — deliberate, so the
grid stays a 4 dp grid.

## The dpi caveat: every verdict here was made on an emulator

**No physical device was attached at any point during `specs/47` or `specs/48`.**

| | emulator | reference phone (Poco F7 Pro, `24117RK2CG`) |
|---|---|---|
| `wm size` | 1440x3200 | — |
| `wm density` | 560 dpi | ~600 dpi (**~7 % denser**) |
| width | 411 dp | ~384 dp |
| the same app bar | 224 px | 240 px |

**Layout verdicts survive that; anything decided on a few dp does not.** `adb shell wm size && adb
shell wm density` settles it in two lines when a phone is attached — and attaching one destroys its
data (`CLAUDE.md`), which is why none was. Nothing in this document has ever been seen on the
reference phone.

No Kotlin file encodes this caveat; `DpLiteralGuardTest` is density-independent by construction
(it lints source text, not rendered pixels). Also relevant: the emulator cannot calibrate at all, so
the tracking screens have never been screenshotted in a real tracking state — see
`docs/android-emulator.md`.

## Drift between the specs and the code (2026-08-20)

- **The chip primitive no longer exists.** `ChesslabChip` and `chesslabChipColors` were deleted in
  `ae56263b` ("refactor: delete what does not run on the phone", 2026-08-07). Left behind: an
  orphaned chip KDoc at `Chrome.kt:518-524` that now decorates `SeverityStripe`, a dangling
  reference in `ui/theme/Color.kt:56`, and two raw `FilterChip` call sites with local colours
  (`ui/camera/CameraControls.kt:269`, `ui/debug/EvidencePanel.kt:57`).
- **`Chrome.kt:76-81` still says "Eleven primitives (specs/48)"**, contradicting `48/STATUS.md`'s
  twelve.
- **Three primitives were never consolidated into `Chrome.kt`** — switch row, status header and eval
  bar live in `ui/settings/`, `ui/tracking/` and `ui/analysis/`, which contradicts `48/STATUS.md`'s
  claim that all twelve are in one file.
- **Rule 3 is unenforced.** It is the only rule with no test.
