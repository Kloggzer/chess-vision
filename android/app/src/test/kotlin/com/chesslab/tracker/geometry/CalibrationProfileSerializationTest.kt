package com.chesslab.tracker.geometry

import com.chesslab.geometry.margins4
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class CalibrationProfileSerializationTest {
    private val corners = floatArrayOf(10f, 11f, 20f, 21f, 30f, 31f, 40f, 41f)

    private fun profile() =
        CalibrationProfile(
            name = "default",
            boardSize = 1600,
            margin = margins4(0.06),
            markerDict = "DICT_4X4_50",
            whitePov = false,
            sourceWidth = 1280,
            sourceHeight = 960,
            corners = corners,
            crop = CropParams(outW = 96, outH = 96, padSide = 0.12),
            savedAtMs = 123456L,
        )

    @Test
    fun roundTripsAllFieldsIncludingCornerOrder() {
        val decoded = decodeProfile(encodeProfile(profile()))
        assertTrue(decoded is ProfileLoad.Ok)
        val p = (decoded as ProfileLoad.Ok).profile
        assertEquals(profile(), p)
        // [a8, h8, h1, a1] — order, not just content. Sorting these transposes the board.
        assertArrayEquals(corners, p.corners, 0f)
        assertEquals(10f, p.corners[0])
        assertEquals(41f, p.corners[7])
        assertEquals(false, p.whitePov)
    }

    @Test
    fun rejectsAnUnknownSchemaVersionInsteadOfMigrating() {
        val bumped = encodeProfile(profile()).replace("\"version\":$PROFILE_SCHEMA_VERSION", "\"version\":99")
        val decoded = decodeProfile(bumped)
        assertTrue(decoded is ProfileLoad.Discarded, "expected Discarded, got $decoded")
        assertTrue((decoded as ProfileLoad.Discarded).reason.contains("v99"))
    }

    @Test
    fun rejectsACornersArrayThatIsNot8Floats() {
        val short = encodeProfile(profile()).replace("[10.0,11.0,20.0,21.0,30.0,31.0,40.0,41.0]", "[1.0,2.0]")
        assertTrue(decodeProfile(short) is ProfileLoad.Discarded)
    }

    @Test
    fun anAbsentProfileIsAbsentNotDiscarded() {
        assertEquals(ProfileLoad.Absent, decodeProfile(null))
        assertEquals(ProfileLoad.Absent, decodeProfile("  "))
    }
}
