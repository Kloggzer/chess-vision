package com.chesslab.tracker.cnn

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import ai.onnxruntime.TensorInfo
import ai.onnxruntime.providers.NNAPIFlags
import java.io.File
import java.nio.FloatBuffer
import java.util.EnumSet

/**
 * Qualcomm HTP (NPU) backend library. It ships with the onnxruntime-android-qnn AAR, which this app
 * no longer depends on (see `app/build.gradle.kts`), so [OrtSessionRunner] currently never gets
 * past `addQnn` — that is a clean fall-through, and this branch is what a QNN-capable build would
 * need back.
 */
private const val QNN_HTP_LIB = "libQnnHtp.so"

/** Prefix of the one-shot profile ORT writes for the verification batch; deleted as soon as it is read. */
private const val PROFILE_PREFIX = "ep-verify"

/**
 * What the ORT session is tuned to, named in one place.
 *
 * `OrtSession.SessionOptions` is write-only — no getter reads a thread count or an optimisation
 * level back out — so the values live here, where a test can pin them, and [applyTo] is the only
 * place they reach ORT. Until this existed the session was created with nothing said at all: no
 * thread count, no execution mode, no optimisation level.
 */
internal object SessionTuning {
    /**
     * Intra-op threads = the big cores of the target SoC (SM8650: 1×X4 + 5×A720 + 2×A520). The two
     * A520s would only stretch a batch of 64 to the slowest lane. Desktop reference on the same
     * shipped graph: 47.3 ms single-threaded against 19.3 ms unrestricted, so threading is the
     * single largest lever on this workload.
     */
    const val THREADS = 4

    val OPT_LEVEL: OrtSession.SessionOptions.OptLevel = OrtSession.SessionOptions.OptLevel.ALL_OPT

    /**
     * SEQUENTIAL is deliberate: one batched graph has nothing for inter-op parallelism to overlap,
     * so a second pool would buy scheduling and no work. Parallelism is [THREADS]' job, inside a
     * kernel.
     */
    val EXECUTION_MODE: OrtSession.SessionOptions.ExecutionMode = OrtSession.SessionOptions.ExecutionMode.SEQUENTIAL

    fun applyTo(
        opts: OrtSession.SessionOptions,
        threads: Int = THREADS,
    ) {
        opts.setOptimizationLevel(OPT_LEVEL)
        opts.setExecutionMode(EXECUTION_MODE)
        opts.setIntraOpNumThreads(threads)
    }
}

/**
 * The real ORT session.
 *
 * Profiling is opt-in ([profile]) and closed by the first [profiledProvider] call. It is the only
 * way the Java API can answer "which EP ran this?", so the attach path arms it — but a session that
 * is not being verified now pays no per-kernel tracing at all, and the batch
 * [OnnxSquareClassifier.verify] TIMES is run after profiling has been ended.
 */
internal class OrtSessionRunner(
    private val env: OrtEnvironment,
    modelFile: File,
    override val requested: Ep,
    profileDir: File,
    /**
     * Where to dump the HTP-compiled graph, or null when there is nothing to compile — either the
     * EP is not QNN, or [modelFile] already IS the cached context.
     */
    private val qnnContext: File? = null,
    /**
     * Arms ORT's per-kernel tracing across all 473 nodes. True only where the answer is needed
     * ([EpVerdict]); tracing every kernel is what made every warm-up figure ever quoted for this
     * model a measurement of the profiler as much as of the graph.
     */
    private val profile: Boolean = false,
    /**
     * [SessionTuning.THREADS] on the phone. A REPLAY passes 1: parallel float reductions are not
     * bit-exact, and a logit that wobbles in its last digits flips a thresholded decision — the
     * same file diverged at ply 26 on one of three otherwise-identical runs. Determinism costs
     * 47 ms against 19 per observation on the desktop, a fraction of the replay cadence.
     */
    private val intraOpThreads: Int = SessionTuning.THREADS,
) : SessionRunner {
    /** The file that was really loaded — never the one 07a asked for. */
    override val model: String = modelFile.name

    private val session: OrtSession = env.createSession(modelFile.absolutePath, options(requested, profileDir))
    private val inputName: String = session.inputNames.first()
    private var out: FloatArray = FloatArray(0)

    /**
     * What THIS graph says it takes, straight out of ORT. Null only if the input is not a tensor at
     * all, which no graph this app loads has ever been — [OnnxSquareClassifier] then simply has
     * nothing to compare against rather than refusing to load on a cast.
     */
    override val declaredInputShape: LongArray? = (session.inputInfo[inputName]?.info as? TensorInfo)?.shape

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

    /**
     * Ends profiling and reads the provider out of the trace. Failures return null — "unknown",
     * which [EpVerdict] renders as unverified; they never let a requested EP pass as a result.
     * A session built with `profile = false` has no trace to end, and so is always unknown.
     */
    override fun profiledProvider(): String? =
        runCatching {
            val trace = File(session.endProfiling())
            val provider = dominantProvider(trace.readText())
            trace.delete()
            provider
        }.getOrNull()

    override fun close() {
        session.close()
    }

    private fun options(
        choice: Ep,
        profileDir: File,
    ): OrtSession.SessionOptions {
        val opts = OrtSession.SessionOptions()
        SessionTuning.applyTo(opts, intraOpThreads)
        if (profile) opts.enableProfiling(File(profileDir, PROFILE_PREFIX).absolutePath)
        when (choice) {
            // epChain only offers QNN when model.qnn.onnx was staged, and `modelFor` hands it
            // exactly that file — the HTP backend would reject the float32 graph.
            Ep.QNN -> {
                opts.addQnn(mapOf("backend_path" to QNN_HTP_LIB, "htp_performance_mode" to "burst"))
                qnnContext?.let(::writeContextTo)?.forEach { (key, value) -> opts.addConfigEntry(key, value) }
            }
            Ep.NNAPI -> opts.addNnapi(EnumSet.of(NNAPIFlags.USE_FP16))
            // XNNPACK runs its own pool, so it is told the same big-core budget. Whatever it does
            // not implement (all 46 InstanceNormalization blocks here) stays on the CPU EP.
            Ep.XNNPACK -> opts.addXnnpack(mapOf("intra_op_num_threads" to intraOpThreads.toString()))
            Ep.CPU -> Unit
        }
        return opts
    }

    /**
     * Ask ORT to serialise the compiled graph next to the model.
     *
     * `embed_mode = 1` keeps the device binary inside the ONNX rather than in a sibling `.bin`, so
     * the cache is one file and cannot half-exist. This session still runs normally; the dump is a
     * side effect of creating it.
     */
    private fun writeContextTo(target: File): Map<String, String> =
        mapOf(
            "ep.context_enable" to "1",
            "ep.context_file_path" to target.absolutePath,
            "ep.context_embed_mode" to "1",
        )
}
