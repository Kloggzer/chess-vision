package com.chesslab.engine

import com.chesslab.engine.parity.ParityFixtures
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** The one Kotlin copy of `tracker.py square_region`, pinned to the file Python reads too. */
class SquareRegionParityTest {
    private val cases =
        Json
            .parseToJsonElement(ParityFixtures.resourceText("/parity/_geometry/square_geometry_parity.json"))
            .jsonObject["cases"]!!
            .jsonArray
            .map { it.jsonObject }

    @Test
    fun `regions and centres match the shared fixture`() {
        assertTrue(cases.size >= 100, "fixture shrank: ${cases.size}")
        for (case in cases) {
            val square = case["square"]!!.jsonPrimitive.content
            val bs = case["boardSize"]!!.jsonPrimitive.int
            val pov = case["whitePov"]!!.jsonPrimitive.content.toBoolean()
            val where = "$square@$bs/pov=$pov"
            val ints = { key: String -> case[key]!!.jsonArray.map { it.jsonPrimitive.int } }
            assertEquals(ints("region"), squareRegion(Squares.index(square), bs, pov).toList(), where)
            assertEquals(
                ints("regionExtendUp25"),
                squareRegion(Squares.index(square), bs, pov, extendUp = 0.25).toList(),
                "extendUp $where",
            )
            assertEquals(ints("center"), squareCenter(square, bs, pov).toList(), "centre $where")
            val packed = Squares.colRow(square, pov)
            assertEquals(case["col"]!!.jsonPrimitive.int, Squares.colOf(packed), "col $where")
            assertEquals(case["row"]!!.jsonPrimitive.int, Squares.rowOf(packed), "row $where")
        }
    }
}
