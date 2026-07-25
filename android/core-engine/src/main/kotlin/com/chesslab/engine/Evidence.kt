package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import kotlin.math.max

/**
 * The two evidence channels of one detection frame. Python's `(diffs, cens, z)` triple
 * (`_compute_evidence`, `tracker.py:3084-3139`).
 *
 * @property diffs the **normalized** gray channel — it, not the raw one, feeds noise learning.
 * @property cens the **normalized** census channel, or `null` when the channel is off
 *   (`censusZWeight == 0`) or was dropped this frame by the channel-local guard.
 * @property z the FUSED per-square evidence, `max(zGray, w * zCensus)`.
 */
internal data class Evidence(
    val diffs: Map<String, Double>,
    val cens: Map<String, Double>?,
    val z: MutableMap<String, Double>,
)

/** `_struct_vals` keeps the strongest 8 census-z squares (`tracker.py:3134`). */
private const val STRUCT_VALS_LIMIT = 8

/** The `z_thr * 0.5` soft gate of the `_struct_vals` debug list (`tracker.py:3133`). */
private const val STRUCT_VALS_SOFT_FACTOR = 0.5

/** Python's `round(v, 1)` — one decimal, half-to-EVEN (`Math.rint`), not half-up. */
private const val ROUND_ONE_DECIMAL = 10.0

// Per-frame scratch. Private to this file, fully consumed inside the call, and the engine is
// single-threaded (entry.md hard rule 2) — nothing can alias a caller's array (01a's D01a-2 rule).
private val diffRaw = DoubleArray(Squares.COUNT)
private val diffNorm = DoubleArray(Squares.COUNT)
private val zGray = DoubleArray(Squares.COUNT)
private val censValues = DoubleArray(Squares.COUNT)
private val censNorm = DoubleArray(Squares.COUNT)
private val zCensus = DoubleArray(Squares.COUNT)

/**
 * Step 2 of `_try_detect` — Python `_compute_evidence` (`tracker.py:3084-3139`).
 *
 * - brightness: `absdiff` vs base truth -> **median normalization** (kills a global exposure jump)
 *   -> z against the per-square noise model;
 * - structure: census change vs base truth -> its own normalization and noise model. Census is
 *   illumination-invariant, which is exactly why it sees the dark-on-dark moves the gray mean
 *   dilutes away.
 *
 * Fused as `z = max(zGray, censusZWeight * zCensus)`. Weight 0 is the legacy gray-only mode.
 *
 * The vetoes, the taint filter and the noise UPDATE are steps 3 and 4 (phase 03b) and deliberately
 * do not happen here.
 */
internal fun EngineState.computeEvidence(cur: GrayImage): Evidence {
    val ref = requireNotNull(refGray) { "computeEvidence without a reference image" }
    perSquareDiff(ref, cur, evidenceBoxes, diffRaw)
    normalizeDiffs(diffRaw, diffNorm)
    noise.z(diffNorm, zGray)
    // Per-frame semantics: never let a stale raw map from an earlier frame survive
    // (`tracker.py:3099-3102`). `censusZWeight` is live-tunable, and a leftover `_cens_raw` would
    // freeze the shadow veto's threshold input after tuning the weight to 0.
    censRaw = null
    val census =
        if (config.censusZWeight > 0.0) {
            censusEvidence(cur)
        } else {
            structVals = emptyList()
            CensusOutcome.OFF
        }

    val w = config.censusZWeight
    val zs = census.zs
    val z = LinkedHashMap<String, Double>(Squares.COUNT)
    for (i in 0 until Squares.COUNT) {
        val zg = zGray[i]
        z[Squares.ALL[i]] = if (zs == null) zg else max(zg, w * zs[i])
    }
    return Evidence(squareMap(diffNorm), census.cens, z)
}

/** The census channel plus the z-array it fused from; both `null` when the channel is dropped. */
private class CensusOutcome(
    val cens: Map<String, Double>?,
    val zs: DoubleArray?,
) {
    companion object {
        val OFF = CensusOutcome(null, null)
    }
}

