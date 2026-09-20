package com.chesslab.desktop

import com.chesslab.cnn.observationFromProbs
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEngine
import kotlin.random.Random

// Erreichbarkeit OHNE Bilder: `FrameInput` traegt Bewegung, Deckung und Helligkeit als blanke
// Zahlen, also kein Dekodieren, kein Warp, keine Inferenz. `docs/engine-fuzz.md`.
private const val INSET = 0.16
private const val LIGHT_SQUARE = 150
private const val DARK_SQUARE = 85
private const val WHITE_PIECE = 62
private const val BLACK_PIECE = -48
private const val HAND_LEVEL = 30
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

    fun of(level: Int): IntArray =
        fields.getOrPut(level) {
            val rng = Random(seed + level * PRIME)
            IntArray(size * size) { rng.nextInt(TEXTURE) }
        }
}

private fun paint(
    data: ByteArray,
    square: String,
    level: Int,
    size: Int,
    texture: Texture,
) {
    val noise = texture.of(level)
    val r = rectOf(square, size)
    for (y in r[1] until r[3]) {
        val row = y * size
        for (x in r[0] until r[2]) {
            data[row + x] = (level + noise[row + x]).coerceIn(0, 255).toByte()
        }
    }
}

/** Die Textur haengt an (Feld, Fuellung), NICHT am Frame: ein ruhendes Brett muss bytegleiche
 *  Bilder liefern, sonst sieht die Engine in jedem Frame das ganze Brett wechseln. */
private fun levelOf(
    square: String,
    truth: Map<String, Char>,
    hand: Set<String>,
): Int {
    val ground = if ((FILES.indexOf(square[0]) + square[1].code) % 2 == 0) DARK_SQUARE else LIGHT_SQUARE
    if (square in hand) return HAND_LEVEL
    val piece = truth[square] ?: return ground
    return ground + if (piece.isUpperCase()) WHITE_PIECE else BLACK_PIECE
}

private fun grayOf(
    truth: Map<String, Char>,
    hand: Set<String>,
    size: Int,
    texture: Texture,
): GrayImage {
    val data = ByteArray(size * size) { DARK_SQUARE.toByte() }
    for (sq in squares()) {
        paint(data, sq, levelOf(sq, truth, hand), size, texture)
    }
    return GrayImage(size, size, data)
}

private fun bgrOf(gray: GrayImage): BgrImage = BgrImage(gray.width, gray.height, ByteArray(gray.data.size * 3) { gray.data[it / 3] })

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
        val name = if (sq in wrong) CLASSES.first { it != truthName } else truthName
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
        val gray = grayOf(truth, hand, size, texture)
        engine.onFrame(FrameInput(seq, gray, bgrOf(gray), corners, motion, coverage, scene.luma, tsMs))
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
