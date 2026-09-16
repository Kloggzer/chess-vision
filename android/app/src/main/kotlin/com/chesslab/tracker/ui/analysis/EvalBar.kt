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

/** Its own radius, not `Radius.sm`: 8 dp on an 18 dp column is a pill, not a rounded bar. */
private val BAR_CORNER = 3.dp

/**
 * The slot is wider than the bar so `100 %` and `-M3` fit on ONE line — at bar width the label
 * wrapped, which is not a number anybody can read at arm's length.
 *
 * It grew from 40 dp with specs/48: one quantity gets one PRESENTATION as well as one unit, and the
 * app writes a percentage `53 %`. The space is a character and the widest label has to fit it.
 *
 * The width does not change when analysis is off: a 6dp hairline beside the board read as a
 * rendering artifact rather than a control.
 */
internal val SLOT_WIDTH = 52.dp

/**
 * White's win expectancy as a percentage, or `M3` for a mate. Pure, so the convention is testable.
 *
 * It read PAWNS (`+0.3`) until specs/47 while the review screen's bar — the same drawing, the same
 * slot — read `61 %`. specs/44 removed centipawns from the review because they have to be taught;
 * they survived here, one screen over. A mate keeps its own words: a distance is not an evaluation,
 * and `100%` would throw the distance away.
 */
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

/**
 * The tracking screen's single analysis insertion: the bar and the engine's top lines. It renders
 * nothing at all when no engine binary shipped for this ABI. The knobs live in Settings › Analysis
 * and nowhere else.
 *
 * It reads the tracker's status itself rather than taking it as a parameter — the eval bar must not
 * become a reason for the tracking screen to carry analysis plumbing.
 */
@Composable
fun EvalBarSlot(modifier: Modifier = Modifier) {
    val host = rememberAnalysisHost()
    val session by TrackerSessionHost.session.collectAsStateWithLifecycle()
    val status by (session ?: NoTrackerSession).status.collectAsStateWithLifecycle()
    val state by host.state.collectAsStateWithLifecycle()
    val block by host.block.collectAsStateWithLifecycle()
    val result by host.result.collectAsStateWithLifecycle()
    val settings by host.settings.collectAsStateWithLifecycle()
    LaunchedEffect(status) { host.onStatus(status) }
    DisposableEffect(host) { onDispose { host.stop() } }
    if (state == AnalysisState.Unavailable) return

    var showPanel by remember { mutableStateOf(false) }
    Column(
        // A tap opens the engine's lines. The LONG PRESS that used to open the analysis settings is
        // gone with the sheet: it duplicated Settings › Analysis behind a gesture on a 40 dp sliver
        // that nobody could discover, and it was the stated reason this slot could not shrink.
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
        // `weight`, not `fillMaxHeight`: with both children filling, the label and the bar each
        // claimed the whole column and the bar overflowed past the board it belongs beside.
        EvalFill(
            winWhite = if (settings.enabled) result?.winWhite else null,
            paused = block != null || !settings.enabled,
            modifier = Modifier.width(BAR_WIDTH).weight(1f),
        )
    }

    if (showPanel) AnalysisPanel(result = result, block = block, onDismiss = { showPanel = false })
}

/**
 * White fills from the BOTTOM — the same orientation as the board beside it.
 *
 * Shared with the review screen, which needs the same bar driven by the ply being READ rather than
 * by the tracker's current position. One drawing, so the two can never disagree about which way up
 * white goes.
 */
@Composable
internal fun EvalFill(
    winWhite: Double?,
    paused: Boolean,
    modifier: Modifier = Modifier,
) {
    // `null` heisst NICHT bewertet und bleibt LEER: 50 % waeren die haeufigste Luege, die diese
    // Flaeche erzaehlen kann, und `lastFen` wiederholt die Stellung nie.
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

/** Lang genug, dass die Bewegung die RICHTUNG zeigt, kurz genug, um dem naechsten Zug nicht
 *  hinterherzulaufen — die Analyse liefert alle paar hundert Millisekunden eine Tiefe nach. */
private const val FILL_MS = 260

/** A zero weight is not a valid Compose weight, and a mate must still leave the bar visible. */
private const val MIN_WEIGHT = 0.001f
