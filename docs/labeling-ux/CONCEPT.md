# The labeling rework — a UX concept

> Written 2026-08-15, after the session that produced the verdict below. **Concept only** — no code,
> no implementation, nothing committed beyond this file. Every number in here was read off the disk
> and the file it came from is named; where a number does not exist yet, this document says so
> instead of inventing it.
>
> **Ledger figures are a snapshot, read 2026-08-15 ~01:00 local, and they go stale in minutes.**
> Between the first draft and this revision the corpus moved from 12 674 to **17 225** correction
> rows and from 1 158 to **1 365** touched boards — 18 minutes and one more sitting. Numbers marked
> `[01:00]` are dated for that reason. Every dashboard specified here **reads live**; no exit
> criterion in §9.2 is written against a literal, only against a relation. That the corpus outran
> its own documentation inside an hour is this concept's best argument, and it is stated rather
> than hidden.
>
> Companion reading: `platform/app/README.md` (what the app does today), `docs/data-pipeline.md`
> (what happens to a label after it is written), `docs/phone-transfer.md` (how a recording arrives),
> `TODO.md` (the two parked entries this concept absorbs).

---

## 0. The spine

The user, mid-flight on 2026-08-15:

> *"ich interessiere mich eigentlich gar nicht welche Session ich label — sofern ich nen Stream von
> Daten habe, label ich den. ich will verschiedene Ansichten haben die es mir einfacher machen.
> sobald ich die Videos gemacht habe und die gesynct werden ist mir auch egal wie die heißen — ich
> will PGN confirmen, und dann alle abarbeiten mit insta rauswerfen etc, dann weiter ins Labeling."*

That is the organising principle of this document, above everything else:

1. **The unit of work is an activity stream, not a game.** Two streams: **Züge** (confirm every
   pending game's plies, back to back) and **Labeln** (every board of every session in one
   continuous feed). A game boundary is a caption, not a navigation step.
2. **Names are metadata.** A session id appears small, next to the work, never as something to click
   through. Nothing in the daily loop requires knowing what a recording is called.
3. **"Insta rauswerfen" is a stream action**, one key, no page change: throw out a ply, a board, or a
   whole recording and the stream continues at the next item.
4. **The pipeline is invisible while it is healthy.** A synced recording works its way to the stream
   by itself. Buttons survive only as recovery for a step that failed.
5. **Per-game pages survive as drill-down and debug surfaces.** The daily loop never opens one.

Everything below serves that spine. The four complaints from the same day are its symptoms:

| the complaint | what the disk says |
|---|---|
| *"jede Seite ist irgendwie gleich ne Tabelle mit irgendwelchen Sachen"* | `/`, `/confirm`, `/relabel` are three list surfaces over one function, `chainState()` (`platform/app/lib/chain.ts:78`); `lib/queues.ts:66` filters the same rows three ways. They are **lists over games** where the user wants **streams over work** |
| *"bekomme nahezu kein Feedback darüber wieviel ich gelabelt habe"* | the bar on `/` is `done/total` with `total` = every proposal row (`app/page.tsx:16-21`). On `rg-2026-08-08-00-39-57` that is 83 484 cells, of which the **guided queues route a human to 6 635 (8 %)**; the other 92 % are reachable only by free-hand drilldown, so the bar crawls |
| *"ich kann nicht wirklich verifizieren wie unser Datenset aussehen würde"* | `corrections.jsonl` holds **16 923** hand-painted `occluded` rows `[01:00]`; `data/datasets/real14-all-80-v1/split.json` `train_class_counts.occluded` = **3 901**, from exactly two sessions. **77 % of the hand work is in no dataset** and no screen says so |
| *"das ganze Labeling-Tool braucht nen Rewrite/Rework, das UX ist einfach unterirdisch"* | and on top of all that, **six machine steps are sitting still right now** waiting for a button a human has to remember to press (§2, D0) |

---

## 1. The tooling as it stands, so old → new can be mapped

### 1.1 The chain, and where a human has to click

`lib/chain.ts:114` — the next step is read off the disk, never remembered. `●` marks a click:

```
transfer ──▶ ● label ──▶ ● confirm ──▶ ● export-session ──▶ ● propose-occluded ──▶ ● relabel
  (auto)      (job)       (human)        (job)                (job)                  (human)
              ●adopt-pgn: copy the phone's .pgn in as reference.pgn — a separate click again
```

Only the transfer itself is automatic (`docs/phone-transfer.md`: the phone pushes, `training-video-pack` is queued behind it). Everything after it waits for a press. **Counted on disk, 2026-08-15:**

| click | games waiting on it right now |
|---|---|
| `Label` | 1 — `2026-08-14-09-23-19` |
| `Export session` | 4 — `2026-08-13-12-46-24`, `2026-08-14-14-32-33`, `2026-08-14-20-35-52`, `2026-08-14-21-01-04` |
| `Propose occluded` | 1 — `2026-08-14-20-48-55` (a session on disk, no proposals, therefore invisible to `/relabel`) |
| `adopt-pgn` | **17** bundles carry a phone `.pgn` and have no `reference.pgn` |

Six machine steps and seventeen file copies, all of them pure functions of disk state, all of them
blocked on a human noticing a card.

### 1.2 The seven surfaces

| # | route / component | what it is for today |
|---|---|---|
| S1 | `/` — `app/page.tsx`, `app/cards.tsx` `GameCard` | one row per bundle: title, chain button, ply count, `done/total` bar, PGN upload, `nutzlos`, archive; plus collapsed `nutzlos` / `archiviert` / `N Bundles ohne Video` |
| S2 | `/confirm` — "Zu bestätigen" | the same rows, filtered to `step === "confirm"` |
| S3 | `/confirm/<name>` — `ConfirmReview` | mismatch cards (LCS-unmatched plies, move drawn on the board, keep/drop) + the **Sichtprüfung** gallery of matched plies (look-only) + one `Confirm` button at the bottom |
| S4 | `/relabel` — "Zu labeln" | the same rows again, filtered to `step === "relabel"`, plus **Noch nicht gelesen** and **Bundles ohne Video** |
| S5 | `/relabel/<name>` — `Streams` | six tabs: `hände einzeichnen`, `bucket · occluded`, `bucket · unsicher`, `bucket · control`, `board drilldown`, `filter by class` |
| S6 | `/transfers` | pairing token, LAN addresses, transfer board |
| S7 | `app/relabel/[name]/tinder.tsx` | **dead code** — nothing imports `TinderBand`; `lib/proposals.ts:95` records why (*"tinder nervt"*, 2026-08-10) |

S2 and S4 were built earlier tonight and are the right instinct one step short: they are **lists that
point at per-game pages**, where the spine asks for **streams that contain the work**.

### 1.3 The wire formats (the only bridge to Python)

| file | written by | read by | shape |
|---|---|---|---|
| `data/realgames/<n>/candidate.json` | `:desktop replay … label` | `realgames.py`, `lib/data.ts`, `lib/session.ts` | `moves[{ply,san,frame,fen_after}]`, `confirmed`, `confirmed_at`, `reviewed_plies`, `geometry`, `clock.fps`, `source.crop` |
| `data/sessions/rg-<n>/log.jsonl` | `realgames.plan_rows` (`realgames.py:275-329`) | `slice_session`, `lib/session.ts` | `frame, ply, fen, ts, corners, corners_source`; `dirty` **only when true**; `unknown_squares` **only when non-empty**. No `phase`, no `since_s` — `lib/session.ts:109` derives those |
| `data/realgames/<n>/occluded-proposals.jsonl` | `occluded.propose_occluded` | `lib/proposals.ts` | line 1 `{"_thresholds":{"hi","lo"}}`; rows `session_id, frame, square, fen_label, proposed, score`, optional `pixel_score`+`probs` (**model only**), optional `grid_score` |
| `data/labels/corrections.jsonl` | `POST /api/corrections` | `labeling.load_corrections` (`labeling.py:251`) | `{session_id, frame, square, label, ts}`; dedup `(session_id, str(frame), square)`, **last line wins**; `ts` not read |
| `data/labels/reviewed.jsonl` | same route, `ledger:"reviewed"` | **nothing in Python** | same shape; UI-only provenance |
| `data/realgames/<n>/training-pack/summary.json` | Kotlin `TrainingVideoPack.kt:270` | `lib/jobs.ts:159` | `sampled_frames, accepted_*, quarantine_*, occluded_proposal_*, model`. **Two schemas on disk** — older packs say `clean_*`/`occluded_*` |
| `data/datasets/<n>/{manifest.jsonl,split.json,dataset.yaml}` | `dataset_build.build_dataset` | training | `split.json`: `classes, class_weights, splits, counts, train_class_counts, train_subsample, warnings` |
| `data/_perf/*.json` | `scripts/eval_packed_13c.py` | nothing yet | `pack, model, crops, boards, crop_accuracy, occupancy_accuracy, occupied_piece_accuracy, phantoms, misses, top_confusions[]` |

**The rework writes the same files.** No format is replaced.

### 1.4 What is already right, and must survive the rework

Each of these was paid for with a measurement. A reviewer should check the rework against this list first:

- **Bucket pages group by square, not by score** (`bucket.tsx:66-72`) — score order scattered a square's six crops over six pages (*"ich sehe immer noch alte Bilder"*, 2026-08-09).
- **Flood-then-erase** (`a`, `drilldown.tsx:212`) — on a board mostly under a hand the clean cells are the work.
- **`lib/selection.ts` (2026-08-15)** — flags are a *selection*; confirm commits what is shown, not what was proposed.
- **`judged` bright vs dim** (`drilldown.tsx:129`) — the board never implies untouched cells were reviewed.
- **The phase chip** — `after` / `before` / `settled`, derived in `lib/session.ts:109`.
- **Two ledgers** (`lib/corrections.ts:39`) — `reviewed` must not pollute a global training input.
- **Touch floors written `max-sm:h-11`**, never `h-11 sm:h-8`.
- **Chain steps refuse a step that is not the disk's next one** (409 with the state) — this stays true under Autopilot; it is what makes an auto-runner safe.

---

## 2. What the measurements say is broken

### D0 — The pipeline stalls on clicks, so the streams run dry

§1.1: six machine steps and seventeen PGN copies are waiting on a human right now. Every one of them
is `nextStep()` (`lib/chain.ts:114`) applied to the disk — a pure function the app already computes
on every page load and then *asks a human to execute*. The labeling stream is missing one whole
recording's boards (`2026-08-14-20-48-55`) for no reason other than that nobody pressed
**Propose occluded**.

### D1 — The denominator is a different quantity from the work

`app/page.tsx:16` counts every proposal row; `lib/proposals.ts:97` routes a human to three slices of them.

