# The labeling UX — concept

> Written 2026-08-15, cut to what holds on 2026-09-23. Section numbers are the original ones,
> because code comments cite them; gaps are sections that were diagnosis or plan and are gone
> (`git show 71420962:docs/labeling-ux/CONCEPT.md`). What the app does today, route by route:
> `platform/app/README.md`. What happens to a label after it is written: `docs/data-pipeline.md`.

## 0. The spine

The user, 2026-08-15: *"ich interessiere mich eigentlich gar nicht welche Session ich label —
sofern ich nen Stream von Daten habe, label ich den."*

1. **The unit of work is an activity stream, not a game.** Two streams: **Züge** (confirm every
   pending game's plies, back to back) and **Labeln** (every board of every session in one feed).
   A game boundary is a caption, not a navigation step.
2. **Names are metadata.** A session id appears small, next to the work, never as something to
   click through.
3. **"Insta rauswerfen" is a stream action** — one key, no page change: throw out a ply, a board or
   a whole recording, and the stream continues.
4. **Per-game pages are drill-down and debug surfaces.** The daily loop never opens one.

## 1.4 What must survive any rework

Each of these was paid for with a measurement or a complaint:

- **Cell grids group by square, not by score** — score order scattered a square's crops over six
  pages (*"ich sehe immer noch alte Bilder"*, 2026-08-09).
- **Flags are a selection** (`lib/label/selection.ts`): confirm commits what is shown, not what was
  proposed.
- **`judged` bright vs dim** — the board never implies untouched cells were reviewed.
- **Two ledgers** — `reviewed` must not pollute `corrections.jsonl`, a global training input.
- **Touch floors written `max-sm:h-11`**, never `h-11 sm:h-8`.
- **A chain step that is not the disk's next one is refused** (409 with the state).

**S7 — the one-card *tinder* view is deleted** (*"tinder nervt"*, 2026-08-10): one card at a time on
a 27-inch screen wastes the display. §4.3 is the one place the format survives, and why.

## 3.1 Two streams, two reference surfaces

- **Daily loop:** `/strom/zuege` (confirm, all games, commit at each game boundary) and
  `/strom/labeln` (boards and cells, all sessions; lanes switch the FILTER, never the page).
- **Reference / debug, never in the daily loop:** `/game/<name>` (one recording, everything: chain
  state, job logs, its own confirm view, `nutzlos`, PGN, archive) and `/corpus` (§7).

## 3.2 Merged, killed, kept

- The per-game lists (`/`, `/confirm`, `/relabel`) became **streams**; a list is not a smaller
  stream, it is the thing standing between the user and the work.
- The per-game tab bar became **lanes**: the real choice is *which boards*, not *which view*.
- **A lane declares its renderer**: board or **cell grid** (the bucket grid, grouped by square).
  The two reach different work — folding the grid into the board makes every cell on a board the
  lane does not open unreachable. Crop grid and board paint are shared components for that reason.
- `nutzlos`, archive, PGN upload and the 409 step guard are kept verbatim.

> **Two streams, not one interleaved stream:** confirm asks *"does this photo show the position
> after this move?"* over a whole board; labeling asks *"what is on this cell?"* with a loaded
> brush. Incompatible modes and keymaps; the user's sentence puts them in sequence.

## 4.1 ZÜGE — `/strom/zuege`

Every pending game's cards, concatenated, newest recording first. The human never picks a game and
never presses Confirm. Everything starts as DROP; `k` keeps, `Space`/`j` drops, `←`/`→` step the
commit window's frames without advancing, `z` undoes one card (across a game boundary too).

`x` throws the recording out: `useless.json`, **discard its buffered keeps**, skip its remaining
cards. It writes **no** confirmation — stamping `confirmed: true` on a rejected recording would
hand the export exactly that recording. A game whose replay read nothing (`moves: []`) is one card:
`x` raus (recommended) or skip.

### 4.1.1 The game boundary is the commit, and it owns the export

When the last card of a game passes, the stream writes the confirmation with the buffered keeps and
continues into the next game. `confirmed: true` makes `export` the next step, so an export started
milliseconds later would read `reviewed_plies` before the promised undo could run. Therefore:

1. The boundary writes `candidate.json` **and enqueues the export itself** with
   `notBefore = now + 90 s` on the job row.
2. The picker skips an `export` whose `notBefore` is in the future, and any game whose
   `confirmed_at` is under 90 s old (a commit from another client).
3. `z` inside the window **dequeues** the job and rewrites `reviewed_plies`. Nothing ran.
4. `z` after the window rewrites `reviewed_plies` and says plainly that the session must be
   re-exported, with the button that does it.

The boundary toast shows the window as a countdown — exactly how long the undo stays free.

## 4.2 LABELN — `/strom/labeln`

Every board of every session, one ordered list. Sessions run **sequentially**, chronological within
a session, newest session first — not interleaved: the raster cache holds 24 decoded frames, and a
human re-learns lighting and camera at every switch. Balance is a selection problem for `/corpus`.

**Lanes are filters over the same stream**, each with its own URL (a lane is a place — Back and a
bookmark work). Since 2026-09-07 they are cut by the QUESTION, not by the producer (*"ich verstehe
die schon gar nicht mehr"*): `Strittig` (cells: audit, model ≠ FEN including the `Klassenwand`
query, position, hand; anything over `PIECE_VISIBLE_MAX` drops out because the loss masks it
anyway), `Stichprobe`, `Bretter` (every board), and the frame lane (`lib/label/lanes.ts`).

- **The chip prints one number**; unit and denominator sit in its tooltip.
- **An unavailable lane shows `—`, never `0`.** `0` claims there is no such work; `—` says the
  producer has not been asked yet, with the reason on hover.
- **The audit lane questions every label**, not only one class (user, 2026-08-15: *"ich möchte
  alle labels in frage stellen"*). It renders `data/manifests/audit-flags.jsonl` cells ranked by
  margin and writes through the normal ledgers, so the audit reaches training only through the
  human. About half of all flags are false alarms (`docs/cross-labeling-literature.md`), so
  "FEN stimmt" stays a one-key verdict and the model's `predicted` stands beside the FEN's word.

**Keys.** One keymap for the whole app. The board is a **pointer surface with keyboard bulk
operations and keyboard advance** — picking three cells out of 64 is a pointing task, so there is
no cell cursor: `Space` acts on the square under the pointer. `Enter` commits and advances, `⌫`
takes all flags off and commits as reviewed, `x` marks the board junk, `X` the recording. The brush
has thirteen keys (`e` empty, `1`–`6` white, `pnbrqk` black) — no `o`, occlusion is measured
(`coverage`), not painted.

> **The board stays the primary unit** over a crop grid: an occluder covers a contiguous swath,
> and the shape is the evidence. A grid of crops destroys adjacency.

### 4.2.1 The loop may never lose a case

Counted in discrete interactions, no case may get worse than the old brush and the common one must
get better. That is why `f` exists (all flags off, **stay** on the board: *"ich will nur die Reihe
unten rechts markieren"*) — flags off, click back the real ones. And why a flagged cell toggles as
a **2-cycle** (`proposal ⇄ base`): the old 3-cycle needed two clicks to restore a flag. Any other
label goes through the brush. If a binding ever fails this test, the binding changes.

### 4.2.2 `z` needs a tombstone

A superseding row overwrites the training label but leaves the key in the judged map — the board
never reopens. So `z` has two regimes:

- **Before the flush** — edits are in memory; `z` is a free in-memory pop, no artifact.
- **After the flush** — `z` appends one superseding row with `"retract": true`, into the ledger the
  original row came from:

```json
{"session_id":"rg-…","frame":"001482","square":"e5","label":"wR","retract":true,"ts":"…"}
```

`label` is the value the cell reverts to, so Python's `load_corrections` (which reads four keys and
ignores `retract`) restores the training label by last-wins. `retract` is read by the judged map
alone, which **deletes** the key — the board reopens. A separate `retractions.jsonl` was rejected:
it would reopen the board and leave the wrong label in training.

`X` does **not** retract corrections already written for that recording — the ledger is
append-only; the toast says so.

### 4.2.3 `Fertige zeigen` — der Rückweg nach dem ⏎

Die Checkbox gilt in JEDER Lane und stellt die **zuletzt beurteilten** Zellen voran, jüngste zuerst
(`recentVerdicts`, 300 Zeilen über beide Ledger). Der Rückweg hängt am Ledger, nicht an der Lane —
die Stichprobe zieht per Bauart nur Unbeurteiltes. Zwei Regeln:

- Jede Karte trägt ihr **stehendes Urteil** (`✓ bP`) und den Zeitpunkt.
- Eine schon beurteilte Zelle, die niemand anfasst, schreibt beim ⏎ **nichts** — sonst überschriebe
  die Vorbelegung eine frühere Korrektur mit dem FEN-Wort.

Übermalen ist eine gewöhnliche `corrections`-Zeile (last-wins); kein Tombstone nötig.

### 4.2.4 Historie — `/strom/historie`

Jede geschriebene Zeile beider Ledger, jüngste zuerst, rückwärts blätterbar. Jede Karte sagt
`alt → neu`: `ledgerRows` parst die Datei in Reihenfolge und legt zu jeder Zeile den Wert, den sie
ablöste (`LedgerChange.before`). Ein Stapel trägt gleiche `ts`, die Reihenfolge steht in `seq`.

- **Übermalen** — gewöhnliche `corrections`-Zeile.
- **Zurücknehmen** — der Grabstein aus 4.2.2 mit dem **Vorgänger** als `label`; ohne Vorgänger das
  Wort des FEN, weil `load_corrections` ohne jede Zeile ohnehin das nähme. `null` gibt es nicht.

Die Liste ist ein Schnappschuss; die Marke `✓ …` hängt an der ZEILE, nicht an der Zelle.

## 4.3 The phone mode — one crop, big buckets

Below 768 px the Labeln stream renders one crop at a time with large buckets; a swipe is a verdict,
a long press answers for the whole event (same square, same `fen_label`), `⟲` undoes the group.

> **Why one card survives here after "tinder nervt":** what was killed was one card on a 27-inch
> screen. At 375 px the grid cell is ~109 px and *"die Bilder sind viel zu klein"* (2026-08-13) —
> the judgement is resolution-bound. **The condition:** grouping **by square** and **event
> collapse**, or a resting hand produces forty identical cards and tinder's failure repeats.

## 5. No autopilot — every job starts on a press

The concept planned a server-side ticker that ran machine steps unattended. The user removed it on
2026-08-18 (*"entferne das AUTOPILOT DING ich will die immer selbst starten"*); starting the dev
server must not touch the corpus. The panel and its drain: `platform/app/README.md`. What remains
from this section is binding:

- **Failure is loud, never silent** — a silent fallback is the defect. A broken MP4 never starts a
  job and goes to Reparatur; lens is decided before the run by `lensFor`, never by retry, and a run
  without lens correction says so permanently; any non-zero exit is one Reparatur row with the
  tool's own last words and the manual button.
- **No automatic retries**, of anything. A failed step waits for a human.
- **One slot**, and `inbox/heavy.lock` names the holder. `slice`, `dataset build` and `train` are
  never in the web app's vocabulary.

## 6.2 The denominator is boards

The unit a human clears is a **board**, so progress counts boards, and the headline is the
stream's, not the game's. On 2026-08-15 the first game was 58 % done while the UI said 8.3 %,
because the bar divided by every proposal cell. A cell denominator is a function of the producer's
thresholds — re-running the producer would silently rewrite how much work was done; a board count
is a property of the recording. Every figure names the file it comes from and is read live.

## 7. `/corpus` — pool, snapshot, diff

*"Wie sähe unser Datenset aus"* has three answers, and the gap between them is the finding: the
**pool** (ledgers + sessions, if sliced now), the **snapshot** (what a built dataset contains) and
the **diff** (what a rebuild today would add or drop). Datasets are snapshots; nothing tells the
user otherwise which labels made it in.

- `/corpus` **reads, never runs** — no build, no eval behind a web button. It may print the command.
- The index lives **outside** `data/datasets/` (`inbox/corpus-index/`): nothing the app writes may
  land inside a dataset directory.
- **The supplement rule is a measurement, not a threshold:** 5.3 % → 2 phantoms, 50 % → 105, and
  nothing measured between. The view shows the share, it does not enforce a cap.
- An eval row is rendered **from one whole file** — a model name and a metric that were not in the
  same file never share a line. The veto metric is a model property, not a dataset property.
- `stats.json`'s `light`/`dark` is **square colour**, not illumination; nothing on disk measures
  light, so no "Lichtdomäne" is shown.

## 8. Provenance

Three states per cell, rendered distinctly: never looked at (in neither ledger), reviewed and the
FEN was right (`reviewed`), corrected (`corrections`). Provenance lives in its **own files**, never
as a flag inside `corrections.jsonl`: `load_corrections` takes `label` off every row it reads, so a
restated FEN would become a training label. The one deliberate exception is `retract` (§4.2.2).

**(c) Verdicts that are not labels** go to `review-notes.jsonl`: a junk board (`x`), a ply whose
picture is unusable, a bad interval from the confirm gallery. No label, so it cannot corrupt
training input. It ships with the `x` key — "never show it again" that dies on reload is not a
feature.

## 9.1 Wire formats are additive-only

Every Python consumer keeps working, because the readers ignore unknown keys (`load_corrections`
takes `session_id`, `frame`, `square`, `label`). New keys on existing rows and new files are safe.
**Forbidden:** renaming a key, changing `frame` from a stem to a path, changing the dedup tuple,
writing a label outside `config.CLASSES`. A new key or file must be declared in this doc or the
app README — an undeclared tombstone or index is a quiet schema change.

## 10. Non-goals

1. The tracker, the replay, the engine — the app presses them, it does not change them.
2. `slice_session`, `dataset_build`, `train` — the app never builds.
3. **The confirm review logic** — LCS, `reviewed_plies`, multi-commit cards, drop-when-in-doubt.
   Only *where* the commit happens moved.
4. `nutzlos` semantics, archiving, PGN upload, `/transfers`.
5. Thresholds — no slider; a threshold moved in a browser silently changes what "done" means.
6. Enforcing the supplement cap.
7. Deleting anything — park, never delete.
8. Multi-user, auth, sync, an offline phone mode.
9. A new model, training or augmentation.
10. The Android app and the synth pipeline.
