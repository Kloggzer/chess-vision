# The source recordings — what each one actually is

Every label downstream rests on "the position in this video was X". That claim lives nowhere in a
video file, and until 2026-08-09 it lived only in the user's head: asked what the four
`VID_20260731_*` recordings were, the answer was *"die ich jetzt gerade nicht auswendig weiß"*.
This file is git-tracked on purpose — `data/` is gitignored and was lost once on 2026-08-09.

**A recording with no entry here is unusable for labelling**, however good its pixels are. Add the
entry when the file arrives, not when someone needs it.

## Columns

- **position** — the FEN placement field that holds for the WHOLE recording, or `game` when it
  changes move by move (then the truth is `data/realgames/<name>/reference.pgn`).
- **board** — `fixed` (camera and board still) or `turntable` (the board rotates; the quad must be
  tracked per frame, a median quad is meaningless).
- **hands** — whether hands enter the frame. Not a defect: it is the entire point of the
  `occluded` class, and a recording that is otherwise unusable can still carry it.

## How `data/videos/` is laid out

Four folders, and the split is by **how the pipeline has to treat the recording**, not by subject.
Files keep their original names — the name is the only link back to the camera roll, and renaming
it would break the one thing that survives outside this repo.

| folder | the position | the geometry | the path through the pipeline |
|---|---|---|---|
| `game/` | changes move by move | one quad, camera still | `:desktop replay <v> label` -> `realgames confirm` -> `export-session` |
| `standing-fixed/` | constant | one quad, camera still | `:desktop undistort` -> `export_static` with the FEN stated below |
| `standing-turntable/` | constant | **a quad per frame** — the board rotates, a median quad is meaningless | as above, but the per-frame quad is mandatory |
| `unsorted/` | unknown | unknown | nothing runs on it until a human fills in its row here |

`unsorted/` is not a dumping ground, it is a QUEUE: a recording sits there exactly as long as
nobody has said what is on it. Measurement can narrow it down — piece count, whether the position
changes, whether the board moves — but the last word is a human's, because the model that would
otherwise decide is the same one the labels are meant to train.

## Recordings

| file | position | board | hands | notes |
|---|---|---|---|---|
| `VID_20260731_222043.mp4` | `rnbkqbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBKQBNR` | turntable | ? | **King and queen are SWAPPED** (d1/d8 king, e1/e8 queen) — stated by the user 2026-08-09. 4K portrait. |
| `VID_20260731_222131.mp4` | `rnbkqbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBKQBNR` | turntable | ? | Same swap. 4K portrait. **All four markers decoded in 0 of 11 samples** — usually two. Needs denser sampling or it is unusable. |
| `VID_20260731_222320.mp4` | `rnbkqbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBKQBNR` | turntable | ? | Same swap. 4K portrait. |
| `VID_20260731_092133.mp4` | start position | turntable | ? | 4K landscape, 107 s. Quad moves ~1 556 px, so the board really turns. |
| `2026-08-09 20-48-50.mp4` | start position | turntable | ? | 1080p, 296 s, varying light. Two blackouts, measured: frames **4551-4633** and **8420-8434** (98 frames, 1.1 %). |
| `2026-08-09 19-16-08.mp4` | start position | fixed | yes | Hand (and a bottle) moved over a standing position, filmed for the `occluded` class. Covers a1-e4 only — White's half. |
| `VID_20260802_222741.mp4` | game | fixed | yes | = `game-2026-08-02`, the 20/2/5 clip of the regression set. **"die beiden waren gestern echt gut"** (user, 2026-08-09). |
| `VID_20260802_222203.mp4` | game | fixed | yes | Its sibling, same session. Same verdict from the user. Camera FIXED: Kotlin's scan over 769 sampled frames reads quad spread median 1.05 px, p90 1.78 px. |
| `2026-08-07 13-52-38.mp4` | game | fixed | yes | = `rec-20260807-135238`, the 25-ply scored clip. |
| `2026-08-08 00-39-57.mp4` | game | fixed | yes | = `rec-20260808-003957`. |
| `2026-08-08 11-59-12.mp4` | game | fixed | yes | = `rec-20260808-115912`. |
| `VID_20260812_112853.mp4` | `rnbqkb1r/ppp1pppp/5n2/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR` | turntable | no | Position from the preceding tracked game: `1. d4 d5 2. Nc3 Nf6 3. e4`. 1080p, 199 s. Kotlin `rectify` sampled 20/20 frames (every 300), none missed; mean worst square offset 1.75 px. Lens fit was rejected, so use the raw per-frame geometry path. |

Unclassified, measured but not yet confirmed by a human: `2026-08-08 11-53-53`, `11-55-19`,
`11-57-07`, `VID_20260726_155132`, `VID_20260726_233432`, `VID_20260727_124440`,
`VID_20260727_233929`. The user's own summary of
this group (2026-08-09): *"manche davon sind dreckig, d.h. da sind hände im bild und die positonen
sind ggf illegal"*.

## Why an illegal position is not a disqualification

