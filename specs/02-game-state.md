# Stage 2 — Game State (`state.py`)

## Purpose

Know the exact board state (FEN) at every capture moment — that is the source of the
labels. Two operating modes that use the same state engine.

## Dependency

`python-chess`. `chess.Board` holds the position; `board.fen()` returns the FEN;
`board.piece_at(square)` returns the piece on a square (basis for auto-labeling in
Stage 3).

## Public API (consumed by Stage 3)

```python
class GameState:
    board: chess.Board

    def fen(self) -> str: ...
    def piece_map(self) -> dict[str, str]:
        """{'e1': 'K', 'e8': 'k', 'a2': 'P', ...} – occupied squares only, FEN letters."""
    def label_for(self, square: str) -> str:
        """Label class for a square: 'empty' or e.g. 'wK','bP' (mapping see below)."""
    def push_san(self, san: str) -> None: ...    # raises on illegal move
    def push_uci(self, uci: str) -> None: ...
    def legal_moves_san(self) -> list[str]: ...
    def is_game_over(self) -> bool: ...
    def ply(self) -> int: ...                    # half-move index starting at 0
```

### Label Mapping (central, exactly this form)
- `piece_at` returns FEN letters: White `PNBRQK`, Black `pnbrqk`.
- Class label: uppercase letter -> prefix `w`, lowercase letter -> prefix `b`, then
  uppercase letter of the type. Examples: `P -> wP`, `n -> bN`. Empty square -> `empty`.
- This mapping must exactly match the canonical class list from `config.py`.

## Mode A — PGN Replay (`collect pgn`, primary data collection mode)

Goal: physically replay a real game from a PGN; take a photo after each half-move.
Since the move sequence is known, **every** position is immediately fully labeled.

Procedure (control in Stage 3, state here):
1. Load PGN (`chess.pgn.read_game`), extract main line as move list.
2. Start from the initial position. Per step:
   - display current target FEN + next expected move (SAN),
   - user makes the move physically and triggers capture,
   - `push`(next move) -> new FEN.
3. Optionally skip intermediate positions (`--every N` half-moves), in case you do not want
   to photograph every half-move.

## Mode B — Free Play with Move Entry (`collect live`)

Goal: play freely and keep the state engine in sync manually. **One action per move**
(type the move) instead of 64 clicks.
1. Start from the initial position **or** from a given FEN (`--start-fen`), to specifically
   capture rare/piece-rich positions.
2. Per move: user types SAN or UCI; engine validates (illegal input -> hint,
   retry). Then capture.
3. Commands: `undo` (undo last half-move), `fen <FEN>` (set position), `done`.

> Tip for data quality (mention in the CLI help): specifically build positions with many
> different piece types and underpromotions (multiple queens), not just
> openings — otherwise rare classes are underrepresented (cf. Stage 4).

## Orientation

Which image corner corresponds to which square is defined **in the calibration profile** (`white_pov`),
not here. `GameState` is purely logical and knows nothing about a camera. Stage 3 connects the two.

## Acceptance Criteria (Definition of Done)

- `GameState` can be instantiated headlessly (without a camera) and driven through a PGN;
  `label_for` returns the correct 32 pieces + 32 `empty` for the starting position.
- `push_san`/`push_uci` raise a clear exception on illegal moves.
- Playing through a known test PGN results in the expected final FEN (unit test).
- `piece_map()` and `label_for()` are consistent across all 64 squares (test: union
  of occupied squares + `empty` squares = 64).
