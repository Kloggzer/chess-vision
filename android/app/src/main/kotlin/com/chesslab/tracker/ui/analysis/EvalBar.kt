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

private val BAR_WIDTH = 18.dp

/** Off, the bar is a hairline: it is the ONLY way into the settings sheet, so it cannot vanish. */
private val BAR_WIDTH_COLLAPSED = 6.dp

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
        modifier.fillMaxHeight().width(if (settings.enabled) BAR_WIDTH else BAR_WIDTH_COLLAPSED).pointerInput(settings.enabled) {
            detectTapGestures(
                onTap = { if (settings.enabled) showPanel = true else showSettings = true },
                onLongPress = { showSettings = true },
            )
        },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        if (settings.enabled) {
            Text(evalLabel(result), style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
        }
        EvalFill(winWhite = result?.winWhite, paused = block != null)
    }

    if (showPanel) AnalysisPanel(result = result, block = block, onDismiss = { showPanel = false })
    if (showSettings) {
        AnalysisSettingsSheet(settings = settings, onChange = host::update, onDismiss = { showSettings = false })
    }
}

/** White fills from the BOTTOM — the same orientation as the board below it. */
@Composable
private fun EvalFill(
    winWhite: Double?,
    paused: Boolean,
) {
    val white = ((winWhite ?: 50.0) / 100.0).toFloat()
    Column(
        Modifier
            .fillMaxWidth()
            .fillMaxHeight()
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
