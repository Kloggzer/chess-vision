package com.chesslab.tracker.speech

/** Wo eine Oberflaeche die Stimme des Dienstes findet. Ein ZWEITER `SpeechEngine` waere ein
 *  zweiter Audio-Fokus-Nehmer neben dem Zugansager — einer nimmt, der andere gibt zurueck. */
object SpeakerHost {
    @Volatile
    private var current: Speaker? = null

    val speaker: Speaker? get() = current

    fun publish(speaker: Speaker?) {
        current = speaker
    }
}
