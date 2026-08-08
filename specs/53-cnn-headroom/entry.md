# 53 — The occluded class exists, and a human can afford to check it

> **Status:** `todo`. Five phases. 00 lands alone, then 01, then 02 ∥ 03 (disjoint files,
> shared schema pinned below), then 04. [DIRECTION.md](DIRECTION.md) is the investigation this
> pack executes; read it for the evidence, this file for the contract.

## The price tag this pack collects

Measured 2026-08-08 (specs/52 STATUS, "dense evaluation"): with `autoResyncObsN=1` plus dense
evaluation (`cnnCheckIntervalS=0.15`, `cnnCooldownS=0.07`) the tracker follows **229 of 237
plies of a 119-move blitz game with zero fabrications** — and the same knobs turn the calm
video's perfect 25/0/0 into **14/11/6, six phantoms**. The difference is one missing input:
`pOccluded ≡ 0.0` under every bundled 13-class model (`Observations.kt`: a class list without
`occluded` fills 0.0), which leaves five shipped safeguards reading "no hand" unconditionally
(CLAUDE.md pitfall, 2026-08-08). This pack produces the `occluded` class from the real videos —
auto-proposed, cheaply human-checked — and ships a 14-class model only if the replay A/B pays.

## Dependency table

| Phase | Concern | Depends on | Parallel? |
|---|---|---|---|
| 00 | `chesslab realgames confirm` — the label is confirmed or it is nothing | — | lands alone |
| 03a | MVP scaffold + confirm VIEW (`platform/app/`) | 00 (format), candidates on disk | may land before 01 (user amendment) |
| 01 | `chesslab realgames export-session` — a video becomes a session | 00 (a confirmed candidate) | alone (owns the session artifact) |
| 02 | occluded PROPOSALS from pixel truth | 01 | ∥ 03b |
| 03b | the three relabel streams | 01 (data), 03a, schema below | ∥ 02 |
| 04 | the 14-class experiment, gated by the dense-evaluation bar | 01+02+03 outputs | last |

DIRECTION.md's night fine-tune (its phase 02) and tail re-mine (its 04) are NOT in this pack —
they queue behind it and reuse its exporter.

## Shared contracts (authoritative — a phase file that disagrees is wrong)

**Corrections row** — `data/manifests/corrections.jsonl`, one JSON object per line. The READ
path is live (`labeling.py:251 load_corrections`, applied in `run_slice` → `label_overrides`,
`labeling.py:357-358, 457`); the writer `upsert_corrections` exists (`labeling.py:265`) — the
web UI's deletion removed its callers, not it. Dedup key `(session_id, frame, square)`,
**last line wins**, so append-only writers are correct:

```json
{"session_id": "rg-rec-20260808-003957", "frame": "004211", "square": "e2",
 "label": "occluded", "ts": "2026-08-08T18:00:00+00:00"}
```

`frame` is the frame STEM (no `frames/`, no `.png`). `label` is any of `config.CLASSES` (14,
incl. `occluded`) — free-form on write, it lands verbatim in the manifest row.

**Proposal row** — `data/realgames/<name>/occluded-proposals.jsonl`, emitted by phase 02,
consumed by phase 03. Phase 02 owns the schema; if 03 needs a key 02 does not emit, 03 records
a gap in STATUS.md and never invents one:

```json
{"session_id": "rg-rec-20260808-003957", "frame": "004211", "square": "e2",
 "fen_label": "wQ", "proposed": "occluded", "score": 0.83}
```

`score` ∈ [0,1], higher = more occluder-like; `fen_label` is what the confirmed FEN says the
square holds (the label to KEEP on reject).

**Session artifact** — phase 01 exports `data/sessions/rg-<name>/` in the §2 shape of
`docs/data-pipeline.md` (session.yaml + log.jsonl + frames/). `chesslab slice` must run on it
UNMODIFIED — the exporter conforms to slice, never the reverse.

## Protocol for implementing agents

- Branch: `specs-53-<phase>` off `main`; conventional commits exactly as named in each phase's
  Steps; stage explicitly (never `git add -A`); nothing under `data/` is ever committed
  (gitignored — verify `platform/app/` build artifacts are ignored BEFORE the first commit:
  `.next/`, `node_modules/`).
- Trust the code over this spec; record discrepancies in STATUS.md. If blocked, STOP and write
  the blocker.
- **Heavy compute:** ONE worker, always. Phase 04's training runs are the user's machine's
  evening — never fan out, never run two replays beyond the batch script's `MaxParallel=2`.
- **Tests once, targeted.** Python: `uv run pytest tests/<file> -q`. The full `uv run pytest
  -q`, `ruff`, `vulture` and the Android gate line belong to the orchestrator. Node (phase 03):
  `npm run lint` + `tsc --noEmit` scoped to `platform/app`, once.
- Formatters own style: `ruff format` / prettier — never hand-edit style findings.
- Dependencies through the package manager only: `uv add` into `pyproject.toml` (none are
  expected for 00-02), `npm` with lockfile for `platform/app/` (Next.js pinned exact).

## Repo rules the phases will actually hit

- `data/` is gitignored → park, never delete (`data/_parked/<date>-<reason>/`).
- **`corrections.jsonl` is a GLOBAL training input** — the same trap as
  `hard_empty.jsonl` (CLAUDE.md): its mere presence changes every subsequent slice. Park it
  between experiments; its presence goes into every measurement note.
- An **occupancy build DROPS `occluded` rows** (`docs/data-pipeline.md` §5.12) — phase 04's
  14-class build is the first consumer; do not "fix" the drop.
- Class weights and `max_empty_ratio` are functions of the CLASS LIST (CLAUDE.md) — a 14-class
  build shifts both as a side effect; phase 04 must sweep the rate, not inherit one.
- Datasets are snapshots: new sessions ⇒ new dataset NAME, split copied verbatim
  (`split.json`), never regenerated.
- Python is dataset building and training only — nothing here touches `android/`.

## Ownership registry (overrides any phase file that disagrees)

| File | Created by | May be extended by | Notes |
|---|---|---|---|
| `src/chesslab/realgames.py` | 00 | 01 | confirm + export live together |
| `src/chesslab/cli.py` (`realgames_app`) | 00 | 01, 02 | one Typer sub-app, `session_app` pattern (`cli.py:279`) |
| `src/chesslab/occluded.py` | 02 | — | producer only; no UI, no corrections writes |
| `platform/app/**` | 03 | — | nothing outside 03 touches it; nothing in it imports chesslab |
| `data/realgames/<name>/candidate.json` | exists | 00 (confirmed fields only) | Kotlin writer stays `confirmed: false` |
| `data/manifests/corrections.jsonl` | 03 (at runtime) | any future producer | schema above; append-only |
| `tests/test_realgames.py` | 00 | 01, 02 | one file for the Python phases |

## Definition of done, and the gate

A phase is done when its Acceptance criteria hold, its targeted tests ran once green, and
STATUS.md carries its session-log entry. The orchestrator (not phase agents) runs the full
Python gate (`uv run pytest -q`, `ruff check src tests synth`, `vulture`) and, for phase 04,
the full replay A/B on the batch runner.
