package com.chesslab.tracker.ui.settings

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.settings.ConfigCodec
import com.chesslab.tracker.settings.Knob
import com.chesslab.tracker.settings.KnobKind
import java.util.Locale

/** The seven concerns a knob can belong to. Order is the order of the screen. */
enum class KnobGroup(
    val title: String,
) {
    MOTION("Motion"),
    EVIDENCE("Evidence"),
    VETOES("Vetoes"),
    SCORING("Scoring"),
    CNN("CNN"),
    CAMERA("Camera"),
    GEOMETRY("Geometry"),
}

/**
 * One row of the settings screen: a [Knob] (which owns the get/set and the live-vs-restart
 * classification) plus what a person needs to tune it — where it sits, how far it may travel, and
 * one line of why, lifted from `src/chesslab/config.py:590-646`.
 *
 * The Python default is never re-declared here. It is read back off `TrackerConfig()`, whose
 * defaults ARE `TRACK_DEFAULTS` verbatim (entry.md invariant 12), so the number beside the value
 * cannot drift from the number the engine falls back to.
 */
class KnobUi(
    val knob: Knob,
    val group: KnobGroup,
    val min: Double,
    val max: Double,
    val step: Double,
    val help: String,
) {
    val key: String get() = knob.key
    val live: Boolean get() = knob.live
    val isFlag: Boolean get() = knob.kind == KnobKind.BOOL

    /** `NaN` is the "no override" marker, so this knob's range has an off position below [min]. */
    val isOptional: Boolean get() = knob.kind == KnobKind.OPTIONAL_INT

    val pythonDefault: Double get() = knob.get(ConfigCodec.defaults)

    fun valueOf(config: TrackerConfig): Double = knob.get(config)

    fun applyTo(
        config: TrackerConfig,
        value: Double,
    ): TrackerConfig = knob.set(config, clamp(value))

    fun resetIn(config: TrackerConfig): TrackerConfig = knob.set(config, pythonDefault)

    fun isDefault(config: TrackerConfig): Boolean = same(valueOf(config), pythonDefault)

    /** A slider hands back arbitrary doubles; the config may only ever see a legal one. */
    fun clamp(value: Double): Double =
        when {
            isFlag -> if (value != 0.0) 1.0 else 0.0
            isOptional && (value.isNaN() || value < min) -> Double.NaN
            knob.kind == KnobKind.DOUBLE -> snap(value.coerceIn(min, max))
            else -> Math.rint(value.coerceIn(min, max))
        }

    fun format(value: Double): String =
        when {
            isFlag -> if (value != 0.0) "on" else "off"
            value.isNaN() -> "auto"
            knob.kind != KnobKind.DOUBLE -> value.toInt().toString()
            else -> trimZeros(String.format(Locale.ROOT, "%.3f", value))
        }

    /** Sliders drift by float epsilon; a knob that reads 0.2500001 hides whether it is default. */
    private fun snap(value: Double): Double = Math.rint(value / step) * step
}

fun same(
    a: Double,
    b: Double,
): Boolean = a == b || (a.isNaN() && b.isNaN())

private fun trimZeros(text: String): String = text.trimEnd('0').trimEnd('.')
