# chesslab platform app — labeling front-end

Local Next.js front-end for `data/recordings/` (specs/53 phase 03). Nothing here imports chesslab;
the file formats are the only bridge.

**A recording is one folder, and everything that only says something about it lives inside** — the
import (`candidate.json`, `video.mp4`, `files/`, `review/`, `review-extra/`), what was cut from it
(`session.yaml`, `log.jsonl`, `boards/`, `dirty/`, `mattes/`, `matte.jsonl`) and its own
`corrections.jsonl` and `useless.json`. `lib/data.ts` `gameDir` is the only place that names the
path. Everything derived lives outside and is rebuildable: `data/crops/<tag>/` (crops plus that
pool's `manifest.jsonl`), `data/datasets/`, `data/models/`, `data/reports/`. Outside a recording
this app touches only `data/labels/review-notes.jsonl` and its own `data/inbox/`.

1. `echo CHESSLAB_DATA_DIR=C:/Users/<you>/project/chess-vision/data > .env.local` (absolute path to `data/`).
2. `npm install && npm run dev` → http://localhost:3000 lists the candidates.
3. `/confirm/<name>` compares `candidate.json` against `reference.pgn` (LCS over SANs, mirroring
   `src/chesslab/realgames.py:lcs_report`) and shows the unmatched plies with their review frame.
4. Confirm writes `confirmed` / `confirmed_at` / `reviewed_plies` into `candidate.json` — atomically,
   touching nothing else. `npm run lint`, `npx tsc --noEmit`, `npm test` are the gate.

## `/strom/einpflegen` — every recording by the step it waits for

The one view across the whole chain: seven headings in the chain's own order (`phone-record`,
`label`, `confirm`, `export`, `matte`, `model-read`, `labeln`), each with the recordings sitting on
that step and the SAME control the card carries — so "what is stuck before the export" is one
glance instead of forty cards. Useless, archived and video-less bundles are out, as everywhere.
The filter lives in the URL and nowhere else: `?nur=confirm,export` keeps those groups (`Alle`
clears it), `?gescheitert=1` keeps only rows whose last job failed on the step the disk still asks
for. Both are plain links, so a filtered view is shareable and survives a reload. The step's words
come from `lib/chain-steps.ts`, the same table `chain-actions.tsx` prints on the card; `Karte →`
jumps to `/#<name>`, the card's own anchor. Model and grouping: `lib/intake.ts`.

## `/strom/labeln` — the streams (phase 03b)

Reads `data/recordings/<name>/model-reads.jsonl` (line 1 = `_model`/`_classes`/`_written_at`) and the
session the export cut into **the same folder** — `session.yaml` + `log.jsonl` + `boards/` under
`data/recordings/<name>/`, carrying the id `rg-<name>` (`lib/session.ts` `sessionDir` is `gameDir`).
Streams: **bucket grid** (score > hi, one `Enter` confirms a
page of 60 — clicks are for exceptions; the mid-band between `lo` and `hi` is its own grid, and the
control stream below `lo` writes NOTHING), **board drilldown** (8×8 overlay on the rectified frame).
Painting `occluded` is gone: it is `lib/classes.ts`'s `LEGACY_LABEL`, still READ so the 31 271 rows
that carry it stay legible, but nothing writes another one — occlusion is measured as `coverage`
(`matte.jsonl`), not asked, and only the 13 identities are writable. The one-card *tinder* view
was **deleted** (*"tinder nervt"*, 2026-08-10 — `docs/labeling-ux/CONCEPT.md` §S7). A queue's **flags arrive selected**
and a click takes one off (`lib/selection.ts`): confirm commits exactly what is still selected and
says so live, `⌫` takes all of them off. The `reviewed` ledger lives per recording next to
`corrections.jsonl` (`lib/corrections.ts` `ledgerPath`) and is provenance only — Python skips it.

- Corrections go out through `POST /api/corrections` — appended to that recording's own
  `data/recordings/<name>/corrections.jsonl` in the schema of `specs/53-cnn-headroom/entry.md`.
  The rows stay a **global training input** (park them between experiments); only the file moved
  next to the recording it judges, so a re-slice can never carry a human's ruling away. It holds
  identity labels only, and the writer validates rather than trusting the client.
- Pixels: `/api/board/<name>/<stem>` and `/api/cell/<name>/<stem>/<square>` (`?median=1`) cut the
  RAW session frames through the per-frame quad (`lib/warp.ts`, calibrated against
  `data/calibration/desktop.yaml` in `warp.test.ts`). The rectified review PNGs cover only the
  commit bursts — 60 of 1 729 session frames on rec-20260808-003957 — so they cannot serve here.
