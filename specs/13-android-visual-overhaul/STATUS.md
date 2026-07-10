# STATUS — 13-android-visual-overhaul

> The only hand-off between agents/sessions. Update your phase row and append a
> session-log line when you start/finish. Record blockers and spec-vs-code
> discrepancies here. Branch: `android-visual-overhaul`.

## Phase status

| Phase | Concern | Depends on | Parallel | Model | Status | Agent/session | Notes |
|---|---|---|---|---|---|---|---|
| 00 | Design system & theme | — | foundation | opus | todo | | |
| 01 | Shared components & overlay layer | 00 | — | opus | todo | | |
| 02 | Tracking + two-level board toggle | 00, 01 | UI | opus | todo | | |
| 03 | Calibration restyle + zoom loupe | 00, 01 | UI | opus | todo | | |
| 04 | Game storage (PGN + provenance) | — | data | codewhale | todo | | |
| 05 | Analysis engine (Stockfish) | — | data | fable | todo | | |
| 06 | Games library + Analysis screens | 00,01,02,04,05 | — | opus | todo | | |
| 07 | Settings restyle | 00, 01, 02 | UI | codewhale | todo | | |

Recommended order: **00 → 01**, with **04 and 05 in parallel from the start** (no theme
dependency). After 01: **02 ∥ 03**; then **07** (after 02). **06 last** (needs 02/04/05).

## Blockers

(none yet)

## Discrepancies (spec vs code)

| # | Phase | Spec says | Code/ground truth | Impact |
|---|---|---|---|---|
| | | | | |

## Open decisions carried from mockup review (all decided)

- Aesthetic: dark tournament, single-committed dark identity (light scheme shipped but
  not the identity). Dynamic color OFF by default.
- Board view: on-board two-level toggle (Rendered | Video → Raw/Warped/Diff/Shadow/Occlusion),
  removed from Settings.
- Calibration: real pixel zoom loupe replaces the crosshair-only `drawLoupe`.
- History → multi-game library; finished games stored as **PGN files + provenance sidecar**;
  **Stockfish bundled on-device**; analysis move-detail **merges** engine accuracy + tracker provenance.
- Transient messaging → floating overlay layer (no board reflow).

## Session log

| Timestamp | Phase | Agent | Action | Result |
|---|---|---|---|---|
| 2026-07-10 | — | opus | Spec pack authored (entry + 00–07 + STATUS) from approved mockups. No implementation. | ready |
