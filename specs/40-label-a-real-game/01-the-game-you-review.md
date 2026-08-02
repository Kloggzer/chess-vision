# 01 — The game you review

> Owns `src/chesslab/web/routers/realgames.py` (new), its registration in
> `web/routers/__init__.py`, `web/frontend/src/components/GameReview.tsx` (new) and its mount in
> `Dataset.tsx`, and `tests/test_web_realgames.py` (new). Needs 00's `candidate.json`.

## Why

The human is not entering a game. They are **reviewing one the tracker already played to the end**,
and the tracker was guessing for most of it: 55 of 91 commits in the game that motivated this pack
came through `cnn_recovery`, which `Commit.kt:41` defines as *"position was LOST — rebuilt by the
CNN, not detected"*. The reviewer's job is to find the wrong ones, and the tool's job is to say
where to look.

A form would be the wrong shape for that. A game score with a board beside it is the shape every
chess player already has, and stepping through a game is a thing they already know how to do.

## Design

One panel inside the existing session-review surface, not a new app. That surface is a conditional
panel inside `SessionsPanel` in `Dataset.tsx` (gated on `reviewSid`, `Dataset.tsx:86, 238`), which
is where `Alignment.tsx` and `CornerEditor.tsx` are mounted (`Dataset.tsx:10-11, 290-333`). A
sibling entry in the same place, gated on a selected candidate name. **Do not add a top-level tab**
— `App.tsx:8-13` is four tabs and this is not a fifth workflow, it is the tail of the dataset one.

### The board is rendered on the server, like the session board already is

There is no chess library in the frontend: `package.json:12-20` lists `@tanstack/react-query`,
`@types/three`, `lucide-react`, `react`, `react-dom`, `react-router-dom`, `three`, and nothing else.
The session review already solves this — `/api/sessions/{sid}/board/{idx}` returns
`chess.svg.board(size=560)` as `image/svg+xml` (`routers/sessions.py:929-943`) and `Dataset.tsx:322`
renders it as an `<img>`. Do the same. `python-chess` is already a dependency, `chess.svg` takes
`lastmove` for the arrow and `check` for the king square, and an `<img>` of an SVG is a
theme-independent picture that costs one route.

**Do not add a chess board component or a chess dependency to the frontend.** That is the homebrew
this project's standing preference rules out, and it would be the largest single piece of code in
the pack for a picture the server already knows how to draw.

### Chess validates itself, and that is the first tier

Replay the line from `start_fen` with `python-chess`. Where it breaks, it is a **certain** error,
not a suspicion — a legal-move check has no false positives. Report per ply:

- `legal` — replayed cleanly.
- `illegal` — the move is not legal in the position the prefix produced. The first such ply is the
  one to fix; everything after it is downstream of a broken position and must be shown as
  *unevaluated*, not as forty more errors. That distinction is the whole value of the tier.

Note what this does **not** prove. A line can replay perfectly and still be wrong — a recovery that
invents a plausible legal move produces a legal game. Legality is a certain detector of some errors
and no detector at all of the rest, which is exactly why it is one tier of four and not the answer.

### The ranking

Worklist order, most doubtful first:

1. **Impossible** — the first ply the replay rejects.
2. **Rebuilt** — `decider == "cnn_recovery"`. Not detected; the path every fabrication this week
   came out of. In the motivating game this is the majority of moves, so the tier is large, and
   that is the honest picture rather than a defect in the ranking.
3. **Alarmed** — `alarm` non-null at the commit. Read `entry.md` before trusting this: no decision
   row on either platform carries an alarm flag, and this field exists only because phase 00's
   harness polled `status()` while driving the loop. Label it in the UI as what it is.
4. **Everything else** — `cnn_occupancy`, `cnn_pair`, `diff`, `diff_after_verify`, `cnn_overrule`.
   `cnn_occupancy` is the *diff* path confirmed by the CNN (`Commit.kt:37`), and a note in
   `tracker.py:2777-2779` records that a decider tally was misread on 2026-07-27 as "the diff path
   commits nothing itself" for exactly this reason. Show the decider's prose from
   `_DECIDER_REASON` (`tracker.py:2782-2792`) rather than the bare key, so nobody re-makes that
   mistake at a glance.

Tier 4 is accepted **in one action**. That is the requirement that keeps this from being a form: on
a clean game the reviewer clicks through six moves and one button.

### Correcting a move cannot produce an illegal one

Three operations, which is all a move list needs: **replace**, **delete**, **insert before**.

