package com.chesslab.tracker.ui.debug

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.cnn.CnnState
import com.chesslab.tracker.service.CnnRuntimeInfo
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnDanger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted

/** ATTACHED | ATTACHING | FAILED(reason) | DISABLED, plus the reason verbatim. */
internal fun attachLabel(state: CnnState): String =
    when (state) {
        is CnnState.Off -> "DISABLED"
        is CnnState.Attaching -> "ATTACHING"
        is CnnState.Ready -> "ATTACHED"
        is CnnState.Failed -> "FAILED(${state.reason})"
    }

internal fun attachTone(state: CnnState): Color =
    when (state) {
        is CnnState.Off -> OnSurfaceMuted
        is CnnState.Attaching -> Busy
        is CnnState.Ready -> Accent
        is CnnState.Failed -> Danger
    }

/**
 * `QNN (requested) -> NNAPI (actual)`, amber when they differ.
 *
 * A silent fall-through from the NPU to the CPU keeps the same fps and multiplies the latency;
 * showing only the provider the settings asked for is how that goes unnoticed for a session.
 */
internal fun epLine(runtime: CnnRuntimeInfo): String {
    val requested = runtime.requestedEp ?: "-"
    val actual = runtime.actualEp ?: "-"
    return if (requested == actual) actual else "$requested (requested) → $actual (actual)"
}

internal fun epTone(runtime: CnnRuntimeInfo): Color =
    if (runtime.actualEp != null && runtime.requestedEp != runtime.actualEp) Busy else Accent

/**
 * The banner text, or null.
 *
 * It is a PURE function of the attach state and takes no "dismissed" input, so dismissal is not
 * representable: the recorded bug is that a silent CNN failure survived an entire session, and
 * anything the user can wave away reproduces it.
 */
internal fun attachBannerText(state: CnnState): String? =
    if (state is CnnState.Failed) "CNN attach FAILED: ${state.reason} — tracking is diff-only" else null

@Composable
fun CnnAttachBanner(state: CnnState) {
    val text = attachBannerText(state) ?: return
    Text(
        text,
        style = MaterialTheme.typography.labelLarge,
        color = OnDanger,
        modifier = Modifier.fillMaxWidth().background(Danger).padding(8.dp),
    )
}

@Composable
fun CnnStatePanel(
    state: CnnState,
    viewModel: DebugViewModel,
) {
    val runtime by viewModel.runtime.collectAsStateWithLifecycle()
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(attachLabel(state), style = MaterialTheme.typography.titleLarge, color = attachTone(state))
        StatRow("execution provider", epLine(runtime), epTone(runtime))
        StatRow("model", runtime.model ?: "-", OnSurface)
        StatRow("input shape", runtime.inputShape ?: "-", OnSurface)
        StatRow("last infer ms (session only)", fmt(runtime.lastRunMs, 1), OnSurface)
        StatRow("observations", runtime.observations.toString(), OnSurface)
        if (state is CnnState.Failed) {
            Text(state.reason, style = MaterialTheme.typography.bodyMedium, color = Danger)
            TextButton(onClick = viewModel::onRetryCnnAttach) { Text("Retry attach", color = Danger) }
        }
    }
}
