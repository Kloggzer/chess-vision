package com.chesslab.tracker.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider

// Two schemes, one material. There is no dynamic colour: a tournament-hall phone that repaints
// itself from the wallpaper is a screen you cannot read at a glance, and the whole point of the
// paper-and-ink palette is that it is the same object by day and by lamplight.

/**
 * Every Material role is filled, not just the obvious six.
 *
 * The container and `surfaceContainer*` roles are what Material's own components reach for — the
 * slider's inactive track, a selected `FilterChip`, a card's tonal elevation. Leaving them at the
 * baseline is how a warm palette ends up with lavender sliders and purple chips.
 */
private fun ChesslabPalette.scheme(dark: Boolean): ColorScheme {
    val base = if (dark) darkColorScheme() else lightColorScheme()
    return base.copy(
        primary = primary,
        onPrimary = onPrimary,
        primaryContainer = selection,
        onPrimaryContainer = onSurface,
        // `secondary` carries the caution role so the restart bar and Material's own accents land
        // on the app's semantics; `tertiary` carries "the tracker is following".
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
        surfaceTint = primary,
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
