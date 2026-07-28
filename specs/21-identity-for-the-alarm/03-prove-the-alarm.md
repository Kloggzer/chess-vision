# Phase 03 — Prove it fires when it should, and stays quiet when it should not

> **Depends on phase 02.**

## Why

An alarm that fires too readily is worse than one that never fires: it latches, blocks every commit
and re-anchor, and hands the user a dialog. Phase 00 measured the false-alarm rate on still boards;
this phase measures it **through the tracker**, on moving material, and shows the alarm doing its job
on the case that started all of this.

## Design (decided — do not redesign)

Three measurements, all with `scripts/replay_clip_cnn.py`, all deterministic, all against phase 01's
run and `occ-r3s-f3` side by side.

**1. It stays quiet on clean play.** Replay every clip in `tests/data/testclips/` and the real
recording `scratch/newclip.mp4`. Count alarms raised. On material the tracker follows correctly the
answer should be **zero**; any alarm must be explained square by square, not averaged away.

**2. It fires on a real desync.** The 2026-07-28 runaway is the case. Its frames are in
`data/_device/20260728-runaway/sessions/`, but they are per-move stills, not video — so construct the
probe honestly: feed the tracker a board state it believes and an observation of a **different**
position (the fabricated-capture positions from `games/2026-07-28_0052.json` onward), and assert the
alarm latches instead of the recovery committing. State plainly that this is a constructed probe and
not a replay.

**3. Nothing else moved.** The committed move list for every clip must be **identical** to phase 02's
baseline run with the same model. Identity feeds the alarm only; if a move list changes, the safety
property is broken and this phase fails.

## Steps

### 1. `scripts/replay_alarm_audit.py` (new) — commit `feat(scripts): audit where the alarm fires and where it stays quiet`
Reusable, not throwaway: this is the instrument for every future alarm change.

### 2. Run all three — commit `docs(specs): 21 phase 03 — the alarm measured on quiet and on desynced material`

### 3. **The shipping decision** — commit only if 1–3 pass
If they do, ship phase 01's run into `android/app/src/main/assets/cnn_model/` (graph + `config.json` +
the QNN export), rebuild, and record the swap with its numbers — commit
`feat(cnn): ship the two-stage model so the illegal-move alarm can fire again`.
If they do not, **do not ship**, and write what failed. A silent tracker is the status quo; a
false-alarming one is a regression.

## Tests (write, run once, targeted)

1. **A constructed desync latches the alarm** — the probe from measurement 2, as a test.
2. **A correct board does not**, on the same fixture, so the test is not one-sided.
3. **`_clear_alarm` still has exactly its four release paths** (undo / resync / baseline / accept-CNN)
   — pin it, because an alarm that can fire again makes its release path load-bearing for the first
   time in months.

**Prove red first** for test 1 against an occupancy-only observation, where it cannot latch.

## Acceptance criteria

- Alarms on clean material: **0**, or every one explained individually.
- The constructed desync latches, and the recovery does **not** commit through it.
- Move lists identical to the phase 02 baseline on all 21 clips and `newclip.mp4`.
- If shipped: the assets swapped, `BundledGraphShapeTest` green, `:app:assembleDebug` green, and the
  before/after numbers in STATUS.md.

## Do NOT / Out of scope

- Do not tune `desync_obs_n`, `cnn_min_agreement`, `cnn_margin_squares` or `recovery_max_plies` to
  make a measurement come out. If the alarm fires wrongly, that is the finding.
- Do not claim the runaway is "fixed" — this pack restores a safety net that was missing. Whether the
  recovery still fabricates captures when the alarm is armed is a separate question, and the honest
  statement is that the alarm now interrupts it earlier.
- Do not install onto the device yourself; hand the APK path to the user.
