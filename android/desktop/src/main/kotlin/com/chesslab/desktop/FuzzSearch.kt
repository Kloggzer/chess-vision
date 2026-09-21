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
    val frames: Int,
    val hits: Int,
    val scene: Scene,
    val overrides: Map<String, Double>,
)

private fun sampleScene(rng: Random): Scene =
    Scene(
        plies = rng.nextInt(2, 9),
        stillFrames = rng.nextInt(2, 40),
        moveFrames = rng.nextInt(1, 20),
        handSpeed = rng.nextInt(0, 6),
        handFrames = if (rng.nextInt(3) == 0) rng.nextInt(1, 60) else 0,
        handSquares = rng.nextInt(0, Envelope.HAND_SQUARES_MAX + 1),
        handCoverage = rng.nextDouble(0.0, 1.0),
        obsConf = rng.nextDouble(0.30, 0.999),
        obsEvery = rng.nextInt(1, 30),
        obsLagFrames = rng.nextInt(0, Envelope.OBS_LAG_MAX + 1),
        obsWrong = if (rng.nextInt(2) == 0) rng.nextInt(1, 20) else 0,
        luma = rng.nextDouble(2.0, 240.0),
        // Ohne verdeckte Zuege laufen Brett und Engine nie auseinander, und die Verify-Leiter
        // endet praktisch immer auf `confirmed` (gemessen: 13 `resynced` in 5 000 Ziehungen).
        hiddenEvery = if (rng.nextInt(2) == 0) rng.nextInt(2, 5) else 0,
        handCover = rng.nextDouble(0.2, 1.0),
        // EXKLUSIV wie am Geraet: entweder Coverage-Modell (Rillen-Arm aus) oder keins
        // (Rillen-Arm an). Beide gleichzeitig gibt es in keiner ausgelieferten Konfiguration.
        coverageModel = rng.nextInt(2) == 0,
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
): Pair<Map<String, Witness>, Int> {
    val best = HashMap<String, Witness>()
    val rng = Random(seed)
    var frames = 0
    for (trial in 0 until trials) {
        val scene = sampleScene(rng)
        val overrides = sampleOverrides(rng)
        val config = runCatching { TrackerConfig().withOverrides(overrides) }.getOrNull() ?: continue
        val out = runCatching { fuzzRun(config, scene, seed = rng.nextLong()) }.getOrNull() ?: continue
        frames += out.frames
        for ((state, hits) in out.reached) {
            if (state.startsWith("note:")) continue
            val seen = best[state]
            // `frames` summiert die Frames MIT diesem Zustand ueber alle Ziehungen — nur dieser
            // Anteil ist mit dem Korpus vergleichbar, der ebenfalls Frames zaehlt.
            best[state] =
                if (seen == null || hits > seen.hits) {
                    Witness((seen?.trials ?: 0) + 1, (seen?.frames ?: 0) + hits, hits, scene, overrides)
                } else {
                    seen.copy(trials = seen.trials + 1, frames = seen.frames + hits)
                }
        }
        onProgress(trial)
    }
    return best to frames
}

/**
 * Feste Szenen, die die Netze ansprechen: Hand ueber dem Brett, Schatten auf den Nachbarfeldern,
 * schwache Beobachtung. Sie messen NICHT die Bewertung, sondern ob ein Veto noch scharf ist.
 */
private val WACHE =
    listOf(
        Scene(plies = 4, handFrames = 24, handSquares = 10, handCoverage = 0.6),
        Scene(plies = 4, handFrames = 40, handSquares = 24, handCoverage = 0.3, obsConf = 0.55),
        Scene(plies = 4, handFrames = 12, handSquares = 4, handCoverage = 0.9, obsWrong = 6),
        Scene(plies = 6, handFrames = 30, handSquares = 16, handCoverage = 0.5, obsEvery = 5),
    )

/**
 * `fuzz ablate <knopf>` — dieselbe Frage wie `scripts/guard_ablation.ps1`, aber synthetisch:
 * welche Zustaende bewegt das Abschalten? Der Regressionssatz braucht dafuer 18 Minuten je Wache
 * und merkt bei `baselineOcclusion` NICHTS (`docs/baseline-occlusion-off.md`).
 */
