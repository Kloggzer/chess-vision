package com.chesslab.tracker.capture

import com.chesslab.tracker.camera.CaptureObserved
import com.chesslab.tracker.io.writeAtomic
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

/**
 * What the device really did, beside what it was asked for. Measured: [deliveredSize] is read off
 * the `ImageProxy`, [bitRate] is what the encoder agreed to, [aeFpsRange] is null when the camera
 * advertised no locked range and therefore ran free.
 */
@Serializable
data class CaptureRecording(
    @SerialName("requested_size") val requestedSize: String,
    @SerialName("delivered_size") val deliveredSize: String? = null,
    @SerialName("requested_fps") val requestedFps: Int = 0,
    @SerialName("ae_fps_range") val aeFpsRange: String? = null,
    @SerialName("requested_bit_rate") val requestedBitRate: Int = 0,
    @SerialName("bit_rate") val bitRate: Int = 0,
    val notes: List<String> = emptyList(),
)

/** Was WIRKLICH stand, mit dem Grauwert, den das Feld beim Aufbau hatte. */
@Serializable
data class CapturePlaced(
    val square: String,
    val piece: String,
    val brightness: Int? = null,
)

@Serializable
data class CaptureSession(
    @SerialName("shot_id") val shotId: String,
    val height: String,
    val place: List<CapturePlaced> = emptyList(),
    val steps: List<CaptureStep> = emptyList(),
    val recording: CaptureRecording? = null,
    val note: String? = null,
)

const val CAPTURE_FILE = "capture.json"

/** The bundle's own mode, so `session.yaml` says what this recording is and `slice` is not guessed at. */
const val CAPTURE_MODE = "capture"

fun captureSessionOf(
    shot: Shot,
    steps: List<CaptureStep>,
    placed: List<Target> = emptyList(),
    recording: CaptureRecording? = null,
    note: String? = null,
): CaptureSession =
    CaptureSession(
        shotId = shot.id,
        height = shot.height.takeIf { it in HEIGHTS } ?: UNKNOWN_HEIGHT,
        // Die gemessene Belegung, nicht der Vorschlag: sie ist die Ground Truth des Imports.
        place =
            placed
                .filter { SQUARE.matches(it.square) }
                .map { CapturePlaced(it.square, it.piece, it.measured) },
        steps = steps,
        recording = recording,
        note = note,
    )

/** The camera's own answer, transcribed. Null before anything was armed — then nothing is claimed. */
fun captureRecordingOf(observed: CaptureObserved?): CaptureRecording? =
    observed?.let {
        CaptureRecording(
            requestedSize = "${it.requested.width}x${it.requested.height}",
            deliveredSize = it.deliveredSize,
            requestedFps = it.requested.fps,
            aeFpsRange = it.aeFpsRange,
            requestedBitRate = it.requested.bitRate,
            bitRate = it.bitRate,
            notes = it.notes,
        )
    }

fun writeCaptureSession(
    dir: File,
    session: CaptureSession,
): File =
    File(dir, CAPTURE_FILE).also {
        writeAtomic(it, CAPTURE_SESSION_JSON.encodeToString(CaptureSession.serializer(), session) + "\n")
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
