package com.chesslab.tracker.sim

import com.chesslab.cnn.CnnConfig
import com.chesslab.cnn.CnnRecovery
import com.chesslab.tracker.cnn.CnnModelAssets
import com.chesslab.tracker.cnn.OnnxSquareClassifier
import com.chesslab.tracker.cnn.RecordingLog
import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfSystemProperty
import org.junit.jupiter.api.io.TempDir
import java.io.File

/**
 * **The CNN coverage gap, closed without a phone.**
 *
 * `scripts/emit_parity_fixtures.py` replays every clip with `cnn_run=None`, so all 969 fixture
 * frames exercise the DIFF path only. Everything the CNN touches — the verify ladder, pair verify,
 * recovery, the illegal-move alarm — has only ever seen hand-built probability arrays. This test
 * runs the whole chain on real pixels: mp4 -> board warp -> 64 crops -> real `model.onnx` ->
 * [CnnRecovery] -> [com.chesslab.engine.api.TrackerEngine] -> committed move list, against each
 * clip's `.labels.json`.
 *
 * It is an EXPERIMENT, not a gate on model quality. What is asserted is the harness contract and
 * the diff-only baseline (which Python reproduces at full rate for every one of these clips); the
 * CNN-on move lists are REPORTED, and their failures belong in
 * `specs/17-android-rewrite/STATUS.md`, not in a loosened assertion.
 *
 * Opt-in, because it decodes 18 videos and runs ONNX on every frame:
 * ```
 * .\gradlew.bat :app:testDebugUnitTest -Pchesslab.sim=true --tests "com.chesslab.tracker.sim.*"
 * ```
 * Without `-Pchesslab.sim=true` the class is skipped, so `:app:testDebugUnitTest` stays fast.
 */
@EnabledIfSystemProperty(named = "chesslab.sim", matches = "true")
class CnnClipSimulationTest {
    @Test
    fun replaysEveryClipThroughTheRealModel(
        @TempDir staging: File,
    ) {
        Loader.load(opencv_java::class.java)
        val clips = simClips()
        assertTrue(clips.isNotEmpty(), "no clips in parity/index.json")
        val assets = File(repoRoot(), "android/app/src/main/assets/cnn_model")
        val staged = CnnModelAssets({ name -> File(assets, name).takeIf { it.isFile }?.inputStream() }, staging).stage()
        val results = mutableListOf<Pair<SimResult, SimResult>>()
        OnnxSquareClassifier.open(staged, RecordingLog()).use { classifier ->
            assertEquals("CPU", classifier.backend, "the desktop JVM has no NPU — the run must be on the CPU provider")
            for (clip in clips) {
                val baseline = runClip(clip, null)
                val withCnn = runClip(clip, SimCnn(classifier, CnnRecovery(cnnConfigOf(clip))))
                println(line(baseline, withCnn))
                results += baseline to withCnn
            }
        }
        report(results)
        assertHarnessRan(results)
        assertBaselineReproducesGroundTruth(results)
    }
}

/** `TrackerConfig`'s CNN knobs (from the clip's fixture `effectiveConfig`) as a [CnnConfig]. */
private fun cnnConfigOf(clip: SimClip): CnnConfig =
    CnnConfig(
        confThr = clip.config.cnnConfThr,
        minAgreement = clip.config.cnnMinAgreement,
        marginSquares = clip.config.cnnMarginSquares,
        minConfidentBoard = clip.config.minConfidentBoard,
        minConfidentRecovery = clip.config.minConfidentRecovery,
        recoveryMaxPlies = clip.config.recoveryMaxPlies,
    )

private fun line(
    baseline: SimResult,
    withCnn: SimResult,
): String {
    val verdict = if (withCnn.ok) "OK  " else "FAIL"
    return "$verdict ${baseline.clip.padEnd(22)} diff-only=${mark(baseline.ok)} cnn=${mark(withCnn.ok)} " +
        "expected=${baseline.expected} cnn-committed=${withCnn.sans}"
}

private fun mark(ok: Boolean): String = if (ok) "pass" else "FAIL"

