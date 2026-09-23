package com.chesslab.tracker.cnn

import ai.onnxruntime.OrtEnvironment
import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.cnn.SquareClassifier
import com.chesslab.cnn.preprocessInto
import com.chesslab.cnn.sigmoid
import com.chesslab.cnn.softmaxAt
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import com.chesslab.tracker.settings.EpRequest
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer

private const val FLOAT_BYTES = 4

/** Declaration order IS the automatic chain order. XNNPACK sits directly above CPU: faster kernels on the same
 *  cores, it can only win or hand the operator back. */
internal enum class Ep(
    val backend: String,
) {
    QNN("QNN-HTP(NPU)"),

    /** NOT in the automatic chain: on an SM8650 it verified as the runner and took **470 ms** per 64 crops against
     *  the CPU's 97. Deprecated since Android 15. Reachable by explicit request only. */
    NNAPI("NNAPI"),
    XNNPACK("XNNPACK"),
    CPU("CPU"),
}

internal fun qnnContextFile(staged: StagedModel): File = File(staged.dir, MODEL_QNN_CTX_FILE)

/** QNN runs **quantized graphs only**. The cached `EPContext` graph wins when it exists: it skips a 4 min 25 s compile. */
internal fun modelFor(
    staged: StagedModel,
    ep: Ep,
): File =
    when {
        ep != Ep.QNN -> staged.fp32
        qnnContextFile(staged).isFile -> qnnContextFile(staged)
        else -> requireNotNull(staged.qnn)
    }

/** QNN is not offered without the quantized graph. An explicit [request] cuts everything ABOVE it, keeps what is
 *  BELOW (a failed build must still leave a classifier). An unservable request falls back to the full chain. */
internal fun epChain(
    hasQnnModel: Boolean,
    request: EpRequest = EpRequest.AUTO,
): List<Ep> {
    val available = Ep.entries.filter { hasQnnModel || it != Ep.QNN }
    // NNAPI never automatic: 470 ms against the CPU's 97, and a floor below the always-present CPU is unreachable.
    val automatic = available.filter { it != Ep.NNAPI }
    val head =
        when (request) {
            EpRequest.AUTO -> return automatic
            EpRequest.QNN -> Ep.QNN
            EpRequest.NNAPI -> Ep.NNAPI
            EpRequest.CPU -> Ep.CPU
        }
    return if (head in available) available.dropWhile { it != head } else automatic
}

/** What the app ASKED for, next to which the debug screen renders what it got. */
fun requestedBackend(
    staged: StagedModel,
    request: EpRequest,
): String = epChain(staged.qnn != null, request).first().backend

/** Behind a seam so the wrapper is testable without ORT natives. */
internal interface SessionRunner : AutoCloseable {
    /** Appended successfully, which is not the same as used. */
    val requested: Ep
    val model: String

    /** The graph is the schema and `config.json` only describes it. Null only for the pure-Kotlin test fakes. */
    val declaredInputShape: LongArray? get() = null

    fun run(
        input: FloatBuffer,
        shape: LongArray,
    ): FloatArray

    fun profiledProvider(): String?
}

/** All 64 crops go through ONE session call at a static `[64, channels, height, width]`, both from [spec] and
 *  asserted against the graph. Preprocessing is `:core-cnn`'s `preprocess`; a copy here would be a parity fork. */
