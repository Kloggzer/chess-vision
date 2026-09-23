package com.chesslab.tracker.analysis

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.io.IOException

private const val FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
private val PROFILE = EngineProfile(threads = 2, hashMb = 64)

class EngineServiceTest {
    private val spawned = mutableListOf<ScriptedEngineProcess>()

    private fun service(script: (String) -> List<String> = engineScript(listOf("info depth 9 score cp 20 pv e2e4"))) =
        EngineService { UciEngine("fake") { ScriptedEngineProcess(script).also { spawned += it } } }

    @Test
    fun twoLeasesOnOneLaneShareOneProcessUntilTheLastLetsGo() {
        val engines = service()
        val bar = engines.lease(EngineLane.LIVE, PROFILE)
        val hint = engines.lease(EngineLane.LIVE, PROFILE)

        bar.search(FEN, 10, 1)
        hint.search(FEN, 10, 1)
        bar.close()

        assertEquals(1, spawned.size)
        assertTrue(spawned.single().isAlive, "the hint still holds the lane")
        hint.close()
        assertFalse(spawned.single().isAlive, "the last lease closes the process")
    }

    @Test
    fun theGateRefusesLiveButNeverReview() {
        val engines = service()
        engines.updateGate(GateBlock.THERMAL)

        val live = engines.lease(EngineLane.LIVE, PROFILE).use { it.search(FEN, 10, 1) }
        val review = engines.lease(EngineLane.REVIEW, PROFILE).use { it.search(FEN, 10, 1) }

        assertEquals(EngineSearch.Blocked, live)
        assertTrue(review is EngineSearch.Found, "the review pass is exempt from gateBlock")
        assertEquals(1, spawned.size, "only the review lane started a process")
    }

    @Test
    fun aFailedSearchDropsTheProcessSoTheNextStartsFresh() {
        val engines = service()
        engines.lease(EngineLane.LIVE, PROFILE).use { lease ->
            lease.search(FEN, 10, 1)
            spawned.single().dieOn = "go movetime 10"
            assertThrows<IOException> { lease.search(FEN, 10, 1) }
            assertTrue(lease.search(FEN, 10, 1) is EngineSearch.Found)
        }
        assertEquals(2, spawned.size)
    }

    @Test
    fun aNewProfileRestartsTheLanesProcess() {
        val engines = service()
        engines.lease(EngineLane.LIVE, PROFILE).use { it.search(FEN, 10, 1) }
        val first = spawned.single()

        engines.lease(EngineLane.LIVE, PROFILE).use { bar ->
            bar.search(FEN, 10, 1)
            engines.lease(EngineLane.LIVE, EngineProfile(threads = 1, hashMb = 16)).use { it.search(FEN, 10, 1) }
        }

        assertFalse(first.isAlive)
        assertEquals(3, spawned.size, "closed with its lease, then restarted for the other profile")
        assertTrue(spawned.last().commands.contains("setoption name Threads value 1"))
    }

    @Test
    fun noBinaryIsUnavailableNotAnError() {
        val engines = EngineService { null }

        val search = engines.lease(EngineLane.REVIEW, PROFILE).use { it.search(FEN, 10, 1) }

        assertEquals(EngineSearch.Unavailable, search)
    }
}
