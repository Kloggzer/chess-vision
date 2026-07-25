package com.chesslab.tracker.speech

import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap

/**
 * The one place `TextToSpeech` is touched.
 *
 * Initialisation is asynchronous and the first announcement is the reason the engine was opened at
 * all, so exactly one utterance is held back until init reports success — dropping it would make
 * the first move of every session silent.
 */
class AndroidTts(
    context: Context,
    private val onState: (SpeechState) -> Unit,
) : Tts {
    private val callbacks = ConcurrentHashMap<String, () -> Unit>()
    private var counter = 0L
    private var ready = false
    private var deferred: (() -> Unit)? = null
    private var language = Locale.US.toLanguageTag()

    private val tts =
        TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) {
                ready = true
                applyLanguage()
                deferred?.invoke()
                deferred = null
            } else {
                onState(SpeechState.Failed("TextToSpeech init failed ($status)"))
            }
        }

    init {
        tts.setAudioAttributes(
            AudioAttributes
                .Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build(),
        )
        tts.setOnUtteranceProgressListener(
            object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String) = Unit

                override fun onDone(utteranceId: String) {
                    callbacks.remove(utteranceId)?.invoke()
                }

                // A failed utterance must still free its queue slot, or speech stops forever.
                @Deprecated("Base class only declares the deprecated overload as abstract.")
                override fun onError(utteranceId: String) {
                    callbacks.remove(utteranceId)?.invoke()
                }
            },
        )
    }

    override fun setLanguage(tag: String): SpeechState {
        language = tag
        return if (ready) applyLanguage() else SpeechState.Uninitialised
    }

    override fun speak(
        text: String,
        flush: Boolean,
        onDone: () -> Unit,
    ) {
        if (!ready) {
            deferred = { speak(text, flush, onDone) }
            return
        }
        val id = "u${counter++}"
        callbacks[id] = onDone
        val mode = if (flush) TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD
        if (tts.speak(text, mode, null, id) != TextToSpeech.SUCCESS) callbacks.remove(id)?.invoke()
    }

    override fun shutdown() {
        tts.stop()
        tts.shutdown()
    }

    /** Missing voice data falls back to US English — a wrong accent beats no announcement. */
    private fun applyLanguage(): SpeechState {
        val result = tts.setLanguage(Locale.forLanguageTag(language))
        val state =
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                tts.language = Locale.US
                SpeechState.LanguageMissing(language)
            } else {
                SpeechState.Ready(language)
            }
        onState(state)
        return state
    }
}

/** True when the user has told the phone to be quiet — by ringer switch or by Do-Not-Disturb. */
internal fun silencedBy(
    ringerMode: Int,
    interruptionFilter: Int,
): Boolean =
    ringerMode != AudioManager.RINGER_MODE_NORMAL ||
        interruptionFilter != NotificationManager.INTERRUPTION_FILTER_ALL

class AndroidSilence(
    context: Context,
) : Silence {
    private val audio = context.getSystemService(AudioManager::class.java)
    private val notifications = context.getSystemService(NotificationManager::class.java)

    private val focus =
        AudioFocusRequest
            .Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
            .setAudioAttributes(
                AudioAttributes
                    .Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build(),
            ).build()

    // Reading the interruption filter needs no ACCESS_NOTIFICATION_POLICY — only changing it does.
    override fun silenced(): Boolean = silencedBy(audio.ringerMode, notifications.currentInterruptionFilter)

    override fun requestFocus(): Boolean = audio.requestAudioFocus(focus) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED

    override fun abandonFocus() {
        audio.abandonAudioFocusRequest(focus)
    }
}

/** The composition root's one-liner: a speech engine wired to this device. */
fun androidSpeechEngine(context: Context): SpeechEngine = SpeechEngine(AndroidSilence(context)) { onState -> AndroidTts(context, onState) }