| session | proposal cells | in a guided queue | share |
|---|---:|---:|---:|
| 2026-08-08-00-39-57 | 83 484 | 6 635 (confirm 1 225 + unsure 5 230 + control 180) | **8.0 %** |
| corpus (9 files) | **251 413** | — | ~8 % |

**This is a pacing defect, not a hard cap.** The remaining 92 % *are* writable: `streams.tsx:172-184`
renders the board tab with `accepts={undefined}`, so `drilldown.tsx` gets all 1 320 frames and the
brush can write any of their 84 480 cells straight into `corrections.jsonl` — which is exactly what
`app/page.tsx:19-20` counts as `done`. Nothing caps the bar. What is missing is that **no workflow
routes a human to those cells**, so the bar moves imperceptibly against a denominator eight times
larger than the guided work. Calling that a ceiling would be a claim one query disproves; the honest
statement is that the denominator counts cells the product never asks anyone to visit.

The unit a human clears is a **board**, and proposals exist only for `dirty` frames:

| game | log rows | `dirty` | boards with proposals | boards touched | % |
|---|---:|---:|---:|---:|---:|
| 2026-08-07-13-52-38 | 2 608 | 480 | 480 | 278 | **57.9** |
| 2026-08-08-00-39-57 | 3 103 | 1 320 | 1 320 | 340 | 25.8 |
| 2026-08-08-11-59-12 | 1 745 | 1 020 | 1 020 | 346 | 33.9 |
| 2026-08-08-11-55-19 | 369 | 278 | 220 | 48 | 21.8 |
| VID_20260802_222741 | 2 406 | 480 | 460 | 118 | 25.7 |
| VID_20260726_233432 | 852 | 318 | 300 | 16 | 5.3 |
| 2026-08-13-19-34-23 | 156 | 75 | 56 | 12 | 21.4 |
| VID_20260727_233929 | 697 | 98 | 80 | 0 | 0 |
| VID_20260802_222203 | 68 | 40 | 40 | 0 | 0 |
| **corpus** | | | **3 976** | **1 365** `[01:00]` | **34.3** |

The first game is 58 % done and the UI said 8.3 %. The feedback is not missing — it counts the wrong noun.

### D2 — The identity path: the producer is fixed, the corpus is not

**Fixed at the producer tonight.** `lib/jobs.ts:553` now appends
`--model data/models/real14-ms-s3-hn-bn80` (overridable via `CHESSLAB_PROPOSE_MODEL`) to every
propose job. The diagnosis that motivated it stands and is what the backlog is measured against:
`occluded.py:384-385` writes `pixel_score` and `probs` only when a model was passed, and over all
nine proposal files **currently on disk**:

```
rows with "probs":       0 / 251 413
rows with "grid_score":  9 655 / 251 413
```

Therefore, provably from `lib/query.ts`, *for every proposal file that exists right now*:

- `classesSeen()` returns `[]` → the class dropdown offers only its hard-coded fallback (`filter.tsx:88`).
- `matches(row, {klass: DISAGREE})` is `false` for every row (`query.ts:42` requires `probs`) → **"the model disagrees with the FEN" returns zero boards on every session in the corpus.**
- `topRead()` is `null` → the reads overlay is always empty.

And in the ledger: of 17 225 correction rows `[01:00]`, exactly **141** are piece identities —
against 16 923 `occluded` and 161 `empty`. The identity count has not moved in the last 2 758 rows.

Meanwhile `data/_perf/ms-champ-realgame-holdout.json` says `id35-80-before-hn-20260812`'s worst
confusions on a real game are `bP→bB` 555, `wN→wP` 408, `wR→wP` 344.

**What is left is a re-propose pass, and it is not free.** 251 413 rows have to be regenerated on the
single slot, and `check_not_circular` (`occluded_model.py:52`) will refuse part of it. Measured
against `real14-ms-s3-hn-bn80`'s own dataset (`config.json → real14-all-80-v1 → split.json
splits.train`):

| | sessions | proposal rows | share |
|---|---:|---:|---:|
| **refused** — `rg-…` is literally in `splits.train` | 6 | 134 044 | **53.3 %** |
| allowed | 3 | 117 369 | 46.7 % |

⚠ **The guard's allow-list is wrong, and this is a producer bug, not a UI problem.** The two largest
allowed sessions — `rg-2026-08-07-13-52-38` (30 364 rows) and `rg-2026-08-08-00-39-57` (83 484) — are
**113 848 rows, 45.3 % of the corpus, and the model did train on them**: their occluded crops entered
`real14-all-80-v1` under the aliases `occ-rg-2026-08-07-13-52-38` and `occ-rg-2026-08-08-00-39-57`
(`split.json` `splits.train`, verified). `check_not_circular` does a literal string match on
`session_id`, so the `occ-` prefix walks straight past it. Only **`rg-2026-08-13-19-34-23`, 3 521
rows (1.4 %)**, is genuinely clean under this model. Fix the guard (match on the trailing session id,
not the alias) or pick a different propose model, before the re-propose pass runs — otherwise
45 % of the new `probs` are the model reading back its own labels.

### D3 — Lists over games, where the spine asks for streams over work

S1/S2/S4 render `QueueRow` from the same `chainState`. Beyond the duplication, the shape is wrong for
the stated need: to judge four pending games today the user must open four URLs, scroll to the bottom
of each, press one `Confirm`, and return. To label he must pick a session first — the one choice he
just said he does not care about.

### D4 — The corpus is invisible, and a standing rule is being broken

`TODO.md:203` states the principle — *"A newly exported session is a SUPPLEMENT to the corpus, never
the bulk: two videos at 50 % of the train split cost 105 phantoms."* It contains **no percentage**;
the only measured point on the safe side is `specs/53-cnn-headroom/STATUS.md:85` (`donor + rg capped
to 5.3 % → 2 phantoms`), which is one configuration, not a declared cap. Counted from
`real14-all-80-v1/manifest.jsonl` against `split.json` `counts.train = 209 643`:

```
real-game sessions in train:  72 939 crops = 34.8 % of train
one game alone:               38 235 crops = 18.2 %  (rg-VID_20260802_222741)
occluded in train:             3 901 crops =  1.9 %
empty in train:              106 707 crops = 50.9 %
```

No screen shows any of it. Two measured points exist — 5.3 % → 2 phantoms, 50 % → 105 — and the
corpus sits at 34.8 % without anyone being told.

### D5 — 4 639 cells are dropped, and no queue routes to them

`occluded.py:333,338` excludes cells named in `unknown_squares` from proposals entirely.
`labeling.py:365-379` then **drops** those cells at slice time unless a correction exists — a human
correction is the only thing that outranks `unknown_squares`. Across `data/sessions/rg-*/log.jsonl`:

```
unknown cells corpus-wide: 4 639
  of which on the nine sessions with proposals: 4 439
  the tenth (rg-2026-08-14-20-48-55, 200 cells) has no proposal file yet
00-39-57 alone: 1 627 — but only 996 of those sit on dirty frames
                (1 320 × 64 − 83 484); the other 631 are on frames that
                produce no proposal row at all
```

The board already *prints* them — `drilldown.tsx`'s `PhaseChip` renders `FEN unknown on <squares>`
whenever the row carries any. What is missing is a **queue**: nothing puts those boards in front of
a human, and 631 of one session's 1 627 sit on boards that are not in the proposal stream at all,
so they cannot be positioned in it either (see the lane's own denominator in §4.2).

---

## 3. Information architecture after the rework

### 3.1 Two streams, two reference surfaces, one autopilot

```
                    ┌──────────────────────────────────────────────┐
                    │  AUTOPILOT  (a strip, present on every page)  │
                    │  läuft · export-session 2026-08-14-14-32-33  │
                    │  3 in Warteschlange · 1 Reparatur   [ ⏸ ]    │
                    └──────────────────────────────────────────────┘
   THE DAILY LOOP
   ┌───────────────────────────────┐      ┌───────────────────────────────┐
   │  /strom/zuege                 │  ⇢   │  /strom/labeln                │
   │  ZÜGE — confirm, all games    │      │  LABELN — boards, all sessions │
   │  back to back, auto-commit at │      │  lanes switch the FILTER,      │
   │  each game boundary           │      │  never the page                │
   │  x = insta rauswerfen         │      │  x / X = insta rauswerfen      │
   └───────────────────────────────┘      └───────────────────────────────┘
                    │  "." on any item                    │
                    ▼                                     ▼
   REFERENCE / DEBUG (never in the daily loop)
   ┌───────────────────────────────┐      ┌───────────────────────────────┐
   │  /game/<name>                 │      │  /corpus                      │
   │  one recording, everything:   │      │  "wie sähe unser Datenset aus" │
   │  chain state, job logs, its   │      │  pool vs snapshot vs diff,     │
   │  own confirm view and board   │      │  class balance, session share, │
   │  queue, nutzlos, PGN, archive │      │  quarantine, veto metric       │
   └───────────────────────────────┘      └───────────────────────────────┘

   /transfers unchanged and out of scope.
```

### 3.2 Merged, killed, kept

| today | after | why |
|---|---|---|
| `/` + `/confirm` + `/relabel` (three lists) | **two streams** + `/game/<name>` for drill-down | D3 and the spine. The list is not a smaller stream; it is the thing standing between the user and the work |
| `/confirm/<name>` page with a bottom `Confirm` button | the **Züge stream**; the button becomes an **automatic commit at the game boundary** | today the write is a button a human must scroll to (`app/confirm/[name]/cards.tsx:184`). In a stream the boundary is the write |
| `/relabel/<name>` six tabs | the **Labeln stream** with **lanes** (the same six predicates as filters) | five of six tabs are the same two widgets; the tab bar made the *view* the choice when the real choice is *which boards* |
| `bucket · occluded` / `· unsicher` | **kept, as a lane *renderer*** — those lanes render the bucket's cell grid (grouped by square, `bucket.tsx:66-72`); board lanes render the board. Plus the same grid as a per-square accelerator (`Shift+Space`) | a cell grid and a board reach **different work**, and folding the grid into the board loses cells. Today's bucket iterates 5 230 unsure cells on `00-39-57` independently of which boards you stop at; a board-only lane reaches a cell only via a board its accept set opens, and the hand lane opens **355 of 1 320** boards — the unsure cells on the other 965 would become unreachable |
| `bucket · control` | a cell lane, `Stichprobe (180 Zellen)` | 180 sampled cells that write to `reviewed.jsonl` are a QA duty, not a destination |
| `filter by class` tab | the **lane bar**, always visible | the only place the identity job can live (D2) |
| `tinder.tsx` | **deleted** | dead since 2026-08-10; keeping it invites its accidental revival |
| `Label` / `Export` / `Propose` / `adopt-pgn` buttons | **Autopilot** (§5); the buttons survive only on `/game/<name>` and on Reparatur rows | D0 |
| `nutzlos`, archive, PGN upload, the 409 step guard | kept verbatim | they work, and the 409 guard is what makes Autopilot safe |

> **Decision:** two streams, and a per-game page that the daily loop never opens.
> **Strongest alternative:** one single stream that interleaves confirm cards and label boards, so
> there is exactly one place to be. **Why not:** the two jobs have incompatible mental modes and
> incompatible keymaps — confirm asks *"does this photo show the position after this move?"* over a
> whole board and a move arrow; labeling asks *"which cells are covered"* with a loaded brush. The
> user's own sentence puts them in sequence (*"ich will PGN confirmen … dann weiter ins Labeling"*),
> not in a blender. Two streams, one handoff.

---

## 4. The streams

### 4.1 ZÜGE — `/strom/zuege`

Every pending game's cards, concatenated, newest recording first. The user never picks a game.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ZÜGE   Karte 3/17 · 4 Partien offen        Autopilot: läuft (1 in Queue)   │
│ 2026-08-13-19-34-23 · Halbzug 12 · @frame 004212        [ 14 Sekunden/Zug ]│
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│        rectified board, move drawn on:                                     │
│        yellow = from · green = to · amber arrow                            │
│        ◀ ▶  steps the commit window's frames (card.stems)                  │
│                                                                            │
│  Zeigt das Foto die Stellung NACH diesem Zug?                              │
│  [ k  behalten ]   [ ⎵  verwerfen ]   [ x  Partie raus ]   [ z  zurück ]   │
├────────────────────────────────────────────────────────────────────────────┤
│ DIESE SITZUNG   17 Karten · 4 behalten · 12 verworfen · 1 Partie raus      │
└────────────────────────────────────────────────────────────────────────────┘
```

