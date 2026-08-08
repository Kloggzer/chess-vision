# chesslab platform app — relabel MVP

Local Next.js front-end for `data/realgames/` (specs/53 phase 03). Nothing here imports chesslab;
the file formats are the only bridge.

1. `echo CHESSLAB_DATA_DIR=C:/Users/<you>/project/chess-vision/data > .env.local` (absolute path to `data/`).
2. `npm install && npm run dev` → http://localhost:3000 lists the candidates.
3. `/confirm/<name>` compares `candidate.json` against `reference.pgn` (LCS over SANs, mirroring
   `src/chesslab/realgames.py:lcs_report`) and shows the unmatched plies with their review frame.
4. Confirm writes `confirmed` / `confirmed_at` / `reviewed_plies` into `candidate.json` — atomically,
   touching nothing else. `npm run lint`, `npx tsc --noEmit`, `npm test` are the gate.

## `/relabel/<name>` — the three streams (phase 03b)

Reads `data/realgames/<name>/occluded-proposals.jsonl` (line 1 = `_thresholds`) and the exported
session `data/sessions/rg-<name>/`. Streams: **bucket grid** (score > hi, one `Enter` confirms a
page of 60 — clicks are for exceptions, which fall into the tinder band; the control stream below
`lo` writes NOTHING), **tinder** (one card: cell crop, the interval's clean median, the board with
the cell marked; `←` keep, `→` occluded, digits = white piece, letters = black, `x` empty, `↓`
skip, `z` undo, swipe on touch), **board drilldown** (8×8 overlay on the rectified frame; drag
paints `occluded` over every cell the pointer enters, eraser/right button clears, a click without a
drag cycles FEN → occluded → empty; writes on navigate-away).

- Corrections go out through `POST /api/corrections` — appended to
  `$CHESSLAB_DATA_DIR/manifests/corrections.jsonl` in the schema of `specs/53-cnn-headroom/entry.md`.
  That file is a **global training input**: park it between experiments.
- Pixels: `/api/board/<name>/<stem>` and `/api/cell/<name>/<stem>/<square>` (`?median=1`) cut the
  RAW session frames through the per-frame quad (`lib/warp.ts`, calibrated against
  `data/calibration/desktop.yaml` in `warp.test.ts`). The rectified review PNGs cover only the
  commit bursts — 60 of 1 729 session frames on rec-20260808-003957 — so they cannot serve here.
- Without a proposals file the routes fall back to `test-fixtures/occluded-proposals.<name>.jsonl`
  and say so in the header; both go through the same parser.

Note for agents: Next 16 has breaking changes against most training data - read the guides
in node_modules/next/dist/docs before writing code here.
