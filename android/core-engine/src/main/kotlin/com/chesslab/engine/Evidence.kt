package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import kotlin.math.max

/** The debug list keeps the strongest 8 census-z squares. */
private const val STRUCT_VALS_LIMIT = 8

private const val STRUCT_VALS_SOFT_FACTOR = 0.5

/** One decimal, HALF_EVEN (`Math.rint`), not half-up. */
private const val ROUND_ONE_DECIMAL = 10.0

/**
 * Step 2 — brightness (`absdiff` vs base truth, median-normalized so a global exposure jump dies) and
 * structure (census, illumination-invariant, which is why it sees the dark-on-dark moves the gray mean
 * dilutes away), fused as `z = max(zGray, censusZWeight * zCensus)`. Vetoes and noise update come later.
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
 * The structural channel including the **channel-local guard**: census is illumination-invariant but NOT
 * translation-invariant, so a pixel of jitter fires every textured square at once. More hot squares than
 * a legal move could explain drops the channel and LEARNS the disturbance — never while the alarm is up.
 */
private fun EngineState.censusEvidence(cur: GrayImage): DoubleArray? {
    val ref = requireNotNull(refGray) { "censusEvidence without a reference image" }
    val refCodes = refCensusCodes(ref)
    // Keep this frame's codes: the quiet re-anchor makes `cur` the NEXT frame's reference, and
    // re-deriving them there transformed the same plane twice per frame (see `refCensusCodes`).
    curCensus = censusBuffer(cur.width, cur.height, curCensus)
    curCensusFor = cur
    perSquareCensusChange(refCodes, cur, evidenceBoxes, censValues, codesOut = curCensus)
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
 * The reference's census codes, cached on **identity**, never equality — the anomaly patcher mutates
 * `refGray` in place and invalidates by nulling [EngineState.refCensusFor]. The quiet re-anchor makes the
 * cached plane a new one almost every frame, so its codes are adopted by swapping buffers, not redone.
 */
internal fun EngineState.refCensusCodes(ref: GrayImage): ByteArray {
    val cached = refCensus
    if (refCensusFor === ref && cached != null) return cached
    val adopted = curCensus
    if (curCensusFor === ref && adopted != null) {
        curCensus = cached
        curCensusFor = null
        refCensus = adopted
        refCensusFor = ref
        return adopted
    }
    val codes = censusCodesInBoxes(ref, evidenceBoxes, censusBuffer(ref.width, ref.height, cached))
    refCensus = codes
    refCensusFor = ref
    return codes
}

/** [refCensusCodes] against the live reference; fails loudly when there is none. */
internal fun EngineState.refCensusCodes(): ByteArray =
    refCensusCodes(requireNotNull(refGray) { "refCensusCodes without a reference image" })

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
