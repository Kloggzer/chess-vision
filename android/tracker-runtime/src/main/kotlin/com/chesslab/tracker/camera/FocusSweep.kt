package com.chesslab.tracker.camera

/** Eine Stufe: die gestellte Distanz (0 = unendlich, 1 = Nahgrenze) und was sie an Schaerfe brachte. */
data class FocusSample(
    val focus: Float,
    val sharpness: Float,
)

/**
 * Die Messreihe ueber den Fokusbereich — grob ueber alles, dann fein um den Gipfel.
 *
 * Zwei Durchgaenge, weil eine gleichmaessige Reihe gleicher Laenge viermal grober aufloest, und
 * die Aufloesung faellt genau dort an, wo das Brett liegt: am fernen Ende, wo eine Grobstufe auf
 * einer 10-dpt-Linse fast eine halbe Dioptrie ist.
 */
class FocusSweep(
    coarseSteps: Int = COARSE_STEPS,
    private val fineSteps: Int = FINE_STEPS,
    around: Float? = null,
) {
    private val coarseStep = 1f / (coarseSteps - 1)
    private val queue =
        ArrayDeque(if (around == null) focusPlan(coarseSteps) else finePlan(around, coarseStep, fineSteps))
    private val samples = ArrayList<FocusSample>(coarseSteps + fineSteps)

    // Ein lokaler Lauf IST schon der Feinlauf — er verfeinert nicht noch einmal.
    private var refined = around != null

    /** Waechst, sobald der Feinlauf ansteht: vorher ist noch nicht entschieden, ob er kommt. */
    val total: Int get() = samples.size + queue.size

    val done: Int get() = samples.size

    /** Der Gipfel der Reihe, oder null wenn sie keinen hergibt. */
    val best: FocusSample? get() = peakOf(samples)

    /** Die Distanz, die als naechstes anliegen muss, oder null wenn die Reihe fertig ist. */
    fun next(): Float? = queue.firstOrNull()

    fun observe(sharpness: Float) {
        val at = queue.removeFirstOrNull() ?: return
        samples += FocusSample(at, sharpness)
        if (queue.isNotEmpty() || refined) return
        refined = true
        // Ohne Gipfel im Groben gibt es nichts zu verfeinern: die Reihe ist flach, und das IST die
        // Antwort (Fixfokus, zu dunkel, Brett ausserhalb des Bereichs).
        peakOf(samples)?.let { queue.addAll(finePlan(it.focus, coarseStep, fineSteps)) }
    }
}

/**
 * Faellt die Schaerfe unter das gefundene Optimum, sagt es das — einmal je Episode.
 *
 * [needed] aufeinanderfolgende Messungen, weil ein Zug das Brett kurz verwischt und ein Arm quer
 * darueber den Median doch noch drueckt. Erst was dauerhaft weich bleibt, ist der Autofokus.
 */
class FocusWatch(
    val reference: Float,
    private val fraction: Float = SOFT_FRACTION,
    private val needed: Int = SOFT_READINGS,
) {
    private var below = 0
    private var said = false

    /** Ob die LETZTE Messung darunter lag: die Zeile soll mit dem Bild zurueckkommen. */
    var soft = false
        private set

    fun observe(sharpness: Float): Boolean {
        soft = sharpness < reference * fraction
        if (!soft) {
            below = 0
            said = false
            return false
        }
        below++
        if (below < needed || said) return false
        said = true
        return true
    }
}

/** Gleichmaessig ueber den ganzen Bereich, beide Enden eingeschlossen. */
internal fun focusPlan(steps: Int): List<Float> {
    require(steps >= 2) { "ein Sweep braucht mindestens zwei Stufen" }
    return List(steps) { it / (steps - 1f) }
}

/** [steps] Stufen um [around], eine Grobstufe [span] nach jeder Seite, geklemmt auf 0..1. */
internal fun finePlan(
    around: Float,
    span: Float,
    steps: Int,
): List<Float> {
    val from = (around - span).coerceAtLeast(0f)
    val to = (around + span).coerceAtMost(1f)
    return List(steps) { from + (to - from) * it / (steps - 1f) }
}

private fun peakOf(samples: List<FocusSample>): FocusSample? {
    if (samples.size < MIN_SAMPLES) return null
    val top = samples.maxByOrNull { it.sharpness } ?: return null
    val low = samples.minOf { it.sharpness }
    return top.takeIf { it.sharpness >= MIN_PEAK_VARIANCE && it.sharpness >= low * MIN_PEAK_RATIO }
}

/** Grobraster ueber den ganzen Bereich: 13 Stufen sind eine Zwoelftel-Spanne je Schritt. */
private const val COARSE_STEPS = 13

/** Feinraster um den Gipfel: neun Stufen ueber zwei Grobschritte loesen 2 % der Spanne auf. */
private const val FINE_STEPS = 9

/**
 * ANGESETZT, nicht gemessen: unscharf faellt die Laplace-Varianz um Groessenordnungen, also ist
 * Faktor 1,5 zwischen Gipfel und Tal weit unter jedem echten Fokusgang und weit ueber dem
 * Rauschen einer flachen Reihe. Am Geraet nachmessen, bevor die Zahl etwas traegt.
 */
private const val MIN_PEAK_RATIO = 1.5f

/** Darunter ist das Bild strukturlos (dunkel, verdeckt) und der Gipfel waere Rauschen. */
private const val MIN_PEAK_VARIANCE = 1f

private const val MIN_SAMPLES = 3

/**
 * Anteil des gefundenen Gipfels, unter dem es weich heisst.
 *
 * Der Export nimmt 45 % des Aufnahme-MEDIANS (`framescan.SHARP_MIN_FRACTION`); der Bezug hier ist
 * der Gipfel und liegt darueber, dieselbe Unschaerfe liest sich gegen ihn also kleiner. 60 % meldet
 * eher — der Preis ist eine Warnzeile, nicht ein verworfenes Brett.
 */
private const val SOFT_FRACTION = 0.6f

private const val SOFT_READINGS = 3
