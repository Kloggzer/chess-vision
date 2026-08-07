package com.chesslab.tracker.geometry

import com.chesslab.geometry.LensModel
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// The STORED form of the camera's optics, and the gate that decides whether it may be applied.
//
// The optics themselves are `LensModel`/`Undistorter` in `:core-geometry`, which know nothing about
// files, cameras or preferences. Everything host-shaped is here, beside `CalibrationProfile`, whose
// idioms this follows: versioned, decoded into a sealed result, and never silently migrated.

/** Current on-disk schema. Bump on any incompatible field change; never migrate blindly. */
const val LENS_SCHEMA_VERSION: Int = 1

/**
 * A measured lens, and the conditions it was measured under.
 *
 * [camera] and [zoom] are the fields that make this safe, and neither is decoration:
 *
 *  - **Size is not identity.** The rig webcam delivers 2560x1440 and so does the phone's request
 *    (`CameraModels`), so a size check — which was the ONLY guard this had — cannot tell one from
 *    the other. Measured, not assumed: the rig's stored calibration passes a size check against a
 *    phone frame.
 *  - **Distortion is zoom-dependent**, which `specs/24` states twice as a prohibition. And
 *    `AppSettings.cameraZoomRatio` is one of the few LIVE knobs, so without this the phone's own
 *    calibration would go stale the moment someone pinch-zoomed, with nothing saying so.
 *
 * An empty [camera] means the file does not say what it was measured on. That is not the same as a
 * mismatch and is not treated as one — see [lensFor].
 */
@Serializable
data class LensCalibration(
    /** Nine doubles, row-major. */
    val cameraMatrix: List<Double>,
    /** The five Brown coefficients `k1 k2 p1 p2 k3`. */
    val distCoeffs: List<Double>,
    val width: Int,
    val height: Int,
    /** Opaque host token — `webcam:0` on a PC, model plus camera id on a phone. "" is unidentified. */
    val camera: String = "",
    val zoom: Float = 1f,
    val rms: Double = Double.NaN,
    val version: Int = LENS_SCHEMA_VERSION,
)

/** The stored form as the optical model `:core-geometry` takes. */
fun LensCalibration.model(): LensModel = LensModel(cameraMatrix.toDoubleArray(), distCoeffs.toDoubleArray())

/**
 * Whether the camera's optics are corrected at all.
 *
 * This is Python's `CameraSpec.undistort`, which lives on the CAMERA and deliberately not in
 * `TRACK_DEFAULTS` — the reason it is here and not in `TrackerConfig`, which must stay exactly what
 * Python's tracker takes.
 *
 * [AUTO] is Python's rule made stronger. Python guesses by source type (a local index undistorts, a
 * URL does not); this asks whether a calibration actually matches the camera in front of it. On the
 * phone, where nothing writes one, AUTO costs a null check.
 */
enum class LensMode {
    /** On exactly when a calibration matches this camera. The default. */
    AUTO,

    /** The user asking for it: an unidentified calibration is allowed, a mismatched one still is not. */
    ON,

    /** Never. */
    OFF,
}

/** Outcome of asking for a lens. A refusal always says why, because "absent" and "wrong" differ. */
sealed interface LensLoad {
    data class Ok(
        val calibration: LensCalibration,
    ) : LensLoad

    data class Refused(
        val reason: String,
    ) : LensLoad

    data object Absent : LensLoad
}

/**
 * Whether this stored calibration may be applied to this camera, and if not, why not.
 *
 * The order matters and each step answers a different question. The camera check is the one that
 * exists because size is not identity; it is deliberately ahead of the size check, so a mismatch
 * between two cameras of the same resolution is reported as what it is rather than passing.
 *
 * [LensMode.ON] relaxes exactly one thing: a calibration with no [LensCalibration.camera] recorded.
 * That is a file whose provenance is unknown, and a human typing "yes" is a better identity check
 * than nothing. It does NOT relax a known mismatch, a size mismatch or a zoom mismatch — a mode
 * that could override those would make every guard here advisory.
 */
fun lensFor(
    stored: LensCalibration?,
    mode: LensMode,
    camera: String,
    width: Int,
    height: Int,
    zoom: Float = 1f,
): LensLoad {
    if (mode == LensMode.OFF) return LensLoad.Refused("lens undistortion is switched off")
    val lens = stored ?: return LensLoad.Absent
    return when {
        lens.version != LENS_SCHEMA_VERSION ->
            LensLoad.Refused("lens calibration is schema v${lens.version}, this build reads v$LENS_SCHEMA_VERSION")
        lens.camera.isEmpty() && mode != LensMode.ON ->
            LensLoad.Refused("the lens calibration does not say which camera it was measured on")
        lens.camera.isNotEmpty() && lens.camera != camera ->
            LensLoad.Refused("the lens was measured on '${lens.camera}', this is '$camera'")
        lens.width != width || lens.height != height ->
            LensLoad.Refused(
                "the lens was measured at ${lens.width}x${lens.height}, " +
                    "the camera delivers ${width}x$height — recalibrate at this size",
            )
        kotlin.math.abs(lens.zoom - zoom) > ZOOM_TOLERANCE ->
            LensLoad.Refused("the lens was measured at zoom ${lens.zoom}, the camera is at $zoom")
        else -> LensLoad.Ok(lens)
    }
}

/**
 * Unknown keys are IGNORED here, unlike `decodeProfile`'s, and the difference is the writer.
 *
 * A calibration profile is written by this app, so a field it does not recognise means something is
 * wrong. A lens calibration is EXPORTED — `data/lens/calib.json` comes out of the `.npz` Python
 * writes and carries provenance this build does not model (`createdAt`). Refusing it would report a
 * present, valid file as unusable, which is precisely the failure the `:desktop` version recorded
 * in its KDoc after losing time to it: the message said missing and the file was there.
 */
private val json =
    Json {
        encodeDefaults = true
        ignoreUnknownKeys = true
    }

/** Decodes a stored calibration. Unreadable is a REASON, never an absence — they send you elsewhere. */
fun decodeLens(text: String?): LensLoad {
    if (text.isNullOrBlank()) return LensLoad.Absent
    val lens =
        runCatching { json.decodeFromString(LensCalibration.serializer(), text) }
            .getOrElse { return LensLoad.Refused("stored lens calibration is unusable (${it.message})") }
    return LensLoad.Ok(lens)
}

/**
 * How far the zoom may drift before the calibration is stale.
 *
 * **A starting value, not a measurement.** No distribution of distortion against zoom exists for
 * either camera; 1 % is chosen to sit under any deliberate zoom change and over float noise in a
 * round-trip through JSON. Measure it before quoting it as if it were derived.
 */
private const val ZOOM_TOLERANCE = 0.01f
