package com.chesslab.tracker.sim

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.margins4
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.double
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File

// Two sources: `tests/data/testclips/<clip>.labels.json` is GROUND TRUTH plus the rendered corners;
// `parity/<clip>/meta.json` is the `effectiveConfig` Python ACTUALLY ran (Kotlin's defaults disagree,
// e.g. `occlusionColorThr` 3.0 vs 1.5, which would fake a port bug).

/** Walks up from the working directory to the repository root (the one holding `tests/data`). */
internal fun repoRoot(): File {
    var dir = File(System.getProperty("user.dir")!!).absoluteFile
    while (!File(dir, "tests/data/testclips").isDirectory) {
        dir = dir.parentFile ?: error("repo root not found above ${System.getProperty("user.dir")}")
    }
    return dir
}

private const val DEFAULT_CLIP_DIR = "tests/data/testclips"

/** `-Pchesslab.sim.clips`: a re-render goes into its OWN directory, never over the fixtures that
 *  produced `parity/`; names and `effectiveConfig` still come from `parity/index.json`. */
internal fun simClipDir(root: File): File {
    val spec = clipDirProperty().ifEmpty { DEFAULT_CLIP_DIR }
    val dir = File(spec).let { if (it.isAbsolute) it else File(root, spec) }
    require(dir.isDirectory) { "no clip directory at $dir" }
    return dir
}

/** True when the run reads the committed fixture clips — the only set with a proven Python baseline. */
internal fun usingDefaultClips(): Boolean = clipDirProperty().isEmpty()

/** `-Pchesslab.sim.defaults=true`: the SHIPPED `TrackerConfig()` — "are our values any good" rather
 *  than "does the port run like Python". A MEASUREMENT, reported, not a gate. */
internal fun usingShippedDefaults(): Boolean =
    System
        .getProperty("chesslab.sim.defaults")
        .orEmpty()
        .trim() == "true"

private fun clipDirProperty(): String =
    System
        .getProperty("chesslab.sim.clips")
        .orEmpty()
        .trim()

/** One model under comparison: a directory holding `model.onnx` + `config.json`. */
internal class SimModel(
    val name: String,
    val dir: File,
)

/** `-Pchesslab.sim.models=<dir>[,<dir>…]`, empty = what ships; swapping assets would make the APK
 *  depend on the last experiment. */
internal fun simModels(): List<SimModel> {
    val spec = System.getProperty("chesslab.sim.models").orEmpty().trim()
    val dirs =
        spec
            .split(",")
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .ifEmpty { listOf(ASSET_MODEL_DIR) }
    return dirs.map { path ->
        val dir = File(path).let { if (it.isAbsolute) it else File(repoRoot(), path) }
        require(File(dir, "model.onnx").isFile) { "no model.onnx in $dir" }
        SimModel(name = if (path == ASSET_MODEL_DIR) "app-assets" else dir.name, dir = dir)
    }
}

/** A bundled model, not the asset root: the root holds no `model.onnx`. */
private const val ASSET_MODEL_DIR = "android/app/src/main/assets/cnn_model/p4full-128"

/** What the Blender scene rendered — the answer every run is scored against. */
internal class SimTruth(
    val sans: List<String>,
    val startFen: String,
    /** The answer the promotion dialog would get; `q` when the clip promotes nothing. */
    val promotionPiece: Char,
    /** Per rendered frame: the true FEN, or null while the label marks the board occluded. */
    val fenPerFrame: List<String?>,
)

/** One simulated clip: the video, its geometry, its fixture config and its ground truth. */
internal class SimClip(
    val name: String,
    override val video: File,
    override val corners: List<DoubleArray>,
    /** Board size AND margin, one thing to `computeHomography`; see `SimClipMarginTest`. */
    override val geometry: BoardGeometry,
    override val fps: Double,
    override val config: TrackerConfig,
    val truth: SimTruth,
) : SimSource {
    override val startFen: String get() = truth.startFen
    override val promotionPiece: Char get() = truth.promotionPiece
    override val truthFens: List<String?> get() = truth.fenPerFrame
}

/** Every clip with a committed parity fixture; `blender-italian`/`-opera` have no `effectiveConfig`. */
internal fun simClips(): List<SimClip> {
    val root = repoRoot()
    val clipDir = simClipDir(root)
    val parity = File(root, "android/core-engine/src/test/resources/parity")
    val index = Json.parseToJsonElement(File(parity, "index.json").readText()).jsonObject
    return index.getValue("clips").jsonArray.map { it.jsonPrimitive.content }.map { name ->
        val labels = Json.parseToJsonElement(File(clipDir, "$name.labels.json").readText()).jsonObject
        val meta = Json.parseToJsonElement(File(parity, "$name/meta.json").readText()).jsonObject
        val boardSize = labels.getValue("board_size").jsonPrimitive.int
        SimClip(
            name = name,
            video = File(clipDir, "$name.mp4"),
            corners =
                labels.getValue("corners").jsonArray.map { point ->
                    val xy = point.jsonArray
                    doubleArrayOf(xy[0].jsonPrimitive.double, xy[1].jsonPrimitive.double)
                },
            geometry =
                BoardGeometry(
                    boardSize = boardSize,
                    // A Blender clip has no `margin` key and must keep reading 0.0.
                    margin = margins4(labels["margin"]?.jsonPrimitive?.double ?: 0.0),
                ),
            fps = meta.getValue("fps").jsonPrimitive.double,
            config =
                if (usingShippedDefaults()) {
                    // `boardSize` is measured geometry, not a preference: `FrameLoop.step` refuses a mismatch.
                    TrackerConfig(boardSize = boardSize)
                } else {
                    trackerConfigOf(meta.getValue("effectiveConfig").jsonObject)
                },
            truth =
                SimTruth(
                    sans = labels.getValue("san").jsonArray.map { it.jsonPrimitive.content },
                    startFen = labels["start_fen"]?.jsonPrimitive?.content ?: STARTPOS,
                    promotionPiece = promotionPieceOf(labels),
                    fenPerFrame = truthFenOf(labels),
                ),
        )
    }
}

