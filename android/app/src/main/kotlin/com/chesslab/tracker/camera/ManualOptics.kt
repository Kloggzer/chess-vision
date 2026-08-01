package com.chesslab.tracker.camera

import kotlin.math.pow

/**
 * Manual sensor values, as the user set them. `null` means "leave it to the device".
 *
 * They REPLACE the automatic for the axis they name and nothing else: an ISO of 400 with a null
 * kelvin runs manual exposure under automatic-then-locked white balance. That partial mode is the
 * common case — a board that is simply too dark needs the gain, not a colour opinion.
 */
data class ManualOptics(
    /** Sensor gain, clamped to the device's own `SENSOR_INFO_SENSITIVITY_RANGE`. */
    val iso: Int? = null,
    /** White balance in kelvin; drives the colour-correction gains directly. */
    val kelvin: Int? = null,
) {
    val isAuto: Boolean get() = iso == null && kelvin == null
}

/** The slider's range. Wider than any phone's sensor; the device's own range clamps it. */
const val ISO_MIN = 50
const val ISO_MAX = 6400

/**
 * Warm tungsten to cool shade. Below 2000 K nothing indoors is that orange and the gains go
 * degenerate; above 9000 K the correction is inverted enough to look broken rather than cool.
 */
const val KELVIN_MIN = 2000
const val KELVIN_MAX = 9000

/**
 * Kelvin as per-channel gains, the way a Camera2 manual white balance is actually set.
 *
 * There is no `WHITE_BALANCE_KELVIN` capture key — `CONTROL_AWB_MODE_OFF` plus
 * `COLOR_CORRECTION_GAINS` is the only route, so a colour temperature has to become four channel
 * gains here. This is the standard Planckian approximation (Tanner Helland's piecewise fit),
 * normalised so the smallest gain is 1.0: the sensor can only ever amplify, and scaling a channel
 * below unity would darken the frame as a side effect of a colour choice.
 *
 * Returns `[red, greenEven, greenOdd, blue]` rather than an `RggbChannelVector`: that type is
 * Android framework, so returning it would put this arithmetic — the part that is easy to get
 * subtly wrong — beyond the reach of a JVM unit test. `OpticsLock` builds the vector, which is
 * where the framework belongs anyway.
 *
 * Green is the reference channel and both green gains are equal — a phone sensor's two green
 * photosites are the same filter, and splitting them is a tint control, which this is not.
 */
fun kelvinToGains(kelvin: Int): FloatArray {
    val t = kelvin.coerceIn(KELVIN_MIN, KELVIN_MAX) / 100.0
    val red = if (t <= 66) 255.0 else 329.698727446 * (t - 60).pow(-0.1332047592)
    val green =
        if (t <= 66) {
            99.4708025861 * kotlin.math.ln(t) - 161.1195681661
        } else {
            288.1221695283 * (t - 60).pow(-0.0755148492)
        }
    val blue =
        when {
            t >= 66 -> 255.0
            t <= 19 -> 0.0
            else -> 138.5177312231 * kotlin.math.ln(t - 10) - 305.0447927307
        }
    // A channel the model drove to zero must not become an infinite gain.
    val r = 255.0 / red.coerceAtLeast(1.0)
    val g = 255.0 / green.coerceIn(1.0, 255.0)
    val b = 255.0 / blue.coerceAtLeast(1.0)
    val floor = minOf(r, g, b)
    return floatArrayOf((r / floor).toFloat(), (g / floor).toFloat(), (g / floor).toFloat(), (b / floor).toFloat())
}
