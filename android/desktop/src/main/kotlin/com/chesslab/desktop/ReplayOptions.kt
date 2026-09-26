package com.chesslab.desktop

import com.chesslab.engine.api.MOTION_THR_REFERENCE_FPS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.cnn.DEFAULT_MODEL
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.cnn.servingConfig
import com.chesslab.tracker.record.CONFIG_KIND
import com.chesslab.tracker.settings.ConfigCodec
import com.chesslab.tracker.settings.knobFor
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import java.io.File

/** ONE description, so two runs can differ in exactly one field. Unrecognised words are refused. */
data class ReplayOptions(
    /** Also arms break-on-stuck. */
    val watch: Boolean = true,
    val dumpEvery: Int = 0,
    val lens: Boolean = false,
    /** Off is a real configuration: without an observation the engine is a different tracker. */
    val cnn: Boolean = true,
    val model: String = DEFAULT_MODEL,
    // Alle 64 waeren 139 200 Zahlen fuer eine Frage, die ein Feld beantwortet.
    val probeSquare: String? = null,
    val priorLambda: Double = 0.0,
    /** NUR fuers Banner — gesetzt von [withPriorOf]. */
    val modelPriorLambda: Double? = null,
    /** False reproduces the historical conditioned-everywhere path. */
    val priorSafety: Boolean = true,
    /** It rejects WITHOUT a stuck reason and once silenced a whole session. */
    val motionGate: Boolean = true,
    /** The tracker's PROPOSAL, `confirmed: false` always. */
    val label: Boolean = false,
    /** Never one combined accuracy — phantoms are the veto. */
    val score: Boolean = false,
    val name: String? = null,
    /** Every decision row, rejections included, ±2, as the rectified board. Never raw camera frames. */
    val frames: Boolean = false,
    val cleanOnly: Boolean = false,
    /** `set:<knob>=<value>`: a one-knob A/B needs no new CLI word. */
    val overrides: Map<String, Double> = emptyMap(),
    /** `fps=<n>` — every k-th frame, the DETERMINISTIC form of CameraX's drops. An instrument, not a default. */
    val fps: Double? = null,
    /** `start=0` tracks the pre-roll too. */
    val startSeconds: Double? = null,
    /** `config=<file>` — a RECORDED config as the base. Geometry still wins over it. */
    val configFile: String? = null,
    val motionDump: String? = null,
    val visualCache: String? = null,
    /** `configs=<datei>`: weitere Engines im SELBEN Bilddurchgang (`MultiReplay.kt`). */
    val extraConfigs: String? = null,
    /** Rechnen statt werfen: der Beobachter sieht hoechstens jeden zweiten Frame, kein Cache ist lueckenlos. */
    val visualCachePartial: Boolean = false,
    val observationCache: Boolean = true,
    val visualWorkers: Int = 0,
    val workProfile: Boolean = false,
    val limitFrames: Int? = null,
    val trace: String? = null,
) {
    companion object {
        private val FLAGS: Map<String, (ReplayOptions) -> ReplayOptions> =
            mapOf(
                "quiet" to { it.copy(watch = false) },
                "dump" to { it.copy(watch = false, dumpEvery = DUMP_EVERY) },
                "lens" to { it.copy(lens = true) },
                "nocnn" to { it.copy(cnn = false) },
                "nomotion" to { it.copy(motionGate = false) },
                "label" to { it.copy(watch = false, label = true) },
                "score" to { it.copy(watch = false, score = true) },
                "frames" to { it.copy(frames = true) },
                "cleanonly" to { it.copy(cleanOnly = true) },
                "noobscache" to { it.copy(observationCache = false) },
                "visualcache-partial" to { it.copy(visualCachePartial = true) },
                "workprofile" to { it.copy(workProfile = true) },
            )

        fun parse(words: List<String>): ReplayOptions {
            var options = ReplayOptions()
            for (word in words) {
                options =
                    FLAGS[word]?.invoke(options) ?: assigned(options, word)
                        ?: error(
                            "unknown option '$word' (${FLAGS.keys.joinToString(" | ")} " +
                                "| dump=<n> | name=<x> | model=<name> | config=<file> | fps=<n> | visualcache=<file>)",
                        )
            }
            return options
        }

        private fun assigned(
            options: ReplayOptions,
            word: String,
        ): ReplayOptions? =
            when {
                word.startsWith("dump=") ->
                    options.copy(
                        watch = false,
                        dumpEvery =
                            word.removePrefix("dump=").toIntOrNull()
                                ?: error("dump= wants a frame count, got '$word'"),
                    )
                word.startsWith("name=") -> options.copy(name = word.removePrefix("name=").ifEmpty { null })
                word.startsWith("fps=") ->
                    options.copy(
                        fps =
                            word.removePrefix("fps=").toDoubleOrNull()?.takeIf { it > 0 }
                                ?: error("fps= wants a positive frame rate, got '$word'"),
                    )
                word.startsWith("start=") ->
                    options.copy(
                        startSeconds =
                            word.removePrefix("start=").toDoubleOrNull()?.takeIf { it >= 0 }
                                ?: error("start= wants seconds, got '$word'"),
                    )
                word.startsWith("limit=") -> options.copy(limitFrames = word.removePrefix("limit=").toInt().also { require(it > 0) })
                word.startsWith("trace=") -> options.copy(trace = word.removePrefix("trace=").also { require(it.isNotBlank()) })
                word.startsWith("probe=") ->
                    options.copy(
                        probeSquare =
                            word.removePrefix("probe=").lowercase().also {
                                require(it.length == 2 && it[0] in 'a'..'h' && it[1] in '1'..'8') {
                                    "probe=$it is not a square"
                                }
                            },
                    )
                word.startsWith("model=") -> options.copy(model = word.removePrefix("model="))
                word.startsWith("prior=") ->
                    options.copy(
                        priorLambda =
                            word.removePrefix("prior=").toDoubleOrNull()?.takeIf { it >= 0.0 }
                                ?: error("prior= wants a non-negative lambda, got '$word'"),
                    )
                word.startsWith("prior-mode=") ->
                    when (word.removePrefix("prior-mode=")) {
                        "new" -> options.copy(priorSafety = true)
                        "old" -> options.copy(priorSafety = false)
                        else -> error("prior-mode= wants old or new, got '$word'")
                    }
                word.startsWith("config=") ->
                    options.copy(
                        configFile =
                            word.removePrefix("config=").ifEmpty { error("config= wants a settings.json or envelope file") },
                    )
                word.startsWith("motiondump=") ->
                    options.copy(
                        motionDump =
                            word.removePrefix("motiondump=").ifEmpty { error("motiondump= wants a file path") },
                    )
                word.startsWith("visualcache=") -> options.copy(visualCache = word.removePrefix("visualcache="))
                word.startsWith("configs=") ->
                    options.copy(extraConfigs = word.removePrefix("configs=").ifEmpty { error("configs= wants a file") })
                word.startsWith("visualworkers=") ->
                    options.copy(
                        visualWorkers =
                            word.removePrefix("visualworkers=").toIntOrNull()?.takeIf { it in 1..MAX_VISUAL_WORKERS }
                                ?: error("visualworkers= wants 1..$MAX_VISUAL_WORKERS workers, got '$word'"),
                    )
                word.startsWith("set:") -> options.copy(overrides = options.overrides + knobAssignment(word.removePrefix("set:"), "set:"))
                else -> null
            }
    }

    /** `prior_lambda` des Modells gewinnt IMMER, auch gegen `prior=`; das Banner nennt den wirksamen Wert. */
    private val priorBanner: String
        get() =
            when {
                modelPriorLambda != null -> "$modelPriorLambda(modell)"
                priorLambda > 0.0 -> "$priorLambda"
                else -> "modell"
            }

    @Suppress("CyclomaticComplexMethod")
    override fun toString(): String =
        "watch=$watch dump=${if (dumpEvery > 0) dumpEvery else "off"} " +
            "lens=$lens cnn=${if (cnn) model else "off"} motionGate=$motionGate" +
            " prior=$priorBanner prior-mode=${if (priorSafety) "new" else "old"}" +
            (if (label) " label" else "") + (if (score) " score" else "") +
            (if (frames) " frames" else "") +
            (if (cleanOnly) " cleanonly" else "") +
            (name?.let { " name=$it" } ?: "") +
            (configFile?.let { " config=$it" } ?: "") +
            (fps?.let { " fps=$it" } ?: "") +
            (visualCache?.let { " visualcache=$it" } ?: "") +
            (if (observationCache) "" else " noobscache") +
            (if (visualWorkers > 0) " visualworkers=$visualWorkers" else "") +
            (if (workProfile) " workprofile" else "") +
            overrides.entries.joinToString("") { " set:${it.key}=${it.value}" }
}

