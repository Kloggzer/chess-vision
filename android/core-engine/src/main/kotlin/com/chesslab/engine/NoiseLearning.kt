package com.chesslab.engine

/**
 * Step 4 of `_try_detect` — Python's noise learning, over [EngineState.lastDiffs] /
 * [EngineState.lastCens] and the post-veto [EngineState.changed] / [EngineState.shadowVetoed].
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
 * exclusion) lives in `Evidence.kt` — it is deliberately not duplicated here.
 */
internal fun EngineState.learnNoise() {
    if (alarm != null) return
    val exclude = changed or shadowVetoed
    noise.update(lastDiffs, exclude)
    lastCens?.let { censusNoise.update(it, exclude, CENSUS_NOISE_EXCLUDE_ALPHA_SCALE) }
}
