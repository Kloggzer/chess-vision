package com.chesslab.tracker.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * Centralized board and debug-overlay palette — the single decision for board tone.
 *
 * These values are hardcoded today in `ChessBoard.kt` (square colors), `OverlayBoard.kt`
 * (debug marks/grid) and `CalibrationScreen.kt` (tap/marker literals). This object only
 * DEFINES them; phases 02/03 swap those literals to `BoardPalette.*` references.
 *
 * Consumed by phases 02/03.
 */
object BoardPalette {
    val LightSquare = Color(0xFFE9D6AC) // warm wood (was 0xFFEBECD0)
    val DarkSquare = Color(0xFF96703F) // warm wood (was 0xFF779556)
    val WhitePiece = Color(0xFFF7F1E4)
    val BlackPiece = Color(0xFF191817)
    val LastMove = Color(0x3835D399) // emerald wash
    val MarkChanged = Color(0xFFFF3DE1) // magenta
    val MarkShadow = Color(0xFF22D3EE) // cyan
    val MarkOcclusion = Color(0xFFF5A524) // amber
    val Grid = Color(0x9922D3EE)
    val TapCorner = Color(0xFFFF3DE1)
    val ArucoDot = Emerald
}