| key | action | writes |
|---|---|---|
| `k` | keep this commit, advance | buffered; committed at the game boundary |
| `Space` / `j` | drop, advance (the default — everything starts as DROP, `app/confirm/[name]/cards.tsx:178`) | buffered |
| `←` `→` | step the commit window's frames (`card.stems`), never advances | nothing |
| `g` | flick through this game's **Sichtprüfung** gallery (LCS-matched plies), `Esc` returns | see §7c |
| `x` | **insta rauswerfen** — `useless.json` on this recording, **discard its buffered keeps**, skip every remaining card of it, continue at the next game | `POST /api/useless/<name>` only. **No `writeConfirmation`** — stamping `confirmed: true` on a recording the human just rejected would hand Autopilot an export of exactly that recording |
| `z` | undo one card, including across a game boundary — see §4.1.1 for what that costs after the boundary has committed | rewrites the boundary's buffer, or the game's `reviewed_plies` |
| `g` | open `/game/<name>` in a new tab (debug) | nothing |

**The game boundary is the commit.** When the last card of a game passes, the stream fires
`writeConfirmation` (`lib/data.ts:128`) with the buffered keeps, shows a two-second inline
confirmation (`bestätigt — 34 reviewed plies · z macht es rückgängig`), and continues into the next
game's first card. No page load, no button to find.

**The empty-candidate case is the current backlog.** All four games pending confirm today
(`2026-08-13-12-12-18`, `-12-39-04`, `-13-48-18`, `VID_20260726_155132`) have **`moves: []`** — the
replay read nothing. They render as one card each:

```
2026-08-13-12-12-18 — 0 Halbzüge gelesen. Nichts zu bestätigen.
[ x  raus (empfohlen) ]   [ Space  überspringen ]   [ . Job-Log ansehen ]
```

One keypress apiece and the confirm backlog is empty. That is what *"insta rauswerfen"* is for, and
today it costs four page loads and a scroll to a link.

#### 4.1.1 The boundary commit and Autopilot are one interaction, not two phases

`writeConfirmation` (`lib/data.ts:156`) sets `doc.confirmed = true`; `nextStep` (`chain.ts:117-118`)
then returns `"export"`; Autopilot takes the oldest game whose next step is a machine step. Left
alone, the export job is queued **milliseconds** after a silent boundary commit, `export_session`
(`realgames.py:645`) reads `reviewed_plies`, and the promised undo is already false. Neither §4.1
nor §5 has this defect alone — it exists only once both ship, which is precisely what a
"each phase ships alone" framing hides.

**The boundary commit owns the export.** Not "Autopilot notices a confirmed game":

1. The boundary writes `candidate.json` **and enqueues the export itself**, with
   `notBefore = now + 90 s`, stored on the job row (`lib/jobs.ts`'s ledger already carries arbitrary
   job fields).
2. Autopilot's picker skips any `export` job whose `notBefore` is in the future, and — independently
   — skips any game whose `confirmed_at` is under 90 s old, so a commit from a *different* client
   cannot slip past either.
3. `z` inside the window **dequeues** the job and rewrites `reviewed_plies`. Nothing ran.
4. `z` after the window rewrites `reviewed_plies` and says so plainly:
   *"Export läuft bereits — `data/sessions/rg-<n>/` muss neu exportiert werden"*, with the button
   that does it. Re-export is cheap and non-destructive (`TODO.md:208-210`: frames are kept and a
   repaired quad is carried over), so this is a real recovery, not an apology.

The stream shows the window as a quiet countdown on the boundary toast — the only place in the
product where a timer is honest, because it is exactly how long the undo stays free.

> **Decision:** auto-commit at the game boundary, with the commit owning a 90-second export hold.
> **Strongest alternative:** keep an explicit `Confirm` press per game, because `confirmed: true` is
> the gate `export_session` (`realgames.py:633`) refuses to run without (`raise` at `:645`) and it
> should be deliberate. **Why not:** the deliberation already happened, once per card; a second
> confirmation over a decision made 34 times is the ceremony the spine removes. But the safety it
> buys is **not** fully replaced by `z` — after 90 seconds the undo costs a re-export instead of
> being free, and the doc should not claim otherwise. The hold is what makes the trade acceptable,
> and it is the reason §9.2 sequences these two phases rather than shipping them independently.

### 4.2 LABELN — `/strom/labeln`

Every board of every session, one after another. Sessions are a caption.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Lane: [Hände 612 Bretter] [Unsicher 5230 Zellen] [Modell≠FEN — ] [FEN      │
│       unklar 1122 Bretter] [Stichprobe 180 Zellen] [Alle 3976 Bretter]     │
│ Position 41/612 in dieser Lane · 1365/3976 Bretter bearbeitet · 34.3 %     │
│ 2026-08-08-00-39-57 · 001482 · ply 34            Autopilot: läuft          │
├──────────────────────────────────┬─────────────────────────────────────────┤
│                                  │  DIESE SITZUNG (seit dem Laden)         │
│      rectified board             │  Bretter fertig         37              │
│      8×8 paint overlay           │  Zellen occluded       412              │
│      flags outlined fuchsia      │  Zellen bestätigt      198              │
│      judged = bright label       │  Figuren korrigiert      3              │
│      FEN's word = dim label      │  ──────────────────────────             │
│      reviewed = green underline  │  Strom  1159/3976 · Rest ≈ 6 h 20       │
├──────────────────────────────────┴─────────────────────────────────────────┤
│ o occluded · x empty · 1..6 weiß · p n b r q k schwarz · a alles occluded   │
│ ⏎ commit → nächstes · ⌫ Flags aus → nächstes · z undo · ⎵ Raster · X raus   │
└────────────────────────────────────────────────────────────────────────────┘
```

Everything left of the divider exists today (`drilldown.tsx`). What changes is that the stream does
not end at a session, and that the lane bar replaces the tab bar.

**Ordering inside the stream.** Sequential by session, chronological within a session, sessions
newest-first. Chronological is not cosmetic: a hand moves gradually, so painting in time order is one
continuous gesture per hand rather than a shuffle (`app/relabel/[name]/page.tsx:56`).

> **Decision:** sessions run sequentially, not interleaved.
> **Strongest alternative:** round-robin across sessions so every sitting sees every lighting
> condition, which is better for corpus balance. **Why not:** two costs. `lib/crops.ts:21` keeps 24
> decoded rasters and a 1080p PNG costs ~0.25 s to inflate — interleaving thrashes that cache on every
> board. And the human re-learns the board's lighting, the piece set and the camera angle at every
> switch. Balance is a *selection* problem and belongs in `/corpus`, which can say "diese Session ist
> unterrepräsentiert" and offer it as a lane; it does not belong in the frame-to-frame order.

**Lanes** are filters over the same stream, and switching one keeps you in place:

**A lane declares its renderer and its own denominator.** Mixing the two units is the failure D1
diagnoses, so a chip never says a bare number: it says `612 Bretter` or `5 230 Zellen`.

| lane | renderer | predicate | denominator | source |
|---|---|---|---|---|
| Hände | board | `grid_score > 0 ∨ score > hi`, chronological | boards, of 3 976 | `occluded-proposals.jsonl` (today's `hands` queue, `page.tsx:63`) |
| Unsicher | **cell grid** (`bucket.tsx`, grouped by square) | `lo ≤ score ≤ hi` | cells | same |
| Modell ≠ FEN | board | `matches(row, {klass: DISAGREE, min})` | boards | needs `probs`; **0 until the re-propose pass of D2 runs** |
| Klassenwand | **cell grid** | one class ≥ `min` where the FEN says otherwise | cells | `probs`, same precondition |
| FEN unklar | board | non-empty `unknown_squares` | **its own**: boards with unknown cells, over the 10 exported sessions | `data/sessions/rg-<n>/log.jsonl` |
| Stichprobe | **cell grid** | the 180-cell control sample | cells | `lib/proposals.ts:101` |
| Audit | **cell grid** | rows of `audit-flags.jsonl` not yet in `judgedKeys`, ranked by `margin` desc | **its own**: flagged cells | `data/manifests/audit-flags.jsonl`; **`—` until the k-fold audit has run** |
| Alle Bretter | board | every board with a proposal | boards, of 3 976 | proposals |

**`FEN unklar` is deliberately not indexed against 3 976.** Its boards are a different corpus:
`occluded.py:333,338` emits no proposal row for an unknown cell, and 631 of `00-39-57`'s 1 627
unknown cells sit on *non-dirty* frames that produce no proposal row at all — so those boards are
not in the stream and cannot carry an `n/3976` position. The lane numbers itself, and its header
says which corpus it is counting (1 122 boards on `00-39-57`, **2 927** over the ten exported
sessions). It is also the one lane that ships **10** sessions rather than 9, because
`rg-2026-08-14-20-48-55` has a log and no proposal file.

**The Audit lane is where the two-halves label audit lands** (TODO.md "Datensatz-Qualität per
Zwei-Hälften-Kreuztest", canonical form in `docs/cross-labeling-literature.md`: k = 4–5 out-of-fold,
per-class thresholds, ranked by normalized margin). The audit is its own project and not a phase of
this concept; what this concept owes it is the **landing surface**, so UX and audit stop being a
chicken-and-egg. The producer writes `data/manifests/audit-flags.jsonl`:

```json
{"session_id":"rg-…","frame":"001482","square":"e5","fen_label":"bP","predicted":"bB",
 "prob":0.91,"margin":0.62,"fold":2,"model":"…","ts":"…"}
