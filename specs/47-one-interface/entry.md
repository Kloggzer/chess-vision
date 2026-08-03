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

The user's proposal is a **dashboard**, sketched by them on 2026-08-03:

> *"Landingpage aka dashboard — 'Welcome back'. Erste Zeile: start recording. 2. Recent games listed
> n her more. Ggf als Panel zweispaltig. Some statistics. Ggf wer gegen wen, musste dann noch in den
> Tracker wer wer ist. Meistgespielte Eröffnung mit Tutorial."*

Read as a layout:

| Row | Content | Notes |
|---|---|---|
| Greeting | "Welcome back" | |
| 1 | **Start recording** | the primary action, and the only one that needs the camera |
| 2 | **Recent games**, a short list, with a way to see the rest | the full library stays where it is |
| 3 | **Statistics** | possibly a two-column panel |

**Design it from what the app actually knows.** The proposal contains three different kinds of item
and they cost very different things:

1. **Free today.** Recent games, results, ply counts, seams and per-game accuracy all fall out of
   `GameStore` and the stored analysis. Games played, accuracy over time, the last game's worst
   move — all readable now.
2. **A small, real addition: who played.** `StoredGame` already carries `white` and `black`, and
   `GameStore.rename` already sets them — **nothing ever captures them**, which is why every game
   reads `? vs ?` on the device. The user saw this too: *"musste dann noch in den Tracker wer wer
   ist."* So the tracker needs to ask, once, at the start of a game, or offer it at the end. The
   model is ready; the capture is missing. Design where that question lives so it does not become a
   dialog in front of a person who wants to press one button and play.
3. **New, but far cheaper than it looks: the most-played opening.** The app cannot name an opening.
   It has no opening book at all — which is also why `MoveQuality.BOOK` is unreachable and specs/42
   recorded it as a band nothing produces. **One book serves both**: the dashboard statistic and the
   BOOK category the grading already has a slot for.

   The user asked whether a library exists. There is one (`CompactChessOpenings`, Java 7+), and the
   recommendation is **not** to take it. What is needed is a lookup TABLE, not an algorithm, and the
   table exists as public-domain data: [`lichess-org/chess-openings`](https://github.com/lichess-org/chess-openings),
   **CC0**, 3 704 openings, TSV per ECO volume, and the `dist/` rows carry `eco`, `name`, `pgn`,
   `uci` and **`epd`**. A dependency for a `HashMap` lookup is a dependency for nothing, and
   `chesslib` — already on the `:core-engine` classpath — does not do this at all; it is the board
   and move library.

   **And its key is already ours.** The repository describes its `epd` as *"EPD (FEN without move
   numbers) of the opening position, en passant field only if legal"* — which is, word for word, the
   cache key `specs/46` specifies for the analysis store, including the en-passant trap flagged
   there. Lichess normalises the position the same way, independently. So **one normalisation
   function serves both** the opening lookup and the position cache, and the two packs should share
   it rather than each write their own.

   CC0 also settles the licence question before it is asked: unlike chess.com's accuracy formula
   (proprietary, approximable only), this is public-domain data that may simply be shipped, with
   attribution as courtesy rather than obligation.

   *"mit Tutorial"* is a fourth thing again — teaching content, not code. Do not write chess
   instruction into this app. Either link an existing source or drop it; an invented explanation of
   an opening is exactly the fabrication this project refuses elsewhere.

**Do not invent a metric to fill a card.** Every number on the dashboard must be traceable to
something the app measured. A card with no data yet should say so, or not exist until it has any —
a brand-new install has no games, and the dashboard's empty state is a design problem in its own
right, not an afterthought.

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
