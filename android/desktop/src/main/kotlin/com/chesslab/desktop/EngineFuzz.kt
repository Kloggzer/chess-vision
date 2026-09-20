package com.chesslab.desktop

import com.chesslab.cnn.CnnRecovery
import com.chesslab.cnn.observationFromProbs
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEngine
import com.chesslab.tracker.service.cnnConfig
import kotlin.random.Random

// Erreichbarkeit OHNE Bilder: `FrameInput` traegt Bewegung, Deckung und Helligkeit als blanke
// Zahlen, also kein Dekodieren, kein Warp, keine Inferenz. `docs/engine-fuzz.md`.
private const val INSET = 0.16
private const val LIGHT_SQUARE = 150
private const val DARK_SQUARE = 85
private const val WHITE_PIECE = 62
private const val BLACK_PIECE = -48
private const val HAND_LEVEL = 30
private const val SHADOW_DROP = -35
private const val CONTENT_GROUND = 0
private const val CONTENT_WHITE = 1
private const val CONTENT_BLACK = 2
private const val CONTENT_HAND = 3
private const val TEXTURE = 24
private const val FRAME_MS = 33L
private const val PRIME = 1_000_003L

/** Die ausgelieferte Reihenfolge; `empty` zuerst, sonst liest `observationFromProbs` falsch. */
private val CLASSES =
    listOf("empty", "wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK")

private const val FILES = "abcdefgh"

/** Die gemessene Huelle des Korpus (1 066 309 Trace-Frames): wer sie verlaesst, beweist nur,
 *  dass der Code den Zustand HAT — nicht, dass er vorkommt. */
internal object Envelope {
    const val MOTION_MAX = 100.0
    const val MOTION_P99 = 30.1
    const val HAND_SQUARES_MAX = 47
    const val OBS_LAG_MAX = 41
    const val STABLE_MAX = 220
}

/** Was der synthetische Treiber erzeugt. Jedes Feld ist ein Suchparameter. */
internal data class Scene(
    val plies: Int = 8,
    val stillFrames: Int = 20,
    val moveFrames: Int = 6,
    val motionPeak: Double = 12.0,
    val motionFloor: Double = 0.2,
    val handFrames: Int = 0,
    val handSquares: Int = 0,
    val handCoverage: Double = 1.0,
    val obsConf: Double = 0.95,
    val obsEvery: Int = 2,
    val obsLagFrames: Int = 0,
    val obsWrong: Int = 0,
    val luma: Double = 120.0,
)

/** Welche Zustaende der Lauf erreicht hat — dieselben Achsen, die `ReplayTrace` schreibt. */
internal data class FuzzResult(
    val frames: Int,
    val reached: Map<String, Int>,
    val committed: Int,
) {
    fun hits(target: String): Int = reached[target] ?: 0
}

internal fun squares(): List<String> = buildList { for (r in 1..8) for (f in FILES) add("" + f + r) }

private fun startTruth(): MutableMap<String, Char> {
    val truth = HashMap<String, Char>(SQUARES)
    val back = "RNBQKBNR"
    for ((i, f) in FILES.withIndex()) {
        truth["" + f + "1"] = back[i]
        truth["" + f + "2"] = 'P'
        truth["" + f + "7"] = 'p'
        truth["" + f + "8"] = back[i].lowercaseChar()
    }
    return truth
}

private const val SQUARES = 64

/** `col = Linie`, `row = 8 - Rang` — dieselbe Abbildung wie `squareRegion`, das `internal` ist. */
private fun rectOf(
    square: String,
    size: Int,
): IntArray {
    val cell = size / 8
    val col = FILES.indexOf(square[0])
    val row = 8 - (square[1] - '0')
    val m = (cell * INSET).toInt()
    return intArrayOf(col * cell + m, row * cell + m, (col + 1) * cell - m, (row + 1) * cell - m)
}

/** Ein Rauschfeld je FUELLUNG. Ein gemeinsames waere schneller und falsch: dann traegt eine
 *  ankommende Figur keine neue Struktur, der Census liest einen Schatten (null Commits). */
private class Texture(
    private val size: Int,
    private val seed: Long,
) {
    private val fields = HashMap<Int, IntArray>()

    fun of(content: Int): IntArray =
        fields.getOrPut(content) {
            val rng = Random(seed + content * PRIME)
            IntArray(size * size) { rng.nextInt(TEXTURE) }
        }
}

private fun paint(
    data: ByteArray,
    square: String,
    level: Int,
    size: Int,
    noise: IntArray,
) {
    val r = rectOf(square, size)
    for (y in r[1] until r[3]) {
        val row = y * size
        for (x in r[0] until r[2]) {
            data[row + x] = (level + noise[row + x]).coerceIn(0, 255).toByte()
        }
    }
}

