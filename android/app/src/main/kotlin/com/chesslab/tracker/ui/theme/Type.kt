package com.chesslab.tracker.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Nothing below 14sp exists in this app: the phone lies on the table, not in the hand.
// The state line is display-sized on purpose — it is the one thing that must be readable
// from a metre away without leaning in.
//
// **Monospace is for figures that align, and for nothing else** (specs/48). It was carrying the
// structure: `RECENT GAMES`, `YOUR LIBRARY`, the tab labels and the in-progress banner were all set
// in it, which is how a chess app comes to look like a log viewer. Every one of those is a LABEL and
// they are in the body face now, semibold and tracked — the same signal without the terminal.
// The one monospace style left is [Figures], and it is named after what it is for.

/**
 * Evaluations, move numbers, counts, fps — anything whose digits must line up between rows or
 * between frames.
 *
 * Deliberately NOT a `Typography` slot: a slot is something a call site reaches for because it is
 * the right size, and this is something a call site reaches for because the content is a figure.
 */
val Figures =
    TextStyle(
        fontFamily = FontFamily.Monospace,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 18.sp,
    )

val ChesslabTypography =
    Typography(
        displayMedium =
            TextStyle(
                fontFamily = FontFamily.Default,
                fontWeight = FontWeight.Black,
                fontSize = 34.sp,
                lineHeight = 38.sp,
            ),
        titleLarge =
            TextStyle(
                fontFamily = FontFamily.Default,
                fontWeight = FontWeight.Bold,
                fontSize = 22.sp,
                lineHeight = 26.sp,
            ),
        bodyLarge =
            TextStyle(
                fontFamily = FontFamily.Default,
                fontWeight = FontWeight.Normal,
                fontSize = 17.sp,
                lineHeight = 22.sp,
            ),
        bodyMedium =
            TextStyle(
                fontFamily = FontFamily.Default,
                fontWeight = FontWeight.Normal,
                fontSize = 15.sp,
                lineHeight = 20.sp,
            ),
        labelLarge =
            TextStyle(
                fontFamily = FontFamily.Default,
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp,
                lineHeight = 20.sp,
            ),
        // The LABEL role: section headings, tab labels, chips, the banner. Tracked rather than
        // monospaced — the tracking is what makes a short uppercase run read as a heading.
        labelMedium =
            TextStyle(
                fontFamily = FontFamily.Default,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
                lineHeight = 18.sp,
                letterSpacing = 1.sp,
            ),
        // Material's own labelSmall/bodySmall are 11sp and 12sp. Both are used across the settings,
        // debug and analysis screens, and both break the "nothing below 14sp" rule by default.
        labelSmall =
            TextStyle(
                fontFamily = FontFamily.Default,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
                lineHeight = 18.sp,
            ),
        bodySmall =
            TextStyle(
                fontFamily = FontFamily.Default,
                fontWeight = FontWeight.Normal,
                fontSize = 14.sp,
                lineHeight = 18.sp,
            ),
    )
