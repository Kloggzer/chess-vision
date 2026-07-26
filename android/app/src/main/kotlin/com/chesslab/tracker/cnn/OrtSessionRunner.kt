package com.chesslab.tracker.cnn

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import ai.onnxruntime.providers.NNAPIFlags
import java.io.File
import java.nio.FloatBuffer
import java.util.EnumSet

/** Qualcomm HTP (NPU) backend library, bundled inside the onnxruntime-android-qnn AAR. */
private const val QNN_HTP_LIB = "libQnnHtp.so"

/** Prefix of the one-shot profile ORT writes for the warm-up batch; deleted as soon as it is read. */
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

    fun applyTo(opts: OrtSession.SessionOptions) {
        opts.setOptimizationLevel(OPT_LEVEL)
        opts.setExecutionMode(EXECUTION_MODE)
        opts.setIntraOpNumThreads(THREADS)
    }
}

/**
 * The real ORT session.
 *
 * Profiling is armed at construction and closed by the first [profiledProvider] call: that is the
 * only way the Java API can answer "which EP ran this?", and one profiled batch at attach costs
 * nothing steady-state. `endProfiling` also switches profiling OFF for the rest of the session, so
 * the per-observation path is untouched.
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
) : SessionRunner {
    /** The file that was really loaded — never the one 07a asked for. */
    override val model: String = modelFile.name

    private val session: OrtSession = env.createSession(modelFile.absolutePath, options(requested, profileDir))
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

    /**
     * Ends profiling and reads the provider out of the trace. Failures return null — "unknown",
     * which [EpVerdict] renders as unverified; they never let a requested EP pass as a result.
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
        SessionTuning.applyTo(opts)
        opts.enableProfiling(File(profileDir, PROFILE_PREFIX).absolutePath)
        when (choice) {
            // epChain only offers QNN when model.qnn.onnx was staged, and `modelFor` hands it
            // exactly that file — the HTP backend would reject the float32 graph.
            Ep.QNN -> {
                opts.addQnn(mapOf("backend_path" to QNN_HTP_LIB, "htp_performance_mode" to "burst"))
                qnnContext?.let(::writeContextTo)?.forEach { (key, value) -> opts.addConfigEntry(key, value) }
            }
            Ep.NNAPI -> opts.addNnapi(EnumSet.of(NNAPIFlags.USE_FP16))
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
