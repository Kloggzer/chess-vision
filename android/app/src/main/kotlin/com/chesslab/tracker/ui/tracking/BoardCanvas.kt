package com.chesslab.tracker.ui.tracking

import android.graphics.Paint
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.chesslab.tracker.ui.theme.ALARM_SCRIM_ALPHA
import com.chesslab.tracker.ui.theme.ChesslabPalette
import com.chesslab.tracker.ui.theme.LocalChesslabPalette

private const val FILES = "abcdefgh"
private const val RANKS = 8
private const val GLYPH_SCALE = 0.78f
private const val GLYPH_BASELINE = 0.72f
private const val GLYPH_STROKE = 0.05f

internal fun parseFenPlacement(fen: String): Map<String, Char> {
    val out = LinkedHashMap<String, Char>()
    fen.substringBefore(' ').split('/').forEachIndexed { index, rankField ->
        parseRank(rankField, RANKS - index, out)
    }
    return out
}

private fun parseRank(
    rankField: String,
    rank: Int,
    out: MutableMap<String, Char>,
) {
    var file = 0
    for (c in rankField) {
        if (c.isDigit()) {
            file += c.digitToInt()
        } else {
            if (file < RANKS) out["${FILES[file]}$rank"] = c
            file++
        }
    }
}

private const val UCI_MIN = 4
private const val SQUARE_CHARS = 2

internal fun lastMoveSquares(uci: String?): Set<String> =
    if (uci == null || uci.length < UCI_MIN) {
        emptySet()
    } else {
        setOf(uci.substring(0, SQUARE_CHARS), uci.substring(SQUARE_CHARS, UCI_MIN))
    }

private fun glyph(piece: Char): String =
    when (piece.uppercaseChar()) {
        'K' -> "♚"
        'Q' -> "♛"
        'R' -> "♜"
        'B' -> "♝"
        'N' -> "♞"
        'P' -> "♟"
        else -> ""
    }

/** Rendered from [fen] and nothing else: a second reconstruction drifts from the engine silently.
 *  [suggestedUci] only draws an arrow — never a piece or tint, which would mean "played". [alarmed]
 *  scrims the board: while latched, this position is provably NOT on the table. */
@Composable
fun BoardCanvas(
    fen: String,
    modifier: Modifier = Modifier,
    lastMoveUci: String? = null,
    suggestedUci: String? = null,
    lastMoveArrow: Boolean = false,
    alarmed: Boolean = false,
    whitePov: Boolean = true,
) {
    val pieces = remember(fen) { parseFenPlacement(fen) }
    val highlight = remember(lastMoveUci) { lastMoveSquares(lastMoveUci) }
    // The draw lambda is not a composable scope.
    val palette = LocalChesslabPalette.current
    // Solid-filled glyphs: outline pieces vanish against a mid-grey square at a metre.
    val paint =
        remember {
            Paint().apply {
                isAntiAlias = true
                textAlign = Paint.Align.CENTER
            }
        }
    Canvas(
        modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .semantics { contentDescription = "Chess board, position $fen" },
    ) {
        val cell = size.minDimension / RANKS
        paint.textSize = cell * GLYPH_SCALE
        for (rank in 0 until RANKS) {
            for (file in 0 until RANKS) {
                val square = "${FILES[file]}${rank + 1}"
                val topLeft = squareOrigin(file, rank, cell, whitePov)
                drawSquare(palette, topLeft, cell, (file + rank) % 2 == 0, square in highlight)
                val piece = pieces[square] ?: continue
                drawGlyph(palette, paint, piece, topLeft, cell)
            }
        }
        // Played first, the engine's move on top: where both share a square, the advice must stay readable.
        if (lastMoveArrow) lastMoveUci?.let { drawMoveArrow(palette.primary, it, cell, whitePov, PLAYED_STROKE) }
        suggestedUci?.let { drawMoveArrow(palette.accent, it, cell, whitePov, ARROW_STROKE) }
        if (alarmed) drawAlarm(palette.danger, cell)
    }
}