```

**The audit questions every label, not just `occluded`** (user, 2026-08-15: *"ich möchte alle
labels in frage stellen"*). `fen_label`/`predicted` are any pair from `config.CLASSES` — piece
identities, `empty` and `occluded` alike; the k-fold models run the full 14-class head, so the
`bP→bB 555`-class identity errors of D2 are exactly what the flags surface. Nothing in the lane is
occlusion-specific: it renders whatever pair the row carries.

The lane renders those cells in the bucket grid, margin-descending, and writes through the normal
ledgers — a confirmed flag is a `corrections.jsonl` row, a rejected one a `reviewed.jsonl` row, so
the audit's output flows into training only through the same human gate as everything else. Two
consequences of the literature are UI facts, not tuning: **~51 % of flags will be false alarms**
(Northcutt 2021's crowd-confirmed rate), so "FEN stimmt" must stay a one-key verdict and the lane
must show the model's read (`predicted`, `prob`) beside the FEN's word; and the audit owes a
**sample in the unflagged remainder** to estimate what the flags miss — that is the existing
Stichprobe pattern pointed at a second population, not a new mechanism.

**An unavailable lane shows `—`, never `0`.** `Modell ≠ FEN` and `Klassenwand` are empty until the
re-propose pass of D2 has run, and a chip reading `0` claims "there is no such work", which is false:
it means "the producer has not been asked yet". The chip renders `—` with the reason on hover, and
once `probs` exist for some sessions, the count plus `(n von 9 Sessions)`. A permanently-zero chip in
a lane bar is a broken feature advertising itself.

**Keys.** One keymap for the whole app; today `bucket.tsx` and `drilldown.tsx` disagree about `Space`
and `Enter`, and the mobile mode has none at all.

The board is a **pointer surface with keyboard bulk operations and keyboard advance** — not
keyboard-only. Picking three arbitrary cells out of 64 is a 2-D pointing task and the mouse wins it;
arrow-walking a cursor to three scattered squares costs ~4 presses each and would be a regression
dressed as a feature. So there is **no cell cursor**: `Space` acts on the square **under the
pointer**, which needs no navigation because the hand is already there.

| key | board | cell grid (lane or `Shift+Space`) | mobile |
|---|---|---|---|
| `Enter` | commit board → next open board **in the stream** | accept page | — |
| `Backspace` | all flags off, commit as reviewed → next board | discard page | — |
| `f` | **all flags off, STAY on this board** (`toggleFlags`, `drilldown.tsx:245`) | — | — |
| `Space` | toggle the flag on the square **under the pointer** | mark exception | — |
| `Shift+Space` | open the cell grid for the square under the pointer | — | — |
| `z` | **undo the last commit** (see §4.2.1) | undo last page | ⟲ |
| `o x 1-6 p n b r q k` | load brush | apply to marked | palette sheet |
| `a` | flood occluded + arm eraser | — | — |
| `←` `→` | step board, **no write** | move cursor | swipe |
| `Shift+Enter` | commit → next board of a **different ply** | — | long-press |
| `x` | **this board is junk** — no label written, never shown again | — | button |
| `X` | **this recording is junk** — `useless.json`, jump to the next session | — | button |
| `g` | open `/game/<name>` (debug) | — | — |

**`f` is the load-bearing addition.** `toggleFlags` (`drilldown.tsx:245`) is the fast path for the
case `lib/selection.ts` was written to fix tonight — *"ich will nur die Reihe unten rechts markieren,
kann aber dann nicht die 3 committen"* (`selection.ts:4-6`) — and it is currently **mouse-only, with
no key and no mention in this document's own keep-list**. A stream that calls itself keyboard-first
while its most common bulk operation needs a button hunt is not one.

#### 4.2.1 Interaction counts — the loop has to win, per case

Counted as discrete interactions (one key, one click, or one drag). *Today* = the shipped brush;
*loop* = this concept. `P` = flags on the board, `k` = flags that are actually right.

| case | today | loop | why |
|---|---:|---:|---|
| **A** all flags right (`k = P`, the hand case) | `Enter` = **1** | `Enter` = **1** | tie — and this is the majority of boards |
| **B** nothing occluded, FEN right (`k = 0`) | `Backspace` = **1** | `Backspace` = **1** | tie |
| **C** 3 of 12 right | `toggleFlags` click 1 + 3 × 2 clicks + `Enter` = **8** | `f` 1 + 3 × 1 click + `Enter` = **5** | `f` replaces the button hunt; and restoring a flag becomes **one** click, not two |
| **C′** 3 of 12, done the other way | 9 × 1 click + `Enter` = **10** | unchanged path also available = 10, but `f` dominates it | the loop never makes the worse path mandatory |
| **D** 9 of 12 right | 3 × 1 click + `Enter` = **4** | 3 × 1 click + `Enter` = **4** | tie — flags off is already one click |
| **E** repaint 2 adjacent cells to `wP` | key `1` + drag + `Enter` = **3** | same = **3** | tie |
| **F** hand covers most of the board | `a` + erase-drag + `Enter` = **3** | same = **3** | tie |

**Case C is why the cycle order has to change.** Today `cycleNext` (`selection.ts:95-106`) builds
`[proposal, base, fen, brush, "empty"]` deduped; with `brush === proposal === occluded` and
`base === fen === wR` that is `[occluded, wR, empty]`, so a cell sitting on `wR` needs **two** clicks
(`wR → empty → occluded`) to get its flag back. The fix is a **2-cycle on a flagged cell**:
`proposal ⇄ base`, with any third label reached by loading the brush and clicking — which is what
the brush is for. Six of the seven cases tie and one improves by 3; **no case gets worse.** If a
proposed binding ever fails that test, the binding changes, not the table.

#### 4.2.2 `z` needs a tombstone, and the tombstone is a declared artifact

The tempting justification is wrong and must not be shipped as written: *"corrections are append-only
with last-line-wins, so an undo is a superseding row."* That is true of the **training label** and
false of the **UI state that governs the stream**. `commit()` (`drilldown.tsx:294-306`) also writes
de-selected flags to `reviewed.jsonl`; `judgedKeys` (`corrections.ts:101-107`) merges both ledgers
into one `frame|square` map; `open()` (`drilldown.tsx:93-100`) calls a board finished when every
accept cell is in that map. A superseding row **overwrites the label but leaves the key present** —
the cell stays "judged", the board never reopens, and the user cannot reach what they just undid.
`tinder.tsx:126` undid an in-memory stack *before* writing, which is a different problem.

So `z` has two regimes, and the doc owes both:

- **Before the flush** — the board's edits are in `edits` state and nothing has left. `z` is a pure
  in-memory pop, free, no artifact. This covers every undo inside the board you are on.
- **After the flush** — `z` appends **one superseding row carrying `"retract": true`**:

```json
{"session_id":"rg-…","frame":"001482","square":"e5","label":"wR","retract":true,"ts":"…"}
```

`label` is the value the cell reverts to, which is what makes the row correct for Python:
`load_corrections` (`labeling.py:251-262`) reads four keys, ignores `retract`, and last-wins puts the
training label back. `retract` is read by **`decidedKeys` alone**, which **deletes** rather than sets
on it (`corrections.ts:88`) — so the key leaves the judged map and the board reopens.

This is a **new semantic in an existing file**, permitted by §9.1's additive rule but only because it
is declared here, in §1.3, and in §9.1 — an undeclared tombstone would be exactly the kind of quiet
schema change that rule exists to forbid. The honest residue: an undo back to the FEN's own word
leaves one restatement row in a global training input. That row states something *true*, and
`load_corrections` collapses it to the value the FEN already carried, so it changes no crop. Leaving
a wrong label in training would be strictly worse.

> **Decision:** `retract` on the superseding row in the same file.
> **Strongest alternative:** a third file, `retractions.jsonl`, that `judgedKeys` subtracts — no new
> key in a training input at all. **Why not:** it only fixes the *UI* half. The original row would
> still stand in `corrections.jsonl` with its wrong label, so the undo would clear the board and
> leave the bad crop in the corpus — an undo that undoes the smaller half of what it did.

**`x` and `X` are the "insta rauswerfen" of this stream.** `x` writes a board-level verdict to
`review-notes.jsonl` (§8c) — no label, so it cannot corrupt training input, and it ships in the same
phase as the key (§9.2), because "never show it again" that dies on reload is not a feature. `X`
writes `useless.json`, the existing mechanism (`lib/useless.ts`), one click undone, and takes the
recording out of every lane. Stated plainly on the toast: `X` does **not** retract corrections
already written for that session — the ledger is append-only, the rows stay, and `/corpus` counts
them as pool-without-snapshot.

> **Decision:** the board stays the primary unit for occlusion work.
> **Strongest alternative:** make the crop grid primary and the board a detail view — it is denser
> and faster per cell. **Why not:** an occluder covers a contiguous swath, and the *shape* is the
> evidence — that is the entire basis of `gridHandGate` (CLAUDE.md: a flag counts only with "≥ 1
> orthogonally adjacent pair"). A grid of crops destroys adjacency, and the measured cost of getting
> hand shape wrong is a blanked replay or a fabricated ply.

### 4.3 The volume path — mobile bucket sort (`TODO.md:90`)

*"eine Seite die EIN Crop groß zeigt und ein paar große Buckets darunter … Tap oder Swipe wirft das
Crop rein, das nächste erscheint."* — parked 2026-08-09, adopted here as the **phone mode of the
Labeln stream**, not a separate route. The stream is the same; only the renderer changes below 768 px.

```
 375 px
