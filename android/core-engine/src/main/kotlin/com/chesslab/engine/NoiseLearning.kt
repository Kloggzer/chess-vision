package com.chesslab.engine

/** Learns on EVERY stable frame, stuck included, or jitter is never adapted away. Candidate, shadowed and
 *  TAINTED squares are excluded: learning a hand desensitises a later move there. **Invariant 9: nothing
 *  under the alarm**, or the desync heals by drift. */
internal fun EngineState.learnNoise() {
    if (alarm != null) return
    val exclude = changed or shadowVetoed or tainted
    noise.update(lastDiffs, exclude)
    lastCens?.let { censusNoise.update(it, exclude, CENSUS_NOISE_EXCLUDE_ALPHA_SCALE) }
}
