package com.chesslab.tracker.settings

import com.chesslab.engine.api.TrackerConfig
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// `TrackerConfig` <-> JSON, driven entirely by the [KNOBS] table.
//
// Defaults are NEVER re-declared here: they are `TrackerConfig`'s own, which are
// `src/chesslab/config.py TRACK_DEFAULTS` verbatim (entry.md invariant 12). A missing key
// therefore decodes to the Python default, and an unknown key from a future build is ignored
// rather than fatal.

/**
 * Bump when a knob's MEANING changes; an unreadable version resets to defaults with a note.
 *
 * **Also bump when a default moves for a measured reason**, and 2 is the first time that happened.
 * A stored value shadows a new default forever, which is not academic here: `motionRecencyS` sat at
 * `0.0` in one phone's DataStore for an unknown length of time and rejected every diff-path commit
 * against a stale `age > 0` check. Nothing in the source could reveal it, because the value did not
 * live in the source — it cost an evening of live play. Retuning `cnnCooldownS` and
 * `cnnCheckIntervalS` to the CNN's measured 16 ms would have reached nobody who had ever opened
 * Settings without this.
 *
 * **3 removes two knobs** — `llK` became the `LL_K` constant and `reconnectGraceS` had no
 * production reader at all — so a stored envelope from 2 carries keys the seam no longer has. It
 * would decode without complaint (`ignoreUnknownKeys`), which is exactly why the version has to
 * say so: the config a user exported at 2 is not the config this build runs.
 *
 * **4 splits `motionHoldS`**: the occlusion latch reads `occluderHoldS` now, so a stored `0.20`
 * that used to mean both things means only the settle delay in this build. A knob whose meaning
 * narrowed is exactly the case this counter exists for. Checked before bumping: every value stored
 * on the device was the default anyway, `boardSize` excepted, and that one is re-measured.
 *
 * **5 removes two more**: `reanchorLlFloor` and `handTolerantCells` went with their experiments
 * after 4 shipped, without the bump 3 made the rule — both were inert at 0, so the reset costs only
 * hand-tuned knobs, and `boardSize` is re-measured by `onMeasuredBoard`.
 *
 * **6 changes the default `commitHoldS`:** the split commit uses 0.067 (133 ms) instead of
 * null, so a stored null would keep overriding the new default on an upgraded device.
 *
 * Note what a bump costs, because it is not free: it resets every knob to the defaults, and
 * `boardSize` is a measurement the calibration profile owns rather than a default anyone chose.
 * `TrackerService`'s `onMeasuredBoard` is what keeps that reset from silently stopping detection.
 */
const val CONFIG_SCHEMA_VERSION = 6

@Serializable
private data class ConfigEnvelope(
    val version: Int,
    val values: Map<String, Double>,
)

/** The decoded config plus the reason it is not what was on disk, if any. */
class DecodeResult(
    val config: TrackerConfig,
    val note: String?,
)

object ConfigCodec {
    // NaN carries "no override" for the three Int? knobs, so the encoder must be allowed to
    // write it; unknown keys are tolerated so a downgrade does not wipe the user's settings.
    private val json =
        Json {
            allowSpecialFloatingPointValues = true
            ignoreUnknownKeys = true
        }

    /**
     * `TRACK_DEFAULTS` verbatim (entry.md invariant 12) — and therefore also the reference the
     * settings screen calls "the Python default" and that `resetToDefaults` restores.
     *
     * NOTE for whoever reaches for this as a place to tune Android: `observerIntervalS = 0.0`
     * (free-running CNN) is measurably wrong for a phone — every observation drags a 1640x1640
     * `warpPerspective` onto the analyzer thread, and `07a-settings.md` already says "Raise on
     * battery/thermal-constrained devices (Android port)". Changing it HERE is not the way: this
     * value is what "deviation from Python" is measured against, so an override would make every
     * export read as pristine while it was not. A deliberate Android seed needs its own field and
     * its own place in the deviation report.
     */
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

    /** The keys whose value differs, split by whether Python can retune them without a restart. */
    fun changedKeys(
        old: TrackerConfig,
        new: TrackerConfig,
    ): List<Knob> = KNOBS.filter { !same(it.get(old), it.get(new)) }

    private fun apply(
        base: TrackerConfig,
        values: Map<String, Double>,
    ): TrackerConfig = KNOBS.fold(base) { config, knob -> values[knob.key]?.let { knob.set(config, it) } ?: config }

    /** NaN == NaN here: it is the "no override" marker, not a measurement. */
    private fun same(
        a: Double,
        b: Double,
    ): Boolean = a == b || (a.isNaN() && b.isNaN())
}