private const val ARROW_STROKE = 0.13f

private const val PLAYED_STROKE = 0.08f
private const val ARROW_HEAD = 0.34f

private fun DrawScope.drawMoveArrow(
    color: Color,
    uci: String,
    cell: Float,
    whitePov: Boolean,
    stroke: Float,
) {
    val squares = lastMoveSquares(uci).toList()
    val from = squares.getOrNull(0)?.let { squareCentre(it, cell, whitePov) }
    val to = squares.getOrNull(1)?.let { squareCentre(it, cell, whitePov) }
    if (from == null || to == null) return
    val along = to - from
    val length = along.getDistance()
    if (length <= 0f) return
    val unit = along / length
    val head = cell * ARROW_HEAD
    drawLine(color, from, to - unit * head, strokeWidth = cell * stroke, cap = StrokeCap.Round)
    val side = Offset(-unit.y, unit.x) * (head / 2f)
    drawPath(
        Path().apply {
            moveTo(to.x, to.y)
            lineTo(to.x - unit.x * head + side.x, to.y - unit.y * head + side.y)
            lineTo(to.x - unit.x * head - side.x, to.y - unit.y * head - side.y)
            close()
        },
        color,
    )
}

private fun squareCentre(
    square: String,
    cell: Float,
    whitePov: Boolean,
): Offset? {
    val file = FILES.indexOf(square[0]).takeIf { it >= 0 } ?: return null
    val rank = square[1].digitToIntOrNull()?.minus(1)?.takeIf { it in 0 until RANKS } ?: return null
    return squareOrigin(file, rank, cell, whitePov) + Offset(cell / 2f, cell / 2f)
}

/** A wash AND a border: over warm boxwood a red wash alone reads as a slightly pinker board. */
private fun DrawScope.drawAlarm(
    danger: Color,
    cell: Float,
) {
    val side = cell * RANKS
    drawRect(color = danger.copy(alpha = ALARM_SCRIM_ALPHA), size = Size(side, side))
    val stroke = cell * ALARM_BORDER_FRACTION
    drawRect(
        color = danger,
        topLeft = Offset(stroke / 2f, stroke / 2f),
        size = Size(side - stroke, side - stroke),
        style = Stroke(width = stroke),
    )
}

private const val ALARM_BORDER_FRACTION = 0.18f

private fun squareOrigin(
    file: Int,
    rank: Int,
    cell: Float,
    whitePov: Boolean,
): Offset {
    val col = if (whitePov) file else RANKS - 1 - file
    val row = if (whitePov) RANKS - 1 - rank else rank
    return Offset(col * cell, row * cell)
}

private fun DrawScope.drawSquare(
    palette: ChesslabPalette,
    topLeft: Offset,
    cell: Float,
    dark: Boolean,
    highlighted: Boolean,
) {
    drawRect(color = if (dark) palette.boardDark else palette.boardLight, topLeft = topLeft, size = Size(cell, cell))
    if (highlighted) drawRect(color = palette.lastMoveTint, topLeft = topLeft, size = Size(cell, cell))
}

private fun DrawScope.drawGlyph(
    palette: ChesslabPalette,
    paint: Paint,
    piece: Char,
    topLeft: Offset,
    cell: Float,
) {
    val symbol = glyph(piece)
    val x = topLeft.x + cell / 2f
    val y = topLeft.y + cell * GLYPH_BASELINE + (cell - paint.textSize) / 2f
    val white = piece.isUpperCase()
    drawIntoCanvas {
        // An outline in BOTH colours: a white outline piece is a hairline on a light square.
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = cell * GLYPH_STROKE
        paint.color = (if (white) palette.pieceBlack else palette.pieceWhite).toArgb()
        it.nativeCanvas.drawText(symbol, x, y, paint)
        paint.style = Paint.Style.FILL
        paint.color = (if (white) palette.pieceWhite else palette.pieceBlack).toArgb()
        it.nativeCanvas.drawText(symbol, x, y, paint)
    }
}
