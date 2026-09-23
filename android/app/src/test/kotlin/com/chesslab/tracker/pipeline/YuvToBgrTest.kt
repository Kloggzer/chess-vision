package com.chesslab.tracker.pipeline

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Test
import java.nio.ByteBuffer

private const val FLAT_CHROMA: Byte = -128

/** `cvtColor` is Android-only here. Fixture: strided planes and their NV21 packing, both from numpy. */
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
        assertEquals(w * h + w * h / 2, packed.size)
        assertEquals(0.toByte(), packed[0])
        assertEquals((w * h - 1).toByte(), packed[w * h - 1])
        assertEquals(100.toByte(), packed[w * h])
        assertEquals(0.toByte(), packed[w * h + 1])
    }

    @Test
    fun `a shared chroma buffer is recognised in both interleavings`() {
        assertEquals(ChromaOrder.NV21, chromaOrder(semiPlanar(vFirst = true)))
        assertEquals(ChromaOrder.NV12, chromaOrder(semiPlanar(vFirst = false)))
    }

    @Test
    fun `anything the two-plane path cannot read as it lies falls back to packing`() {
        assertNull(chromaOrder(semiPlanar(vFirst = true, pixelStride = 1)), "truly planar chroma")
        assertNull(chromaOrder(semiPlanar(vFirst = true, direct = false)), "a heap buffer has no address")
        assertNull(chromaOrder(semiPlanar(vFirst = true, flat = true)), "flat chroma fits both orders")
        assertNull(chromaOrder(separateChromaBuffers()), "two unrelated buffers")
        assertNull(chromaOrder(fixturePlanes()), "the wrapped fixture is not a direct buffer")
    }

    private fun semiPlanar(
        vFirst: Boolean,
        pixelStride: Int = 2,
        direct: Boolean = true,
        flat: Boolean = false,
    ): YuvPlanes {
        val size = width * height / 2
        val shared = allocate(size + 1, direct)
        for (i in 0..size) shared.put(i, if (flat) FLAT_CHROMA else (i * 53 + 7).toByte())

        fun view(offset: Int): ByteBuffer {
            val duplicate = shared.duplicate()
            duplicate.position(offset)
            return duplicate.slice()
        }
        val first = YuvPlane(view(0), width, pixelStride)
        val second = YuvPlane(view(1), width, pixelStride)
        val luma = YuvPlane(allocate(width * height, direct), width, 1)
        return if (vFirst) YuvPlanes(luma, second, first) else YuvPlanes(luma, first, second)
    }

    private fun separateChromaBuffers(): YuvPlanes {
        val size = width * height / 4

        fun plane(): YuvPlane {
            val buffer = allocate(size, true)
            for (i in 0 until size) buffer.put(i, (i * 31).toByte())
            return YuvPlane(buffer, width, 2)
        }
        return YuvPlanes(YuvPlane(allocate(width * height, true), width, 1), plane(), plane())
    }

    private fun allocate(
        size: Int,
        direct: Boolean,
    ): ByteBuffer = if (direct) ByteBuffer.allocateDirect(size) else ByteBuffer.allocate(size)

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
