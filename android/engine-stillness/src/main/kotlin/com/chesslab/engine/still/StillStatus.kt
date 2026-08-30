package com.chesslab.engine.still

import com.chesslab.engine.api.TrackerStatus

/**
 * What this engine can honestly say about itself.
 *
 * Most of `TrackerStatus` describes the diff channel — per-square z, the two evidence channels,
 * the verify ladder — and none of it exists here. Those fields stay empty, which shows as empty
 * debug panels rather than as invented numbers. Four fields are NOT free to leave empty and are
 * filled for that reason:
 *
 * - `fps` at zero reads as "no detection" on the phone, over a game that is being tracked fine.
 * - `state` outside `waiting|moving|occluded|move` falls through to a neutral label.
 * - `occlusionVetoed` empty declares every board hand-free, and the recording then photographs
 *   through a hand.
 * - `cnnOccluded` empty declares every frame risk-free training material.
 */
internal object StillStatus {
    fun of(engine: StillnessEngine): TrackerStatus {
        val s = engine.snapshotState()
        val covered = s.covered.toSet()
        return TrackerStatus(
            state = if (covered.size > OCCLUDED_AT && s.phase != "moving") "occluded" else s.phase,
            fen = s.fen,
            z = emptyMap(),
            diffs = emptyMap(),
            census = emptyMap(),
            changed = emptySet(),
            shadowVetoed = emptySet(),
            occlusionVetoed = covered,
            cnnConflicts =
                s.alarm
                    ?.conflicts
                    ?.toSet()
                    .orEmpty(),
            cnnOccluded = covered,
            bestLl = 0.0,
            secondLl = 0.0,
            bestUci = null,
            stuckReason = s.stuck,
            alarm = s.alarm,
            confirmerKey = null,
            confirmerCount = 0,
            verifyState = null,
            pendingUci = null,
            pendingFrames = 0,
            stageTimingsMs = emptyMap(),
            fps = s.fps,
            note = s.note,
        )
    }

    /** Enough covered squares that "a hand is over the board" is the better description. */
    private const val OCCLUDED_AT = 6
}
