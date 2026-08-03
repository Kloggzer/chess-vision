# 50 — Status

| Phase | State | Note |
|---|---|---|
| — | `todo` | entry written 2026-08-04 from the user's review of the shipped screen |

## Measured before the pack was written

| Fact | Value |
|---|---|
| `GameReviewScreen.kt` at `a5cdfd1` (approved by the user) vs now | 1110 → 969 lines |
| Composables lost that were NOT deliberately removed | `MateLineExplorer`, `MateMoveCaption`, `MateResolutionStatus`, `mateLineRequest`, `ReviewScrollEffects`, `percent` |
| Deliberately removed and staying so | `LiveReviewRoute` (specs/47), `ReviewContextChip` (specs/44) |
| Strings gone from the tree | `Mate available`, `Explore mate line`, `The engine found a forced mate from this position` |
| Still present and now unreachable | `analysis/MateLineResolver.kt`, and `ReviewStore`'s per-position `.mate.json` cache |