/**
 * The structural channel (`tracker.py:3103-3135`), including the **channel-local guard**.
 *
 * Census is illumination-invariant but NOT translation-invariant: table wobble or one pixel of
 * jitter shifts every piece edge and fires all textured squares at once. When more squares are
 * structurally hot than any legal move — not even a pair — could explain, the channel is dropped
 * for this frame and the disturbance is LEARNED into its noise model so it adapts away. The
 * learning step is skipped only while the illegal-move alarm is latched (entry.md invariant 9);
 * skipping it otherwise diverges from the very next frame on (STATUS D01d-4).
 */
private fun EngineState.censusEvidence(cur: GrayImage): CensusOutcome {
    val ref = requireNotNull(refGray) { "censusEvidence without a reference image" }
    perSquareCensusChange(refCensusCodes(ref), cur, evidenceBoxes, censValues)
    // The RAW copy, taken BEFORE normalization: `censusThr` (40.0) was live-tuned on raw census and
    // normalization can pull a structurally-changed destination square under it — that is the
    // phantom-shadow-as-destination class (entry.md invariant 8, `tracker.py:3112-3115`).
    censRaw = squareMap(censValues).toMutableMap()
    normalizeDiffs(censValues, censNorm)
    censusNoise.z(censNorm, zCensus)
    val w = config.censusZWeight
    var hot = 0
    for (i in 0 until Squares.COUNT) {
        if (w * zCensus[i] >= config.zThr) hot++
    }
    if (hot > config.maxChanged + 2) {
        if (alarm == null) censusNoise.update(censNorm)
        censRaw = null
        structVals = emptyList()
        return CensusOutcome.OFF
    }
    structVals = topStructVals(zCensus, w, config.zThr)
    return CensusOutcome(squareMap(censNorm), zCensus)
}

/**
 * Python `_ref_census_codes` (`tracker.py:3178-3186`): the reference's census codes, cached.
 *
 * The cache key is **identity**, never equality — `_maybe_patch_anomaly` mutates `refGray` in place
 * and invalidates by setting [EngineState.refCensusFor] to `null`.
 */
internal fun EngineState.refCensusCodes(ref: GrayImage): ByteArray {
    val cached = refCensus
    if (refCensusFor === ref && cached != null) return cached
    val codes = censusTransform(ref, out = censusBuffer(ref.width, ref.height, cached))
    refCensus = codes
    refCensusFor = ref
    return codes
}

/** [refCensusCodes] against the live reference; fails loudly when there is none. */
internal fun EngineState.refCensusCodes(): ByteArray =
    refCensusCodes(requireNotNull(refGray) { "refCensusCodes without a reference image" })

/** `sorted(((s, round(v, 1)) …), key=lambda kv: -kv[1])[:8]` (`tracker.py:3132-3134`). */
private fun topStructVals(
    zs: DoubleArray,
    weight: Double,
    zThr: Double,
): List<Pair<String, Double>> {
    val soft = zThr * STRUCT_VALS_SOFT_FACTOR
    val out = ArrayList<Pair<String, Double>>()
    for (i in 0 until Squares.COUNT) {
        // The gate reads the UNROUNDED value; only the emitted number is rounded.
        if (weight * zs[i] >= soft) {
            out.add(Squares.ALL[i] to Math.rint(zs[i] * ROUND_ONE_DECIMAL) / ROUND_ONE_DECIMAL)
        }
    }
    // Python's `sort` is stable and its key is `-value`, so equal values keep `_ALL` order and
    // `-0.0` never overtakes `0.0` (which `sortedByDescending` would do). Same rule as D02a-10.
    out.sortWith { a, b ->
        when {
            a.second < b.second -> 1
            a.second > b.second -> -1
            else -> 0
        }
    }
    return if (out.size > STRUCT_VALS_LIMIT) ArrayList(out.subList(0, STRUCT_VALS_LIMIT)) else out
}

/** A `Squares.ALL`-ordered view of a 64-value channel. */
private fun squareMap(values: DoubleArray): Map<String, Double> {
    val out = LinkedHashMap<String, Double>(Squares.COUNT)
    for (i in 0 until Squares.COUNT) {
        out[Squares.ALL[i]] = values[i]
    }
    return out
}
