package com.chesslab.tracker.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SelectableChipColors
import androidx.compose.material3.SwitchColors
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.Color

// Two schemes, one material. There is no dynamic colour: a tournament-hall phone that repaints
// itself from the wallpaper is a screen you cannot read at a glance, and the whole point of the
// paper-and-ink palette is that it is the same object by day and by lamplight.

/**
 * Every Material role is filled, not just the obvious six.
 *
 * The container and `surfaceContainer*` roles are what Material's own components reach for — the
 * slider's inactive track, a selected `FilterChip`, a card's tonal elevation. Leaving them at the
 * baseline is how a warm palette ends up with lavender sliders and purple chips.
 *
 * **Material's `primary` is the app's [ChesslabPalette.accent], not its `primary`** (specs/48).
 * Every button, link, slider and progress bar the framework colours for itself is a call to action,
 * and there is one accent for those. The palette's own `primary` is furniture and is named
 * explicitly by the two components that are furniture — see [ChesslabSwitchColors] and
 * [ChesslabChipColors].
 */
internal fun ChesslabPalette.scheme(dark: Boolean): ColorScheme {
    val base = if (dark) darkColorScheme() else lightColorScheme()
    return base.copy(
        primary = accent,
        onPrimary = onAccent,
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
        // Elevation by fill is retired, and the tint is how Material re-introduces it: a dialog or a
        // menu would silently pick up an accent wash on top of the surface it was given.
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

/**
 * The switch track, in the furniture colour.
 *
 * A switch is a setting, not an action, and Material would draw it in `primary` — which is the
 * accent now. Two of these on a screen beside one filled button would give the screen three things
 * shouting the same hue.
 */
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

/** A chosen chip, in the furniture colour, so it never competes with the screen's filled button. */
@Composable
fun chesslabChipColors(): SelectableChipColors {
    val palette = LocalChesslabPalette.current
    return FilterChipDefaults.filterChipColors(
        containerColor = Color.Transparent,
        labelColor = palette.onSurfaceMuted,
        selectedContainerColor = palette.selection,
        selectedLabelColor = palette.onSurface,
    )
}
