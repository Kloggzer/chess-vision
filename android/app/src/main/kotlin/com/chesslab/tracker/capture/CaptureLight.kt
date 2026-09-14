package com.chesslab.tracker.capture

import android.graphics.Bitmap
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.squareToCropBox
import kotlin.math.abs

// Wo die Figuren JETZT hingehoeren — gemessen, nicht geplant.
//
// Der Plan nennt Felder nach ihrem Korpus-Median, aber das Band macht die Lampe: dasselbe Feld
// mass ueber den Korpus 6 bis 207. Also wird das rektifizierte Brett gemessen und jede Figur auf
// das Feld gelegt, das gerade wirklich im Band liegt. Liegt keines darin, sagt es die Lampe an.

/** Wie ein Feld zum geforderten Band steht. `UNMEASURED` ist kein Fehler, sondern kein Brett. */
enum class Fit { OK, TOO_DARK, TOO_BRIGHT, UNMEASURED }

data class Target(
    val square: String,
    val piece: String,
    val band: String,
    val lo: Int,
    val hi: Int,
    val measured: Int?,
    val fit: Fit,
)

/** `a1` ist dunkel — dieselbe Paritaetsregel wie `capture_plan.square_colour`. */
fun squareIsDark(square: String): Boolean {
    val file = FILES.indexOf(square.firstOrNull() ?: ' ')
    val rank = square.getOrNull(1)?.digitToIntOrNull() ?: return false
    return (file + rank - 1) % 2 == 0
}

/**
 * Grauwert-Mittel je Feld des rektifizierten Bretts, auf der Skala von `brightness` im Manifest
 * (CROP-Box und BGR-Gewichte wie `labeling.py:592`). [whitePov] MUSS die eingestellte Orientierung
 * sein — siehe [squareBoxes], sonst misst und labelt jede Figur auf dem gespiegelten Feld.
 */
fun measureSquares(
    board: Bitmap?,
    whitePov: Boolean = true,
): Map<String, Int> {
    if (board == null) return emptyMap()
    val size = minOf(board.width, board.height)
    if (size < BOARD_SIDE) return emptyMap()
    val pixels = IntArray(board.width * board.height)
    board.getPixels(pixels, 0, board.width, 0, 0, board.width, board.height)
    return squareBoxes(size, whitePov).mapValues { (_, box) ->
        meanGray(pixels, board.width, board.height, box)
    }
}

/**
 * Feld -> Crop-Box im rektifizierten Bild; getrennt, weil hier die Annahme sitzt, die ohne Bitmap
 * pruefbar sein muss. Der Warp kennt kein `whitePov`, `squareToColRow` dreht dagegen um 180 Grad:
 * bei BLACK_BOTTOM liegt `a8` da, wo `h1` sonst liegt.
 */
internal fun squareBoxes(
    boardSize: Int,
    whitePov: Boolean,
): Map<String, IntArray> {
    val geom = BoardGeometry(boardSize = boardSize, whitePov = whitePov)
    val out = LinkedHashMap<String, IntArray>(SQUARES)
    for (file in FILES) {
        for (rank in 1..BOARD_SIDE) {
            val square = "$file$rank"
            out[square] = squareToCropBox(square, geom)
        }
    }
    return out
}

private fun meanGray(
    pixels: IntArray,
    width: Int,
    height: Int,
    box: IntArray,
): Int {
    val x0 = box[0].coerceIn(0, width)
    val y0 = box[1].coerceIn(0, height)
    val x1 = box[2].coerceIn(x0, width)
    val y1 = box[3].coerceIn(y0, height)
    if (x1 <= x0 || y1 <= y0) return 0
    var sum = 0.0
    for (y in y0 until y1) {
        val row = y * width
        for (x in x0 until x1) {
            val p = pixels[row + x]
            sum += R_WEIGHT * ((p shr RED_SHIFT) and BYTE) +
                G_WEIGHT * ((p shr GREEN_SHIFT) and BYTE) +
                B_WEIGHT * (p and BYTE)
        }
    }
    return (sum / ((x1 - x0) * (y1 - y0))).toInt()
}

/**
 * Die Figuren des Auftrags auf die Felder, die JETZT im Band liegen.
 *
 * Der Vorschlag des Plans gilt nur, solange nichts Besseres gemessen wurde; die Feldfarbe bleibt
 * dabei die geforderte, denn sie ist Teil der Luecke. Passt kein Feld, bleibt die Figur auf dem
 * naechstbesten und traegt, in welche Richtung das Licht muss.
 */
