package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.TrackerConfig
import kotlin.math.max

// The per-frame seam planes, recycled.
//
// `toGrayImage`/`toBgrImage` used to allocate a fresh 640 KB + 1.92 MB pair per frame — 77 MB/s at
// 30 fps, all of it large-object garbage the collector then had to chase on the analyzer thread.
//
// They cannot simply be reused: entry.md **invariant 14** — the engine stores the planes it is
// handed BY REFERENCE (`RunningMeanGray.append` keeps the array, `prevGray` keeps the array), so a
// single shared buffer rewrites the frames the running mean is still averaging and the mean drifts
// SILENTLY towards the newest frame. What the engine holds is bounded, though, so a ring deeper
// than that bound is safe.

/**
 * Slots beyond the averaging window.
 *
 * The tight bound is `window + 1`, and it is tight for a reason worth writing down. At the moment
 * the ring hands out the plane for frame `N`, the engine still holds
 * `N-1 .. N-window` (the running mean's deque, whose newest element is also `prevGray`) — `window`
 * planes — and `PlaneMean.append` reads the evicted plane `N-window` in the same pass in which it
 * reads the new one, so those two must be different arrays as well.
 *
 * The extra slots are headroom for the two ways the window can move without the ring being told in
 * the same frame: `avgFramesOverride` raised from the settings screen, and the CNN attaching (which
 * flips `avgFrames` between its with-CNN and without-CNN values). [ringDepth] already takes the max
 * over the CNN flip; the headroom covers the ordering.
 */
private const val RING_HEADROOM = 3

/**
 * How many planes the ring must hold for [config].
 *
 * The **max** over the CNN flip, not the current value: `avgFrames` is CNN-conditional (2 with, 3
 * without) and the CNN attaches asynchronously, long after the pipeline was built. A fixed 5 would
 * be right for the defaults and wrong the moment `avgFramesOverride` is set — it is a live knob
 * (`ConfigKnobs.kt`), so the depth is derived, not hard-coded.
 */
internal fun ringDepth(config: TrackerConfig): Int = max(config.avgFrames(cnnOn = true), config.avgFrames(cnnOn = false)) + RING_HEADROOM

/**
 * A fixed number of reusable plane buffers, handed out round-robin.
 *
 * Single-threaded by contract — it belongs to the analyzer thread. A plane that escapes that thread
 * or outlives the cycle (the CNN crop hand-off) must be COPIED by the caller, never taken from here;
 * see [CameraStages.updateCropFrame].
 */
internal class PlaneRing(
    depth: Int,
) {
    private var slots = arrayOfNulls<ByteArray>(max(1, depth))
    private var cursor = 0

    val depth: Int get() = slots.size

    /**
     * The next buffer of exactly [size] bytes.
     *
     * A size change (the detection plane was rebuilt at a new `detSize`) replaces slots one at a
     * time as they come round, which is correct: the stale-sized ones are exactly the planes the
     * engine may still be holding, and it drops them itself when the plane size changes.
     */
    fun next(size: Int): ByteArray {
        val index = cursor
        cursor = (index + 1) % slots.size
        val held = slots[index]
        if (held != null && held.size == size) return held
        val fresh = ByteArray(size)
        slots[index] = fresh
        return fresh
    }

    /**
     * Grow or shrink the ring. Every slot is dropped rather than carried over: the buffers handed
     * out under the old depth are still live in the engine, and re-indexing them would be exactly
     * the aliasing this class exists to prevent.
     */
    fun resize(depth: Int) {
        val want = max(1, depth)
        if (want == slots.size) return
        slots = arrayOfNulls(want)
        cursor = 0
    }
}
