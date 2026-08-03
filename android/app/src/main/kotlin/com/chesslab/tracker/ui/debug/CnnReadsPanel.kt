package com.chesslab.tracker.ui.debug

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
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.service.DebugState
import com.chesslab.tracker.ui.Figure
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Stroke

private const val PERCENT = 100.0

/**
 * What the last glance actually read, per square.
 *
 * Conflicts against the believed FEN are pinned to their own section — that set IS `resync_check`'s
 * conflict list made visible. `nConfident` sits next to `minConfidentBoard` and
 * `minConfidentRecovery` because a glance short of either gate is discarded in silence, and from
 * the outside that is indistinguishable from a CNN that never ran.
 */
@Composable
fun CnnReadsPanel(
    state: DebugState,
    viewModel: DebugViewModel,
) {
    val ascending by viewModel.readsAscending.collectAsStateWithLifecycle()
    val view = remember(state, ascending) { cnnReadRows(state.payload, ascending) }
    Column(
        Modifier.fillMaxWidth().verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(Space.xs),
    ) {
        StatRow(
            "observation seq",
            state.payload.cnnSeq
                .takeIf { it >= 0 }
                ?.toString() ?: "none",
        )
        StatRow("age / infer ms", "${state.payload.cnnAgeMs} / ${fmt(state.payload.cnnInferMs, 1)}")
        StatRow(
            "confident squares",
            "${view.nConfident}  (board ${view.minConfidentBoard}, recovery ${view.minConfidentRecovery})",
            if (view.nConfident >= view.minConfidentBoard) Accent else Busy,
        )
        TextButton(onClick = viewModel::onToggleReadOrder) {
            Text(
                if (ascending) "sorted by confidence ascending" else "sorted by confidence descending",
                color = OnSurfaceMuted,
            )
        }
        if (view.conflicts.isNotEmpty()) {
            Text("conflicts with the believed position", style = MaterialTheme.typography.titleSmall, color = Danger)
            view.conflicts.forEach { ReadRow(it) }
        }
        Text("all squares", style = MaterialTheme.typography.titleSmall, color = OnSurfaceMuted)
        view.rest.forEach { ReadRow(it) }
    }
}

@Composable
private fun ReadRow(row: CnnReadRow) {
    val tone: Color =
        when {
            row.conflict -> Danger
            row.confident -> OnSurface
            else -> OnSurfaceMuted
        }
    Row(Modifier.fillMaxWidth().padding(vertical = Stroke.hairline), horizontalArrangement = Arrangement.spacedBy(Space.xs)) {
        // Six columns read down, so all six are figures whether or not they are numbers.
        Figure(row.square, tone, Modifier.weight(0.8f))
        Figure(row.label, tone, Modifier.weight(1.2f))
        Figure(pct(row.conf), tone, Modifier.weight(1f))
        Figure(if (row.occupied) "occ" else "empty", tone, Modifier.weight(1f))
        Figure(pct(row.pOccluded), tone, Modifier.weight(1f))
        Figure(row.believed, OnSurfaceMuted, Modifier.weight(1f))
    }
}

internal fun pct(value: Double): String = fmt(value * PERCENT, 0) + " %"
