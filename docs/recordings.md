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
| `standing-fixed/` | constant | one quad, camera still | **kein Pfad** — `export_static` wurde am 2026-08-21 entfernt, siehe TODO.md |
| `standing-turntable/` | constant | **a quad per frame** — the board rotates, a median quad is meaningless | **kein Pfad**, aus demselben Grund |
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
| `20260813-134818/video.mp4` | game | fixed | yes | QHD Android training recording, mapped by `2026-08-13_1351.json`. Contains deliberate/accidental move-forward-and-back regions. The original pack admitted visible hands in frames 2736 and 4584 as `clean`; its denser experiment also admitted 2970. The fail-closed pack added 2026-08-13 exposes fresh CNN occlusion/conflict state and writes only warning-free boards to `accepted/`: the full-rate `every=6 stable=2` verification produced 142 accepted boards (9,088 crops), 30 quarantined boards and 1,179 unreviewed grid-hand proposals. None of 2736/2970/4584 entered `accepted/`. Review packs use the invalid class `unreviewed`, so they cannot silently enter training. |
| `20260813-193423/video.mp4` | game | fixed | yes | QHD Android training recording, mapped by `2026-08-13_1941.json` (8 saved plies). Imported 2026-08-13: 11,532 frames at 27.97 fps; the default full-rate `every=8 stable=3` pack produced 35 nominally clean boards (2,240 crops) and 444 `occluded` crops. It excluded 901 sampled frames as `not_in_game`, so keep this pack outside the aggregate dataset until the clean-board review is complete. |
| `VID_20260812_112853.mp4` | `rnbqkb1r/ppp1pppp/5n2/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR` | turntable | no | Position from the preceding tracked game: `1. d4 d5 2. Nc3 Nf6 3. e4`. 1080p, 199 s. Kotlin `rectify` sampled 20/20 frames (every 300), none missed; mean worst square offset 1.75 px. Lens fit was rejected, so use the raw per-frame geometry path. |

## Gelöscht

- `2026-08-13-12-24-07` (1,9 GB), auf Anweisung des Nutzers am 2026-08-14. Kein Game-Record,
  Quad-Spread p90 10,77 px (Brett bewegt sich), 2327 von 2559 Stichproben ausgerichtet. War die
  REFERENZ, aus der `repair-recording` die Codec-Parameter der drei geretteten Aufnahmen zog — die
  sind geschrieben, es hängt nichts mehr daran; eine künftige Reparatur nimmt eine beliebige
  gesunde Aufnahme desselben Geräts.
- `2026-08-13-12-42-19` (252 MB, 2:30), auf Anweisung des Nutzers am 2026-08-14: *"hier ist 2,5 min
  nur ein Brett auf dem nichts passiert"*. Geometrisch die beste Aufnahme des Tages — 326 von 326
  Stichproben ausgerichtet, Quad-Spread p90 0,55 px — aber ohne Spiel darauf ist sie kein Datensatz.
  (Der Label-Lauf hatte sie ohnehin abgelehnt, an der variablen Bildrate: p90 16,89 ms.)
- `2026-08-13-12-45-12` (148 MB, 46 s), auf Anweisung des Nutzers am 2026-08-14 — samt seinem
  geparkten Originalvideo. Die Reparatur war erfolgreich (1 337 Frames, Brett in allen Stichproben,
  2,74 px), aber der Label-Lauf misst **Quad-Spread p90 143,95 px, max 292,21** gegen ein Kriterium
  von 4: das Handy wurde während der Aufnahme bewegt. Kein Game-Record.
- `2026-08-13-12-12-16` (4,2 MB, **2 s**) und `2026-08-13-01-39-15` (69 MB, 52 s), auf Anweisung des
  Nutzers am 2026-08-14. Beide durch den Label-Lauf gegangen, beide mit **0 committeten Plies**:
  01-39-15 schrieb einen Kandidaten mit leerer Zugliste (drei Entscheidungen, alle `rejected`),
  12-12-16 ist zwei Sekunden lang. Kein Game-Record, keine exportierte Session, keine
  Korrekturzeilen.
