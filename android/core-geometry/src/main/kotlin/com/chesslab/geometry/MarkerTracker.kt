package com.chesslab.geometry

import kotlin.math.abs

// Parameters verbatim from `config.TRACKER`. OpenCV-free ON PURPOSE; the detection half is in `Aruco.kt`.

data class MarkerTrackerParams(
    val moveThreshold: Double = 4.0,
    val smoothAlpha: Double = 0.35,
    val jumpRejectPx: Double = 60.0,
    val jumpConfirmFrames: Int = 2,
    val maxHeldFrames: Int = 90,
    val defaultMinMarkers: Int = 2,
)

object MarkerStatus {
    const val SEED: String = "seed"
    const val LIVE: String = "live"
    const val HELD: String = "held"
    const val STALE: String = "stale"
}

/** Dead zone, EMA smoothing, outlier jumps held for `jumpConfirmFrames`. The FIRST live detection of a seeded
 *  corner SNAPS — EMA'ing it left the corner 65 % at the seed, a permanently offset grid. Do not "simplify". */
class MarkerTracker(
    val params: MarkerTrackerParams = MarkerTrackerParams(),
) {
    private val pos: MutableMap<Int, DoubleArray> = LinkedHashMap()
    private val age: MutableMap<Int, Int> = LinkedHashMap()
    private val seeded: MutableSet<Int> = LinkedHashSet()
    private val pending: MutableMap<Int, Pair<DoubleArray, Int>> = LinkedHashMap()

    /** Never overwrites. */
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

    fun update(detected: Map<Int, DoubleArray>): Map<Int, DoubleArray> {
        for (i in pos.keys) {
            age[i] = (age[i] ?: 0) + 1
            // AUFEINANDERFOLGENDE Bilder: sonst ueberlebte ein Kandidat eine 500-Bild-Luecke.
            if (i !in detected) pending.remove(i)
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
        // L1 distance, NOT Euclidean.
        val d = abs(p[0] - prev[0]) + abs(p[1] - prev[1])
        when {
            // Dead zone: freeze the position (the very same point) but mark it live.
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
}
