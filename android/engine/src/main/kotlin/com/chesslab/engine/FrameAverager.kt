package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage

/**
 * Moving average over the last N stable frames (gray + color kept aligned), the
 * denoising step of tracker.py's `_RunningMean` buffers. Exact mean over the small
 * window instead of an incremental sum (identical result, no drift bookkeeping).
 */
internal class FrameAverager(
    private val maxLen: Int,
) {
    private val grays = ArrayDeque<GrayImage>()
    private val bgrs = ArrayDeque<BgrImage>()

    val size: Int get() = grays.size

    fun append(
        gray: GrayImage,
        bgr: BgrImage,
    ) {
        grays.addLast(gray)
        bgrs.addLast(bgr)
        if (grays.size > maxLen) {
            grays.removeFirst()
            bgrs.removeFirst()
        }
    }

    fun clear() {
        grays.clear()
        bgrs.clear()
    }

    fun meanGray(): GrayImage? =
        mean(grays.map { it.data })?.let {
            GrayImage(grays.first().width, grays.first().height, it)
        }

    fun meanBgr(): BgrImage? =
        mean(bgrs.map { it.data })?.let {
            BgrImage(bgrs.first().width, bgrs.first().height, it)
        }

    private fun mean(buffers: List<ByteArray>): ByteArray? {
        if (buffers.isEmpty()) return null
        val out = ByteArray(buffers.first().size)
        for (i in out.indices) {
            var s = 0
            for (b in buffers) s += b[i].px()
            out[i] = (s / buffers.size).toByte()
        }
        return out
    }
}
