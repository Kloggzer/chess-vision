# 53 — Status

| Phase | State | Note |
|---|---|---|
| 00 — confirm | `todo` | lands alone; both reference.pgn are in the repo |
| 01 — export-session | `todo` | after 00; owns `data/sessions/rg-<name>/` |
| 02 — occluded proposals | `todo` | after 01; ∥ 03; owns the proposal schema (pinned in entry.md) |
| 03 — relabel MVP | `todo` | after 01; ∥ 02; `platform/app/`, codes against the pinned schema |
| 04 — 14-class experiment | `todo` | last; success bar = dense-evaluation table in entry.md |

Branch: `specs-53-<phase>` per phase, off `main`. DIRECTION.md remains the investigation of
2026-08-08 (with the user's dirty-frames amendment); where DIRECTION and this pack disagree,
the pack wins (known: `game.pgn` → `reference.pgn`).

## The bar this pack is judged against (from specs/52 STATUS, 2026-08-08 — MEASURED)

| video | today, baseline | today, n=1 + dense eval | phase 04 must reach |
|---|---|---|---|
| rec-20260807 (score) | 25/0/0 | 14/11/6 (veto) | **25/0/0 under dense eval** |
| rec-20260808-115912 | 61 plies | 229 plies, 0 invented | **≥ 200 under dense eval** |
| rec-20260808-003957 | 67 plies | 33 plies | no baseline regression |

## Session log

*(empty — no phase has run)*