- Without `model-reads.jsonl` a session is NOT MEASURED: the identity lanes print `—` with the
  reason, never `0`. One session of 43 carries reads (2026-08-19); a corpus-wide run waits on a
  retrained model.

## `/transfers` — the phone's recordings arrive by themselves

The tracker pushes a finished recording to this server over the LAN; the files land in
`data/recordings/<name>/files/` (the layout the USB tar produced) and `:desktop training-video-pack`
is queued behind it, one job at a time. Full path, protocol and failure modes:
[`docs/phone-transfer.md`](../../docs/phone-transfer.md).

- `GET /api/ingest/hello` — the probe the phone sweeps the subnet with; says whether the token matches.
- `POST /api/ingest/session` — declare a bundle, get back what this machine already holds per file.
- `PUT /api/ingest/session/<name>/chunk?path=&offset=` — 8 MiB, streamed to a `.partial`; a wrong
  offset is answered with 409 and the true length, never a write.
- `POST /api/ingest/session/<name>/complete` — sizes checked, tree moved, ledger appended, pack queued.
- `GET /api/ingest/jobs` — what the page polls.

Bearer token from `CHESSLAB_INGEST_TOKEN` or `$CHESSLAB_DATA_DIR/inbox/token` (generated on first
use, printed on the page). `CHESSLAB_REPO_DIR` / `CHESSLAB_DESKTOP_BIN` override where the pack
binary is looked for; without it the job fails **with the `installDist` command in its reason**.

## The chain, as buttons

Every card on `/` shows the ONE step that can run now, read off the disk rather than remembered,
with one sentence beside it saying what the step does (`app/chain-actions.tsx`, `STEP`):

| state on disk | control |
|---|---|
| no `candidate.json`, a game record naming the session | **Züge vom Handy übernehmen** — queues `:desktop phone-candidate <recordingDir>` (step and job kind `phone-record`): the record's plies on the video's clock, no tracker, no CNN. A refusal offers **Züge am PC neu erkennen**, the replay below |
| no `candidate.json` | **Züge erkennen** — queues `:desktop replay <video> label lens name=<name> model=p4a-80-clahe` |
| candidate, not confirmed | **Züge prüfen →** `/confirm/<name>`, the human step |
| confirmed, no `log.jsonl` in the recording | **Bretter ausschneiden** — `uv run chesslab realgames export-session` (it cuts into `data/recordings/<name>/`, writing `log.jsonl` LAST) |
| session, mattes below target | **Hände matten** — SAM cuts the hand out of the occluded frames |
| session, no `model-reads.jsonl` | **Modell prüfen lassen** — `uv run chesslab realgames model-read <name> --model <run dir>` |
| everything there | **Zellen labeln →** `/strom/labeln` |
| `useless.json` set | nothing — the step is `null` until "doch brauchbar" |

`POST /api/chain/<name>` takes `{step}` and REFUSES a step that is not the disk's next one (409 with
the state), so a stale tab cannot export an unconfirmed candidate. `{step: "adopt-pgn"}` copies a
transferred phone game's `.pgn` in as `reference.pgn` — never over an existing one.

The two chesslab steps are spawned as a CLI (`uv`, or `CHESSLAB_UV`), never imported: the file
formats stay the only bridge. They share the packs' single-slot queue — same machine, same CPU.

