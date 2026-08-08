package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test

/** The depth-1 hand-off drops by OVERWRITE — since 2026-08-08 it also counts what it dropped. */
class CropFrameStoreTest {
    @Test
    fun anOverwrittenPendingWarpIsCounted() {
        val store = CropFrameStore()
        store.update(pending(1))
        store.update(pending(2))
        assertEquals(1L, store.overwritten)
        val taken = requireNotNull(store.take())
        assertEquals(2L, taken.seq, "newest wins — the displaced one is the OLDER warp")
        taken.cropWarp.release()
        assertEquals(1L, store.overwritten, "a take is a hand-off, never a drop")
        store.close()
    }

    private fun pending(seq: Long) =
        CropFrameStore.Pending(
            cropWarp = org.opencv.core.Mat(4, 4, org.opencv.core.CvType.CV_8UC3),
            seq = seq,
            tsMs = seq,
            bgrDet = BgrImage(1, 1, ByteArray(3)),
            grayDet = GrayImage(1, 1, ByteArray(1)),
        )

    companion object {
        @JvmStatic
        @BeforeAll
        fun loadOpenCv() {
            Loader.load(opencv_java::class.java)
        }
    }
}
