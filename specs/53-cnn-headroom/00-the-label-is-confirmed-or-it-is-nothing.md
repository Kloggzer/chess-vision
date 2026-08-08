# Phase 00 — The label is confirmed or it is nothing

> Owns `src/chesslab/realgames.py` (new), the `realgames` Typer sub-app in `src/chesslab/cli.py`,
> `tests/test_realgames.py` (new). Lands alone, before every other phase.

## Why

Everything downstream labels crops from "the position at frame N was X". That claim is only as
good as the candidate's move list, and the Kotlin writer hardcodes `confirmed: false`
(`RealGameCandidate.kt`, `writeCandidate`) — confirmation is a human step that currently has no
tool. Both new videos have their true games on disk (`data/realgames/<name>/reference.pgn`,
Carlsen–Shevchenko for `rec-20260808-003957`, Erigaisi–Carlsen for `rec-20260808-115912`), so
the check is mechanical: LCS against the PGN, human eyes only on the disagreements.

## Design (decided — do not redesign)

New module `src/chesslab/realgames.py`, new Typer sub-app `realgames_app` registered in
`cli.py` exactly like `session_app` (`cli.py:35`, commands from `:279`).

```
chesslab realgames confirm <name> [--yes]
```

1. Load `data/realgames/<name>/candidate.json` and `reference.pgn` (python-chess is already a
   dependency). Build the truth SAN list by replaying the PGN mainline.
2. LCS over SANs (the same comparison `RealGameScore.kt` does on the Kotlin side; reimplement —
   ~20 lines — do not call across the language boundary).
3. Report three lists with frame anchors: matched (count only), candidate-only ("invented"),
   truth-only ("missed"), each unmatched entry printed as
   `ply 62 Rxb8 @frame 007312 -> data/realgames/<name>/frames/007312.png` so the human can look
   at the already-written review PNG (rectified board + believed labels, 720×816).
4. Interactive gate: for each candidate-only ply, `keep / drop from reviewed` (a resync-era
   candidate may legitimately contain plies the PGN has as later duplicates — the human
   decides). `--yes` accepts everything matched and rejects everything unmatched, for the
   scripted case.
5. Write back into `candidate.json`: `confirmed: true`, `confirmed_at` (ISO, UTC),
   `reviewed_plies: [<ply indices kept>]` — the exact keys `data/realgames/game-2026-08-02/
   candidate.json` already models. Never touch `moves[]` itself.

FEN timeline consumers (phase 01) use ONLY reviewed plies: the interval between reviewed ply i
and i+1 carries `moves[i].fen_after`.

## Steps

### 1. `src/chesslab/realgames.py` (new) — commit `feat(realgames): confirm — the label is checked against the game that was played`

`load_candidate(name)`, `truth_sans(name)`, `lcs_report(...)`, `confirm(name, yes: bool)` as
above. Pure functions except the final write; the write is atomic (tmp + replace, the
`writeProbs` pattern).

### 2. `cli.py` wiring — same commit

`realgames_app = typer.Typer(...)` + `app.add_typer(realgames_app, name="realgames")`, command
`confirm`. Follow the `session_app` docstring voice.

### 3. `tests/test_realgames.py` (new) — same commit

## Tests (write, run once, targeted)

`uv run pytest tests/test_realgames.py -q`

- `lcs_matches_the_kotlin_semantics`: truth `a b c d`, candidate `a x c` → matched 2, invented
  `x`, missed `b d`.
- `confirm_writes_only_the_three_keys`: candidate JSON before/after differs in exactly
  `confirmed`, `confirmed_at`, `reviewed_plies`.
- `yes_mode_keeps_matched_and_drops_unmatched`.

## Acceptance criteria

- `uv run chesslab realgames confirm rec-20260808-003957 --yes` and the same for
  `rec-20260808-115912` leave both candidates `confirmed: true` with non-empty
  `reviewed_plies` (run by the orchestrator with the user, since the interactive pass is the
  point; `--yes` is acceptable for the first round — 85/87 and 229/229 LCS are on record).
- `grep -l '"confirmed": true' data/realgames/rec-*/candidate.json` → both files.
- The targeted tests pass; no new ruff findings in the two touched files.

## Do NOT

- Do not modify `moves[]`, `geometry`, or anything the Kotlin writer owns.
- Do not rename `reference.pgn` (DIRECTION.md's `game.pgn` is superseded — note it in STATUS).
- Do not build any UI; the review PNGs are the human's picture.
