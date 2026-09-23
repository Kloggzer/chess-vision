package com.chesslab.tracker.geometry

import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.margins4
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// Geometry CONFIG, never a stored position. Corners `[a8, h8, h1, a1]` in SOURCE pixels. No rescale: scaling a
// stored profile by a resolution ratio produced a silently wrong grid. Re-detect instead.

/** Bump on any incompatible field change; never migrate blindly. */
const val PROFILE_SCHEMA_VERSION: Int = 3

/** Measured, not chosen: 0.040-0.050 optimum on four independent recordings. THE default — no second literal. */
const val DEFAULT_MARKER_MARGIN: Double = 0.045

private const val CORNER_FLOATS: Int = 8

private val DEFAULT_GEOMETRY = BoardGeometry()

@Serializable
data class CropParams(
    /** The LIVE tracker crops the way the loaded model declares ([withCropOf]): size and pad are properties of
     *  the model, and a pre-specs/45 profile would otherwise serve `padSide = 0.10` forever. */
    val outW: Int = DEFAULT_GEOMETRY.outW,
    val outH: Int = DEFAULT_GEOMETRY.outH,
    val padSide: Double = DEFAULT_GEOMETRY.padSide,
)

@Serializable
data class CalibrationProfile(
    val name: String,
    val boardSize: Int = 1600,
    /** One value PER CORNER: a re-stick moves each marker independently. v1 profiles are DISCARDED, not
     *  broadcast — guessing all four kept the old value is silent wrong geometry. */
    val margin: List<Double> = margins4(DEFAULT_MARKER_MARGIN),
    val markerDict: String = "DICT_4X4_50",
    val whitePov: Boolean = true,
    /** Informational for the size guard. */
    val sourceWidth: Int,
    val sourceHeight: Int,
    /** Source pixels. Never sorted. */
    val corners: FloatArray,
    val crop: CropParams = CropParams(),
    val savedAtMs: Long = 0L,
    val version: Int = PROFILE_SCHEMA_VERSION,
) {
    init {
        require(corners.size == CORNER_FLOATS) { "corners must be 8 floats, got ${corners.size}" }
    }

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

    // FloatArray identity would make `decode(encode(p)) == p` false, and the round-trip guards corner ORDER.
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

/** A half-understood profile transposes the board silently, which is worse than asking to recalibrate. */
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
