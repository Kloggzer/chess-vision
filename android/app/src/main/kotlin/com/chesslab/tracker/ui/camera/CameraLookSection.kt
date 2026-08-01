package com.chesslab.tracker.ui.camera

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.camera.CameraLook
import com.chesslab.tracker.camera.ExposureRange
import com.chesslab.tracker.camera.WhiteBalance
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import kotlinx.coroutines.delay
import kotlin.math.roundToInt

/**
 * How long a drag has to stand still before the camera is told. See [BrightnessSlider].
 *
 * The first version had none: `Slider(onValueChange = …)` fires on every pixel of a drag and each
 * call rebuilt the whole repeating capture request. Measured on the phone, one short drag issued
 * **165 capture-request reconfigurations in nine seconds** — around sixty a second — and the picture
 * lagged the finger by a visible margin.
 */
private const val LIVE_APPLY_MS = 120L

/**
 * Brightness and white balance, for the screen where the picture is being judged.
 *
 * Both are set by LOOKING, so the controls belong under a live preview and not in a settings list.
 *
 * **What is rendered is the CAMERA's state, not the last gesture** — [look] comes from
 * `CameraLookPort.look`, which is what the device was actually told after clamping. The rule
 * `TorchLamp` already follows: a control that renders its own tap can drift out of step with the
 * device, and nothing about the screen would show it.
 */
@Composable
fun CameraLookSection(
    look: CameraLook,
    exposure: ExposureRange?,
    onLook: (CameraLook) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Picture", style = MaterialTheme.typography.titleSmall, color = OnSurface)
            if (!look.isAuto) {
                TextButton(onClick = { onLook(CameraLook()) }) {
                    Text("all back to auto", style = MaterialTheme.typography.labelMedium, color = OnSurfaceMuted)
                }
            }
        }
        BrightnessSlider(look, exposure, onLook)
        WhiteBalanceChips(look, onLook)
    }
}

/**
 * Exposure compensation, in the device's own EV steps.
 *
 * Two things are separated here, and the first version conflated them: the value under the FINGER
 * and the value the CAMERA holds. The finger drives the thumb every frame so the control feels
 * alive; the camera is told once the finger has stood still for [LIVE_APPLY_MS], and once more when
 * it lifts. Without the second the last position of a fast drag would never be applied; without the
 * first the picture would only change after the drag ended, and the whole point of the control is
 * to watch the picture while you move it.
 */
@Composable
private fun BrightnessSlider(
    look: CameraLook,
    exposure: ExposureRange?,
    onLook: (CameraLook) -> Unit,
) {
    var dragged by remember { mutableStateOf<Int?>(null) }
    val shown = dragged ?: look.evIndex
    LaunchedEffect(dragged) {
        val value = dragged ?: return@LaunchedEffect
        delay(LIVE_APPLY_MS)
        onLook(look.copy(evIndex = value))
    }
    Column(Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Brightness", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
            Text(
                text = exposure?.let { evLabel(it.ev(shown), shown == 0) } ?: "not available on this camera",
                style = MaterialTheme.typography.labelLarge,
                color = if (shown == 0) OnSurfaceMuted else Accent,
            )
        }
        Slider(
            // Disabled rather than parked at a made-up midpoint: before a camera is bound there is
            // no range, and a slider that opens somewhere invented jumps the picture on first touch.
            enabled = exposure != null,
            value = shown.toFloat(),
            onValueChange = { dragged = it.roundToInt() },
            onValueChangeFinished = {
                dragged?.let { onLook(look.copy(evIndex = it)) }
                dragged = null
            },
            valueRange = (exposure?.indices?.first ?: 0).toFloat()..(exposure?.indices?.last ?: 0).toFloat(),
        )
    }
}

/**
 * The illuminant, as the presets the device tunes for — see `CameraLook` for why not a kelvin slider.
 *
 * Chips rather than a slider because the values ARE discrete: there are seven, they are named, and
 * a slider would invent a continuum the camera does not have.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun WhiteBalanceChips(
    look: CameraLook,
    onLook: (CameraLook) -> Unit,
) {
    Column(Modifier.fillMaxWidth().padding(top = 2.dp)) {
        Text("Light", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            WhiteBalance.entries.forEach { value ->
                FilterChip(
                    selected = value == look.whiteBalance,
                    onClick = { onLook(look.copy(whiteBalance = value)) },
                    label = {
                        Text(
                            text = value.kelvin?.let { "${value.label} · $it K" } ?: value.label,
                            style = MaterialTheme.typography.labelMedium,
                        )
                    },
                )
            }
        }
    }
}

/** "auto (0.0 EV)" while untouched, "+1.3 EV" once it is not — the two states must not look alike. */
private fun evLabel(
    ev: Float,
    auto: Boolean,
): String = if (auto) "auto (0.0 EV)" else "%+.1f EV".format(ev)
