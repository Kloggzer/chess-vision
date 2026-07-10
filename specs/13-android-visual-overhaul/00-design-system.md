# Phase 00 — Design system & theme

## Why

`ui/theme/Theme.kt` today builds its `ColorScheme` from `dynamicColor = true` +
default `light/darkColorScheme()` (`Theme.kt:13-33`). There is no brand palette, no
typography, no shapes — the app inherits whatever Material You wallpaper color the
phone has. That is the single largest reason the app looks generic. This phase lays
the token foundation every other phase styles against; it changes no screens.

## Design (decided — do not redesign)

Package `com.chesslab.tracker.ui.theme`. Four files.

### `theme/Color.kt` (new)

Define the dark-tournament palette as `val`s and assemble the schemes. Use the tokens
from `entry.md`. Dynamic color is **off by default**.

```kotlin
// Brand palette (single source; screens read via MaterialTheme.colorScheme / BoardPalette)
val Ink        = Color(0xFF0C0F14)
val Surface1   = Color(0xFF151A21)
val Elevated   = Color(0xFF1D242E)
val Hairline   = Color(0xFF2A323D)
val TextHi     = Color(0xFFE7EBF0)
val TextMuted  = Color(0xFF8B97A6)
val Emerald    = Color(0xFF35D399)   // primary / live
val InfoCyan   = Color(0xFF45B6F5)
val Amber      = Color(0xFFF5A524)
val Danger     = Color(0xFFF26D6D)

val ChesslabDarkColors = darkColorScheme(
    primary = Emerald, onPrimary = Color(0xFF05130D),
    background = Ink, onBackground = TextHi,
    surface = Surface1, onSurface = TextHi,
    surfaceVariant = Elevated, onSurfaceVariant = TextMuted,
    outline = Hairline, outlineVariant = Color(0xFF212832),
    error = Danger, onError = Color(0xFF1A0A0A),
    secondary = InfoCyan, tertiary = Amber,
    // errorContainer used by RecoveryCard/AlarmBanner today — keep legible on dark
    errorContainer = Color(0xFF2A1414), onErrorContainer = Color(0xFFFFD9D9),
)

// Matching light scheme (same hues, legible on paper) — identity stays dark but the
// app must not look broken if the user forces light. Keep the accent = Emerald.
val ChesslabLightColors = lightColorScheme(primary = Emerald, /* … tuned neutrals … */)
```

### `theme/BoardPalette.kt` (new) — centralize what is hardcoded today

The board square colors live in `ChessBoard.kt:22-23` (`LIGHT 0xFFEBECD0`,
`DARK 0xFF779556`) and the debug-overlay colors in `OverlayBoard.kt:31-33`
(`MAGENTA/CYAN/ORANGE`) and again as literals in `CalibrationScreen.kt` (magenta taps,
green markers). Move them into one object so board tone is a single decision:

```kotlin
object BoardPalette {
    val LightSquare = Color(0xFFE9D6AC)   // warm wood (was 0xFFEBECD0)
    val DarkSquare  = Color(0xFF96703F)   // warm wood (was 0xFF779556)
    val WhitePiece  = Color(0xFFF7F1E4)
    val BlackPiece  = Color(0xFF191817)
    val LastMove    = Color(0x3835D399)   // emerald wash
    val MarkChanged = Color(0xFFFF3DE1)   // magenta
    val MarkShadow  = Color(0xFF22D3EE)   // cyan
    val MarkOcclusion = Color(0xFFF5A524) // amber
    val Grid        = Color(0x9922D3EE)
    val TapCorner   = Color(0xFFFF3DE1)
    val ArucoDot    = Emerald
}
```

Phases 02/03 replace the literals in `ChessBoard.kt`/`OverlayBoard.kt`/
`CalibrationScreen.kt` with `BoardPalette.*` references — this phase only DEFINES it
(mark KDoc `Consumed by phases 02/03` so detekt's unused-code rule stays quiet).

### `theme/Type.kt` (new)

A `Typography` that keeps sans for chrome and assigns `FontFamily.Monospace` to the
notation/data roles so the move strip, clock, eval, and debug rows are mono by theme,
not per-call. Tighten heading tracking (`letterSpacing = (-0.02).em` on
`headlineSmall`/`titleLarge`), set `titleSmall`/`labelSmall` to mono for debug labels.
No web fonts (bundling a font file is out of scope; system Roboto + Roboto Mono).

### `theme/Shape.kt` (new)

`Shapes(small = RoundedCornerShape(8.dp), medium = 12.dp, large = 18.dp)` — matches
the mockup's board frame (12 dp) and cards/sheets (18 dp).

### `theme/Theme.kt` (rewrite)

```kotlin
@Composable
fun ChesslabTrackerTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,           // ← default OFF (was true)
    content: @Composable () -> Unit,
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
            if (darkTheme) dynamicDarkColorScheme(LocalContext.current)
            else dynamicLightColorScheme(LocalContext.current)
        darkTheme -> ChesslabDarkColors
        else -> ChesslabLightColors
    }
    MaterialTheme(colorScheme = colorScheme, typography = ChesslabType, shapes = ChesslabShapes, content = content)
}
```

## Steps

1. `theme/Color.kt` — palette vals + dark/light schemes — commit `feat(android-theme): dark-tournament color scheme`
2. `theme/BoardPalette.kt` — centralized board/overlay palette (consumed by 02/03) — commit `feat(android-theme): centralize board and overlay palette`
3. `theme/Type.kt` + `theme/Shape.kt` — mono-forward typography + shapes — commit `feat(android-theme): typography and shapes`
4. `theme/Theme.kt` — wire schemes/type/shapes, default dynamicColor off — commit `feat(android-theme): apply custom theme, gate off dynamic color`

## Tests (write, run once, targeted)

No unit tests (pure declarations). Verify with `:app:assembleDebug` (allowed here).

## Acceptance criteria

- [ ] `grep -n "dynamicColor: Boolean = false" android/app/src/main/kotlin/com/chesslab/tracker/ui/theme/Theme.kt` hits.
- [ ] `grep -rn "0xFFEBECD0\|0xFF779556" android/app/src/main/kotlin/com/chesslab/tracker/ui` → **no hits** outside `BoardPalette.kt` (literals moved). (ChessBoard.kt still references them until phase 02 swaps to `BoardPalette` — acceptable this phase; note in STATUS if still present.)
- [ ] `MaterialTheme(...)` passes non-default `typography` and `shapes`.
- [ ] `:app:assembleDebug` green; `:app:ktlintCheck :app:detekt` zero new findings.

## Do NOT

- Do not edit any screen or component file — only `theme/`.
- Do not delete the `dynamicColor` parameter (keep it as an opt-in for a later
  "Material You" setting), just default it false.
- Do not add a font asset / webfont.
