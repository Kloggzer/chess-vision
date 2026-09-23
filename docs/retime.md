# Retime — the board decides when a position stood

`chesslab realgames retime <name>` moves every ply of a candidate to the frame its position first
stood on the board, read off the video — not off the phone's commit clock. The platform runs it
right after `phone-candidate` (job `phone-record`); a refusal fails the job with its sentence.

## Why

The phone commits LATE when hands are fast: 2026-08-30-16-20-19 committed ply 7 at frame 291 and
plies 8+9 four frames later, while every frame from 289 on already showed the position after
ply 9. A label window cut from those commits labels frames "after ply 7" that show ply 9. The
phone's frame rows carry its COMMITTED FEN, so only the video has the earlier truth.

## What it does

| step | detail |
|---|---|
| positions | `start_fen` + every `fen_after` — the record's order, confirmed by the human |
| reads | every `--stride` (3) frame from `first commit − 12 s` to `last commit + 4 s`: 64 crops through the ply's own `corners`, classified by `--model` (default `data/models/p4a-80-clahe`, ONNX, batch 64 = one frame) |
| emission | per frame and position: sum over VISIBLE cells (coverage ≤ `PIECE_VISIBLE_MAX`) of `max(log p(label), −4)`; a frame with more than 12 covered cells says nothing |
| window | position k may stand from 12 s before its own commit to 4 s after the next — the phone lags, it rarely runs ahead |
| path | monotone Viterbi over the chain; advancing costs `ADVANCE_COST = 6`, so one misread frame cannot open a position and three agreeing ones can; skips allowed at the same price per position |
| result | `moves[i].frame` = first frame on the path with that position, `frame_phone` keeps the old one, `held` = frames it stood (× stride); a position never entered gets `held 0` and the next entered frame — a multi-commit, `carriesFrames` false in the review |
| gate | per entered ply `margin = (emission[k] − emission[k−1]) / ADVANCE_COST` at its entry frame, clipped to [0, 1]; under `WEAK_MARGIN = 0.5` a ply is weak (`source.retime.weak`); more than `WEAK_SHARE = 20 %` weak plies → nothing written, exit 1 with the reason |
| boards | `frames/` is cleared and rewritten at every ply's review frame ±2 |

`source.retime` in the candidate records model, stride, frames read, agreement, how many plies
moved and which collapsed.

## The picture is not the label frame

The entry frame is where the piece leaves the hand — right as a label, the worst picture of the
hold for a human. `moves[i].frame_review` picks separately, without a threshold: among the frames
the path holds position k on, the least covered ones; of those, the ones with the fewest
contradictions to the claimed position (reads from `PICTURE_CONF` 0.5, per visible cell); of
those, the MIDDLE one. Both ends of a hold are dirty (the hand that set, the hand reaching for the
next move), so "latest on a tie" hit the frame just before the next grab. Only equally open frames
are compared — a frame under a hand contradicts little because it shows little. A ply without its
own hold borrows the next one's picture.

A hold can contain another board: on 21-12-56 Black captured on e5 with the rook, took it back and
captured with the bishop — ~100 frames of the hold show the retracted position.

- **`disputed`** counts the hold's frames that contradict on `DISPUTED_CELLS` (2) more cells than
  the picture — a hint, not a verdict. **The label interval is untouched**: it still vouches for
  the whole hold; what happens per cell is `docs/frame-scan.md` §3.
- **`review_covered`**: cells still covered on the chosen picture. Over 0 means the whole hold
  carried a hand; the card says so ("Hand auf N Feldern").
- The review cards of a retimed ply show only its OWN frames (`review-cards.ts`); the old window
  reached back to the previous commit and showed the previous position.

## Not covered

- A repeated position inside one window could match the earlier occurrence; that needs both a
  repetition and a lag over 12 s.
- The PC label replay (`replay … label`) is not retimed yet; it lags the same way.
- A candidate noting "plies after the video's end omitted" predates the concat seam fix
  (`ConcatFrameSource`, 2026-09-07) — re-import it with the current binary.
