package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage

private const val BGR_CHANNELS = 3

// Per-frame scratch. Private to this file, fully consumed inside the call, and the engine is
// single-threaded (entry.md hard rule 2), so nothing can alias a caller's array (01a's D01a-2).
private var refHsvBuf = ByteArray(0)
private var curHsvBuf = ByteArray(0)
private var censBandBuf = DoubleArray(Squares.COUNT)

/**
 * Step 3 of `_try_detect` — Python `_apply_vetoes` (`tracker.py:3141-3176`).
 *
 * **entry.md invariant 2, the half that PRESERVES z.** A cast shadow (Cucchiara HSV + a census
 * confirmation) only removes the square from `changed`, i.e. from the gates; its z-value survives
 * untouched for scoring. A VACATED square very often reads as a uniform darkening to the HSV test —
 * the piece left and the board colour shows through — so zeroing z here would destroy the
 * from-evidence of every real move. The opposite semantics (z zeroed) belong to the occlusion
 * taint in `Taint.kt`.
 *
 * Python's unused `z` parameter is not carried over (STATUS D03b-1); nothing in this function reads
 * or writes z, which is exactly the property the phase's acceptance grep checks.
 */
internal fun EngineState.applyVetoes(
    cur: GrayImage,
    curBgr: BgrImage?,
    changed: MutableSet<String>,
    cens: Map<String, Double>?,
): VetoResult {
    shadowVetoed = emptyList()
    var shadowVeto: Set<String> = emptySet()
    val ref = refBgr
    if (curBgr != null && ref != null && changed.isNotEmpty()) {
        // Invariant 8: `censusThr` (40.0) was live-tuned on the RAW census channel. The normalized
        // dict serves scoring and noise learning; using it here lets normalization pull a
        // structurally changed destination square under the threshold, which is the
        // phantom-shadow-as-destination class (`:3165-3169`).
        val censForVeto = censRaw ?: bandCensusForVeto(cur, changed, cens)
        val shadows = hsvShadows(ref, curBgr, changed)
        val thr = config.censusThr
        shadowVeto = changed.filterTo(LinkedHashSet()) { it in shadows && censForVeto.getValue(it) < thr }
        if (shadowVeto.isNotEmpty()) {
            changed.removeAll(shadowVeto)
            shadowVetoed = shadowVeto.sorted()
        }
    }
    // Opaque occlusion lives in the taint mechanism (z is zeroed there) — report the CURRENTLY
    // latched squares so 03d's "only photograph a clean board" guard in step 5 is a real condition
    // and not a permanently-true `not set()` (`:3173-3176`).
    return VetoResult(changed, shadowVeto, tainted.keys.toSet())
}

/**
 * `hsv_shadow_squares(self.ref_bgr, cur_bgr, ...)` (`:3162-3164`).
 *
 * Python hands `cv2.cvtColor` the two BGR planes on every call; 01c's port takes the converted HSV
 * planes, so the conversion happens here, into reusable buffers.
 */
private fun EngineState.hsvShadows(
    ref: BgrImage,
    cur: BgrImage,
    candidates: Set<String>,
): Set<String> {
    val need = cur.width * cur.height * BGR_CHANNELS
    if (refHsvBuf.size != need) refHsvBuf = ByteArray(need)
    if (curHsvBuf.size != need) curHsvBuf = ByteArray(need)
    bgrToHsv(ref.data, ref.width, ref.height, refHsvBuf)
    bgrToHsv(cur.data, cur.width, cur.height, curHsvBuf)
    val geom = PlaneGeometry(cur.width, cur.height, detSize, whitePov, config.overhang)
    return hsvShadowSquares(refHsvBuf, curHsvBuf, geom, candidates)
}

/**
 * The `censusZWeight == 0` fast path (`:3155-3161`): no evidence-side census channel exists this
 * frame, so the veto computes its own over the candidate rows only.
 *
 * `rows = (min y0 - 1, max y1 + 1)` over the candidates' extended boxes — the +/-1 halo is what
 * makes the band-local census codes identical to the full transform inside the band. The locally
 * computed map **is raw already**, so it needs no `censRaw` counterpart.
 *
 * This never runs when [EngineState.censRaw] is available: a second census evaluation over a
 * different band would be a divergent channel, not a cheaper one.
 */
private fun EngineState.bandCensusForVeto(
    cur: GrayImage,
    changed: Set<String>,
    cens: Map<String, Double>?,
): Map<String, Double> {
    if (cens != null) return cens
    val boxes = evidenceBoxes
    var yLo = Int.MAX_VALUE
    var yHi = Int.MIN_VALUE
    for (square in changed) {
        val i = Squares.index(square)
        if (i < 0) continue
        if (boxes.y0[i] < yLo) yLo = boxes.y0[i]
        if (boxes.y1[i] > yHi) yHi = boxes.y1[i]
    }
    perSquareCensusChange(
        refCensusCodes(),
        cur,
        boxes,
        censBandBuf,
        rows = intArrayOf(yLo - 1, yHi + 1),
    )
    val out = LinkedHashMap<String, Double>(Squares.COUNT)
    for (i in 0 until Squares.COUNT) {
        out[Squares.ALL[i]] = censBandBuf[i]
    }
    return out
}

/**
 * What `_apply_vetoes` returns (`tracker.py:3176`): the surviving candidate set, the shadow-vetoed
 * squares, and the currently latched (occluded) squares.
 *
 * Declared LAST on purpose: as the first top-level declaration of a file named `Vetoes.kt` it trips
 * detekt's `MatchingDeclarationName` (STATUS D03b-3).
 */
internal data class VetoResult(
    val changed: MutableSet<String>,
    val shadowVeto: Set<String>,
    val occludedSet: Set<String>,
)
