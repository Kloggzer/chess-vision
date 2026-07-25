package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import kotlin.math.max

/** `_struct_vals` keeps the strongest 8 census-z squares. */
private const val STRUCT_VALS_LIMIT = 8

/** The `z_thr * 0.5` soft gate of the `_struct_vals` debug list. */
private const val STRUCT_VALS_SOFT_FACTOR = 0.5

/** Python's `round(v, 1)` — one decimal, half-to-EVEN (`Math.rint`), not half-up. */
private const val ROUND_ONE_DECIMAL = 10.0

/**
 * Step 2 of `_try_detect` — Python `_compute_evidence`. Fills [EngineState.lastDiffs],
 * [EngineState.lastCens], [EngineState.lastZ] and [EngineState.censRaw].
 *
 * - brightness: `absdiff` vs base truth -> **median normalization** (kills a global exposure jump)
 *   -> z against the per-square noise model;
 * - structure: census change vs base truth -> its own normalization and noise model. Census is
 *   illumination-invariant, which is exactly why it sees the dark-on-dark moves the gray mean
 *   dilutes away.
 *
 * Fused as `z = max(zGray, censusZWeight * zCensus)`. Weight 0 is the legacy gray-only mode.
 *
 * The vetoes, the taint filter and the noise UPDATE are steps 3 and 4 and deliberately do not
 * happen here.
 */
internal fun EngineState.computeEvidence(cur: GrayImage) {
    val ref = requireNotNull(refGray) { "computeEvidence without a reference image" }
    perSquareDiff(ref, cur, evidenceBoxes, diffRaw)
    normalizeDiffs(diffRaw, lastDiffs)
    noise.z(lastDiffs, zGray)
    // Per-frame semantics: never let a stale raw channel from an earlier frame survive.
    // `censusZWeight` is live-tunable, and a leftover `_cens_raw` would freeze the shadow veto's
    // threshold input after tuning the weight to 0.
    censRaw = null
    lastCens = null
    val zs =
        if (config.censusZWeight > 0.0) {
            censusEvidence(cur)
        } else {
            structVals = emptyList()
            null
        }

    val w = config.censusZWeight
    for (i in 0 until Squares.COUNT) {
        lastZ[i] = if (zs == null) zGray[i] else max(zGray[i], w * zs[i])
    }
}

/**
 * The structural channel, including the **channel-local guard**. Returns the census z-array, or
 * `null` when the channel is dropped for this frame.
 *
 * Census is illumination-invariant but NOT translation-invariant: table wobble or one pixel of
 * jitter shifts every piece edge and fires all textured squares at once. When more squares are
 * structurally hot than any legal move — not even a pair — could explain, the channel is dropped
 * for this frame and the disturbance is LEARNED into its noise model so it adapts away. The
 * learning step is skipped only while the illegal-move alarm is latched (entry.md invariant 9);
 * skipping it otherwise diverges from the very next frame on (STATUS D01d-4).
 */
private fun EngineState.censusEvidence(cur: GrayImage): DoubleArray? {
    val ref = requireNotNull(refGray) { "censusEvidence without a reference image" }
    perSquareCensusChange(refCensusCodes(ref), cur, evidenceBoxes, censValues)
    // The RAW channel, captured BEFORE normalization: `censusThr` (40.0) was live-tuned on raw
    // census and normalization can pull a structurally-changed destination square under it — that
    // is the phantom-shadow-as-destination class (entry.md invariant 8).
    censRaw = censValues
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
        return null
    }
    structVals = topStructVals(zCensus, w, config.zThr)
    lastCens = censNorm
    return zCensus
}

/**
 * Python `_ref_census_codes`: the reference's census codes, cached.
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

/** `sorted(((s, round(v, 1)) …), key=lambda kv: -kv[1])[:8]`. */
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
    sortByValueDescending(out)
    return if (out.size > STRUCT_VALS_LIMIT) ArrayList(out.subList(0, STRUCT_VALS_LIMIT)) else out
}