- `2026-08-13-12-10-55` (185 MB, 77 s), auf Anweisung des Nutzers am 2026-08-14. Gemessen
  unbrauchbar: **16 von 232** gesampelten Frames richten sich am Gitter aus (100 sind nötig) und der
  Quad-Spread p90 liegt bei 70 px — das Brett war überwiegend nicht im Bild. Kein Game-Record, keine
  exportierte Session, keine Korrekturzeilen. `data/inbox/transfers.jsonl` führt es weiterhin als
  gelandet; die Kopie auf dem Handy (`20260813-121055`) trägt ihre `transfer.json` und wird deshalb
  auch nicht erneut übertragen.

## The four repaired recordings (2026-08-14)

`20260813-121218`, `-123904`, `-124512`, `-124624` were killed mid-capture by an `adb install` and
had no MP4 index. Rebuilt with `:desktop repair-recording` from `2026-08-13-12-24-07`'s parameter
sets; the payload is untouched, the frame rate (28.63 fps) is ASSUMED from that reference. Geometry
is sound — 70 of 70 sampled frames find the board at 2.52-2.83 px — and none of them carries a game
record, so their move list has to come from a replay and a human. Originals in
`data/_parked/2026-08-14-unfinalized-originals/`.

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

---

## How a recording is refused — and why it is NOT a pass rate

`ALIGN_PASS_MIN = 0.85` measured **playing speed, not footage quality**. `rec-20260808-003957` — a
famous-game reenactment at ~10 s/move — reads **82.5 %** align-pass on flawless geometry (worst
offset median 2.9 px at cell 116, quiet spread, exact clock, 4 markers on 847/1014 samples). The
failing samples are hands, and a hand says nothing about the board; the 0.85 had been calibrated on
a ~2 %-hands live game and its own comment said "seven times handsier" would break it (`specs/52`).

Replaced 2026-08-08 by **`MIN_ALIGNED_SAMPLES = 100`** (`GeometryScan.kt:296`, refusal at `:214`):
every aligned sample has already passed `alignmentOf`'s per-frame gate (worst offset within 4 % of a
cell AND all 18 grid lines), a nudged board is the spread gate's job, and what a median quad needs
is *enough* of them. The rate is still reported, labelled as a playing-speed number.

| video | rate (old gate) | aligned samples | result under the new gate |
|---|---|---|---|
| `rec-20260808-003957` | 82.5 % → REFUSED | 837 | **42 plies, 200 review frames** |
| `rec-20260808-115912` | 82.4 % → REFUSED | 1 765 | **72 plies, 325 review frames** |

The label replays through the scan's static median quad, so its ply count differs from a live-align
quiet run (003957: 42 vs 67 — worse; 115912: 72 vs 61 — better). The label is the review PROPOSAL.

## `start_frame` DROPS leading frames, it does not seek

Recorded from `scripts/replay_clip_cnn.py` before that file was deleted with the Python tracker
(`specs/52`). The clock never sees the dropped frames, so the replay is exactly the replay of a
trimmed clip. It exists because `VID_20260802_222741` changes illumination **locally** over its
first ~1 s — the a-file corner gains 32–38 % of its luma between frames 20 and 30 while h8 loses
20 % and the whole-board mean does not move — after which a reference taken at frame 0 reads
a1/a2/b1 as changed in 178 of the next 200 frames, forever, and the tracker sits in `no_legal_move`
from frame 14.

It turned out **not to be needed** on that video: replayed at `--start-frame 60` and at 0 the
committed move list is byte-identical (all 22 plies, same order); only the decider mix moves
(`cnn_recovery` 5 vs 3, `cnn_occupancy` 11 vs 13). It is a decode-side skip, never a threshold
override. **The Kotlin harness has no equivalent.**

## What the on-device recorder used to lose (2026-07-27, `specs/19` phase 03)

Six defects, ordered by how much recorded data each cost. All six are **fixed** (`ccce33d`,
`a164c05`) and the fixes are in the current tree; they are kept here because the recordings made
before them are the ones on disk, and because D1's shape recurs.

