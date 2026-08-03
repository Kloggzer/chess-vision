# 44 — Status

| Phase | State | Note |
|---|---|---|
| — | `todo` | entry written 2026-08-03 from the user's verdict on the specs/42 screen |

## Measured before the pack was written

| Fact | Value | Where |
|---|---|---|
| Engine cost at the shipped budget (depth 30, cap 3000 ms) | **25 of 84 positions in 55 s**, ~2.2 s/position | device, 2026-08-03 |
| Engine cost at the earlier budget (depth 16) | 84 positions in ~45 s, ~0.33 s/position | device, same day |
| Plies changing class between `movetime 400` and depth 16 | **14 of 83** | specs/42 benchmark |
| Plies scored against a forced mate, this game | **15 White / 15 Black** of 83 | the card itself |
| Where a computed review lives | `ReviewViewModel`'s `MutableStateFlow` only — *"this survives nothing"* | its own KDoc |
| ACPL after the mate clamp | White 84 cp, Black 127 cp (was 526 / 613) | device |
| Multi-PV | already computed by `StockfishAnalyzer`, never shown | — |