┌───────────────────────────────┐
│ 001482 · e5 · FEN: bP · 0.62  │  session id in 11 px grey, not a link
│ ⟨ gleiches Ereignis: 14 ⟩     │  event-collapsed like tinder.tsx:81
├───────────────────────────────┤
│                               │
│        crop, 351 px           │  fetched at 512; the grid cell is 104 px
│                               │  minimum (bucket.tsx:19), 109 px measured
│                               │  at 375 px — this is 3.2× the detail
├───────────────────────────────┤
│  ┌─────────┐   ┌───────────┐  │
│  │ verdeckt│   │ FEN stimmt│  │  two 88 px targets carry 98 % of decisions
│  └─────────┘   └───────────┘  │
│  ┌─────────┐   ┌───────────┐  │
│  │  leer   │   │ andere ▸  │  │  "andere" = the 12-piece palette as a sheet
│  └─────────┘   └───────────┘  │
├───────────────────────────────┤
│  ⟲ zurück   ✕ raus   37 heute │
└───────────────────────────────┘
```

Swipe left = FEN stimmt (`reviewed.jsonl`) · swipe right = verdeckt (`corrections.jsonl`) · swipe
down = skip, no write · long-press a bucket = apply to the whole event (`GROUP_SPAN = 150` frames,
same square, same `fen_label`) · `✕` = insta rauswerfen · `⟲` = undo, group included.

> **Decision:** one crop at a time on the phone, a board on the desktop.
> **Strongest alternative, and the obvious objection:** one-card-at-a-time *was already killed* —
> *"tinder nervt"*, 2026-08-10, `lib/proposals.ts:95`. **Why it survives here:** what was killed was
> one card at a time **on a 27-inch screen**, where 60 crops fit and a single card wasted the display.
> The economics invert at 375 px: `bucket.tsx:19` drops the floor to `MIN_CELL = 104`, measured at 3 columns of 109 px on a 375 px phone (`platform/app/README.md`), and *"die
> Bilder sind viel zu klein, nahezu unmöglich zu bedienen"* (2026-08-13) is the same complaint from
> the other end. The judgement — hand or bishop — is resolution-bound. **The condition:** the mobile
> mode must inherit both of the grid's hard-won properties or it repeats tinder's failure — grouping
> **by square** (`bucket.tsx:66`) and **event collapse** (`tinder.tsx:81`). Without those, a resting
> hand produces forty identical cards and the user is right again.

---

## 5. Autopilot — making the pipeline invisible

### 5.1 The rule

`lib/jobs.ts` already owns a **single-slot** queue (`queue.running` is a serialized promise chain,
`globalThis`-pinned at `jobs.ts:56` so hot reload cannot fork it — one worker, deliberately: a replay
JVM holds ~6 GB, mostly native). Autopilot is one loop on top of it and nothing else:

> When the slot is idle, take the **oldest non-`useless`, non-`archived` game whose `nextStep()` is a
> machine step** (`label`, `export`, `propose`) and run it. One at a time. Never re-run a step that
> failed.

Because `POST /api/chain/<name>` already refuses a step that is not the disk's next one (409 with the
state, including the `useless` case), an auto-runner cannot get ahead of the chain — the guard that
protects a stale browser tab is exactly the guard an autopilot needs.

**The engine, named.** There is no `instrumentation.ts` in `platform/app` today and the only timers
in the codebase are client-side (`chain-actions.tsx:45`, `transfers/board.tsx:55`). A loop driven by
page loads would make *"a synced recording works its way to the stream by itself"* true only while a
browser tab is open — D0 moved one level down, and Phase 1's exit check would pass anyway because
the person checking has a tab open. So the ticker is explicit:

- **`platform/app/instrumentation.ts`**, exporting `register()`, which Next runs **once per server
  process** in the Node runtime — the only server-side lifecycle hook the framework offers. It starts
  a `setInterval` tick (30 s) and pins both the interval handle and the Autopilot state to
  `globalThis`, exactly as `jobs.ts:56` does, so `next dev`'s hot reload cannot start a second one.
- **Plus an event tick** on job completion, so a finished job starts the next one immediately rather
  than up to 30 s later.
- The tick is a no-op when paused, when the slot is busy, or when nothing is eligible.

That makes the promise checkable: **stop every browser, wait, and the queue still drains.** If it
does not, Autopilot is not built.

**`adopt-pgn` becomes automatic too.** `chain.ts:129` already refuses to overwrite an existing
`reference.pgn`, so copying the phone's `.pgn` in when none exists is non-destructive by
construction. That is the 17 clicks of §1.1, gone.

### 5.2 Which clicks die

| click today | after |
|---|---|
| `Label` | **dies** — runs when a synced recording has a decodable video and no candidate |
| `adopt-pgn` | **dies** — runs when the bundle carries a `.pgn` and has no `reference.pgn` |
| `Export session` | **dies** — runs when a candidate is `confirmed` and no `data/sessions/rg-<n>/` exists |
| `Propose occluded` | **dies for new sessions** — runs when a session exists and no `occluded-proposals.jsonl` does. **Re-**proposing a session that already has one stays a deliberate button (§5.3): it rewrites a file someone may be labeling |
| `Confirm →` | **stays** — it is the human work, and it is now a stream |
| `Relabel →` | **stays** — same |
| `Label ohne Linsen-Korrektur` | **stays as recovery**, and see §5.4 |
| every step button on `/game/<name>` | **stays** — the drill-down surface keeps manual control |

### 5.3 The `--model` flag, and the pass it still owes

**Already shipped.** `lib/jobs.ts:553` appends
`--model ${process.env.CHESSLAB_PROPOSE_MODEL ?? "data/models/real14-ms-s3-hn-bn80"}` to every
propose job, so new proposals carry `probs`. **No new wire format** — `probs` is in the schema
(`occluded.py:385`) and already parsed (`lib/query.ts:22`); it had simply never been produced.

What Autopilot owes on top of that is the **backlog**, and it is the one job in this concept that is
neither cheap nor automatic:

- **251 413 rows on nine sessions must be re-proposed** on the single slot before the identity lanes
  hold anything. Autopilot must **not** do this on its own: a re-propose rewrites a file the user may
  be labeling (guard 5), and nine full passes is hours of GPU on a machine the user is also using.
  It is a **button on `/corpus`**, "Vorschläge neu erzeugen (9 Sessions)", that enqueues them one at
  a time behind everything else, and it is pausable like any other job.
- **The circularity guard must be fixed first.** As measured in D2, `check_not_circular`
  (`occluded_model.py:52`) refuses six sessions (134 044 rows, 53.3 %) and *allows* the two largest
  (113 848 rows, 45.3 %) only because their crops entered training as `occ-rg-…` while the guard
  compares against `rg-…`. Running the pass before that is fixed writes 45 % of the corpus's `probs`
  from a model reading back its own labels — the exact failure the guard exists to prevent, passed
  on a technicality. Match on the trailing session id, or propose those two with a different run.
- **Per-session model provenance.** The run that produced a proposal file must be recorded in its
  `_thresholds` header (an additive key on a header whose inner shape `lib/proposals.ts:74-80` already
  treats as unpinned), so `/corpus` can say which sessions carry model reads and from which run.

Until the pass runs, the identity lanes render `—` (§4.2), and that is the honest state.

### 5.4 Failure is loud, never silent

The standing rule (`TODO.md`, and the memory entry *"Hintergrundarbeit meldet ihr Scheitern"*) is that
a silent fallback is the defect. So:

- **Broken MP4** — `checkMp4` (`lib/chain.ts:91`) already detects a missing `moov`. Autopilot never
  runs on one; the game goes straight to the **Reparatur** lane with the existing sentence.
- **Lens** — decided *before* the run, never by retry. `lensFor` (`jobs.ts:460-462`) already returns
  `false` for any recording under `files/sessions/`, i.e. every LAN-transferred phone recording,
  because the phone's grid fit is refused every time (`TODO.md`, 2026-08-10). Autopilot simply calls
  it. What it owes is the *record*: a run labeled without lens correction must say
  `gelabelt OHNE Linsen-Korrektur` on the game and in `/corpus`, permanently, because those crops
  differ from corrected ones (specs/52: lens-corrected inference against a raw-trained corpus took
  003957 from 67 to 15 plies). The rig recordings that *do* get `lens` keep specs/52's fail-closed
  behaviour and fail into Reparatur, where the existing
  **Label ohne Linsen-Korrektur** button is a human's explicit second press.
- **Any non-zero exit** — one row in **Reparatur**, carrying the tool's own last words
  (`lib/jobs.ts:512` already captures them) and the manual button.

**There are no automatic retries of any kind.** An earlier draft of this concept carved out a
lens exception and then stated the opposite rule two paragraphs later; the exception was both
contradictory and unnecessary, since `lensFor` decides the flag up front. One rule: a failed step
waits for a human, forever.

### 5.5 The compute guard

Running replays unattended is heavy compute, and the standing user rule is one heavy job **on the
machine** — not one in the web app. A full-tilt render has already crashed the user's game.
Autopilot is the first thing in this repo that starts a ~6 GB replay with nobody watching, so the
guards have to be stated with their real scope:

1. **The single slot** (`jobs.ts:56-58`) — already exists, `globalThis`-pinned, and Autopilot does
   not widen it. **Scope: this Node process only.**
2. **A visible pause** on the strip, on every page, state persisted across restarts.
3. **No automatic retries**, of anything.
4. **No data-shaping commands.** `slice`, `dataset build` and `train` are not in Autopilot's
   vocabulary; it runs the four chain steps and nothing else.
5. **No job on the session being labeled right now.** Autopilot holds any `propose` for a session
   with a ledger row written in the last 10 minutes — readable from `ts` in `corrections.jsonl`, no
   new state. Without this, `propose-occluded` rewrites `occluded-proposals.jsonl` under the cursor
   of the person labeling it: `loadProposals` is mtime-keyed (`proposals.ts:51`), so the board list
   changes on the next request. §9.3's row on re-proposing only covers whether *decisions* survive;
   this covers whether the *session in progress* does.

**What guard 1 does not cover, stated plainly:** a training run, a Blender render or a
`scripts/replay-batch.ps1` the user starts **from a terminal** is invisible to it. Nothing in this
repo has a cross-process interlock today. Two honest options, and this concept picks the first:

- **Recommended:** Autopilot writes `$CHESSLAB_DATA_DIR/inbox/heavy.lock` while a job runs (pid,
  job, started-at) and refuses to start if a *foreign* live lock exists. That is one file and it
  makes the interlock available to the terminal tools the moment any of them chooses to honour it.
  Until one does, the lock is one-directional and the operating rule is written on the strip:
  **pause Autopilot before starting a training run.**
- **Rejected:** probe the OS for a JVM or Python process above N GB RSS and hold. It is
  platform-specific, it guesses at intent from memory size, and a wrong guess either stalls the
  queue forever or fails to stop the one case it exists for.

> **Decision:** Autopilot on by default, one slot, pausable.
> **Strongest alternative:** an explicit "run all pending" button — one press instead of one press per
> step, and the machine never surprises the user. **Why not:** it re-creates D0 at a coarser grain. A
> stream that is empty because nobody pressed *anything* is the exact failure the spine names, and the
> user's sentence (*"sobald ich die Videos gemacht habe und die gesynct werden"*) treats the sync as
> the last thing he does. The honest cost of the recommendation is that the machine sometimes works
> while the user did not ask; the pause toggle and the single slot are what make that acceptable.

---

## 6. Progress & feedback

Two clocks: what I just did, and what is left. Every figure names the file it comes from. **No
telemetry, no event log, no new database.**

### 6.1 Session-level — the panel in §4.2, and its twin in §4.1

| figure | expression | source |
|---|---|---|
| Bretter fertig | distinct `frame` this page load wrote to either ledger | in-memory (today `streams.tsx:35` counts *rows*, so one board of 12 flags reads as "12") |
| Zellen occluded | rows appended with `label == "occluded"` | in-memory |
| Zellen bestätigt | rows appended to `reviewed.jsonl` | in-memory |
| Figuren korrigiert | rows appended with `label ∉ {occluded, empty}` | in-memory — the number that has been **100 for the entire corpus** (D2) and must visibly move once §5.3 lands |
| Karten / Züge (Züge-Strom) | keeps, drops, games thrown out this sitting | in-memory |
| s/Brett, s/Zug | median wall clock between the last decisions | in-memory |
| Rest ≈ | `boards_open × median s/Brett` | derived |

On reload it resets and says `seit dem Laden`. A session counter that survives a reload is a lie about
one sitting; the persistent numbers are the next section's job.

### 6.2 Stream-level — the honest denominators

The headline number is the **stream**, not the game, because the stream is now the unit:

Values are `[01:00]` and illustrative; the surface reads them live.

| figure | expression | source |
|---|---|---|
| **Bretter im Strom** | `Σ over sessions |{frame in proposals}|` = **3 976** | the per-file summary sidecar, §6.3 |
| **bearbeitet** | `∩` with `{frame}` in either ledger = **1 365 (34.3 %)** | `corrections.jsonl` + `reviewed.jsonl` |
| per lane | the lane's own predicate and its own denominator (§4.2) | as §4.2 |
| Züge offen | games with `candidate.json`, `confirmed != true`, not `useless`/`archived` = **4** (all with `moves: []`) | `candidate.json` |
| Halbzüge geprüft gesamt | `Σ len(reviewed_plies)` over confirmed candidates = **262** | `candidate.json` |
| Korrekturzeilen / Sichtprüfungen | `wc -l` = **17 225 / 2 838** | the two ledgers |
| Figuren-Korrekturen | rows with `label ∉ {occluded, empty}` = **141** | `corrections.jsonl` |
| zuletzt gearbeitet | `max(ts)` over both ledgers | the two ledgers |

Per game the same numbers exist, small, in the caption and on `/game/<name>` — for the first game
that is **57.9 %**, not 8.3 %.

> **Decision:** the denominator is **boards**, and the primary one is the stream's.
> **Strongest alternative:** keep counting cells but fix the denominator to the reachable set
> (confirm + unsure + control). **Why not:** that denominator is a function of `hi`/`lo`, so
> re-running `propose-occluded --hi 0.6` silently rewrites how much work you have done. A board count
> is a property of the recording. The cell count stays as the second line, where a moving `hi` is a
> fact about the producer rather than about the human.

### 6.3 What the read model actually costs, and the two artifacts it needs

Calling all of this *"`wc -l`-cheap"* would be false, and the CLAUDE.md cache rule alone does not
cover it. Measured:

| read | cost today | verdict |
|---|---|---|
| `Bretter im Strom` — distinct frames over **all nine** proposal files | 251 413 lines, ~33 MB, `JSON.parse` per line (`proposals.ts:71-84`), and the parsed rows stay **resident** for all nine sessions at once | **not acceptable.** This is 5× the 6.5 MB precedent, held in memory, on a page that renders one board |
| `loadProposals` cache | a plain module-level `Map` (`proposals.ts:46`) | **does not survive hot reload** — `jobs.ts:53-58` pins itself to `globalThis` for exactly this reason. Every dev reload re-parses 251 413 rows |
| `judgedKeys` | **no cache at all**: `decidedKeys` (`corrections.ts:76-93`) reads and splits the whole ledger per call, and `page.tsx:19` calls it once per game. 20 k rows today, monotonically growing | needs the same treatment; §6.2's per-lane figures multiply the calls |
| `/corpus` per-session counts | group-by over 241 195 manifest rows | needs an index |

Three fixes, two of which are **new declared artifacts** — naming them here is the point, because an
undeclared index is the same sin as undeclared telemetry:

1. **Pin every read cache to `globalThis`**, the `jobs.ts:56` pattern. No new file, and it removes
   the reload cliff.
2. **`data/realgames/<n>/occluded-proposals.summary.json`** — written by `propose-occluded` beside
   its output: `{boards, cells, frames, by_stream:{confirm,unsure,control}, hi, lo, model,
   written_at}`. `frames` is the sorted list of distinct frame stems — counters alone cannot spare
   the 33 MB parse, because the progress figure is `|touched ∩ proposal frames|` and needs the SET,
   not its size. Additive, and absent on old files, in which case the header falls back to a
   one-time parse and says it did.
3. **`$CHESSLAB_DATA_DIR/inbox/corpus-index/<dataset>.json`** — the per-session, per-class group-by,
   keyed by the manifest's mtime, rebuilt on miss. **Deliberately outside `data/datasets/`**: a
   dataset is a snapshot and `occ-real` in particular must stay byte-identical
   (`docs/data-pipeline.md` §8), so nothing this app writes may land inside a dataset directory.

Everything else on the two dashboards genuinely is `wc -l` plus a group-by over ≤ 20 k ledger rows.

---

## 7. Dataset visibility — `/corpus`

*"Wie sähe unser Datenset aus"* has three honest answers and the gap between them is the finding:

```
┌─ POOL ────────────────┬─ SNAPSHOT ─────────────┬─ DIFF ─────────────────────┐
│ what the ledgers +    │ what a built dataset   │ what a rebuild TODAY would │
│ sessions would yield  │ actually contains,     │ add or drop                │
│ if sliced right now   │ frozen at build time   │                            │
└───────────────────────┴────────────────────────┴────────────────────────────┘
```

The third column has to exist because `docs/data-pipeline.md` §5.9 is the pipeline's central trap:
**datasets are snapshots, nothing is incremental**, and today nothing tells the user which of their
labels made it in.

### 7.1 Class balance

| figure | source |
|---|---|
| per-class train counts | `data/datasets/<n>/split.json` → `train_class_counts`, verbatim |
| class weights | same → `class_weights` |
| split sizes | same → `counts` |
| build warnings | same → `warnings` (literal strings like `"Class {c} missing in {name} split."`) |
| per-class **pool** counts | `corrections.jsonl` with last-wins dedup on `(session_id, frame, square)` **+** FEN-derived labels per exported session |

Illustrative render, values `[01:00]`; the surface recomputes on every load, and the POOL column in
particular moved by 4 464 rows during the writing of this document:

```
real14-all-80-v1   train 209 643 · val 5 888 · test 25 664      gebaut: Snapshot, nicht live
empty 106 707 (50.9 %) │ wP 24 265 │ bP 24 365 │ … │ wQ 3 144 │ bQ 3 118 │ occluded 3 901 (1.9 %)

