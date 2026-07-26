package com.chesslab.tracker.settings

import com.chesslab.tracker.speech.SpeechVerbosity
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
    /**
     * 1440p, not AUTO/1080p. The board fills roughly a third of the frame's width from a normal
     * seated position — 630 px of 1920, i.e. 79 px per square — and the CNN wants 128. At 2560
     * wide the same framing gives ~105 px per square, so the crops carry real detail instead of
     * interpolation. Costs nothing per frame that matters now that the warps are sized from the
     * measurement (`measuredBoardSize`) rather than fixed at 1600.
     */
    val resolutionMode: ResolutionMode = ResolutionMode.R1440,
    val orientation: BoardOrientation = BoardOrientation.WHITE_BOTTOM,
    val modelAsset: String = "model.onnx",
    val epRequest: EpRequest = EpRequest.AUTO,
    /** Read by 07b; only the settings screen writes it. Off means the payload is not assembled. */
    val debugEnabled: Boolean = false,
    /** 08c. Off by default: an app that starts talking uninvited is a bug, not a feature. */
    val speechEnabled: Boolean = false,
    val speechLanguage: String = "en-US",
    val speechVerbosity: SpeechVerbosity = SpeechVerbosity.WORDS,
    val speechAnnounceAlarms: Boolean = true,
    /** 08b's LAN spectator. Persisted so the flag stays inspectable; never read back to auto-start. */
    val spectatorEnabled: Boolean = false,
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
