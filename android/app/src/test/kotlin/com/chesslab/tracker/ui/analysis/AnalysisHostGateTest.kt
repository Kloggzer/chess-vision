package com.chesslab.tracker.ui.analysis

import com.chesslab.tracker.analysis.EngineLane
import com.chesslab.tracker.analysis.EngineProfile
import com.chesslab.tracker.analysis.EngineSearch
import com.chesslab.tracker.analysis.EngineService
import com.chesslab.tracker.analysis.StockfishAnalyzer
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test

private const val FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

private class HotProbe : PowerProbe {
    override fun thermalStatus() = 3

    override fun powerSaveMode() = false

    override fun batteryPercent() = 100

    override fun charging() = true
}

class AnalysisHostGateTest {
    @Test
    fun theHostsVerdictIsTheServicesGate() =
        runTest {
            val engines = EngineService { error("a blocked LIVE search must not reach the factory") }
            val analyzer =
                StockfishAnalyzer(
                    fenProvider = { FEN },
                    engines = engines,
                    dispatcher = StandardTestDispatcher(testScheduler),
                    lowerPriority = {},
                    warn = {},
                )
            val host = AnalysisHost(analyzer, engines, HotProbe(), backgroundScope)
            runCurrent()

            assertNotNull(host.block.value, "off or warming up, never open on a cold start")
            val search = engines.lease(EngineLane.LIVE, EngineProfile(2, 64)).use { it.search(FEN, 10, 1) }
            assertEquals(EngineSearch.Blocked, search)
        }
}
