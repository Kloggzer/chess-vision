# chesslab platform app — relabel MVP

Local Next.js front-end for `data/realgames/` (specs/53 phase 03). Nothing here imports chesslab;
the file formats are the only bridge.

1. `echo CHESSLAB_DATA_DIR=C:/Users/<you>/project/chess-vision/data > .env.local` (absolute path to `data/`).
2. `npm install && npm run dev` → http://localhost:3000 lists the candidates.
3. `/confirm/<name>` compares `candidate.json` against `reference.pgn` (LCS over SANs, mirroring
   `src/chesslab/realgames.py:lcs_report`) and shows the unmatched plies with their review frame.
4. Confirm writes `confirmed` / `confirmed_at` / `reviewed_plies` into `candidate.json` — atomically,
   touching nothing else. `npm run lint`, `npx tsc --noEmit`, `npm test` are the gate.

Note for agents: Next 16 has breaking changes against most training data - read the guides
in node_modules/next/dist/docs before writing code here.
