package com.chesslab.tracker.cnn

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.util.Log
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Test
import java.io.File
import java.nio.FloatBuffer
import kotlin.random.Random

/**
 * What each normalizer costs on THIS SoC, measured against itself.
 *
 * GroupNorm has no inference-time form: ORT exports it as 46 `InstanceNormalization` blocks wrapped
 * in `Reshape`/`Shape`/`Mul`/`Add`, 503 nodes against BatchNorm's 89, and XNNPACK implements none of
 * them — they fall back to the CPU EP between every pair of convolutions. BatchNorm folds into the
 * preceding convolution and leaves nothing behind. On the desktop CPU EP that is 20.2 ms against
 * 3.9 ms for 64 crops, but the desktop has no XNNPACK and therefore runs the convolutions badly,
 * which inflates the norm's share. This is the number that decides it.
 *
 * **Deliberately not measured through the tracker.** Latency here is dominated by load and heat —
 * the same graph measures 32 ms cool, 66 ms inside the running tracker and 125 ms live at 39-41 °C.
 * Two models timed in different thermal states would compare thermal states, not models. So the
 * models are INTERLEAVED round by round, on synthetic input, with no camera involved: whatever the
 * die is doing, both are doing it at the same time.
 *
 * Synthetic input is sound for a latency question — the graph executes the same kernels on the same
 * shapes whatever the pixels are. It would be unsound for an accuracy question, and this test makes
 * no accuracy claim.
 *
 *     gradlew.bat :app:connectedDebugAndroidTest --tests "*NormLatencyBenchmark*"
 *
 * Results go to logcat under [TAG]; the test asserts nothing about speed, because the point is a
 * measurement and a threshold would only encode today's phone.
 */
class NormLatencyBenchmark {
    private companion object {
        const val TAG = "NormLatency"
        const val BATCH = 64 // one board
        const val WARMUP = 5
        const val ROUNDS = 40
        val MODELS =
            listOf(
                "v6-80" to "GroupNorm  small_035",
                "bn-80" to "BatchNorm  small_035",
                "w10-80" to "BatchNorm  small width 1.0",
                "med-80" to "BatchNorm  medium",
            )
    }

    /**
     * Copy one model directory out of the APK, bypassing [BUNDLED_MODELS].
     *
     * `CnnModelAssets.fromAssets` runs the name through `bundledModelOrDefault`, which silently
     * substitutes the default for anything not in that list — so an unlisted directory would be
     * timed as `shipped` and the benchmark would compare a model with itself. The width candidates
     * here are UNTRAINED and must never appear in that list, because it is also what the model
     * picker offers the user.
     */
    private fun stageRaw(
        ctx: android.content.Context,
        dir: String,
    ): File {
        val out = File(ctx.filesDir, "latbench/$dir").apply { mkdirs() }
        for (name in listOf("model.onnx", "config.json")) {
            ctx.assets.open("cnn_model/$dir/$name").use { input ->
                File(out, name).outputStream().use { input.copyTo(it) }
            }
        }
        return File(out, "config.json")
    }

    @Test
    fun bothNormalizersOnTheSameDie() {
        val ctx = InstrumentationRegistry.getInstrumentation().targetContext
        val env = OrtEnvironment.getEnvironment()
        val sessions = mutableMapOf<String, OrtSession>()
        val inputs = mutableMapOf<String, String>()
        val sizes = mutableMapOf<String, Int>()

        for ((dir, _) in MODELS) {
            val staged = stageRaw(ctx, dir)
            val opts = OrtSession.SessionOptions()
            SessionTuning.applyTo(opts)
            opts.addXnnpack(mapOf("intra_op_num_threads" to SessionTuning.THREADS.toString()))
            val session = env.createSession(File(staged.parentFile, "model.onnx").absolutePath, opts)
            sessions[dir] = session
            inputs[dir] = session.inputNames.first()
            // The declared spatial size, so a model that serves at 80 is not timed at 128.
            sizes[dir] = ModelSpec.parse(staged.readText()).outWidth
            Log.i(TAG, "$dir staged, input ${sizes[dir]}px")
        }

        val rnd = Random(42)
        val tensors =
            MODELS.associate { (dir, _) ->
                val s = sizes.getValue(dir)
                val buf = FloatBuffer.allocate(BATCH * 3 * s * s)
                repeat(buf.capacity()) { buf.put(rnd.nextFloat()) }
                buf.rewind()
                dir to OnnxTensor.createTensor(env, buf, longArrayOf(BATCH.toLong(), 3, s.toLong(), s.toLong()))
            }

        repeat(WARMUP) {
            for ((dir, _) in MODELS) {
                sessions.getValue(dir).run(mapOf(inputs.getValue(dir) to tensors.getValue(dir))).close()
            }
        }

        val samples = MODELS.associate { (dir, _) -> dir to ArrayList<Double>(ROUNDS) }
        // Interleaved, not one model then the other: a block layout would give the second model a
        // hotter die and the difference would be unattributable.
        repeat(ROUNDS) {
            for ((dir, _) in MODELS) {
                val t0 = System.nanoTime()
                sessions.getValue(dir).run(mapOf(inputs.getValue(dir) to tensors.getValue(dir))).close()
                samples.getValue(dir).add((System.nanoTime() - t0) / 1e6)
            }
        }

        for ((dir, label) in MODELS) {
            val v = samples.getValue(dir).sorted()

            fun pct(p: Double) = v[(p * (v.size - 1)).toInt()]
            Log.i(
                TAG,
                "$label ($dir): median %.1f ms  p10 %.1f  p90 %.1f  min %.1f  max %.1f  (batch $BATCH)"
                    .format(pct(0.5), pct(0.10), pct(0.90), v.first(), v.last()),
            )
        }
        val gn = samples.getValue("v6-80").sorted()[ROUNDS / 2]
        for ((dir, label) in MODELS.drop(1)) {
            val v = samples.getValue(dir).sorted()[ROUNDS / 2]
            Log.i(TAG, "$label: %.2fx the speed of the shipped GroupNorm graph".format(gn / v))
        }

        tensors.values.forEach(OnnxTensor::close)
        sessions.values.forEach(OrtSession::close)
        File(ctx.filesDir, "unused").delete()
    }
}
