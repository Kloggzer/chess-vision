package com.chesslab.tracker.camera

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The deadline on a re-measure.
 *
 * A camera that never reports convergence is not hypothetical — `settled` treats an unreported key
 * as settled precisely because devices differ — and without a deadline the button that triggers a
 * re-measure would never come back.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class ConvergenceWaitTest {
    @Test
    fun aDeviceThatSettlesTheInstantTheFreezeIsReleasedIsNotMissed() =
        runTest {
            val wait = ConvergenceWait(TIMEOUT_MS)
            // The report arrives from inside `start`, i.e. before `await` has suspended even once.
            assertTrue(wait.await { wait.onConverged() })
        }

    @Test
    fun convergenceReportedBeforeTheDeadlineIsWhatIsReturned() =
        runTest {
            val wait = ConvergenceWait(TIMEOUT_MS)
            var released = false
            val settling = async { wait.await { released = true } }
            runCurrent()
            assertTrue(released, "the freeze must be released before anything is waited for")
            wait.onConverged()
            assertTrue(settling.await())
        }

    @Test
    fun aCameraThatNeverConvergesEndsTheWaitInsteadOfHangingIt() =
        runTest {
            val wait = ConvergenceWait(TIMEOUT_MS)
            var released = false
            assertFalse(wait.await { released = true })
            assertTrue(released)
        }

    @Test
    fun aReportThatArrivesTooLateDoesNotSatisfyTheNextWait() =
        runTest {
            val wait = ConvergenceWait(TIMEOUT_MS)
            assertFalse(wait.await { })
            // The device finally settles, long after the caller gave up and restored the old lock.
            wait.onConverged()
            assertFalse(wait.await { }, "a stale report must not be counted as a fresh convergence")
        }

    private companion object {
        const val TIMEOUT_MS = 5_000L
    }
}
