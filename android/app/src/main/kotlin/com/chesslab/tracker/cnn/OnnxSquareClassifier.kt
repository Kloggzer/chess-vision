package com.chesslab.tracker.cnn

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import ai.onnxruntime.providers.NNAPIFlags
import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.cnn.SquareClassifier
import com.chesslab.cnn.preprocessInto
import com.chesslab.cnn.softmax
import com.chesslab.engine.api.BgrImage
import com.chesslab.tracker.settings.EpRequest
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import java.util.EnumSet

private const val CHANNELS = 3
private const val FLOAT_BYTES = 4

/** Qualcomm HTP (NPU) backend library, bundled inside the onnxruntime-android-qnn AAR. */
private const val QNN_HTP_LIB = "libQnnHtp.so"

/** An execution provider. The graph it is allowed to run comes from [StagedModel], not from here. */
internal enum class Ep(
    val backend: String,
) {
    QNN("QNN-HTP(NPU)"),
    NNAPI("NNAPI"),
    CPU("CPU"),
}

/** QNN runs **quantized graphs only**; NNAPI and CPU take whichever graph 07a selected. */
internal fun modelFor(
    staged: StagedModel,
    ep: Ep,
): File = if (ep == Ep.QNN) requireNotNull(staged.qnn) else staged.fp32

/**
 * The providers to try, in order.
 *
 * QNN (Hexagon NPU) is not even offered without the quantized graph — the HTP backend rejects
 * float32. An explicit [request] cuts everything ABOVE it off the chain, so "CPU" really means CPU
 * and a suspected NPU problem can be ruled in or out; what stays BELOW it is kept, because a
 * provider that fails to build must still leave the app with a classifier. A request the device
 * cannot serve (QNN with no quantized graph) falls back to the whole automatic chain, and the
 * caller reports requested-vs-actual rather than pretending it got what it asked for.
 */
internal fun epChain(
    hasQnnModel: Boolean,
    request: EpRequest = EpRequest.AUTO,
): List<Ep> {
    val available = if (hasQnnModel) Ep.entries.toList() else listOf(Ep.NNAPI, Ep.CPU)
    val head =
        when (request) {
            EpRequest.AUTO -> return available
            EpRequest.QNN -> Ep.QNN
            EpRequest.NNAPI -> Ep.NNAPI
            EpRequest.CPU -> Ep.CPU
        }
    return if (head in available) available.dropWhile { it != head } else available
}

/** The head of the chain — what the app ASKED for, next to which 07b renders what it got. */
fun requestedBackend(
    staged: StagedModel,
    request: EpRequest,
): String = epChain(staged.qnn != null, request).first().backend

/** The native session, behind a seam so the wrapper is testable without ORT natives. */
internal interface SessionRunner : AutoCloseable {
    val backend: String
    val model: String

    /** @return `batch * classes` logits, flat and row-major. */
    fun run(
        input: FloatBuffer,
        shape: LongArray,
    ): FloatArray
}

/**
 * `:core-cnn`'s [SquareClassifier] on ONNX Runtime. All 64 crops go through ONE session call —
 * the graph is exported with a dynamic batch dimension (`[batch, 3, 128, 128]`, opset 17).
 * Preprocessing is `:core-cnn`'s `preprocess` (the `serving.py predict_arrays` contract); a
 * second copy here would be a parity fork.
 */
