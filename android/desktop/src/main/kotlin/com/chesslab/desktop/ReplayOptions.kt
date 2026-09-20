package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.atFrameRate
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.cnn.DEFAULT_MODEL
import com.chesslab.tracker.settings.ConfigCodec
import com.chesslab.tracker.settings.KNOBS
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import java.io.File

/**
 * How one run is configured, parsed once: ONE description, so two runs can differ in exactly one
 * field. Order-free words, and an unrecognised one is refused (`docs/desktop-replay.md`).
 */
data class ReplayOptions(
    /** The board view, which also arms break-on-stuck. Off for a scripted run. */
    val watch: Boolean = true,
    /** Write the annotated board every N frames, or 0. */
    val dumpEvery: Int = 0,
    /** Fit the optics from the board in the footage before tracking it. */
    val lens: Boolean = false,
    /**
     * Attach the classifier. Off is a real configuration, not a degradation to tolerate: without an
     * observation the engine is a different tracker (`docs/desktop-replay.md`).
     */
    val cnn: Boolean = true,
    /** Which bundled graph, when [cnn] is on. */
    val model: String = DEFAULT_MODEL,
    // EIN Feld, dessen drei Beweiskanaele (`z`, `diffs`, `census`) je Frame in die Trace gehen.
    // Alle 64 waeren 139 200 Zahlen fuer eine Frage, die ein Feld beantwortet.
    val probeSquare: String? = null,
    /** Experimental legal-placement prior weight; zero is off. */
    val priorLambda: Double = 0.0,
    /** New raw/invalid safety, or false to reproduce the historical conditioned-everywhere path. */
    val priorSafety: Boolean = true,
    /**
     * Drop `requireMotionForMove`. It rejects WITHOUT a stuck reason and silenced a whole session
     * on 2026-08-01, so it has to be switchable to be ruled in or out.
     */
    val motionGate: Boolean = true,
    /**
     * `data/recordings/<name>/candidate.json` plus review JPEGs — the tracker's PROPOSAL,
     * `confirmed: false` always; footage that cannot carry a label is refused (specs/52 phase 02).
     */
    val label: Boolean = false,
    /**
     * Score against an existing `candidate.json`: found / missed / invented with frame indices,
     * never one combined accuracy — phantoms are the veto (specs/52 phase 04, measurement only).
     */
    val score: Boolean = false,
    /** The candidate's directory name under `data/recordings/`. Default: the video's stem. */
    val name: String? = null,
    /**
     * The DECISIVE frames — every decision row, rejections included, ±2 — as the normalised labeled
     * board, to `data/recordings/<name>/frames-decisive/`. Never the raw camera frames.
     */
    val frames: Boolean = false,
    /** `cleanCommitsOnly` — the strict-hand experiment arm. See the knob's KDoc. */
    val cleanOnly: Boolean = false,
    /**
     * `set:<knob>=<value>` through `ConfigKnobs.KNOBS`, so a one-knob A/B never needs a new CLI
     * word. Booleans as true/false; recorded in `effective_config` like every other knob.
     */
    val overrides: Map<String, Double> = emptyMap(),
    /**
     * `fps=<n>` — every k-th decoded frame, the DETERMINISTIC form of what CameraX drops live. A
     * measurement instrument, not a default: what it shifts is in `docs/desktop-replay.md`.
     */
    val fps: Double? = null,
    /**
     * `start=<seconds>` — where tracking begins in the video, instead of the recording's own
     * pre-roll boundary. `start=0` tracks the pre-roll too, which is what a diagnosis of it wants.
     */
    val startSeconds: Double? = null,
    /**
     * `config=<file>` — a RECORDED config as the run's base: a session's `settings.json` or a raw
     * ConfigCodec envelope. Geometry still wins over it (`docs/desktop-replay.md`).
     */
    val configFile: String? = null,
    /** `motiondump=<file>`: one row per emitted frame with its ROI motion score. See `MotionDump`. */
    val motionDump: String? = null,
    /** Build this cache when absent; consume it strictly by frame sequence when present. */
    val visualCache: String? = null,
    /** `configs=<datei>` — je Zeile `<name> <knopf>=<wert> ...`: weitere Engines im SELBEN
     *  Bilddurchgang. Sie teilen sich eine Pixel-Bahn (`MultiReplay.kt`). */
    val extraConfigs: String? = null,
    /** `visualcache-partial` — ein Frame, den der Bau-Lauf nicht sah, wird gerechnet statt zu
     *  werfen. Der Beobachter sieht hoechstens jeden zweiten Frame, ein Cache kann also gar
     *  nicht lueckenlos sein (gemessen 200 von 400). */
    val visualCachePartial: Boolean = false,
    /** Benchmark/investigation arm: force the real graph even when identical crop hashes exist. */
    val observationCache: Boolean = true,
    /** Experimental bounded cross-frame visual prepass; zero keeps the established path. */
    val visualWorkers: Int = 0,
    /** Exact source-work call graph, semantic repeats, copied bytes and cache hits. */
    val workProfile: Boolean = false,
    /** Bounded diagnostic replay, counted in decoded frames after initialization. */
    val limitFrames: Int? = null,
    /** Exact unsampled engine state and operation durations per delivered frame. */
    val trace: String? = null,
) {
    companion object {
        /** The plain flag words, each one field. Assignments (`x=`) live in [assigned]. */
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

        /** Every word after the verb and its subject. Unknown words are an error, not a shrug. */
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
                word.startsWith("set:") -> options.copy(overrides = options.overrides + knobOverride(word))
                else -> null
            }

        /** `set:recoveryMaxPlies=6`, `set:cnnVerify=false` — validated against the catalog at apply time. */
        private fun knobOverride(word: String): Pair<String, Double> {
            val assignment = word.removePrefix("set:")
            val key = assignment.substringBefore('=')
            val raw = assignment.substringAfter('=', missingDelimiterValue = "")
            val value =
                when (raw) {
                    "true" -> 1.0
                    "false" -> 0.0
                    else -> raw.toDoubleOrNull() ?: error("set: wants <knob>=<number|true|false>, got '$word'")
                }
            return key to value
        }
    }

    @Suppress("CyclomaticComplexMethod")
    override fun toString(): String =
        "watch=$watch dump=${if (dumpEvery > 0) dumpEvery else "off"} " +
            "lens=$lens cnn=${if (cnn) model else "off"} motionGate=$motionGate" +
            " prior=$priorLambda prior-mode=${if (priorSafety) "new" else "old"}" +
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