For the `occluded` class the question is "is something in front of this cell", which needs the
position to be CONSTANT, not legal. An illegal placement only rules a recording out as a source of
PIECE labels when those labels would come from a game's move list — here they come from a human
saying what stands where, and that statement can describe any placement. The king/queen swap above
is exactly this case: perfectly usable, and silently four wrong labels per frame if nobody records
it.

## The frame gate for a turntable take: four markers, not brightness

Suggested by the user and then measured on `2026-08-09 20-48-50` (975 frames sampled):

| frames | >= 3 markers | all 4 |
|---|---|---|
| 98 dark (blackout) | 2 % | **0 %** |
| 877 lit | 98 % | 85 % |

Requiring all four markers rejects **every** dark frame without a brightness rule, and rejects 19
LIT frames a brightness rule would have passed — they sit at the start (frames 40-270), where the
table still spins too fast for the detector. Brightness cannot see that; the markers can.

Scope: this is a FRAME-SELECTION rule for a take with blackouts and frames to spare, not a
statement about how many markers tracking needs. See the section above for why three is fine.

## The four-marker rule answers DARKNESS, not tracking

It was proposed for one job — telling a blackout frame from a usable one — and it does that job
perfectly (0 of 98 dark frames decode four markers). It is **not** a quality bar for tracking, and
reading it as one is wrong: `MarkerTracker` exists precisely to carry a missing corner through, with
a dead zone, EMA smoothing, outlier rejection that only accepts a jump after it holds, aging, and a
seed from the profile.

`VID_20260802_222741` is the proof. One of the two good takes, and the scan sees only THREE markers
in **937 of 958** sampled frames — yet its worst square offset sits at a median of 2.37 px, better
than recordings that decode all four. A four-marker gate would have discarded the whole recording.

## Do not rebuild the board geometry in Python

Measured the hard way on 2026-08-09: four separate Python reconstructions of the warp were written
that day (the static export, two probes, an inventory) and **all four framed the board wrongly** —
twice by leaving `margin` at 0, once by omitting the model's own normalisation, and once by using a
stored median quad where the recording needs a per-frame one. The Kotlin renderer got the same
recording right every time, because it detects the corners per frame through the code the device
runs.

A picture of a board with labels on it is not a debug aid, it is the thing every label rests on. It
comes from `:desktop`, or it does not come.

The same holds for the NUMBERS. `data/realgames/<name>/candidate.json` already carries a full
geometry scan — `quad_spread_px`, `worst_offset_px`, `align_pass_rate`, `markers_seen`, all over
hundreds of sampled frames. A ten-sample Python probe against the FIRST frame reported "the quad
drifts 179 px" for a camera that does not move; the scan says p90 1.78 px and calls the 203 px a
single outlier. Read the scan.

## Geometry health, all 18 recordings (`:desktop rectify`, 2026-08-09)

Every recording in `data/videos/`, sampled every 400th frame, quad detected and grid-refined per
frame by the code the device runs. **Not one problem take**: every sample yielded a board, and the
mean worst square offset stays between 2.06 and 3.69 px against a 4 %-of-a-cell criterion.

| recording | boards | missed | mean worst square offset |
|---|---|---|---|
| `2026-08-07-13-52-38` | 23 | 0 | 3.31 px |
| `2026-08-08-00-39-57` | 26 | 0 | 3.17 px |
| `2026-08-08-11-53-53` | 2 | 0 | 2.68 px |
| `2026-08-08-11-55-19` | 5 | 0 | 2.64 px |
| `2026-08-08-11-57-07` | 2 | 0 | 2.94 px |
| `2026-08-08-11-59-12` | 54 | 0 | 2.93 px |
| `2026-08-09-19-16-08` | 3 | 0 | 2.46 px |
| `2026-08-09-20-48-50` | 23 | 0 | 2.06 px |
| `VID_20260726_155132` | 5 | 0 | 2.10 px |
| `VID_20260726_233432` | 8 | 0 | 2.25 px |
| `VID_20260727_124440` | 3 | 0 | 2.08 px |
| `VID_20260727_233929` | 7 | 0 | 2.43 px |
| `VID_20260731_092133` | 9 | 0 | 2.95 px |
| `VID_20260731_222043` | 3 | 0 | 3.69 px |
| `VID_20260731_222131` | 3 | 0 | 3.63 px |
| `VID_20260731_222320` | 3 | 0 | 2.54 px |
| `VID_20260802_222203` | 20 | 0 | 2.42 px |
| `VID_20260802_222741` | 24 | 0 | 2.55 px |

Two things worth reading off it. The three 4K portrait turntables sit at the top of the range
(2.54-3.69 px), which is what a board that turns between frames costs — each frame gets its own
quad instead of a settled one, and it is still well inside the criterion. And
`VID_20260802_222741` returns 24 of 24 boards at 2.55 px while the scan sees only three markers in
937 of 958 frames: the tracker carries the fourth corner, and the result beats takes that decode
all four.

**The geometry is not the open question for any recording.** What is on them is.
