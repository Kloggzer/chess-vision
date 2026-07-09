package com.chesslab.tracker.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

class CalibrationProfileTest {
    private fun sampleCorners() =
        BoardCorners(
            a8 = Point(100f, 50f),
            h8 = Point(900f, 60f),
            h1 = Point(880f, 900f),
            a1 = Point(120f, 880f),
        )

    private fun sampleProfile(
        w: Int = 1920,
        h: Int = 1080,
    ) = CalibrationProfile(
        corners = sampleCorners(),
        whitePov = true,
        sourceWidth = w,
        sourceHeight = h,
    )

    @Test
    fun `forResolution doubles all coords when resolution doubles`() {
        val profile = sampleProfile(1920, 1080)
        val scaled = profile.forResolution(3840, 2160)

        for ((orig, next) in profile.corners.toList().zip(scaled.corners.toList())) {
            assertEquals(orig.x * 2f, next.x, 1e-4f)
            assertEquals(orig.y * 2f, next.y, 1e-4f)
        }
        assertEquals(3840, scaled.sourceWidth)
        assertEquals(2160, scaled.sourceHeight)
    }

    @Test
    fun `forResolution scales axes independently`() {
        val profile = sampleProfile(1000, 500)
        val scaled = profile.forResolution(2000, 2000)

        val a8 = scaled.corners.a8
        assertEquals(100f * 2f, a8.x, 1e-4f)
        assertEquals(50f * 4f, a8.y, 1e-4f)
    }

    @Test
    fun `default board size is 1024`() {
        assertEquals(1024, sampleProfile().boardSize)
    }

    @Test
    fun `corners round-trip in a8 h8 h1 a1 order`() {
        val list = sampleCorners().toList()
        assertEquals(listOf(Point(100f, 50f), Point(900f, 60f), Point(880f, 900f), Point(120f, 880f)), list)
        assertEquals(sampleCorners(), BoardCorners.of(list))
    }

    @Test
    fun `store saves and loads a profile round-trip`(
        @TempDir dir: File,
    ) {
        val store = CalibrationStore(dir)
        assertNull(store.load("cam0"))

        val profile = sampleProfile()
        store.save("cam0", profile)
        assertEquals(profile, store.load("cam0"))
    }

    @Test
    fun `store isolates profiles per camera id`(
        @TempDir dir: File,
    ) {
        val store = CalibrationStore(dir)
        val p0 = sampleProfile(1920, 1080)
        val p1 = sampleProfile(1280, 720).forResolution(1280, 720)
        store.save("cam0", p0)
        store.save("cam1", p1)

        assertEquals(p0, store.load("cam0"))
        assertEquals(p1, store.load("cam1"))
        assertEquals(true, store.delete("cam0"))
        assertNull(store.load("cam0"))
        assertEquals(p1, store.load("cam1"))
    }
}