/** Eine Hand wirft einen Schatten auf die Nachbarfelder: dunkler, aber gleiche Farbe. Genau das
 *  trennt `ShadowVeto` von einer Verdeckung — ohne Schatten ist `verify:shadow` unerreichbar. */
private fun shadowOf(hand: Set<String>): Set<String> {
    if (hand.isEmpty()) return emptySet()
    val out = HashSet<String>()
    for (sq in hand) {
        val col = FILES.indexOf(sq[0])
        val rank = sq[1] - '0'
        for (dc in -1..1) {
            for (dr in -1..1) {
                val c = col + dc
                val r = rank + dr
                if (c in 0..7 && r in 1..8) out += "" + FILES[c] + r
            }
        }
    }
    return out - hand
}

/** Der Schluessel der Textur ist der INHALT, nicht die Helligkeit: ein Schatten laesst das Muster
 *  stehen und senkt nur den Wert — sonst faellt er durch Cucchiaras Farbton-Pruefung. */
private fun contentOf(
    square: String,
    truth: Map<String, Char>,
    hand: Set<String>,
): Int {
    if (square in hand) return CONTENT_HAND
    val piece = truth[square] ?: return CONTENT_GROUND
    return if (piece.isUpperCase()) CONTENT_WHITE else CONTENT_BLACK
}

private fun levelOf(
    square: String,
    truth: Map<String, Char>,
    hand: Set<String>,
    shadow: Set<String>,
): Int {
    val ground = if ((FILES.indexOf(square[0]) + square[1].code) % 2 == 0) DARK_SQUARE else LIGHT_SQUARE
    if (square in hand) return HAND_LEVEL
    val drop = if (square in shadow) SHADOW_DROP else 0
    val piece = truth[square] ?: return ground + drop
    return ground + drop + if (piece.isUpperCase()) WHITE_PIECE else BLACK_PIECE
}

/** Die Textur haengt an (Feld, Fuellung), NICHT am Frame: ein ruhendes Brett muss bytegleiche
 *  Bilder liefern, sonst sieht die Engine in jedem Frame das ganze Brett wechseln. */

private fun grayOf(
    truth: Map<String, Char>,
    hand: Set<String>,
    shadow: Set<String>,
    size: Int,
    texture: Texture,
): GrayImage {
    val data = ByteArray(size * size) { DARK_SQUARE.toByte() }
    for (sq in squares()) {
        paint(data, sq, levelOf(sq, truth, hand, shadow), size, texture.of(contentOf(sq, truth, hand)))
    }
    return GrayImage(size, size, data)
}

/** Der Schatten-Veto und die Verdeckungs-Farbachse lesen Chroma. Ein graues Bild macht sie
 *  konstruktiv tot — `verify:shadow` war deshalb unerreichbar, nicht selten. */
private fun tintOf(
    square: String,
    truth: Map<String, Char>,
    hand: Set<String>,
): IntArray {
    if (square in hand) return intArrayOf(-20, 5, 45)
    val piece = truth[square] ?: return intArrayOf(0, 0, 0)
    return if (piece.isUpperCase()) intArrayOf(-10, 0, 12) else intArrayOf(8, 0, -8)
}

private fun bgrOf(
    gray: GrayImage,
    truth: Map<String, Char>,
    hand: Set<String>,
): BgrImage {
    val size = gray.width
    val data = ByteArray(gray.data.size * 3)
    for (sq in squares()) {
        val tint = tintOf(sq, truth, hand)
        val r = rectOf(sq, size)
        for (y in r[1] until r[3]) {
            for (x in r[0] until r[2]) {
                val base = gray.data[y * size + x].toInt() and BYTE_MASK
                for (c in 0 until 3) {
                    data[(y * size + x) * 3 + c] = (base + tint[c]).coerceIn(0, BYTE_MASK).toByte()
                }
            }
        }
    }
    return BgrImage(size, size, data)
}

private const val BYTE_MASK = 255

private fun pieceName(piece: Char): String = (if (piece.isUpperCase()) "w" else "b") + piece.uppercaseChar()

/** Die Zeilen, die das Modell liefern WUERDE: Spitze auf der Wahrheit, Rest gleichverteilt. */
private fun probsOf(
    truth: Map<String, Char>,
    hand: Set<String>,
    scene: Scene,
    rng: Random,
): Map<String, DoubleArray> {
    val all = squares()
    val wrong = if (scene.obsWrong <= 0) emptySet() else all.shuffled(rng).take(scene.obsWrong).toSet()
    val rows = LinkedHashMap<String, DoubleArray>(all.size)
    for (sq in all) {
        val piece = truth[sq]
        val truthName = if (piece == null) "empty" else pieceName(piece)
        // Eine FESTE Fehlklasse ist kein Rauschen: der Resync-Pfad sucht eine Stellung, die die
        // Beobachtung erklaert, und die gibt es zu immer derselben Verwechslung nie.
        val name = if (sq in wrong) CLASSES.filter { it != truthName }.random(rng) else truthName
        val row = DoubleArray(CLASSES.size + 1) { (1.0 - scene.obsConf) / (CLASSES.size - 1) }
        row[CLASSES.indexOf(name)] = scene.obsConf
        row[CLASSES.size] = if (sq in hand) 1.0 else 0.0
        rows[sq] = row
    }
    return rows
}

