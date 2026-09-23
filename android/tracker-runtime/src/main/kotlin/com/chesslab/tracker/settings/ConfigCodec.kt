package com.chesslab.tracker.settings

import com.chesslab.engine.api.TrackerConfig
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// Driven entirely by [KNOBS]. Defaults are NEVER re-declared: `TrackerConfig` is the authority. A missing key
// decodes to it, an unknown key from a future build is ignored.

/** Bump when a knob's MEANING changes **or a default moves for a measured reason**: a stored value shadows a new
 *  default forever (`motionRecencyS = 0.0` cost an evening of live play). A bump resets every knob;
 *  `onMeasuredBoard` keeps that from stopping detection. History: `git log` of this line. */
const val CONFIG_SCHEMA_VERSION = 6

@Serializable
private data class ConfigEnvelope(
    val version: Int,
    val values: Map<String, Double>,
)

class DecodeResult(
    val config: TrackerConfig,
    val note: String?,
)

object ConfigCodec {
    // NaN carries "no override"; unknown keys are tolerated so a downgrade does not wipe the user's settings.
    private val json =
        Json {
            allowSpecialFloatingPointValues = true
            ignoreUnknownKeys = true
        }

    /** The reference every deviation is measured against: an Android seed here would make every export read as
     *  pristine. A deliberate one needs its own field. */
    val defaults: TrackerConfig = TrackerConfig()

    fun encode(config: TrackerConfig): String =
        json.encodeToString(
            ConfigEnvelope.serializer(),
            ConfigEnvelope(CONFIG_SCHEMA_VERSION, KNOBS.associate { it.key to it.get(config) }),
        )

    fun decode(text: String?): DecodeResult {
        if (text.isNullOrBlank()) return DecodeResult(defaults, null)
        val envelope = runCatching { json.decodeFromString(ConfigEnvelope.serializer(), text) }.getOrNull()
        return when {
            envelope == null -> DecodeResult(defaults, "settings could not be read — reset to defaults")
            envelope.version != CONFIG_SCHEMA_VERSION ->
                DecodeResult(defaults, "settings schema ${envelope.version} is unknown — reset to defaults")
            else -> DecodeResult(apply(defaults, envelope.values), null)
        }
    }

    fun changedKeys(
        old: TrackerConfig,
        new: TrackerConfig,
    ): List<Knob> = KNOBS.filter { !same(it.get(old), it.get(new)) }

    // Ueber `knob.keys`: ein umbenannter Knopf muss seinen alten Schluessel weiter annehmen.
    private fun apply(
        base: TrackerConfig,
        values: Map<String, Double>,
    ): TrackerConfig =
        KNOBS.fold(base) { config, knob ->
            knob.keys.firstNotNullOfOrNull { values[it] }?.let { knob.set(config, it) } ?: config
        }

    /** NaN == NaN here: it is the "no override" marker, not a measurement. */
    private fun same(
        a: Double,
        b: Double,
    ): Boolean = a == b || (a.isNaN() && b.isNaN())
}
