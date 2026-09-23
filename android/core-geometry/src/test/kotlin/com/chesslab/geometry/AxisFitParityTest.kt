package com.chesslab.geometry

import com.chesslab.geometry.testutil.GeometryFixtures
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import kotlin.math.abs

/** Derselbe Fall wie `tests/test_axis_fit_parity.py`: `fitAxis` und `alignment._fit_axis` hielt
 *  bis 2026-09-15 nur ein Kommentar zusammen, jede Seite gegen ihre eigene synthetische Wahrheit. */
class AxisFitParityTest {
    @Test
    fun `every shared case fits the same lines as Python`() {
        val cases = GeometryFixtures.list(GeometryFixtures.map(meta())["cases"])
        assertEquals(4, cases.size, "die Fixture ist geschrumpft")
        for (raw in cases) {
            val case = GeometryFixtures.map(raw)
            val name = case["name"].toString()
            val samples =
                GeometryFixtures.list(case["samples"]).map { row ->
                    val v = GeometryFixtures.list(row)
                    doubleArrayOf(GeometryFixtures.num(v[0]), GeometryFixtures.num(v[1]), GeometryFixtures.num(v[2]))
                }

            val got = fitAxis(samples, GeometryFixtures.num(case["centre"]))

            val expect = GeometryFixtures.map(case["expect"])
            assertEquals(expect.keys.map { it.toInt() }.sorted(), got.keys.sorted(), "$name: andere Linien ueberlebt")
            for ((k, v) in expect) {
                val want = GeometryFixtures.list(v)
                val line = got.getValue(k.toInt())
                assertClose(name, "slope k=$k", GeometryFixtures.num(want[0]), line.slope)
                assertClose(name, "intercept k=$k", GeometryFixtures.num(want[1]), line.offset)
            }
        }
    }

    private fun meta(): Any? = GeometryFixtures.jsonObject("_geometry/axis_fit.json")

    private fun assertClose(
        case: String,
        what: String,
        expected: Double,
        actual: Double,
    ) {
        val tol = 1e-6 * maxOf(1.0, abs(expected))
        assert(abs(expected - actual) <= tol) { "$case / $what: erwartet $expected, gerechnet $actual" }
    }
}
