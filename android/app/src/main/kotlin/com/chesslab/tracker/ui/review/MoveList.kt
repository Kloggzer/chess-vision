package com.chesslab.tracker.ui.review

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.analysis.GameGrade
import com.chesslab.tracker.analysis.MoveQuality
import com.chesslab.tracker.analysis.PlyGrade
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.games.HintStatus
import com.chesslab.tracker.games.MoveRow
import com.chesslab.tracker.games.ReviewPly
import com.chesslab.tracker.games.SeamOrigin
import com.chesslab.tracker.games.hintStatus
import com.chesslab.tracker.games.moveRows
import com.chesslab.tracker.games.startNumber
import com.chesslab.tracker.games.startsWithBlack
import com.chesslab.tracker.hints.HintMark
import com.chesslab.tracker.ui.Figure
import com.chesslab.tracker.ui.percent
import com.chesslab.tracker.ui.theme.BoardDark
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Outline
import com.chesslab.tracker.ui.theme.PieceWhite
import com.chesslab.tracker.ui.theme.Radius
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Stroke
import com.chesslab.tracker.ui.theme.Surface
import com.chesslab.tracker.ui.theme.SurfaceRaised
import com.chesslab.tracker.ui.tracking.speechLanguage
import kotlin.math.abs

private val POSITION_COLUMN_WIDTH = 104.dp

private val POSITION_BAR_WIDTH = 48.dp
private val MOVE_ROW_HEIGHT = 52.dp
private val MOVE_NUMBER_WIDTH = 34.dp

private const val EVEN = 50.0

/** Below this the cost rounds to zero, and `−0 %` is not a cost. */
private const val HALF_A_POINT = 0.5

/** ROWS IN THE SCREEN'S OWN LazyColumn: a nested list in a fixed box measured to one and a half rows under
 *  the square board. [grade] null means "not reviewed", never "clean"; the whole [game] because moves
 *  after a SEAM do not follow those before. [onSelect] null is read-only (live). */
@Composable
fun MoveList(
    game: GameView,
    modifier: Modifier = Modifier,
) {
    val listState = rememberLazyListState()
    val plyCount = game.plies.size
    LaunchedEffect(plyCount) {
        // Off the ply count, not `layoutInfo.totalItemsCount`: that is one PAST the last index and empty at first.
        if (plyCount > 0) listState.animateScrollToItem(plyCount)
    }
    Box(
        modifier
            .clip(RoundedCornerShape(Radius.md))
            .background(Surface)
            .border(Stroke.hairline, Outline, RoundedCornerShape(Radius.md)),
    ) {
        LazyColumn(state = listState, modifier = Modifier.fillMaxWidth().padding(horizontal = Space.md, vertical = Space.sm)) {
            moveListSection(game, grade = null, selected = 0, onSelect = null)
        }
    }
}

fun LazyListScope.moveListSection(
    game: GameView,
    grade: GameGrade?,
    selected: Int,
    onSelect: ((Int) -> Unit)?,
    maxRows: Int? = null,
) {
    if (game.plies.isEmpty()) {
        item(key = "no-moves") {
            Text("No moves yet", style = MaterialTheme.typography.bodyMedium, color = OnSurfaceMuted, modifier = Modifier.padding(Space.md))
        }
        return
    }
    item(key = "move-columns") { MoveColumnHeaders(showPosition = grade != null) }
    var remainingRows = maxRows
    game.segments.forEachIndexed { index, segment ->
        if (remainingRows == 0) return@forEachIndexed
        segment.enteredBy?.let { seam -> item(key = "seam-$index") { SeamRow(seam) } }
        val rows = moveRows(segment.plies, startsWithBlack(segment.startFen), startNumber(segment.startFen))
        val visibleRows = remainingRows?.let(rows::take) ?: rows
        segmentRows(index, visibleRows, grade, selected, onSelect, game.hintsRecorded)
        remainingRows = remainingRows?.let { (it - visibleRows.size).coerceAtLeast(0) }
    }
    hintLegend(game)
}

