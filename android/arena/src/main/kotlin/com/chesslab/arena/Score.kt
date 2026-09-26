package com.chesslab.arena

import com.chesslab.engine.api.STARTPOS
import com.chesslab.tracker.games.fensAfterSans

data class TruthPly(
    val san: String,
    /** -1 when the reference is a PGN: moves, no frames. */
    val frame: Int,
)

class RunResult(
    val plies: List<RunPly>,
    val frames: Long,
    val reads: Long,
    val illegal: List<String>,
    val seconds: Double,
)

data class RunPly(
    val san: String,
    val frame: Long,
    val tsMs: Double,
)

/** Three numbers, never averaged: a phantom disqualifies, a miss is negotiable. */
class Score(
    val found: List<Pair<TruthPly, RunPly>>,
    val missed: List<TruthPly>,
    val invented: List<RunPly>,
    /** After the reference runs out: most references end where a run gave up, so this is reported apart,
     *  not counted as phantoms. */
    val beyond: List<RunPly>,
    val reordered: Int,
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

/** Aligned over POSITIONS, not move names: a still frame cannot prove an order, and our references guessed
 *  it on 8 % of plies. Between shared placements, the same number of half-moves counts as found (and as
 *  [Score.reordered]); a different number or leaving the line is a plain miss/phantom. */
fun score(
    truth: List<TruthPly>,
    run: List<RunPly>,
    startFen: String = STARTPOS,
): Score {
    val truthAt = placements(truth.map { it.san }, startFen)
    val runAt = placements(run.map { it.san }, startFen)
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
        // Same board in the same number of half-moves: the order is unprovable, so held against neither side.
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
    // BEYOND only when the reference was walked to its end: a run that skipped plies and kept going has phantoms.
    val beyond = if (missed.isEmpty()) tail else emptyList()
    if (beyond.isEmpty()) invented += tail
    // BEIDE Seiten muessen gemessen sein: -1 heisst "kein Frame", und ein Lag daraus waere erfunden.
    val lag = found.filter { it.first.frame >= 0 && it.second.frame >= 0 }.map { it.second.frame - it.first.frame }
    return Score(found, missed, invented, beyond, reordered, lag)
}

private fun matched(
    truth: List<TruthPly>,
    run: List<RunPly>,
    pairs: List<Pair<Int, Int>>,
    into: MutableList<Pair<TruthPly, RunPly>>,
): Int {
    for ((a, b) in pairs) into += truth[a] to run[b]
    return pairs.count { (a, b) -> truth[a].san != run[b].san }
}

/** Placement only: the camera cannot see whose turn it is or castling rights. */
private fun placements(
    sans: List<String>,
    startFen: String,
): List<String> = (listOf(startFen) + fensAfterSans(startFen, sans)).map(::placementOf)

private fun placementOf(fen: String): String = fen.substringBefore(' ')

/** Longest common subsequence of shared boards; the final pair is the end of whichever ran out first. */
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
