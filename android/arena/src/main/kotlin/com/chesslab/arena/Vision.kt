package com.chesslab.arena

import com.chesslab.cnn.SquareClassifier
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.SquareCropper
import com.chesslab.geometry.allSquares
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.toBgrImage
import com.chesslab.geometry.warpBoardForCrops
import com.chesslab.tracker.cnn.CnnModelAssets
import com.chesslab.tracker.cnn.MODEL_FP32_FILE
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.geometry.boardGeometryFor
import com.chesslab.tracker.geometry.withCropOf
import com.chesslab.tracker.log.NoopTrackerLog
import com.chesslab.tracker.service.CnnRuntimeProbe
import com.chesslab.tracker.service.openClassifier
import com.chesslab.tracker.settings.AppSettings
import org.opencv.core.Mat
import java.io.File

/** Fed exactly as the phone feeds it: a 128 px box served to an 80 px graph threw on every observation
 *  while the run printed `cnn=run`. The crop comes from the model's own `config.json` only. */
class Vision(
    val model: String,
    assetRoot: File = File(ASSET_SOURCE),
) : AutoCloseable {
    private val assets = cnnAssets(model, assetRoot)

    val spec: ModelSpec =
        ModelSpec.parse(assets.stage().configJson).also {
            check(it.coverageOutput) {
                "'$model' is not a 13+1 model — the arena serves 13 class probabilities plus an " +
                    "independent coverage sigmoid, and nothing else. Available: $COVERAGE_MODELS"
            }
        }

    private val attached = openClassifier(assets, AppSettings(), CnnRuntimeProbe(), NoopTrackerLog, INTRA_OP_THREADS)
    private val classifier: SquareClassifier = attached.classifier

    val classes: List<String> = classifier.classes

    /** Column 13 is an INDEPENDENT coverage sigmoid, not a class probability. */
    val coverageOutput: Boolean = spec.coverageOutput

    val coverageGate: Double? = spec.coverageGate

    val backend: String = attached.backend

    fun geometryFor(quad: FloatArray): BoardGeometry = boardGeometryFor(quad).withCropOf(spec)

    /** 64 rows `a1..h8`, the class probabilities plus the coverage column where declared. */
    fun readSquares(
        frame: Mat,
        quad: FloatArray,
        geom: BoardGeometry = geometryFor(quad),
    ): Array<FloatArray> {
        val warp = warpBoardForCrops(frame, geom, cornersFromFlat(quad))
        try {
            val crops = SquareCropper().use { cropper -> allSquares().map { toBgrImage(cropper.crop(warp, it, geom)) } }
            return classifier.classify(crops)
        } finally {
            warp.release()
        }
    }

    override fun close() = classifier.close()

    private companion object {
        fun cnnAssets(
            model: String,
            assetRoot: File,
        ): CnnModelAssets {
            val source = File(assetRoot, model)
            check(source.isDirectory) {
                "no model '$model' at ${source.absolutePath} — available: ${assetRoot.list()?.sorted()?.joinToString()}"
            }
            return CnnModelAssets(
                open = { name -> File(source, name).takeIf { it.isFile }?.inputStream() },
                dir = File(STAGING, model),
                graph = MODEL_FP32_FILE,
            )
        }
    }
}

/** EINE Liste, die des APK: die eigene Kopie hier nannte vier nicht mehr gebuendelte Namen, und jedes Verb
 *  starb vor dem ersten Frame (`ServedModelsExistTest`). */
val COVERAGE_MODELS = com.chesslab.tracker.cnn.BUNDLED_MODELS

val DEFAULT_MODEL = com.chesslab.tracker.cnn.DEFAULT_MODEL

private const val STAGING = "../../tmp/arena-staging"

/** Four threads are bit-exact for this graph and roughly halve a cold run. */
private const val INTRA_OP_THREADS = 4
