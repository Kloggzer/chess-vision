package com.chesslab.tracker.ui.review

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.analysis.GameGrade
import com.chesslab.tracker.analysis.MoveQuality
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.games.MoveRow
import com.chesslab.tracker.games.ReviewPly
import com.chesslab.tracker.games.SeamOrigin
import com.chesslab.tracker.games.moveRows
import com.chesslab.tracker.games.startsWithBlack
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.SurfaceRaised

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
    Box(modifier.clip(RoundedCornerShape(12.dp)).background(SurfaceRaised)) {
        LazyColumn(state = listState, modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp)) {
            moveListSection(game, grade = null, selected = 0, onSelect = null)
        }
    }
}

fun LazyListScope.moveListSection(
    game: GameView,
    grade: GameGrade?,
    selected: Int,
    onSelect: ((Int) -> Unit)?,
) {
    if (game.plies.isEmpty()) {
        item(key = "no-moves") {
            Text("No moves yet", style = MaterialTheme.typography.bodyMedium, color = OnSurfaceMuted, modifier = Modifier.padding(12.dp))
        }
        return
    }
    game.segments.forEachIndexed { index, segment ->
        segment.enteredBy?.let { seam -> item(key = "seam-$index") { SeamRow(seam) } }
        segmentRows(index, segment.startFen, segment.plies, grade, selected, onSelect)
    }
}

private fun LazyListScope.segmentRows(
    segment: Int,
    startFen: String,
    plies: List<ReviewPly>,
    grade: GameGrade?,
    selected: Int,
    onSelect: ((Int) -> Unit)?,
) {
    val rows = moveRows(plies, startsWithBlack(startFen))
    items(rows, key = { "seg$segment-${it.number}" }) { MoveRowLine(it, grade, selected, onSelect) }
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
    Column(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
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
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            text = "${row.number}.",
            style = MaterialTheme.typography.labelMedium,
            color = OnSurfaceMuted,
            modifier = Modifier.width(34.dp),
        )
        MoveCell(row.white, grade, selected, onSelect, Modifier.weight(1f))
        MoveCell(row.black, grade, selected, onSelect, Modifier.weight(1f))
    }
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
    val quality = grade?.of(ply.ply)?.quality
    val row = if (onSelect == null) modifier else modifier.clickable { onSelect(ply.ply) }
    Row(row, verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
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
        quality?.let {
            Text(
                text = badge(it),
                style = MaterialTheme.typography.labelMedium,
                // Not `quality?.let(::badgeColor)`: the palette is read through composable getters,
                // and a @Composable function reference cannot be passed to `let`.
                color = badgeColor(it),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f, fill = false),
            )
        }
    }
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
