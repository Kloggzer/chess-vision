package com.chesslab.tracker.camera

import kotlinx.coroutines.flow.StateFlow

/**
 * What a camera app lets you set, for the picture this tracker reads a board out of.
 *
 * Every axis is set on the SENSOR through the platform, and nothing here is a picture edit. That is
 * the rule the first version broke by computing white-balance gains itself, and it is why there is
 * no contrast and no gamma control: the reference app applies those in software to the frame, and a
 * frame this app edited after capture is a frame the tracker would diff against an unedited one.
 *
 * Each axis STEERS the device's automatic rather than replacing it, wherever the platform offers
 * that. Only focus has a true manual mode, because "sharp on the board and never hunting again" is
 * the one thing an automatic cannot be asked for.
 */
data class CameraLook(
    /**
     * Exposure compensation in the device's own index steps — see [ExposureRange.stepEv] for what
     * one step is worth. 0 is "whatever auto-exposure decided", which is the untouched state.
     */
    val evIndex: Int = 0,
    val whiteBalance: WhiteBalance = WhiteBalance.AUTO,
    /**
     * Optical/digital zoom as a ratio, 1.0 being the full field of view.
     *
     * **A zoom change invalidates the board geometry.** The calibration profile's marker quad was
     * measured at whatever zoom was in force, so every square crop moves with it — the screen says
     * so, and `OpticsLock` re-asserts this value after every rebind instead of the hardcoded 1.0 it
     * used to pin.
     */
    val zoomRatio: Float = 1f,
    /**
     * Manual focus, 0 = infinity to 1 = the lens's nearest, or null for automatic.
     *
     * Null means the device's own autofocus, and it will hunt — a refocus between the reference
     * frame and the current one changes every edge on the board at once. Since the padlock went
     * (2026-08-30) a stated distance is the only thing that stops it.
     */
    val focus: Float? = null,
) {
    val isAuto: Boolean
        get() = evIndex == 0 && whiteBalance == WhiteBalance.AUTO && zoomRatio == 1f && focus == null

    /** The device's ranges are only known once a camera is bound; a stored value may predate them. */
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

/**
 * The illuminants `CONTROL_AWB_MODE` offers, in colour-temperature order.
 *
 * The kelvin figures are the nominal temperature of each named illuminant — they are labels, not a
 * value sent to the device. There is no continuous kelvin control in Camera2 at all: the only route
 * to one is per-channel gains, which are applied to RAW Bayer data and can therefore only be
 * computed by something that knows the sensor's spectral response. The device's presets carry the
 * gains AND the colour matrix its own tuning holds. Measured here: a hand-computed Planckian fit
 * deleted the white balance instead of setting it.
 *
 * `TWILIGHT` is deliberately absent. It is the one preset with no agreed temperature and no meaning
 * over an indoor board.
 */
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

    /** Nominal colour temperature of the illuminant, for the label. Null for [AUTO]. */
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

/**
 * What the device's exposure compensation is worth, straight off `CameraInfo.getExposureState`.
 *
 * The step is a device property and is NOT 1 EV — on this phone it is 1/6, so the advertised
 * `[-24, 24]` is ±4 EV. A slider that showed the raw index would be meaningless; [ev] is what the
 * user is shown.
 */
data class ExposureRange(
    val indices: IntRange,
    val stepEv: Float,
) {
    fun ev(index: Int): Float = index * stepEv
}

/**
 * What THIS camera actually offers, read off the bound device.
 *
 * The screen renders a control only when the corresponding member says the device has it. A control
 * shown dead is worse than one that is not there: it invites the user to conclude the app is broken,
 * which on this feature they already had cause to.
 */
data class CameraAbilities(
    /** Null when the device advertises no exposure compensation. */
    val exposure: ExposureRange? = null,
    /** Null when the camera cannot zoom at all (min == max). */
    val zoom: ClosedFloatingPointRange<Float>? = null,
    /**
     * The lens's nearest focus in diopters (`LENS_INFO_MINIMUM_FOCUS_DISTANCE`), 0 on a fixed-focus
     * lens. `LENS_FOCUS_DISTANCE` is set as a fraction of it, exactly as the reference app does.
     */
    val minFocusDiopters: Float = 0f,
    /** Only the presets this device advertises; always contains [WhiteBalance.AUTO]. */
    val whiteBalance: List<WhiteBalance> = listOf(WhiteBalance.AUTO),
    val hasTorch: Boolean = false,
) {
    val canFocus: Boolean get() = minFocusDiopters > 0f

    val canWhiteBalance: Boolean get() = whiteBalance.size > 1
}

/**
 * Zeit und Verstaerkung, wie das Geraet sie zuletzt GEWAEHLT hat — ein Messwert, kein
 * Stellwert. Selbst stellen war die erste Fassung und ist live verworfen worden
 * (`docs/board-exposure.md`).
 */
data class ExposureSetting(
    val timeNs: Long,
    val iso: Int,
)

/**
 * What a screen needs to drive [CameraLook] — so the controls can be driven by a fake.
 *
 * Kept here beside the data rather than in `service/`: the values ARE the camera's, and a screen
 * that could reach `OpticsLock` itself could touch it from the main thread.
 */
interface CameraLookPort {
    /**
     * The WANT, clamped to what the device advertises in [abilities] — not proof that the device
     * did it.
     *
     * The same rule as `TorchLamp.torchOn`, and it used to be written here as the opposite ("what
     * the CAMERA is set to, never what was tapped"), which the implementation has never done.
     * `CameraLookControl` publishes `want.clampedTo(abilities)` and then fires the CameraX calls
     * without awaiting their futures: a rejected zoom ratio or an out-of-range exposure index is
     * logged and nothing else, and an interop axis (focus, white balance) is a capture-request key
     * the HAL may ignore silently. So an axis the device advertises but declines still renders as
     * set. The clamp is what stops the UI offering an axis this camera does not have at all.
     */
    val look: StateFlow<CameraLook>

    /**
     * What this device offers, or NULL while nothing is bound.
     *
     * Null and not an empty [CameraAbilities]: "this camera has no zoom" and "no camera has
     * answered yet" are different answers, and conflating them made [CameraLook.clampedTo] drop
     * the saved look on the floor — the service hands it over before the first bind, so an empty
     * abilities set meant every axis was clamped away to automatic before the camera ever saw it.
     */
    val abilities: StateFlow<CameraAbilities?>

    fun setLook(next: CameraLook)
}