/** Eine kurze, legale Linie — der Fuzzer sucht Zustaende, nicht Eroeffnungen. */
private val LINE =
    listOf(
        "e2e4",
        "e7e5",
        "g1f3",
        "b8c6",
        "f1c4",
        "g8f6",
        "d2d3",
        "f8c5",
        "c2c3",
        "d7d6",
        "b2b4",
        "c5b6",
        "a2a4",
        "a7a6",
        "b1d2",
        "h7h6",
    )

private fun cornersOf(size: Int): FloatArray = floatArrayOf(0f, 0f, size.toFloat(), 0f, size.toFloat(), size.toFloat(), 0f, size.toFloat())

@Suppress("LongMethod")
internal fun fuzzRun(
    config: TrackerConfig,
    scene: Scene,
    seed: Long = 1L,
): FuzzResult {
    val reached = HashMap<String, Int>()
    var committed = 0
    val engine =
        TrackerEngine(
            config,
            decisionSink = { if (it.san != null) committed += 1 },
            stateSink = { _, to, _ -> reached.merge("state:" + to, 1, Int::plus) },
        )
    // OHNE Evaluator committet Verify den Kandidaten sofort, statt die Leiter zu fahren: der
    // erste Lauf erreichte `resynced`/`ghost`/`shadow` deshalb nie, obwohl der Korpus sie traegt.
    engine.attachCnn(CnnRecovery(cnnConfig(config)))
    engine.setDebugEnabled(true)
    // Die Engine indiziert Felder auf `boardSize * detectScale`; eine eigene Groesse fliegt raus.
    val size = (config.boardSize * config.detectScale).toInt()
    val corners = cornersOf(size)
    val texture = Texture(size, seed * PRIME)
    val truth = startTruth()
    val rng = Random(seed)
    val pending = ArrayDeque<Pair<Long, CnnSnapshot>>()
    var seq = 0L
    var tsMs = 0L

    fun tick(
        motion: Double,
        hand: Set<String>,
        coverage: Double,
    ) {
        val gray = grayOf(truth, hand, shadowOf(hand), size, texture)
        val bgr = bgrOf(gray, truth, hand)
        engine.onFrame(FrameInput(seq, gray, bgr, corners, motion, coverage, scene.luma, tsMs))
        if (seq % scene.obsEvery == 0L) {
            val obs = observationFromProbs(probsOf(truth, hand, scene, rng), CLASSES)
            pending += (seq + scene.obsLagFrames) to CnnSnapshot(obs, seq, tsMs, 1.0, null, null, engine.fen())
        }
        while (pending.isNotEmpty() && pending.first().first <= seq) {
            engine.onCnnSnapshot(pending.removeFirst().second)
        }
        val status = engine.status()
        reached.merge("gate:" + (status.debug?.frameGate ?: "none"), 1, Int::plus)
        status.stuckReason?.let { reached.merge("stuck:" + it, 1, Int::plus) }
        status.verifyState?.let { reached.merge("verify:" + it, 1, Int::plus) }
        status.note?.let { reached.merge("note:" + it, 1, Int::plus) }
        // Trennt "das Veto feuert nie" von "es feuert, aber die Leiter loest nie darauf auf".
        if (status.shadowVetoed.isNotEmpty()) reached.merge("veto:shadow", 1, Int::plus)
        if (status.occlusionVetoed.isNotEmpty()) reached.merge("veto:occlusion", 1, Int::plus)
        if (status.changed.isNotEmpty()) reached.merge("veto:changed", 1, Int::plus)
        seq += 1
        tsMs += FRAME_MS
    }

    for (ply in 0 until minOf(scene.plies, LINE.size)) {
        repeat(scene.stillFrames) { tick(scene.motionFloor, emptySet(), 1.0) }
        val hand = squares().take(scene.handSquares).toSet()
        repeat(scene.handFrames) { tick(scene.motionPeak, hand, scene.handCoverage) }
        repeat(scene.moveFrames) { tick(scene.motionPeak, emptySet(), 1.0) }
        val uci = LINE[ply]
        val from = uci.substring(0, 2)
        val to = uci.substring(2, 4)
        truth.remove(to)
        truth.remove(from)?.let { truth[to] = it }
    }
    repeat(scene.stillFrames) { tick(scene.motionFloor, emptySet(), 1.0) }
    return FuzzResult(seq.toInt(), reached, committed)
}
