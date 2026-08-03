# 47 — One interface

The app's UI identity has drifted. It grew screen by screen over five specs and nobody has ever
looked at the whole of it at once.

The user, 2026-08-03: *"da die UI-Identity sich schon sehr verlaufen hat, und nicht einheitlich ist,
es können bestimmt auch einige Elemente kombiniert werden, ggf anstelle direkt im Tracker anzukommen
ein Dashboard mit Absprungmöglichkeiten und coolen Stats und so."*

## The deliverable is a SKETCH first, and the user reviews it before anything is built

This is the one instruction that outranks the rest. The pack does not begin by editing Compose. It
begins by modelling the interface the app HAS, proposing the interface it SHOULD have, and putting
that in front of the user. Only after that review does implementation start.

Every screen in this app was built well in isolation. The problem is not any one of them.

## Measured 2026-08-03, before the pack was written

| Fact | Value |
|---|---|
| Routes in `ChesslabNavHost` | **8** — tracking, calibration, camera, settings, debug, games, review (live + by id), speech |
| Top-level tabs | **6** — Board, Camera, Games, Spectator, Speech, Settings |
| Distinct `dp` literals in UI code | **18** (8, 4, 12, 6, 2, 10, 1, 3, 52, 14, 48, 34, 18, 16, 0, 94, 88, 76) |
| A spacing/dimension token file | **none** — `ui/theme/` has `Color.kt`, `Theme.kt`, `Type.kt` and nothing for spacing |

So "the paddings are not consistent" is not an impression, it is eighteen numbers and no token to
name any of them. That is the cheapest and most mechanical part of this pack, and it is worth doing
first because every later decision inherits it.

## The landing screen

Today the app opens on **Board** — the tracker. Since specs/42 the app also reviews finished games
with an engine, and since specs/43 it launches with no camera at all, so the first thing a user sees
is a tracker that is not tracking. That is the clearest symptom of the drift: the landing screen is
where the app used to have its only purpose.

The user's proposal is a **dashboard**: jump-off points and stats. Take it seriously and design it
from what the app actually knows — games played and stored, accuracy over time, the last game and
its worst move, whether a calibration exists, whether tracking is running. Do not invent a metric to
fill a card.

## Elements that may combine

Named as candidates to EXAMINE, not as decisions:

- **Camera and Calibration** are separate routes and one concern; specs/35 and specs/36 already
  collapsed three calibration paths and two viewfinders, and this may be the rest of that.
- **Settings, Speech and the analysis controls** are three surfaces over one settings store.
- **Debug** is a route in the main graph.
- The **Spectator** tab is now the same component as the archive review (specs/42) with a different
  source — whether it deserves a top-level tab of its own is exactly the kind of question this pack
  exists to ask.

## Known defects in the review view

Reported by the user on 2026-08-03 and, at the time of writing, being worked by another agent
(Codex) on the review screen specifically. Recorded here because they are evidence about the whole,
not only about that screen — and because if that work lands, these should be verifiably gone:

- The topmost card sits flush against the header, with no separation.
- Too much on one screen.
- The description under the board changes height between plies, which moves the navigation buttons
  under the reader's thumb. A control that moves is worse than a control that is plain.
- The review opens at the LAST ply. It should open at the beginning — that is where a reader starts.

## Non-negotiable

- **Sketch, review, then build.** No Compose edits before the user has seen the proposal.
- **Consolidating means deleting.** This project has twice collapsed duplicated surfaces by removing
  them (specs/35, specs/36 at −935 net lines) and both times that was the change that worked. A
  wrapper around two screens is not a consolidation.
- **No invented statistics.** A dashboard card that shows a number nobody measured is worse than an
  empty dashboard.
- Icon-only controls need a `contentDescription` — the emulator's text-first control and every smoke
  test read Compose semantics, so an unlabelled icon is a control no agent can reach.

## Acceptance

- A model of the current interface, complete enough that the user recognises it.
- A proposal, with what merges, what moves, what goes.
- The user's review on that proposal, recorded, before implementation.
- Afterwards: a spacing scale that exists in one place, and screenshots of every screen.