POOL occluded 16 923   ▸   SNAPSHOT occluded 3 901   ▸   DIFF −13 022  ⚠
   drin:  occ-rg-2026-08-07-13-52-38 (2 120) · occ-rg-2026-08-08-00-39-57 (1 781)
   NICHT drin: rg-2026-08-08-11-59-12 · rg-2026-08-08-11-55-19 · rg-VID_20260802_222741
               · rg-VID_20260726_233432 · rg-2026-08-13-19-34-23
```

That block is the answer to the fourth complaint, and it is two `wc -l` and one group-by. The DIFF
is also the one number on either dashboard that **should** be watched moving: it grows with every
hour of labeling and only a rebuild brings it back down.

### 7.2 Per-session contribution and the supplement cap

`stats.json` carries `per_session`, but **no dataset on disk has one** — every dataset under
`data/datasets/` was built by a path that does not write it. So the view counts `manifest.jsonl` by
`session_id` (241 195 rows, one mtime-cached pass) and draws the rule on the bar:

```
Anteil am train-Split (209 643 Crops)     Grundsatz: Ergänzung, nie die Masse (TODO.md:203)
train80-VID_20260809_204850  ███████████████████████████████  67 712  32.3 %
train80-VID_20260812_112853  ██████████████████████            47 808  22.8 %
rg-VID_20260802_222741       ██████████████████┊               38 235  18.2 %   eine Partie
rg-VID_20260727_233929       █████┊                            10 803   5.2 %
…                                 ┊
Realpartien gesamt           ═════════════════════════════     72 939  34.8 %
                                  ┊
                          5.3 % ──┘  gemessen: 5.3 % → 2 Phantome (specs/53 STATUS:85)
                                      gemessen: 50 %  → 105 Phantome (TODO.md:203)
                                      dazwischen ist nichts gemessen.
```

The line is a **measurement, not a threshold**, and the chart says so rather than stamping a warning
against a number no artifact declares as a cap. The honest verdict it renders is: *34.8 %, and the
only measured point below it is 5.3 %.*

There is **no code path that enforces a supplement cap** — `--source-manifest` (`cli.py:725`) accepts
a hand-written reduced pool and that is the whole mechanic. So this view's job is to make the
violation visible and emit the exact command, never to enforce:

```
uv run chesslab dataset build real14-all-80-v2 \
  --sessions <copied from dataset.yaml session_ids> \
  --source-manifest data/manifests/squares.jsonl,data/manifests/capped-rg-20260815.jsonl
```

### 7.3 Quarantine / dirty ratios

From `data/realgames/<n>/training-pack/summary.json`, already read by `lib/jobs.ts:159`:

```
2026-08-14-20-48-55   sampled 338 → accepted 35 Frames / 2 240 Crops
                                    quarantine 3 Frames / 192 Crops
                                    = 7,9 % der entschiedenen Frames (3 von 38)
                                    occluded-Vorschläge 63 Frames / 925 Crops
