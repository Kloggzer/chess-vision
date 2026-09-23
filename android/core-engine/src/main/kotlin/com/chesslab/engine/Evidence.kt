package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import kotlin.math.max

/** Brightness (median-normalised, so a global exposure jump dies) and census (illumination-invariant, so it
 *  sees dark-on-dark moves the gray mean dilutes), fused as `z = max(zGray, censusZWeight * zCensus)`. */
internal fun EngineState.computeEvidence(cur: GrayImage) {
    val ref = requireNotNull(refGray) { "computeEvidence without a reference image" }
    perSquareDiff(ref, cur, evidenceBoxes, diffRaw)
    normalizeDiffs(diffRaw, lastDiffs)
    noise.z(lastDiffs, zGray)
    // A leftover raw channel would freeze the shadow veto's input after the live weight goes to 0.
    censRaw = null
    lastCens = null
    val zs =
        if (config.censusZWeight > 0.0) {
            censusEvidence(cur)
        } else {
            null
        }

    val w = config.censusZWeight
    for (i in 0 until Squares.COUNT) {
        lastZ[i] = if (zs == null) zGray[i] else max(zGray[i], w * zs[i])
    }
}

/** Census is NOT translation-invariant: a pixel of jitter fires every textured square. More hot squares
 *  than a legal move explains drops the channel and LEARNS the disturbance — never while alarmed. */
private fun EngineState.censusEvidence(cur: GrayImage): DoubleArray? {
    val ref = requireNotNull(refGray) { "censusEvidence without a reference image" }
    val refCodes = refCensusCodes(ref)
    // Kept: the quiet re-anchor makes `cur` the next reference, and re-deriving transformed each plane twice.
    curCensus = censusBuffer(cur.width, cur.height, curCensus)
    curCensusFor = cur
    perSquareCensusChange(refCodes, cur, evidenceBoxes, censValues, codesOut = curCensus)
    // RAW, before normalization: `censusThr` was tuned on raw census, and normalization can pull a changed
    // destination under it — the phantom-shadow-as-destination class (entry.md invariant 8).
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
        return null
    }
    lastCens = censNorm
    return zCensus
}

/** Cached on **identity**: the patcher mutates `refGray` in place and invalidates by nulling. A new plane
 *  almost every frame, so its codes are adopted by swapping buffers. */
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

internal fun EngineState.refCensusCodes(): ByteArray =
    refCensusCodes(requireNotNull(refGray) { "refCensusCodes without a reference image" })
