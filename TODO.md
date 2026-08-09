# TODO — the user's ideas, parked on purpose

> Ideas raised mid-work. Nothing here interrupts what is running; they get picked up between
> pieces of work. Newest first within a section. When one is done, move it out with a one-line
> result, not a tick — what it MEASURED is the point.

## Next up (agreed, not started)

- **Mobile bucket sort** — a page that shows ONE crop big and a few large buckets underneath
  (occluded / empty / FEN is right / wrong → piece palette). Tap or swipe throws the crop in,
  the next appears. Meant for the phone, for volume; the brush stays the desktop tool.
  *"ich will das mal ausprobieren aber später"* (2026-08-09).
- **Video upload in the web UI** — today a new video is a `copy` into `data/testclip-raw/` plus
  four CLI steps (label → confirm → export-session → propose-occluded). The platform should
  take the file, put it where it belongs and run the chain. Asked 2026-08-09; the CLI path is
  written up in the answer of that day.
- **Review provenance** — "keep" in the tinder band writes nothing, by design (a row repeating
  the FEN is noise in a global training input). Consequence: *looked at and correct* is
  indistinguishable from *never looked at*. If that distinction should survive a reload, it
  needs its own ledger next to `corrections.jsonl` — the user's point of 2026-08-09: "nur weil
  ich occluded anmale heißt das nicht, dass alle Bauern richtig sind".

## Open questions the measurements left behind

- **First-frame quad vs scan median** — worth ±6-25 plies and the direction is inconsistent per
  video (specs/52, "geometry A/B"). `alignment_of` over the run is the arbiter, not ply counts.
  The only one of the four still open.

### Answered on 2026-08-09 — what they measured

- **The 12 phantoms of the dense arm are ALL `cnn_recovery`**, none from the resync (7 of those
  ran and invented nothing) and none from the verify ladder. They arrive in bursts at one frame —
  4767 produced four (`Rc7 Kd1 Rd7 Ke1`, a king round trip as parity filler) — and two bursts sit
  ON a missed real ply: `Bd7` at 4770 and `Qb4` at 6635. The same board difference, explained by a
  LONGER sequence. Cause: `deriveMovesDeepFull` ranked by hits with length as a mere tiebreak, so
  one misread square bought a 4-ply fabrication, and B↔R is the identity head's documented top
  confusion. Priced by `plyCostSquares` (see specs/53 STATUS for the table).
- **`P_OCCLUDED_THR = 0.5` is not what is blocking anything.** At four of the five phantom frames
  the head reads `occl=0` across the eight preceding observations, and at 4767 a hand (20-21 cells)
  had just cleared. A lower threshold would have prevented no phantom. The distribution is sharply
  bimodal — 3 638 of 4 410 observations at zero, then a broad hump at 13-20 cells — which is a hand
  and forearm, not a jittery threshold.
- **The 26-cell `disagree` board (frame 004266) is neither a shifted grid nor a wrong FEN.** Every
  one of the 8 neighbour offsets scores WORSE than 0/0, and no position in the whole game matches
  the reading better than the labeled one (best rival 40/64, labeled 38/64). It is simply a frame
  the model reads badly. It did surface something else, though: 760 of 760 dirty rows carried no
  `unknown_squares`, because the exporter fix never reached the exported data — see below.

## Standing rules that came out of the same conversations

- A newly exported session is a SUPPLEMENT to the corpus, never the bulk: two videos at 50 % of
  the train split cost 105 phantoms. Pre-cap with `--source-manifest` (specs/53 STATUS).
- The model may PROPOSE on a video, never on one it was trained on — `occluded_model.py`
  refuses that outright.
- **A fix in the exporter is not a fix in the data.** Both sessions sat on logs written before
  `unknown_squares` existed, because re-running the export meant decoding the whole video again.
  Re-export is cheap now (frames on disk are kept) and non-destructive (a repaired quad is carried
  over), so after any change to `plan_rows`, re-export and check the field is actually there.
