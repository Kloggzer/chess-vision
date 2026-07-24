package com.chesslab.tracker.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color

// Brand palette (single source; screens read via MaterialTheme.colorScheme / BoardPalette).
val Ink = Color(0xFF0C0F14)
val Surface1 = Color(0xFF151A21)
val Elevated = Color(0xFF1D242E)
val Hairline = Color(0xFF2A323D)
val TextHi = Color(0xFFE7EBF0)
val TextMuted = Color(0xFF8B97A6)
val Emerald = Color(0xFF35D399) // primary / live
val InfoCyan = Color(0xFF45B6F5)
val Amber = Color(0xFFF5A524)
val Danger = Color(0xFFF26D6D)

/** Dark-tournament scheme — the committed brand identity. */
val ChesslabDarkColors =
    darkColorScheme(
        primary = Emerald,
        onPrimary = Color(0xFF05130D),
        background = Ink,
        onBackground = TextHi,
        surface = Surface1,
        onSurface = TextHi,
        surfaceVariant = Elevated,
        onSurfaceVariant = TextMuted,
        outline = Hairline,
        outlineVariant = Color(0xFF212832),
        error = Danger,
        onError = Color(0xFF1A0A0A),
        secondary = InfoCyan,
        tertiary = Amber,
        // errorContainer used by RecoveryCard/AlarmBanner today — keep legible on dark.
        errorContainer = Color(0xFF2A1414),
        onErrorContainer = Color(0xFFFFD9D9),
    )

/**
 * Matching light scheme — same hues, legible on paper. The identity stays dark, but the
 * app must not look broken if the user forces light. Accent stays Emerald.
 */
val ChesslabLightColors =
    lightColorScheme(
        primary = Emerald,
        onPrimary = Color(0xFF05130D),
        background = Color(0xFFF7F8FA),
        onBackground = Color(0xFF161B21),
        surface = Color(0xFFFFFFFF),
        onSurface = Color(0xFF161B21),
        surfaceVariant = Color(0xFFE7EAEF),
        onSurfaceVariant = Color(0xFF5A6675),
        outline = Color(0xFFC4CCD6),
        outlineVariant = Color(0xFFD9DFE7),
        error = Danger,
        onError = Color(0xFF1A0A0A),
        secondary = InfoCyan,
        tertiary = Amber,
        errorContainer = Color(0xFFFFDAD6),
        onErrorContainer = Color(0xFF410002),
    )
