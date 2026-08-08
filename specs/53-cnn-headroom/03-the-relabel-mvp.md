# Phase 03 — The relabel MVP (`platform/app/`)

> Owns `platform/app/**` (new, top-level — "Nothing here imports chesslab",
> docs/device-platform-analysis.md). Depends on 01 for data on disk; codes against the
> proposal schema PINNED in entry.md, not against phase 02's code (02 ∥ 03). This is the seed
> of the planned platform's `app` container — local MVP: no auth, no Docker, no Postgres.

## Why

The human pass must cost minutes, not evenings, or the occluded class stays theoretical. The
established practice for reviewing pre-labels is Prodigy's binary accept/reject (keyboard,
swipe on touch) over an uncertainty-ordered queue, and grid "verification labeling" where one
key confirms a whole page of same-label items — interactions scale with EXCEPTIONS, not items.
No installed tool does the one thing this data wants besides that: toggling cells on the
rectified board (the old web UI's relabel tab, deleted in `f31d933`).

## Design (decided — do not redesign)

Next.js (App Router, TypeScript, pinned exact version), `npm run dev` on localhost. Route
handlers read the filesystem directly and serve images statically; corrections are written
from Node — the SCHEMA is the contract (entry.md), append-only is correct because
`load_corrections` is last-line-wins on `(session_id, frame, square)`.

**Config:** one `platform/app/.env.local` key `CHESSLAB_DATA_DIR` (absolute path to `data/`).
No other coupling to the Python side.

**Three streams, computed from `occluded-proposals.jsonl` + its `_thresholds` header:**

1. **Bucket grid** (score > hi, proposed=occluded; and a SAMPLE of score < lo as the
   control stream): pages of ~60 crops, one shared pre-label, sorted by score descending.
   `Enter` confirms the page (writes one corrections row per non-excepted crop for the
   occluded stream; the keep-stream writes NOTHING on confirm — FEN already labels it, a
   correction row would be noise). Arrow keys + `Space` (or click) mark exceptions; exceptions
   are enqueued into stream 2. One keypress per 60 crops when the producer is right.
2. **Tinder** (lo ≤ score ≤ hi, plus exceptions): one card — the cell crop LARGE, beside it
   the same cell's interval clean median (before/after), below a board thumbnail with the cell
   marked. `←` keep, `→` occluded, digits 1-9/qrbnk-style palette for relabel-to-piece, `↓`
   skip, `z` undo (in-memory stack; undo appends a superseding row — last-line-wins makes that
   correct). Touch: swipe left/right mirrors ←/→.
3. **Board drilldown**: pick a frame, see the rectified frame with an 8×8 overlay, click a
   cell to cycle `fen_label → occluded → empty → fen_label`; writes on navigate-away.

Progress bar per stream (done/remaining), thresholds visible in the header. Crops are cut
server-side from the session frame PNGs using `geometry.corners` homography per cell — reuse
the candidate's `geometry` block; a wrong crop here only mis-frames the HUMAN's picture, never
the training data (labels key on (frame, square), pixels are cut by slice later).

**Writes:** POST → append JSON lines to `CHESSLAB_DATA_DIR/manifests/corrections.jsonl`
(create with parents if absent), `ts` ISO-UTC. Flush per request; no buffering across
requests.

## Steps

### 1. Scaffold — commit `feat(platform): the app container exists — Next.js relabel MVP scaffold`

`npx create-next-app platform/app` (TS, App Router, no Tailwind decision left to the agent —
pick and pin one styling approach in this commit). `.gitignore` covers `.next/`,
`node_modules/` BEFORE this commit lands.

### 2. Data routes — commit `feat(platform): routes read the pack's artifacts — proposals, frames, cell crops`

### 3. The three streams — commit `feat(platform): bucket grid, tinder band, board drilldown — clicks are for exceptions`

### 4. Corrections writer + roundtrip — commit `feat(platform): corrections leave through the shared schema`

## Tests (write, run once, targeted)

- `npm run lint` and `npx tsc --noEmit` in `platform/app`, once, at the end.
- One route unit test (framework of the scaffold, e.g. vitest): the corrections POST appends a
  schema-valid line and never rewrites existing lines (read-back asserts prefix-unchanged).
- The Python roundtrip is the orchestrator's acceptance (below), not a Node test.

## Acceptance criteria

- Roundtrip: toggle one cell in the MVP → a valid row in `data/manifests/corrections.jsonl` →
  `uv run chesslab slice --session rg-<name>` prints an INCREMENTED `(N corrections)` count
  (`labeling.py:460`) and the manifest row for that (frame, square) carries the new label.
- Bucket-grid page confirm with zero exceptions performs exactly one keypress and writes ≥ 59
  rows (occluded stream) / 0 rows (keep stream).
- `npm run lint` and `tsc --noEmit` green; `git status` shows no `.next/` or `node_modules/`.
- A session note in STATUS.md with the measured minutes-per-video for one real pass.

## Do NOT

- Do not import or shell out to Python; the schema is the only bridge.
- Do not add auth, upload, Docker, Postgres, or tus — the platform doc's other containers are
  explicitly out of scope here.
- Do not write corrections for keep-stream confirmations (noise in a global training input).
- Do not touch `src/chesslab/**` or `android/**`.
