package com.chesslab.tracker.settings

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// App-level settings: the knobs that are NOT `TrackerConfig` fields. They belong to the Android
// host (which camera mode, which graph, which execution provider, which way the board faces) and
// are persisted beside the config rather than inside it — `TrackerConfig` is the parity seam and
// must stay exactly what Python's tracker takes.

/**
 * What the camera is ASKED for.
 *
 * A wish, never a measurement: commit `a7dab73` passed the requested numbers on as truth, the
 * device delivered 4:3 where 16:9 was asked for, and the warp drifted ~2.3 ranks. The pipeline
 * calibrates against the DELIVERED size.
 */
enum class ResolutionMode(
    val label: String,
) {
    AUTO("Auto"),
    R1080("1080p"),
    R1440("1440p"),
    R2160("2160p"),
}

/** Which ONNX execution provider to REQUEST. What was actually selected is 07b's CNN panel. */
enum class EpRequest(
    val label: String,
) {
    AUTO("Auto (QNN → NNAPI → CPU)"),
    QNN("QNN / Hexagon NPU"),
    NNAPI("NNAPI"),
    CPU("CPU"),
}

/** Which physical corner is `a8`. Corner order is `[a8, h8, h1, a1]` (entry.md invariant 11). */
enum class BoardOrientation(
    val label: String,
    val whitePov: Boolean,
) {
    WHITE_BOTTOM("White plays from the bottom", true),
    BLACK_BOTTOM("Black plays from the bottom", false),
}

@Serializable
data class AppSettings(
    val resolutionMode: ResolutionMode = ResolutionMode.AUTO,
    val orientation: BoardOrientation = BoardOrientation.WHITE_BOTTOM,
    val modelAsset: String = "model.onnx",
    val epRequest: EpRequest = EpRequest.AUTO,
    /** Read by 07b; only the settings screen writes it. Off means the payload is not assembled. */
    val debugEnabled: Boolean = false,
)

private val json =
    Json {
        encodeDefaults = true
        ignoreUnknownKeys = true
    }

fun encodeAppSettings(settings: AppSettings): String = json.encodeToString(AppSettings.serializer(), settings)

/** An unreadable or half-understood payload falls back to the defaults — never to a partial one. */
fun decodeAppSettings(text: String?): AppSettings {
    if (text.isNullOrBlank()) return AppSettings()
    return runCatching { json.decodeFromString(AppSettings.serializer(), text) }.getOrElse { AppSettings() }
}
