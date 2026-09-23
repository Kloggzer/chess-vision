package com.chesslab.tracker.ui.debug

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import com.chesslab.tracker.service.DebugState
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Outline
import com.chesslab.tracker.ui.theme.OverlayChanged
import com.chesslab.tracker.ui.theme.OverlayOcclusion
import com.chesslab.tracker.ui.theme.OverlayShadow
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Stroke

private const val BOARD_N = 8

/** The three veto sets as three DIFFERENT visual channels: they mean opposite things for z. */
@Composable
fun EvidencePanel(state: DebugState) {
    var channel by remember { mutableStateOf(EvidenceChannel.FUSED_Z) }
    val cells = remember(state, channel) { evidenceCells(state.status, state.payload, channel) }
    val peak = remember(cells) { cells.mapNotNull { it.value }.maxOrNull()?.coerceAtLeast(state.payload.zThr) ?: 1.0 }

    Column(
        Modifier.fillMaxWidth().verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(Space.sm),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
            EvidenceChannel.entries.forEach { entry ->
                FilterChip(
                    selected = entry == channel,
                    onClick = { channel = entry },
                    label = { Text(entry.label, style = MaterialTheme.typography.labelSmall) },
                )
            }
        }
        Column(Modifier.fillMaxWidth().aspectRatio(1f)) {
            for (row in 0 until BOARD_N) {
                Row(Modifier.fillMaxWidth().weight(1f)) {
                    for (col in 0 until BOARD_N) {
                        EvidenceSquare(cells[row * BOARD_N + col], peak, Modifier.weight(1f).fillMaxSize())
                    }
                }
            }
        }
        Text(
            "shadow keeps z, occlusion zeroes it",
            style = MaterialTheme.typography.bodyMedium,
            color = OnSurface,
        )
        Legend()
        StatRow("best / second LL", "${fmt(state.status.bestLl, 2)} / ${fmt(state.status.secondLl, 2)}")
        StatRow("candidate", state.status.bestUci ?: "-")
        StatRow("changed", "${state.status.changed.size} / ${state.payload.maxChanged}")
        StatRow(
            "tainted (z zeroed)",
            state.payload.tainted
                .sorted()
                .joinToString(" ")
                .ifEmpty { "-" },
        )
        StatRow("grid coverage", fmt(state.payload.gridCoverage, 2))
        StatRow("motion %", fmt(state.payload.motion, 3))
        StatRow("zThr", fmt(state.payload.zThr, 2))
    }
}

private val EvidenceChannel.label: String
    get() =
        when (this) {
            EvidenceChannel.FUSED_Z -> "fused z"
            EvidenceChannel.GRAY -> "gray"
            EvidenceChannel.CENSUS -> "census"
        }

@Composable
private fun EvidenceSquare(
    cell: EvidenceCell,
    peak: Double,
    modifier: Modifier,
) {
    val ramp = ((cell.value ?: 0.0) / peak).coerceIn(0.0, 1.0).toFloat()
    Box(
        modifier
            .padding(Stroke.hairline)
            .background(Color(0xFF0E4C36).copy(alpha = 0.15f + 0.85f * ramp))
            .then(if (cell.role == EvidenceRole.OCCLUSION) Modifier.background(OverlayOcclusion) else Modifier)
            .then(if (cell.role == EvidenceRole.SHADOW) Modifier.background(OverlayShadow.copy(alpha = 0.45f)) else Modifier)
            .border(
                width = if (cell.role == EvidenceRole.CHANGED) Stroke.thick else Stroke.hairline,
                color = if (cell.role == EvidenceRole.CHANGED) OverlayChanged else Outline,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = if (cell.tainted) "${cell.square}*" else cell.square,
            style = MaterialTheme.typography.labelSmall,
            color = OnSurface,
            textAlign = TextAlign.Center,
        )
        Text(
            // A dash, never 0.0: no value is not a quiet square.
            text = cell.value?.let { fmt(it, 1) } ?: "-",
            style = MaterialTheme.typography.labelSmall,
            color = OnSurfaceMuted,
            modifier = Modifier.padding(top = Space.lg),
        )
    }
}

@Composable
private fun Legend() {
    Column(verticalArrangement = Arrangement.spacedBy(Space.hair)) {
        LegendRow(OverlayChanged, "changed — survived every veto, feeds the hypothesis")
        LegendRow(OverlayShadow, "shadow-vetoed — out of `changed`, z PRESERVED (vacate evidence)")
        LegendRow(OverlayOcclusion, "occlusion-vetoed — z ZEROED; `*` marks a latched taint")
        LegendRow(Accent, "cell fill ramps with the selected channel")
    }
}

@Composable
private fun LegendRow(
    color: Color,
    text: String,
) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
        Box(
            Modifier
                .padding(Space.hair)
                .background(color)
                .aspectRatio(1f)
                .fillMaxWidth(0.03f),
        )
        Text(text, style = MaterialTheme.typography.labelSmall, color = OnSurfaceMuted)
    }
}
