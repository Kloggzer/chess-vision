# Phase 03 — the one query

> Depends on **02**. Small phase; the whole point of the pack lands here.

## Why

The pack's promise is "answerable in one query instead of a day". Slice 1 deliberately ships **no
UI** — the read path is grep plus one script. If that script does not exist, the promise is
unredeemed and the JSONL is just a nicer log file.

## Design (decided — do not redesign)

`scripts/why.py` — a thin DuckDB wrapper. **DuckDB is imported lazily and is not a declared
dependency**, which is this repo's existing convention for optional tooling (`matplotlib`,
`pyperclip` in `pyproject.toml`). Absent DuckDB, the message says exactly what to install and the
JSONL is still greppable.

```
python scripts/why.py --game 2026-08-01_1815 [--ply 11] [--rejections-only] [--device …]
python scripts/why.py --run 0f3c…            [--last 40]
python scripts/why.py --stuck                # every stuck transition, newest first
```

The join is the deliverable:

```sql
SELECT d.seq, d.ts, d.payload.move, d.payload.reason, d.payload.decider,
       d.payload.bestScore, d.payload.secondScore, d.payload.changedVals,
       d.payload.shadowVetoed, d.payload.occludedVetoed, d.payload.cnnAgreement,
       d.payload.stuckReason,
       r.payload.config.values.z_thr, r.payload.model.dir, r.payload.model.inferSize
FROM   read_json_auto('data/telemetry/**/*.jsonl', union_by_name := true) d
JOIN   read_json_auto('data/telemetry/**/*.jsonl', union_by_name := true) r
       ON d.run = r.run AND r.kind = 'run_start'
WHERE  d.kind = 'decision' AND d.game = ? AND (NOT ? OR d.payload.accepted = false)
ORDER BY d.seq;
```

**Report the `seq` gaps.** Print, above the table, `rows 1187–1249, 3 missing (1201, 1202, 1240)`
when the sequence is not contiguous. A silent gap is the failure mode the counter exists to expose.

## Steps

### 1. `scripts/why.py` — commit `feat(scripts): answer why-did-this-not-commit in one query`

### 2. `docs/telemetry.md` — commit `docs: the why.py recipes`
Three worked examples using the real cases from 2026-08-01: the `Qxd4` mismatch cycle, the
`motionRecencyS = 0` rejection run, and the 16.5 s `too_many_changed` gap.

## Tests (write, run once, targeted)

`tests/test_why.py` — build a small JSONL tree in `tmp_path`:

- `it_joins_a_decision_to_its_run_config` — the `zThr` in force appears beside the decision.
- `rejections_only_hides_the_commits`.
- `a_seq_gap_is_reported` — drop `seq` 3 of 1–5, assert the gap line names `3`.
- `a_missing_duckdb_gives_an_actionable_message` — monkeypatch the import to raise; assert the
  message names the install command and does not traceback.

```
.venv/Scripts/python.exe -m pytest -q tests/test_why.py
.venv/Scripts/python.exe -m ruff check scripts/why.py
```

## Acceptance criteria

- `grep -n "import duckdb" scripts/why.py` — inside a function, never at module scope.
- `grep -n "duckdb" pyproject.toml` — **no hit**.
- Running it against an empty `data/telemetry/` exits 0 with "nothing ingested yet", not a stack
  trace.

## Do NOT

- Do **not** add DuckDB to `pyproject.toml`.
- Do **not** build a web UI. That is a later slice, and it belongs behind `manifest_cache.py`.
- Do **not** make anything in the ingest path import this script.
