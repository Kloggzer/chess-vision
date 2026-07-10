package com.chesslab.tracker.ui

import android.graphics.Paint
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.chesslab.tracker.ui.theme.BoardPalette

private const val FILES = "abcdefgh"

/** Parse the placement field of [fen] into square ("e4") -> piece FEN char. */
internal fun parseFenPlacement(fen: String): Map<String, Char> {
    val placement = fen.substringBefore(' ')
    val out = mutableMapOf<String, Char>()
    var rank = 8
    for (rankStr in placement.split('/')) {
        var file = 0
        for (c in rankStr) {
            if (c.isDigit()) {
                file += c.digitToInt()
            } else {
                out["${FILES[file]}$rank"] = c
                file++
            }
        }
        rank--
    }
    return out
}

private fun glyph(piece: Char): String =
    when (piece) {
        'K' -> "♔"
        'Q' -> "♕"
        'R' -> "♖"
        'B' -> "♗"
        'N' -> "♘"
        'P' -> "♙"
        'k' -> "♚"
        'q' -> "♛"
        'r' -> "♜"
        'b' -> "♝"
        'n' -> "♞"
        'p' -> "♟"
        else -> ""
    }

private fun pieceName(piece: Char): String {
    val colour = if (piece.isUpperCase()) "white" else "black"
    val kind =
        when (piece.uppercaseChar()) {
            'K' -> "king"
            'Q' -> "queen"
            'R' -> "rook"
            'B' -> "bishop"
            'N' -> "knight"
            'P' -> "pawn"
            else -> "piece"
        }
    return "$colour $kind"
}

/**
 * Digital chess board rendered purely from [fen] on a Compose [Canvas] (no
 * webview/SVG). An invisible 8×8 semantics grid overlays the canvas so every
 * square is individually focusable by TalkBack with a piece description.
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun ChessBoard(
    fen: String,
    modifier: Modifier = Modifier,
) {
    val pieces = remember(fen) { parseFenPlacement(fen) }

    Box(modifier = modifier.fillMaxWidth().aspectRatio(1f)) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val cell = size.width / 8f
            for (row in 0 until 8) {
                for (col in 0 until 8) {
                    val light = (row + col) % 2 == 0
                    drawRect(
                        color = if (light) BoardPalette.LightSquare else BoardPalette.DarkSquare,
                        topLeft =
                            androidx.compose.ui.geometry
                                .Offset(col * cell, row * cell),
                        size =
                            androidx.compose.ui.geometry
                                .Size(cell, cell),
                    )
                }
            }
            drawIntoCanvas { canvas ->
                val paint =
                    Paint().apply {
                        textSize = cell * 0.8f
                        textAlign = Paint.Align.CENTER
                        isAntiAlias = true
                    }
                for ((square, piece) in pieces) {
                    val file = FILES.indexOf(square[0])
                    val rank = square[1].digitToInt()
                    val cx = (file + 0.5f) * cell
                    val cy = (8 - rank + 0.5f) * cell - (paint.ascent() + paint.descent()) / 2f
                    paint.color = (if (piece.isUpperCase()) BoardPalette.WhitePiece else BoardPalette.BlackPiece).toArgb()
                    canvas.nativeCanvas.drawText(glyph(piece), cx, cy, paint)
                }
            }
        }
        // Invisible semantics grid: one focusable node per square.
        Column(modifier = Modifier.fillMaxSize()) {
            for (row in 0 until 8) {
                val rank = 8 - row
                Row(modifier = Modifier.fillMaxWidth().weight(1f)) {
                    for (col in 0 until 8) {
                        val square = "${FILES[col]}$rank"
                        val piece = pieces[square]
                        val desc = if (piece != null) "$square, ${pieceName(piece)}" else "$square, empty"
                        Box(
                            modifier =
                                Modifier
                                    .weight(1f)
                                    .fillMaxSize()
                                    .semantics { contentDescription = desc },
                        )
                    }
                }
            }
        }
    }
}
