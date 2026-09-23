package com.chesslab.tracker.settings

import com.chesslab.tracker.camera.CameraLook
import com.chesslab.tracker.camera.WhiteBalance
import com.chesslab.tracker.cnn.DEFAULT_MODEL
import com.chesslab.tracker.cnn.bundledModelOrDefault
import com.chesslab.tracker.speech.SpeechVerbosity
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

// Not `TrackerConfig` fields: that is the parity seam and must stay what Python's tracker takes.

/** A wish, never a measurement: the device delivered 4:3 for a 16:9 request and the warp drifted ~2.3 ranks. */
enum class ResolutionMode(
    val label: String,
) {
    AUTO("Auto"),
    R1080("1080p"),
    R1440("1440p"),
    R2160("2160p"),
}

/** A LOCKED range, never an upper bound: `[15, 30]` leaves auto-exposure its freedom, only `[15, 15]` halves the
 *  sensor, the ISP and every stage. `pinFrameRate` refuses a range the device does not advertise. */
enum class FrameRateMode(
    val label: String,
    val fps: Int,
) {
    FPS15("15 fps", 15),
    FPS24("24 fps", 24),
    FPS30("30 fps", 30),
}

/** What was actually selected is the debug screen's CNN panel. */
enum class EpRequest(
    val label: String,
) {
    // NNAPI left the automatic chain after a measured 5x regression.
    AUTO("Auto (QNN → XNNPACK → CPU)"),
    QNN("QNN / Hexagon NPU"),
    NNAPI("NNAPI"),
    CPU("CPU"),
}

enum class BoardOrientation(
    val label: String,
    val whitePov: Boolean,
) {
    WHITE_BOTTOM("White plays from the bottom", true),
    BLACK_BOTTOM("Black plays from the bottom", false),
}

private const val CURRENT_MODEL_RELEASE = 5

/** Not release-gated: there is no choice left to respect, only a directory that would fail its attach forever.
 *  Matched against the RAW stored name. */
internal val RETIRED_MODELS = setOf("shipped", "bn100-80", "bn50-80", "bn35-80", "v6-80", "v4-128")

/** Pinned to release 4 so a later bump cannot overrule the choice a second time. */
private const val LEGACY_DEFAULT_RELEASE = 4
internal val LEGACY_DEFAULT_MODELS = setOf("shipped", "bn100-80", "id35-80")

@Serializable
data class AppSettings(
    /** Lets a new APK migrate an old default once without overriding later explicit choices. */
    val modelRelease: Int = CURRENT_MODEL_RELEASE,
    /** 1440p: the board is ~630 px of 1920 (79 px per square) against the CNN's 128; at 2560 it is ~105. */
    val resolutionMode: ResolutionMode = ResolutionMode.R1440,
    /** 15: at 30 the tracker drew more than the charger delivered (490 mA). `engineConfig()` scales `motionThr`. */
    val frameRate: FrameRateMode = FrameRateMode.FPS15,
    val orientation: BoardOrientation = BoardOrientation.WHITE_BOTTOM,
    /** WHICH bundled model; [modelAsset] picks a graph FILE inside it. Decides crop size and box via `withCropOf`. */
    val modelDir: String = DEFAULT_MODEL,
    val modelAsset: String = "model.onnx",
    val epRequest: EpRequest = EpRequest.AUTO,
    /** Off means the payload is not assembled. */
    val debugEnabled: Boolean = false,
    /** Off by default: an app that starts talking uninvited is a bug, not a feature. */
    val speechEnabled: Boolean = false,
    val speechLanguage: String = "en-US",
    val speechVerbosity: SpeechVerbosity = SpeechVerbosity.WORDS,
    val speechAnnounceAlarms: Boolean = true,
    /** Never read back to auto-start. */
    val spectatorEnabled: Boolean = false,
    /** Flat, so `camera/` carries no serialization concern. Unlike the rest these ARE live and need no restart. */
    val cameraEvIndex: Int = 0,
    val cameraWhiteBalance: WhiteBalance = WhiteBalance.AUTO,
    val cameraZoomRatio: Float = 1f,
    val cameraFocus: Float? = null,
)

fun AppSettings.cameraLook(): CameraLook =
    CameraLook(
        evIndex = cameraEvIndex,
        whiteBalance = cameraWhiteBalance,
        zoomRatio = cameraZoomRatio,
        focus = cameraFocus,
    )

/** Every axis, or the save is a half-truth. */
fun AppSettings.withCameraLook(look: CameraLook): AppSettings =
    copy(
        cameraEvIndex = look.evIndex,
        cameraWhiteBalance = look.whiteBalance,
        cameraZoomRatio = look.zoomRatio,
        cameraFocus = look.focus,
    )

private val json =
    Json {
        encodeDefaults = true
        ignoreUnknownKeys = true
    }

fun encodeAppSettings(settings: AppSettings): String = json.encodeToString(AppSettings.serializer(), settings)

/** Silent on a build without the QNN AAR: `stage()` copies only the asked-for graph, so a device pinned here
 *  never got a new `model.onnx` — one ran an asset three model releases behind. */
private const val QNN_ASSET = "model.qnn.onnx"

/** Defaults, never a partial payload. [AppSettings.modelDir] is normalised rather than thrown on: a dropped
 *  model would otherwise fail its attach on every launch. */
fun decodeAppSettings(text: String?): AppSettings {
    if (text.isNullOrBlank()) return AppSettings()
    val decoded = runCatching { json.decodeFromString(AppSettings.serializer(), text) }.getOrElse { AppSettings() }
    val model = if (decoded.modelAsset == QNN_ASSET) AppSettings().modelAsset else decoded.modelAsset
    val storedModelRelease =
        runCatching {
            json
                .parseToJsonElement(text)
                .jsonObject["modelRelease"]
                ?.jsonPrimitive
                ?.intOrNull ?: 0
        }.getOrDefault(0)
    val stored = decoded.modelDir
    val modelDir =
        when {
            // RAW first: `bundledModelOrDefault` collapses a dropped name to the default. `RetiredModelBranchesTest`
            // wird laut, sobald ein kuenftiges APK einen dieser Namen wieder mitliefert.
            stored in RETIRED_MODELS -> DEFAULT_MODEL
            storedModelRelease < LEGACY_DEFAULT_RELEASE && stored in LEGACY_DEFAULT_MODELS -> DEFAULT_MODEL
            else -> bundledModelOrDefault(stored)
        }
    return decoded.copy(
        modelRelease = CURRENT_MODEL_RELEASE,
        modelAsset = model,
        modelDir = modelDir,
    )
}
