package com.chesslab.tracker.analysis

/** `PowerManager.THERMAL_STATUS_MODERATE` — the device has already started throttling. */
private const val THERMAL_MODERATE = 2

/** 15 fps is the tracking budget; 1000/15 = 66 ms per frame. Above that the tracker is losing. */
private const val FRAME_BUDGET_MS = 66.0

private const val LOW_BATTERY_PERCENT = 20

/** Calibration and CNN warm-up must never be contended, so analysis waits out the first seconds. */
private const val WARMUP_MS = 3_000L

private const val MEDIAN_WINDOW = 15

/** Everything that can make analysis a bad idea right now. Plain data, so the decision is testable. */
data class GateInputs(
    val thermalStatus: Int = 0,
    val powerSaveMode: Boolean = false,
    val batteryPercent: Int = 100,
    val charging: Boolean = true,
    val trackingStableMs: Long = 0,
    val medianFrameMs: Double = 0.0,
)

/** User-facing analysis configuration. Off by default — the tracker is the product, this is not. */
data class AnalysisSettings(
    val enabled: Boolean = false,
    val respectPressure: Boolean = true,
    val options: AnalysisOptions = AnalysisOptions(),
)

/** Why analysis is suspended. `null` from [gateBlock] means it may run. */
enum class GateBlock { OFF, WARMUP, THERMAL, BATTERY, FRAME_BUDGET }

/** The rule for LIVE analysis — eval bar and the hint's mate line; any hit suspends, order only
 *  picks the reason shown. Below 15 fps live analysis is sacrificed, every time. The review pass
 *  is exempt by design (`ReviewHost`, `docs/game-review.md`); `offene-entscheidungen.md` 45. */
fun gateBlock(
    inputs: GateInputs,
    settings: AnalysisSettings = AnalysisSettings(),
): GateBlock? =
    when {
        !settings.enabled -> GateBlock.OFF
        inputs.trackingStableMs < WARMUP_MS -> GateBlock.WARMUP
        inputs.medianFrameMs > FRAME_BUDGET_MS -> GateBlock.FRAME_BUDGET
        !settings.respectPressure -> null
        inputs.thermalStatus >= THERMAL_MODERATE -> GateBlock.THERMAL
        inputs.powerSaveMode -> GateBlock.BATTERY
        // Nur ein GEMESSENER Stand sperrt: `getIntProperty` meldet `Integer.MIN_VALUE`, wo die
        // Eigenschaft fehlt, und der lief bis hierher als "leerer Akku" durch — auf so einem
        // Geraet lief die Analyse nie, und die Oberflaeche schob es auf den Akku.
        inputs.batteryPercent in 0..<LOW_BATTERY_PERCENT && !inputs.charging -> GateBlock.BATTERY
        else -> null
    }

/**
 * Rolling median of the tracker's `total` stage timing.
 *
 * A median and not a mean: one 300 ms frame (a GC pause, a rebind) must not stop analysis, but a
 * sustained slide below 15 fps must.
 */
class RollingMedian(
    private val window: Int = MEDIAN_WINDOW,
) {
    private val values = ArrayDeque<Double>()

    fun add(value: Double): Double {
        values.addLast(value)
        while (values.size > window) values.removeFirst()
        return median
    }

    val median: Double
        get() {
            if (values.isEmpty()) return 0.0
            val sorted = values.sorted()
            return sorted[sorted.size / 2]
        }
}
