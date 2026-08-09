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
| `VID_20260802_222203.mp4` | game | fixed | yes | Its sibling, same session. Same verdict from the user. Note the quad drifts 179 px over the take — neither still nor a turntable. |
| `2026-08-07 13-52-38.mp4` | game | fixed | yes | = `rec-20260807-135238`, the 25-ply scored clip. |
| `2026-08-08 00-39-57.mp4` | game | fixed | yes | = `rec-20260808-003957`. |
| `2026-08-08 11-59-12.mp4` | game | fixed | yes | = `rec-20260808-115912`. |

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

Four and not three, because a three-marker quad degrades to an affine fit and its error is
PROJECTIVE (CLAUDE.md) — no later correction removes it. On a take with thousands of frames and a
need for maybe two thousand, 15 % is a cheap price for an exact quad.

## Do not rebuild the board geometry in Python

Measured the hard way on 2026-08-09: four separate Python reconstructions of the warp were written
that day (the static export, two probes, an inventory) and **all four framed the board wrongly** —
twice by leaving `margin` at 0, once by omitting the model's own normalisation, and once by using a
stored median quad where the recording needs a per-frame one. The Kotlin renderer got the same
recording right every time, because it detects the corners per frame through the code the device
runs.

A picture of a board with labels on it is not a debug aid, it is the thing every label rests on. It
comes from `:desktop`, or it does not come.