While a job runs the card polls `GET /api/chain/<name>/progress` every two seconds and shows what
the tool has actually reached: its position in the recording (against `video_duration_ns` from the
phone's `session.yaml`), the number of COMMITTED plies, and its last line of output. No denominator,
no bar — a replay that has printed nothing says "no output yet" rather than spinning.

A label that fails because no lens fit was accepted offers **Label ohne Linsen-Korrektur** as a
second, explicit press. `replay … label lens` is fail-closed by design (specs/52), and the phone
camera corrects itself — its grid fit is refused every time (TODO.md, 2026-08-10), so without that
second button the step is impossible for exactly the recordings the LAN transfer delivers.

## Die Schritte — vier Knöpfe, sonst nichts (Phase 1 of `docs/labeling-ux/CONCEPT.md` §5)

There is **no ticker**. Nothing starts a job except a press — the user's call on 2026-08-18
("entferne das AUTOPILOT DING ich will die immer selbst starten"), and now a correctness rule:
starting the dev server must not touch the corpus.

- **The panel** (`app/shell.tsx` → `app/drain-status.tsx`, `GET/POST /api/drain`) is the app's
  primary control: one big button per job step (`label`, `export`, `matte`, `model-read`), each
  carrying the number of recordings waiting on it, plus the line that says what runs right now.
- **A press drains that step**: oldest recording first, one at a time, through `lib/chain-run.ts` —
  the same door the card button uses, which re-reads the disk and 409s on a step that is not the
  next one. **Stopp** ends the drain after the recording in the slot; it never kills a running job.
  Only one drain exists at a time, because the slot is one.
- **The counts** come from `lib/backlog.ts` (pure and tested): per step, every non-`useless`,
  non-`archived` recording whose `nextStep()` is that step and whose ledger says it is neither busy
  nor failed. `lib/drain.ts` caches one pass for 10 s, so polling does not re-walk `recordings/`.
- **Never a retry.** The marker is the job ledger's last row for that recording: `kind` names the
  step, `failed`/`skipped` means a human presses or nothing happens. Those rows are the
  **`/reparatur`** lane, with the tool's own last words and the manual button.
- **Broken MP4** never starts a job — `checkMp4` says so in milliseconds and the game goes to
  Reparatur instead of a ten-minute decode.
- **Lens** is decided before the run by `lensFor` and never retried around; a label run without
  barrel correction carries `lens: false` in its job row and says `gelabelt OHNE Linsen-Korrektur`.
- **`model-read` needs a model.** `realgames model-read` REQUIRES `--model <run dir>` and refuses a
  run that trained on the session (`check_not_circular`), so the button reads
  `CHESSLAB_MODEL_READ_RUN` and 409s with that sentence when it is unset — on the button, not in a
  log nobody reads.
- **`adopt-pgn` rides on the queue read** (`lib/queues.ts` → `chain.adoptOffered`): every bundle
  that carries a phone `.pgn` and has no `reference.pgn` gets one, whenever any page reads the
  queue. `adoptPgn` never overwrites, and a refusal is remembered and printed in the panel instead
  of retried on every render.
- **`$CHESSLAB_DATA_DIR/inbox/heavy.lock`** (`{pid, job, name, startedAt}`) is written while a
  pressed job runs. A *foreign* live lock stops the start; a stale one (pid gone) is overwritten.
  It is one-directional until a terminal tool honours it, which is why the panel names the holder:
  a `chesslab` run started in a terminal is visible there, not silently overrun.

`slice`, `dataset build` and `train` are **not** in this vocabulary, and the slot stays a single
serialized promise chain — the same one worker `lib/jobs.ts` has always had.

## The queues, and "nutzlos"

`/confirm` lists every game whose next chain step is its own, newest first (`lib/queues.ts`;
both naming schemes on disk carry the same 14 digits, so `VID_20260802_222741` sorts by its clock
and not by its `V`). The same read counts what waits on `labeln`, and that count is the badge the
nav puts on `/strom/labeln` (`app/shell.tsx`) — the labeling streams themselves are corpus-wide,
so they have no per-game queue of their own.

`data/recordings/<name>/useless.json` is the human's verdict that a recording is not worth work:

```json
{ "at": "2026-08-14T21:42:28Z", "reason": "Brett halb aus dem Bild", "undone_at": "..." }
```

A flagged game offers NO chain step (`ChainState.step` is `null`), is in neither queue, and renders
on `/` as one grey line with the reason and **doch brauchbar**. The undo STAMPS `undone_at` — the
file is never removed, nothing else on disk is touched, and `POST /api/useless/<name>` with
`{useless, reason?}` is the only writer. Bundles with neither video nor candidate (18 of them from
older transfers) collapse into one row, **N Bundles ohne Video**, which states per bundle what it
does carry (frame count, PGN) and lets each be flagged from there.

## On a phone

The labeling screens are used from the phone's browser (`http://<pc>:3000`), so they are measured
there, not assumed:

| screen | before | now, at 375 px |
|---|---|---|
| bucket grid | 10 fixed columns → 34 px crops | `auto-fill` → **3 columns, 109 px crops**, fetched at 192 px for a 3x display |
| board brush | board fine, controls 28 px | board 351 px (**44 px per square**), every control ≥ 44 px |
| card list `/` | chain links 16–21 px | chain controls 44 px |

Two rules came out of it. Touch sizes are written `max-sm:h-11`, never `h-11 sm:h-8` — both are
equally specific and Tailwind emits the plain utility last, so the desktop inherited the phone's
height. And an overlay on a picture that scales must be positioned in per cent, not in the pixels
of a fixed thumbnail — the square marker of the since-deleted tinder card was the one that broke.

Note for agents: Next 16 has breaking changes against most training data - read the guides
in node_modules/next/dist/docs before writing code here.
