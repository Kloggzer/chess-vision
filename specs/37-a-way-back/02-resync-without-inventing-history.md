# 02 — Re-anchor on the board without inventing history

> Owns `core-engine/api/TrackerEngine.kt` (one new action), `service/EngineAction.kt`,
> `service/TrackerBinder.kt`, `ui/tracking/**`. Independent of phase 01.

## Why

When the engine's position and the real board disagree, the user has three doors and none of them
fits:

- **Undo** walks the history backwards. Useful when the engine is one or two moves ahead; useless
  when it is somewhere else entirely, and (before phase 01) it does not even take back what was
  committed.
- **Accept CNN position** adopts a reading from the CNN — the same source that produced the wrong
  position in the first place. In the incident the alarm listed six disagreeing squares, not one; a
  wholesale adoption there is a guess dressed as a fix.
- **Reset game** throws the game away.

What is missing is the honest one: *the board in front of me is right, take it as the position, and
do not pretend you know how we got here.*

That distinction is the whole phase. Every existing path either invents history (`commitRecovery`
fabricates the bridging moves) or destroys it (`Reset game`). Neither says "I do not know the path,
and I am not going to make one up."

## Design

One action: **`ResyncToBoard`**.

It takes the position the user has confirmed, sets the board to it, and **truncates the history** —
recording that a resync happened at this ply rather than a sequence of moves that were never played.
The game continues from there; the moves before the resync stay as they were.

Where the position comes from matters, and it is the one design decision this phase must not fudge.
Two sources are available and they are not equal:

- the CNN's current reading, which is what `acceptCnnPosition` uses, and which is exactly the source
  that can be wrong;
- a position the user states.

**The CNN reading is the default and the user must be able to see it before accepting.** A resync
that adopts a reading nobody looked at is `acceptCnnPosition` with a new name. Show the position it
is about to take — the app already renders a board (`ui/tracking/BoardCanvas.kt`) — and require the
press. If the reading is unavailable or has no identity axis, the action is unavailable; do not fall
back to a guess.

**The history is truncated, not rewritten.** `history` holds SANs; a resync appends nothing. A
reader of the game afterwards sees moves up to the resync, then a marked discontinuity, then moves
again. That is the truth and it is more useful than a plausible fiction.

**What this does to a running game:** adds a door. Nothing existing changes behaviour. `Undo`,
`Accept CNN position` and `Reset game` all keep working; if `Accept CNN position` turns out to be
strictly worse than this once both exist, removing it is a later, separate decision with its own
evidence.

## Steps

1. **`feat(engine): ResyncToBoard`** — the action, the board set, the history truncation, the
   reference invalidation (a resync means the reference is stale by definition), the alarm and stuck
   clear, and one decision row recording that it happened and to which FEN.
2. **`feat(service): the action reaches the engine`** — `EngineAction.ResyncToBoard`, the binder
   method, the queue path. Same shape as the existing actions; nothing new is needed.
3. **`feat(ui): show the position, then take it`** — surfaced where the alarm and the mismatch are
   already surfaced. It must render the position being adopted, not just name it.
4. **`docs`** — one paragraph wherever the recovery actions are described, saying what each of the
   four doors does and when to use it. That list does not exist today, which is part of why the user
   had no way back.

## Tests

- After a resync, `board.fen()` is the confirmed position and `history` has grown by nothing.
- The decision log carries exactly one row for the resync, naming the FEN adopted.
- The reference state is invalidated — a resync must not leave the frame-diff comparing against a
  frame from before it.
- The action is unavailable when the CNN reading has no identity axis. Pin this: the shipped default
  model is 2-class (`assets/cnn_model/shipped/config.json`), so this is the common case, not an edge
  one, and silently resyncing to an occupancy-only reading would throw away every piece identity.
- A game replayed after a resync produces the moves before it unchanged.

## Acceptance

- From the incident's end state — a position no legal move can reach from the board — one press
  returns the tracker to the game, without fabricating the path and without discarding the moves
  that really were played.
- `gradlew.bat :app:ktlintCheck :app:detekt :app:testDebugUnitTest :core-engine:test --rerun-tasks`
  green.

## Do NOT

- Do not auto-resync. Every automatic re-anchor in this codebase is what caused the problem it was
  meant to solve; this one is a door, not a rule.
- Do not fabricate the bridging moves "for completeness". The absence of them is the feature.
- Do not remove `acceptCnnPosition` in this phase. Two overlapping doors are a smaller problem than
  removing the one people already know while the new one is untested on a real game.
