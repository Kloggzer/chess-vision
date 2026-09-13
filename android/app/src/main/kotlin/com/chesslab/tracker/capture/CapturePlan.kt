package com.chesslab.tracker.capture

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * The shot list, as `docs/capture-plan.schema.json` defines it — that file is the authority and
 * this is a transcript of it, not a second design. Unknown keys are ignored so a key the planner
 * adds later reaches an older APK as silence instead of an exception.
 */
@Serializable
data class Placement(
    val square: String,
    val piece: String,
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

/** Nine keys because `docs/capture-plan.schema.json` requires nine — the list IS the schema. */
@Suppress("LongParameterList")
@Serializable
data class Shot(
    val id: String,
    val fix: String,
    val reason: String,
    val place: List<Placement> = emptyList(),
    val light: String? = null,
    @SerialName("reference_square") val referenceSquare: String,
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

/**
 * `data/reports/coverage-gaps.json` plus the `generated_at` the route reads off its mtime. It comes
 * from a BUILT dataset and does not move after an upload, so the screen shows that date beside it.
 */
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

internal const val HTTP_OK = 200
internal const val HTTP_UNAUTHORIZED = 401
