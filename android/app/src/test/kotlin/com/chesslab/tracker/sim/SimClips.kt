package com.chesslab.tracker.sim

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.double
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File

// The clip catalogue of the end-to-end simulation.
//
// TWO sources, deliberately, because they answer different questions:
//   * `tests/data/testclips/<clip>.labels.json` — GROUND TRUTH (the move list the Blender scene
//     rendered) plus the frame corners. The clips carry no ArUco markers, so the corners are a
//     property of the render and are read, never detected — exactly what
//     `scripts/emit_parity_fixtures.py` does when it builds its throw-away profile with
//     `live_align=False`.
//   * `core-engine/src/test/resources/parity/<clip>/meta.json` — the `effectiveConfig` the Python
//     tracker ACTUALLY ran with. Kotlin's own `TrackerConfig` defaults disagree with it (e.g.
//     `occlusionColorThr` 3.0 vs 1.5), so building the config from defaults would fake a port bug.

/** Walks up from the working directory to the repository root (the one holding `tests/data`). */
internal fun repoRoot(): File {
    var dir = File(System.getProperty("user.dir")!!).absoluteFile
    while (!File(dir, "tests/data/testclips").isDirectory) {
        dir = dir.parentFile ?: error("repo root not found above ${System.getProperty("user.dir")}")
    }
    return dir
}

private const val DEFAULT_CLIP_DIR = "tests/data/testclips"

/**
 * Where the `<clip>.mp4` + `<clip>.labels.json` pairs are read from, via `-Pchesslab.sim.clips`.
 *
 * The default is the committed fixture set, and it must stay that way: those exact files produced
 * `core-engine/src/test/resources/parity/`, so `ClipReplayParityTest` is only meaningful against
 * them. A re-render at a different resolution therefore goes into its OWN directory (e.g.
 * `tests/data/testclips-hires`, ~112 px/square instead of ~31) and is selected here — never by
 * overwriting the fixtures. The clip NAMES and the per-clip `effectiveConfig` still come from
 * `parity/index.json`, so both sets run the identical catalogue with the identical tracker knobs
 * and only the pixels differ.
 */
internal fun simClipDir(root: File): File {
    val spec = clipDirProperty().ifEmpty { DEFAULT_CLIP_DIR }
    val dir = File(spec).let { if (it.isAbsolute) it else File(root, spec) }
    require(dir.isDirectory) { "no clip directory at $dir" }
    return dir
}

/** True when the run reads the committed fixture clips — the only set with a proven Python baseline. */
internal fun usingDefaultClips(): Boolean = clipDirProperty().isEmpty()

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

/**
 * The models the run compares, from `-Pchesslab.sim.models=<dir>[,<dir>…]` (repo-relative or
 * absolute). Empty property = the bundled app assets alone, i.e. exactly what ships.
 *
 * Selectable rather than hand-swapped assets: swapping files in `app/src/main/assets` to compare
 * two runs makes the committed APK content depend on which experiment ran last.
 */
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

/**
 * The DEFAULT bundled model, not the asset root: since the app bundles three of them side by side
 * (`assets/cnn_model/<model>/`), the root holds no `model.onnx` at all. The other two are ordinary
 * directories and can be compared by naming them in `-Pchesslab.sim.models`.
 */
private const val ASSET_MODEL_DIR = "android/app/src/main/assets/cnn_model/shipped"

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
    val video: File,
    val corners: List<DoubleArray>,
    val boardSize: Int,
    val fps: Double,
    val config: TrackerConfig,
    val truth: SimTruth,
)

/**
 * Every clip that has a committed parity fixture, in index order.
 *
 * `blender-italian` / `blender-opera` are excluded because `parity/index.json` skips them: they
 * have no `effectiveConfig`, so there is no non-invented config to run them with.
 */
internal fun simClips(): List<SimClip> {
    val root = repoRoot()
    val clipDir = simClipDir(root)
    val parity = File(root, "android/core-engine/src/test/resources/parity")
    val index = Json.parseToJsonElement(File(parity, "index.json").readText()).jsonObject
    return index.getValue("clips").jsonArray.map { it.jsonPrimitive.content }.map { name ->
        val labels = Json.parseToJsonElement(File(clipDir, "$name.labels.json").readText()).jsonObject
        val meta = Json.parseToJsonElement(File(parity, "$name/meta.json").readText()).jsonObject
        SimClip(
            name = name,
            video = File(clipDir, "$name.mp4"),
            corners =
                labels.getValue("corners").jsonArray.map { point ->
                    val xy = point.jsonArray
                    doubleArrayOf(xy[0].jsonPrimitive.double, xy[1].jsonPrimitive.double)
                },
            boardSize = labels.getValue("board_size").jsonPrimitive.int,
            fps = meta.getValue("fps").jsonPrimitive.double,
            config = trackerConfigOf(meta.getValue("effectiveConfig").jsonObject),
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
 * The true FEN of every RENDERED VIDEO FRAME, `null` where the label marks the board occluded.
 *
 * `frame_labels` are KEYFRAMES, not video frames: each entry carries a `hold` count of how many
 * frames it was rendered for, and `sum(hold)` equals the mp4's frame count exactly for all 20
 * clips (verified 2026-07-25). Indexing the array by video-frame index — which this did before —
 * silently scores frame 24 against keyframe 24 and makes every audit number meaningless.
 *
 * Occluded frames are dropped at the source: a hand over the board makes the model's disagreement
 * with the position CORRECT, and counting it as an error would mask the misreads that matter.
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
 * `meta.effectiveConfig` -> `TrackerConfig`, field for field.
 *
 * `settleFrames` / `avgFrames` / `confirmFrames` are passed as explicit OVERRIDES, exactly like
 * `ParityFixtures.toTrackerConfig`. That is the one decision worth stating: attaching a CNN flips
 * `EngineState.cnnOn`, and without the overrides the derived counts would silently drop from 4/3/2
 * to 3/2/1 — a second, confounding change on top of the one the experiment is about.
 */
internal fun trackerConfigOf(cfg: JsonObject): TrackerConfig =
    TrackerConfig(
        motionThr = cfg.d("motionThr"),
        motionPxThr = cfg.d("motionPxThr"),
        zThr = cfg.d("zThr"),
        ambiguityMarginLl = cfg.d("ambiguityMarginLl"),
        reanchorLlFloor = cfg.d("reanchorLlFloor"),
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
        occlusionColorThr = cfg.d("occlusionColorThr"),
        minGridLineCoverage = cfg.d("minGridLineCoverage"),
        reconnectGraceS = cfg.d("reconnectGraceS"),
        diffClaheClip = cfg.d("diffClaheClip"),
        requireMotionForMove = cfg.b("requireMotionForMove"),
        motionRecencyS = cfg.d("motionRecencyS"),
        commitLlFloor = cfg.d("commitLlFloor"),
        detectScale = cfg.d("detectScale"),
        desyncObsN = cfg.i("desyncObsN"),
        verifyObsVotes = cfg.i("verifyObsVotes"),
        observerIntervalS = cfg.d("observerIntervalS"),
        llK = cfg.d("llK"),
        darkLumaThr = cfg.d("darkLumaThr"),
        cnnVerify = cfg.b("cnnVerify"),
        liveAlign = cfg.b("liveAlign"),
        usePrior = cfg.b("usePrior"),
        boardSize = cfg.i("boardSize"),
        settleFramesOverride = cfg.i("settleFrames"),
        avgFramesOverride = cfg.i("avgFrames"),
        confirmFramesOverride = cfg.i("confirmFrames"),
    )
