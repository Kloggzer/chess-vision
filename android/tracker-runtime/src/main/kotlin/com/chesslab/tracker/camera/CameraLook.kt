package com.chesslab.tracker.camera

import kotlinx.coroutines.flow.StateFlow

/** Every axis is set on the SENSOR, never a picture edit: an edited frame would be diffed against an unedited
 *  one, hence no contrast or gamma. Each axis STEERS the automatic; only focus has a true manual mode. */
data class CameraLook(
    /** In the device's own index steps ([ExposureRange.stepEv]). 0 is "whatever auto-exposure decided". */
    val evIndex: Int = 0,
    val whiteBalance: WhiteBalance = WhiteBalance.AUTO,
    /** **A zoom change invalidates the board geometry**: the marker quad was measured at the old zoom.
     *  `OpticsLock` re-asserts this value after every rebind. */
    val zoomRatio: Float = 1f,
    /** 0 = infinity to 1 = the lens's nearest, or null for autofocus — which hunts, and a refocus changes every
     *  edge on the board at once. */
    val focus: Float? = null,
) {
    val isAuto: Boolean
        get() = evIndex == 0 && whiteBalance == WhiteBalance.AUTO && zoomRatio == 1f && focus == null

    /** A stored value may predate the bound device's ranges. */
    fun clampedTo(abilities: CameraAbilities?): CameraLook {
        if (abilities == null) return this
        return copy(
            evIndex = abilities.exposure?.let { evIndex.coerceIn(it.indices.first, it.indices.last) } ?: 0,
            whiteBalance = whiteBalance.takeIf { it in abilities.whiteBalance } ?: WhiteBalance.AUTO,
            zoomRatio = abilities.zoom?.let { zoomRatio.coerceIn(it.start, it.endInclusive) } ?: 1f,
            focus = focus?.coerceIn(0f, 1f)?.takeIf { abilities.canFocus },
        )
    }
}

/** The kelvin figures are labels, not a value sent to the device: Camera2 has no continuous kelvin control, and a
 *  hand-computed Planckian fit deleted the white balance instead of setting it. `TWILIGHT` means nothing indoors. */
enum class WhiteBalance(
    val label: String,
) {
    AUTO("Auto"),
    INCANDESCENT("Bulb"),
    WARM_FLUORESCENT("Warm tube"),
    FLUORESCENT("Tube"),
    DAYLIGHT("Daylight"),
    CLOUDY("Cloudy"),
    SHADE("Shade"),
    ;

    val kelvin: Int?
        get() =
            when (this) {
                AUTO -> null
                INCANDESCENT -> 2700
                WARM_FLUORESCENT -> 3000
                FLUORESCENT -> 4000
                DAYLIGHT -> 5500
                CLOUDY -> 6500
                SHADE -> 7500
            }
}

/** The step is a device property and NOT 1 EV — 1/6 on this phone, so `[-24, 24]` is ±4 EV. */
data class ExposureRange(
    val indices: IntRange,
    val stepEv: Float,
) {
    fun ev(index: Int): Float = index * stepEv
}

/** A control is rendered only when the device has it: a dead control invites "the app is broken". */
data class CameraAbilities(
    val exposure: ExposureRange? = null,
    val zoom: ClosedFloatingPointRange<Float>? = null,
    /** In diopters, 0 on a fixed-focus lens. `LENS_FOCUS_DISTANCE` is set as a fraction of it. */
    val minFocusDiopters: Float = 0f,
    val whiteBalance: List<WhiteBalance> = listOf(WhiteBalance.AUTO),
    val hasTorch: Boolean = false,
) {
    val canFocus: Boolean get() = minFocusDiopters > 0f

    val canWhiteBalance: Boolean get() = whiteBalance.size > 1
}

/** Ein Messwert, kein Stellwert: selbst stellen war die erste Fassung und ist live verworfen worden. */
data class ExposureSetting(
    val timeNs: Long,
    val iso: Int,
)

/** Beside the data rather than in `service/`: a screen reaching `OpticsLock` could touch it from the main thread. */
interface CameraLookPort {
    /** The WANT, clamped to [abilities] — not proof: the CameraX futures are not awaited, and an interop axis
     *  (focus, white balance) is a capture-request key the HAL may ignore silently. */
    val look: StateFlow<CameraLook>

    /** NULL while nothing is bound, not an empty [CameraAbilities]: that clamped the saved look away to automatic
     *  before the camera ever saw it. */
    val abilities: StateFlow<CameraAbilities?>

    fun setLook(next: CameraLook)

    fun focusReady(): Boolean = true

    /** A seed, not an answer: the HAL maximises its own contrast over its own region, so the result must survive
     *  the same confirmation a swept peak does. */
    fun focusOn(region: FocusRegion): Boolean = false

    /** In the 0..1 scale, or null while it hunts. */
    fun autoFocus(): Float? = null
}

data class FocusRegion(
    val cx: Float,
    val cy: Float,
    val size: Float,
)
