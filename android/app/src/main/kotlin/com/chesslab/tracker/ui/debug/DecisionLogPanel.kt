package com.chesslab.tracker.ui.debug

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.chesslab.engine.api.DebugDecision
import com.chesslab.tracker.service.DebugState
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted

/**
 * Who decided each move, on what evidence — and, unlike Python, which candidates were REFUSED.
 * Newest first. No images: `_recent_decisions` keeps warped frames for the feedback dataset, and
 * that is memory a phone running a tournament session does not have.
 */
@Composable
fun DecisionLogPanel(
    state: DebugState,
    viewModel: DebugViewModel,
) {
    val context = LocalContext.current
    val rows = remember(state) { state.payload.decisions.asReversed() }
    var expanded by remember { mutableStateOf<Int?>(null) }
    Column(
        Modifier.fillMaxWidth().verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        TextButton(onClick = {
            shareDecisionLog(
                context,
                exportDecisionLog(state.payload.decisions, viewModel.config, viewModel.runtime.value, appVersion(context)),
            )
        }) {
            Text("Export as text", color = Accent)
        }
        if (rows.isEmpty()) Text("no decisions yet", color = OnSurfaceMuted)
        rows.forEachIndexed { index, row ->
            DecisionRow(row, expanded == index) { expanded = if (expanded == index) null else index }
        }
    }
}

@Composable
private fun DecisionRow(
    row: DebugDecision,
    expanded: Boolean,
    onToggle: () -> Unit,
) {
    val tone = if (row.accepted) OnSurface else Danger
    Column(Modifier.fillMaxWidth().clickable(onClick = onToggle).padding(vertical = 2.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(fmt(row.tsS, 1), style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
            Text("#${row.ply}", style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
            Text("${row.san ?: "-"} (${row.uci ?: "-"})", style = MaterialTheme.typography.labelMedium, color = tone)
            Text(row.decider, style = MaterialTheme.typography.labelMedium, color = tone)
        }
        Text(
            "${row.reason}  ·  LL ${fmt(row.bestScore, 2)}/${fmt(row.secondScore, 2)} (Δ${fmt(row.margin, 2)})" +
                (if (row.priorUsed) "  · prior" else "") +
                (row.stuckReason?.let { "  · stuck: $it" } ?: "") +
                (row.verifyOutcome?.let { "  · verify: $it" } ?: ""),
            style = MaterialTheme.typography.labelSmall,
            color = OnSurfaceMuted,
        )
        if (expanded) Detail(row)
    }
}

@Composable
private fun Detail(row: DebugDecision) {
    Column(Modifier.padding(start = 8.dp, top = 2.dp), verticalArrangement = Arrangement.spacedBy(1.dp)) {
        StatRow("before", row.fenBefore ?: "-", OnSurfaceMuted)
        StatRow("after", row.fenAfter, OnSurfaceMuted)
        StatRow("changed", row.changedVals.joinToString(" ") { "${it.first}=${fmt(it.second, 1)}" }.ifEmpty { "-" })
        StatRow("shadow-vetoed", row.shadowVetoed.joinToString(" ").ifEmpty { "-" })
        StatRow("occlusion-vetoed", row.occludedVetoed.joinToString(" ").ifEmpty { "-" })
        StatRow("grid / motion / zThr", "${fmt(row.gridCoverage, 2)} / ${fmt(row.motion, 3)} / ${fmt(row.zThr, 2)}")
        StatRow("cnn agreement / best", "${fmt(row.cnnAgreement, 3)} / ${row.cnnBestMove ?: "-"}")
    }
}

private fun appVersion(context: android.content.Context): String =
    runCatching { context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "?" }
        .getOrDefault("?")
