package com.chesslab.arena

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
    /** Frames between the reference frame and the commit, per found ply. Empty for a PGN label. */
    val lag: List<Long>,
) {
    val medianLag: Long?
        get() = lag.sorted().takeIf { it.isNotEmpty() }?.let { it[it.size / 2] }

    override fun toString(): String =
        "found ${found.size} / missed ${missed.size} / invented ${invented.size}" +
            (if (beyond.isEmpty()) "" else " · ${beyond.size} beyond the reference") +
            (medianLag?.let { " · median lag $it frames" } ?: "")
}

/**
 * Longest common subsequence over the SANs — order-preserving, so a move committed out of order
 * counts as invented rather than matching a later identical SAN backwards.
 */
fun score(
    truth: List<TruthPly>,
    run: List<RunPly>,
): Score {
    val lcs = Array(truth.size + 1) { IntArray(run.size + 1) }
    for (i in truth.indices.reversed()) {
        for (j in run.indices.reversed()) {
            lcs[i][j] = if (truth[i].san == run[j].san) 1 + lcs[i + 1][j + 1] else maxOf(lcs[i + 1][j], lcs[i][j + 1])
        }
    }
    val found = mutableListOf<Pair<TruthPly, RunPly>>()
    val missed = mutableListOf<TruthPly>()
    val invented = mutableListOf<RunPly>()
    var i = 0
    var j = 0
    while (i < truth.size && j < run.size) {
        when {
            truth[i].san == run[j].san -> found += truth[i++] to run[j++]
            lcs[i + 1][j] >= lcs[i][j + 1] -> missed += truth[i++]
            else -> invented += run[j++]
        }
    }
    while (i < truth.size) missed += truth[i++]
    // What is left once the reference is exhausted lies BEYOND it, not against it — but only when
    // the reference was actually walked to its end. A run that skipped plies and then kept going
    // has phantoms, and those stay phantoms.
    val tail = mutableListOf<RunPly>()
    while (j < run.size) tail += run[j++]
    val beyond = if (missed.isEmpty()) tail else emptyList()
    if (beyond.isEmpty()) invented += tail
    val lag = found.filter { it.first.frame >= 0 }.map { it.second.frame - it.first.frame }
    return Score(found, missed, invented, beyond, lag)
}
