package com.chesslab.arena

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.MoveList

/** One ply of a reference game: what was played, and on which frame it was seen. */
data class TruthPly(
    val san: String,
    /** -1 when the reference is a PGN, which carries moves but no frames. */
    val frame: Int,
)

/** What one run produced, beside what it cost. */
class RunResult(
    val plies: List<RunPly>,
    val frames: Long,
    val reads: Long,
    val illegal: List<String>,
    val seconds: Double,
)

/** One ply as a run produced it. */
data class RunPly(
    val san: String,
    val frame: Long,
    val tsMs: Double,
)

/**
 * Three numbers, never averaged into one.
 *
 * The project rule since 2026-07-30: a phantom disqualifies, a miss is negotiable. A single
 * accuracy hides exactly the distinction every decision downstream is made on.
 */
class Score(
    val found: List<Pair<TruthPly, RunPly>>,
    val missed: List<TruthPly>,
    val invented: List<RunPly>,
    /**
     * Commits AFTER the reference runs out — neither right nor wrong here.
     *
     * Most references end where a tracker run gave up, not where the game did. Counting what comes
     * after as a phantom would punish exactly the tracker this arena is looking for, so it is
     * reported apart and checked by hand.
     */
    val beyond: List<RunPly>,
    /** Reference plies a run reached in the same number of half-moves, but in another order. */
    val reordered: Int,
    /** Frames between the reference frame and the commit, per found ply. Empty for a PGN label. */
    val lag: List<Long>,
) {
    val medianLag: Long?
        get() = lag.sorted().takeIf { it.isNotEmpty() }?.let { it[it.size / 2] }

    override fun toString(): String =
        "found ${found.size} / missed ${missed.size} / invented ${invented.size}" +
            (if (reordered == 0) "" else " · $reordered reordered") +
            (if (beyond.isEmpty()) "" else " · ${beyond.size} beyond the reference") +
            (medianLag?.let { " · median lag $it frames" } ?: "")
}

/**
 * Alignment over the POSITIONS both sequences walk through, not over their move names.
 *
 * A still frame cannot prove an order: where two half-moves land on the same board, `Nf3 e5` and
 * `e5 Nf3` are the same evidence. Our own references contain that ambiguity as fact — 8 % of their
 * plies were committed in bundles on one frame, and on `VID_20260726_233432` the bundled order is
 * demonstrably wrong. Scoring on names alone therefore punishes a tracker for a reference's guess
 * and, worse, turns every commit after the disagreement into a phantom.
 *
 * So the two sequences are matched on the placements they share. Between two shared placements a
 * run that needed the same number of half-moves has explained the same thing: those plies count as
 * found and are also counted in [Score.reordered]. A run that needed a different number, or that
 * left the reference's line entirely, has missed and invented in the plain sense.
 */
fun score(
    truth: List<TruthPly>,
    run: List<RunPly>,
): Score {
    val truthAt = placements(truth.map { it.san })
    val runAt = placements(run.map { it.san })
    val anchors = commonAnchors(truthAt, runAt)

    val found = mutableListOf<Pair<TruthPly, RunPly>>()
    val missed = mutableListOf<TruthPly>()
    val invented = mutableListOf<RunPly>()
    var reordered = 0
    var i = 0
    var j = 0
    for ((truthEnd, runEnd) in anchors) {
        val truthRun = i until truthEnd
        val runRun = j until runEnd
        // Same board reached in the same number of half-moves: the order is unprovable, so it is
        // not held against either side. Only the names may differ, and only there.
        val sameLength = truthRun.count() == runRun.count()
        if (sameLength) reordered += matched(truth, run, truthRun.zip(runRun), found)
        if (!sameLength) truthRun.forEach { missed += truth[it] }
        if (!sameLength) runRun.forEach { invented += run[it] }
        i = truthEnd
        j = runEnd
    }
    while (i < truth.size) missed += truth[i++]
    val tail = mutableListOf<RunPly>()
    while (j < run.size) tail += run[j++]
    // What is left once the reference is exhausted lies BEYOND it, not against it — but only when
    // the reference was actually walked to its end. A run that skipped plies and then kept going
    // has phantoms, and those stay phantoms.
    val beyond = if (missed.isEmpty()) tail else emptyList()
    if (beyond.isEmpty()) invented += tail
    val lag = found.filter { it.first.frame >= 0 }.map { it.second.frame - it.first.frame }
    return Score(found, missed, invented, beyond, reordered, lag)
}

/** Pairs one segment's plies onto each other and reports how many of them changed name. */
private fun matched(
    truth: List<TruthPly>,
    run: List<RunPly>,
    pairs: List<Pair<Int, Int>>,
    into: MutableList<Pair<TruthPly, RunPly>>,
): Int {
    for ((a, b) in pairs) into += truth[a] to run[b]
    return pairs.count { (a, b) -> truth[a].san != run[b].san }
}

/**
 * The placement after each half-move, plus the start position at index 0.
 *
 * Placement only — the camera cannot see whose turn it is or what is still castleable, and a
 * transposition to the same picture is the same evidence.
 */
private fun placements(sans: List<String>): List<String> {
    val board = Board()
    val out = mutableListOf(placementOf(board))
    for (san in sans) {
        val list = MoveList(board.fen)
        val played = runCatching { list.loadFromSan(san) }.isSuccess
        if (!played || list.isEmpty()) break
        board.doMove(list.first())
        out += placementOf(board)
    }
    return out
}

private fun placementOf(board: Board): String = board.fen.substringBefore(' ')

/**
 * Indices into both placement lists where the two sequences stand on the same board, longest
 * common subsequence, in order. The final pair is always the end of whichever run out first.
 */
private fun commonAnchors(
    truthAt: List<String>,
    runAt: List<String>,
): List<Pair<Int, Int>> {
    val lcs = Array(truthAt.size + 1) { IntArray(runAt.size + 1) }
    for (a in truthAt.indices.reversed()) {
        for (b in runAt.indices.reversed()) {
            lcs[a][b] = if (truthAt[a] == runAt[b]) 1 + lcs[a + 1][b + 1] else maxOf(lcs[a + 1][b], lcs[a][b + 1])
        }
    }
    val out = mutableListOf<Pair<Int, Int>>()
    var a = 0
    var b = 0
    while (a < truthAt.size && b < runAt.size) {
        when {
            truthAt[a] == runAt[b] -> {
                if (a > 0 || b > 0) out += a to b
                a += 1
                b += 1
            }
            lcs[a + 1][b] >= lcs[a][b + 1] -> a += 1
            else -> b += 1
        }
    }
    return out
}
