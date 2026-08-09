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

## Recordings

| file | position | board | hands | notes |
|---|---|---|---|---|
| `VID_20260731_222043.mp4` | `rnbkqbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBKQBNR` | turntable | ? | **King and queen are SWAPPED** (d1/d8 king, e1/e8 queen) — stated by the user 2026-08-09. 4K portrait. |
| `VID_20260731_222131.mp4` | `rnbkqbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBKQBNR` | turntable | ? | Same swap. 4K portrait. **All four markers decoded in 0 of 11 samples** — usually two. Needs denser sampling or it is unusable. |
| `VID_20260731_222320.mp4` | `rnbkqbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBKQBNR` | turntable | ? | Same swap. 4K portrait. |
| `VID_20260731_092133.mp4` | start position | turntable | ? | 4K landscape, 107 s. Quad moves ~1 556 px, so the board really turns. |
| `2026-08-09 19-16-08.mp4` | start position | fixed | yes | Hand (and a bottle) moved over a standing position, filmed for the `occluded` class. Covers a1-e4 only — White's half. |
| `2026-08-07 13-52-38.mp4` | game | fixed | yes | = `rec-20260807-135238`, the 25-ply scored clip. |
| `2026-08-08 00-39-57.mp4` | game | fixed | yes | = `rec-20260808-003957`. |
| `2026-08-08 11-59-12.mp4` | game | fixed | yes | = `rec-20260808-115912`. |

Unclassified, measured but not yet confirmed by a human: `2026-08-08 11-53-53`, `11-55-19`,
`11-57-07`, `VID_20260726_155132`, `VID_20260726_233432`, `VID_20260727_124440`,
`VID_20260727_233929`, `VID_20260802_222203`, `VID_20260802_222741`. The user's own summary of
this group (2026-08-09): *"manche davon sind dreckig, d.h. da sind hände im bild und die positonen
sind ggf illegal"*.

## Why an illegal position is not a disqualification

For the `occluded` class the question is "is something in front of this cell", which needs the
position to be CONSTANT, not legal. An illegal placement only rules a recording out as a source of
PIECE labels when those labels would come from a game's move list — here they come from a human
saying what stands where, and that statement can describe any placement. The king/queen swap above
is exactly this case: perfectly usable, and silently four wrong labels per frame if nobody records
it.
