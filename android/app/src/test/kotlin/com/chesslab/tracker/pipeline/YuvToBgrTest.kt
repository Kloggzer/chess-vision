package com.chesslab.tracker.pipeline

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Test
import java.nio.ByteBuffer

/**
 * The NV21 packing — the part of the YUV path this module owns. `cvtColor(COLOR_YUV2BGR_NV21)`
 * itself is OpenCV's and cannot run here: `:app`'s unit-test classpath has the OpenCV **AAR**,
 * whose natives are Android-only (STATUS D05b-2).
 *
 * Fixture: `pipeline/yuv420_64x48.bin` = the three strided plane buffers back to back
 * (Y `rowStride 80`, U/V `rowStride 64` at `pixelStride 2`, i.e. the semi-planar layout CameraX
 * delivers on most devices), `pipeline/yuv420_64x48_expected_nv21.bin` = the expected packing.
 * Both were generated with numpy from `(i * 37) % 256` / `(i * 91 + 17) % 256` /
 * `(i * 53 + 201) % 256` — deterministic and independent of this implementation.
 */
class YuvToBgrTest {
    private val width = 64
    private val height = 48
    private val yStride = 80
    private val cStride = 64

    @Test
    fun `packs the fixture into the expected nv21 buffer`() {
        val actual = YuvToBgr().pack(fixturePlanes(), width, height)
        assertArrayEquals(resource("pipeline/yuv420_64x48_expected_nv21.bin"), actual)
    }

    @Test
    fun `handles a row stride greater than the width`() {
        // The fixture's luma stride is 80 for a 64 px row: the 16 padding bytes must be dropped.
        val planes = fixturePlanes()
        val packed = YuvToBgr().pack(planes, width, height)
        val raw = resource("pipeline/yuv420_64x48.bin")
        for (row in 0 until height) {
            for (x in 0 until width) {
                assertEquals(raw[row * yStride + x], packed[row * width + x], "luma at ($x, $row)")
            }
        }
    }

    @Test
    fun `reuses its buffer across frames`() {
        val converter = YuvToBgr()
        val first = converter.pack(fixturePlanes(), width, height)
        repeat(100) { assertSame(first, converter.pack(fixturePlanes(), width, height)) }
        assertEquals(1, converter.allocations)
    }

    @Test
    fun `reallocates on a size change`() {
        val converter = YuvToBgr()
        converter.pack(fixturePlanes(), width, height)
        converter.pack(densePlanes(32, 16), 32, 16)
        assertEquals(2, converter.allocations)
    }

    @Test
    fun `packs a dense plane set without padding`() {
        val w = 4
        val h = 4
        val packed = YuvToBgr().pack(densePlanes(w, h), w, h)
        // luma 0,1,2,... then V,U alternating from the two dense chroma planes.
        assertEquals(w * h + w * h / 2, packed.size)
        assertEquals(0.toByte(), packed[0])
        assertEquals((w * h - 1).toByte(), packed[w * h - 1])
        assertEquals(100.toByte(), packed[w * h])
        assertEquals(0.toByte(), packed[w * h + 1])
    }

    private fun fixturePlanes(): YuvPlanes {
        val raw = resource("pipeline/yuv420_64x48.bin")
        val ySize = yStride * height
        val cSize = cStride * (height / 2)

        fun slice(
            from: Int,
            size: Int,
        ) = ByteBuffer.wrap(raw.copyOfRange(from, from + size))
        return YuvPlanes(
            YuvPlane(slice(0, ySize), yStride, 1),
            YuvPlane(slice(ySize, cSize), cStride, 2),
            YuvPlane(slice(ySize + cSize, cSize), cStride, 2),
        )
    }

    /** Dense (`rowStride == width`, `pixelStride == 1`) planes: luma `0,1,2,…`, U `0`, V `100`. */
    private fun densePlanes(
        w: Int,
        h: Int,
    ): YuvPlanes {
        val luma = ByteArray(w * h) { it.toByte() }
        val u = ByteArray(w * h / 4)
        val v = ByteArray(w * h / 4) { 100.toByte() }
        return YuvPlanes(
            YuvPlane(ByteBuffer.wrap(luma), w, 1),
            YuvPlane(ByteBuffer.wrap(u), w / 2, 1),
            YuvPlane(ByteBuffer.wrap(v), w / 2, 1),
        )
    }

    private fun resource(path: String): ByteArray =
        checkNotNull(javaClass.getResourceAsStream("/$path")) { "missing fixture $path" }.use { it.readBytes() }
}
