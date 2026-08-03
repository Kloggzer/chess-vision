# 49 — The screen you play in front of

The user, 2026-08-04: *"can you also improve the tracking view, die ist etwas clunky."*

It is, and the reason is structural: **the screen has two jobs and one layout.** Getting the camera
working and watching a game are different tasks with different content, and the screen shows the
same arrangement for both — so in each state roughly half of what is on screen is inert.

Measured from `specs/48-paper-and-ink/screenshots/dark/paper-02b-tracker-tracking.png`, 1440×3200:

| What | Height | State |
|---|---|---|
| `WAITING` | ~90 px, the largest type on the screen | a fact you cannot act on |
| the instruction that says what to do | ~40 px, grey, below it | **the only actionable thing there** |
| an empty move list container | ~500 px | "No moves yet" in a reserved box |
| four outline buttons | ~250 px | none of them primary |
| eval bar | full board height | no game, no evaluation |

## 1. It shouts the state and whispers the task

`WAITING` is the loudest thing on the screen and nothing can be done about it. The line that
matters — *"not calibrated yet — tap Recalibrate and point the camera at the whole board"* — is
small, grey and underneath, and the button it names is **the third of three identical buttons**.

Rule 3 of specs/48 exists for this: one filled button per screen, and it is what the screen is for.
Here nothing is filled, so nothing is primary, while the screen has a very clear current purpose.

**The filled button is whatever the screen needs NOW.** Not calibrated → **Calibrate**. Alarm
latched → the resolution. Tracking quietly → nothing is filled, because watching is not an act.

## 2. The screen that owns the camera does not show it

This is the one that costs the most. When calibration fails you cannot see *why* without leaving
for another screen — and the board drawn here is the position the app **believes**, not the one it
**sees**. In the not-ready state those are unrelated pictures, and the useful one is missing.

## 3. Empty containers where content will be

The move list is a ~500 px box holding the words "No moves yet". specs/48's empty-state rule is one
sentence and one action, never a reserved frame around nothing. The list should size to its content
and grow.

Same for the eval bar: it renders a static split with no game to evaluate. **Absent, not empty** —
the same rule the in-progress banner already follows.

## The two layouts

**A — Not ready.** No calibration, no camera, no frames. The job is to make it work.

- The **camera preview** takes the space, because seeing what the phone sees is the only way to know
  why it is failing.
- **One filled button: Calibrate.**
- The reason, once, in plain words at normal size — not a whisper under a shout.
- No board, no eval bar, no move list. None of them can say anything yet.

**B — Tracking.** The job is to watch a game.

- The status collapses to **one row**: state and fps, with `fps` in `Figures` and the state in the
  body face.
- Board, at the size it has now.
- **The move list grows with its content.** One line when there is one move.
- The eval bar appears when there is an evaluation.
- **Undo** and **End game** stay on screen. **Recalibrate, Camera view, Torch, Share** move into the
  `⋯` overflow, which already exists and already holds some of them.
- No filled button while tracking is nominal.

The alarm card is unchanged and stays where it is: when the latch is set, it *is* the screen's
current job and its resolution is the filled button.

## Constraints

- **specs/48's six rules apply**, and rules 1, 3 and 6 all bite here.
- **Do not change tracker behaviour.** No threshold, no timing, no engine seam. This is the view.
  The one exception is what the overflow already does.
- **Icon-only controls need a `contentDescription`**; the `⋯` menu gains entries, and every one of
  them needs a stable label.
- **`Recalibrate` mid-game is irreversible** (specs/48 rule 6) — it already needs a confirmation and
  moving it into a menu does not remove that.
- Keep it lean. `TrackingScreen.kt` is 517 lines and the package is 2 221; this should not grow.

## Acceptance

- Both states screenshotted, both themes, on the emulator with a clip so the tracking state is real.
- The not-ready state shows the camera and a filled **Calibrate**.
- No empty container anywhere in either state.
- The 18 Blender clips still replay with zero divergence — proof no behaviour moved.
- Android gate green with `--rerun-tasks`.