class OnnxSquareClassifier internal constructor(
    private val spec: ModelSpec,
    private val runner: SessionRunner,
) : SquareClassifier,
    AutoCloseable {
    override val classes: List<String> get() = spec.classes
    val backend: String get() = runner.backend
    val model: String get() = runner.model

    /** Pure inference time of the last batch, for the debug screen. */
    @Volatile
    var lastRunMs: Double = 0.0
        private set

    private val batch = ALL_SQUARES.size
    private val shape = longArrayOf(batch.toLong(), CHANNELS.toLong(), spec.outHeight.toLong(), spec.outWidth.toLong())

    /** The tensor the graph is actually fed, for 07b's debug screen. */
    val inputShape: String get() = shape.joinToString("x")

    // Direct and reused: ORT reads the tensor from native memory, and reallocating 12 MB per
    // observation would churn the heap at observer rate.
    private val input: FloatBuffer =
        ByteBuffer
            .allocateDirect(batch * CHANNELS * spec.outWidth * spec.outHeight * FLOAT_BYTES)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()

    // Reused for the same reason as [input]: `preprocess` would hand back a fresh 12.6 MB array
    // per observation. Writing it here and bulk-putting is one memcpy and zero allocation.
    private val staging = FloatArray(batch * CHANNELS * spec.outWidth * spec.outHeight)

    override fun classify(crops: List<BgrImage>): Array<FloatArray> {
        require(crops.size == batch) { "expected $batch crops, got ${crops.size}" }
        preprocessInto(crops, spec.outWidth, spec.outHeight, staging, spec.mean, spec.std)
        input.clear()
        input.put(staging)
        input.flip()
        val started = System.nanoTime()
        val logits = runner.run(input, shape)
        lastRunMs = (System.nanoTime() - started) / NANOS_PER_MS
        val width = spec.classes.size
        require(logits.size == batch * width) { "model returned ${logits.size} logits, expected ${batch * width}" }
        // The head emits log-probabilities (HierarchicalHead); softmax over them is correct.
        return Array(batch) { row -> softmax(logits.copyOfRange(row * width, (row + 1) * width)) }
    }

    override fun close() {
        runner.close()
    }

    companion object {
        private const val NANOS_PER_MS = 1_000_000.0

        /**
         * Walks the EP chain and returns the first classifier that builds. Failures of a
         * single provider are WARN + fall through; a total failure throws, and the caller
         * ([CnnObserver.attach]) turns that into a sticky [CnnState.Failed].
         */
        fun open(
            staged: StagedModel,
            log: CnnLog,
            request: EpRequest = EpRequest.AUTO,
        ): OnnxSquareClassifier {
            val spec = ModelSpec.parse(staged.configJson)
            val env = OrtEnvironment.getEnvironment()
            var last: Throwable? = null
            for (choice in epChain(staged.qnn != null, request)) {
                val attempt = runCatching { OrtSessionRunner(env, modelFor(staged, choice), choice) }
                attempt.onSuccess { return OnnxSquareClassifier(spec, it) }
                attempt.onFailure {
                    last = it
                    log.warn("CNN EP ${choice.backend} unavailable, falling back: ${it.message}", it)
                }
            }
            throw IllegalStateException("no ONNX execution provider could load ${staged.dir}", last)
        }
    }
}

private class OrtSessionRunner(
    private val env: OrtEnvironment,
    modelFile: File,
    choice: Ep,
) : SessionRunner {
    override val backend: String = choice.backend

    /** The file that was really loaded — never the one 07a asked for. */
    override val model: String = modelFile.name

    private val session: OrtSession = env.createSession(modelFile.absolutePath, options(choice))
    private val inputName: String = session.inputNames.first()
    private var out: FloatArray = FloatArray(0)

    override fun run(
        input: FloatBuffer,
        shape: LongArray,
    ): FloatArray =
        OnnxTensor.createTensor(env, input, shape).use { tensor ->
            session.run(mapOf(inputName to tensor)).use { result ->
                val logits = (result[0] as OnnxTensor).floatBuffer
                if (out.size != logits.remaining()) out = FloatArray(logits.remaining())
                logits.get(out)
                out
            }
        }

    override fun close() {
        session.close()
    }

    private fun options(choice: Ep): OrtSession.SessionOptions {
        val opts = OrtSession.SessionOptions()
        when (choice) {
            // epChain only offers QNN when model.qnn.onnx was staged, and `modelFor` hands it
            // exactly that file — the HTP backend would reject the float32 graph.
            Ep.QNN -> opts.addQnn(mapOf("backend_path" to QNN_HTP_LIB, "htp_performance_mode" to "burst"))
            Ep.NNAPI -> opts.addNnapi(EnumSet.of(NNAPIFlags.USE_FP16))
            Ep.CPU -> Unit
        }
        return opts
    }
}
