package com.chesslab.tracker.camera

import kotlinx.coroutines.flow.StateFlow

/**
 * The two things about the picture a user can only set by LOOKING at it: how bright it is, and what
 * colour the light is.
 *
 * Both STEER the device's automatic; neither switches it off. That is the whole design, and it is
 * the correction of the first attempt, which drove `CONTROL_AE_MODE_OFF` + `SENSOR_SENSITIVITY` and
 * `CONTROL_AWB_MODE_OFF` + `COLOR_CORRECTION_GAINS` and broke the image on the first drag:
 *
 * - **Brightness is exposure compensation**, not ISO. `CameraControl.setExposureCompensationIndex`
 *   is a CameraX API with a range, a unit and a current value the device will tell you
 *   ([ExposureRange]), and auto-exposure keeps running underneath — so it cannot pick a ruinous
 *   exposure time behind a gain the user chose, and there is no sensitivity range to clamp against.
 *   Manual ISO needs `CONTROL_AE_MODE_OFF`, which then requires the exposure time to be supplied as
 *   well; on this device the automatic sits at 10 ms, and every one of those problems exists only
 *   to reach a brightness that ±4 EV already covers.
 * - **White balance is an illuminant PRESET**, not per-channel gains. Measured on the phone
 *   (`24117RK2CG`): the automatic's own `COLOR_CORRECTION_GAINS` are `R 2.087 / G 1.000 / B 1.979`,
 *   because the sensor's spectral response is baked into them. A Planckian sRGB fit — which is what
 *   a kelvin-to-gains function computes — returns roughly `1.00 / 1.06 / 1.13` at daylight, so
 *   writing it does not set a colour temperature, it DELETES the white balance and leaves a green
 *   cast. The device's own presets carry gains and a colour matrix tuned for that sensor.
 */
data class CameraLook(
    /**
     * Exposure compensation in the device's own index steps — see [ExposureRange.stepEv] for what
     * one step is worth. 0 is "whatever auto-exposure decided", which is the untouched state.
     */
    val evIndex: Int = 0,
    val whiteBalance: WhiteBalance = WhiteBalance.AUTO,
) {
    val isAuto: Boolean get() = evIndex == 0 && whiteBalance == WhiteBalance.AUTO

    /** The device's range is only known once a camera is bound; a stored index may predate it. */
    fun clampedTo(range: ExposureRange?): CameraLook =
        if (range == null) this else copy(evIndex = evIndex.coerceIn(range.indices.first, range.indices.last))
}

/**
 * The illuminants `CONTROL_AWB_MODE` offers, in colour-temperature order.
 *
 * The kelvin figures are the nominal temperature of each named illuminant — they are labels, not a
 * value sent to the device. There is no continuous kelvin control in Camera2 at all: the only route
 * to one is per-channel gains, and see [CameraLook] for why those cannot be computed off-device.
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
 * What a screen needs to drive [CameraLook] — so the sliders can be driven by a fake.
 *
 * Kept here beside the data rather than in `service/`: the values ARE the camera's, and a screen
 * that could reach `OpticsLock` itself could touch it from the main thread.
 */
interface CameraLookPort {
    /**
     * What the CAMERA is set to, after clamping — never what was tapped.
     *
     * The same rule as `TorchLamp.torchOn`: a control that renders its own last gesture can drift
     * out of step with the device and there is no way to notice.
     */
    val look: StateFlow<CameraLook>

    /** The device's exposure-compensation range, or null before anything is bound. */
    val exposure: StateFlow<ExposureRange?>

    fun setLook(next: CameraLook)
}
