package com.chesslab.tracker.speech

/** Ein ZWEITER `SpeechEngine` waere ein zweiter Audio-Fokus-Nehmer neben dem Zugansager. */
object SpeakerHost {
    @Volatile
    private var current: Speaker? = null

    val speaker: Speaker? get() = current

    fun publish(speaker: Speaker?) {
        current = speaker
    }
}
