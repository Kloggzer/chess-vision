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

/** ATTACHED | ATTACHING | FAILED(reason) | DISABLED, plus the reason verbatim. */
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

/**
 * True when the CNN silently landed on a provider other than the one asked for.
 *
 * Split out of [epTone] so the decision stays a pure function: the colour now comes from the
 * theme's palette and can only be read inside a composition, but *this* is what a test cares about.
 */
internal fun epFellBack(runtime: CnnRuntimeInfo): Boolean = runtime.actualEp != null && runtime.requestedEp != runtime.actualEp

/**
 * `v6-80 @ 80x80 · crop side=0.050 up=0.000` — which bundled model attached, the size it is fed,
 * and the box those pixels were cut out of.
 *
 * All three are what the app MEASURED, never what the settings asked for: the name is the
 * directory that was really staged, the size is the tensor built from that model's own
 * `config.json`, and the crop is the live geometry's. An A/B on a real board is worth nothing if
 * the panel cannot attribute what was just seen to a model — and since specs/45 that attribution
 * includes the box, because a model served pads it never declared is being shown a different
 * photograph of every square (the crop then reads `(LEGACY: the model declares no crop)`).
 */
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
        // The model FIRST, and in its own row: three are bundled and switchable, so every other
        // number on this screen is meaningless until this one is read.
        StatRow("model", modelLine(runtime), Accent)
        StatRow("graph", runtime.model ?: "-", OnSurface)
        StatRow("input shape", runtime.inputShape ?: "-", OnSurface)
        StatRow("last infer ms (session only)", fmt(runtime.lastRunMs, 1), OnSurface)
        StatRow("observations", runtime.observations.toString(), OnSurface)
        if (state is CnnState.Failed) {
            Text(state.reason, style = MaterialTheme.typography.bodyMedium, color = Danger)
            TextButton(onClick = viewModel::onRetryCnnAttach) { Text("Retry attach", color = Danger) }
        }
    }
}
