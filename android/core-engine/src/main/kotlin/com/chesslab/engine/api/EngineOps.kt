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
}
