# The source recordings — what each one actually is

Every label downstream rests on "the position in this video was X", and that claim lives nowhere
in a video file. This file is git-tracked on purpose — `data/` is gitignored and was lost once.

**A recording with no entry here is unusable for labelling**, however good its pixels are. Add the
entry when the file arrives, not when someone needs it.

**Let the camera run two seconds after the last move.** A tracker reads a move from a board at
rest; `VID_20260727_233929` loses its last four plies because the recording stops three seconds
after the final piece lands, and both trackers measured on it lose the same four.

## Was in `frames/` liegt — und was NICHT (gemessen 2026-09-14)

- **Die Dateien sind `.webp`, das Log nennt `.png` oder `.jpg`.** Über den Stamm abgleichen, nie
  über die Endung.
- **Es sind keine Quellbilder**, sondern brettgroße Review-Bilder (`retime._write_boards`).
- **Die Quelle ist das VIDEO.** Rohe Bilder werden bei Bedarf dekodiert — Python
  `Recording.frames(start=, wanted=, rotate=)` (`src/chesslab/recording.py`, die Segmente als EIN
  Strom), Kotlin `FrameSource`/`VideoFileSource`. Beide lesen vorwärts und seeken nur den Start —
  ein Seek mittendrin ist unzuverlässig (`docs/export-decode.md`).
- **Folge, und richtig so:** `session scan-alignment`, `fit-mesh`, `mark-hands`, `autofix-corners`
  und `session boards` verweigern ohne Frame-Datei. Neu messen geht über
  `realgames export-session`, das die Bilder selbst aus dem Video holt.

## How `data/videos/` is laid out

Split by **how the pipeline has to treat the recording**. Files keep their original names — the
only link back to the camera roll.

| folder | the position | the geometry | the path through the pipeline |
|---|---|---|---|
| `game/` | changes move by move | one quad, camera still | `:desktop replay <v> label` -> `realgames confirm` -> `export-session` |
| `standing-fixed/` | constant | one quad, camera still | **kein Pfad** — `export_static` wurde am 2026-08-21 entfernt, siehe TODO.md |
| `standing-turntable/` | constant | **a quad per frame** | **kein Pfad**, aus demselben Grund; Drehteller laufen über `occluders composite` (`docs/occluder-plates.md`) |
| `unsorted/` | unknown | unknown | nothing runs on it until a human fills in its row here |

`unsorted/` is a QUEUE, not a dumping ground. Measurement can narrow it down, but the last word is
a human's — the model that would otherwise decide is the one the labels are meant to train. In it,
measured but unconfirmed: `2026-08-08 11-53-53`, `11-55-19`, `11-57-07`, `VID_20260726_155132`,
`VID_20260726_233432`, `VID_20260727_124440`, `VID_20260727_233929` (user: some dirty, hands in
frame, positions possibly illegal).

## Recordings