fun assign(
    place: List<Placement>,
    measured: Map<String, Int>,
): List<Target> {
    if (measured.isEmpty()) {
        return place.map { Target(it.square, it.piece, it.band, it.lo, it.hi, null, Fit.UNMEASURED) }
    }
    val taken = mutableSetOf<String>()
    return place.map { p ->
        val dark = squareIsDark(p.square)
        val free = measured.keys.filter { it !in taken && squareIsDark(it) == dark }
        val middle = (p.lo + p.hi) / 2
        val inBand = free.filter { measured.getValue(it) in p.lo until p.hi }
        val square =
            (inBand.ifEmpty { free }).minByOrNull { abs(measured.getValue(it) - middle) } ?: p.square
        taken += square
        val value = measured[square]
        Target(square, p.piece, p.band, p.lo, p.hi, value, fitOf(value, p.lo, p.hi))
    }
}

/**
 * Dieselben Felder, neu beurteilt. Sobald der Mensch baut, darf [assign] nicht mehr laufen: eine
 * Figur verschiebt den Crop-Mittelwert ihres Feldes um bis zu 61 Grauwerte (Median -22 fuer
 * Schwarz, gemessen am Manifest), 16 von 80 Verschiebungen ueberspringen ein ganzes Band — die
 * erste hingestellte Figur wuerfelte die Belegung sonst neu. Das Licht bleibt beurteilt: der
 * Crop MIT Figur ist ohnehin der, der im Datensatz landet.
 */
fun refit(
    frozen: List<Target>,
    measured: Map<String, Int>,
): List<Target> =
    frozen.map {
        val value = measured[it.square]
        it.copy(measured = value, fit = fitOf(value, it.lo, it.hi))
    }

private fun fitOf(
    value: Int?,
    lo: Int,
    hi: Int,
): Fit =
    when {
        value == null -> Fit.UNMEASURED
        value < lo -> Fit.TOO_DARK
        value >= hi -> Fit.TOO_BRIGHT
        else -> Fit.OK
    }

/**
 * Wie weit das Licht seit dem Festhalten gewandert ist, als Median ueber die Zielfelder.
 *
 * Ueber acht Drehungen zieht eine Wolke oder ein Schatten das ganze Brett mit; eine Aufnahme, die
 * dabei aus dem Band laeuft, faellt sonst erst im fertigen Datensatz auf. Felder ohne aktuelle
 * Messung zaehlen NICHT mit — ein fehlender Read waere sonst ein Sturz um 200.
 */
fun driftLine(
    frozen: List<Target>,
    live: List<Target>,
): String {
    val now = live.associate { it.square to it.measured }
    val deltas =
        frozen.mapNotNull { was ->
            val then = was.measured ?: return@mapNotNull null
            now[was.square]?.let { it - then to was.square }
        }
    if (deltas.isEmpty()) return ""
    val median = deltas.map { it.first }.sorted()[deltas.size / 2]
    if (median in -DRIFT_QUIET..DRIFT_QUIET) return "Licht seit dem Aufbau stabil"
    val worst = deltas.maxByOrNull { abs(it.first) } ?: return ""
    return "Licht seit dem Aufbau $median (am staerksten ${worst.second} ${worst.first})"
}

/**
 * Ein Satz zur Lampe. Die Mehrheit entscheidet: einzelne Felder liegen auf einem Brett mit
 * Lichtgradient immer daneben, und eine Lampe kann nur alle zusammen verschieben.
 */
fun lightAdvice(targets: List<Target>): String {
    if (targets.isEmpty()) return ""
    val dark = targets.count { it.fit == Fit.TOO_DARK }
    val bright = targets.count { it.fit == Fit.TOO_BRIGHT }
    val ok = targets.count { it.fit == Fit.OK }
    if (targets.any { it.fit == Fit.UNMEASURED }) return "kein Brett im Bild — erst kalibrieren"
    return when {
        dark > bright && dark > ok -> "zu dunkel — Licht hoch ($ok von ${targets.size} passen)"
        bright > dark && bright > ok -> "zu hell — Licht runter ($ok von ${targets.size} passen)"
        ok == targets.size -> "alle ${targets.size} Felder im Band"
        else -> "$ok von ${targets.size} Feldern im Band"
    }
}

/** Unter dieser Verschiebung ist es Sensorrauschen; die schmalsten Baender sind 40 breit. */
private const val DRIFT_QUIET = 3

private const val FILES = "abcdefgh"
private const val BOARD_SIDE = 8
private const val SQUARES = 64
private const val BYTE = 0xFF
private const val RED_SHIFT = 16
private const val GREEN_SHIFT = 8
private const val R_WEIGHT = 0.299
private const val G_WEIGHT = 0.587
private const val B_WEIGHT = 0.114
