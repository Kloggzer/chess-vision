package com.chesslab.tracker.spectate

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.games.ReviewPly
import com.chesslab.tracker.games.ReviewSegment
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import java.lang.reflect.Modifier

internal fun status(
    fen: String = STARTPOS,
    state: String = "waiting",
    stuckReason: String? = null,
    alarm: TrackerEvent.Alarm? = null,
) = TrackerStatus(
    state = state,
    fen = fen,
    z = emptyMap(),
    diffs = emptyMap(),
    census = emptyMap(),
    changed = emptySet(),
    shadowVetoed = emptySet(),
    occlusionVetoed = emptySet(),
    bestLl = 0.0,
    secondLl = 0.0,
    bestUci = null,
    stuckReason = stuckReason,
    alarm = alarm,
    confirmerKey = null,
    confirmerCount = 0,
    verifyState = null,
    pendingUci = null,
    pendingFrames = 0,
    stageTimingsMs = emptyMap(),
    fps = 0.0,
    note = null,
)

private const val AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"

/** The live game as the service publishes it — the ONE score sheet the spectator projects. */
internal fun played(vararg sanUci: Pair<String, String>): GameView =
    GameView(
        id = "",
        live = true,
        startFen = STARTPOS,
        result = "*",
        segments =
            listOf(
                ReviewSegment(
                    startFen = STARTPOS,
                    plies = sanUci.mapIndexed { i, (san, uci) -> ReviewPly(i + 1, san, uci, "", "diff") },
                    enteredBy = null,
                ),
            ),
    )

class GameSnapshotTest {
    @Test
    fun snapshotCarriesNoEngineInternals() {
        // Static fields are the compiler's (Companion, stable, childSerializers), not the wire's.
        val fields =
            GameSnapshot::class.java.declaredFields
                .filterNot { Modifier.isStatic(it.modifiers) }
                .map { it.name }
                .toSet()
        assertEquals(
            setOf("fen", "sanHistory", "lastMoveUci", "status", "result", "updatedAtEpochMs"),
            fields,
        )
    }

    @Test
    fun snapshotProjectsAlarmAsStatus() {
        val alarm = TrackerEvent.Alarm("illegal", listOf("e4", "d5"), "e2e4", "e4")
        val snap = gameSnapshot(status(fen = AFTER_E4, alarm = alarm), played("e4" to "e2e4"), 7L)
        assertEquals(STATUS_ALARM, snap.status)
        // The conflict list is engine internals; only the one word crosses the wire.
        assertEquals(setOf("e4"), snap.sanHistory.toSet())
        assertNull(snap.result)
    }

    @Test
    fun stuckAndTrackingAndWaitingAreDistinct() {
        assertEquals(STATUS_WAITING, gameSnapshot(status(), played(), 0L).status)
        assertEquals(STATUS_TRACKING, gameSnapshot(status(fen = AFTER_E4), played("e4" to "e2e4"), 0L).status)
        assertEquals(STATUS_STUCK, gameSnapshot(status(stuckReason = "no motion"), played(), 0L).status)
    }

    @Test
    fun aMatedPositionIsOverWithAResult() {
        val fools = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3"
        val snap = gameSnapshot(status(fen = fools), played("Qh4#" to "d8h4"), 0L)
        assertEquals(STATUS_OVER, snap.status)
        assertEquals("0-1", snap.result)
    }

    @Test
    fun lastMoveIsTheLastCommittedPly() {
        val snap = gameSnapshot(status(), played("e4" to "e2e4", "c5" to "c7c5"), 3L)
        assertEquals("c7c5", snap.lastMoveUci)
        assertEquals(listOf("e4", "c5"), snap.sanHistory)
        assertEquals(3L, snap.updatedAtEpochMs)
    }

    /**
     * The spectator holds no score sheet of its own any more, so a game whose plies the live source
     * dropped — an undo — is projected without them. It used to keep them for the rest of the game.
     */
    @Test
    fun theSheetIsWhateverTheLiveSourceSaysItIs() {
        assertEquals(emptyList<String>(), gameSnapshot(status(fen = AFTER_E4), played(), 0L).sanHistory)
    }
}
