package com.chesslab.tracker.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.IosShare
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.chesslab.engine.STARTPOS
import com.chesslab.engine.api.TrackerState
import com.chesslab.tracker.R
import com.chesslab.tracker.analysis.MoveQuality
import com.chesslab.tracker.analysis.PositionAnalysis
import com.chesslab.tracker.analysis.classify
import com.chesslab.tracker.games.GameSummary
import com.github.bhlangonijr.chesslib.move.MoveList
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlin.math.roundToInt

/**
 * Games library — the multi-game replacement for the old single-game History screen.
 * Reads persisted [GameSummary] rows (from `gameStore.list()`); the live game (if any)
 * is pinned on top with a live [StatusPill]. Each saved row shows result / opening /
 * date / move count / accuracy (from cached analysis, else `—`) and an eval sparkline.
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun GamesScreen(
    games: List<GameSummary>,
    liveMoveCount: Int,
    onOpenGame: (String) -> Unit,
    onExport: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxWidth().padding(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(stringResource(R.string.games_title), style = MaterialTheme.typography.headlineSmall)
            Text(
                stringResource(R.string.games_count, games.size),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        if (liveMoveCount > 0) {
            LiveGameRow(liveMoveCount)
        }

        if (games.isEmpty() && liveMoveCount == 0) {
            Text(
                stringResource(R.string.games_empty),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 24.dp),
            )
        }

        LazyColumn(
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(games, key = { it.id }) { summary ->
                GameRow(summary = summary, onOpen = { onOpenGame(summary.id) }, onExport = { onExport(summary.id) })
            }
        }
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun LiveGameRow(moveCount: Int) {
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .padding(top = 12.dp)
                .clip(MaterialTheme.shapes.medium)
                .background(MaterialTheme.colorScheme.surface)
                .padding(12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column {
            Text(stringResource(R.string.games_live), style = MaterialTheme.typography.titleMedium)
            Text(
                stringResource(R.string.games_move_count, moveCount),
                style = MaterialTheme.typography.bodySmall,
                fontFamily = FontFamily.Monospace,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        StatusPill(state = TrackerState.TRACKING)
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun GameRow(
    summary: GameSummary,
    onOpen: () -> Unit,
    onExport: () -> Unit,
) {
    val cached = remember(summary.id) { AnalysisCache.get(summary.id) }
    val accuracy = remember(cached) { cached?.let { gameAccuracyPercent(it) } }
    val rowLabel = stringResource(R.string.games_row_desc, summary.result, summary.moveCount)
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp)
                .clip(MaterialTheme.shapes.medium)
                .background(MaterialTheme.colorScheme.surface)
                .clickable(onClick = onOpen)
                .semantics { contentDescription = rowLabel }
                .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            summary.result,
            style = MaterialTheme.typography.titleMedium,
            fontFamily = FontFamily.Monospace,
            color = MaterialTheme.colorScheme.primary,
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                summary.opening ?: stringResource(R.string.games_untitled),
                style = MaterialTheme.typography.bodyLarge,
                maxLines = 1,
            )
            Text(
                stringResource(
                    R.string.games_row_meta,
                    formatSavedAt(summary.savedAtEpochMs),
                    summary.moveCount,
                    accuracy?.let { "$it%" } ?: "—",
                ),
                style = MaterialTheme.typography.bodySmall,
                fontFamily = FontFamily.Monospace,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (cached != null) {
            EvalSparkline(cached, modifier = Modifier.size(width = 64.dp, height = 28.dp))
        }
        IconButton(
            onClick = onExport,
            modifier = Modifier.size(48.dp),
        ) {
            Icon(
                Icons.Filled.IosShare,
                contentDescription = stringResource(R.string.games_export),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

private const val SPARK_STROKE_DP = 1.5f

/** Inline eval sparkline — a white-POV polyline over the game's per-ply evaluations. */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun EvalSparkline(
    analyses: List<PositionAnalysis>,
    modifier: Modifier = Modifier,
) {
    val line = MaterialTheme.colorScheme.primary
    val baseline = MaterialTheme.colorScheme.outline
    val label = stringResource(R.string.games_sparkline_desc)
    Canvas(modifier = modifier.semantics { contentDescription = label }) {
        val n = analyses.size
        if (n < 2) return@Canvas
        val stepX = size.width / (n - 1)
        val midY = size.height / 2f
        drawLine(color = baseline, start = Offset(0f, midY), end = Offset(size.width, midY), strokeWidth = 1f)
        val path = Path()
        analyses.forEachIndexed { index, analysis ->
            val frac = evalBarFraction(whitePovCp(analysis))
            // frac in [0,1] with 1 = white winning -> draw near the top.
            val y = size.height * (1f - frac)
            val x = index * stepX
            if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
        }
        drawPath(path = path, color = line, style = androidx.compose.ui.graphics.drawscope.Stroke(width = SPARK_STROKE_DP * density))
    }
}

// ---------------------------------------------------------------------------
// Shared, Compose-free analysis model (unit-tested without a native engine).
// ---------------------------------------------------------------------------

