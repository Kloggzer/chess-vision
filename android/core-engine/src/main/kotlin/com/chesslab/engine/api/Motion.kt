package com.chesslab.engine.api

import com.chesslab.engine.motionScore

/** Returns percent (0..100), not a fraction; `motionThr` is 0.25 percent. */
fun motionPercent(
    prev: ByteArray,
    cur: ByteArray,
    pxThr: Double,
): Double = motionScore(prev, cur, pxThr)