For replace and insert, the server offers the **legal moves in the position at that ply**, from
`board.legal_moves`, as SAN. The reviewer picks one. This is not a text field — an illegal
correction is unrepresentable, and picking from the legal moves is what a chess UI does anyway.
Where the position itself is wrong (the tracker missed a move entirely), delete and insert fix the
prefix and the legal set follows.

Every edit re-runs the replay server-side and returns the new per-ply verdicts, so the reviewer sees
immediately whether the fix repaired the tail. That feedback loop is the reason the server holds the
line and the client holds nothing.

### The pictures, and why nothing seeks

Phase 00 wrote a JPEG for every commit frame and a small neighbourhood around it. Serve those by
`(ply, offset)`, and draw the same grid overlay the session review draws — `_review_overlay_jpeg`
(`routers/sessions.py:141-189`) already warps from a quad and paints an 8×8 grid, and the candidate
carries exactly one quad for the whole clip. Reuse it rather than writing a second overlay renderer.

No route decodes a video. h.264 seeking by frame index is approximate and a review tool that showed
a *nearby* frame while claiming it was the one would be worse than showing nothing.

### Confirmation is an act, and it is the gate

`POST /api/realgames/{name}/confirm` sets `confirmed: true`, `confirmed_at`, and the reviewed move
list. It **refuses** when any ply is `illegal` — a line that does not replay is not a ground truth
and there is no reading of "confirm" that should let one through.

Nothing else in the codebase may write `confirmed`. Phase 02's export refuses a candidate without
it, and that refusal is tested.

**Un-confirming is allowed and must be**: a reviewer who confirmed too fast needs a way back, and
the alternative is deleting the candidate and re-running the whole replay. `POST .../confirm` with
`confirmed: false` clears it and the export refuses again.

### Writes are backed up, and no endpoint takes a path

Both patterns already exist in the neighbouring router and both are load-bearing here:

