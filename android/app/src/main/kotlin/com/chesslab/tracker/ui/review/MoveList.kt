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
 * The only thing that differs is what is written beside each ply: the tracker's decider while the
 * game runs, the engine's grade once it has been reviewed. [grade] null means "not reviewed", never
 * "clean".
 *
 * It takes the whole [game] rather than a flat ply list because a game can hold SEAMS, and the
 * moves after one do not follow the moves before it. A flat list says they do.
 *
 * [selected] is a ply number, 0 for the start position. [onSelect] null makes the list read-only,
 * which is what the live surface wants: there the board follows the game, not the finger.
 */
@Composable
fun MoveList(
    game: GameView,
    modifier: Modifier = Modifier,
    grade: GameGrade? = null,
    selected: Int = 0,
    onSelect: ((Int) -> Unit)? = null,
    follow: Boolean = true,
) {
    val listState = rememberLazyListState()
    val plyCount = game.plies.size
    LaunchedEffect(plyCount, follow) {
        if (follow && plyCount > 0) listState.animateScrollToItem(listState.layoutInfo.totalItemsCount)
    }
    Box(modifier.clip(RoundedCornerShape(12.dp)).background(SurfaceRaised)) {
        if (plyCount == 0) {
            Text(
                text = "No moves yet",
                style = MaterialTheme.typography.bodyMedium,
                color = OnSurfaceMuted,
                modifier = Modifier.padding(12.dp),
            )
        } else {
            LazyColumn(state = listState, modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp)) {
                game.segments.forEachIndexed { index, segment ->
                    segment.enteredBy?.let { seam -> item(key = "seam-$index") { SeamRow(seam, segment.startFen) } }
                    segmentRows(index, segment.startFen, segment.plies, grade, selected, onSelect)
                }
            }
        }
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

/** What the app committed to get here, and the position the moves below actually start from. */
@Composable
private fun SeamRow(
    seam: SeamOrigin,
    startFen: String,
) {
    Column(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        Text(
            "Board rebuilt by ${seam.decider}: ${seam.sans.joinToString(" ")}",
            style = MaterialTheme.typography.bodyMedium,
            color = Danger,
        )
        Text(
            "The app lost the board here — the moves below do not follow the ones above.",
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceMuted,
        )
        Text("Resumed at: $startFen", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
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
    val graded = grade?.of(ply.ply)
    // A rebuilt move never wears a quality badge. `??` beside a move the app invented reads as the
    // player's blunder, which is the one thing this screen must not say.
    val quality = graded?.takeIf { it.played }?.quality
    val row = if (onSelect == null) modifier else modifier.clickable { onSelect(ply.ply) }
    Row(row, verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            text = ply.san,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface,
            // The selected ply is the one the board is showing. Without it the board and the list
            // disagree about where you are the moment you scroll away from the end.
            fontWeight = if (ply.ply == selected) FontWeight.Bold else FontWeight.Normal,
            // The SAN is the row. It is measured first and never wraps or shrinks; whatever is
            // beside it gets the remainder.
            maxLines = 1,
        )
        Text(
            // The grade wins the slot when there is one: after the game the decider is trivia and
            // "which move lost it" is the reason this screen is open at all. A rebuilt move keeps
            // its decider forever, because that IS its grade.
            text = quality?.let(::badge) ?: ply.decider.orEmpty(),
            style = MaterialTheme.typography.labelMedium,
            // Not `quality?.let(::badgeColor)`: the palette is read through composable getters, and
            // a @Composable function reference cannot be passed to `let`.
            color =
                when {
                    quality != null -> badgeColor(quality)
                    graded != null -> Danger
                    else -> OnSurfaceMuted
                },
            // Half a phone width holds two of these cells, and `cnn_occupancy` does not fit one.
            // Unbounded it wrapped mid-word — `Nc6 cnn_occupanc` / `y` — and pushed the row to two
            // lines. `fill = false` so a short label does not stretch the cell.
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f, fill = false),
        )
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
