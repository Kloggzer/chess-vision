package com.chesslab.tracker.speech

/** A four-ply recovery commits four moves in one tick: the middle is dropped and summarised, the NEWEST survive. */
internal class UtteranceQueue(
    private val max: Int,
    private val summary: (Int) -> String,
    private val out: (String, Boolean, Int) -> Unit,
) {
    private val waiting = ArrayDeque<String>()
    private var inFlight = 0
    private var dropped = 0

    /** Steigt bei jedem [clear]: die Meldung eines abgeraeumten Spruchs traegt die alte Zahl und darf den
     *  Platz seines Nachfolgers nicht freigeben. */
    private var generation = 0

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
        out(text, true, generation)
    }

    /** Der unterbrochene meldet trotzdem fertig (`onStop` ruft `onDone`), und das raeumte den Platz des Alarms. */
    fun done(at: Int) {
        if (at != generation) return
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
        generation++
    }

    private fun pump() {
        if (inFlight > 0) return
        val next = waiting.removeFirstOrNull() ?: summaryOrNull() ?: return
        inFlight++
        out(next, false, generation)
    }

    private fun summaryOrNull(): String? {
        if (dropped == 0) return null
        val n = dropped
        dropped = 0
        return summary(n)
    }
}
