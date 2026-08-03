package com.chesslab.tracker.ui.analysis

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
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
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.analysis.AnalysisResult
import com.chesslab.tracker.analysis.AnalysisState
import com.chesslab.tracker.analysis.CP_PER_PAWN
import com.chesslab.tracker.ui.theme.BoardDark
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.PieceWhite
import com.chesslab.tracker.ui.tracking.NoTrackerSession
import com.chesslab.tracker.ui.tracking.TrackerSessionHost
import java.util.Locale
import kotlin.math.abs
import kotlin.math.max

private const val NO_EVAL = "–"

internal val BAR_WIDTH = 18.dp

/**
 * The slot is wider than the bar so `+0.3` and `-M3` fit on ONE line — at bar width the label
 * wrapped to `+0.` / `3`, which is not a number anybody can read at arm's length.
 *
 * The width does not change when analysis is off: a 6dp hairline beside the board read as a
 * rendering artifact rather than a control, and this is still the ONLY way into the analysis
 * settings sheet, so it cannot shrink to nothing either.
 */
internal val SLOT_WIDTH = 40.dp

/** The centipawn score as pawns, or `M3` for a mate. Pure, so the sign convention is testable. */
internal fun evalLabel(result: AnalysisResult?): String {
    val mate = result?.mate
    val cp = result?.cp
    return when {
        result == null || result.gameOver -> NO_EVAL
        mate != null -> (if (mate < 0) "-M" else "M") + abs(mate)
        cp != null -> String.format(Locale.ROOT, "%+.1f", cp / CP_PER_PAWN)
        else -> NO_EVAL
    }
}

/**
 * The tracking screen's single analysis insertion: bar, top-3 panel and settings, all reached from
 * this one element. It renders nothing at all when no engine binary shipped for this ABI.
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
    var showSettings by remember { mutableStateOf(false) }
    Column(
        modifier.fillMaxHeight().width(SLOT_WIDTH).pointerInput(settings.enabled) {
            detectTapGestures(
                onTap = { if (settings.enabled) showPanel = true else showSettings = true },
                onLongPress = { showSettings = true },
            )
        },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(
            text = if (settings.enabled) evalLabel(result) else "eval",
            style = MaterialTheme.typography.labelSmall,
            color = OnSurfaceMuted,
            maxLines = 1,
            softWrap = false,
        )
        // `weight`, not `fillMaxHeight`: with both children filling, the label and the bar each
        // claimed the whole column and the bar overflowed past the board it belongs beside.
        EvalFill(
            winWhite = if (settings.enabled) result?.winWhite else null,
            paused = block != null || !settings.enabled,
            modifier = Modifier.width(BAR_WIDTH).weight(1f),
        )
    }

    if (showPanel) AnalysisPanel(result = result, block = block, onDismiss = { showPanel = false })
    if (showSettings) {
        AnalysisSettingsSheet(settings = settings, onChange = host::update, onDismiss = { showSettings = false })
    }
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
    val white = ((winWhite ?: 50.0) / 100.0).toFloat()
    Column(
        modifier
            .clip(RoundedCornerShape(3.dp))
            .background(BoardDark),
    ) {
        Spacer(Modifier.fillMaxWidth().weight(max(MIN_WEIGHT, 1f - white)))
        Spacer(
            Modifier
                .fillMaxWidth()
                .weight(max(MIN_WEIGHT, white))
                .background(if (paused) OnSurfaceMuted else PieceWhite),
        )
    }
}

/** A zero weight is not a valid Compose weight, and a mate must still leave the bar visible. */
private const val MIN_WEIGHT = 0.001f
