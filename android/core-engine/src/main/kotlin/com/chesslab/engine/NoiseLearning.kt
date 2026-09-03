package com.chesslab.engine

/**
 * Step 4 — the EMA learns on EVERY stable frame, including the stuck state, or jitter is never adapted away;
 * candidate, shadowed and TAINTED squares are excluded, since learning a shadow or a hand desensitizes a
 * later real move there — `applyTaints` zeroes a tainted square's z, so it never shows up as `changed`.
 * **entry.md invariant 9: nothing is learned under the alarm**, or the desync heals by drift, not correction.
 */
internal fun EngineState.learnNoise() {
    if (alarm != null) return
    val exclude = changed or shadowVetoed or tainted
    noise.update(lastDiffs, exclude)
    lastCens?.let { censusNoise.update(it, exclude, CENSUS_NOISE_EXCLUDE_ALPHA_SCALE) }
}
