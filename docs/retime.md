# Retime — the board decides when a position stood

`chesslab realgames retime <name>` (2026-09-06). Moves every ply of a candidate to the frame its
position first stood on the board, read off the video — not off the phone's commit clock.

## Why

The phone commits LATE when hands are fast. 2026-08-30-16-20-19 committed ply 7 (Nxe5) at frame
291 and plies 8+9 four frames later, while every frame from 289 on already showed the position after
ply 9: the three captures took less than the phone's verify window, and the recovery caught up
afterwards. A label window cut from those commits labels frames "after ply 7" that show ply 9, and
the review card for ply 7 shows a picture that never matches. The phone's frame rows carry the
phone's COMMITTED FEN, so the timeline has no earlier truth; the video has.

## What it does

| step | detail |
|---|---|
| positions | `start_fen` + every `fen_after` — the record's order, confirmed by the human |
| reads | every `--stride` (3) frame between `first commit − 12 s` and `last commit + 4 s`: 64 crops through the ply's own `corners`, classified by `--model` (default `data/models/p4a-80-clahe`, the ONNX export; batch is exactly 64 = one frame) |
| emission | per frame and position: sum over VISIBLE cells (coverage ≤ `PIECE_VISIBLE_MAX`) of `max(log p(label), −4)`; a frame with more than 12 covered cells says nothing (all zero) |
| window | position k may stand from 12 s before its own commit to 4 s after the next one — the phone lags, it rarely runs ahead |
| path | monotone Viterbi over the chain; advancing by one position costs `ADVANCE_COST = 6`, so one misread frame cannot open a position and three agreeing ones can; skips are allowed at the same price per position |
| result | `moves[i].frame` = first frame on the path with that position, `frame_phone` keeps the old one, `held` = frames the position stood (× stride); a position never entered gets `held 0` and the frame of the next one entered — a multi-commit, `carriesFrames` false in the review |
| gate | per entered ply the margin `(emission[k] − emission[k−1]) / ADVANCE_COST` at its entry frame, clipped to [0, 1], kept as `moves[i].margin`; a ply under `WEAK_MARGIN = 0.5` is weak and listed in `source.retime.weak`; when more than `WEAK_SHARE = 20 %` of the plies are weak nothing is written and the verb exits 1 with the reason (a median gate at 0.85 refused 21-29-35 with 3 weak plies of 99) |
| picture | `moves[i].frame_review`: of the frames the path holds position k on, the one with the FEWEST covered cells, the latest on a tie — the entry frame is where the piece leaves the hand (2026-09-06-21-29-35 showed hands on most cards), the picture is where the hand is gone; a collapsed ply borrows the next entered ply's |
| boards | `frames/` is cleared and rewritten at every ply's review frame ±2 (rectified through the ply's corners), so `/confirm` shows a clean picture of the timed position |

`source.retime` in the candidate records model, stride, frames read, agreement, how many plies
moved and which collapsed. The platform runs the verb right after `phone-candidate` (job
`phone-record`); a refusal fails the job with its sentence.

## Not covered

- A repeated position (threefold) inside one window could match the earlier occurrence; the
  window keeps the search near the phone's own order, so this needs both a repetition and a
  lag of more than 12 s.
- The PC label replay (`replay … label`) is not retimed yet; its commits come from the same
  engine and lag the same way on fast hands.

## Das Bild ist nicht der Label-Frame (2026-09-07)

Gemeldet: *„hier sehe ich viele bilder mit händen für das confirm"* (2026-09-06-21-29-35). Der
Eintrittsframe ist per Definition der ERSTE, auf dem die neue Stellung steht — die Hand ist dort
noch im Bild, weil sie die Figur gerade losgelassen hat. Als Label ist das richtig, als Bild für
einen Menschen das schlechteste der ganzen Haltezeit.

`moves[i].frame_review` trennt die beiden: von allen Frames, die der Pfad auf derselben Stellung
hält, der MITTLERE unter denen mit den wenigsten verdeckten Zellen (Coverage über
`PIECE_VISIBLE_MAX`). Beide Enden eines Halts sind schmutzig — vorn die Hand, die gesetzt hat,
hinten die, die zum nächsten Zug greift. „Der späteste bei Gleichstand" traf deshalb systematisch
den Frame kurz vor der nächsten Hand: auf 21-29-35 Ply 76 liegen 116 der 124 gelesenen Frames bei
0 verdeckten Zellen, und der letzte davon ist 3 Frames vor dem Zugriff. `frames/` wird um diesen Frame ±2 geschrieben, die Karten der Sichtprüfung öffnen
darauf (`review-cards.ts`), und `frame` bleibt unangetastet der Label-Frame. Ein Ply ohne eigene
Haltezeit (Mehrfach-Commit) erbt das Bild des nächsten, das eine hat.

Die Karten der Sichtprüfung zeigen zu einem retimeten Ply nur noch dessen EIGENE Frames
(`review-cards.ts`): das alte Fenster reichte bis zum nächsten Commit zurück und trug damit den
Schwanz der vorigen Stellung mit — ein Schritt zurück zeigte einen anderen Zug.
