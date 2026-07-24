package com.chesslab.geometry

import kotlin.math.abs

// Smoothed, occlusion/jitter-resilient marker positions. Port of `calibration.py:562
// MarkerTracker`; parameters copied verbatim from `config.TRACKER` (config.py:208-222).
//
// OpenCV-free ON PURPOSE (see Corners.kt). The detection half lives in `Aruco.kt`.

/** `config.TrackerDefaults` (config.py:208-222). All values in pixels or frames. */
data class MarkerTrackerParams(
    /** Dead zone: detected movement at or below this freezes the position. */
    val moveThreshold: Double = 4.0,
    /** EMA weight for real movement (0 = fixed, 1 = raw). */
    val smoothAlpha: Double = 0.35,
    /** A single-frame jump above this is treated as an outlier ... */
    val jumpRejectPx: Double = 60.0,
    /** ... unless it is confirmed over this many consecutive frames. */
    val jumpConfirmFrames: Int = 2,
    /** After this many frames without a live detection a corner counts as `stale`. */
    val maxHeldFrames: Int = 90,
    /** The box needs at least this many known corners (seed/live/held). */
    val defaultMinMarkers: Int = 2,
)

/** Per-corner tracker status: `seed`, `live`, `held` or `stale`. */
object MarkerStatus {
    const val SEED: String = "seed"
    const val LIVE: String = "live"
    const val HELD: String = "held"
    const val STALE: String = "stale"
}

/**
 * Tracks one smoothed position per marker id.
 *
 * - **Dead zone**: movement `<= moveThreshold` freezes the position (stable box).
 * - **Smoothing**: real movement is EMA'd with `smoothAlpha` instead of snapped.
 * - **Outlier rejection**: a single-frame jump `> jumpRejectPx` is held until the candidate
 *   repeats within `jumpRejectPx` over `jumpConfirmFrames` consecutive frames.
 * - **Ageing**: every frame ages every known corner; a live detection resets it to 0.
 * - **Seed**: `seed()` pre-populates corners from a profile. The FIRST live detection of a
 *   seeded corner SNAPS — EMA'ing it would leave the corner 65 % at the seed = a permanently
 *   offset grid. That is a named live bug fix in Python; do not "simplify" it.
 */
class MarkerTracker(
    val params: MarkerTrackerParams = MarkerTrackerParams(),
) {
    private val pos: MutableMap<Int, DoubleArray> = LinkedHashMap()
    private val age: MutableMap<Int, Int> = LinkedHashMap()
    private val seeded: MutableSet<Int> = LinkedHashSet()
    private val pending: MutableMap<Int, Pair<DoubleArray, Int>> = LinkedHashMap()

    /** Pre-populate from known geometry (e.g. a calibration profile). Never overwrites. */
    fun seed(pointsById: Map<Int, DoubleArray>) {
        for ((i, q) in pointsById) {
            if (i !in pos) {
                pos[i] = doubleArrayOf(q[0], q[1])
                // A seed immediately counts as "old"/unconfirmed.
                age[i] = params.maxHeldFrames
                seeded.add(i)
            }
        }
    }

    /** One detection tick. Returns the resulting points, like Python's `update`. */
    fun update(detected: Map<Int, DoubleArray>): Map<Int, DoubleArray> {
        for (i in pos.keys) {
            age[i] = (age[i] ?: 0) + 1
        }
        for ((i, q) in detected) {
            val p = doubleArrayOf(q[0], q[1])
            val prev = pos[i]
            if (prev == null) {
                accept(i, p)
            } else {
                updateKnown(i, p, prev)
            }
        }
        return points()
    }

    private fun updateKnown(
        i: Int,
        p: DoubleArray,
        prev: DoubleArray,
    ) {
        // L1 distance to the current position - NOT Euclidean.
        val d = abs(p[0] - prev[0]) + abs(p[1] - prev[1])
        when {
            // Dead zone: freeze the position (re-accepting the very same point) but mark it live.
            d <= params.moveThreshold -> accept(i, prev)
            // First real detection replaces the seed: SNAP, never EMA.
            i in seeded -> accept(i, p)
            d > params.jumpRejectPx && !confirmJump(i, p) -> Unit
            else ->
                accept(
                    i,
                    doubleArrayOf(
                        prev[0] + params.smoothAlpha * (p[0] - prev[0]),
                        prev[1] + params.smoothAlpha * (p[1] - prev[1]),
                    ),
                )
        }
    }

    private fun accept(
        i: Int,
        p: DoubleArray,
    ) {
        pos[i] = p
        age[i] = 0
        seeded.remove(i)
        pending.remove(i)
    }

    /** A jump is only accepted once the candidate holds still for `jumpConfirmFrames`. */
    private fun confirmJump(
        i: Int,
        p: DoubleArray,
    ): Boolean {
        val (cand, cnt) = pending[i] ?: (null to 0)
        val next =
            if (cand != null && abs(p[0] - cand[0]) + abs(p[1] - cand[1]) <= params.jumpRejectPx) {
                cnt + 1
            } else {
                1
            }
        pending[i] = p to next
        return next >= params.jumpConfirmFrames
    }

    /** All known corners (live, held, seeded). */
    fun points(): Map<Int, DoubleArray> = pos.mapValues { (_, p) -> doubleArrayOf(p[0], p[1]) }

    fun status(): Map<Int, String> =
        pos.keys.associateWith { i ->
            val a = age[i] ?: 0
            when {
                i in seeded -> MarkerStatus.SEED
                a == 0 -> MarkerStatus.LIVE
                a >= params.maxHeldFrames -> MarkerStatus.STALE
                else -> MarkerStatus.HELD
            }
        }

    fun status(id: Int): String? = status()[id]

    fun nLive(): Int = pos.keys.count { it !in seeded && (age[it] ?: 0) == 0 }

    fun nHeld(): Int = pos.keys.count { it !in seeded && (age[it] ?: 0) > 0 }
}
