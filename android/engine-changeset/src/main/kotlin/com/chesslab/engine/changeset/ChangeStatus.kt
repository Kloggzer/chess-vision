package com.chesslab.engine.changeset

import com.chesslab.engine.api.TrackerStatus

/**
 * What this engine can honestly say about itself.
 *
 * Four fields are not free to leave empty, each for a measured reason: `fps` at zero shows as "no
 * detection" over a game being tracked fine, a `state` outside `waiting|moving|occluded|move`
 * falls through to a neutral label, an empty `occlusionVetoed` declares every board hand-free so
 * the recording photographs through a hand, and an empty `cnnOccluded` waves those frames through
 * as training material. The rest describes the first engine's diff channel and z-scores, which do
 * not exist here — left empty, so the debug panels are blank rather than invented.
 */
object ChangeStatus {
    fun of(
        engine: ChangeSetEngine,
        fps: Double,
        plies: Int,
    ): TrackerStatus {
        val covered = engine.coveredNames.toSet()
        val phase = engine.phase.state()
        return TrackerStatus(
            state = if (covered.size > OCCLUDED_AT && phase != "moving") "occluded" else phase,
            fen = engine.position.fen,
            z = emptyMap(),
            diffs = emptyMap(),
            census = emptyMap(),
            changed = emptySet(),
            shadowVetoed = emptySet(),
            occlusionVetoed = covered,
            cnnConflicts =
                engine.alarms.current
                    ?.conflicts
                    ?.toSet()
                    .orEmpty(),
            cnnOccluded = covered,
            bestLl = 0.0,
            secondLl = 0.0,
            bestUci = null,
            stuckReason = engine.stuck,
            alarm = engine.alarms.current,
            confirmerKey = null,
            confirmerCount = plies,
            verifyState = null,
            pendingUci = null,
            pendingFrames = 0,
            stageTimingsMs = emptyMap(),
            fps = fps,
            note = engine.notes.current,
        )
    }

    /** Enough covered squares that "a hand is over the board" is the better description. */
    private const val OCCLUDED_AT = 6
}
