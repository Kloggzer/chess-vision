package com.chesslab.tracker.camera

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlin.time.Duration
import kotlin.time.Duration.Companion.seconds

/**
 * Temporarily escalates the analysis resolution one rung while the engine is
 * uncertain, then steps back after the signal has been clear for a hold window.
 *
 * State machine (driven purely by [UncertaintySource.uncertainty] transitions over
 * virtual/real time; see the unit tests):
 *
 * - Uncertainty must be **sustained** for [escalateAfterS] before escalating — a
 *   short blip that clears within the window never escalates (no flapping).
 * - After escalation, the resolution is **held** for [holdS] once uncertainty
 *   clears; if uncertainty returns during the hold the controller stays escalated.
 * - When [CameraConfig.dynamicResolution] is `false`, [start] is a no-op and the
 *   resolution never changes.
 *
 * Escalation and hi-res stills ([TrackerCamera.captureHiRes]) are independent
 * mechanisms. Rescaling geometry on [activeResolution] changes is phase 04's job.
 */
class DynamicResolutionController(
    private val camera: ResolutionTarget,
    private val engine: UncertaintySource,
    private val scope: CoroutineScope,
    private val config: CameraConfig,
    escalateAfterS: Double = DEFAULT_ESCALATE_AFTER_S,
    holdS: Double = DEFAULT_HOLD_S,
) {
    private val escalateAfter: Duration = escalateAfterS.seconds
    private val hold: Duration = holdS.seconds

    private val baseResolution: Resolution = config.resolution
    private val _activeResolution = MutableStateFlow(baseResolution)

    /** Current analysis resolution; phase 04 observes this to rescale the warper. */
    val activeResolution: StateFlow<Resolution> = _activeResolution.asStateFlow()

    private var escalated = false
    private var job: Job? = null

    /** Begins observing uncertainty. No-op (fixed resolution) when disabled. */
    fun start() {
        if (!config.dynamicResolution || job != null) return
        job =
            scope.launch {
                engine.uncertainty.collectLatest { uncertain ->
                    if (uncertain) {
                        onUncertain()
                    } else {
                        onClear()
                    }
                }
            }
    }

    /** Stops observing and restores the base resolution. */
    fun stop() {
        job?.cancel()
        job = null
        if (escalated) {
            escalated = false
            applyResolution(baseResolution)
        }
    }

    /**
     * `collectLatest` cancels this on the next emission, so the [delay] only completes
     * when uncertainty stays high for the whole window.
     */
    private suspend fun onUncertain() {
        if (escalated) return
        delay(escalateAfter)
        escalated = true
        applyResolution(baseResolution.next())
    }

    /**
     * Cancelled if uncertainty returns during the hold, which keeps the controller
     * escalated (no flapping).
     */
    private suspend fun onClear() {
        if (!escalated) return
        delay(hold)
        escalated = false
        applyResolution(baseResolution)
    }

    private fun applyResolution(res: Resolution) {
        if (_activeResolution.value == res) return
        _activeResolution.value = res
        camera.setResolution(res)
    }

    companion object {
        const val DEFAULT_ESCALATE_AFTER_S: Double = 3.0
        const val DEFAULT_HOLD_S: Double = 10.0
    }
}