/** Ein `prior=` neben einem Modell-Prior ist folgenlos, und ungesagt misst ein Sweep an jedem Punkt dasselbe. */
internal fun ReplayOptions.withPriorOf(
    spec: ModelSpec?,
    warn: (String) -> Unit = { println("warn: $it") },
): ReplayOptions {
    val declared = spec?.priorLambda ?: return this
    if (priorLambda > 0.0) warn("prior=$priorLambda wird vom prior_lambda des Modells ($declared) verworfen")
    return copy(modelPriorLambda = declared)
}

/** For files the VIDEO-time observer cadence: on the wall clock the same file committed 54 plies, then 39.
 *  [engineFps] is the rate frames REACH the engine; null keeps the 30 fps reference. */
internal fun ReplayOptions.trackerConfig(
    geometry: BoardGeometry,
    live: Boolean,
    engineFps: Double? = fps.takeIf { !live },
    spec: ModelSpec? = null,
    warn: (String) -> Unit = { println("warn: $it") },
): TrackerConfig {
    // The recorded file FIRST, the geometry AFTER: a phone's recorded `boardSize` would poison another video's warp.
    val recorded = configFile?.let(::loadRecordedConfig)
    val base = recorded?.config ?: TrackerConfig()
    val replay =
        base
            .copy(
                // One-directional, or `config=` could never reproduce a phone that had one on.
                requireMotionForMove = base.requireMotionForMove && motionGate,
                cleanCommitsOnly = base.cleanCommitsOnly || cleanOnly,
                // A file replay keeps the REPLAY's cadence; `set:observerIntervalS=<s>` for the phone's.
                observerIntervalS = if (live) base.observerIntervalS else REPLAY_OBSERVER_INTERVAL_S,
            ).withOverrides(overrides)
    // Schon bedient: nur die Geometrie dieses Laufs gehoert noch darauf.
    if (recorded?.served == true) return replay.copy(boardSize = geometry.boardSize)
    return servingConfig(replay, geometry, spec, engineFps ?: MOTION_THR_REFERENCE_FPS, overrides.keys, warn)
}

