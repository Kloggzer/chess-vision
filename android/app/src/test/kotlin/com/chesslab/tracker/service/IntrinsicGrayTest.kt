package com.chesslab.tracker.service

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.double
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.Test
import java.io.File
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Parity + behaviour tests for [IntrinsicGray] against the committed golden
 * contract `tests/data/intrinsic_golden.json` (specs/14). Pure JVM — the core
 * math runs on ByteArray, no native OpenCV needed.
 */
class IntrinsicGrayTest {
    /** Regenerate the 16x16 BGR input from the golden formula (channel_order: BGR). */
    private fun goldenInput(size: Int): ByteArray {
        val buf = ByteArray(size * size * 3)
        var i = 0
        for (y in 0 until size) {
            for (x in 0 until size) {
                buf[i++] = ((x * 23 + y * 7) % 251).toByte() // blue
                buf[i++] = ((x * 17 + y * 29) % 251).toByte() // green
                buf[i++] = ((x * 37 + y * 11) % 251).toByte() // red
            }
        }
        return buf
    }

    private fun findGoldenFile(): File? {
        var dir: File? = File(System.getProperty("user.dir") ?: ".").absoluteFile
        repeat(6) {
            val candidate = File(dir, "tests/data/intrinsic_golden.json")
            if (candidate.exists()) return candidate
            dir = dir?.parentFile
        }
        return null
    }

    @Test
    fun `golden parity within one u8 level`() {
        val golden = findGoldenFile()
        assumeTrue(golden != null, "tests/data/intrinsic_golden.json not found — skipping parity")
        val root = Json.parseToJsonElement(golden!!.readText()).jsonObject
        assertTrue(
            root["channel_order"]!!.jsonPrimitive.content.startsWith("BGR"),
            "golden JSON channel order changed — update goldenInput()",
        )
        val calib = root["calibration"]!!.jsonObject
        val transform =
            IntrinsicGray(
                angleDeg = calib["angle_deg"]!!.jsonPrimitive.double,
                lo = calib["lo"]!!.jsonPrimitive.double,
                hi = calib["hi"]!!.jsonPrimitive.double,
            )
        val expected = root["expected_u8"]!!.jsonArray.map { row -> row.jsonArray.map { it.jsonPrimitive.int } }
        val size = expected.size
        val actual = transform.apply(goldenInput(size), size, size)
        for (y in 0 until size) {
            for (x in 0 until size) {
                val got = actual[y * size + x].toInt() and 0xFF
                val want = expected[y][x]
                assertTrue(abs(got - want) <= 1, "pixel ($x,$y): expected $want, got $got")
            }
        }
    }

