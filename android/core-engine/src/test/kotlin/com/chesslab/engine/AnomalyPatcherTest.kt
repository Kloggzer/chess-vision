package com.chesslab.engine

import com.chesslab.engine.api.tryDetect
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * `_maybe_patch_anomaly` — the per-cell self-healing of the reference.
 *
 * Python reference: `tests/test_move_tracker.py::TestNudgePatch`.
 */
class AnomalyPatcherTest {
    @Test
    fun nudgePatchesOccupiedSquare() {
        // One OCCUPIED square is persistently changed and no viable move explains it (a nudge /
        // j'adoube). With `nudgeTimeoutS = 0` the cell is pulled forward immediately and the
        // tracker keeps running instead of staying stuck.
        val config = detectConfig().copy(nudgeTimeoutS = 0.0)
        val state = detectState(config, ref = grayFrame())
        val cur = grayFrame(listOf("e2"))
        state.tryDetect(cur, null, seq = 1)
        state.tryDetect(cur, null, seq = 2)
        assertNull(state.stuckReason)
        assertEquals(emptyList<String>(), state.history)
        // The reference adopted the cell -> the next frame is quiet.
        state.tryDetect(cur, null, seq = 3)
        assertEquals(0L, state.changed)
    }

    @Test
    fun emptySquareWaitsForDriftWindow() {
        // An EMPTY square that changes could also be a silent wrong move -> never patch it early.
        val config = detectConfig().copy(nudgeTimeoutS = 0.0, driftWindowS = 9999.0)
        val state = detectState(config, ref = grayFrame())
        val cur = grayFrame(listOf("e4"))
        state.tryDetect(cur, null, seq = 1)
        state.tryDetect(cur, null, seq = 2)
        assertEquals(STUCK_NO_LEGAL_MOVE, state.stuckReason)
        assertEquals(ofSquares("e4"), state.changed)
    }

    @Test
    fun patchInvalidatesRefCensusCache() {
        val state = detectState(ref = grayFrame())
        val ref = requireNotNull(state.refGray)
        // Warm the identity-keyed cache, then patch: `refGray` is mutated IN PLACE, so a stale
        // cache would keep comparing against the pre-patch codes forever.
        state.refCensusCodes(ref)
        assertNotNull(state.refCensusFor)
        state.nowS = 100.0
        state.armAnomaly("e2")
        state.maybePatchAnomaly(bestLl = -1.0, cur = grayFrame(listOf("e2")), curBgr = null)
        assertNull(state.refCensusFor, "the census cache must be invalidated")
        val recoded = state.refCensusCodes(ref)
        assertNotNull(state.refCensusFor)
        assertEquals(ref.data.size, recoded.size)
    }

    @Test
    fun patchRegionIncludesOverhang() {
        // The patched box must be exactly the pixels the diff looks at, overhang included: patching
        // only the base cell leaves the strip above it hot forever and the healing never converges.
        val config = detectConfig(overhang = 0.25).copy(nudgeTimeoutS = 0.0)
        val state = detectState(config, ref = grayFrame())
        val ref = requireNotNull(state.refGray)
        // A uniformly BRIGHTER frame, so the copied box is visible pixel for pixel.
        val cur = grayFrame(base = 200)
        state.nowS = 10.0
        state.armAnomaly("e2")
        state.maybePatchAnomaly(bestLl = -1.0, cur = cur, curBgr = null)
        val region = squareRegion(Squares.index("e2"), state.detSize, state.whitePov, inset = 0.0, extendUp = 0.25)
        var inside = 0
        for (y in 0 until ref.height) {
            for (x in 0 until ref.width) {
                val within = x >= region[0] && x < region[2] && y >= region[1] && y < region[3]
                val same = ref.data[y * ref.width + x] == cur.data[y * cur.width + x]
                if (within) {
                    inside += 1
                    assertTrue(same, "pixel ($x,$y) inside the patch region was not copied")
                } else {
                    assertEquals(TEST_BASE_LEVEL.toByte(), ref.data[y * ref.width + x], "pixel ($x,$y) outside")
                }
            }
        }
        assertTrue(inside > 0, "the patch region is empty")
        assertEquals(0L, state.anomalySince, "a patched square loses its timer")
        assertTrue(state.note.orEmpty().contains("Reference pulled forward (e2)"), "note was '${state.note}'")
    }

    @Test
    fun patchingEverythingClearsTheStuckMarker() {
        val state = detectState(detectConfig().copy(nudgeTimeoutS = 0.0), ref = grayFrame())
        state.markStuck(STUCK_NO_LEGAL_MOVE)
        state.nowS = 10.0
        state.armAnomaly("e2")
        state.maybePatchAnomaly(bestLl = -1.0, cur = grayFrame(listOf("e2")), curBgr = null)
        assertNull(state.stuckReason)
        assertEquals(0, state.confirmer.count)
    }

    @Test
    fun restingHandIsNeverPatched() {
        // More than `maxChanged + 2` changed squares is a hand, not a nudge — patching would copy
        // the hand into the reference.
        val state = detectState(detectConfig().copy(nudgeTimeoutS = 0.0), ref = grayFrame())
        val squares = listOf("a1", "b1", "c1", "d1", "e1", "f1", "g1", "h1", "a2")
        state.nowS = 10.0
        state.armAnomaly(*squares.toTypedArray())
        val ref = requireNotNull(state.refGray)
        state.maybePatchAnomaly(bestLl = -1.0, cur = grayFrame(squares), curBgr = null)
        assertTrue(ref.data.all { it == TEST_BASE_LEVEL.toByte() }, "the reference was patched with a hand")
    }

    @Test
    fun aViableMoveSuppressesPatching() {
        // `bestLl >= 0` means a move DOES explain the change — healing it away would erase the move.
        val state = detectState(detectConfig().copy(nudgeTimeoutS = 0.0), ref = grayFrame())
        val ref = requireNotNull(state.refGray)
        state.nowS = 10.0
        state.armAnomaly("e2")
        state.maybePatchAnomaly(bestLl = 0.0, cur = grayFrame(listOf("e2")), curBgr = null)
        assertTrue(ref.data.all { it == TEST_BASE_LEVEL.toByte() })
    }
}
