# Phase 00 — Measure what the recovery accepts, and on what evidence

## Why

Phase 01 will require a recovery sequence to be **read, not inferred from absence**. Before that rule
is written, three numbers have to exist, or the rule is a guess with a threshold attached:

1. How often does the accepted sequence contain a **capture** whose only support is that a square
   reads empty?
2. How often is the runner-up hypothesis within one square of the winner — i.e. how thin is the
   acceptance in practice?
3. What would an evidence requirement **cost**: how many of the recoveries that are currently
   accepted (and correct) would it reject?

This phase measures. **It fixes nothing and changes no production file.**

## Design (decided — do not redesign)

Write throwaway instrumentation under `scratch/`. Do not modify `cnn_recovery.py`; wrap it.

`ChessCnnRecovery.recover` / the deep search in `cnn_recovery.py:318-375` returns
`(sequence, best, second)`. Wrap the bound method on the tracker's recovery object exactly the way
`scripts/sweep_clip_params.py:instrument_latency` wraps `_commit_move` — read-only, production
behaviour untouched — and record per accepted sequence:

```python
{
  "t": <virtual clock seconds>,
  "ucis": [...],
  "sans": [...],
  "best": float, "second": float,          # as returned
  "best_hits": int, "second_hits": int,    # derive from n if the API gives ratios
  "n_confident": int,
  "captures": [uci, ...],                  # moves in the sequence that capture
  # For each capture: was the CAPTURED square read as EMPTY (inference from absence),
  # or was there positive evidence — the destination confidently OCCUPIED after the move?
  "capture_evidence": [{"uci": ..., "dest_confident_occupied": bool, "dest_read_empty": bool}],
}
```

Run it over **both** sources, with `occ-r3s-f3` and the shipped defaults:

- `scratch/newclip.mp4` (copy it and `corners.json` in from the path named in `entry.md`) via
  `scripts/replay_clip_cnn.py`'s driver, at the default observation pacing `0.055`;
- every clip in `tests/data/testclips/*.mp4` that `pytest -m clips` covers, so the sample is not one
  recording. Their corners come from the same place the clip tests get them — read
  `tests/test_move_tracker_clips.py` (or whichever module carries the `clips` marker) rather than
  inventing a source.

## Steps

### 1. `scratch/recovery_audit.py` (new) — no commit
Instrumentation + a run over the real clip. Print the per-acceptance table and a summary.

### 2. Extend the run to the clip suite — no commit
Same script, `--all`. Keep it to one process: **ONE worker, no fan-out.**

### 3. Write the findings into `specs/20-recovery-honesty/STATUS.md` — commit `docs(specs): 20 phase 00 — what recovery accepts and on what evidence`
The only commit this phase makes. It must answer, with numbers:

- accepted recoveries total, and how many contain at least one capture;
- of those captures, how many have `dest_read_empty and not dest_confident_occupied` — the
  inference-from-absence case;
- the distribution of `best_hits - second_hits` (how many acceptances sit at exactly the margin of 1);
- **the cost estimate**: if acceptance additionally required every capture in the sequence to have
  positive evidence, how many currently-accepted sequences would be rejected, and are any of them
  correct? Judge correctness against the clip's `labels.json` where one exists, and against the
  played game for `newclip.mp4` (its true line begins `e4 e5 Nf3 Nc6`, established 2026-07-27 by
  reading the rectified board: **g1 empty, knight on f3, h3 empty**).

## Tests

None. This phase adds no production code.

## Acceptance criteria

- `grep -rn "cnn_recovery.py" --include=*.py src/` shows **no diff** against HEAD for this phase.
- STATUS.md's phase 00 row is `done` and its session log contains all four numbers above.
- The report states explicitly whether the inference-from-absence case is **common** (phase 01 is
  worth it), **rare** (phase 01 should be narrowed or dropped), or **absent on this material**
  (phase 01 must not proceed on the strength of one live incident alone).

## Do NOT / Out of scope

- Do not modify `cnn_recovery.py`, `tracker.py`, `config.py` or anything under `android/`.
- Do not change thresholds to see what happens — that is phase 01's job and it needs this baseline.
- Do not retrain or re-export any model.
- Do not commit anything under `scratch/`.
