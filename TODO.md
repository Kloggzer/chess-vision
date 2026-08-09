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

- **Where do the 12 phantoms of the dense arm come from?** specs/53 STATUS names the two
  candidates (resync adoptions of hand-distorted positions vs verify-ladder commits); the
  decisive frames are already written to disk.
- **`P_OCCLUDED_THR = 0.5` against a head trained on 2 114 crops** is probably too strict. The
  ledger's per-read distribution is on disk and answers it in minutes.
- **First-frame quad vs scan median** — worth ±6-25 plies and the direction is inconsistent per
  video (specs/52, "geometry A/B"). `alignment_of` over the run is the arbiter, not ply counts.
- **The `disagree` filter already found boards with 22 contradicting cells** (frame 004266 of
  003957). That is a whole wrong position, not 22 misreads — worth one look before the next
  training round.

## Standing rules that came out of the same conversations

- A newly exported session is a SUPPLEMENT to the corpus, never the bulk: two videos at 50 % of
  the train split cost 105 phantoms. Pre-cap with `--source-manifest` (specs/53 STATUS).
- The model may PROPOSE on a video, never on one it was trained on — `occluded_model.py`
  refuses that outright.