internal fun fuzzAblate(args: List<String>) {
    val knopf = args.firstOrNull() ?: error("fuzz ablate <knopf> [aus=0]")
    val aus = args.getOrNull(1)?.toDoubleOrNull() ?: 0.0
    val an = wacheZustaende(TrackerConfig())
    val ohne = wacheZustaende(TrackerConfig().withOverrides(mapOf(knopf to aus)))

    val alle = (an.keys + ohne.keys).filterNot { it.startsWith("note:") }.sorted()
    val bewegt = alle.filter { an[it] != ohne[it] }
    println("$knopf = $aus gegen die Vorgabe, ueber ${WACHE.size} feste Szenen")
    if (bewegt.isEmpty()) {
        println("  KEIN Zustand bewegt sich — der Fuzzer sieht diese Wache nicht")
        return
    }
    println("  %-26s %8s %8s".format("Zustand", "an", "aus"))
    for (z in bewegt) println("  %-26s %8d %8d".format(z, an[z] ?: 0, ohne[z] ?: 0))
}

private fun wacheZustaende(config: TrackerConfig): Map<String, Int> {
    val total = HashMap<String, Int>()
    for ((i, scene) in WACHE.withIndex()) {
        for ((state, hits) in fuzzRun(config, scene, seed = (i + 1).toLong()).reached) {
            total.merge(state, hits, Int::plus)
        }
    }
    return total
}

/** `fuzz check <knopf>=<wert> ...` — sind die Netze noch scharf? Sekunden statt eines Replays. */
internal fun fuzzCheck(args: List<String>) {
    val overrides =
        args.filter { it.contains('=') }.associate {
            it.substringBefore('=') to (it.substringAfter('=').toDoubleOrNull() ?: error("kein Wert: $it"))
        }
    val config = TrackerConfig().withOverrides(overrides)
    val total = HashMap<String, Int>()
    for ((i, scene) in WACHE.withIndex()) {
        for ((state, hits) in fuzzRun(config, scene, seed = (i + 1).toLong()).reached) {
            total.merge(state, hits, Int::plus)
        }
    }
    println(
        WACHEN_ACHSEN.joinToString(" ") { "$it=${total[it] ?: 0}" },
    )
}

private val WACHEN_ACHSEN = listOf("veto:shadow", "veto:occlusion", "veto:changed", "gate:occluded")

/** `fuzz [trials] [seed] [out=<datei>]` — kein OpenCV, kein Modell, keine Aufnahme. */
internal fun fuzzVerb(args: List<String>) {
    val trials = args.getOrNull(0)?.toIntOrNull() ?: DEFAULT_TRIALS
    val seed = args.getOrNull(1)?.toLongOrNull() ?: 1L
    val out = args.firstOrNull { it.startsWith("out=") }?.removePrefix("out=")
    val started = System.nanoTime()
    val (found, frames) = fuzzSearch(trials, seed) { if (it % PROGRESS_EVERY == 0) println("... $it/$trials") }
    val seconds = (System.nanoTime() - started) / 1e9
    println("$trials Laeufe in %.1f s (%.1f ms je Lauf)".format(seconds, seconds * 1000 / trials))
    println()
    println("$frames Frames insgesamt")
    println("%-28s %9s %8s %8s  %s".format("Zustand", "Ziehungen", "Anteil", "max", "noetig dafuer"))
    for ((state, w) in found.entries.sortedByDescending { it.value.frames }) {
        // `state:*` zaehlt UEBERGAENGE, nicht Frames. Ein Anteil daran waere keine Groesse, die
        // mit dem Korpus vergleichbar ist -- darum ein Strich statt einer Zahl.
        val anteil =
            if (state.startsWith("state:")) {
                "%8s".format("-")
            } else {
                "%7.2f%%".format(PROZENT * w.frames / maxOf(1, frames))
            }
        println("%-28s %8d/%d %s %8d  %s".format(state, w.trials, trials, anteil, w.hits, describe(w)))
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
    return "handSpeed=%d hand=%d/%d obsConf=%.2f | %s".format(
        w.scene.handSpeed,
        w.scene.handSquares,
        w.scene.handFrames,
        w.scene.obsConf,
        knobs,
    )
}

private const val DEFAULT_TRIALS = 200
private const val PROZENT = 100.0
private const val PROGRESS_EVERY = 50
