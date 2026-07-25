package com.chesslab.engine

// Per-frame scratch. Private to this file, fully consumed inside the call, and the engine is
// single-threaded (entry.md hard rule 2), so nothing can alias a caller's array (01a's D01a-2).
private val diffBuf = DoubleArray(Squares.COUNT)
private val censBuf = DoubleArray(Squares.COUNT)

/**
 * Step 4 of `_try_detect` — Python's noise learning (`tracker.py:2909-2921`).
 *
 * The per-square EMA learns on **every** stable frame, including the stuck state: otherwise
 * marker/exposure jitter can never be adapted away. Candidate squares are excluded because they
 * carry the move; shadowed squares are excluded explicitly because learning a shadow — or a hand —
 * into the EMA inflates that square's std and desensitizes a later real move there.
 *
 * **entry.md invariant 9: nothing is learned while the illegal-move alarm is latched.** With the
 * alarm up, the reference/game-state pairing is fiction and the persistent illegal-position deltas
 * would be adapted into the EMA — desensitizing exactly the squares that PROVE the desync and
 * letting the alarm "heal" by drift instead of by user correction.
 *
 * The two lanes differ in one number and must never be unified: an excluded square learns
 * **nothing** in the gray lane (implicit `excludeAlphaScale = 0.0`) and at
 * [CENSUS_NOISE_EXCLUDE_ALPHA_SCALE] (0.125) in the census lane, whose full exclusion would
 * deadlock a flat square that fires from frame one.
 *
 * The channel-local census-guard learning path (`censusNoise.update(cens)` with full alpha and no
 * exclusion, `tracker.py:3126-3127`) lives in `Evidence.kt` and belongs to 03a — it is deliberately
 * not duplicated here.
 */
internal fun EngineState.learnNoise(
    diffs: Map<String, Double>,
    cens: Map<String, Double>?,
    changed: Set<String>,
    shadowVeto: Set<String>,
) {
    if (alarm == null) {
        val exclude = Squares.setToMask(changed union shadowVeto)
        noise.update(toArray(diffs, diffBuf), exclude)
        if (cens != null) {
            censusNoise.update(toArray(cens, censBuf), exclude, CENSUS_NOISE_EXCLUDE_ALPHA_SCALE)
        }
    }
}

/** A `Squares.ALL`-ordered `DoubleArray` view of a 64-key channel map, into [out]. */
private fun toArray(
    values: Map<String, Double>,
    out: DoubleArray,
): DoubleArray {
    for (i in 0 until Squares.COUNT) {
        out[i] = values[Squares.ALL[i]] ?: 0.0
    }
    return out
}
