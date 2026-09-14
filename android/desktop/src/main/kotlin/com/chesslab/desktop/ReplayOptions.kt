package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.cnn.DEFAULT_MODEL
import com.chesslab.tracker.settings.ConfigCodec
import com.chesslab.tracker.settings.KNOBS
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import java.io.File

/**
 * How one run is configured, parsed once.
 *
 * The verbs grew flags one at a time — `quiet`, then `dump`, then `lens`, then `nocnn`, then
 * `model=` — until `replay` took eight arguments and `main` read them inline for each verb. They
 * are not eight things: they are one description of a run, and the point of a run is that two of
 * them differ in exactly one field. `with(cnn = false)` is the experiment.
 *
 * Order-free and positional at the same time: every flag is a word, so `replay v.mp4 lens nocnn`
 * and `replay v.mp4 nocnn lens` are the same run. Anything unrecognised is REFUSED rather than
 * ignored — a typo'd `nocnn` that silently ran with the CNN would produce a measurement that
 * quietly answers a different question.
 */
data class ReplayOptions(
    /** The board view, which also arms break-on-stuck. Off for a scripted run. */
    val watch: Boolean = true,
    /** Write the annotated board every N frames, or 0. */
    val dumpEvery: Int = 0,
    /** Fit the optics from the board in the footage before tracking it. */
    val lens: Boolean = false,
    /**
     * Attach the classifier.
     *
     * Off is a real configuration and not a degradation to tolerate:
     * `Taint.cnnOcclusionFilter` falls back to ">2 changed squares = a hand" without an
     * observation, so the two settings are two trackers and the only way to know which one a
     * number came from is to have chosen.
     */
    val cnn: Boolean = true,
    /** Which bundled graph, when [cnn] is on. */
    val model: String = DEFAULT_MODEL,
    /** Experimental legal-placement prior weight; zero is off. */
    val priorLambda: Double = 0.0,
    /** New raw/invalid safety, or false to reproduce the historical conditioned-everywhere path. */
    val priorSafety: Boolean = true,
    /**
     * Drop `requireMotionForMove`.
     *
     * That gate refuses any candidate unless ROI motion was seen since the last reference —
     * "drift/light, not a real move". It has silenced a whole session before: `TrackerEngine`
     * records finding it live on 2026-08-01 with the deterministic channel committing nothing all
     * session. It rejects WITHOUT setting a stuck reason, so a run blocked by it looks like a run
     * with nothing to say, which is why this needs to be switchable to be ruled in or out.
     */
    val motionGate: Boolean = true,
    /**
     * Write `data/recordings/<name>/candidate.json` plus review JPEGs — the tracker's PROPOSAL,
     * `confirmed: false` always; only a human review may flip that. Measures the footage's
     * geometry first and refuses footage that cannot carry a label (specs/52 phase 02).
     */
    val label: Boolean = false,
    /**
     * Score this run against an existing `candidate.json`: found / missed / invented, each with
     * frame indices, never combined into one accuracy — phantoms are the veto, misses are
     * negotiable (specs/52 phase 04: measurement only, forbidden from fixing).
     */
    val score: Boolean = false,
    /** The candidate's directory name under `data/recordings/`. Default: the video's stem. */
    val name: String? = null,
    /**
     * Write the DECISIVE frames — every decision row, rejections included, ±2 frames — as the
     * normalised, labeled board (the rectified warp with verdicts and the believed position),
     * to `data/recordings/<name>/frames-decisive/`. Never the raw camera frames.
     */
    val frames: Boolean = false,
    /** `cleanCommitsOnly` — the strict-hand experiment arm. See the knob's KDoc. */
    val cleanOnly: Boolean = false,
    /**
     * `set:<knob>=<value>` overrides, applied through `ConfigKnobs.KNOBS` — the generic
     * experiment instrument, so a one-knob A/B never needs a new CLI word again. Booleans as
     * true/false; recorded in `effective_config` like everything else the engine ran.
     */
    val overrides: Map<String, Double> = emptyMap(),
    /**
     * `fps=<n>` — process every k-th decoded frame (`k = round(videoFps / n)`), the DETERMINISTIC
     * realtime emulation: the phone sees 15-20 fps of a 30 fps world because CameraX drops what
     * the analyzer cannot take, and this is that drop made exact and countable. The clock still
     * ticks for EVERY decoded frame, so video time stays true; skipped frames reach neither the
     * pipeline nor the engine and are counted as `dropped(stride)`.
     *
     * A measurement instrument, not a default. Skipping doubles the inter-frame delta, so the
     * same physical hand speed scores a higher motion z (`motionThr` bites harder), and
     * `settleFrames`/`avgFrames` are frame counts that then span twice the wall time. Engine-side
     * it is SAFE: `seq` must only increase, references are stored planes, and every time window
     * runs on `nowS`.
     */
    val fps: Double? = null,
    /**
     * `start=<seconds>` — where tracking begins in the video, instead of the recording's own
     * pre-roll boundary. `start=0` tracks the pre-roll too, which is what a diagnosis of it wants.
     */
    val startSeconds: Double? = null,
    /**
     * `config=<file>` — a RECORDED config as the run's base, instead of the defaults: a session's
     * `settings.json` (the phone writes one per recording since 2026-08-14; its `config` block is
     * read) or a raw ConfigCodec envelope (the `tracker_config_json` DataStore slot). This is what
     * lets a recording be replayed under the phone's true knobs rather than a guess at them.
     * Geometry still wins where geometry must: `boardSize` (and with it `detSize`) is a
     * measurement of THIS footage, applied after the file.
     */
    val configFile: String? = null,
    /** `motiondump=<file>`: one row per emitted frame with its ROI motion score. See `MotionDump`. */
    val motionDump: String? = null,
    /** Build this cache when absent; consume it strictly by frame sequence when present. */
    val visualCache: String? = null,
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
 * The config a replay runs — measured board size, the CLI's experiment arms, and for file
 * replays the fixed VIDEO-time observer cadence: the free-running default observes whenever the
 * wall clock lets it, which made the same file commit 54 plies on one run and 39 on the next.
 * The cadence approximates the live self-pacing (SM8650: 16-100 ms per observation) and is
 * recorded in `effective_config` like every other knob.
 */
internal fun ReplayOptions.trackerConfig(
    geometry: BoardGeometry,
    live: Boolean,
): TrackerConfig {
    // The recorded file FIRST, the geometry copy AFTER: `boardSize` (and with it `detSize`) is a
    // measurement of THIS footage, and a phone's recorded size would poison the warp of any other
    // video — the same rule `options.trackerConfig` has always kept for the defaults.
    val base = configFile?.let(::loadRecordedConfig) ?: TrackerConfig()
    return base
        .copy(
            boardSize = geometry.boardSize,
            // The CLI arms are one-directional: `nomotion`/`cleanonly` override the file, but
            // their ABSENCE leaves the recorded value standing instead of stamping the default
            // back over it — otherwise `config=` could never reproduce a phone that had one on.
            requireMotionForMove = base.requireMotionForMove && motionGate,
            cleanCommitsOnly = base.cleanCommitsOnly || cleanOnly,
            // A file replay keeps the REPLAY's cadence, not the phone's: free-running is what
            // every good measurement ran at (see REPLAY_OBSERVER_INTERVAL_S). When the phone's
            // cadence IS the experiment, `set:observerIntervalS=<s>` says so explicitly.
            observerIntervalS = if (live) base.observerIntervalS else REPLAY_OBSERVER_INTERVAL_S,
        ).withOverrides(overrides)
}

/**
 * `config=<file>`, loaded and announced. Accepts a session's `settings.json` (its `config` block)
 * or a raw ConfigCodec envelope — the two forms are the same bytes, because the phone embeds the
 * envelope verbatim (`SessionSettingsWriter`). Refuses loudly what it cannot read: ConfigCodec's
 * own fallback is "defaults with a note", and a replay that silently ran defaults under a
 * `config=` flag would measure nothing while claiming to measure the recording.
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
 * `set:<knob>=<value>` words applied through the settings catalog — the generic one-knob
 * experiment instrument. Refusing an unknown key loudly is the point: a typo that silently ran
 * the defaults would be a measurement of nothing.
 */
private fun TrackerConfig.withOverrides(overrides: Map<String, Double>): TrackerConfig =
    overrides.entries.fold(this) { config, (key, value) ->
        val knob = KNOBS.firstOrNull { it.key == key } ?: error("set: unknown knob '$key' — see ConfigKnobs.KNOBS")
        println("override: $key=$value")
        knob.set(config, value)
    }

/**
 * The replay observer's cadence: FREE-RUNNING, like the phone's self-pacing default. With the
 * synchronous replay observer that means one observation whenever the previous one is done —
 * every 1-2 frames — which is what every good measurement on record ran at: throttling to a
 * "modelled live rate" of 0.15 s was tried on 2026-08-08 and starved verify votes and recovery
 * glances (rec-20260808: 67 plies -> 26). The observation cache is what makes the dense cadence
 * affordable on re-runs.
 */
internal const val REPLAY_OBSERVER_INTERVAL_S = 0.0

/**
 * Frames between dumps by default.
 *
 * 150 is ~5 s at 30 fps, which follows a game and is useless for a move: the run that mattered
 * had a perfect read of `e2e4` at frame 150 and six changed squares by 300, so whatever went
 * wrong went wrong inside one interval. `dump=<n>` is for looking there.
 */
private const val DUMP_EVERY = 150
private const val MAX_VISUAL_WORKERS = 16
