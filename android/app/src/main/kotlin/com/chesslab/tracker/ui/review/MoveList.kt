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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.analysis.GameGrade
import com.chesslab.tracker.analysis.MoveQuality
import com.chesslab.tracker.analysis.PlyGrade
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.games.MoveRow
import com.chesslab.tracker.games.ReviewPly
import com.chesslab.tracker.games.SeamOrigin
import com.chesslab.tracker.games.moveRows
import com.chesslab.tracker.games.startsWithBlack
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
import kotlin.math.abs

/** 94 dp until specs/50, when the number moved out of the bar and needed a column of its own. */
private val POSITION_COLUMN_WIDTH = 104.dp

/** What is left of the column beside the label: enough fill to read a share at a glance. */
private val POSITION_BAR_WIDTH = 48.dp
private val MOVE_ROW_HEIGHT = 52.dp
private val MOVE_NUMBER_WIDTH = 34.dp

/** Level, as the win-expectancy curve means it. */
private const val EVEN = 50.0

/** Below this the cost rounds to zero, and `−0 %` is not a cost anybody should read. */
private const val HALF_A_POINT = 0.5

/**
 * The score sheet — live or archived, and the same list either way.
 *
 * It is ROWS IN THE SCREEN'S OWN LazyColumn rather than a list of its own. It used to be a nested
 * `LazyColumn` in a fixed-height box, and on a phone that box lost the fight: the board is square
 * and takes a screen width of height, and once the verdict was added above it the list measured to
 * one and a half rows while the accuracy card was clipped off the bottom. One scrolling list has no
 * such fight, and it is what both products this screen was measured against do.
 *
 * The only thing that differs between live and archived is what is written beside each ply: the
 * tracker's decider while the game runs, the engine's grade once it has been reviewed. [grade] null
 * means "not reviewed", never "clean".
 *
 * It takes the whole [game] rather than a flat ply list because a game can hold SEAMS, and the
 * moves after one do not follow the moves before it. A flat list says they do.
 *
 * [selected] is a ply number, 0 for the start position. [onSelect] null makes the list read-only,
 * which is what the live surface wants: there the board follows the game, not the finger.
 *
 * The standalone [MoveList] above is for the TRACKING screen, which has no lazy list of its own and
 * wants the score sheet in a fixed box that follows the game to the bottom.
 */
@Composable
fun MoveList(
    game: GameView,
    modifier: Modifier = Modifier,
) {
    val listState = rememberLazyListState()
    val plyCount = game.plies.size
    LaunchedEffect(plyCount) {
        if (plyCount > 0) listState.animateScrollToItem(listState.layoutInfo.totalItemsCount)
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
        val rows = moveRows(segment.plies, startsWithBlack(segment.startFen))
        val visibleRows = remainingRows?.let(rows::take) ?: rows
        segmentRows(index, visibleRows, grade, selected, onSelect)
        remainingRows = remainingRows?.let { (it - visibleRows.size).coerceAtLeast(0) }
    }
}

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
) {
    itemsIndexed(rows, key = { _, row -> "seg$segment-${row.number}" }) { _, row ->
        MoveRowLine(row, grade, selected, onSelect)
    }
}