private fun LazyListScope.hintLegend(game: GameView) {
    if (!game.hintsRecorded || game.plies.none { it.hint != null }) return
    item(key = "hint-legend") {
        Column(Modifier.fillMaxWidth().padding(top = Space.sm)) {
            HINT_LEGEND.forEach {
                Text(HintMark.words(it, speechLanguage()), style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
            }
        }
    }
}

private val HINT_LEGEND = listOf(HintStatus.FOLLOWED, HintStatus.GIVEN)

@Composable
private fun MoveColumnHeaders(showPosition: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(bottom = Space.xs),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Space.md),
    ) {
        Text(
            "#",
            style = MaterialTheme.typography.labelMedium,
            color = OnSurfaceMuted,
            modifier = Modifier.width(MOVE_NUMBER_WIDTH),
        )
        Text(
            "White",
            style = MaterialTheme.typography.labelLarge,
            color = OnSurfaceMuted,
            modifier = Modifier.weight(1f),
        )
        Text(
            "Black",
            style = MaterialTheme.typography.labelLarge,
            color = OnSurfaceMuted,
            modifier = Modifier.weight(1f),
        )
        if (showPosition) {
            Text(
                "Position",
                style = MaterialTheme.typography.labelLarge,
                color = OnSurfaceMuted,
                modifier = Modifier.width(POSITION_COLUMN_WIDTH),
            )
        }
    }
}

private fun LazyListScope.segmentRows(
    segment: Int,
    rows: List<MoveRow>,
    grade: GameGrade?,
    selected: Int,
    onSelect: ((Int) -> Unit)?,
    hintsRecorded: Boolean,
) {
    itemsIndexed(rows, key = { _, row -> "seg$segment-${row.number}" }) { _, row ->
        MoveRowLine(row, grade, selected, onSelect, hintsRecorded)
    }
}

/** The one capture fact a player needs: the moves on either side of a seam are not one record, so the
 *  review says so and does not grade across it. */
@Composable
private fun SeamRow(seam: SeamOrigin) {
    Column(Modifier.fillMaxWidth().padding(vertical = Space.sm)) {
        Text("The app lost track of the board here", style = MaterialTheme.typography.bodyMedium, color = Danger)
        Text(
            "It picked the game up again below. The moves around this point may not be exactly what was " +
                "played, so they are not graded." +
                if (seam.sans.isNotEmpty()) " It filled the gap with ${seam.sans.joinToString(" ")}." else "",
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceMuted,
        )
    }
}

@Composable
private fun MoveRowLine(
    row: MoveRow,
    grade: GameGrade?,
    selected: Int,
    onSelect: ((Int) -> Unit)?,
    hintsRecorded: Boolean,
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = Space.xs),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Space.md),
    ) {
        Figure("${row.number}.", OnSurfaceMuted, Modifier.width(MOVE_NUMBER_WIDTH))
        MoveCell(row.white, grade, selected, onSelect, hintsRecorded, Modifier.weight(1f))
        MoveCell(row.black, grade, selected, onSelect, hintsRecorded, Modifier.weight(1f))
        grade?.let { PositionCell(row, it) }
    }
}

@Composable
private fun PositionCell(
    row: MoveRow,
    grade: GameGrade,
) {
    val lastPly = row.black ?: row.white
    val mate = lastPly?.let { grade.evalMate.getOrNull(it.ply) }
    val winWhite = lastPly?.let { grade.winWhite.getOrNull(it.ply) }
    val trendColor =
        when {
            winWhite == null -> OnSurfaceMuted
            winWhite >= EVEN -> OnSurface
            else -> Danger
        }
    Row(
        modifier = Modifier.width(POSITION_COLUMN_WIDTH).height(MOVE_ROW_HEIGHT),
        horizontalArrangement = Arrangement.spacedBy(Space.xs),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // BESIDE the bar, never on it: drawn inside, the fill's edge cut through it (`73| %`). Right-aligned on the unit.
        Box(Modifier.weight(1f), contentAlignment = Alignment.CenterEnd) {
            Figure(positionLeadLabel(winWhite, mate), trendColor)
        }
        if (mate == null) {
            Box(Modifier.width(POSITION_BAR_WIDTH).fillMaxHeight().clip(RoundedCornerShape(Radius.sm))) {
                HorizontalPositionBackground(winWhite)
            }
        }
    }
}

