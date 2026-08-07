package com.chesslab.desktop

import com.chesslab.tracker.cnn.DEFAULT_MODEL

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
class ReplayOptions(
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
) {
    companion object {
        /** Every word after the verb and its subject. Unknown words are an error, not a shrug. */
        fun parse(words: List<String>): ReplayOptions {
            var options = ReplayOptions()
            for (word in words) {
                options =
                    when {
                        word == "quiet" -> options.copy(watch = false)
                        word == "dump" -> options.copy(watch = false, dumpEvery = DUMP_EVERY)
                        word == "lens" -> options.copy(lens = true)
                        word == "nocnn" -> options.copy(cnn = false)
                        word.startsWith("model=") -> options.copy(model = word.removePrefix("model="))
                        else -> error("unknown option '$word' (quiet | dump | lens | nocnn | model=<name>)")
                    }
            }
            return options
        }
    }

    private fun copy(
        watch: Boolean = this.watch,
        dumpEvery: Int = this.dumpEvery,
        lens: Boolean = this.lens,
        cnn: Boolean = this.cnn,
        model: String = this.model,
    ) = ReplayOptions(watch, dumpEvery, lens, cnn, model)

    override fun toString(): String =
        "watch=$watch dump=${if (dumpEvery > 0) dumpEvery else "off"} " +
            "lens=$lens cnn=${if (cnn) model else "off"}"
}

/** Frames between dumps. Every 150 is ~5 s at 30 fps and ~2.5 s at 60 — enough to follow a move. */
private const val DUMP_EVERY = 150
