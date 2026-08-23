package com.chesslab.tracker.ui.debug

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.Figure
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space

/**
 * The debug route. 07a wires it behind the settings screen under `ROUTE_DEBUG` — it is deliberately
 * NOT on the tracking flow: `TrackerStatus.debug` is only assembled while this screen is composed,
 * and a tab on the main flow would make that cost permanent.
 */
@Composable
fun DebugRoute(
    onBack: () -> Unit,
    viewModel: DebugViewModel = viewModel(),
) {
    val session by DebugSessionHost.session.collectAsStateWithLifecycle()
    LaunchedEffect(session) { viewModel.attach(session ?: NoDebugSession) }
    DebugScreen(viewModel, onBack)
}

@Composable
private fun DebugScreen(
    viewModel: DebugViewModel,
    onBack: () -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val tab by viewModel.tab.collectAsStateWithLifecycle()
    val cnn by viewModel.cnn.collectAsStateWithLifecycle()

    ChesslabScaffold("Debug", onBack) { bars ->
        Column(Modifier.fillMaxSize().padding(bars)) {
            // The attach banner rides above the tabs on every tab, not only on the CNN one: a
            // silent attach failure once survived a whole session (MEMORY android-live-bringup-2607).
            CnnAttachBanner(cnn)
            SourceWorkProfileControls(viewModel)
            ScrollableTabRow(selectedTabIndex = tab.ordinal, edgePadding = 0.dp) {
                DebugTab.entries.forEach { entry ->
                    Tab(
                        selected = entry == tab,
                        onClick = { viewModel.onTabSelected(entry) },
                        text = { Text(entry.title, style = MaterialTheme.typography.labelMedium) },
                    )
                }
            }
            val debug = state
            if (debug == null) {
                Text(
                    "waiting for the tracker's first debug frame…",
                    style = MaterialTheme.typography.bodyMedium,
                    color = OnSurfaceMuted,
                    modifier = Modifier.padding(top = Space.xl),
                )
                return@Column
            }
            Column(
                Modifier.fillMaxSize().padding(top = Space.md),
                verticalArrangement = Arrangement.spacedBy(Space.sm),
            ) {
                when (tab) {
                    DebugTab.TIMINGS -> TimingsPanel(debug)
                    DebugTab.EVIDENCE -> EvidencePanel(debug)
                    DebugTab.CROPS -> CropGridPanel(debug, viewModel)
                    DebugTab.READS -> CnnReadsPanel(debug, viewModel)
                    DebugTab.DECISIONS -> DecisionLogPanel(debug, viewModel)
                    DebugTab.CNN -> CnnStatePanel(cnn, viewModel)
                }
            }
        }
    }
}

private val DebugTab.title: String
    get() =
        when (this) {
            DebugTab.TIMINGS -> "Timings"
            DebugTab.EVIDENCE -> "Evidence"
            DebugTab.CROPS -> "Crops"
            DebugTab.READS -> "CNN reads"
            DebugTab.DECISIONS -> "Decisions"
            DebugTab.CNN -> "CNN state"
        }

/** A small labelled row; every panel is a table and they should all read the same. */
@Composable
internal fun StatRow(
    label: String,
    value: String,
    tone: androidx.compose.ui.graphics.Color = Accent,
) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = OnSurfaceMuted)
        // The value is a figure — every panel here is a table read down its right-hand column.
        Figure(value, tone)
    }
}