- `_safe_id` (`src/chesslab/sessions.py:30-33`, rejects empty, `/`, `\`, `..`) on the candidate
  name, joined under a fixed root, with containment re-checked after `resolve()` the way
  `_frame_path` does (`routers/sessions.py:60-70`). The web app has **no authentication anywhere**
  and `app.py:32` mounts the whole `data/` tree at `/img`, so this is not defence in depth, it is
  the only defence.
- Backup before every write to `candidate.json`, following `_backup_log`
  (`routers/sessions.py:309-322`): a timestamped copy, and if that name exists append `-1`, `-2`, …
  so **a backup is never overwritten**. A reviewer who deletes ten moves by mistake has spent an
  hour otherwise. Write via a `.tmp` and `os.replace`, as the three geometry writers do
  (`sessions.py:352-355, 620-623, 658-661`).

**No endpoint writes outside `data/`.** The committed manifest is written by a script in phase 02,
not by a web request — a fixture entering the repository should arrive as a `git diff`.

### Routes

All under `/api/realgames`. Every one resolves its name through `_safe_id` under
`config.DATA.root / "realgames"`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/realgames` | names, move counts, `confirmed`, tier counts |
| GET | `/api/realgames/{name}` | the candidate plus per-ply verdicts and the worklist order |
| GET | `/api/realgames/{name}/board/{ply}` | `image/svg+xml`, `chess.svg.board(lastmove=…)` |
| GET | `/api/realgames/{name}/frame/{ply}` | JPEG, `?offset=` within the written neighbourhood |
| GET | `/api/realgames/{name}/legal/{ply}` | the legal SANs in the position at that ply |
| POST | `/api/realgames/{name}/move` | `{op: replace\|delete\|insert, ply, uci}` → new verdicts |
| POST | `/api/realgames/{name}/accept-rest` | mark every tier-4 ply reviewed, one action |
| POST | `/api/realgames/{name}/confirm` | `{confirmed: bool}`; refuses `true` while any ply is illegal |

`{ply}` is an integer path segment and `{name}` goes through `_safe_id`; no route accepts a path.

Follow the router's local conventions: bare `Body(...)`/`Query(...)` primitives, `HTTPException`
with a message the client renders verbatim (`api.ts:5-8` unwraps `{detail}` into `Error.message`,
which is why every panel can show server text as-is).

### Frontend

`GameReview.tsx`, mounted beside the session review in `Dataset.tsx`. House conventions, none of
them optional here because `npm run knip` and `npm run lint` are gates:

- `api` / `post` from `api.ts`; TanStack Query for server state, invalidate on mutation.
- `Card`, `Button`, `Select` from `components/ui.tsx` — `Button` already shows a spinner when
  `onClick` returns a Promise (`ui.tsx:49-72`).
- Tailwind utilities inline; repeated class strings hoisted to module consts, as
  `Alignment.tsx:23` and `CornerEditor.tsx:15` do. **No CSS module** — there is one stylesheet in
  the whole frontend (`src/index.css`, 8 lines).
- Every new export must be used, or `npm run knip` goes red.

Layout: the move score on the left as an ordinary two-column game score with a badge on each
doubtful ply; the board and the frame on the right for the selected ply; the worklist as
"next doubtful move" navigation, so the reviewer never scrolls to hunt.

## Steps

1. **`feat(web): a candidate is readable, and chess says where it breaks`** — the router with the
   read routes, the `python-chess` replay and the per-ply verdicts. No writes yet.
2. **`feat(web): correcting a move cannot produce an illegal one`** — `legal/{ply}` and
   `move`, with the backup-then-`os.replace` write.
3. **`feat(web): the doubtful moves come first, the rest go in one click`** — the worklist order
   and `accept-rest`.
4. **`feat(web): a track becomes ground truth only when a human says so`** — `confirm`, and its
   refusal while any ply is illegal.
5. **`feat(web): the game score, the board and the frame`** — `GameReview.tsx` and its mount.
   Rebuild `web/static/` in this commit; the built output is committed.

## Tests

`tests/test_web_realgames.py`, using the existing web-test fixtures (`tests/test_web_corners.py` is
the closest model). No footage: build a candidate JSON in a tmp `data/` root. None of these are
marked `clips`.

- A candidate whose line replays cleanly reports every ply `legal` and an empty impossible tier.
- A candidate with one wrong move reports **exactly one** `illegal` ply — the first — and marks the
  rest *unevaluated*, not illegal.
- The worklist order is impossible → recovery → alarmed → rest, and a ply that is both illegal and
  a recovery appears once.
- `legal/{ply}` returns exactly `board.legal_moves` for the position the prefix produced.
- `move` with a `uci` that is not legal at that ply is rejected with 400 and **the file is
  unchanged** (assert the bytes).
- Every write leaves a backup, and a second write in the same second does not overwrite the first
  (the `-1` suffix path, `sessions.py:318-322`).
- `confirm` with `true` is **refused** while any ply is illegal; the file still reads
  `confirmed: false`.
- `confirm` with `false` on a confirmed candidate clears it.
- A name containing `..`, `/` or `\` is rejected with 400 on every route, and no file outside the
  candidate root is read or written.
- `accept-rest` does not change any move, only review state.

## Acceptance

- A reviewer opens a candidate produced by phase 00, is taken to the doubtful moves in order,
  corrects one by picking from the legal moves, accepts the rest in one action, and confirms.
- `confirmed: true` appears in `candidate.json` and nowhere else in the codebase writes it.
- `uv run pytest -q` green; `uv run ruff check src tests synth scripts` and `uv run vulture` clean.
- `cd src/chesslab/web/frontend && npm run build && npm run lint && npm run knip` — build committed
  under `web/static/`, no new lint errors, knip silent.

## Do NOT

- **Do not add a chess library or a board component to the frontend.** The board is a server-rendered
  `chess.svg`, exactly as the session board already is (`sessions.py:929-943`).
- **Do not add a top-level tab.** This mounts inside the dataset session-review surface.
- **Do not accept a filesystem path from the client on any route**, and do not write outside
  `data/`. There is no authentication anywhere in this app (`config.py:632` binding to localhost is
  the only protection) and `app.py:32` already serves the whole `data/` tree.
- **Do not default `confirmed` to true, and do not let any other code path set it.** The trap this
  pack exists for is a fixture that freezes the tracker's mistakes; the confirm gate is the whole
  defence.
- **Do not write the committed manifest from a web request.** Phase 02's script does that, so a new
  fixture arrives as a reviewable diff.
- **Do not extend the edit vocabulary beyond replace / delete / insert.** Variations, comments,
  clock times and annotations are a PGN editor, and this is not one.
- Do not re-encode, seek in, or decode the video in a request handler.

## Not fixed here, and noticed in passing

`/api/sessions/{sid}/slice` (`routers/sessions.py:1037-1052`) passes `sid` straight to
`labeling.run_slice`, and `/api/reslice` (`:1055-1062`) takes `session` as a **query parameter** and
reaches `config.DATA.sessions / session` (`labeling.py:441`) with no `_safe_id` at all — the only
two session routes that skip the validation every other route applies. Pre-existing, unrelated to
this pack, and not this pack's call. Recorded so it is not lost.
