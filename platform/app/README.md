# chesslab platform app — relabel MVP

Local Next.js front-end for `data/realgames/` (specs/53 phase 03). Nothing here imports chesslab;
the file formats are the only bridge.

1. `echo CHESSLAB_DATA_DIR=C:/Users/<you>/project/chess-vision/data > .env.local` (absolute path to `data/`).
2. `npm install && npm run dev` → http://localhost:3000 lists the candidates.
3. `/confirm/<name>` compares `candidate.json` against `reference.pgn` (LCS over SANs, mirroring
   `src/chesslab/realgames.py:lcs_report`) and shows the unmatched plies with their review frame.
4. Confirm writes `confirmed` / `confirmed_at` / `reviewed_plies` into `candidate.json` — atomically,
   touching nothing else. `npm run lint`, `npx tsc --noEmit`, `npm test` are the gate.

## `/relabel/<name>` — the streams (phase 03b)

Reads `data/realgames/<name>/model-reads.jsonl` (line 1 = `_model`/`_classes`/`_written_at`) and the exported
session `data/sessions/rg-<name>/`. Streams: **bucket grid** (score > hi, one `Enter` confirms a
page of 60 — clicks are for exceptions; the mid-band between `lo` and `hi` is its own grid, and the
control stream below `lo` writes NOTHING), **board drilldown** (8×8 overlay on the rectified frame;
drag paints `occluded` over every cell the pointer enters, eraser/right button clears, a click
without a drag cycles FEN → occluded → empty; writes on navigate-away). The one-card *tinder* view
was **deleted** (*"tinder nervt"*, 2026-08-10 — `docs/labeling-ux/CONCEPT.md` §S7). A queue's **flags arrive selected**
and a click takes one off (`lib/selection.ts`): confirm commits exactly what is still selected and
says so live, flags taken off go to `reviewed.jsonl`, `⌫` takes all of them off.

- Corrections go out through `POST /api/corrections` — appended to
  `$CHESSLAB_DATA_DIR/manifests/corrections.jsonl` in the schema of `specs/53-cnn-headroom/entry.md`.
  That file is a **global training input**: park it between experiments.
- Pixels: `/api/board/<name>/<stem>` and `/api/cell/<name>/<stem>/<square>` (`?median=1`) cut the
  RAW session frames through the per-frame quad (`lib/warp.ts`, calibrated against
  `data/calibration/desktop.yaml` in `warp.test.ts`). The rectified review PNGs cover only the
  commit bursts — 60 of 1 729 session frames on rec-20260808-003957 — so they cannot serve here.
- Without `model-reads.jsonl` a session is NOT MEASURED: the identity lanes print `—` with the
  reason, never `0`. One session of 43 carries reads (2026-08-19); a corpus-wide run waits on a
  retrained model.

## `/transfers` — the phone's recordings arrive by themselves

The tracker pushes a finished recording to this server over the LAN; the files land in
`data/realgames/<name>/files/` (the layout the USB tar produced) and `:desktop training-video-pack`
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

Every card on `/` shows the ONE step that can run now, read off the disk rather than remembered:

| state on disk | control |
|---|---|
| no `candidate.json` | **Label** — queues `:desktop replay <video> label lens name=<name> model=real14-80` |
| candidate, not confirmed | **Confirm →** `/confirm/<name>`, the human step |
| confirmed, no `data/sessions/rg-<name>/` | **Export session** — `uv run chesslab realgames export-session` |
| session, no `model-reads.jsonl` | **Modell-Lesarten** — `uv run chesslab realgames model-read <name> --model <run dir>` |
| everything there | **Relabel →** `/relabel/<name>` |
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

## Autopilot — the chain runs itself (Phase 1 of `docs/labeling-ux/CONCEPT.md` §5)

Six machine steps and seventeen PGN copies were sitting on disk waiting for a human to notice a
card. They are all pure functions of disk state, so a loop runs them:

- **The ticker** is `instrumentation.ts` → `lib/autopilot-engine.ts`: `register()` runs once per
  server process (Node runtime, never during `next build`), starts a 30 s `setInterval` and pins it
  to `globalThis` like `lib/jobs.ts`'s queue. A finished job ticks again at once. **No browser is
  involved** — close every tab and the backlog still drains.
- **The picker** (`lib/autopilot.ts`, pure and tested) takes the **oldest** non-`useless`,
  non-`archived` game whose `nextStep()` is a machine step (`label`, `export`) and runs
  it through `lib/chain-run.ts` — the same door the button uses, which re-reads the disk and 409s on
  a step that is not the next one. `adopt-pgn` is done for every bundle that carries a phone `.pgn`
  and has no `reference.pgn` (`adoptPgn` never overwrites).
- **Never a retry.** The marker is the job ledger's last row for that recording: `kind` names the
  step, `failed`/`skipped` means a human presses or nothing happens. Those rows are the
  **`/reparatur`** lane, with the tool's own last words and the manual button.
- **Broken MP4** never starts a job — `checkMp4` says so in milliseconds and the game goes to
  Reparatur instead of a ten-minute decode.
- **Lens** is decided before the run by `lensFor` and never retried around; a label run without
  barrel correction carries `lens: false` in its job row and says `gelabelt OHNE Linsen-Korrektur`.
- **`model-read` is not a machine step.** `realgames model-read` REQUIRES `--model <run dir>` and
  refuses a run that trained on the session (`check_not_circular`), so which run is right is a
  per-session choice no tick can make. The button reads `CHESSLAB_MODEL_READ_RUN` and 409s with
  that sentence when it is unset. Guard 5 (the 10-minute labeling hold) went with it: nothing the
  loop runs rewrites a session's files under a labeler's cursor any more.
- **`$CHESSLAB_DATA_DIR/inbox/heavy.lock`** (`{pid, job, name, startedAt}`) is written while an
  Autopilot job runs. A *foreign* live lock stops the start; a stale one (pid gone) is overwritten.
  It is one-directional until a terminal tool honours it, which is why the strip prints the rule:
  **Autopilot pausieren, bevor ein Trainingslauf startet.**
- **The strip** sits on every page (`app/autopilot-strip.tsx`, `GET/POST /api/autopilot`): state,
  queue length, Reparatur count, pause toggle. The pause lives in
  `$CHESSLAB_DATA_DIR/inbox/autopilot.json` and survives a restart. Neither file is a wire format;
  nothing in Python reads them.

`slice`, `dataset build` and `train` are **not** in this vocabulary, and the slot stays a single
serialized promise chain — the same one worker `lib/jobs.ts` has always had.

## The queues, and "nutzlos"

`/confirm` and `/relabel` list every game whose next chain step is theirs, newest first
(`lib/queues.ts`; both naming schemes on disk carry the same 14 digits, so `VID_20260802_222741`
sorts by its clock and not by its `V`). `/relabel` has a second section, **Noch nicht gelesen** —
a recording with no `candidate.json`, i.e. the machine step in front of the queue that nobody
started — with the button that starts it, because an empty queue with no explanation reads as a bug.

`data/realgames/<name>/useless.json` is the human's verdict that a recording is not worth work:

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
