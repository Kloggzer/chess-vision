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
        opts.enableProfiling(File(profileDir, PROFILE_PREFIX).absolutePath)
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
