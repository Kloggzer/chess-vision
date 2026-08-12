# 54 — Status

| Phase | State | Branch | Note |
|---|---|---|---|
| 00 — the models speak no language | `todo` | `specs-54-00` | lands alone; owns `TrackerLabel`, `GameResult`, the guard |
| 01 — the game ends with a result | `todo` | `specs-54-01` | after 00 |
| 02 — the screen reads like a game | `todo` | `specs-54-02` | after 01 (same file) |
| 03 — when it goes wrong, it says what to do | `todo` | `specs-54-03` | after 02 (same file); touches `core-engine` additively |
| 04-A — home/games/camera/chrome → resources | `todo` | `specs-54-04a` | after 01; ∥ 04-B |
| 04-B — review/analysis/settings → resources | `todo` | `specs-54-04b` | after 00; may run ∥ 01–03 |
| 05 — Deutsch | `todo` | `specs-54-05` | last |
| 06 — the app has a face | `todo` | `specs-54-06` | any time; **never beside 04-A** |

## Open decisions, carried into the phases

- **The logo mark is not chosen yet.** `logo/probe.html` renders three candidates (pawn in a
  viewfinder / checker in a viewfinder / pawn knocked out of a disc) at 96, 48 and 24 px on both
  grounds, plus the launcher shape and the Home bar. Phase 06 assumes
  `logo/chesslab-mark.svg` — currently candidate A — and the file is swapped, not the spec, if
  the user picks another.
- **`Start tracking` / `Stop tracking` are frozen English** for the whole pack, because
  `scripts/android-smoke.ps1:67-69` matches them literally. Phase 05 translates them in
  `values-de/` only.
- **All stuck reasons collapse to one player sentence** in phase 03 (`BoardBusy`). If that turns
  out to hide something a player needed, it is a measured finding for this file — not a
  vocabulary to invent while implementing.

## Measured before the pack was written (2026-08-12)

| Fact | Value |
|---|---|
| Entries in `res/values/strings.xml` | **171** |
| …of them referenced anywhere | **3** (`app_name`, `notif_channel`, `notif_title`) |
| `android:icon` in the manifest | **absent** — the app ships the stock Android launcher icon |
| Capitalised literals in `ui/`, player-facing packages | **~400** |
| Pure UI models returning English | 3 (`stateLabel`, `undoLabel`, `resultHeadline`) |
| fps on the tracking screen | the largest number on it, and already in `TimingsPanel.kt:50-57` |
| Destructive branches on the tracking screen | 1 (`TrackerModal.DISCARDING`) |
| Results a stored game can express | mate, stalemate, draw-by-rule, `*` — **no resignation, no agreed draw** |

## Session log

_(empty — each phase agent appends one entry: what landed, what the spec got wrong, what it
measured, and every discrepancy between this pack and the code.)_
