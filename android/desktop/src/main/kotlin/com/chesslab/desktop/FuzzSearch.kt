package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import java.io.File
import kotlin.random.Random

// Zufallssuche ueber Szene UND Konfiguration: welcher Engine-Zustand ist ueberhaupt erreichbar,
// und welcher Wert war dafuer noetig. Was der Befund NICHT sagt: dass die noetige Eingabe real
// vorkommt — dafuer ist `Envelope` da. `docs/engine-fuzz.md`.

/** Rand des plausiblen Bereichs aus `scripts/screen_knobs.py`, absichtlich weiter gefasst. */
private val KNOBS: Map<String, Pair<Double, Double>> =
    mapOf(
        "motionThr" to (0.02 to 1.20),
        "motionPxThr" to (2.0 to 80.0),
        "zThr" to (0.5 to 9.0),
        "maxChanged" to (2.0 to 16.0),
        "cnnConfThr" to (0.40 to 0.995),
        "cnnMinAgreement" to (0.50 to 0.999),
        "occlCensusThr" to (2.0 to 90.0),
        "occlusionColorThr" to (0.2 to 20.0),
        "occluderHoldS" to (0.0 to 1.5),
        "pOccludedThr" to (0.05 to 0.98),
        "verifyWindow" to (1.0 to 40.0),
        "verifyTimeoutS" to (0.1 to 12.0),
        "verifyObsVotes" to (1.0 to 8.0),
        "alarmDeferObs" to (0.0 to 12.0),
        "alarmMinS" to (0.1 to 12.0),
        "recoveryMaxPlies" to (1.0 to 14.0),
        "minConfidentRecovery" to (1.0 to 40.0),
        "minConfidentBoard" to (4.0 to 64.0),
        "autoResyncObsN" to (0.0 to 12.0),
        "desyncObsN" to (1.0 to 16.0),
        "driftWindowS" to (2.0 to 180.0),
        "nudgeTimeoutS" to (0.3 to 30.0),
        "motionRecencyS" to (1.0 to 120.0),
        "cornerJumpPx" to (0.5 to 40.0),
        "commitHoldS" to (0.0 to 0.6),
        "motionHoldS" to (0.0 to 1.5),
        "refusedStreakForEval" to (1.0 to 12.0),
        "censusThr" to (5.0 to 95.0),
    )

private val INTEGRAL =
    setOf(
        "maxChanged",
        "verifyWindow",
        "verifyObsVotes",
        "alarmDeferObs",
        "recoveryMaxPlies",
        "minConfidentRecovery",
        "minConfidentBoard",
        "autoResyncObsN",
        "desyncObsN",
        "refusedStreakForEval",
    )

/**
 * `trials` ist die Erreichbarkeits-Groesse, nicht `hits`: das Maximum haelt je EINE Extremszene
 * und ist gegen alles zweiter Ordnung blind — ein Schatten-Rendering aenderte 17 Maxima um null.
 */
internal data class Witness(
    val trials: Int,
    val hits: Int,
    val scene: Scene,
    val overrides: Map<String, Double>,
)

private fun sampleScene(rng: Random): Scene =
    Scene(
        plies = rng.nextInt(2, 9),
        stillFrames = rng.nextInt(2, 40),
        moveFrames = rng.nextInt(1, 20),
        motionPeak = rng.nextDouble(0.0, Envelope.MOTION_MAX),
        motionFloor = rng.nextDouble(0.0, 2.0),
        handFrames = if (rng.nextInt(3) == 0) rng.nextInt(1, 60) else 0,
        handSquares = rng.nextInt(0, Envelope.HAND_SQUARES_MAX + 1),
        handCoverage = rng.nextDouble(0.0, 1.0),
        obsConf = rng.nextDouble(0.30, 0.999),
        obsEvery = rng.nextInt(1, 30),
        obsLagFrames = rng.nextInt(0, Envelope.OBS_LAG_MAX + 1),
        obsWrong = if (rng.nextInt(2) == 0) rng.nextInt(1, 20) else 0,
        luma = rng.nextDouble(2.0, 240.0),
    )

private fun sampleOverrides(rng: Random): Map<String, Double> {
    val picked = KNOBS.keys.shuffled(rng).take(rng.nextInt(1, KNOBS.size / 2))
    return picked.associateWith { knob ->
        val (lo, hi) = KNOBS.getValue(knob)
        val raw = rng.nextDouble(lo, hi)
        if (knob in INTEGRAL) kotlin.math.round(raw) else raw
    }
}

/**
 * Szene und Konfiguration zusammen ziehen, weil die Zustaende an BEIDEM haengen: ein Knopf, dessen
 * Situation die Szene nie erzeugt, sieht sonst genauso stumm aus wie einer, der nichts tut.
 */
internal fun fuzzSearch(
    trials: Int,
    seed: Long,
    onProgress: (Int) -> Unit = {},
): Map<String, Witness> {
    val best = HashMap<String, Witness>()
    val rng = Random(seed)
    for (trial in 0 until trials) {
        val scene = sampleScene(rng)
        val overrides = sampleOverrides(rng)
        val config = runCatching { TrackerConfig().withOverrides(overrides) }.getOrNull() ?: continue
        val out = runCatching { fuzzRun(config, scene, seed = rng.nextLong()) }.getOrNull() ?: continue
        for ((state, hits) in out.reached) {
            if (state.startsWith("note:")) continue
            val seen = best[state]
            best[state] =
                if (seen == null || hits > seen.hits) {
                    Witness((seen?.trials ?: 0) + 1, hits, scene, overrides)
                } else {
                    seen.copy(trials = seen.trials + 1)
                }
        }
        onProgress(trial)
    }
    return best
}

/** `fuzz [trials] [seed] [out=<datei>]` — kein OpenCV, kein Modell, keine Aufnahme. */
internal fun fuzzVerb(args: List<String>) {
    val trials = args.getOrNull(0)?.toIntOrNull() ?: DEFAULT_TRIALS
    val seed = args.getOrNull(1)?.toLongOrNull() ?: 1L
    val out = args.firstOrNull { it.startsWith("out=") }?.removePrefix("out=")
    val started = System.nanoTime()
    val found = fuzzSearch(trials, seed) { if (it % PROGRESS_EVERY == 0) println("... $it/$trials") }
    val seconds = (System.nanoTime() - started) / 1e9
    println("$trials Laeufe in %.1f s (%.1f ms je Lauf)".format(seconds, seconds * 1000 / trials))
    println()
    println("%-28s %8s %8s  %s".format("Zustand", "Treffer", "max", "noetig dafuer"))
    for ((state, w) in found.entries.sortedByDescending { it.value.trials }) {
        println("%-28s %7d/%d %8d  %s".format(state, w.trials, trials, w.hits, describe(w)))
    }
    out?.let { path ->
        File(path).writeText(
            found.entries.sortedBy { it.key }.joinToString("\n") { (s, w) ->
                "$s\t${w.hits}\t${w.scene}\t${w.overrides}"
            },
            Charsets.UTF_8,
        )
        println("\ngeschrieben: $path")
    }
}

private fun describe(w: Witness): String {
    val knobs = w.overrides.entries.joinToString(" ") { "%s=%.4g".format(it.key, it.value) }
    return "motionPeak=%.1f hand=%d/%d obsConf=%.2f | %s".format(
        w.scene.motionPeak,
        w.scene.handSquares,
        w.scene.handFrames,
        w.scene.obsConf,
        knobs,
    )
}

private const val DEFAULT_TRIALS = 200
private const val PROGRESS_EVERY = 50
