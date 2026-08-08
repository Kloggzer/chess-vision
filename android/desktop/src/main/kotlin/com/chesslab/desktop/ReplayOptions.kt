package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.cnn.DEFAULT_MODEL
import com.chesslab.tracker.settings.KNOBS

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
     * Write `data/realgames/<name>/candidate.json` plus review JPEGs — the tracker's PROPOSAL,
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
    /** The candidate's directory name under `data/realgames/`. Default: the video's stem. */
    val name: String? = null,
    /**
     * Write the DECISIVE frames — every decision row, rejections included, ±2 frames — as the
     * normalised, labeled board (the rectified warp with verdicts and the believed position),
     * to `data/realgames/<name>/frames-decisive/`. Never the raw camera frames.
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
            )

        /** Every word after the verb and its subject. Unknown words are an error, not a shrug. */
        fun parse(words: List<String>): ReplayOptions {
            var options = ReplayOptions()
            for (word in words) {
                options =
                    FLAGS[word]?.invoke(options) ?: assigned(options, word)
                        ?: error(
                            "unknown option '$word' (${FLAGS.keys.joinToString(" | ")} " +
                                "| dump=<n> | name=<x> | model=<name>)",
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
                word.startsWith("model=") -> options.copy(model = word.removePrefix("model="))
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

    override fun toString(): String =
        "watch=$watch dump=${if (dumpEvery > 0) dumpEvery else "off"} " +
            "lens=$lens cnn=${if (cnn) model else "off"} motionGate=$motionGate" +
            (if (label) " label" else "") + (if (score) " score" else "") +
            (if (frames) " frames" else "") +
            (if (cleanOnly) " cleanonly" else "") +
            (name?.let { " name=$it" } ?: "") +
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
): TrackerConfig =
    TrackerConfig()
        .copy(
            boardSize = geometry.boardSize,
            requireMotionForMove = motionGate,
            cleanCommitsOnly = cleanOnly,
            observerIntervalS = if (live) TrackerConfig().observerIntervalS else REPLAY_OBSERVER_INTERVAL_S,
        ).withOverrides(overrides)

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
