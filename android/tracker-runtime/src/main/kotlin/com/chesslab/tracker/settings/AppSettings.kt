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

/**
 * What the sensor is asked to RUN at — pinned onto `CONTROL_AE_TARGET_FPS_RANGE`.
 *
 * A LOCKED range, never an upper bound: `[15, 30]` leaves auto-exposure its old freedom, so only
 * `[15, 15]` halves the sensor, the ISP and every per-frame stage. Every entry is a range this
 * device advertises — `pinFrameRate` refuses to ask for one that is not (`docs/battery.md`).
 */
enum class FrameRateMode(
    val label: String,
    val fps: Int,
) {
    FPS15("15 fps", 15),
    FPS24("24 fps", 24),
    FPS30("30 fps", 30),
}

/** Which ONNX execution provider to REQUEST. What was actually selected is 07b's CNN panel. */
enum class EpRequest(
    val label: String,
) {
    // NNAPI left the automatic chain after a measured 5x regression; the label named it anyway.
    AUTO("Auto (QNN → XNNPACK → CPU)"),
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

private const val CURRENT_MODEL_RELEASE = 5

/**
 * Model directories the APK has stopped carrying (2026-08-20). Unlike [LEGACY_DEFAULT_MODELS] this
 * is not release-gated: there is no choice left to respect, only a directory that would fail its
 * attach forever. It is matched against the RAW stored name — see [decodeAppSettings].
 */
private val RETIRED_MODELS = setOf("shipped", "bn100-80", "bn50-80", "bn35-80", "v6-80", "v4-128")

/**
 * Models that were once the default. They move forward ONCE, at release 4 — pinned to that release
 * rather than to [CURRENT_MODEL_RELEASE] so a later bump cannot overrule the choice a second time.
 */
private const val LEGACY_DEFAULT_RELEASE = 4
private val LEGACY_DEFAULT_MODELS = setOf("shipped", "bn100-80", "id35-80")

@Serializable
data class AppSettings(
    /** Lets a new APK migrate an old default once without overriding later explicit choices. */
    val modelRelease: Int = CURRENT_MODEL_RELEASE,
    /**
     * 1440p, not AUTO/1080p. The board fills roughly a third of the frame's width from a normal
     * seated position — 630 px of 1920, i.e. 79 px per square — and the CNN wants 128. At 2560
     * wide the same framing gives ~105 px per square, so the crops carry real detail instead of
     * interpolation. Costs nothing per frame that matters now that the warps are sized from the
     * measurement (`measuredBoardSize`) rather than fixed at 1600.
     */
    val resolutionMode: ResolutionMode = ResolutionMode.R1440,
    /**
     * 15, not the sensor's 30: at 30 the tracker drew more than the charger delivered and the
     * battery fell while plugged in — 490 mA, `docs/battery.md`. It is NOT free. The regression set
     * reads 273/55/102 against 303/25/6, because `settleFrames` counts FRAMES for a window that
     * means TIME, so halving the rate halves it. Shipped at 15 on the user's call (2026-08-25);
     * 30 is the way back.
     */
    val frameRate: FrameRateMode = FrameRateMode.FPS15,
    val orientation: BoardOrientation = BoardOrientation.WHITE_BOTTOM,
    /**
     * WHICH bundled model — a directory under `assets/cnn_model/`, one of `BUNDLED_MODELS`.
     *
     * Orthogonal to [modelAsset], which picks a graph FILE inside it (fp32 vs the INT8/QDQ graph the
     * NPU needs). The bundled models declare different inference sizes and crop paddings, so this
     * knob decides both the size the crops are cut to and the box they are cut from —
     * `TrackerService` re-reads the selected model's `config.json` and applies `withCropOf` at its
     * one geometry writer.
     */
    val modelDir: String = DEFAULT_MODEL,
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
    /**
     * The camera screen's saved picture — see [cameraLook].
     *
     * Flat fields rather than a nested `CameraLook`, so `camera/` carries no serialization concern
     * and the JSON stays one level deep like every other knob here. Unlike the rest of this class
     * these ARE live: they reach the camera when they change and need no restart.
     */
    val cameraEvIndex: Int = 0,
    val cameraWhiteBalance: WhiteBalance = WhiteBalance.AUTO,
    val cameraZoomRatio: Float = 1f,
    /** Null is automatic focus; 0..1 is infinity..the lens's nearest. */
    val cameraFocus: Float? = null,
)

/** The saved picture as the camera's own type. */
fun AppSettings.cameraLook(): CameraLook =
    CameraLook(
        evIndex = cameraEvIndex,
        whiteBalance = cameraWhiteBalance,
        zoomRatio = cameraZoomRatio,
        focus = cameraFocus,
    )

/** [cameraLook], the other way round — what "Save" writes. Every axis, or the save is a half-truth. */
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

/**
 * The quantized graph, selectable only while a QNN-capable build existed.
 *
 * Phase 01 dropped the `onnxruntime-android-qnn` AAR, so `addQnn` now falls through to CPU and the
 * INT8/QDQ graph runs on a provider it was never quantized for. Worse, it is silent: `stage()` only
 * copies the graph it is asked for, so a device pinned to this value never receives a new
 * `model.onnx` at all. One was found on 2026-07-27 still running the asset from commit `b24f1f3`,
 * three model releases behind — every accuracy number quoted for that phone was measured on a graph
 * it was not executing.
 */
private const val QNN_ASSET = "model.qnn.onnx"

/**
 * An unreadable or half-understood payload falls back to the defaults — never to a partial one.
 *
 * Stored values otherwise win over changed defaults forever; see [QNN_ASSET] for what that cost.
 *
 * [AppSettings.modelDir] is normalised for the same reason and NOT by throwing: a build that drops
 * or renames a bundled model would otherwise leave the device naming a directory the APK no longer
 * has — an attach that fails on every launch. Normalising one field beats resetting all of them,
 * which is what an unknown enum value would do here.
 */
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
            // RAW first: `bundledModelOrDefault` collapses a name this APK dropped to the default,
            // so a membership test on its result can never see a retired one (fixed 2026-08-20).
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
