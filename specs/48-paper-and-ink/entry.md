# 48 — Paper and ink

specs/47 sorted the app. The user's verdict on the result, 2026-08-03: *"also es ist besser sortiert,
ich finde settings sehr erreichbar, aber das ui sieht ja mal kacke aus."*

The structure is right. The surfaces have no edges. Three measurable things make it read as
unfinished and all three are in `ui/theme/Color.kt` — none of them is the layout.

A visual proposal with swatches, eleven primitives, five panels and before/after mockups was
reviewed and approved: <https://claude.ai/code/artifact/5922f053-df04-4e49-82d6-3edb53c411e5>

## 1. Everything is the same colour

| | Now | Proposed |
|---|---|---|
| `background` | `#1A1714` | **`#100E0C`** |
| `surface` | `#221E1A` | **`#1B1713`** |
| `surfaceRaised` | `#2E2822` | **`#241F1A`** |
| `outline` | `#574B3F` | **`#453B31`** |

Twenty luminance steps span all three today. A card cannot read as a card when its fill is two per
cent lighter than the wall behind it, so a screen made of containers reads as one flat field.

**The fix is a rule, not more contrast.** The palette's own comment names the reference — *"aged
paper, sepia ink, boxwood and walnut"* — and printed matter separates blocks with a line, not with
a drop shadow. Push the ground down, keep the cards near it, and **draw the edge**: every card and
tile gets a 1 px `outline` border. Elevation by fill is retired.

Do the same arithmetic for `PaperPalette`. The light theme is well built (specs/47 §2.7) and has the
same flaw in the other direction: `background #F3EDE3` against `surface #FAF6EF` is seven steps.

## 2. Two accents, no rule

`accent` is sage `#B3CC84`, `primary` is amber `#DEA76A`, and both are used for the same act — on
Home **Resume** is amber, in the in-progress banner one screen away **Resume** is green. Nothing
decides which means what, so the user is asked to learn a distinction that does not exist.

| Token | Rule after this pack |
|---|---|
| `accent` | **The one accent.** Anything the user can act on, and the tracker being live. One hue, one job. |
| `primary` | Furniture only — selected chips, switch tracks. **Never a call to action.** |
| `busy`, `danger` | Unchanged. State, not accent; they may shout because they mean something. |

## 3. Monospace is carrying the structure

`RECENT GAMES`, `YOUR LIBRARY`, the tab labels and the banner are all mono. Mono earns its place
where **digits must line up** — evaluations, move numbers, counts, fps — and nowhere else. Used for
headings it makes a chess app look like a log viewer.

Section labels move to the body face, semibold, uppercase, tracked. Same signal, no terminal.

## The five rules

What a reviewer can hold this to:

1. Containers are separated by a **rule**, not by a fill difference.
2. **One accent.** Actionable is `accent`; `primary` is furniture; state is not an accent.
3. **One filled button per screen**, and it is what the screen is for. Destructive is outlined, never filled.
4. **Monospace is for figures that align.** Never a heading, never a label, never prose.
5. **One quantity, one unit.** Win expectancy is per cent — beside the board, in the list, in the tracker. Pawns appear nowhere the user reads. (specs/47 §2.2 found three places; this closes it.)

## The primitives, and what each is NOT for

Eleven. Every screen is built from these; if a screen needs a twelfth, either it is genuinely new or
the screen is wrong. The second sentence is the load-bearing one — components drift because nobody
writes down when not to use them.

| Primitive | Not for |
|---|---|
| **Card** | a single value — a lone value is a tile |
| **Ruled row** | the rule belongs *between* rows, never around them |
| **Disclosure row** | its subtitle says what you will find, not what the screen is called |
| **Stat tile** | a number nobody measured; a zero on a fresh install (the empty state replaces the grid) |
| **Buttons** — filled / outline / text / outlined-danger | more than one filled per screen; a filled destructive |
| **Chip group** | selection uses `primary`, so it never competes with the filled button |
| **Switch row** | a consequence needing a paragraph — that needs its own subpage |
| **Status header** | the only place allowed to be loud |
| **Severity stripe** | colour alone — the 3 px edge is the point; three levels, no more |
| **Eval bar** | any unit but per cent |
| **Section label** | monospace |

## The panels

In-progress banner · tabbed detail · finding · board cluster · empty state. Each currently exists
twice in two shapes. Two carry rules worth restating:

- **The banner is absent when no game runs** — never present-and-empty.
- **A tab label is a label; a count is a separate node beside it.** `Moments · 25` inside one `Text`
  made the accessible name change while the analysis streamed and broke `tap-text` (`CLAUDE.md`).

## Pages and menu — four changes

Three modes of use, unequal in frequency and length, and the structure should say so. Everything
below keeps the routes specs/47 landed; it moves what sits on them.

1. **Home is a launcher, not a dashboard.** It does two jobs and the second badly: four tiles
   reading `0`, `0 of 1`, `1` on a fresh install, and a "Games" row beside a "Games" tile counting
   the same thing. Home keeps *Resume / Start*, the last game, and two doors. **The statistics move
   into Games**, where the data is — and the duplication goes with them.
2. **Moments is the first tab, not the second.** A finished game is opened to find out what went
   wrong. Review — the board you step through — is where a moment sends you, and it still starts at
   ply 0. Today the reader must walk 83 plies to find the three that mattered.
3. **Calibration gets a second door** in Settings as *Board calibration*, opening the same route it
   has from the tracker. Two entrances to one room is not duplication; someone looking for setup
   looks in Settings.
4. **Names are asked at the end.** Every stored game reads `? vs ?` because nothing captures them,
   and a dialog before a game stands in front of someone who wants to press one button and play.
   The save dialog already interrupts; the two fields belong there. `StoredGame.white`/`black` and
   `GameStore.rename` already exist.

## Acceptance

- The five rules hold on every screen, in **both themes**, with screenshots to show it.
- No new colour is invented: the proposed ground and rule are the existing palette pushed apart, and
  the accent is `accent` already in the file. No font, no asset, no dependency.
- `DpLiteralGuardTest` still passes and the spacing tokens are untouched — this pack is colour,
  type role and information architecture, not spacing.
- Android gate green with `--rerun-tasks`.
