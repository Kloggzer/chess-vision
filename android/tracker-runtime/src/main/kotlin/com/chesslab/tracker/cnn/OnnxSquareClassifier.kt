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

/**
 * An execution provider. The graph it is allowed to run comes from [StagedModel], not from here.
 *
 * Declaration order IS the automatic chain order (see [epChain]). XNNPACK sits directly above CPU
 * because it is not a different device at all — it is a faster set of kernels on the same cores,
 * and it can only ever win or hand the operator back.
 */
internal enum class Ep(
    val backend: String,
) {
    QNN("QNN-HTP(NPU)"),

    /**
     * NOT in the automatic chain — see [epChain]. Restoring the plain ORT AAR put NNAPI back in the
     * binary for the first time, and on an SM8650 it verified as the runner and took **470 ms** per
     * 64 crops against the CPU's 97. Deprecated since Android 15 on top of that. It stays reachable
     * by explicit request, because "try it and see" is what the request exists for.
     */
    NNAPI("NNAPI"),
    XNNPACK("XNNPACK"),
    CPU("CPU"),
}

/** Where the HTP's compiled form of the QDQ graph is cached. See [MODEL_QNN_CTX_FILE]. */
internal fun qnnContextFile(staged: StagedModel): File = File(staged.dir, MODEL_QNN_CTX_FILE)

/**
 * QNN runs **quantized graphs only**; NNAPI and CPU take whichever graph 07a selected.
 *
 * For QNN the cached `EPContext` graph wins when it exists: loading it skips the on-device compile
 * that cost 4 min 25 s the first time.
 */
internal fun modelFor(
    staged: StagedModel,
    ep: Ep,
): File =
    when {
        ep != Ep.QNN -> staged.fp32
        qnnContextFile(staged).isFile -> qnnContextFile(staged)
        else -> requireNotNull(staged.qnn)
    }

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
    val available = Ep.entries.filter { hasQnnModel || it != Ep.QNN }
    // NNAPI is reachable but never automatic. Measured on an SM8650 it took 470 ms per 64 crops
    // against the CPU's 97 — and it cannot serve as a floor BELOW the CPU either, because the CPU
    // provider is always present and so a floor under it is unreachable code. Leaving it in AUTO
    // shipped a 5x regression for exactly one build.
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

/** The head of the chain — what the app ASKED for, next to which 07b renders what it got. */
fun requestedBackend(
    staged: StagedModel,
    request: EpRequest,
): String = epChain(staged.qnn != null, request).first().backend

/** The native session, behind a seam so the wrapper is testable without ORT natives. */
internal interface SessionRunner : AutoCloseable {
    /** The EP this session was BUILT for — appended successfully, which is not the same as used. */
    val requested: Ep
    val model: String

    /**
     * The input shape the LOADED GRAPH declares, or null when there is no graph to ask.
     *
     * The graph is the schema and `config.json` only describes it (specs/22), so the one consumer
     * that holds both — [OnnxSquareClassifier] — compares them. Null is for the pure-Kotlin fakes
     * that stand in for a session in the unit tests; a real session always answers.
     */
    val declaredInputShape: LongArray? get() = null

    /** @return `batch * ModelSpec.outputWidth` logits, flat and row-major. */
    fun run(
        input: FloatBuffer,
        shape: LongArray,
    ): FloatArray

    /** ORT's provider name for the batch run so far, or null when it could not be established. */
    fun profiledProvider(): String?
}

/**
 * `:core-cnn`'s [SquareClassifier] on ONNX Runtime. All 64 crops go through ONE session call —
 * the graph is exported at a static `[64, channels, height, width]` (opset 17), where `channels`
 * follows the run's `input_repr` and height/width follow its `infer_size` (specs/22). Both come
 * from [spec], and the graph is asserted to agree.
 * Preprocessing is `:core-cnn`'s `preprocess` (the `serving.py predict_arrays` contract); a
 * second copy here would be a parity fork.
 */
