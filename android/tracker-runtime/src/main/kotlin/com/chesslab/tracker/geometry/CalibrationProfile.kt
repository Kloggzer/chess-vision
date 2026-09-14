package com.chesslab.tracker.geometry

import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.margins4
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// The Android counterpart of `calibration.py:72 CalibrationProfile` — geometry CONFIG, never a
// stored position. Corners are `[a8, h8, h1, a1]` in SOURCE pixels (entry.md invariant 11).
//
// There is deliberately no `forResolution()`/rescale: a7dab73 deleted it because scaling a stored
// profile by a resolution ratio produced a silently wrong grid. Re-detect instead.

/** Current on-disk schema. Bump on any incompatible field change; never migrate blindly. */
const val PROFILE_SCHEMA_VERSION: Int = 3

/**
 * `config.DEFAULT_MARKER_MARGIN` — the fraction by which a marker's centre sits outside the
 * playing field, because the codes are printed/glued in the label border.
 *
 * 0.045 is measured, not chosen: swept against grid-line alignment it optimises at 0.040-0.050
 * on four independent recordings, two from the phone and two rendered. The old 0.06 over-indented
 * every profile made from it. THE default — nothing else may hold a second literal.
 */
const val DEFAULT_MARKER_MARGIN: Double = 0.045

private const val CORNER_FLOATS: Int = 8

/** Where the crop defaults come from — each number exists in exactly one place, its declaration. */
private val DEFAULT_GEOMETRY = BoardGeometry()

/** `config.CROP` (config.py:40-65). */
@Serializable
data class CropParams(
    /**
     * The whole crop, defaulted from [BoardGeometry] rather than restated here.
     *
     * A stored profile still carries all three, but the LIVE tracker crops the way the loaded
     * model declares ([withCropOf]): the size that has to be right is the one the ONNX graph takes
     * and the pad that has to be right is the one the training crops were cut with. Both are
     * properties of the model, not of the board — a stored profile written before specs/45 still
     * says `padSide = 0.10` and would otherwise keep serving it forever.
     */
    val outW: Int = DEFAULT_GEOMETRY.outW,
    val outH: Int = DEFAULT_GEOMETRY.outH,
    val padSide: Double = DEFAULT_GEOMETRY.padSide,
)

@Serializable
data class CalibrationProfile(
    val name: String,
    /** `config.DEFAULT_BOARD_SIZE`. */
    val boardSize: Int = 1600,
    /**
     * Markers sit this fraction outside the playing field — one value PER CORNER,
     * `[a8, h8, h1, a1]`.
     *
     * v2. The markers are glued on by hand and a re-stick moves each independently, so a single
     * number had to average an error it could not express. v1 profiles carry a bare number and
     * are DISCARDED rather than broadcast: the outset is measured geometry, and guessing that
     * all four corners kept the old value is exactly the silent-wrong-geometry failure this
     * schema check exists to prevent.
     */
    val margin: List<Double> = margins4(DEFAULT_MARKER_MARGIN),
    val markerDict: String = "DICT_4X4_50",
    val whitePov: Boolean = true,
    /** Size of the frame the corners were MEASURED on — informational for 05b's size guard. */
    val sourceWidth: Int,
    val sourceHeight: Int,
    /** 8 floats, `[a8x, a8y, h8x, h8y, h1x, h1y, a1x, a1y]`, source pixels. Never sorted. */
    val corners: FloatArray,
    val crop: CropParams = CropParams(),
    val savedAtMs: Long = 0L,
    val version: Int = PROFILE_SCHEMA_VERSION,
) {
    init {
        require(corners.size == CORNER_FLOATS) { "corners must be 8 floats, got ${corners.size}" }
    }

    /** What `:core-geometry` needs; the profile is the only place the mapping is written. */
    fun geometry(): BoardGeometry =
        BoardGeometry(
            boardSize = boardSize,
            margin = margin,
            whitePov = whitePov,
            padSide = crop.padSide,
            outW = crop.outW,
            outH = crop.outH,
            markerDict = markerDict,
        )

    // FloatArray identity would make `decode(encode(p)) == p` false, and the round-trip is the
    // test that guards corner ORDER.
    override fun equals(other: Any?): Boolean =
        this === other ||
            (other is CalibrationProfile && corners.contentEquals(other.corners) && sameScalars(other))

    override fun hashCode(): Int = 31 * scalarHash() + corners.contentHashCode()

    private fun sameScalars(o: CalibrationProfile): Boolean =
        name == o.name &&
            boardSize == o.boardSize &&
            margin == o.margin &&
            markerDict == o.markerDict &&
            whitePov == o.whitePov &&
            sourceWidth == o.sourceWidth &&
            sourceHeight == o.sourceHeight &&
            crop == o.crop &&
            savedAtMs == o.savedAtMs &&
            version == o.version

    private fun scalarHash(): Int =
        listOf(name, boardSize, margin, markerDict, whitePov, sourceWidth, sourceHeight, crop, savedAtMs, version)
            .hashCode()
}

/** Outcome of reading a persisted profile. A bad one is DISCARDED with a reason the UI shows. */
sealed interface ProfileLoad {
    data class Ok(
        val profile: CalibrationProfile,
    ) : ProfileLoad

    data class Discarded(
        val reason: String,
    ) : ProfileLoad

    data object Absent : ProfileLoad
}

private val json =
    Json {
        encodeDefaults = true
        ignoreUnknownKeys = false
    }

fun encodeProfile(profile: CalibrationProfile): String = json.encodeToString(CalibrationProfile.serializer(), profile)

/**
 * Decode a stored profile. An unknown/older `version`, a malformed payload or a corner array that
 * is not 8 floats are all discarded — a half-understood profile transposes the board silently,
 * which is worse than asking the user to recalibrate.
 */
fun decodeProfile(text: String?): ProfileLoad {
    if (text.isNullOrBlank()) return ProfileLoad.Absent
    val profile =
        runCatching { json.decodeFromString(CalibrationProfile.serializer(), text) }
            .getOrElse { return ProfileLoad.Discarded("stored calibration is unusable (${it.message})") }
    return if (profile.version != PROFILE_SCHEMA_VERSION) {
        ProfileLoad.Discarded("stored calibration is schema v${profile.version}, this build reads v$PROFILE_SCHEMA_VERSION")
    } else {
        ProfileLoad.Ok(profile)
    }
}
