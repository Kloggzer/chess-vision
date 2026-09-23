package com.chesslab.tracker.speech

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.Closeable

/** At most this many utterances are alive at once — one speaking, the rest waiting. */
private const val MAX_PENDING = 3

sealed interface SpeechState {
    data object Uninitialised : SpeechState

    data class Ready(
        val locale: String,
    ) : SpeechState

    data class LanguageMissing(
        val locale: String,
    ) : SpeechState

    data class Failed(
        val reason: String,
    ) : SpeechState
}

/** `TextToSpeech` cannot be constructed on the desktop JVM, so every decision sits above this seam. */
interface Tts {
    fun setLanguage(tag: String): SpeechState

    fun speak(
        text: String,
        flush: Boolean,
        onDone: () -> Unit,
    )

    fun shutdown()
}

interface Silence {
    fun silenced(): Boolean

    fun requestFocus(): Boolean

    fun abandonFocus()
}

interface Speaker {
    fun say(
        text: String,
        flush: Boolean = false,
    )

    fun setLanguage(tag: String) = Unit

    /** The alarm latched: whatever is still queued describes a board we no longer believe in. */
    fun dropPending()

    fun close()
}

/** [open] is a factory: with speech off an idle tracker never binds the TTS service. */
class SpeechEngine(
    private val silence: Silence,
    private val open: ((SpeechState) -> Unit) -> Tts?,
) : Speaker,
    Closeable {
    private val current = MutableStateFlow<SpeechState>(SpeechState.Uninitialised)
    val state: StateFlow<SpeechState> = current.asStateFlow()

    private var tts: Tts? = null
    private var language = "en-US"
    private val queue = UtteranceQueue(MAX_PENDING, { MovePhrase.moreMoves(it, language) }, ::emit)

    override fun setLanguage(tag: String) {
        if (tag == language) return
        language = tag
        tts?.let { current.value = it.setLanguage(tag) }
    }

    override fun say(
        text: String,
        flush: Boolean,
    ) {
        if (silence.silenced() || !silence.requestFocus()) return
        val engine =
            tts ?: open { current.value = it }?.also {
                tts = it
                current.value = it.setLanguage(language)
            }
        if (engine == null) {
            current.value = SpeechState.Failed("no TextToSpeech engine")
            // Nothing will speak: holding the focus would duck the user's music for the rest of the session.
            silence.abandonFocus()
            return
        }
        if (flush) queue.flush(text) else queue.offer(text)
    }

    override fun dropPending() = queue.dropWaiting()

    override fun close() {
        queue.clear()
        tts?.shutdown()
        tts = null
        silence.abandonFocus()
        current.value = SpeechState.Uninitialised
    }

    private fun emit(
        text: String,
        flush: Boolean,
        generation: Int,
    ) {
        tts?.speak(text, flush) {
            queue.done(generation)
            // Never hold focus while idle: a ducked music player must come back up between moves.
            if (queue.idle) silence.abandonFocus()
        }
    }
}
