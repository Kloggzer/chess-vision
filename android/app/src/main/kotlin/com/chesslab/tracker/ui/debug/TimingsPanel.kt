package com.chesslab.tracker.ui.debug

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.service.DebugState
import com.chesslab.tracker.service.FRAME_BUDGET_MS
import com.chesslab.tracker.service.StageStat
import com.chesslab.tracker.ui.Figure
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Outline
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Stroke
import java.util.Locale

/**
 * Where the frame time goes. Python dumps the same numbers to `data/_perf/perf_loop.log`; on
 * Android the `chesslabPerf` logcat line stays as well — this panel is the version you can read
 * while standing at the board, which is where the 4 fps -> 15-20 fps work actually happened.
 */
@Composable
fun TimingsPanel(state: DebugState) {
    val stages = state.stages.filterNot { it.stage == TOTAL }
    val total = state.stages.firstOrNull { it.stage == TOTAL }
    Column(
        Modifier.fillMaxWidth().verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(Space.sm),
    ) {
        // Two rates, never one: `camera` is what CameraX delivered, `detection` is what reached the
        // engine. A camera at 30 with detection at 0 is an uncalibrated board, not a broken feed.
        // Labels stay short: `StatRow` is a SpaceBetween row, and the spelled-out "5 s median" left
        // the second line touching its own numbers on a 1080p phone.
        StatRow(
            "camera fps (now / 5 s)",
            fmt(state.cameraFps, 1) + "  /  " + fmt(state.cameraFpsMedian, 1),
            fpsTone(state.cameraFpsMedian),
        )
        StatRow(
            "detection fps (now / 5 s)",
            fmt(state.fps, 1) + "  /  " + fmt(state.fpsMedian, 1),
            fpsTone(state.fpsMedian),
        )
        total?.let {
            StatRow("total ms (last / med / p95)", "${fmt(it.last, 1)} / ${fmt(it.median, 1)} / ${fmt(it.p95, 1)}", budgetTone(it.last))
        }
        StackedBar(stages, total?.last ?: stages.sumOf { it.last })
        Row(Modifier.fillMaxWidth()) {
            Text("stage", Modifier.weight(1.4f), style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
            listOf("last", "med", "p95").forEach {
                Text(it, Modifier.weight(1f), style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
            }
        }
        state.stages.forEach { StageRow(it) }
    }
}

/** The stacked bar's height. A component size: it is the chart, not a gap. */
private val CHART_HEIGHT = 18.dp

private const val TOTAL = "total"

/** One horizontal bar, each stage a slice of the frame budget. Empty when nothing was measured. */
@Composable
private fun StackedBar(
    stages: List<StageStat>,
    total: Double,
) {
    if (total <= 0.0) return
    Row(Modifier.fillMaxWidth().height(CHART_HEIGHT).background(Outline)) {
        stages.forEach { stage ->
            val share = (stage.last / total).toFloat()
            if (share > 0f) Row(Modifier.weight(share).fillMaxWidth().background(sliceColor(stage.stage))) {}
        }
    }
}

@Composable
private fun StageRow(stat: StageStat) {
    val tone = if (stat.stage == TOTAL) budgetTone(stat.last) else OnSurface
    Row(Modifier.fillMaxWidth().padding(vertical = Stroke.hairline)) {
        Figure(stat.stage, sliceColor(stat.stage), Modifier.weight(1.4f))
        listOf(stat.last, stat.median, stat.p95).forEach { Figure(fmt(it, 1), tone, Modifier.weight(1f)) }
    }
}

/** Phase 09's acceptance line is >= 15 fps; anything slower is red, not "a bit high". */
@androidx.compose.runtime.Composable
private fun budgetTone(ms: Double): Color = if (ms > FRAME_BUDGET_MS) Danger else Accent

@androidx.compose.runtime.Composable
private fun fpsTone(fps: Double): Color =
    when {
        fps >= FPS_TARGET -> Accent
        fps >= FPS_WARN -> Busy
        else -> Danger
    }

private const val FPS_TARGET = 15.0
private const val FPS_WARN = 10.0

private val SLICE_COLORS =
    listOf(
        Color(0xFF4FD08A),
        Color(0xFF5AA9FF),
        Color(0xFFF0B429),
        Color(0xFFB388FF),
        Color(0xFF4DD0E1),
        Color(0xFFFF8A65),
        Color(0xFF9CCC65),
        Color(0xFFF06292),
    )

@androidx.compose.runtime.Composable
private fun sliceColor(stage: String): Color = if (stage == TOTAL) OnSurface else SLICE_COLORS[stage.hashCode().mod(SLICE_COLORS.size)]

internal fun fmt(
    value: Double,
    digits: Int,
): String = String.format(Locale.ROOT, "%.${digits}f", value)
