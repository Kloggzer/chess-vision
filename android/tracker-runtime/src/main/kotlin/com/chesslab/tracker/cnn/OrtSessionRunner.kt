package com.chesslab.tracker.cnn

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import ai.onnxruntime.TensorInfo
import ai.onnxruntime.providers.NNAPIFlags
import java.io.File
import java.nio.FloatBuffer
import java.util.EnumSet

/** Ships with the onnxruntime-android-qnn AAR, which this app no longer depends on: `addQnn` falls through
 *  cleanly, and this is what a QNN-capable build would need back. */
private const val QNN_HTP_LIB = "libQnnHtp.so"

private const val PROFILE_PREFIX = "ep-verify"

/** `OrtSession.SessionOptions` is write-only, so the values live here where a test can pin them. */
internal object SessionTuning {
    /** The big cores of the SM8650 (1×X4 + 5×A720); the A520s would only stretch a 64-batch to the slowest lane.
     *  Desktop reference: 47.3 ms single-threaded against 19.3 ms unrestricted. */
    const val THREADS = 4

    val OPT_LEVEL: OrtSession.SessionOptions.OptLevel = OrtSession.SessionOptions.OptLevel.ALL_OPT

    /** One batched graph has nothing for inter-op parallelism to overlap. */
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

/** Profiling is opt-in and ended by the first [profiledProvider] call, so the batch [OnnxSquareClassifier.verify]
 *  TIMES runs untraced. */
internal class OrtSessionRunner(
    private val env: OrtEnvironment,
    modelFile: File,
    override val requested: Ep,
    profileDir: File,
    /** Null when the EP is not QNN, or [modelFile] already IS the cached context. */
    private val qnnContext: File? = null,
    /** True only where [EpVerdict] needs it. */
    private val profile: Boolean = false,
    /** A REPLAY passes 1: parallel float reductions are not bit-exact, and the same file diverged at ply 26 on one
     *  of three identical runs. */
    private val intraOpThreads: Int = SessionTuning.THREADS,
) : SessionRunner {
    /** The file really loaded. */
    override val model: String = modelFile.name

    private val session: OrtSession = env.createSession(modelFile.absolutePath, options(requested, profileDir))
    private val inputName: String = session.inputNames.first()
    private var out: FloatArray = FloatArray(0)

    /** Null only if the input is not a tensor: nothing to compare against rather than a failed cast. */
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

    /** Failures return null — "unknown" — never a requested EP passing as a result. */
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
            // The HTP backend would reject the float32 graph.
            Ep.QNN -> {
                opts.addQnn(mapOf("backend_path" to QNN_HTP_LIB, "htp_performance_mode" to "burst"))
                qnnContext?.let(::writeContextTo)?.forEach { (key, value) -> opts.addConfigEntry(key, value) }
            }
            Ep.NNAPI -> opts.addNnapi(EnumSet.of(NNAPIFlags.USE_FP16))
            // XNNPACK runs its own pool, so it gets the same big-core budget.
            Ep.XNNPACK -> opts.addXnnpack(mapOf("intra_op_num_threads" to intraOpThreads.toString()))
            Ep.CPU -> Unit
        }
        return opts
    }

    /** `embed_mode = 1` keeps the device binary inside the ONNX, so the cache is one file and cannot half-exist. */
    private fun writeContextTo(target: File): Map<String, String> =
        mapOf(
            "ep.context_enable" to "1",
            "ep.context_file_path" to target.absolutePath,
            "ep.context_embed_mode" to "1",
        )
}