private fun report(results: List<Pair<SimResult, SimResult>>) {
    println("\n=== CNN clip simulation =========================================================")
    println("clip                   diff-only  cnn-on  first divergence (cnn-on)")
    for ((baseline, withCnn) in results) {
        val why = withCnn.firstDivergence() ?: ""
        println("${baseline.clip.padEnd(22)} ${mark(baseline.ok).padEnd(10)} ${mark(withCnn.ok).padEnd(7)} $why")
        println("    model: ${withCnn.audit.summary()}")
        if (withCnn.trace.alarms.isNotEmpty()) println("    alarms: ${withCnn.trace.alarms}")
        if (!withCnn.ok && withCnn.trace.stuck.isNotEmpty()) println("    stuck:  ${withCnn.trace.stuck.take(STUCK_SHOWN)}")
        if (!withCnn.ok) {
            println("    deciders: ${withCnn.commits}")
            println("    baseline stuck: ${baseline.trace.stuck.take(STUCK_SHOWN)}")
            baseline.trace.notes.forEach { println("    base-note: $it") }
            withCnn.trace.notes.forEach { println("    note: $it") }
        }
    }
    println(totals(results))
    println(timing(results.map { it.second }))
    println("================================================================================\n")
}

/** How many diverging clips there are, split by whether the diff path already failed. */
private fun totals(results: List<Pair<SimResult, SimResult>>): String {
    val n = results.size
    val baseOk = results.count { it.first.ok }
    val cnnOk = results.count { it.second.ok }
    val regressions = results.count { it.first.ok && !it.second.ok }
    return "\ndiff-only: $baseOk/$n reproduce labels.json | cnn-on: $cnnOk/$n | CNN-caused regressions: $regressions"
}

private fun timing(runs: List<SimResult>): String {
    val t = SimTimings()
    runs.forEach {
        t.frames += it.timings.frames
        t.observations += it.timings.observations
        t.warpMs += it.timings.warpMs
        t.grayMs += it.timings.grayMs
        t.motionMs += it.timings.motionMs
        t.cropMs += it.timings.cropMs
        t.inferMs += it.timings.inferMs
        t.engineMs += it.timings.engineMs
    }
    val perFrame = t.per(t.warpMs + t.grayMs + t.motionMs + t.cropMs + t.inferMs + t.engineMs)
    return "timing over ${t.frames} frames / ${t.observations} observations (desktop CPU, NOT a phone NPU):\n" +
        "  warp ${ms(t.per(t.warpMs))}  gray+CLAHE ${ms(t.per(t.grayMs))}  roi-motion ${ms(t.per(t.motionMs))}  " +
        "engine ${ms(t.per(t.engineMs))}\n" +
        "  64 crops ${ms(t.perObservation(t.cropMs))}/obs  onnx ${ms(t.perObservation(t.inferMs))}/obs  " +
        "=> ${ms(perFrame)}/frame, ${"%.1f".format(MS_PER_S / perFrame)} fps"
}

private const val MS_PER_S = 1000.0

private const val STUCK_SHOWN = 8

private fun ms(value: Double): String = "%.2fms".format(value)

private fun assertHarnessRan(results: List<Pair<SimResult, SimResult>>) {
    for ((baseline, withCnn) in results) {
        assertTrue(baseline.timings.frames > 0, "${baseline.clip}: no frame decoded — the harness never ran")
        assertEquals(baseline.timings.frames, withCnn.timings.frames, "${baseline.clip}: the two runs saw different frames")
        assertTrue(withCnn.timings.observations > 0, "${withCnn.clip}: the CNN was never asked — the seam was not exercised")
    }
}

/**
 * The one MOVE assertion. Python reproduces every one of these clips' `labels.json` at full rate
 * (`meta.sanMatchesManifestAtFullRate`), and this run is full rate with the same config, so a
 * diff-only failure here is a real Kotlin finding — never something to relax.
 */
private fun assertBaselineReproducesGroundTruth(results: List<Pair<SimResult, SimResult>>) {
    val failed = results.map { it.first }.filterNot { it.ok }
    assertTrue(
        failed.isEmpty(),
        "diff-only baseline diverged from labels.json: " + failed.joinToString { "${it.clip} (${it.firstDivergence()})" },
    )
}