    /**
     * calibrate() must recover the invariant direction: synthesize chi points as
     * material clusters spread along a KNOWN lighting direction phi, back-project
     * to BGR, and assert theta* is within 3 deg of the analytic optimum
     * (phi + 90 mod 180 — the projection orthogonal to the lighting line).
     *
     * NOTE (recorded in specs/14 STATUS.md): phase 01 suggested asserting the
     * golden JSON's angle, but that angle (57 deg) is an arbitrary fixed constant
     * per phase 00, not the entropy minimum of the formula image — this test
     * ports the Python-phase test 2 design instead.
     */
    @Test
    fun `calibrate recovers known lighting direction within 3 degrees`() {
        val size = 64
        val phiDeg = 40.0
        val expectedTheta = (phiDeg + 90.0) % 180.0
        val ex = cos(Math.toRadians(phiDeg))
        val ey = sin(Math.toRadians(phiDeg))
        val materials =
            listOf(
                doubleArrayOf(-0.30, -0.20),
                doubleArrayOf(0.20, 0.10),
                doubleArrayOf(0.05, -0.35),
                doubleArrayOf(-0.10, 0.30),
            )
        val invSqrt2 = 1.0 / sqrt(2.0)
        val invSqrt6 = 1.0 / sqrt(6.0)
        val brightness = 80.0
        val buf = ByteArray(size * size * 3)
        var i = 0
        for (y in 0 until size) {
            for (x in 0 until size) {
                val m = materials[(x + y) % materials.size]
                val t = ((x * 13 + y * 7) % 101) / 100.0 - 0.5 // deterministic shading sweep
                val chi1 = m[0] + t * ex
                val chi2 = m[1] + t * ey
                // Back-project chi -> r (3-vector summing to 0) -> channels.
                val rR = chi1 * invSqrt2 + chi2 * invSqrt6
                val rG = -chi1 * invSqrt2 + chi2 * invSqrt6
                val rB = -2.0 * chi2 * invSqrt6
                buf[i++] = min(255, (brightness * exp(rB)).roundToInt().coerceAtLeast(1)).toByte()
                buf[i++] = min(255, (brightness * exp(rG)).roundToInt().coerceAtLeast(1)).toByte()
                buf[i++] = min(255, (brightness * exp(rR)).roundToInt().coerceAtLeast(1)).toByte()
            }
        }
        val calib = IntrinsicGray.calibrate(buf, size, size)
        val diff = abs(calib.angleDeg - expectedTheta)
        val circular = min(diff, 180.0 - diff)
        assertTrue(circular <= 3.0, "expected theta ~$expectedTheta, got ${calib.angleDeg}")
        assertTrue(calib.hi > calib.lo, "hi must exceed lo")
    }

    @Test
    fun `uniform shadow vanishes while material change stays`() {
        val size = 32
        val transform = IntrinsicGray(angleDeg = 57.0, lo = -0.35, hi = 0.42)

        // Even-valued bright texture so a 0.5x "shadow" is an exact integer scale.
        fun base(): ByteArray {
            val buf = ByteArray(size * size * 3)
            var i = 0
            for (y in 0 until size) {
                for (x in 0 until size) {
                    buf[i++] = (2 * (60 + (x * 23 + y * 7) % 67)).toByte()
                    buf[i++] = (2 * (60 + (x * 17 + y * 29) % 67)).toByte()
                    buf[i++] = (2 * (60 + (x * 37 + y * 11) % 67)).toByte()
                }
            }
            return buf
        }

        val reference = transform.apply(base(), size, size)

        // Shadow: multiply the top half by 0.5 (Planckian approx: equal scale on all channels).
        val shadowed = base()
        for (p in 0 until size * size / 2 * 3) {
            shadowed[p] = ((shadowed[p].toInt() and 0xFF) / 2).toByte()
        }
        val shadowOut = transform.apply(shadowed, size, size)
        var shadowDelta = 0.0
        val half = size * size / 2
        for (p in 0 until half) {
            shadowDelta += abs((shadowOut[p].toInt() and 0xFF) - (reference[p].toInt() and 0xFF))
        }
        assertTrue(shadowDelta / half < 3.0, "shadow region moved ${shadowDelta / half} u8 (want < 3)")

        // Material change: swap R and B in the top half — must move the invariant image.
        val swapped = base()
        for (p in 0 until half) {
            val b = swapped[p * 3]
            swapped[p * 3] = swapped[p * 3 + 2]
            swapped[p * 3 + 2] = b
        }
        val swapOut = transform.apply(swapped, size, size)
        var swapDelta = 0.0
        for (p in 0 until half) {
            swapDelta += abs((swapOut[p].toInt() and 0xFF) - (reference[p].toInt() and 0xFF))
        }
        assertTrue(swapDelta / half > 25.0, "material change only moved ${swapDelta / half} u8 (want > 25)")
    }

    @Test
    fun `same frame twice yields identical output`() {
        val size = 16
        val transform = IntrinsicGray(angleDeg = 57.0, lo = -0.35, hi = 0.42)
        val a = transform.apply(goldenInput(size), size, size)
        val b = transform.apply(goldenInput(size), size, size)
        assertEquals(a.toList(), b.toList())
    }
}
