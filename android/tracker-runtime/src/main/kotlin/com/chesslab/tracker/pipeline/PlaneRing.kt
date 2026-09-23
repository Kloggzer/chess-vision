package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.TrackerConfig
import kotlin.math.max

// The per-frame seam planes, recycled: a fresh pair per frame was 77 MB/s of large-object garbage. Not ONE
// shared buffer: the engine holds planes BY REFERENCE (invariant 14), and the running mean would drift silently
// towards the newest frame. What it holds is bounded, so a deeper ring is safe.

/** The tight bound is `window + 1`: `PlaneMean.append` reads the evicted plane in the same pass as the new one.
 *  Headroom for a window that moves before the ring is told (`avgFramesOverride`, the CNN attaching). */
private const val RING_HEADROOM = 3

/** The **max** over the CNN flip: `avgFrames` is CNN-conditional and the CNN attaches asynchronously. */
fun ringDepth(config: TrackerConfig): Int = max(config.avgFrames(cnnOn = true), config.avgFrames(cnnOn = false)) + RING_HEADROOM

/** Analyzer thread only. A plane that escapes it or outlives the cycle must be COPIED by the caller. */
class PlaneRing(
    depth: Int,
) {
    private var slots = arrayOfNulls<ByteArray>(max(1, depth))
    private var cursor = 0

    val depth: Int get() = slots.size

    /** A size change replaces slots as they come round: the stale-sized ones are what the engine may still hold. */
    fun next(size: Int): ByteArray {
        val index = cursor
        cursor = (index + 1) % slots.size
        val held = slots[index]
        if (held != null && held.size == size) return held
        val fresh = ByteArray(size)
        slots[index] = fresh
        return fresh
    }

    /** Every slot is dropped: the old buffers are still live in the engine, re-indexing them would alias. */
    fun resize(depth: Int) {
        val want = max(1, depth)
        if (want == slots.size) return
        slots = arrayOfNulls(want)
        cursor = 0
    }
}
