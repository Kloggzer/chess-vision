package com.chesslab.tracker.capture

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// Transcript of `docs/capture-plan.schema.json`, which is the authority. Unknown keys are ignored, so a
// key the planner adds later reaches an older APK as silence, not an exception.

/** Ein VORSCHLAG: `lo`/`hi` ist das Band, gegen das [assign] die Livemessung haelt. */
@Serializable
data class Placement(
    val square: String,
    val piece: String,
    val band: String = "",
    val lo: Int = 0,
    val hi: Int = BYTE_RANGE,
)

@Serializable
data class Gap(
    val piece: String,
    @SerialName("square_color") val squareColor: String,
    val band: String,
    val have: Int,
    val fix: String,
    @SerialName("corpus_in_band") val corpusInBand: Int,
)

/** Six keys because `docs/capture-plan.schema.json` requires six — the list IS the schema. */
@Serializable
data class Shot(
    val id: String,
    val reason: String,
    val place: List<Placement> = emptyList(),
    val height: String,
    val orientations: Int,
    val closes: List<Gap> = emptyList(),
) {
    /** `orientations` is a COUNT of turns; the screens and `capture.json` speak degrees. */
    fun orientationDeg(ply: Int): Int = if (orientations <= 0) 0 else (ply * (FULL_TURN / orientations)) % FULL_TURN
}

@Serializable
data class CapturePlan(
    @SerialName("generated_at") val generatedAt: String = "",
    val dataset: String = "",
    @SerialName("gaps_from") val gapsFrom: String = "",
    val shots: List<Shot> = emptyList(),
    /** Not in the schema: the route answers `{shots: [], why: <command>}` when no plan was computed. */
    val why: String? = null,
)

/** From a BUILT dataset, so it does not move after an upload — the screen shows its date beside it. */
@Serializable
data class CaptureCoverage(
    @SerialName("generated_at") val generatedAt: String = "",
    val dataset: String = "",
    @SerialName("thin_below") val thinBelow: Int = 0,
    val gaps: List<Gap> = emptyList(),
)

/** A plan the app could not get is a sentence on the screen, never an empty list read as "done". */
sealed interface PlanAnswer {
    data class Loaded(
        val plan: CapturePlan,
    ) : PlanAnswer

    data class Refused(
        val message: String,
    ) : PlanAnswer
}

internal val CAPTURE_JSON = Json { ignoreUnknownKeys = true }

private const val FULL_TURN = 360

/** Ein Band ohne obere Grenze reicht bis ans Ende der Grauskala, nicht bis 0. */
private const val BYTE_RANGE = 256

internal const val HTTP_OK = 200
internal const val HTTP_UNAUTHORIZED = 401
