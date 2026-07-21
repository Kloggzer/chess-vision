package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage

/**
 * Moving average over the last N stable frames (gray + color kept aligned), the
 * denoising step of tracker.py's `_RunningMean` buffers. Incremental sliding sums
 * (append adds, evict subtracts — exact integer arithmetic, no drift) instead of
 * re-summing the whole window per frame; the mean over the window is identical to
 * the former full recomputation. A frame-size change (dynamic resolution rewarp)
 * restarts the window instead of mixing sizes.
 */
internal class FrameAverager(
    private val maxLen: Int,
) {
    private val grays = ArrayDeque<GrayImage>()
    private val bgrs = ArrayDeque<BgrImage>()
    private var graySum = IntArray(0)
    private var bgrSum = IntArray(0)

    val size: Int get() = grays.size

    fun append(
        gray: GrayImage,
        bgr: BgrImage,
    ) {
        if (graySum.size != gray.data.size || bgrSum.size != bgr.data.size) {
            clear()
            graySum = IntArray(gray.data.size)
            bgrSum = IntArray(bgr.data.size)
        }
        grays.addLast(gray)
        bgrs.addLast(bgr)
        addTo(graySum, gray.data)
        addTo(bgrSum, bgr.data)
        if (grays.size > maxLen) {
            subtractFrom(graySum, grays.removeFirst().data)
            subtractFrom(bgrSum, bgrs.removeFirst().data)
        }
    }

    fun clear() {
        grays.clear()
        bgrs.clear()
        java.util.Arrays.fill(graySum, 0)
        java.util.Arrays.fill(bgrSum, 0)
    }

    fun meanGray(): GrayImage? =
        if (grays.isEmpty()) {
            null
        } else {
            GrayImage(grays.first().width, grays.first().height, meanOf(graySum, grays.size))
        }

    fun meanBgr(): BgrImage? =
        if (bgrs.isEmpty()) {
            null
        } else {
            BgrImage(bgrs.first().width, bgrs.first().height, meanOf(bgrSum, bgrs.size))
        }

    private fun addTo(
        acc: IntArray,
        data: ByteArray,
    ) {
        for (i in data.indices) acc[i] += data[i].toInt() and BYTE_MASK
    }

    private fun subtractFrom(
        acc: IntArray,
        data: ByteArray,
    ) {
        for (i in data.indices) acc[i] -= data[i].toInt() and BYTE_MASK
    }

    private fun meanOf(
        acc: IntArray,
        n: Int,
    ): ByteArray {
        val out = ByteArray(acc.size)
        for (i in out.indices) out[i] = (acc[i] / n).toByte()
        return out
    }
}