/**
 * A GAP in the record, in plain words.
 *
 * This is the one thing about how the game was captured that a player genuinely needs told. Which
 * path committed an individual move is not — a recovered move is normally the move that was played,
 * and the decider says how the app found out, not whether it happened. A seam is different: the moves
 * on the two sides of it are not one continuous record, so the review says so and refuses to grade
 * across it.
 */
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
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = Space.xs),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Space.md),
    ) {
        // A move number is a figure and the column only works if they line up.
        Figure("${row.number}.", OnSurfaceMuted, Modifier.width(MOVE_NUMBER_WIDTH))
        MoveCell(row.white, grade, selected, onSelect, Modifier.weight(1f))
        MoveCell(row.black, grade, selected, onSelect, Modifier.weight(1f))
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
        // The number sits BESIDE the bar, never on it. Drawn inside, the fill's own boundary ran
        // straight through it — rows 6-8 of the shipped screen read `73| %`, `68| %`, `67| %`.
        // Right-aligned, so `4 %` and `52 %` line up on the unit and neither drifts off the bar.
        Box(Modifier.weight(1f), contentAlignment = Alignment.CenterEnd) {
            Figure(positionLeadLabel(winWhite, mate), trendColor)
        }
        // A forced mate takes the whole cell: the bar is a share out of 100 and it has nothing left
        // to say once the game is decided, while "Mate in 6" needs every pixel of the column.
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

/**
 * The position after the row's last ply, as WHITE's win expectancy — the same quantity the bar
 * behind it draws and the same one the `−10%` beside the SAN is a delta of.
 *
 * It printed `White +1.2` until specs/47: a pawn count, in a column whose background was already
 * drawn from the percentage, one tab away from a screen that had centipawns removed from it
 * deliberately (specs/44). "Mate in 6" and "Checkmate" keep their words — a distance is not an
 * evaluation, and the percentage has nothing left to say once a mate is forced.
 */
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
    modifier: Modifier = Modifier,
) {
    if (ply == null) {
        Box(modifier)
        return
    }
    val plyGrade = grade?.of(ply.ply)
    val quality = plyGrade?.quality
    val impact = moveImpactLabel(plyGrade)
    val cell = if (onSelect == null) modifier else modifier.clickable { onSelect(ply.ply) }
    Column(cell, verticalArrangement = Arrangement.spacedBy(Space.hair)) {
        Text(
            text = ply.san,
            style = MaterialTheme.typography.bodyLarge,
            // The SAN and its grade, and nothing else. `cnn_occupancy` used to sit here beside every
            // move: the tracker's own vocabulary, competing with the move for the reader's eye and
            // saying nothing a player can act on. It is in Details now.
            color = MaterialTheme.colorScheme.onSurface,
            // The selected ply is the one the board is showing. Without it the board and the list
            // disagree about where you are the moment you scroll away from the end.
            fontWeight = if (ply.ply == selected) FontWeight.Bold else FontWeight.Normal,
            maxLines = 1,
        )
        if (quality != null || impact != null) {
            Row(horizontalArrangement = Arrangement.spacedBy(Space.xs), verticalAlignment = Alignment.CenterVertically) {
                quality?.let {
                    val badge = badge(it)
                    if (badge.isNotEmpty()) {
                        Text(
                            text = badge,
                            style = MaterialTheme.typography.labelMedium,
                            // Not `quality?.let(::badgeColor)`: the palette is read through
                            // composable getters, and a @Composable function reference cannot be
                            // passed to `let`.
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

/**
 * Winning-chance cost of this move, from the mover's perspective.
 *
 * This is the same loss that determines the quality badge. It is deliberately capped at zero: an
 * engine comparison can wobble slightly in the mover's favour between searches, but that does not
 * mean the move created winning chances from nowhere. Most importantly, a blunder can never appear
 * beside a positive number merely because the opponent blundered even harder elsewhere.
 */
internal fun moveImpactLabel(grade: PlyGrade?): String? {
    if (grade == null) return null
    if (grade.quality == MoveQuality.BEST) return percent(0.0)
    val lost = (grade.winBefore - grade.winAfter).coerceAtLeast(0.0)
    return if (lost < HALF_A_POINT) percent(0.0) else "−${percent(lost)}"
}

/** Short enough to sit beside a SAN on a phone; the verdict above the list spells the band out. */
private fun badge(quality: MoveQuality): String =
    when (quality) {
        MoveQuality.BEST -> "best"
        MoveQuality.GOOD -> ""
        MoveQuality.INACCURACY -> "?!"
        MoveQuality.MISTAKE -> "?"
        MoveQuality.BLUNDER -> "??"
    }