```

The denominator is stated because there are two plausible ones and they differ by an order of
magnitude: 3 of the 38 frames the pack *decided* (7.9 %), not 3 of the 338 it *sampled* (0.9 %).

**Both schemas must be tolerated:** newer packs write `accepted_*` / `quarantine_*`, packs written
before 2026-08-14 write `clean_frames` / `clean_crops` / `occluded_frames` / `occluded_crops`. Four
old and six new are on disk.

**And a bundle can have several packs.** There are **10** `summary.json` across **5** bundles:
`2026-08-13-13-48-18` alone carries `training-pack/`, `-14c/`, `-fast/`, `-safe/` and
`-safe-dense/`, and `2026-08-13-19-34-23` carries `training-pack/` and `-live/`. `/corpus` reads
**`training-pack/` only** — the canonical name, the one `lib/jobs.ts:159` already reads and the one
the transfer chain writes — and lists the variants as `+4 Varianten` without summing them. Summing
sibling packs would double-count the same video under different sampling settings.

Session dirty ratio is `count(dirty)/count(rows)` over `data/sessions/rg-<n>/log.jsonl` — 1 320/3 103
= 42.5 % on `00-39-57`.

### 7.4 Light domains — the number that does not exist

**Nothing on disk carries illumination.** Two things look like it and are not:

- `stats.json`'s `"light"` / `"dark"` are **square colour** (`labeling.square_color`, `a1 = dark`),
  not brightness. Labelling them "Lichtdomäne" in a UI would be a plain lie.
- `camera.py:54-57` explicitly declares its brightness column *"unsuitable as evidence for anything else"*.

The only frame-level intensity measure in the repo is `realgames.frame_activity` (`realgames.py:719`),
an activity score used only by `export_static` and never persisted.

**Recommendation:** compute mean luma per rectified board at export time and write **one additive
key** on the log row — `{"frame": "frames/001482.png", …, "luma": 87.4}`. `slice_session` and
`lib/session.ts` both ignore unknown keys, and the frames are already decoded at that moment.
`/corpus` then buckets sessions by their median into three domains, with boundaries set from the first
survey rather than guessed here. Until the key exists, the panel reads **"Lichtdomänen: keine Messung
auf der Platte"** and nothing else.

> **Decision:** an additive `luma` on the exported log row.
> **Strongest alternative:** compute it in the browser from boards `/corpus` already fetches. **Why
> not:** `/corpus` is a corpus view — it would decode 3 976 boards to draw one bar, and
> `lib/crops.ts:21` caps its raster cache at 24 frames for good reason. A second alternative, a
> standalone `scripts/survey_luma.py` writing `data/_perf/luma.json`, is worse only in that the number
> does not travel with the session; if re-exporting ten sessions is unacceptable, it is an honest
> fallback and this concept does not object.

### 7.5 Where the veto metric fits

The veto metric is **misses at zero phantoms** — `misses_phantom_free` (`scripts/sweep_infer_size.py:162`),
the smallest threshold above every truly-empty crop's `P(occupied)`. It is an **occupancy** measure
over a trained model. It is not a property of a dataset and must not be rendered as one.

Its place is one strip at the bottom of `/corpus`, headed *"Was das Modell aus diesem Datensatz
macht"*, reading `data/_perf/*.json` keyed by `pack` → dataset directory:

Rendered from whole files, never composed — a model name and an eval result that were not in the
same file must never appear on one line. On the pack `labeled-rg-2026-08-08-00-39-57-80` three runs
have been evaluated, and `/corpus` shows them as the comparison they are:

```
Pack labeled-rg-2026-08-08-00-39-57-80   (24 758 Crops, 388 Bretter)

  id35-80-before-hn-20260812     ph 331 · mi 350   ms-champ-realgame-holdout.json
  real13-ms-s2-real-bn80         ph 615 · mi 229   ms-s2-realgame-holdout.json
  real13-ms-s3-hn-bn80           ph 185 · mi 371   ms-s3-realgame-holdout.json

  id35-80-before-hn-20260812 · crop_acc 0.830 · occupied_piece_acc 0.602
  top confusions:  bP→bB 555   wN→wP 408   wR→wP 344   empty→wP 218
                   └─ "als Lane im Labeln-Strom öffnen" ─────────────┘
```

Each row is one `_perf` file, and the file's own `model` and `pack` fields are what label it. Note
what the comparison shows and the single-row mockup hid: on this pack the runs disagree about which
direction is better — `real13-ms-s3-hn-bn80` nearly halves the phantoms and pays 21 more misses —
which is exactly the phantoms-are-the-veto trade the strip exists to surface.

Those confusion rows are the **only place in the product where the corpus says what to label next**,
and each links straight into a `Modell ≠ FEN` lane narrowed to that class pair.
`sweep_infer_size.py` writes a text log (`data/_perf/sweep_infer_size.log`), not JSON, so the
misses-at-zero-phantoms figure is **linked, not parsed** — a link to a log a human can read beats a
brittle regex over a table format that exists to be read by a person.

> **Decision:** `/corpus` reads eval artifacts and never runs anything.
> **Strongest alternative:** a "Modell prüfen" button that runs `eval_packed_13c.py`. **Why not:** one
> worker, conservative compute. A GPU eval behind a web button on the machine that also runs replays
> is the same mistake in a new place. If it is ever added it belongs in Autopilot's single slot, at
> the back of the queue, behind everything that unblocks a stream.

---

## 8. Provenance — making "reviewed and correct" first-class

`TODO.md:102` says *"keep" writes nothing … looked at and correct is indistinguishable from never
looked at*. **Half of that is already fixed and the TODO entry is stale:** `reviewed.jsonl` exists
(`lib/corrections.ts:39`, 2 838 rows on disk `[01:00]`), the control bucket and `planRejectAll` write to it, and
`judgedKeys` merges both ledgers so a reviewed cell is never asked twice. A review of this concept
should start there, not from the TODO's wording.

Three things are still missing.

**(a) It is invisible.** No surface distinguishes the three states a cell can be in. The board draws
`judged` bright vs dim (`drilldown.tsx:129`) but treats both ledgers as one:

| state | rendering | source |
|---|---|---|
| never looked at | dim label, no mark | in neither ledger |
| reviewed, FEN was right | dim label, **thin green underline** | `reviewed.jsonl` |
| corrected | bright label, colour tint (today's amber/sky) | `corrections.jsonl` |

and the per-board counter becomes `37 gesehen · 12 korrigiert · 15 ungeprüft`, replacing today's
`judged.size/64`, which conflates the first two.

**(b) It says nothing about why.** Two additive keys on the `reviewed.jsonl` row — nothing in Python
reads this file at all, so the risk is zero:

```json
{"session_id":"rg-…","frame":"000921","square":"a1","label":"wR","ts":"…",
 "via":"board-reject",     // board-reject | grid-page | mobile-swipe | confirm-gallery
 "run":"real14-80"}        // the proposal run that asked, when known
```

`via` is what distinguishes a deliberate per-cell judgement from a page of 60 accepted with one
`Enter`. Those are not the same evidence and the file cannot currently tell them apart.

**(c) Throw-outs and the confirm gallery write nothing.** Three verdicts have nowhere to go: `x` on a
board (§4.2), `x` on a card of the Züge stream when the ply is real but the picture is unusable, and
the **Sichtprüfung** gallery (`app/confirm/[name]/cards.tsx:353`), which tells the human *"Hand im Bild, verrutschter
Ausschnitt, dunkler Müll? Dann taugt das Intervall nichts"* and then offers no control to say so. One
new UI-only ledger, `data/labels/review-notes.jsonl`, carries all three:

```json
{"session_id":"rg-…","frame":"001482","verdict":"unusable-board","reason":"…","ts":"…"}
{"session_id":"rg-…","ply":34,"verdict":"bad-interval","ts":"…"}
```

Nothing in Python reads it, so it breaks nothing. `export-session` may later learn to skip a
`bad-interval`; until then the file is a record. This is `useless.json` one and two levels down: a
human verdict that costs nothing and destroys nothing.

**This file ships with the `x` key, in Phase 3 — not later.** `x` is specified as "never show it
again"; a keystroke whose effect dies on the next reload is not that, and splitting the key from its
persistence across two phases would ship the broken half first.

> **Decision:** provenance lives in its own files; never a `reviewed` flag inside `corrections.jsonl`.
> **Strongest alternative:** one file with a `kind` field — halves the read paths and makes "last
> wins" a single ordering. **Why not:** `corrections.jsonl` is a **global training input** (CLAUDE.md).
> `labeling.load_corrections` takes `c["label"]` off every row it reads, unconditionally, with no
> filter. A row restating the FEN would become a training label, and 2 838 of them already exist
> `[01:00]`. The split costs one extra `readFile` and makes the dangerous file impossible to pollute
> by accident. Note the one deliberate exception, declared in §4.2.2: `retract` is a key **inside**
> `corrections.jsonl`, because an undo has to move the training label, not merely the UI state.

---

## 9. Migration

### 9.1 The hard rule, and why it holds

**Wire formats are additive-only; every Python consumer keeps working through every phase.** This is a
property of the readers, not a hope:

| reader | what it takes | unknown keys |
|---|---|---|
| `labeling.load_corrections` (`labeling.py:251-262`) | `session_id`, `frame`, `square`, `label` | **ignored**, `ts` included |
| `lib/proposals.ts:83` | casts the row to `Proposal` | ignored |
| `lib/session.ts:91` | destructures 6 named keys | ignored |
| `dataset_build` | manifest rows from `slice_session` | unaffected — this rework never writes a manifest row |

New keys on existing rows are safe. **New files are safe** — `reviewed.jsonl` has sat beside
`corrections.jsonl` since 2026-08-09 and no Python code has ever opened it. Forbidden: renaming a key,
changing `frame` from a stem to a path, changing the dedup tuple, writing a label outside
`config.CLASSES`.

**The complete register of what this concept adds.** Anything not on this list is a schema change and
is out of scope; an index or a tombstone invented at implementation time and not declared here is the
same failure as inventing telemetry.

| artifact | kind | phase | read by Python? |
|---|---|---|---|
| `retract: true` on a `corrections.jsonl` row | **new key, existing file** | 3 | no — `load_corrections` takes four keys (`labeling.py:251-262`) and last-wins restores the label the row carries |
| `retract: true` on a `reviewed.jsonl` row | new key, existing file — the retract goes into the ledger the original row came from, else the key survives the `judgedKeys` merge and the board never reopens (REVIEW S4) | 3 | no — nothing in Python opens that file |
| `data/labels/review-notes.jsonl` | new file | 3 | no |
| `$CHESSLAB_DATA_DIR/inbox/heavy.lock` | new file | 1 | no |
| `$CHESSLAB_DATA_DIR/inbox/autopilot.json` | new file — the strip's pause state, persisted across restarts (§5.5 guard 2) | 1 | no |
| `notBefore` on a job ledger row | new key, existing file | 3 | no |
| `data/realgames/<n>/occluded-proposals.summary.json` | new file, written by `propose-occluded` | 2 | no |
| `model` / `written_at` in the `_thresholds` header | new keys on a header whose inner shape is explicitly unpinned (`lib/proposals.ts:74-80`) | 2 — the producer writes them from the first sidecar on; Phase 4's backlog pass fills them corpus-wide | no |
| `$CHESSLAB_DATA_DIR/inbox/corpus-index/<dataset>.json` | new file, **outside** `data/datasets/` | 2 | no |
| `via` / `run` on a `reviewed.jsonl` row | new keys, existing file | 5 | no — nothing reads that file |
| `data/manifests/audit-flags.jsonl` | new file, written by the two-halves audit (its own project) | 3 renders it as `—`; the audit fills it | no — its labels reach Python only via the human's `corrections.jsonl` rows |
| `luma` on an exported `log.jsonl` row | new key, existing file | 5 | ignored by `slice_session` |
| `grid_lines` on a `quad-fit.json` frame entry | new key, existing file — `{"x":[9],"y":[9],"tx":[9],"ty":[9],"cx":[9],"cy":[9]}`: line positions as fractions of the field side, their dimensionless tilts about the board centre, and the parabola terms (`pos(t) = x + tx·(t−0.5) + cx·(t−0.5)²`), written by `fit-stored` only when all 18 lines were located, offsets strictly monotone, every \|tilt\| < 0.05 and (for the pair `cx`/`cy`, all-or-nothing) every \|curv\| < 0.08, sized on the real 004251 outer lines at 0.046; consumers cut per-cell CURVED with curvature, PERSPECTIVE with tilts alone, scalar rectangles with offsets alone (older sidecars), the quad without the key — malformed always steps one stage down, never errors | mesh cut | written by Python (`realgames.grid_line_fracs`), read back by no Python consumer |
| `mesh_frames` in a `packed_meta.json` | new key, existing file — how many packed frames were cut at the mesh instead of the nominal grid | mesh cut | no — provenance for the sweep report |

### 9.2 Phases

`/confirm` and `/relabel` (built earlier tonight) are **the intermediate list step** on the way to the
streams: they already compute the right predicates (`lib/queues.ts:66`) and prove the chain state is
queryable across all games at once. Phase 3 turns each list into the stream it is pointing at, and the
list becomes the stream's own "was liegt an" header. They are not thrown away; they are absorbed.

**Phases 1, 2, 4 and 5 ship alone. Phase 3 does not — it is sequenced after 1, and it changes
Autopilot when it lands.** §4.1.1 is the reason: boundary auto-commit plus an Autopilot that exports
confirmed games is a defect neither has by itself, so Phase 3 ships the export hold *in the same
change* as the boundary commit. Saying "each phase ships alone" of all five would be the framing that
hid the bug.

**Exit criteria are written as relations, never as literals.** Every ledger figure in this document
moved while it was being written, and Phase 1 deliberately changes the corpus Phase 2 measures — the
first draft's Phase 2 check hard-coded `1 158/3 976`, which Phase 1 invalidates by adding
`rg-2026-08-14-20-48-55`'s boards (637 log rows, **219 dirty**) to the denominator.

**Phase 1 — Autopilot.** No UI restructure, no new wire format (one lockfile).
The ticker in `instrumentation.ts` (§5.1), the single-slot runner, automatic `adopt-pgn`, the strip
with pause and Reparatur, loud failure (§5.4), guards 1–5 (§5.5). The chain buttons stay where they are.
*Exit check:* with **every browser closed**, the machine-step backlog drains to zero and the PGN
offers reach zero; a broken-MP4 bundle is still refused into Reparatur; a paused Autopilot starts
nothing. (At the time of writing that backlog is 6 steps and 17 PGNs, but the criterion is "drains",
not "drains six".)

**Phase 2 — Honest numbers and `/corpus`.** Read-only; adds the two indices of §6.3.
Board-based denominators (§6.2), the session panels (§6.1), the stream/lane headers with their own
denominators, the D2 state banner, the proposal summary sidecar, the corpus index, `globalThis`-pinned
caches. `/corpus` in full (§7). Delete `tinder.tsx`.
*Exit check:* every per-game percentage equals `|touched ∩ proposal boards| / |proposal boards|`
recomputed by hand for that game — for `2026-08-07-13-52-38` that is a number near 58 %, not near 8 %;
the stream header's board total equals the sum of the nine sidecars; `/corpus` renders POOL, SNAPSHOT
and a DIFF whose magnitude equals `pool_occluded − 3 901`; no `_perf` row shows a model name and a
metric that came from different files. Phase 1 having run first must **not** invalidate any of these.

**Phase 3 — The two streams** (after Phase 1). IA change; adds `retract`, `review-notes.jsonl`, `notBefore`.
`/strom/zuege` with boundary auto-commit, the 90-second export hold and `x`; `/strom/labeln` with lane
renderers (board vs cell grid), `f`, pointer-`Space`, the 2-cycle on flagged cells, `z` with its
tombstone, `x`/`X` and `review-notes.jsonl`; the mobile bucket mode; `/game/<name>`; old routes
redirect.
*Exit check:* the §4.2.1 interaction table is reproduced by measurement — **no case worse, case C
strictly better**; `z` after a flush reopens the board (the cell leaves `judgedKeys`); `z` inside the
hold window leaves no session directory on disk; every gesture in §1.4's keep-list still works and
`lib/selection.test.ts` still passes.

**Phase 4 — The identity backlog.** No new UI primitives; the lanes from Phase 3 gain content.
Fix `check_not_circular`'s alias blindness (D2), record the run in the `_thresholds` header, ship the
`/corpus` re-propose button that enqueues the nine sessions one at a time.
*Exit check:* for every session that carries `probs`, the run named in its header is one that
`check_not_circular` accepts **after** the alias fix; `classesSeen()` returns the model's class list
instead of `[]`; the `Modell ≠ FEN` chip shows a count and `n von 9 Sessions` instead of `—`.
**This is the phase most likely to stall** — it is the only one whose cost is GPU hours on the single
slot rather than app code, and nothing else depends on it. Phase 3 must therefore render the empty
lanes as `—` and stay useful without it.

**Phase 5 — Provenance detail and light.** Two additive keys on a file Python never reads, one export key.
`via` + `run` on reviewed rows; the three-state board rendering (unseen / reviewed / corrected); the
`Sichtprüfung` gallery's *"Intervall taugt nichts"*; `luma` on the exported log row and the `/corpus`
panel that replaces its placeholder.
*Exit check:* `uv run pytest` green with `luma` present in a log; `load_corrections` output
byte-identical before and after the key exists; re-export preserves `corners_source` on every row that
had one.

### 9.3 What can break, and the guard

| risk | guard |
|---|---|
| Autopilot runs heavy work unattended | one slot (pre-existing), visible pause, no auto-retry, no Python data commands, `heavy.lock` (§5.5) — **and the stated limit: a terminal-started training run is invisible to it** |
| Autopilot re-proposes the session being labeled | guard 5 (§5.5): hold any `propose` for a session with a ledger row under 10 minutes old |
| boundary auto-commit races the export | the commit owns the job, `notBefore = +90 s`, `z` dequeues (§4.1.1) |
| archived / `useless` games leak into a stream | both streams inherit the filters `page.tsx:65` and `queues.ts:68` already apply; the picker in §5.1 names them too |
| a dev-server hot reload mid-write | every write is append-or-rename today (`appendCorrections`, `writeConfirmation`'s tmp+rename) and stays so; the caches move to `globalThis` (§6.3) so a reload costs correctness nowhere and only re-parses when the pin is new |
| Autopilot gets ahead of the chain | `POST /api/chain/<name>` already 409s on a step that is not the disk's next one |
| `/corpus` re-reads 241 195 manifest rows per request | mtime-keyed cache, the CLAUDE.md rule, the pattern `lib/proposals.ts:46` already uses |
| a re-proposed session invalidates decisions | `judgedKeys` is keyed on `frame|square`, not on the proposal row — re-proposing with `--model` keeps every decision |
| the older `summary.json` schema | read both key sets, show the union, never crash on a missing one |
| `luma` re-export rewrites `corners` | `carry_repaired_geometry` (`realgames.py:502`) already carries repaired quads across a re-export; **verify, do not assume**, before Phase 5 touches the ten sessions |
| `X` (recording raus) orphans written corrections | the rows stay by design (append-only). The toast says so; `/corpus` counts them as pool-without-snapshot |

---

## 10. Non-goals — what this rework deliberately does not touch

1. **The tracker, the replay, the engine.** `:desktop replay … label` stays a black box; Autopilot presses it, it does not change it.
2. **`slice_session`, `dataset_build`, `train`.** No change to how a label becomes a crop or a crop becomes a dataset. `/corpus` reads dataset artifacts and prints the build command; it never builds.
3. **The confirm review logic.** LCS, `reviewed_plies`, multi-commit cards, the drop-when-in-doubt rule — unchanged. Only *where* the commit happens moves.
4. **`nutzlos` semantics, archiving, PGN upload, `/transfers`.** They work.
5. **Thresholds.** `hi`/`lo` stay the producer's, set on the CLI. No slider: a threshold moved in a browser silently changes what "done" means, which is D1 in a new costume.
6. **Any enforcement of the supplement cap.** The view makes the violation visible; capping stays a deliberate `--source-manifest` act, per `TODO.md:203`.
7. **Deleting anything.** Park, never delete. The only file this concept deletes is `tinder.tsx` — source, in git, dead since 2026-08-10.
8. **Multi-user, auth, sync, an offline phone mode.** One person, one LAN, one machine.
9. **A new model, new training, new augmentation.** `/corpus` displays the veto metric; it does not chase it.
10. **The Android app and the synth pipeline.** Out of scope entirely.

---

## 11. What would falsify this concept

Written down so the next measurement settles it instead of an argument.

- **Autopilot.** If a week of unattended running produces one crashed game or one wrong-model
  proposal that has to be thrown away, the default flips to off and the strip becomes a "run all
  pending" button — the alternative rejected in §5.5.
- **The board denominator.** If, after Phase 2, a session's board percentage still moves
  imperceptibly during a sitting, boards are the wrong unit too and the honest one is plies (the ten
  sessions have 156–3 103 log rows but only 56–1 320 proposal boards).
- **Sequential vs interleaved sessions.** If `/corpus` shows the stream systematically starving the
  newest sessions because the oldest never finish, the ordering was wrong and the alternative in §4.2
  wins.
- **The class wall's yield.** If re-proposing with `--model` produces a disagree set that is mostly
  the model being wrong on dark squares (`docs/data-pipeline.md` §12.4: 9 260 of 9 290 mined errors
  sat on dark squares — a geometry artefact), the lane ranks noise and needs a per-square-colour split
  before it is worth building. **This test cannot be run on `rg-2026-08-07-13-52-38` or
  `rg-2026-08-08-00-39-57` until the alias fix of D2 lands** — those two are 45.3 % of the corpus and
  the current model trained on their occluded crops, so their disagree set would measure the model
  against itself. Until then the only clean measurement available is
  `rg-2026-08-13-19-34-23`, 3 521 rows, which is too small to settle it. Fixing the guard is
  therefore a precondition of the falsification, not just of the feature.
- **The mobile bucket.** If measured throughput on the phone is not at least the desktop grid's
  cells-per-minute, the parked idea stays parked and the phone gets the board brush at 351 px instead.
  The objection in §4.3 was answered with reasoning, not with a stopwatch.
- **`luma`.** If the ten sessions' medians fall inside one narrow band, there are no light domains and
  §7.4 should be dropped rather than rendered as three buckets containing one thing.
