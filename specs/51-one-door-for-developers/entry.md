# 51 — One door for developers

The user, 2026-08-04: *"remove the debug menu, hide most of the settings inside a developer menu."*

Settings currently offers six groups of tracker-tuning knobs, a Debug entry, and — mixed in among
them — the three or four things a person who plays chess would actually change. The ratio is wrong:
almost everything on the screen is a tuning knob for the machine, and the settings that belong to
the user are outnumbered roughly ten to one.

## What is actually a user setting

| Group | Whose |
|---|---|
| **Spoken moves** | the user's |
| **Recording** (training frames, storage limit) | the user's — it is their storage |
| **Analysis** (the engine budget) | the user's |
| **Camera** | arguably the user's; decide, and say which |
| Motion · Evidence · Vetoes · Scoring · CNN | **the machine's.** ~37 knobs whose usable ranges were established by measurement, not preference |
| Debug | the machine's |
| Reset all to defaults · settings export | the machine's |

`KnobCatalog` already did half of this job on 2026-08-02: it went from *"every `TrackerConfig`
field"* — 46 sliders, because a test asked only that each field had a row — to a curated set with a
`NOT_A_SETTING` table that states, per knob, why it is not a decision. **This pack finishes that
thought.** The knobs that survived curation are still not the user's; they are the ones a developer
tunes on a strange board under a strange lamp.

## The change

**Settings shows what a player changes.** Three or four entries, and nothing else.

**One `Developer` entry holds the rest** — the six tuning groups, the diagnostics the Debug screen
offers, reset-to-defaults and the export. One door, clearly labelled as not being for everyday use.

**The Debug menu as a separate destination goes.** Its panels are diagnostics and diagnostics belong
behind the developer door, not beside "Spoken moves".

**Do not delete the debug panels.** `ui/debug/` is thirteen files — the decision log, the CNN reads,
the crop grid, the evidence and timing panels — and they are how this project has diagnosed every
live failure it has had. `CLAUDE.md` records several conclusions that exist only because someone
could open that screen. The instruction is *remove the menu*, and moving it behind Developer does
that. If any panel is genuinely dead, say which and why rather than assuming.

## The search field

The user, 2026-08-04: *"the search box does not fit the ui, make it a basic search input field with
textinput, magnifying glass icon to the right."*

Today it is a large rounded container whose placeholder — *"Search settings — try \"shadow\", \"cnn\",
\"timeout\""* — wraps to two lines and makes the tallest thing at the top of the screen a hint about
how to use a search box.

Make it an ordinary single-line text field with a magnifier on the **right**. The examples are not
placeholder material; if they are worth keeping they belong in the empty result, where somebody who
found nothing can use them.

**The reference is Android's own Settings app** — the user, asked what shape they meant: *"like
android does it in the settings."* A single rounded bar across the top, one line, the placeholder a
plain "Search settings", the magnifier as an icon in the bar. Match that, with the icon on the
right as asked. It is a well-known shape and the point of naming it is that nothing needs inventing.

**Where it lives is still a question.** Search exists because the screen had 46 sliders. With the
tuning knobs behind the developer door, Settings is three or four rows, and a search bar above four
rows is furniture — while the developer screen, which now holds the long list, is exactly where
someone hunts for `censusThr`. Put it where the list is. If it earns a place on both, say why.

## Open, and decide it rather than asking

Whether the developer door needs a gate — a switch, a tap count, nothing at all. There is already a
`debugEnabled` app setting driving `DebugRow`, so the mechanism exists. **Nothing here is dangerous
in itself**, but a stray tuning knob has silently stopped the tracker before, which is the argument
for a deliberate act rather than a stumble. Pick one, implement it, write down why.

## Constraints

- **specs/48's six rules apply**, and rule 6 in particular: *Reset all to defaults* is irreversible
  and already needs its confirmation. Moving it must not lose that.
- `KnobCatalogTest` asserts that the catalogue and `NOT_A_SETTING` partition the config exactly.
  That test stays green — this pack moves rows between screens, it does not change which knobs
  exist.
- Keep it lean. This is a move, and a move should not add.
- Every route that disappears comes out of `ChesslabNavHost` too. specs/47 already found one
  byte-identical alias route left behind by a move like this.

## Acceptance

- Settings fits one screen without scrolling, and everything on it is something a chess player would
  change.
- Every tuning knob and every debug panel is still reachable, through one door.
- `KnobCatalogTest` green; no knob gained or lost.
- Screenshots of Settings and of the developer screen, both themes.
- Android gate green with `--rerun-tasks`.
