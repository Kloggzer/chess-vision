package com.chesslab.engine

/**
 * Step 4 — the EMA learns on EVERY stable frame, including the stuck state, or jitter is never adapted away;
 * candidate and shadowed squares are excluded, since learning a shadow desensitizes a later real move there.
 * **entry.md invariant 9: nothing is learned under the alarm**, or the desync heals by drift, not correction.
 */
internal fun EngineState.learnNoise() {
    if (alarm != null) return
    val exclude = changed or shadowVetoed
    noise.update(lastDiffs, exclude)
    lastCens?.let { censusNoise.update(it, exclude, CENSUS_NOISE_EXCLUDE_ALPHA_SCALE) }
}
