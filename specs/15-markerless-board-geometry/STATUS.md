# STATUS — 15 markerless board geometry (motion + occlusion)

Branch: `markerless-board-geometry` (from `main`; must already include the camera-lib work
`src/chesslab/camera.py`).
Execution: **sequential** — 00 is the risk gate; 01→02→03 all edit `board_geometry.py`
(03 also `tracker.py`/`config.py`/`cli.py`); 04 adds an eval script. One phase per session,
supervisor (Claude) reviews + commits with the names in each phase's Steps.

## Phases

| Phase | File | Status | Notes |
|---|---|---|---|
| 00 | `00-detection-probe.md` | todo | risk gate — records chosen detector priority below |
| 01 | `01-detect-and-track-engine.md` | todo | depends 00 |
| 02 | `02-orientation.md` | todo | depends 01 |
| 03 | `03-tracker-wiring.md` | todo | depends 01, 02 |
| 04 | `04-evaluation.md` | todo | depends 03 |

## Decisions to record during execution

- **Detector priority (from phase 00):** _TBD — fill after the probe montage/hit-rate._
  (Candidate order: saddles/SB → lines → aruco.)
- **Frames used for the probe:** _TBD (checked-in `data/**` frames vs live `--source`)._
- **Eval baseline (from phase 04):** _TBD — lock rate + corner-RMSE per source × regime._

## Discrepancies (spec vs code)

_none yet — record any anchor drift or contract mismatch here._

## Blockers

_none_

## Session log

_(append one line per agent session: date — phase — result — commits)_
