# 47 — Status

| Phase | State | Note |
|---|---|---|
| — | `todo` | entry written 2026-08-03; **sketch-and-review before any implementation** |

## Measured before the pack was written

| Fact | Value | How |
|---|---|---|
| Routes | 8 | `ChesslabNavHost.kt` |
| Top-level tabs | 6 | `TopNav.kt` / device |
| Distinct `dp` literals in UI code | 18 | `grep -rhoE "[0-9]+\.dp"` over `ui/`, `spectate/`, `speech/` |
| Spacing token file | none | `ui/theme/` holds Color, Theme, Type only |
| Landing screen | Board (the tracker), which since specs/43 launches not tracking | device |

## Open questions for the sketch, not answered here

- Does Spectator deserve a top-level tab now that it is the archive review with a live source?
- Do Camera and Calibration remain two routes?
- Does Debug belong in the main navigation graph?
- What does a dashboard card show that the app genuinely knows?
