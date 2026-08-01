package com.chesslab.tracker.ui.calibration

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.camera.ISO_MAX
import com.chesslab.tracker.camera.ISO_MIN
import com.chesslab.tracker.camera.KELVIN_MAX
import com.chesslab.tracker.camera.KELVIN_MIN
import com.chesslab.tracker.camera.ManualOptics
import com.chesslab.tracker.camera.ManualOpticsPort
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import kotlin.math.roundToInt

/**
 * Manual ISO and white balance, on the screen where the picture is already being judged.
 *
 * Here and not in Settings because both are things you set by LOOKING — the rectified preview is
 * two composables up, and a colour temperature typed into a settings list is a guess.
 *
 * **Per axis.** Each slider starts inactive and takes its axis over only when touched; the other
 * stays on the automatic-then-locked value the device converged to. A dark board usually needs the
 * gain and no colour opinion at all, and forcing both would be a worse picture, not a more
 * controlled one.
 *
 * The exposure TIME is deliberately not a slider. With `CONTROL_AE_MODE_OFF` it has to be supplied,
 * so `OpticsLock` reuses whatever the automatic converged to — a device left to pick one under
 * manual gain can choose 1/8 s, and the tracker's frame rate is not a thing to lose to a slider.
 */
@Composable
fun ManualOpticsSection(
    optics: ManualOpticsPort?,
    modifier: Modifier = Modifier,
) {
    if (optics == null) return
    var iso by remember { mutableStateOf<Int?>(null) }
    var kelvin by remember { mutableStateOf<Int?>(null) }

    fun push() = optics.setManual(ManualOptics(iso, kelvin))

    val range = optics.isoRange
    val isoLo = range?.first ?: ISO_MIN
    val isoHi = range?.last ?: ISO_MAX

    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Manual camera", style = MaterialTheme.typography.titleSmall, color = OnSurface)
            if (iso != null || kelvin != null) {
                TextButton(onClick = {
                    iso = null
                    kelvin = null
                    push()
                }) {
                    Text("back to auto", style = MaterialTheme.typography.labelMedium, color = OnSurfaceMuted)
                }
            }
        }
        OpticsSlider(
            label = "ISO",
            value = iso,
            auto = optics.settledIso,
            range = isoLo.toFloat()..isoHi.toFloat(),
            format = { it.toString() },
        ) {
            iso = it
            push()
        }
        OpticsSlider(
            label = "White balance",
            value = kelvin,
            auto = null,
            range = KELVIN_MIN.toFloat()..KELVIN_MAX.toFloat(),
            format = { "$it K" },
        ) {
            kelvin = it
            push()
        }
    }
}

/**
 * One axis. Untouched it reads "auto" and shows what the device settled on; the first drag takes it
 * over. There is no separate switch: a slider you have not moved is not an override, which is the
 * only reading of "auto" that cannot get out of step with what the camera is doing.
 */
@Composable
private fun OpticsSlider(
    label: String,
    value: Int?,
    auto: Int?,
    range: ClosedFloatingPointRange<Float>,
    format: (Int) -> String,
    onValue: (Int) -> Unit,
) {
    val shown = value ?: auto ?: ((range.start + range.endInclusive) / 2f).roundToInt()
    Column(Modifier.fillMaxWidth().padding(top = 2.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
            Text(
                text = if (value == null) "auto" + (auto?.let { " (${format(it)})" } ?: "") else format(value),
                style = MaterialTheme.typography.labelLarge,
                color = if (value == null) OnSurfaceMuted else Accent,
            )
        }
        Slider(
            value = shown.toFloat().coerceIn(range.start, range.endInclusive),
            onValueChange = { onValue(it.roundToInt()) },
            valueRange = range,
        )
    }
}
