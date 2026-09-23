package com.chesslab.tracker.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Test

class MeasuredGeometryTest {
    private val corners = floatArrayOf(9f, 9f, 90f, 9f, 90f, 90f, 9f, 90f)

    @Test
    fun equalContentIsEqualAndHashesAlike() {
        val a = MeasuredGeometry(corners.copyOf(), 1920, 1080)
        val b = MeasuredGeometry(corners.copyOf(), 1920, 1080)
        assertEquals(a, b)
        assertEquals(a.hashCode(), b.hashCode())
    }

    @Test
    fun cornersAndSourceSizeEachDistinguish() {
        val base = MeasuredGeometry(corners.copyOf(), 1920, 1080)
        assertNotEquals(base, MeasuredGeometry(corners.copyOf().also { it[0] = 10f }, 1920, 1080))
        assertNotEquals(base, MeasuredGeometry(corners.copyOf(), 1280, 1080))
        assertNotEquals(base, MeasuredGeometry(corners.copyOf(), 1920, 720))
    }

    @Test
    fun carryOverTakesCornersAndSourceSizeFromTheMeasurement() {
        val next = carryOver(null, MeasuredGeometry(corners, 1920, 1080))
        assertEquals(1920, next.sourceWidth)
        assertEquals(1080, next.sourceHeight)
        assertEquals(corners.toList(), next.corners.toList())
    }
}