/**
 * `frame_labels` are KEYFRAMES with a `hold` count (`sum(hold)` = frame count for all 20 clips,
 * 2026-07-25). Occluded frames are `null`: under a hand, disagreeing with the position is CORRECT.
 */
private fun truthFenOf(labels: JsonObject): List<String?> =
    labels.getValue("frame_labels").jsonArray.flatMap { entry ->
        val row = entry.jsonObject
        val fen = if (row.getValue("occluded").jsonPrimitive.boolean) null else row.getValue("fen").jsonPrimitive.content
        List(row.getValue("hold").jsonPrimitive.int) { fen }
    }

private const val PROMO_UCI_LENGTH = 5

private fun promotionPieceOf(labels: JsonObject): Char =
    labels
        .getValue("moves_uci")
        .jsonArray
        .map { it.jsonPrimitive.content }
        .firstOrNull { it.length == PROMO_UCI_LENGTH }
        ?.get(PROMO_UCI_LENGTH - 1) ?: 'q'

private fun JsonObject.d(key: String): Double = getValue(key).jsonPrimitive.double

private fun JsonObject.i(key: String): Int = getValue(key).jsonPrimitive.int

private fun JsonObject.b(key: String): Boolean = getValue(key).jsonPrimitive.boolean

/**
 * EVERY field from the fixture (a port-parity instrument, not a tuning one). The frame counts are
 * OVERRIDES like `ParityFixtures.toTrackerConfig`: attaching a CNN would drop them from 4/3/2 to 3/2/1.
 */
internal fun trackerConfigOf(cfg: JsonObject): TrackerConfig =
    TrackerConfig(
        motionThr = cfg.d("motionThr"),
        motionPxThr = cfg.d("motionPxThr"),
        zThr = cfg.d("zThr"),
        ambiguityMarginLl = cfg.d("ambiguityMarginLl"),
        nudgeTimeoutS = cfg.d("nudgeTimeoutS"),
        driftWindowS = cfg.d("driftWindowS"),
        maxChanged = cfg.i("maxChanged"),
        censusThr = cfg.d("censusThr"),
        censusZWeight = cfg.d("censusZWeight"),
        occlCensusThr = cfg.d("occlCensusThr"),
        cnnConfThr = cfg.d("cnnConfThr"),
        cnnCooldownS = cfg.d("cnnCooldownS"),
        cnnCheckIntervalS = cfg.d("cnnCheckIntervalS"),
        verifyWindow = cfg.i("verifyWindow"),
        cnnMinAgreement = cfg.d("cnnMinAgreement"),
        cnnMarginSquares = cfg.i("cnnMarginSquares"),
        recoveryMaxPlies = cfg.i("recoveryMaxPlies"),
        minConfidentBoard = cfg.i("minConfidentBoard"),
        minConfidentRecovery = cfg.i("minConfidentRecovery"),
        motionMargin = cfg.d("motionMargin"),
        overhang = cfg.d("overhang"),
        alignEvery = cfg.i("alignEvery"),
        alignScale = cfg.d("alignScale"),
        cornerJumpPx = cfg.d("cornerJumpPx"),
        motionHoldS = cfg.d("motionHoldS"),
        verifyTimeoutS = cfg.d("verifyTimeoutS"),
        occlusionColorThr = cfg.d("occlusionColorThr"),
        minGridLineCoverage = cfg.d("minGridLineCoverage"),
        diffClaheClip = cfg.d("diffClaheClip"),
        requireMotionForMove = cfg.b("requireMotionForMove"),
        motionRecencyS = cfg.d("motionRecencyS"),
        commitLlFloor = cfg.d("commitLlFloor"),
        detectScale = cfg.d("detectScale"),
        desyncObsN = cfg.i("desyncObsN"),
        verifyObsVotes = cfg.i("verifyObsVotes"),
        observerIntervalS = cfg.d("observerIntervalS"),
        darkLumaThr = cfg.d("darkLumaThr"),
        cnnVerify = cfg.b("cnnVerify"),
        liveAlign = cfg.b("liveAlign"),
        usePrior = cfg.b("usePrior"),
        boardSize = cfg.i("boardSize"),
        settleFramesOverride = cfg.i("settleFrames"),
        avgFramesOverride = cfg.i("avgFrames"),
        confirmFramesOverride = cfg.i("confirmFrames"),
    )
