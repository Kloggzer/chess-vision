# Phase 04 — The fourteenth class pays, or it does not ship

> Owns the 14-class dataset build + fine-tune + the replay A/B. Depends on 01 (sessions), 02
> (proposals) and 03 (human-checked corrections). Last phase; heavy compute — ONE worker.

## Why

The bar was measured before the class existed (specs/52 STATUS, 2026-08-08): dense evaluation
(`cnnCheckIntervalS=0.15`, `cnnCooldownS=0.07`) with `autoResyncObsN=1` reads **229/229 real
plies** on the blitz video and **six phantoms** on the calm one — because every mid-hand read
looks clean to a model that cannot say `occluded`. Five consumers are already wired and
waiting (resting-hand veto, recovery clean-board gate, count-discount exclusion,
`cleanCommitsOnly`'s snapshot arm, the `chesslabObs` ledger) — they arm themselves the moment a
served model's class list contains `occluded` (`Observations.kt`, `iOccluded >= 0`).

## Design (decided — do not redesign)

1. **Slice with corrections present** (they are the experiment — note their presence), sessions
   `rg-*` included. New dataset NAME; if twinning an existing dataset, copy its `split.json`
   verbatim (CLAUDE.md: splits are not reproducible from parameters).
2. **14-class build**: `occluded` rows survive only in identity builds — verify the build log
   reports them (an occupancy build drops them, §5.12, by design).
3. **Fine-tune the shipping recipe** (id35-80 lineage: BatchNorm, width 0.35, hard-negative
   history). **Sweep the rate** — class-list changes shift class weights and
   `max_empty_ratio`'s effect (CLAUDE.md); a normalizer/recipe is never judged at one rate.
   `--patience 25` (occ_board_acc is floored). Deployment `infer_size` must be in `--scales`.
4. **Judge 1 — path-A sweep**: `scripts/sweep_infer_size.py --paths a --dataset <ds>`;
   phantoms are the veto; re-measure the reference model in the same run (path-A numbers move
   with the profile).
5. **Judge 2 — the replay A/B** (the orchestrator runs it): batch with the new model served,
   THREE arms — baseline knobs, `autoResyncObsN=1`, and `autoResyncObsN=1` + dense evaluation.

## Success criteria (binary, from the measured bar)

- `rec-20260807-135238 score` stays **25 / 0 / 0 under dense evaluation** (today: 14/11/6).
- `rec-20260808-115912` holds **≥ 200 plies** under dense evaluation (today: 229 — regression
  headroom acknowledged; below 200 the class did not pay).
- `rec-20260808-003957` does not regress its baseline 67 under baseline knobs.
- The ledger's `occl=` field reads non-zero during real hand windows (grep any batch log:
  `chesslabObs.*occl=[1-9]` — today structurally zero).
- Path-A: zero phantoms at the operating threshold, misses reported not judged.

If any line fails: the model does NOT ship; STATUS records which consumer misbehaved and the
confusion of the occluded head — a negative result here is a finding about producer quality
(back to 02/03 thresholds), not a reason to relax the gates.

## Steps

1. Build + train — commit `feat(train): the fourteenth class, from the videos themselves`
   (config/dataset names only; weights are not committed).
2. Path-A sweep table — commit `docs(specs): 53-04 — judge 1, path A`.
3. Bundle for the desktop (`android/app/src/main/assets/cnn_model/<name>/` staging per the
   existing model-serving flow) — the orchestrator decides SHIPPING to the phone separately.
4. Replay A/B — commit `docs(specs): 53-04 — judge 2, the dense-evaluation bar`.

## Tests

No new unit tests; the judges are the tests. Targeted sanity: the dataset build log line
counting occluded rows > 0, quoted in STATUS.

## Do NOT

- Do not relax `RECOVERY_OCCLUDED_LIMIT`, `P_OCCLUDED_THR`, or any consumer threshold to make
  the bar — the model earns the gates as they stand.
- Do not reuse old keep-lists or regenerate splits.
- Do not train more than one run at a time (heavy-compute contract), and never overnight
  without the user's go.
- Do not ship to the PHONE in this phase (install wipes are on record; emulator/desktop only).
