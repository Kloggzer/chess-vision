# 42 — Status

| Phase | State | Note |
|---|---|---|
| — | `todo` | entry written 2026-08-03; agent dispatched the same day |

## Measured before the pack was written

| Fact | Value |
|---|---|
| Production callers of `classify` / `cpLoss` | **0** — both are called only by `AccuracyTest` |
| Production callers of `winChanceWhite` | 1 (`StockfishAnalyzer`) |
| `StockfishAnalyzer` live budget | `movetimeMs` default 400, `multiPv`, `THREAD_PRIORITY_LOWEST`, 2 threads |
| `ui/games/` | 671 lines over 5 files |
| `spectate/` | 685 lines over 7 files |
| Why no gate caught the dead functions | detekt's `UnusedPrivateMember` / `UnusedParameter` see **private** scope only; vulture is Python-side and configured at confidence 80, which does not report an unused function (scored 60) |
