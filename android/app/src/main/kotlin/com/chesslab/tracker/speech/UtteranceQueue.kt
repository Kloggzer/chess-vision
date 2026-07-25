package com.chesslab.tracker.speech

/**
 * A bounded, drop-the-stale utterance queue.
 *
 * A four-ply recovery commits four moves in one tick. Narrating all of them is worse than useless
 * — by the time the fourth is spoken the board has moved on — so the middle is dropped and
 * summarised, and the NEWEST moves are the ones that survive.
 */
internal class UtteranceQueue(
    private val max: Int,
    private val summary: (Int) -> String,
    private val out: (String, Boolean) -> Unit,
) {
    private val waiting = ArrayDeque<String>()
    private var inFlight = 0
    private var dropped = 0

    val idle: Boolean get() = inFlight == 0 && waiting.isEmpty()

    fun offer(text: String) {
        waiting.addLast(text)
        while (waiting.size + inFlight > max) {
            waiting.removeFirst()
            dropped++
        }
        pump()
    }

    /** The alarm: it interrupts, and it invalidates everything behind it. */
    fun flush(text: String) {
        clear()
        inFlight = 1
        out(text, true)
    }

    fun done() {
        if (inFlight > 0) inFlight--
        pump()
    }

    fun dropWaiting() {
        waiting.clear()
        dropped = 0
    }

    fun clear() {
        dropWaiting()
        inFlight = 0
    }

    private fun pump() {
        if (inFlight > 0) return
        val next = waiting.removeFirstOrNull() ?: summaryOrNull() ?: return
        inFlight++
        out(next, false)
    }

    /** Spoken once, after the burst has drained — "and 7 more moves" mid-burst helps nobody. */
    private fun summaryOrNull(): String? {
        if (dropped == 0) return null
        val n = dropped
        dropped = 0
        return summary(n)
    }
}
