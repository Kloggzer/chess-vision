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
import java.util.concurrent.atomic.AtomicLong

/** The flag is written on the main thread and read from `Dispatchers.Default`; it must flip TOGETHER with
 *  the held call, or the session's first move is stored by one thread and never seen by the other. */
internal class DeferredSpeech {
    private var readyFlag = false
    private var deferred: (() -> Unit)? = null

    val isReady: Boolean
        @Synchronized get() = readyFlag

    @Synchronized
    fun submit(say: () -> Unit): Boolean {
        if (readyFlag) return true
        deferred = say
        return false
    }

    @Synchronized
    fun ready(): (() -> Unit)? {
        readyFlag = true
        return deferred.also { deferred = null }
    }
}

/** Init is asynchronous, so exactly one utterance is held back — else the first move of every session is silent. */
class AndroidTts(
    context: Context,
    private val onState: (SpeechState) -> Unit,
    /** `speak` returning is not a sound: `onStart` is where the audio begins, so the synthesis latency is measured there. */
    private val onSpoken: (Long) -> Unit = {},
) : Tts {
    private val callbacks = ConcurrentHashMap<String, () -> Unit>()
    private val queuedAtMs = ConcurrentHashMap<String, Long>()
    private val counter = AtomicLong()
    private val gate = DeferredSpeech()

    @Volatile
    private var language = Locale.US.toLanguageTag()

    private val tts =
        TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) {
                applyLanguage()
                gate.ready()?.invoke()
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
                override fun onStart(utteranceId: String) {
                    queuedAtMs.remove(utteranceId)?.let { onSpoken(System.currentTimeMillis() - it) }
                }

                override fun onDone(utteranceId: String) {
                    callbacks.remove(utteranceId)?.invoke()
                }

                // A failed utterance must still free its queue slot, or speech stops forever.
                @Deprecated("Base class only declares the deprecated overload as abstract.")
                override fun onError(utteranceId: String) {
                    queuedAtMs.remove(utteranceId)
                    callbacks.remove(utteranceId)?.invoke()
                }
            },
        )
    }

    override fun setLanguage(tag: String): SpeechState {
        language = tag
        return if (gate.isReady) applyLanguage() else SpeechState.Uninitialised
    }

    override fun speak(
        text: String,
        flush: Boolean,
        onDone: () -> Unit,
    ) {
        if (!gate.submit { speak(text, flush, onDone) }) return
        val id = "u${counter.getAndIncrement()}"
        callbacks[id] = onDone
        queuedAtMs[id] = System.currentTimeMillis()
        val mode = if (flush) TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD
        if (tts.speak(text, mode, null, id) != TextToSpeech.SUCCESS) callbacks.remove(id)?.invoke()
    }

    override fun shutdown() {
        tts.stop()
        tts.shutdown()
    }

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

fun androidSpeechEngine(
    context: Context,
    onSpoken: (Long) -> Unit = {},
): SpeechEngine = SpeechEngine(AndroidSilence(context)) { onState -> AndroidTts(context, onState, onSpoken) }
