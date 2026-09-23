package com.chesslab.tracker.ui.settings

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.settings.ConfigCodec
import com.chesslab.tracker.settings.Knob
import com.chesslab.tracker.settings.KnobKind
import java.util.Locale

/** Order is the order of the screen. The board size is a measurement, not a group ([NOT_A_SETTING]). */
enum class KnobGroup(
    val title: String,
) {
    MOTION("Motion"),
    EVIDENCE("Evidence"),
    VETOES("Vetoes"),
    SCORING("Scoring"),
    CNN("CNN"),
    CAMERA("Camera"),
}

/** The default is read back off `TrackerConfig()`, never re-declared, so it cannot drift from the engine's. */
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

    /** `NaN` is "no override", so the range has an off position below [min]. */
    val isOptional: Boolean get() = knob.kind == KnobKind.OPTIONAL_INT

    val pythonDefault: Double get() = knob.get(ConfigCodec.defaults)

    fun valueOf(config: TrackerConfig): Double = knob.get(config)

    fun applyTo(
        config: TrackerConfig,
        value: Double,
    ): TrackerConfig = knob.set(config, clamp(value))

    fun resetIn(config: TrackerConfig): TrackerConfig = knob.set(config, pythonDefault)

    fun isDefault(config: TrackerConfig): Boolean = same(valueOf(config), pythonDefault)

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

    /** A knob reading 0.2500001 hides whether it is default. */
    private fun snap(value: Double): Double = Math.rint(value / step) * step
}

fun same(
    a: Double,
    b: Double,
): Boolean = a == b || (a.isNaN() && b.isNaN())

private fun trimZeros(text: String): String = text.trimEnd('0').trimEnd('.')