/**
 * The config a replay runs — measured board size, the CLI's arms, and for files the VIDEO-time
 * observer cadence: on the wall clock the same file committed 54 plies, then 39.
 */
internal fun ReplayOptions.trackerConfig(
    geometry: BoardGeometry,
    live: Boolean,
    /** The rate frames actually REACH the engine at; the CLI's `fps=` unless a caller knows better. */
    emulatedFps: Double? = fps.takeIf { !live },
): TrackerConfig {
    // The recorded file FIRST, the geometry copy AFTER: `boardSize` is a measurement of THIS
    // footage, and a phone's recorded size would poison the warp of any other video.
    val base = configFile?.let(::loadRecordedConfig) ?: TrackerConfig()
    return base
        .copy(
            boardSize = geometry.boardSize,
            // One-directional: their ABSENCE leaves the recorded value standing, or `config=`
            // could never reproduce a phone that had one on.
            requireMotionForMove = base.requireMotionForMove && motionGate,
            cleanCommitsOnly = base.cleanCommitsOnly || cleanOnly,
            // A file replay keeps the REPLAY's cadence (see REPLAY_OBSERVER_INTERVAL_S); when the
            // phone's IS the experiment, `set:observerIntervalS=<s>` says so.
            observerIntervalS = if (live) base.observerIntervalS else REPLAY_OBSERVER_INTERVAL_S,
        ).withOverrides(overrides)
        .withMotionThrFor(emulatedFps)
}

/**
 * `motionThr` skaliert auf die emulierte Rate wie live: der Wert ist ein Prozentsatz gegen den
 * VORIGEN Frame. Nach `set:motionThr=`, weil die Skala zur Bildperiode gehoert.
 */
private fun TrackerConfig.withMotionThrFor(rate: Double?): TrackerConfig = if (rate == null) this else atFrameRate(rate)

/**
 * `config=<file>`, loaded and announced. Refuses loudly what it cannot read: ConfigCodec falls back
 * to "defaults with a note", and a replay that ran those would measure nothing under the flag.
 */
private fun loadRecordedConfig(path: String): TrackerConfig {
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
    println("config: $path applied — $diff")
    return decoded.config
}

/**
 * `set:<knob>=<value>` through the settings catalog. Refusing an unknown key loudly is the point:
 * a typo that silently ran the defaults would be a measurement of nothing.
 */
internal fun TrackerConfig.withOverrides(overrides: Map<String, Double>): TrackerConfig =
    overrides.entries.fold(this) { config, (key, value) ->
        val knob = KNOBS.firstOrNull { it.key == key } ?: error("set: unknown knob '$key' — see ConfigKnobs.KNOBS")
        println("override: $key=$value")
        knob.set(config, value)
    }

/**
 * The replay observer's cadence: FREE-RUNNING, which every good measurement on record ran at.
 * Throttling to a "modelled live rate" of 0.15 s took rec-20260808 from 67 plies to 26 (2026-08-08).
 */
internal const val REPLAY_OBSERVER_INTERVAL_S = 0.0

/**
 * Frames between dumps: ~5 s at 30 fps, which follows a game and is useless for a move — one run
 * read `e2e4` perfectly at 150 and had six changed squares by 300. `dump=<n>` looks inside that.
 */
private const val DUMP_EVERY = 150
private const val MAX_VISUAL_WORKERS = 16
