# Phase 00 — Is confident identity precise enough to arm the alarm?

## Why

The alarm does not need good piece recognition. It needs identity that is **right when it says it is
sure**, because every consumer gates on confidence:

```python
lc = obs.label_confident(conf_thr)                 # cnn_recovery.py:438
confident = {sq for sq, ok in lc.items() if ok}
conflict  = {sq for sq in confident if obs.label[sq] != exp[sq]}
```

A wrong-but-confident label produces a **false alarm**: the tracker latches, blocks every commit and
demands the user resolve it. That is the failure mode to fear here — the opposite of today's silence,
and no better.

So the number that decides this pack is **precision at the operating confidence threshold**
(`config.TRACK_DEFAULTS["cnn_conf_thr"]`, currently 0.85), not top-1 accuracy. Nine 14-class runs
already exist. **No training in this phase.**

## Design (decided — do not redesign)

Score each existing 14-class run on the real holdout named in `entry.md` — sessions
`20260708-021722` and `20260721-212830`, 9,728 crops, unseen by every `occ-*` run and by the 14-class
runs alike (verify that claim per run against its `dataset.yaml` `session_ids` and record it; if a
run trained on one of them, exclude that run and say so).

Report, per run:

| metric | why it matters |
|---|---|
| coverage: fraction of crops with `conf ≥ 0.85` | how often the alarm can see anything at all |
| **precision on those** | the false-alarm rate is `1 − precision` |
| precision split by `empty` vs piece | `empty` is ~0.99 already; the piece classes are the question |
| confusions among confident errors | wK→wQ and the dark-piece collapse are known (see MEMORY) |
| **`guess_illegal_move` fire rate on a CORRECT board** | the direct false-alarm probe: feed the true FEN and the observation of that same board; any non-`None` result is a false alarm |

The last row is the decisive one and must be measured on real frames with known-correct FENs. Use
`data/_device/20260728-runaway/sessions/*/log.jsonl` frames **only where the FEN is trustworthy** —
that is, sessions whose plies were NOT `cnn_recovery` (check the matching game record's provenance).
Say how many boards you could use.

## Steps

### 1. `scratch/identity_probe.py` (new) — no commit
ONNX or torch inference per run over the holdout; the table above.

### 2. The false-alarm probe — no commit
`guess_illegal_move(true_board, obs, 0.85)` over every trustworthy real board. Count non-`None`.

### 3. STATUS.md — commit `docs(specs): 21 phase 00 — confident-identity precision and the false-alarm rate`

## Acceptance criteria — and the gate this phase IS

State one of three verdicts explicitly:

- **GO** — some run reaches ≥ 0.98 precision at `conf ≥ 0.85` on piece classes AND fires
  `guess_illegal_move` on **≤ 1 %** of correct boards. Name the run and the numbers; phase 01 trains a
  two-stage model to that standard or better.
- **GO WITH A HIGHER THRESHOLD** — the precision target is met only above 0.85. Report the threshold
  where it is met and the coverage left at it. A new knob `alarm_conf_thr` (separate from
  `cnn_conf_thr`) then belongs in phase 02, because commits and alarms would need different bars.
- **STOP** — no run and no threshold clears it. Then the alarm cannot be armed from this model family
  and the pack ends here; record what the ceiling was.

`git diff HEAD -- src/ android/` must be **empty** for this phase.

## Do NOT / Out of scope

- No training, no export, no model swap.
- Do not touch `src/**` or `android/**`.
- Do not judge a run by `val_acc` or by the numbers in `specs/18-occupancy-model/` — those were
  measured on a network with zero activations (MEMORY: `cnn-groupnorm-deletes-relus`) and are
  suspect. Measure fresh.
- Do not use a session that a run trained on. Per-session leakage is the standing trap in this repo.
