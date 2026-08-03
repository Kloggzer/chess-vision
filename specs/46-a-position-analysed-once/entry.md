# 46 — A position analysed once

Analysis results are stored per GAME. They should be stored per POSITION, so the opening of every
game is computed once in the life of the app rather than once per game.

The user, 2026-08-03: *"außerdem werden bereits berechnete Positionen offenbar nicht persistent
gecacht. Da viele Partien dieselben Anfangsstellungen enthalten, könnten die Analyseergebnisse
anhand eines Positions-Hashes dauerhaft gespeichert und bei identischen Stellungen wiederverwendet
werden."*

They are right, and the waste is structural. Every game this device will ever record starts from
the same position and shares its first several plies with every other game the same opening was
played in. The `2026-08-02_2159` game runs `1.e4 e5 2.Nf3 Nc6 3.d4` — positions that will recur in
every King's Pawn game the user plays.

## What exists

specs/44 made a computed review survive: it is written beside `<id>.json` / `<id>.pgn` and
reopening a reviewed game is a file read rather than a recomputation. That is a per-game cache, and
it is the right thing as far as it goes — the second opening of the SAME game is free, the first
opening of a DIFFERENT game repeats work it has already done.

Measured cost of that repeat: at the shipped budget the first grade lands at 2.4 s and the full pass
takes ~149 s. A shared opening of 12 plies is roughly 20 s of engine time, on a phone, per game.

## The key, and it is not the FEN

A cache key that is wrong is worse than no cache, so state it precisely and test it:

- The **move counters do not belong in the key.** Halfmove clock and fullmove number do not change
  which move is best or what the position is worth, and including them defeats the cache on every
  transposition — the same position reached in a different move order would miss.
- **Castling rights and the en-passant square DO belong.** They change the legal moves. An
  en-passant square that no capture can use is the classic trap; decide explicitly whether to
  normalise it and pin the decision in a test.
- **The engine budget belongs in the key, not beside it.** 14 of 83 plies changed class between two
  budgets on this game (specs/42), so a grade computed at one budget is not a grade at another.
  Reusing across budgets would silently mix two rulers, which is the same class of error as
  `quad_spread` in specs/41.
- **The same key is wanted elsewhere, so write it once.** `specs/47` needs a position key to name
  openings from `lichess-org/chess-openings`, whose `epd` column is defined as *"EPD (FEN without
  move numbers) of the opening position, en passant field only if legal"* — the same normalisation
  this pack arrived at independently, en-passant caveat included. Build one function, share it.
- Store the raw evaluation, not the verdict. The verdict depends on the OTHER position's score
  (the drop from before to after), and the bands have already been corrected once — a cache of
  conclusions would have frozen the 2x-too-forgiving thresholds specs/44 found.

## Bounds

It is a phone. An unbounded store that grows with every position ever analysed is a defect, not a
feature. Decide a size policy and say what falls out first — and measure what a realistic library of
games actually costs before choosing a number.

## Acceptance

- Two different games sharing an opening: the second analyses fewer positions than the first, and
  the number is reported.
- A position reached by transposition hits the cache.
- The same game at a different engine budget does NOT hit it.
- A cold start after the app is killed still hits it — the point is persistence.
- The store is bounded, and the bound is argued from a measurement.