@Composable
private fun HorizontalPositionBackground(winWhite: Double?) {
    val dark = BoardDark
    val light = PieceWhite.copy(alpha = 0.28f)
    val separator = PieceWhite.copy(alpha = 0.55f)
    val empty = SurfaceRaised
    Canvas(Modifier.fillMaxSize()) {
        if (winWhite == null) {
            drawRect(empty)
            return@Canvas
        }
        drawRect(dark)
        val whiteShare = (winWhite / 100.0).coerceIn(0.0, 1.0).toFloat()
        val boundary = size.width * (1f - whiteShare)
        drawRect(
            color = light,
            topLeft = Offset(boundary, 0f),
            size = Size(size.width - boundary, size.height),
        )
        drawLine(
            color = separator,
            start = Offset(boundary, 0f),
            end = Offset(boundary, size.height),
            strokeWidth = Stroke.hairline.toPx(),
        )
    }
}

/** PGN keeps its own ASCII "..." (`PgnBuilder`), and so does [openingTheoryLabel]. */
internal fun moveNumberLabel(ply: Int): String = "${(ply + 1) / 2}${if (ply % 2 == 1) "." else "…"}"

/** WHITE's win expectancy, the quantity the bar draws. "Mate in 6" keeps its words: a distance is no evaluation. */
internal fun positionLeadLabel(
    winWhite: Double?,
    mate: Int?,
): String =
    when {
        winWhite == null -> "—"
        mate == 0 -> "Checkmate"
        mate != null -> "Mate in ${abs(mate)}"
        else -> percent(winWhite)
    }

@Composable
private fun MoveCell(
    ply: ReviewPly?,
    grade: GameGrade?,
    selected: Int,
    onSelect: ((Int) -> Unit)?,
    hintsRecorded: Boolean,
    modifier: Modifier = Modifier,
) {
    if (ply == null) {
        Box(modifier)
        return
    }
    val plyGrade = grade?.of(ply.ply)
    val quality = plyGrade?.quality
    val impact = moveImpactLabel(plyGrade)
    val hint = hintStatus(hintsRecorded, ply.hint)
    val cell = if (onSelect == null) modifier else modifier.clickable { onSelect(ply.ply) }
    Column(cell, verticalArrangement = Arrangement.spacedBy(Space.hair)) {
        Text(
            text = ply.san,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface,
            // Without it board and list disagree about where you are once you scroll away from the end.
            fontWeight = if (ply.ply == selected) FontWeight.Bold else FontWeight.Normal,
            maxLines = 1,
        )
        HintSign(hint)
        if (quality != null || impact != null) {
            Row(horizontalArrangement = Arrangement.spacedBy(Space.xs), verticalAlignment = Alignment.CenterVertically) {
                quality?.let {
                    val badge = badge(it)
                    if (badge.isNotEmpty()) {
                        Text(
                            text = badge,
                            style = MaterialTheme.typography.labelMedium,
                            // Not `quality?.let(::badgeColor)`: a @Composable function reference cannot be passed to `let`.
                            color = badgeColor(it),
                            maxLines = 1,
                        )
                    }
                }
                impact?.let { Figure(it, MaterialTheme.colorScheme.onSurface) }
            }
        }
    }
}

/** NUR der Vermerk: ob ein vorgesagter Zug anders benotet wird, ist eine offene Produktentscheidung
 *  (`docs/game-review.md`). */
@Composable
private fun HintSign(status: HintStatus) {
    val sign = HintMark.sign(status)
    if (sign.isEmpty()) return
    val words = HintMark.words(status, speechLanguage())
    Text(
        text = sign,
        style = MaterialTheme.typography.labelMedium,
        color = OnSurfaceMuted,
        maxLines = 1,
        modifier = Modifier.semantics { contentDescription = words },
    )
}

/** Capped at zero: a wobble between searches must never put a blunder beside a positive number. */
internal fun moveImpactLabel(grade: PlyGrade?): String? {
    if (grade == null) return null
    if (grade.quality == MoveQuality.BEST) return percent(0.0)
    val lost = (grade.winBefore - grade.winAfter).coerceAtLeast(0.0)
    return if (lost < HALF_A_POINT) percent(0.0) else "−${percent(lost)}"
}

private fun badge(quality: MoveQuality): String =
    when (quality) {
        MoveQuality.BEST -> "best"
        MoveQuality.GOOD -> ""
        MoveQuality.INACCURACY -> "?!"
        MoveQuality.MISTAKE -> "?"
        MoveQuality.BLUNDER -> "??"
    }