/**
 * Process-lifetime cache of a game's per-position analysis, keyed by game id. Populated by
 * [AnalysisScreen] after the engine runs so the library list can show accuracy/sparkline and
 * re-opening the analysis is instant. In-memory only — [com.chesslab.tracker.games.GameStore]
 * has no analysis-sidecar API (its package is out of this phase's scope), so nothing is persisted.
 */
internal object AnalysisCache {
    private val entries = HashMap<String, List<PositionAnalysis>>()

    fun get(id: String): List<PositionAnalysis>? = entries[id]

    fun put(
        id: String,
        analyses: List<PositionAnalysis>,
    ) {
        entries[id] = analyses
    }
}

/** A parsed game line: the FEN before each move plus the final FEN, aligned SANs and move squares. */
internal data class GameLine(
    // size == sans.size + 1 (start position through the position after the last move)
    val fens: List<String>,
    val sans: List<String>,
    // (fromSquare, toSquare) per ply, e.g. "e2" to "e4"
    val moves: List<Pair<String, String>>,
)

private val FEN_HEADER = Regex("\\[FEN \"([^\"]+)\"]")
private val RESULT_TOKENS = setOf("1-0", "0-1", "1/2-1/2", "*")

/** Parse a PGN into per-ply FENs + SANs via chesslib (mirrors `gameStore` PGNs from the start position). */
internal fun parseGameLine(pgn: String): GameLine {
    val startFen = FEN_HEADER.find(pgn)?.groupValues?.get(1) ?: STARTPOS
    val moveText =
        pgn
            .lineSequence()
            .filterNot { it.trimStart().startsWith("[") }
            .joinToString(" ")
            .split(Regex("\\s+"))
            .filter { it.isNotBlank() && it !in RESULT_TOKENS }
            .joinToString(" ")
    val list = MoveList(startFen)
    if (moveText.isNotBlank()) list.loadFromSan(moveText)
    val fens = (0..list.size).map { list.getFen(it) }
    val sans = list.toSanArray().toList()
    val moves = list.map { it.from.value().lowercase() to it.to.value().lowercase() }
    return GameLine(fens = fens, sans = sans, moves = moves)
}

/** Score at [analysis] from the side-to-move POV, mate mapped to ±[MATE_CP]. */
private fun stmCp(analysis: PositionAnalysis): Int =
    analysis.eval.cp
        ?: analysis.eval.mateIn?.let { if (it >= 0) MATE_CP else -MATE_CP }
        ?: 0

/** Centipawns from White's POV (positive = White better), mate clamped. */
internal fun whitePovCp(analysis: PositionAnalysis): Int {
    val whiteToMove = analysis.fen.substringAfter(' ').trimStart().startsWith("w")
    val stm = stmCp(analysis)
    return if (whiteToMove) stm else -stm
}

/**
 * Centipawn loss of the move between [before] and [after], from the mover's POV.
 * Eval is side-to-move relative, so `loss = stmCp(before) + stmCp(after)` (the opponent is to
 * move in [after], so their positive score is the mover's negative). Negative loss = the played
 * move beat the engine line at this depth, which [classify] still grades as BEST.
 */
internal fun cpLoss(
    before: PositionAnalysis,
    after: PositionAnalysis,
): Int = stmCp(before) + stmCp(after)

/** Quality of the move at 0-based [moveIndex] within [analyses] (size = moves + 1). */
internal fun moveQualityAt(
    analyses: List<PositionAnalysis>,
    moveIndex: Int,
): MoveQuality = classify(cpLoss(analyses[moveIndex], analyses[moveIndex + 1]), isBookPly = false)

private fun accuracyPoints(quality: MoveQuality): Int =
    when (quality) {
        MoveQuality.BOOK, MoveQuality.BEST -> BEST_POINTS
        MoveQuality.GOOD -> GOOD_POINTS
        MoveQuality.INACCURACY -> INACCURACY_POINTS
        MoveQuality.MISTAKE -> MISTAKE_POINTS
        MoveQuality.BLUNDER -> BLUNDER_POINTS
    }

/** Whole-game accuracy percentage (average per-move accuracy points), or null if no moves. */
internal fun gameAccuracyPercent(analyses: List<PositionAnalysis>): Int? {
    if (analyses.size < 2) return null
    val points = (0 until analyses.size - 1).map { accuracyPoints(moveQualityAt(analyses, it)) }
    return points.average().roundToInt()
}

/** Eval-bar fill fraction for a White-POV centipawn score: 0 = Black winning, 1 = White winning. */
internal fun evalBarFraction(cpWhite: Int): Float =
    (HALF + cpWhite.toFloat() / (2f * EVAL_CLAMP_CP)).coerceIn(0f, 1f)

private val SAVED_AT_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")

internal fun formatSavedAt(epochMs: Long): String =
    SAVED_AT_FORMAT.format(Instant.ofEpochMilli(epochMs).atZone(ZoneId.systemDefault()))

internal const val MATE_CP = 1000
private const val EVAL_CLAMP_CP = 800f
private const val HALF = 0.5f
private const val BEST_POINTS = 100
private const val GOOD_POINTS = 90
private const val INACCURACY_POINTS = 70
private const val MISTAKE_POINTS = 40
private const val BLUNDER_POINTS = 0
