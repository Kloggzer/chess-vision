package com.chesslab.engine.api

/**
 * What a tracker engine has to be able to do — the whole contract, and nothing about how.
 *
 * It lives here rather than beside its host so that an engine can be written against it without
 * depending on `:tracker-runtime`: the hosting (single-thread ownership, the order actions →
 * snapshots → frame, queues) is somebody else's job and is inherited unchanged.
 *
 * Alarms are part of this contract, not an extra. `TrackerEvent.Alarm`/`AlarmCleared` reach the
 * UI, the spoken announcements, the notification and the recording; an engine that stops making
 * sense of the board without saying so leaves the player with a tracker that has quietly given up.
 */
interface EngineOps {
    fun onFrame(input: FrameInput): List<TrackerEvent>

    fun onCnnSnapshot(snap: CnnSnapshot): List<TrackerEvent>

    fun apply(action: EngineAction): List<TrackerEvent>

    fun status(): TrackerStatus

    /** The game FEN without the rest of [status]. */
    fun fen(): String

    /**
     * Whether a reading right now would tell this engine anything.
     *
     * The default is yes, which is what the diff engine has always meant: it consumes whatever the
     * observer produces and discards what it cannot use. An engine that knows when it is blind —
     * because a hand is over the board, or because nothing has changed since the last understood
     * still image — says no here, and the observer skips a whole inference. That is the difference
     * between a few hundred readings per game and a few thousand, and on a phone it is battery.
     *
     * Asked on the engine's own thread, once per frame, before the observer's own gates.
     */
    fun wantsCnnRead(): Boolean = true

    /**
     * Which of the two optional per-frame measurements this engine consumes.
     *
     * Read once when the stack is built, not per frame: the engine is chosen at restart. Same
     * bargain as [wantsCnnRead] — an engine that admits it never looks at a number buys the host
     * the right not to compute it.
     */
    val reads: FrameReads get() = FrameReads()
}

/**
 * What an engine takes from [FrameInput] beyond the pixels — the fields the host may skip.
 *
 * Both defaults are true, i.e. the diff engine's appetite, so an engine that says nothing keeps
 * today's frame. [gridCoverage] is the expensive one: a Canny over the whole detection plane,
 * measured at 7-20 ms per frame on the phone (`GridLines.kt`).
 */
data class FrameReads(
    val gridCoverage: Boolean = true,
    val roiMotion: Boolean = true,
)
