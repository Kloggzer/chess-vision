package com.chesslab.tracker.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

// Dark only. There is no light scheme and no dynamic colour: a tournament-hall phone that
// repaints itself from the wallpaper is a screen you cannot read at a glance.
private val ChesslabColors =
    darkColorScheme(
        primary = Accent,
        onPrimary = OnAccent,
        secondary = Busy,
        onSecondary = OnAccent,
        error = Danger,
        onError = OnDanger,
        background = Background,
        onBackground = OnSurface,
        surface = Surface,
        onSurface = OnSurface,
        surfaceVariant = SurfaceRaised,
        onSurfaceVariant = OnSurfaceMuted,
        outline = Outline,
    )

@Composable
fun ChesslabTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = ChesslabColors,
        typography = ChesslabTypography,
        content = content,
    )
}
