package com.chesslab.tracker.ui.debug

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import com.chesslab.engine.api.DebugDecision
import com.chesslab.tracker.diagnostics.appVersionOf
import com.chesslab.tracker.diagnostics.zipDiagnostics
import com.chesslab.tracker.service.DebugState
import com.chesslab.tracker.ui.Figure
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Stroke

/** The picker's suggested name; the user may change it, so nothing downstream may key on it. */
private const val DIAGNOSTICS_FILE = "chesslab-diagnostics.zip"

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
    val exportDiagnostics =
        rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/zip")) { uri ->
            // SAF, the same path the session export uses: the user picks the destination, so
            // nothing leaves the app's own storage without them choosing where it goes.
            uri ?: return@rememberLauncherForActivityResult
            context.contentResolver.openOutputStream(uri)?.use { zipDiagnostics(context.filesDir, it) }
        }
    Column(
        Modifier.fillMaxWidth().verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(Space.xs),
    ) {
        // Two exports, and they answer different questions. "Export as text" is the 64-row ring
        // this screen is showing, right now. "Export diagnostics" is the rotating file on disk:
        // every row since the app started, each file headed by the config and the model that were
        // in force — which is the thing nobody could see when `motionRecencyS` sat at 0.0 in the
        // DataStore and silently rejected every diff-path commit for an evening.
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Space.xs)) {
            TextButton(onClick = {
                shareDecisionLog(
                    context,
                    exportDecisionLog(
                        state.payload.decisions,
                        viewModel.config,
                        viewModel.runtime.value,
                        appVersionOf(context).name,
                    ),
                )
            }) {
                Text("Export as text", color = Accent)
            }
            TextButton(onClick = { exportDiagnostics.launch(DIAGNOSTICS_FILE) }) {
                Text("Export diagnostics", color = Accent)
            }
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
    Column(Modifier.fillMaxWidth().clickable(onClick = onToggle).padding(vertical = Space.hair)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
            Text(fmt(row.tsS, 1), style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
            Text("#${row.ply}", style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
            Figure("${row.san ?: "-"} (${row.uci ?: "-"})", tone)
            Figure(row.decider, tone)
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
    Column(Modifier.padding(start = Space.sm, top = Space.hair), verticalArrangement = Arrangement.spacedBy(Stroke.hairline)) {
        StatRow("before", row.fenBefore ?: "-", OnSurfaceMuted)
        StatRow("after", row.fenAfter, OnSurfaceMuted)
        StatRow("changed", row.changedVals.joinToString(" ") { "${it.first}=${fmt(it.second, 1)}" }.ifEmpty { "-" })
        StatRow("shadow-vetoed", row.shadowVetoed.joinToString(" ").ifEmpty { "-" })
        StatRow("occlusion-vetoed", row.occludedVetoed.joinToString(" ").ifEmpty { "-" })
        StatRow("grid / motion / zThr", "${fmt(row.gridCoverage, 2)} / ${fmt(row.motion, 3)} / ${fmt(row.zThr, 2)}")
        StatRow("cnn agreement / best", "${fmt(row.cnnAgreement, 3)} / ${row.cnnBestMove ?: "-"}")
    }
}