class OnnxSquareClassifier internal constructor(
    val spec: ModelSpec,
    private val runner: SessionRunner,
) : SquareClassifier,
    AutoCloseable {
    override val classes: List<String> get() = spec.classes

    /** Never `runner.requested`: ORT appends an EP that goes on to claim no node at all. */
    val backend: String get() = verdict.label
    val model: String get() = runner.model

    @Volatile
    private var verdict = EpVerdict(runner.requested, null)

    @Volatile
    var lastRunMs: Double = 0.0
        private set

    private val batch = ALL_SQUARES.size
    private val shape = longArrayOf(batch.toLong(), spec.channels.toLong(), spec.outHeight.toLong(), spec.outWidth.toLong())

    val inputShape: String get() = shape.joinToString("x")

    /** The app's input size against the graph's: preprocessing and graph disagreeing about the crop size is what
     *  actually breaks. Only the last two dims; the batch is [ALL_SQUARES] by construction. */
    init {
        // The runner opened a native session in ITS constructor: throwing here abandons it, and the attach path
        // retried down the EP chain leaking one session per attempt.
        val mismatch =
            runner.declaredInputShape?.takeIf { it.size >= 2 }?.let { declared ->
                val h = declared[declared.size - 2]
                val w = declared[declared.size - 1]
                if (h == spec.outHeight.toLong() && w == spec.outWidth.toLong()) {
                    null
                } else {
                    "graph ${runner.model} takes ${w}x$h crops but the model config declares " +
                        "${spec.outWidth}x${spec.outHeight} (declared shape ${declared.toList()})"
                }
            }
        if (mismatch != null) {
            runCatching { runner.close() }
            error(mismatch)
        }
    }

    // Direct and reused: ORT reads native memory, and 12 MB per observation would churn the heap.
    private val input: FloatBuffer =
        ByteBuffer
            .allocateDirect(batch * spec.channels * spec.outWidth * spec.outHeight * FLOAT_BYTES)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()

    private val staging = FloatArray(batch * spec.channels * spec.outWidth * spec.outHeight)

    override fun classify(crops: List<BgrImage>): Array<FloatArray> {
        require(crops.size == batch) { "expected $batch crops, got ${crops.size}" }
        WorkProfiler.span(WorkOperation.CNN_PREPROCESS) {
            preprocessInto(crops, spec.outWidth, spec.outHeight, staging, spec.mean, spec.std, spec.perCrop, spec.repr)
            input.clear()
            input.put(staging)
            input.flip()
            WorkProfiler.bytes(WorkOperation.CNN_PREPROCESS, staging.size.toLong() * FLOAT_BYTES)
        }
        val started = System.nanoTime()
        val logits = WorkProfiler.span(WorkOperation.CNN_INFERENCE) { runner.run(input, shape) }
        lastRunMs = (System.nanoTime() - started) / NANOS_PER_MS
        val classCount = spec.classes.size
        val width = spec.outputWidth
        require(logits.size == batch * width) { "model returned ${logits.size} logits, expected ${batch * width}" }
        // Log-probabilities, so softmax is correct. The coverage unit rides along as its own sigmoid: the softmax
        // stops at `classCount`.
        return Array(batch) { row ->
            val start = row * width
            val probs = softmaxAt(logits.copyOfRange(start, start + classCount), spec.temperature)
            if (width == classCount) probs else probs + sigmoid(logits[start + classCount])
        }
    }

    /** Two warm-up batches: the first is profiled ("which EP ran this?"), the second is TIMED. The first carries
     *  per-kernel tracing across 473 nodes — every earlier warm-up figure measured the profiler as much as the graph. */
    internal fun verify(): EpVerdict {
        input.clear()
        runner.run(input, shape)
        verdict = EpVerdict(runner.requested, runner.profiledProvider())
        input.clear()
        val started = System.nanoTime()
        runner.run(input, shape)
        lastRunMs = (System.nanoTime() - started) / NANOS_PER_MS
        return verdict
    }

    override fun close() {
        runner.close()
    }

    companion object {
        private const val NANOS_PER_MS = 1_000_000.0

        /** An EP drops out when it fails to build, or when it builds and quietly claims no node (QNN on this device,
         *  leaving a QDQ graph on the CPU). "Unknown" is not a mismatch; a total failure throws. */
        fun open(
            staged: StagedModel,
            log: CnnLog,
            request: EpRequest = EpRequest.AUTO,
            intraOpThreads: Int = SessionTuning.THREADS,
        ): OnnxSquareClassifier {
            val chain = epChain(staged.qnn != null, request)
            val attempts = EpAttempts(ModelSpec.parse(staged.configJson), staged, log, intraOpThreads)
            val opened = chain.withIndex().firstNotNullOfOrNull { (i, ep) -> attempts.open(ep, isLastResort = i == chain.lastIndex) }
            return opened ?: throw IllegalStateException("no ONNX execution provider could load ${staged.dir}", attempts.last)
        }
    }
}

/** A warm-up that throws takes its own session with it. */
internal fun verifiedOrClosed(cnn: OnnxSquareClassifier): EpVerdict =
    cnn.runCatching { verify() }.getOrElse {
        runCatching { cnn.close() }
        throw it
    }

/** Keeps the last failure so a total loss can name a cause. */
private class EpAttempts(
    private val spec: ModelSpec,
    private val staged: StagedModel,
    private val log: CnnLog,
    private val intraOpThreads: Int = SessionTuning.THREADS,
) {
    private val env: OrtEnvironment = OrtEnvironment.getEnvironment()
    var last: Throwable? = null
        private set

    fun open(
        choice: Ep,
        isLastResort: Boolean,
    ): OnnxSquareClassifier? {
        val model = modelFor(staged, choice)
        val context = qnnContextFile(staged)
        val compileTo = context.takeIf { choice == Ep.QNN && model != it }
        if (compileTo != null) log.info("compiling ${model.name} for the HTP — this takes minutes, once per install")
        val built =
            runCatching {
                // The ONLY session built with profiling armed.
                val runner = OrtSessionRunner(env, model, choice, staged.dir, compileTo, profile = true, intraOpThreads = intraOpThreads)
                val cnn = OnnxSquareClassifier(spec, runner)
                cnn to verifiedOrClosed(cnn)
            }.onFailure {
                last = it
                // A cached context that will not load fails on every launch: drop it, recompile next attach.
                if (model == context && context.delete()) log.warn("dropped the unusable QNN context cache", null)
                log.warn("CNN EP ${choice.backend} unavailable, falling back: ${it.message}", it)
            }
        val (cnn, verdict) = built.getOrNull() ?: return null
        if (verdict.contradicted && !isLastResort) {
            log.warn("CNN EP ${choice.backend} loaded but ${verdict.label} ran the graph, falling back", null)
            cnn.close()
            return null
        }
        log.info("CNN EP verified: ${verdict.label}, warm-up ${cnn.lastRunMs.toLong()} ms for ${ALL_SQUARES.size} crops")
        return cnn
    }
}
