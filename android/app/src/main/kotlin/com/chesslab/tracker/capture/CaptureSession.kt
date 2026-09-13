package com.chesslab.tracker.capture

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.File

/**
 * `capture.json`, exactly as `docs/capture-session.schema.json` defines it — that file is the
 * authority, the import (01) and the axis count (03) read it, and `additionalProperties` is false
 * there, so nothing may be written that the schema does not name.
 */
@Serializable
data class CaptureStep(
    val ply: Int,
    @SerialName("orientation_deg") val orientationDeg: Int,
    @SerialName("elapsed_ns") val elapsedNs: Long,
    @SerialName("elapsed_ns_end") val elapsedNsEnd: Long? = null,
)

@Serializable
data class CaptureSession(
    @SerialName("shot_id") val shotId: String,
    val height: String,
    @SerialName("reference_square") val referenceSquare: String? = null,
    val steps: List<CaptureStep> = emptyList(),
    val note: String? = null,
)

const val CAPTURE_FILE = "capture.json"

/** The bundle's own mode, so `session.yaml` says what this recording is and `slice` is not guessed at. */
const val CAPTURE_MODE = "capture"

fun captureSessionOf(
    shot: Shot,
    steps: List<CaptureStep>,
    note: String? = null,
): CaptureSession =
    CaptureSession(
        shotId = shot.id,
        height = shot.height.takeIf { it in HEIGHTS } ?: UNKNOWN_HEIGHT,
        referenceSquare = shot.referenceSquare.takeIf { SQUARE.matches(it) },
        steps = steps,
        note = note,
    )

fun writeCaptureSession(
    dir: File,
    session: CaptureSession,
): File =
    File(dir, CAPTURE_FILE).also {
        it.writeText(CAPTURE_SESSION_JSON.encodeToString(CaptureSession.serializer(), session) + "\n")
    }

/** `explicitNulls = false` is load-bearing: the schema forbids keys it does not name, null included. */
private val CAPTURE_SESSION_JSON =
    Json {
        prettyPrint = true
        explicitNulls = false
        encodeDefaults = false
    }

/** The capture schema's own enum — the plan knows three, an unbuilt shot is the fourth. */
private val HEIGHTS = setOf("tief", "normal", "hoch")
private const val UNKNOWN_HEIGHT = "unbekannt"
private val SQUARE = Regex("^[a-h][1-8]$")
