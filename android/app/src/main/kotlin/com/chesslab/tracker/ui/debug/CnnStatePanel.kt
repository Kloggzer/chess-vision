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
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.cnn.CnnState
import com.chesslab.tracker.service.CnnRuntimeInfo
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnDanger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space

internal fun attachLabel(state: CnnState): String =
    when (state) {
        is CnnState.Off -> "DISABLED"
        is CnnState.Attaching -> "ATTACHING"
        is CnnState.Ready -> "ATTACHED"
        is CnnState.Failed -> "FAILED(${state.reason})"
    }

@androidx.compose.runtime.Composable
internal fun attachTone(state: CnnState): Color =
    when (state) {
        is CnnState.Off -> OnSurfaceMuted
        is CnnState.Attaching -> Busy
        is CnnState.Ready -> Accent
        is CnnState.Failed -> Danger
    }

/** A silent NPU to CPU fall-through keeps the fps and multiplies the latency. */
internal fun epLine(runtime: CnnRuntimeInfo): String {
    val requested = runtime.requestedEp ?: "-"
    val actual = runtime.actualEp ?: "-"
    return if (requested == actual) actual else "$requested (requested) → $actual (actual)"
}

internal fun epFellBack(runtime: CnnRuntimeInfo): Boolean = runtime.actualEp != null && runtime.requestedEp != runtime.actualEp

/** What was MEASURED, never what settings asked: the staged directory, the tensor size from its own
 *  `config.json`, and the live crop box — a model served pads it never declared sees other photographs. */
internal fun modelLine(runtime: CnnRuntimeInfo): String {
    val name = runtime.modelDir ?: "-"
    val size =
        runtime.inputShape
            ?.split("x")
            ?.takeLast(2)
            ?.joinToString("x")
    val head = if (size == null) name else "$name @ $size"
    return if (runtime.crop == null) head else "$head · crop ${runtime.crop}"
}

@androidx.compose.runtime.Composable
internal fun epTone(runtime: CnnRuntimeInfo): Color = if (epFellBack(runtime)) Busy else Accent

/** `lastRunMs` encodes "never ran" as 0.0; only ATTACHED has been timed. */
internal fun inferLine(
    state: CnnState,
    runtime: CnnRuntimeInfo,
): String = if (state is CnnState.Ready) fmt(runtime.lastRunMs, 1) else "-"

/** Takes no "dismissed" input: a silent CNN failure once survived a whole session. */
internal fun attachBannerText(state: CnnState): String? =
    if (state is CnnState.Failed) "CNN attach FAILED: ${state.reason} — tracking is diff-only" else null

@Composable
fun CnnAttachBanner(state: CnnState) {
    val text = attachBannerText(state) ?: return
    Text(
        text,
        style = MaterialTheme.typography.labelLarge,
        color = OnDanger,
        modifier = Modifier.fillMaxWidth().background(Danger).padding(Space.sm),
    )
}

@Composable
fun CnnStatePanel(
    state: CnnState,
    viewModel: DebugViewModel,
) {
    val runtime by viewModel.runtime.collectAsStateWithLifecycle()
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Space.sm)) {
        Text(attachLabel(state), style = MaterialTheme.typography.titleLarge, color = attachTone(state))
        StatRow("execution provider", epLine(runtime), epTone(runtime))
        // The model FIRST: several are switchable, and every other number is meaningless until this one is read.
        StatRow("model", modelLine(runtime), Accent)
        StatRow("graph", runtime.model ?: "-", OnSurface)
        StatRow("input shape", runtime.inputShape ?: "-", OnSurface)
        StatRow("last infer ms (session only)", inferLine(state, runtime), OnSurface)
        StatRow("observations", runtime.observations.toString(), OnSurface)
        if (state is CnnState.Failed) {
            Text(state.reason, style = MaterialTheme.typography.bodyMedium, color = Danger)
            TextButton(onClick = viewModel::onRetryCnnAttach) { Text("Retry attach", color = Danger) }
        }
    }
}
