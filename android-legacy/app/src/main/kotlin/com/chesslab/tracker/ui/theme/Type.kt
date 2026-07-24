package com.chesslab.tracker.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

/**
 * Mono-forward typography: system sans for chrome (tight tracking on headings), and
 * `FontFamily.Monospace` (system Roboto Mono) for the notation/data roles so the move
 * strip, clock, eval and debug rows are mono by theme, not per-call. No web fonts.
 */
val ChesslabType =
    Typography().run {
        copy(
            headlineSmall =
                headlineSmall.copy(
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = (-0.02).em,
                ),
            titleLarge =
                titleLarge.copy(
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = (-0.02).em,
                ),
            // Mono for chess notation / data-forward roles (move strip, clock, eval).
            bodyLarge = bodyLarge.copy(fontFamily = FontFamily.Monospace),
            bodyMedium = bodyMedium.copy(fontFamily = FontFamily.Monospace),
            // Mono for debug labels / small data readouts.
            titleSmall =
                TextStyle(
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Medium,
                    fontSize = 14.sp,
                ),
            labelSmall =
                labelSmall.copy(
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Medium,
                ),
        )
    }
