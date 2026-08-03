# 50 — Give the review back

The user, 2026-08-04: *"auf der review seite gibts probleme, die ausarbeitung mit codex war viel
besser, das UI hätte ich gerne wieder für die view mit dem schachbrett"* — and, on being asked
whether the new visual system should go: *"gerne darfst du die design sprache einbringen, aber das
ui springt hin und her und die zweispaltigkeit war besser."*

So: **keep specs/48's design language, restore the elaboration `a5cdfd1` had.** The visual system is
not the problem; two rewrites over the top of it are.

## What was lost, measured

`a5cdfd1` ("overhaul game review experience") was tested and approved by the user. `specs/47`
restructured the navigation through this file and `specs/48` restyled it, and between them the screen
lost work nobody decided to remove.

**The mate explorer is gone and its engine is still running.** No string `Mate available`,
`Explore mate line` or `The engine found a forced mate from this position` exists in the tree, and
`GameReviewScreen.kt` has lost `MateLineExplorer`, `MateMoveCaption`, `MateResolutionStatus` and
`mateLineRequest`. But `analysis/MateLineResolver.kt` is still there, and `ReviewStore` still
**caches resolved mate lines by position hash** (`.analysis-cache/<hash>.mate.json`). The app
computes complete forced-mate variations, persists them, and shows nobody. That is the single
clearest thing to restore.

`GameReviewScreen.kt`: 1110 lines at `a5cdfd1`, 969 now.

**Deliberately removed and staying removed** — do not restore these:

| Gone | Why, and it still holds |
|---|---|
| `LiveReviewRoute` | specs/47: the Spectator tab was the same component with a live source; its share card moved to the tracker's overflow |
| `ReviewContextChip` (the `⚙: move` card) | specs/44: redundant when the played move was best, and it named the engine's move for the position *before* the ply while the board drew its move *from the position on screen* — two positions side by side |

Everything else that the diff shows missing is a regression until someone names a reason.

## The three complaints, and what each is

### 1. "das ui springt hin und her"

Layout shift, and it has been fixed once already. `a5cdfd1` gave the caption under the board a
**fixed-height container** precisely so the navigation row does not move under the reader's thumb
between a one-line and a three-line verdict — the user called it *"mega nervig"* the first time.
Verify it still holds at every ply and in every tab, and if a later change reintroduced it, that is
the regression to fix rather than to re-derive.

### 2. "die zweispaltigkeit war besser"

Diff the review package against `a5cdfd1` and restore the two-column arrangements it had, unless
they are on the exception list above. `AccuracyBlock` for White and Black side by side at
`weight(1f)` is one of them; check for others rather than assuming that is the one meant.

### 3. "Show all moves ist doof clickbar"

*"das braucht mehr platz zu den buttons von android und ggf als outlined button, ich finde es
schwierig die clickzone zu ermitteln."*

Two defects in one:

- **A text button has no visible hit area.** specs/48 ranks text as navigation, which is right for a
  link inside a card — and wrong for the primary way out of a truncated list. `Show all 83 moves`
  becomes an **outline button**, which is exactly what the rank is for.
- **The last item sits against the system navigation bar.** `MainActivity` consumes
  `safeDrawingPadding()` once at the root, so the window is inset — but a `LazyColumn`'s final item
  still ends flush at that boundary, with the Android buttons immediately below. Give scrolling
  content bottom clearance so the last control is never adjacent to the system's.

**This is general, not local.** Every screen ending in a scrolling list has it. Fix it where the
scaffold or the list contract lives, not at one call site.

## Also measured, and this one is mine

In the Moves table the win-expectancy label sits **inside** the position bar and the fill divider
cuts through it — rows 6, 7 and 8 of the shipped screenshot read `73| %`, `68| %`, `67| %` with the
boundary through the number. And `Figures` being monospace puts a wide gap in `0  %` and `−15  %`,
which the specs/48 agent already flagged as a cost.

The unit is right and stays per cent (specs/48 rule 5). The **placement** is wrong: the number
belongs beside the bar, not on it.

### 4. The count in the tab is off centre

*"auch ist die zahl bei moments und moves off center."*

specs/48 required the count to be a **separate node** beside the label, so the tappable accessible
name does not change while the analysis streams (`Moments · 25` inside one `Text` broke `tap-text`;
it is a rule in `CLAUDE.md`). That requirement stands — the presentation of it does not.

Two things are wrong and both need checking against the shipped screenshot:

- **The count does not sit on the label's baseline.** It is smaller type in a `Row`, so it aligns by
  box rather than by baseline and floats. Align the baselines.
- **Each tab centres label-plus-count**, and the counts have different widths, so the *labels* do
  not line up with each other or with the underline the way the reader expects. Decide what is
  centred — the label, with the count hanging off it, is likely right — and make all three tabs
  agree.

## Constraints

- **specs/48's six rules apply.** The design language stays; this pack restores content and fixes
  placement, it does not restyle.
- **Do not touch the analysis maths** — `GameReview.kt`, the thresholds, the node budget, the
  decided-ply exclusion. Only the view.
- Keep it lean. The file was 1110 lines once; restoring the explorer should not overshoot it.

## Acceptance

- The mate explorer is reachable again from a missed-mate finding, and `MateLineResolver` and the
  `.mate.json` cache have a consumer.
- Stepping through every ply moves nothing but the board and the caption's contents.
- `Show all 83 moves` is an outline button with a visible target, clear of the system bar.
- The Moves table's number does not collide with its bar.
- Screenshots of all three tabs, both themes, on a game with a real analysis.
- Android gate green with `--rerun-tasks`.