private class RecordedConfig(
    val config: TrackerConfig,
    val served: Boolean,
)

/** Refuses loudly: ConfigCodec falls back to "defaults with a note", which would measure nothing. */
private fun loadRecordedConfig(path: String): RecordedConfig {
    val json = Json { allowSpecialFloatingPointValues = true }
    val root =
        runCatching { json.parseToJsonElement(File(path).readText()) }
            .getOrElse { error("config=$path could not be read: ${it.message}") }
    val obj = root as? JsonObject ?: error("config=$path: expected a JSON object")
    val envelope = obj["config"] as? JsonObject ?: obj
    val decoded = ConfigCodec.decode(json.encodeToString(JsonObject.serializer(), envelope))
    decoded.note?.let { error("config=$path: $it") }
    val changed = ConfigCodec.changedKeys(ConfigCodec.defaults, decoded.config)
    val diff =
        if (changed.isEmpty()) {
            "no knob differs from defaults"
        } else {
            "differs from defaults: " + changed.joinToString(" ") { "${it.key}=${it.get(decoded.config)}" }
        }
    // Vor `config_kind` trug der ERSTE Schreibvorgang die ausgelieferte Konfiguration; erst eine Aenderung
    // (History) ersetzte sie durch die gespeicherte.
    val served = obj["config"] != null && obj[CONFIG_KIND] == null && (obj["history"] as? JsonArray).isNullOrEmpty()
    println("config: $path applied${if (served) " as SERVED (old settings.json) — not served again" else ""} — $diff")
    return RecordedConfig(decoded.config, served)
}

/** EIN Leser fuer `set:` und `configs=`. Den Namen prueft erst [withOverrides]. */
internal fun knobAssignment(
    assignment: String,
    form: String,
): Pair<String, Double> {
    val key = assignment.substringBefore('=')
    val value =
        when (val raw = assignment.substringAfter('=', missingDelimiterValue = "")) {
            "true" -> 1.0
            "false" -> 0.0
            else -> raw.toDoubleOrNull() ?: error("$form wants <knob>=<number|true|false>, got '$assignment'")
        }
    return key to value
}

/** A typo that silently ran the defaults would be a measurement of nothing. */
internal fun TrackerConfig.withOverrides(overrides: Map<String, Double>): TrackerConfig =
    overrides.entries.fold(this) { config, (key, value) ->
        val knob = knobFor(key) ?: error("set: unknown knob '$key' — see ConfigKnobs.KNOBS")
        println("override: $key=$value")
        knob.set(config, value)
    }

/** FREE-RUNNING: throttling to 0.15 s took rec-20260808 from 67 plies to 26. */
internal const val REPLAY_OBSERVER_INTERVAL_S = 0.0

/** ~5 s at 30 fps follows a game and is useless for a move; `dump=<n>` looks inside that. */
private const val DUMP_EVERY = 150
private const val MAX_VISUAL_WORKERS = 16
