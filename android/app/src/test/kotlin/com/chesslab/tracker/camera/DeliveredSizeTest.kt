package com.chesslab.tracker.camera

import android.graphics.Rect
import android.media.Image
import androidx.camera.core.ImageInfo
import androidx.camera.core.ImageProxy
import androidx.camera.core.impl.TagBundle
import androidx.camera.core.impl.utils.ExifData
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Test

/**
 * Named regression test for `a7dab73`: the app requested 1280x720, the Xiaomi delivered 4:3
 * 1280x960, the requested numbers were emitted as truth and corners were rescaled with
 * sy = 720/960 (x untouched — the log signature). The warp drifted ~2.3 ranks and the tracker
 * was permanently stuck, deterministically, on every auto-calibration.
 */
class DeliveredSizeTest {
    @Test
    fun deliveredSizeIsReadFromTheImageNeverFromTheRequest() {
        val request = CameraRequest(width = 1280, height = 720)
        val delivered = DeliveredSize.of(FakeImageProxy(width = 1280, height = 960, rotation = 90))

        assertEquals(1280, delivered.width)
        assertEquals(960, delivered.height)
        assertEquals(90, delivered.rotationDegrees)
        assertNotEquals(request.height, delivered.height)
        assertFalse(delivered.toString().contains("720"), "the requested height leaked into the delivered size")
    }

    @Test
    fun requestAndDeliveredAreNeverConflated() {
        // The only public producer of a DeliveredSize takes an ImageProxy; CameraRequest has no
        // path to one. Downshifting changes the WISH and nothing else.
        val downshifted = CameraRequest(width = 3840, height = 2160).downshifted()
        assertEquals(1280, downshifted.width)
        assertEquals(720, downshifted.height)
    }
}

private class FakeImageProxy(
    private val width: Int,
    private val height: Int,
    rotation: Int,
) : ImageProxy {
    private val info = FakeImageInfo(rotation)

    override fun getWidth(): Int = width

    override fun getHeight(): Int = height

    override fun getImageInfo(): ImageInfo = info

    override fun getFormat(): Int = 0x23 // ImageFormat.YUV_420_888, without touching the stub.

    override fun getPlanes(): Array<ImageProxy.PlaneProxy> = emptyArray()

    override fun getImage(): Image? = null

    override fun close() = Unit

    override fun getCropRect(): Rect = throw UnsupportedOperationException()

    override fun setCropRect(rect: Rect?) = throw UnsupportedOperationException()
}

private class FakeImageInfo(
    private val rotation: Int,
) : ImageInfo {
    override fun getRotationDegrees(): Int = rotation

    override fun getTimestamp(): Long = 0L

    override fun getTagBundle(): TagBundle = throw UnsupportedOperationException()

    override fun populateExifData(builder: ExifData.Builder) = throw UnsupportedOperationException()
}
