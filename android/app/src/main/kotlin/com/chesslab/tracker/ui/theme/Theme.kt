package com.chesslab.tracker.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SwitchColors
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.Color

// No dynamic colour: a phone that repaints itself from the wallpaper cannot be read at a glance.

/** Every Material role is filled: left at baseline, sliders turn lavender and chips purple. Material's
 *  `primary` is the app's [ChesslabPalette.accent] — one accent for every call to action. */
internal fun ChesslabPalette.scheme(dark: Boolean): ColorScheme {
    val base = if (dark) darkColorScheme() else lightColorScheme()
    return base.copy(
        primary = accent,
        onPrimary = onAccent,
        primaryContainer = selection,
        onPrimaryContainer = onSurface,
        secondary = busy,
        onSecondary = onAccent,
        secondaryContainer = selection,
        onSecondaryContainer = onSurface,
        tertiary = accent,
        onTertiary = onAccent,
        tertiaryContainer = selection,
        onTertiaryContainer = onSurface,
        background = background,
        onBackground = onSurface,
        surface = surface,
        onSurface = onSurface,
        surfaceVariant = surfaceRaised,
        onSurfaceVariant = onSurfaceMuted,
        surfaceContainerLowest = background,
        surfaceContainerLow = surface,
        surfaceContainer = surfaceRaised,
        surfaceContainerHigh = surfaceRaised,
        surfaceContainerHighest = surfaceRaised,
        // The tint would silently re-introduce elevation by fill as an accent wash on dialogs and menus.
        surfaceTint = Color.Transparent,
        inverseSurface = onSurface,
        inverseOnSurface = background,
        error = danger,
        onError = onDanger,
        errorContainer = danger,
        onErrorContainer = onDanger,
        outline = outline,
        outlineVariant = outline,
        scrim = pieceBlack,
    )
}

@Composable
fun ChesslabTheme(
    dark: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val palette = if (dark) InkPalette else PaperPalette
    CompositionLocalProvider(LocalChesslabPalette provides palette) {
        MaterialTheme(
            colorScheme = palette.scheme(dark),
            typography = ChesslabTypography,
            content = content,
        )
    }
}

/** Material would draw a switch in `primary` — the accent — and a switch is a setting, not an action. */
@Composable
fun chesslabSwitchColors(): SwitchColors {
    val palette = LocalChesslabPalette.current
    return SwitchDefaults.colors(
        checkedTrackColor = palette.primary,
        checkedThumbColor = palette.onPrimary,
        checkedBorderColor = palette.primary,
        uncheckedTrackColor = palette.surface,
        uncheckedThumbColor = palette.onSurfaceMuted,
        uncheckedBorderColor = palette.outline,
    )
}
