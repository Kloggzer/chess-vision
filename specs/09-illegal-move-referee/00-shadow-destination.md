# Phase 00 — No candidate whose destination is shadow-vetoed

## Why

Live bug: with g1 empty and a hand/shadow over the h1 corner, the tracker
committed a phantom `h1→g1`. Root cause: the shadow veto removes squares from
the `changed` gate set but **preserves their z-values** for scoring — correct
for *from*-squares (a vacated square looks like darkening; zeroing z would lose
the real move's evidence, see the docstring at `tracker.py:2241-2250`) but
wrong for *to*-squares. A square is shadow-vetoed precisely when HSV says
"darkened like a cast shadow" AND census says "structure did NOT change"
(`shadow_veto = {s for s in changed if s in shadows and cens[s] < self.census_thr}`,
`tracker.py:2265`). A real arrival always changes structure, so a shadow-vetoed
destination is proof that **no piece arrived there** — yet viability
(`tracker.py:2093-2098`) only checks `z >= z_thr/2` on touched squares, which a
shadow passes.

## Design (decided — do not redesign)

One rule, applied at every place a candidate is formed:

> A candidate move (or move pair) is invalid if any of its **destination
> squares** is in the current frame's `shadow_veto` set. Destination squares =
> `to_square` of each move, plus the rook's to-square for castling
> (f1/d1/f8/d8), plus the promotion square (same as to-square). The en-passant
> *captured pawn* square is a vacated square, NOT a destination — do not
> include it. From-squares stay untouched: shadowed from-evidence remains valid.

Implement as a small pure helper in `tracker.py` (module level, near
`move_touched_squares` — find via `grep -n "def move_touched_squares" src/chesslab/move_tracker/tracker.py`):

```python
def move_destination_squares(board: chess.Board, move: chess.Move) -> set[str]:
    """Squares that GAIN a piece by this move: to-square, plus the rook's
    to-square for castling. (En-passant captured square is vacated, not gained.)"""
```

Use `board.is_kingside_castling(move)` / `is_queenside_castling(move)` to add
the rook destination.

Apply it in three places (all inside `Tracker`, all already under `self.lock`):

1. **Single-move viability** (`_try_detect` step 5, `tracker.py:2093-2098`):
   `_apply_vetoes` already returns `shadow_veto` at `tracker.py:2070`. Extend
   the `viable` filter: a move is viable only if (existing z-condition) AND
   `not (move_destination_squares(self.board, mv) & shadow_veto)`.
2. **Pair candidates** (`_pair_candidate`, `tracker.py:2371`): thread
   `shadow_veto` in as a parameter (both call sites are in
   `_generate_hypothesis`, `tracker.py:2292,2312,2321`; `_generate_hypothesis`
   itself gains the parameter from `_try_detect`). Filter `pairs` the same way,
   evaluating move 2's destinations on the board *after* move 1
   (`b = board.copy(stack=False); b.push(mv1)`).
3. **Endpoint candidate** (`_single_endpoint_candidate`, `tracker.py:2415`):
   exclude candidates whose `to_square` is shadow-vetoed (pass `shadow_veto`
   through from `_generate_hypothesis`, call site `tracker.py:2325`).

When the filter removes the would-be best move and nothing else is viable, the
existing fall-through handles it (re-anchor / stuck / anomaly patcher) — add no
new state. For debuggability set
`self.note = f"{san}? destination {sq} shadow-vetoed — not a move"` ONLY in
case 1 when the filter changed the outcome (best unfiltered move existed but
was rejected), so live tuning shows why nothing committed.

Also surface it in the debug card: add `"shadow_blocked": <list[str] of UCIs
rejected this frame by this rule>` to `status()["debug"]`
(`tracker.py:2605`, additive key).

## Steps

### 1. Helper + viability filter — commit `fix(tracker): shadow-vetoed squares cannot be move destinations`

- Add `move_destination_squares` (module level, with docstring above).
- `_apply_vetoes` unchanged. `_try_detect`: keep `shadow_veto` from the
  existing call, extend the `viable` list-comprehension, add the note +
  `_shadow_blocked` bookkeeping (reset to `[]` each `_compute_evidence` frame).
- Thread `shadow_veto` into `_generate_hypothesis`, `_pair_candidate`,
  `_single_endpoint_candidate` and apply the filter there.
- `status()["debug"]["shadow_blocked"]` additive.

### 2. Tests — commit `test(tracker): regression for phantom move onto shadowed destination`

See Tests below. Same commit may touch only `tests/`.

## Tests (write, run once, targeted)

Follow the synthetic-frame patterns already in `tests/test_move_tracker.py`
(grep `shadow` there for the existing HSV-veto tests and reuse their fixture
style).

1. `test_shadow_destination_blocks_phantom_move` — position with wR on h1,
   g1 empty; craft a frame where h1 and g1 both get z ≥ z_thr via
   brightness-only change (shadow-like: darken both squares in BGR so
   `hsv_shadow_squares` flags them and census stays below `census_thr`).
   Assert: no move committed, board FEN unchanged, `"shadow_blocked"` in the
   debug status contains `"h1g1"` (or the note names the veto).
2. `test_shadow_on_from_square_still_allows_move` — guard the asymmetry: a real
   move whose *from*-square is shadow-flagged (vacated square darkens) must
   still commit. Reuse/extend an existing passing move-commit test by adding
   the from-square to the shadow condition.
3. `test_destination_squares_castling` — pure unit test:
   `move_destination_squares` returns `{"g1","f1"}` for O-O white, `{"c8","d8"}`
   for O-O-O black, `{to}` only for en passant (captured square excluded).

Run once: `.venv/Scripts/python.exe -m pytest tests/test_move_tracker.py -q`

## Acceptance criteria

- [ ] All three new tests pass; no previously passing test in
      `tests/test_move_tracker.py` regresses.
- [ ] `grep -n "move_destination_squares" src/chesslab/move_tracker/tracker.py`
      hits the definition + ≥3 call sites (viability, pair, endpoint).
- [ ] `grep -n "shadow_blocked" src/chesslab/move_tracker/tracker.py` hits
      `status()`; key is additive (no existing status key renamed/removed).
- [ ] Scoped ruff clean (see entry.md).

## Do NOT / Out of scope

- Do NOT zero z on shadow-vetoed squares or change `_apply_vetoes` semantics —
  from-evidence preservation is intentional and tested.
- Do NOT touch the CNN verify path, `_cnn_tick`, or `cnn_recovery.py` (phase 01).
- Do NOT change any threshold defaults (`census_thr`, `z_thr`, …).
- No UI changes in this phase.