| # | defect | cost |
|---|---|---|
| **D1** | `GameSessionController.onEvent` handled only `MoveCommitted`; `TrackerEvent.SequenceCommitted` fell into `else -> Unit`. The engine commits plies through **two** events — `Commit.kt` `commitSequence` (decider `diff_pair`, fast play: half-move + reply) and `CnnTick` (decider `cnn_recovery`) — and queues a session photo for both | **every pair commit and every CNN recovery produced no `log.jsonl` row, no JPEG and no move in the saved game/PGN.** Five other consumers of the same bus handled the event (notification counter, `MoveList`, `SpectatorController`, `MoveAnnouncer`, `StatusUiModel`); the recorder's driver was the only one that did not — which is exactly the user report that the move list counts more moves than the app saves |
| D2 | the deferred photo flushed on **every** `ReAnchored`; Python flushes only when the occlusion set is empty | frames taken with a hand over the board, i.e. 64 crops labelled as pieces that cannot be seen — invisible until someone runs `chesslab slice` weeks later |
| D3 | `startRecorder` created `frames/`, `log.jsonl` and `session.yaml` **before** `capReached` was evaluated | the only path producing a session directory with a zero-byte `log.jsonl` and no frames; it then counted against the next `totalBytes()` |
| D4 | a failed frame write returned 0 and was swallowed — no counter, no reason, no log, `pending` already cleared | the mechanism behind "recording doesn't work well" being all anyone could say |
| D5 | `RecordingGates.reason` was set and never cleared | one transient geometry blip made the only diagnostic the UI shows report a stale skip forever |
| D6 | nothing reported frames written | a recorder that has written zero frames for ten minutes was indistinguishable from a working one |

Fix state today: `SequenceCommitted` routes into `onCommitted` (`GameSessionController.kt:90`,
one photo per commit not per ply), the `ReAnchored` flush is gated on `isClean(status)` (`:96`),
`capReached()` is evaluated before the recorder opens (`SessionCapture.kt:199`), `failedWrites`
exists (`:93`) and `recordedFrames` is surfaced (`GameSessionController.kt:36`,
`RecordingSection.kt:200`).

Negative results from the same audit, recorded so they are not re-investigated: one `log.jsonl`
line per frame file was **already** true and passed unfixed; the write path was already off the
analyzer thread; and the Python `auto_record` session leak has **no Android equivalent**.
Whether these six are *the* mechanism behind the two suspect directories on the phone is unproven —
no device was attached when they were found.

## Recorded games were not games

Four of five stored games were **not legal sequences from their own `startFen`** (broke at plies 1,
2, 18 and 28). The engine cannot commit an illegal move — its board jumps BETWEEN commits (alarm
resolved, FEN resync, accepted recovery) and `GameSessionController` dropped `Alarm`/`AlarmCleared`
via `else -> Unit`. Such a file is unusable as a game **and** as labelled data. `LiveGame.continues`
(`LiveGame.kt:110`) now ends the record at the seam.

In the same pass: all 77 recorded plies stored `provenance: null`, **including sessions recorded
with debug ON**, because the decider was read from the debug payload and matched by
`accepted && uci`. It is taken from the commit event directly now.

## The stored device profile carries its margin forward — "recalibrate" does not adopt 0.045

`config.DEFAULT_MARKER_MARGIN = 0.045` has two independent instruments behind it: a grid-line
alignment sweep over four recordings (two phone, two rendered; optimum 0.040–0.050) and a
committed-ply sweep against a played game on a recording that was not in that four.

| margin | grid-line alignment | committed plies (`vid1244`) |
|---|---|---|
| 0.030–0.035 | outside the optimum | wrong (3 of 5 plies) |
| **0.040–0.050** | **optimum** | 0.040 and 0.050 reproduce the played game exactly |
| 0.060 | over-indented | wrong (3 of 5 plies) |

They disagree on exactly one point: alignment's optimum is 0.045, and the ply count at 0.045 is
wrong while both neighbours are right — the ply count alternates across the whole sweep
(0.040 right, 0.045 wrong, 0.050 right), so that is the second instrument's chaos, not evidence.

The trap: the phone's stored profile carried **margin 0.06**, the superseded default, and
`CalibrationStore.carryOver` writes `margin = marginOverride ?: existing.margin`
(`CalibrationStore.kt:141`). `marginOverride` is non-null only when the user has **touched the
per-corner sliders in this session**. So "recalibrate the board" never adopts 0.045 — only moving
the sliders does. The carry-forward is the right design (per-corner outset is measured geometry;
re-detecting corners is no reason to discard it); the gap is that **nothing ever measures it**, so
a stale value and a tuned one are indistinguishable. On `vid1244` that is the difference between 3
committed plies and the whole game.
