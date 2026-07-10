package com.chesslab.tracker.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FirstPage
import androidx.compose.material.icons.filled.LastPage
import androidx.compose.material.icons.filled.NavigateBefore
import androidx.compose.material.icons.filled.NavigateNext
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.R
import com.chesslab.tracker.analysis.AnalysisEngine
import com.chesslab.tracker.analysis.MoveQuality
import com.chesslab.tracker.analysis.PositionAnalysis
import com.chesslab.tracker.games.MoveProvenance
import kotlinx.coroutines.delay
import java.util.Locale

private const val AUTOPLAY_DELAY_MS = 900L
private const val PV_PREVIEW_MOVES = 4
private val MistakeColor = Color(0xFFF5843C)

/**
 * Per-game analysis: an eval bar beside the board at the selected ply, the engine line, a
 * first/prev/play/next/last scrubber and an accuracy-tagged move list. Analysis runs once for
 * the game (via the injected [engine]) in a [LaunchedEffect] and is cached in [AnalysisCache].
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming", "LongMethod")
@Composable
fun AnalysisScreen(
    gameId: String,
    pgn: String,
    engine: AnalysisEngine,
    modifier: Modifier = Modifier,
    provenance: List<MoveProvenance> = emptyList(),
    depth: Int = AnalysisEngine.DEFAULT_DEPTH,
) {
    val line = remember(pgn) { parseGameLine(pgn) }
    var analyses by remember(gameId) { mutableStateOf(AnalysisCache.get(gameId)) }
    var selectedPly by remember(gameId) { mutableIntStateOf(0) }
    var playing by remember(gameId) { mutableStateOf(false) }

    LaunchedEffect(gameId, line) {
        if (analyses == null) {
            val result = engine.analyzeGame(line.fens, depth)
            AnalysisCache.put(gameId, result)
            analyses = result
        }
    }
    LaunchedEffect(playing) {
        if (playing) {
            while (selectedPly < line.sans.size) {
                delay(AUTOPLAY_DELAY_MS)
                selectedPly += 1
            }
            playing = false
        }
    }

    val current = analyses?.getOrNull(selectedPly)
    Column(
        modifier = modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.analysis_title), style = MaterialTheme.typography.headlineSmall)
        BoardWithEvalBar(fen = line.fens[selectedPly], fraction = current?.let { evalBarFraction(whitePovCp(it)) } ?: 0.5f)
        EngineLineRow(current)
        Scrubber(
            playing = playing,
            atStart = selectedPly == 0,
            atEnd = selectedPly >= line.sans.size,
            onFirst = { playing = false; selectedPly = 0 },
            onPrev = { playing = false; if (selectedPly > 0) selectedPly -= 1 },
            onPlayPause = { playing = !playing },
            onNext = { playing = false; if (selectedPly < line.sans.size) selectedPly += 1 },
            onLast = { playing = false; selectedPly = line.sans.size },
        )
        AnnotatedMoveList(
            sans = line.sans,
            analyses = analyses,
            selectedPly = selectedPly,
            onSelect = { playing = false; selectedPly = it },
        )
        if (selectedPly >= 1) {
            val scored = analyses?.takeIf { selectedPly < it.size }
            MoveDetailCard(
                san = line.sans[selectedPly - 1],
                quality = scored?.let { moveQualityAt(it, selectedPly - 1) },
                verdict = analyses?.getOrNull(selectedPly),
                cpLoss = scored?.let { cpLoss(it[selectedPly - 1], it[selectedPly]) },
                bestUci = analyses?.getOrNull(selectedPly - 1)?.bestUci,
                provenance = provenance.find { it.ply == selectedPly },
            )
        }
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun BoardWithEvalBar(
    fen: String,
    fraction: Float,
) {
    BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
        val barWidth = 12.dp
        val gap = 10.dp
        val boardSize = maxWidth - barWidth - gap
        Row(verticalAlignment = Alignment.CenterVertically) {
            EvalBar(fraction = fraction, modifier = Modifier.width(barWidth).height(boardSize))
            Spacer(Modifier.width(gap))
            BoardFrame(modifier = Modifier.size(boardSize)) {
                ChessBoard(fen = fen, modifier = Modifier.size(boardSize))
            }
        }
    }
}

/** Vertical eval bar: White-advantage fill grows from the bottom. */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun EvalBar(
    fraction: Float,
    modifier: Modifier = Modifier,
) {
    val white = MaterialTheme.colorScheme.onSurface
    val black = MaterialTheme.colorScheme.surfaceVariant
    val label = stringResource(R.string.analysis_eval_bar_desc)
    Canvas(modifier = modifier.clip(MaterialTheme.shapes.small).semantics { contentDescription = label }) {
        drawRect(color = black)
        val whiteHeight = size.height * fraction.coerceIn(0f, 1f)
        drawRect(
            color = white,
            topLeft = androidx.compose.ui.geometry.Offset(0f, size.height - whiteHeight),
            size = androidx.compose.ui.geometry.Size(size.width, whiteHeight),
        )
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun EngineLineRow(analysis: PositionAnalysis?) {
    Column(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(MaterialTheme.shapes.medium)
                .background(MaterialTheme.colorScheme.surface)
                .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        if (analysis == null) {
            Text(stringResource(R.string.analysis_analyzing), fontFamily = FontFamily.Monospace, color = MaterialTheme.colorScheme.onSurfaceVariant)
            return
        }
        KeyValueRow(label = stringResource(R.string.analysis_eval), value = formatEvalWhite(analysis), highlight = true)
        KeyValueRow(label = stringResource(R.string.analysis_best), value = analysis.bestUci ?: "—")
        KeyValueRow(label = stringResource(R.string.analysis_line), value = analysis.pv.take(PV_PREVIEW_MOVES).joinToString(" ").ifEmpty { "—" })
        KeyValueRow(label = stringResource(R.string.analysis_depth_label), value = analysis.depth.toString())
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming", "LongParameterList")
@Composable
private fun Scrubber(
    playing: Boolean,
    atStart: Boolean,
    atEnd: Boolean,
    onFirst: () -> Unit,
    onPrev: () -> Unit,
    onPlayPause: () -> Unit,
    onNext: () -> Unit,
    onLast: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ScrubberButton(Icons.Filled.FirstPage, stringResource(R.string.analysis_first), enabled = !atStart, onClick = onFirst)
        ScrubberButton(Icons.Filled.NavigateBefore, stringResource(R.string.analysis_prev), enabled = !atStart, onClick = onPrev)
        ScrubberButton(
            icon = if (playing) Icons.Filled.Pause else Icons.Filled.PlayArrow,
            desc = stringResource(if (playing) R.string.analysis_pause else R.string.analysis_play),
            enabled = !atEnd || playing,
            onClick = onPlayPause,
        )
        ScrubberButton(Icons.Filled.NavigateNext, stringResource(R.string.analysis_next), enabled = !atEnd, onClick = onNext)
        ScrubberButton(Icons.Filled.LastPage, stringResource(R.string.analysis_last), enabled = !atEnd, onClick = onLast)
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun ScrubberButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    desc: String,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    IconButton(onClick = onClick, enabled = enabled, modifier = Modifier.size(48.dp)) {
        Icon(icon, contentDescription = desc, tint = MaterialTheme.colorScheme.onSurface)
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun AnnotatedMoveList(
    sans: List<String>,
    analyses: List<PositionAnalysis>?,
    selectedPly: Int,
    onSelect: (Int) -> Unit,
) {
    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        var i = 0
        while (i < sans.size) {
            val moveNo = i / 2 + 1
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "$moveNo.",
                    modifier = Modifier.width(32.dp),
                    style = MaterialTheme.typography.bodyMedium,
                    fontFamily = FontFamily.Monospace,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                MoveCell(sans[i], i, analyses, selectedPly, onSelect, Modifier.weight(1f))
                if (i + 1 < sans.size) {
                    MoveCell(sans[i + 1], i + 1, analyses, selectedPly, onSelect, Modifier.weight(1f))
                } else {
                    Spacer(Modifier.weight(1f))
                }
            }
            i += 2
        }
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming", "LongParameterList")
@Composable
private fun MoveCell(
    san: String,
    moveIndex: Int,
    analyses: List<PositionAnalysis>?,
    selectedPly: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val ply = moveIndex + 1
    val selected = ply == selectedPly
    val quality = analyses?.takeIf { moveIndex + 1 < it.size }?.let { moveQualityAt(it, moveIndex) }
    val label = stringResource(R.string.analysis_ply_desc, ply, san)
    Row(
        modifier =
            modifier
                .clip(MaterialTheme.shapes.small)
                .background(if (selected) MaterialTheme.colorScheme.surfaceVariant else Color.Transparent)
                .clickable { onSelect(ply) }
                .semantics { contentDescription = label }
                .padding(horizontal = 8.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(san, style = MaterialTheme.typography.bodyMedium, fontFamily = FontFamily.Monospace)
        if (quality != null) MoveQualityChip(quality)
    }
}

/** Small quality label chip; colour per spec (best=primary…blunder=error). */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun MoveQualityChip(quality: MoveQuality) {
    val color = qualityColor(quality)
    Box(
        modifier =
            Modifier
                .clip(MaterialTheme.shapes.small)
                .background(color.copy(alpha = QUALITY_CHIP_ALPHA))
                .padding(horizontal = 6.dp, vertical = 2.dp),
    ) {
        Text(qualityLabel(quality), style = MaterialTheme.typography.labelSmall, color = color)
    }
}

private const val QUALITY_CHIP_ALPHA = 0.18f

/**
 * Merged move detail: the engine verdict (eval, cp-loss, best move) AND the tracker's own
 * decision provenance (`decider`, `reason`, `margin`, `changed`, `shadowVeto`, `priorUsed`)
 * for the selected ply — the integration point of phases 04 (provenance) and 05 (engine).
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming", "LongParameterList")
@Composable
private fun MoveDetailCard(
    san: String,
    quality: MoveQuality?,
    verdict: PositionAnalysis?,
    cpLoss: Int?,
    bestUci: String?,
    provenance: MoveProvenance?,
) {
    Column(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(MaterialTheme.shapes.medium)
                .background(MaterialTheme.colorScheme.surface)
                .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(san, style = MaterialTheme.typography.titleLarge, fontFamily = FontFamily.Monospace)
            if (quality != null) MoveQualityChip(quality)
        }

        SectionHeader(stringResource(R.string.analysis_verdict))
        if (verdict == null) {
            Text(stringResource(R.string.analysis_analyzing), color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            KeyValueRow(label = stringResource(R.string.analysis_eval), value = formatEvalWhite(verdict), highlight = true)
            KeyValueRow(label = stringResource(R.string.analysis_cp_loss), value = cpLoss?.toString() ?: "—")
            KeyValueRow(label = stringResource(R.string.analysis_best), value = bestUci ?: "—")
        }

        SectionHeader(stringResource(R.string.analysis_provenance))
        if (provenance == null) {
            Text(stringResource(R.string.analysis_no_provenance), color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            ProvenanceRows(provenance)
        }
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun ProvenanceRows(provenance: MoveProvenance) {
    val style = MaterialTheme.typography.bodySmall
    Text(stringResource(R.string.history_decider, provenance.decider ?: "—"), style = style)
    Text(stringResource(R.string.history_reason, provenance.reason ?: "—"), style = style)
    Text(stringResource(R.string.history_margin, provenance.margin, provenance.best, provenance.second), style = style)
    Text(stringResource(R.string.history_changed, provenance.changed.joinToString(" ").ifEmpty { "-" }), style = style)
    Text(stringResource(R.string.history_vetoed, provenance.shadowVeto.joinToString(" ").ifEmpty { "-" }), style = style)
    Text(stringResource(R.string.history_prior, provenance.priorUsed.toString()), style = style)
}

@Composable
private fun qualityColor(quality: MoveQuality): Color =
    when (quality) {
        MoveQuality.BOOK -> MaterialTheme.colorScheme.onSurfaceVariant
        MoveQuality.BEST -> MaterialTheme.colorScheme.primary
        MoveQuality.GOOD -> MaterialTheme.colorScheme.secondary
        MoveQuality.INACCURACY -> MaterialTheme.colorScheme.tertiary
        MoveQuality.MISTAKE -> MistakeColor
        MoveQuality.BLUNDER -> MaterialTheme.colorScheme.error
    }

@Composable
private fun qualityLabel(quality: MoveQuality): String =
    stringResource(
        when (quality) {
            MoveQuality.BOOK -> R.string.quality_book
            MoveQuality.BEST -> R.string.quality_best
            MoveQuality.GOOD -> R.string.quality_good
            MoveQuality.INACCURACY -> R.string.quality_inaccuracy
            MoveQuality.MISTAKE -> R.string.quality_mistake
            MoveQuality.BLUNDER -> R.string.quality_blunder
        },
    )

/** Format a position's eval from White's POV: "+1.20", "-0.35", "M3", "-M2". */
internal fun formatEvalWhite(analysis: PositionAnalysis): String {
    val whiteToMove = analysis.fen.substringAfter(' ').trimStart().startsWith("w")
    analysis.eval.mateIn?.let { mate ->
        val whiteMate = if (whiteToMove) mate else -mate
        return if (whiteMate >= 0) "M$whiteMate" else "-M${-whiteMate}"
    }
    val cp = whitePovCp(analysis)
    val sign = if (cp >= 0) "+" else ""
    return sign + String.format(Locale.US, "%.2f", cp / 100.0)
}
