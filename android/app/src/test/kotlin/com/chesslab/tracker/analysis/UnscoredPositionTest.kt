package com.chesslab.tracker.analysis

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

private const val OPENING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

/**
 * Eine Suche ohne `info`-Zeile hat nichts gemessen. `winWhite` ist `Double?`, damit genau das
 * sagbar ist — der Endstellungs-Pfad nutzt es —, aber die Suche erfindet stattdessen 50,0.
 */
class UnscoredPositionTest {
    @Test
    fun aSearchWithoutAnyScoreIsNotPublishedAsAnEvenPosition() =
        runTest {
            val proc = ScriptedEngineProcess(engineScript(emptyList()))
            val subject =
                StockfishAnalyzer(
                    fenProvider = { OPENING_FEN },
                    engineFactory = { UciEngine("fake") { proc } },
                    dispatcher = StandardTestDispatcher(testScheduler),
                    lowerPriority = {},
                    warn = {},
                )
            subject.start(backgroundScope)
            testScheduler.advanceTimeBy(1_000)
            runCurrent()
            subject.stop()

            assertNull(subject.result.value?.winWhite, "ohne Bewertung darf keine Zahl auf dem Balken stehen")
        }
}
