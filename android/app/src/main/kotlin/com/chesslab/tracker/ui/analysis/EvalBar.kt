package com.chesslab.tracker.ui.analysis

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.analysis.AnalysisResult
import com.chesslab.tracker.analysis.AnalysisState
import com.chesslab.tracker.ui.Figure
import com.chesslab.tracker.ui.percent
import com.chesslab.tracker.ui.theme.BoardDark
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.PieceWhite
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.tracking.NoTrackerSession
import com.chesslab.tracker.ui.tracking.TrackerSessionHost
import kotlin.math.abs
import kotlin.math.max

private const val NO_EVAL = "–"

internal val BAR_WIDTH = 18.dp

/** Not `Radius.sm`: 8 dp on an 18 dp column is a pill. */
private val BAR_CORNER = 3.dp

/** Wider than the bar so `100 %` and `-M3` fit on ONE line. Unchanged when analysis is off: a hairline
 *  beside the board read as a rendering artifact. */
internal val SLOT_WIDTH = 52.dp

/** A mate keeps its own words: `100 %` would throw the distance away. */
internal fun evalLabel(result: AnalysisResult?): String {
    val mate = result?.mate
    val winWhite = result?.winWhite
    return when {
        result == null || result.gameOver -> NO_EVAL
        mate != null -> (if (mate < 0) "-M" else "M") + abs(mate)
        winWhite != null -> percent(winWhite)
        else -> NO_EVAL
    }
}

/** EINER je Schirm, denn zwei waeren zwei Stockfish-Prozesse. [demand] haelt ihn fuer die Hilfe am Leben. */
@Composable
fun rememberRunningAnalysis(demand: () -> Boolean): AnalysisHost {
    val host = rememberAnalysisHost(demand)
    val session by TrackerSessionHost.session.collectAsStateWithLifecycle()
    val status by (session ?: NoTrackerSession).status.collectAsStateWithLifecycle()
    LaunchedEffect(status) { host.onStatus(status) }
    DisposableEffect(host) { onDispose { host.stop() } }
    return host
}

/** Reads the status itself, so the tracking screen carries no analysis plumbing. Nothing without an engine binary. */
@Composable
fun EvalBarSlot(
    host: AnalysisHost,
    modifier: Modifier = Modifier,
) {
    val state by host.state.collectAsStateWithLifecycle()
    val block by host.block.collectAsStateWithLifecycle()
    val result by host.result.collectAsStateWithLifecycle()
    val settings by host.settings.collectAsStateWithLifecycle()
    if (state == AnalysisState.Unavailable) return

    var showPanel by remember { mutableStateOf(false) }
    Column(
        // The label is a number that changes, so the description is what an agent taps.
        modifier
            .fillMaxHeight()
            .width(SLOT_WIDTH)
            .clickable { showPanel = true }
            .semantics { contentDescription = "Engine evaluation" },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Space.hair),
    ) {
        Figure(if (settings.enabled) evalLabel(result) else "eval", OnSurfaceMuted)
        // `weight`, not `fillMaxHeight`: both filling, the bar overflowed past the board.
        EvalFill(
            winWhite = if (settings.enabled) result?.winWhite else null,
            paused = block != null || !settings.enabled,
            modifier = Modifier.width(BAR_WIDTH).weight(1f),
        )
    }

    if (showPanel) AnalysisPanel(result = result, block = block, onDismiss = { showPanel = false })
}

/** White fills from the BOTTOM, as on the board beside it. One drawing for tracker and review. */
@Composable
internal fun EvalFill(
    winWhite: Double?,
    paused: Boolean,
    modifier: Modifier = Modifier,
) {
    // `null` heisst NICHT bewertet und bleibt LEER: 50 % waeren die haeufigste Luege dieser Flaeche.
    val target = winWhite?.let { (it / 100.0).toFloat().coerceIn(0f, 1f) }
    val white by animateFloatAsState(target ?: 0f, tween(FILL_MS), label = "evalFill")
    Column(
        modifier
            .clip(RoundedCornerShape(BAR_CORNER))
            .background(BoardDark),
    ) {
        if (target == null) return@Column
        Spacer(Modifier.fillMaxWidth().weight(max(MIN_WEIGHT, 1f - white)))
        Spacer(
            Modifier
                .testTag(EVAL_WHITE_TAG)
                .fillMaxWidth()
                .weight(max(MIN_WEIGHT, white))
                .background(if (paused) OnSurfaceMuted else PieceWhite),
        )
    }
}

/** Nur fuer den Test: ohne ihn ist "kein weisser Anteil" von aussen nicht sagbar. */
internal const val EVAL_WHITE_TAG = "evalWhite"

private const val FILL_MS = 260

/** A zero weight is invalid in Compose, and a mate must still leave the bar visible. */
private const val MIN_WEIGHT = 0.001f