class OnnxSquareClassifier internal constructor(
    val spec: ModelSpec,
    private val runner: SessionRunner,
) : SquareClassifier,
    AutoCloseable {
    override val classes: List<String> get() = spec.classes

    /**
     * The provider that was OBSERVED running the graph, or an explicitly unverified request.
     *
     * Never `runner.requested`: ORT appends an EP that goes on to claim no node at all, so the
     * request is a wish and this is the finding. See [EpVerdict].
     */
    val backend: String get() = verdict.label
    val model: String get() = runner.model

    @Volatile
    private var verdict = EpVerdict(runner.requested, null)

    /** Pure inference time of the last batch, for the debug screen. */
    @Volatile
    var lastRunMs: Double = 0.0
        private set

    private val batch = ALL_SQUARES.size
    private val shape = longArrayOf(batch.toLong(), spec.channels.toLong(), spec.outHeight.toLong(), spec.outWidth.toLong())

    /** The tensor the graph is actually fed, for 07b's debug screen. */
    val inputShape: String get() = shape.joinToString("x")

    /**
     * The app's own input size against the one the graph declares — the assertion the deleted
     * `out_size == 128` guard was standing in for.
     *
     * That guard compared the config to a literal in the app, so it could not express "this model
     * wants 96" and never checked the thing that actually breaks: preprocessing and the graph
     * disagreeing about the crop size. Compared here because this is the only place that holds
     * both the spec and the session. Only the last two dims: the batch is [ALL_SQUARES] by
     * construction and the logit count is checked per call in [classify].
     */
    init {
        // The runner opened a native ORT session in ITS constructor, before this one ran. Throwing
        // out of here abandons that session: nobody holds the half-built classifier, so nothing
        // ever calls `close`, and the arena stays mapped for the life of the process. The attach
        // path retries down the EP chain, so a mismatched graph leaked one session per attempt.
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

    // Direct and reused: ORT reads the tensor from native memory, and reallocating 12 MB per
    // observation would churn the heap at observer rate.
    private val input: FloatBuffer =
        ByteBuffer
            .allocateDirect(batch * spec.channels * spec.outWidth * spec.outHeight * FLOAT_BYTES)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()

    // Reused for the same reason as [input]: `preprocess` would hand back a fresh 12.6 MB array
    // per observation. Writing it here and bulk-putting is one memcpy and zero allocation.
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
        // The head emits log-probabilities (HierarchicalHead); softmax over them is correct. The
        // coverage unit is NOT one of them — it rides along as its own sigmoid, so the softmax
        // stops at `classCount` and the class probabilities still sum to 1.
        return Array(batch) { row ->
            val start = row * width
            val probs = softmaxAt(logits.copyOfRange(start, start + classCount), spec.temperature)
            if (width == classCount) probs else probs + sigmoid(logits[start + classCount])
        }
    }

    /**
     * Two warm-up batches over an all-zero tensor: the first is profiled and answers "which EP ran
     * this?", the second is the one that is TIMED.
     *
     * They cannot be the same batch. The first pays the one-off costs (weight staging, kernel
     * selection) and carries ORT's per-kernel tracing across 473 nodes, which is why every warm-up
     * figure ever recorded for this model measured the profiler as much as the graph.
     * [SessionRunner.profiledProvider] ends profiling, so the second run is instrumented by nothing
     * and [lastRunMs] is a genuine 64-crop timing before the first observation ever runs.
     */
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

        /**
         * Walks the EP chain and returns the first classifier that builds AND is not caught
         * running somewhere else.
         *
         * Two ways an EP drops out. It can fail to build — WARN and fall through, as before. Or it
         * can build and then quietly claim no node: QNN does this on this device (device creation
         * fails inside `GetCapability`, long after `addQnn` returned happily), leaving a QDQ graph
         * running on the CPU. That is not a QNN session, so it is not kept — falling through hands
         * CPU its own float32 graph instead of an int8 one it has to dequantize node by node.
         *
         * A verdict of "unknown" (profiling gave no answer) is NOT treated as a mismatch: the
         * session works, and [EpVerdict.label] says out loud that it is unverified. A total
         * failure throws, and the caller ([CnnObserver.attach]) turns that into [CnnState.Failed].
         */
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

/**
 * [OnnxSquareClassifier.verify], but a warm-up that throws takes its own session with it — the
 * chain falls through to the next EP, and nobody holds the half-built classifier afterwards.
 */
internal fun verifiedOrClosed(cnn: OnnxSquareClassifier): EpVerdict =
    cnn.runCatching { verify() }.getOrElse {
        runCatching { cnn.close() }
        throw it
    }

/** One pass over the EP chain, keeping the last failure so a total loss can name a cause. */
private class EpAttempts(
    private val spec: ModelSpec,
    private val staged: StagedModel,
    private val log: CnnLog,
    private val intraOpThreads: Int = SessionTuning.THREADS,
) {
    private val env: OrtEnvironment = OrtEnvironment.getEnvironment()
    var last: Throwable? = null
        private set

    /** @return the classifier, or null when this EP failed to build or was caught not running. */
    fun open(
        choice: Ep,
        isLastResort: Boolean,
    ): OnnxSquareClassifier? {
        val model = modelFor(staged, choice)
        val context = qnnContextFile(staged)
        // Compile only when we are not already loading the compiled form.
        val compileTo = context.takeIf { choice == Ep.QNN && model != it }
        if (compileTo != null) log.info("compiling ${model.name} for the HTP — this takes minutes, once per install")
        val built =
            runCatching {
                // The ONLY session built with profiling armed: `verify` needs the trace, and
                // nothing else in the app does.
                val runner = OrtSessionRunner(env, model, choice, staged.dir, compileTo, profile = true, intraOpThreads = intraOpThreads)
                val cnn = OnnxSquareClassifier(spec, runner)
                cnn to verifiedOrClosed(cnn)
            }.onFailure {
                last = it
                // A cached context that will not load would fail the same way on every launch.
                // Drop it, so the next attach recompiles from the QDQ graph instead.
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