- **position** — the FEN placement that holds for the WHOLE recording, or `game` (truth then in
  the recording's `reference.pgn`).
- **board** — `fixed` or `turntable` (the quad must be tracked per frame).
- **hands** — whether hands enter the frame; not a defect, it is the occlusion material.

| file | position | board | hands | notes |
|---|---|---|---|---|
| `VID_20260731_222043.mp4` | `rnbkqbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBKQBNR` | turntable | ? | **King and queen are SWAPPED** (d1/d8 king, e1/e8 queen). 4K portrait. |
| `VID_20260731_222131.mp4` | `rnbkqbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBKQBNR` | turntable | ? | Same swap. 4K portrait. All four markers in 0 of 11 samples — needs denser sampling or is unusable. |
| `VID_20260731_222320.mp4` | `rnbkqbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBKQBNR` | turntable | ? | Same swap. 4K portrait. |
| `VID_20260731_092133.mp4` | start position | turntable | ? | 4K landscape, 107 s. |
| `2026-08-09 20-48-50.mp4` | start position | turntable | ? | 1080p, 296 s, varying light. Blackouts: frames **4551-4633** and **8420-8434**. |
| `2026-08-09 19-16-08.mp4` | start position | fixed | yes | Hand (and a bottle) over a standing position. Covers a1-e4 only. |
| `VID_20260802_222741.mp4` | game | fixed | yes | = `game-2026-08-02`, the 20/2/5 clip of the regression set. Good take (user). |
| `VID_20260802_222203.mp4` | game | fixed | yes | Its sibling, same verdict. Quad spread median 1.05 px, p90 1.78 px. |
| `2026-08-07 13-52-38.mp4` | game | fixed | yes | = `rec-20260807-135238`, the 25-ply scored clip. |
| `2026-08-08 00-39-57.mp4` | game | fixed | yes | = `rec-20260808-003957`. |
| `2026-08-08 11-59-12.mp4` | game | fixed | yes | = `rec-20260808-115912`. |
| `20260813-134818/video.mp4` | game | fixed | yes | QHD Android training recording (`2026-08-13_1351.json`). Contains move-forward-and-back regions. Visible hands in frames 2736, 2970, 4584 — none entered `accepted/` of the fail-closed pack. |
| `20260813-193423/video.mp4` | game | fixed | yes | QHD Android training recording (`2026-08-13_1941.json`, 8 plies). Keep outside the aggregate dataset until the clean-board review is complete. |
| `VID_20260812_112853.mp4` | `rnbqkb1r/ppp1pppp/5n2/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR` | turntable | no | Position after `1. d4 d5 2. Nc3 Nf6 3. e4`. 1080p, 199 s. Use the raw per-frame geometry path. |
| `2026-09-19-15-50-28` | game | fixed | yes | 87 plies, phone, `test-v2`. `confirmed` rests on the user having set and validated every move at the board (`note` in `candidate.json`); `retime` with a model that never saw it agrees 1,00. Reference: `docs/regression-reference.md`. |
| `2026-09-19-16-26-22` | game | fixed | yes | 59 plies, sibling, same provenance. The far h8 marker flickers (38/100 detections). |

Four recordings of 2026-08-13 (`20260813-121218`, `-123904`, `-124512`, `-124624`) were rebuilt
with `:desktop repair-recording`; frame rate 28.63 fps is ASSUMED, geometry sound, no game record
— their move list must come from a replay and a human.

**An illegal position is not a disqualification.** Occlusion needs the position CONSTANT, not
legal, and piece labels from a human statement can describe any placement. The king/queen swap is
exactly this case: usable, and silently four wrong labels per frame if nobody records it.

## Frame gate for a turntable take: four markers answer DARKNESS, not tracking

On `2026-08-09 20-48-50`, requiring all four markers rejects **all 98** blackout frames without a
brightness rule, plus 19 lit frames where the table spins too fast for the detector. It is a
frame-selection rule for a take with frames to spare — **not** a tracking bar: `MarkerTracker`
carries a missing corner, and `VID_20260802_222741` sees three markers in 937 of 958 frames yet
reaches a median worst offset of 2.37 px.

## Do not rebuild the board geometry in Python

On 2026-08-09 four separate Python reconstructions of the warp **all framed the board wrongly** —
twice `margin` left at 0, once without the model's normalisation, once with a median quad where
the recording needs one per frame. The Kotlin renderer got it right every time, because it
detects corners per frame through the code the device runs. A picture of a board with labels on it
is the thing every label rests on: it comes from `:desktop`, or it does not come.

The same holds for the NUMBERS. `candidate.json` carries a full geometry scan (`quad_spread_px`,
`worst_offset_px`, `align_pass_rate`, `markers_seen`); a ten-sample Python probe reported "the quad
drifts 179 px" for a camera the scan measures at p90 1.78 px. Read the scan. `:desktop rectify`
over all 18 recordings of 2026-08-09 found **no problem take** (mean worst offset 2.06–3.69 px):
the geometry is not the open question for any recording, what is on them is.

## How a recording is refused — and why it is NOT a pass rate

`ALIGN_PASS_MIN = 0.85` measured **playing speed**: a reenactment at ~10 s/move read 82.5 % on
flawless geometry, the failing samples being hands. Replaced by **`MIN_ALIGNED_SAMPLES = 100`**
(`GeometryScan.kt`): every aligned sample already passed `alignmentOf` (worst offset within 4 % of
a cell AND all 18 lines), a nudged board is the spread gate's job, and a median quad needs
*enough* samples. The rate is still reported, labelled as a playing-speed number.

## The stored device profile carries its margin forward — "recalibrate" does not adopt 0.045

`config.DEFAULT_MARKER_MARGIN = 0.045` rests on two instruments: a grid-line alignment sweep over
four recordings (optimum 0.040–0.050) and a committed-ply sweep on `vid1244` (0.040 and 0.050
reproduce the played game; 0.030–0.035 and 0.060 are wrong; the ply count alternates across the
sweep, so its miss at 0.045 is noise).

The trap: `CalibrationStore.carryOver` writes `margin = marginOverride ?: existing.margin`, and
`marginOverride` is non-null only when the user **touched the per-corner sliders in this
session**. A stored profile at the superseded 0.06 therefore survives every recalibration. The
carry-forward is right (per-corner outset is measured geometry); the gap is that **nothing ever
measures it** — on `vid1244` the difference between 3 committed plies and the whole game.
