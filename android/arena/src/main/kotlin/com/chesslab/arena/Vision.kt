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

/**
 * The classifier, loaded and fed exactly the way the phone feeds it.
 *
 * Cutting the crops differently is the project's oldest silent failure — a 128 px box served to
 * an 80 px graph threw on every observation and the run still printed `cnn=run`. So the crop
 * geometry comes from the model's own `config.json` ([ModelSpec]) and from nowhere else.
 */
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

    /** The class column names, in the order [readSquares] returns them. */
    val classes: List<String> = classifier.classes

    /** True when column 13 is an INDEPENDENT coverage sigmoid rather than a class probability. */
    val coverageOutput: Boolean = spec.coverageOutput

    /** Above this coverage the model's own class read is not worth having. Follows from its accuracy. */
    val coverageGate: Double? = spec.coverageGate

    val backend: String = attached.backend

    /** The board geometry this model wants for a detected quad: its crop size, its pads. */
    fun geometryFor(quad: FloatArray): BoardGeometry = boardGeometryFor(quad).withCropOf(spec)

    /**
     * 64 rows in `a1..h8` order, each `classes.size` probabilities plus the coverage column when
     * the model declares one.
     */
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

/**
 * The 13+1 models: 13 class probabilities plus an independent coverage sigmoid. The 14-class runs
 * beside them read `occluded` as a CLASS, which is a different question about the same picture —
 * mixing both into one measurement would leave a difference unattributable.
 */
val COVERAGE_MODELS =
    listOf(
        "real13-ms-s3-hn4-bn80",
        "real13-ms-s2-bn80-bs256-swa1e4",
        "comp13-occ-bn-lr1e2-bs512",
    )

/** What a run reads unless it names another one. */
val DEFAULT_MODEL = COVERAGE_MODELS.first()

private const val STAGING = "../../tmp/arena-staging"

/** Four threads are bit-exact for this graph and roughly halve a cold run (measured on `:desktop`). */
private const val INTRA_OP_THREADS = 4
