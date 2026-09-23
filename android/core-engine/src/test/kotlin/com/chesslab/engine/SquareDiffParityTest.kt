package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.parity.ParityFixtures
import com.chesslab.engine.parity.assertClose
import com.chesslab.engine.parity.assertCloseMap
import com.chesslab.engine.parity.assertConsumed
import com.chesslab.engine.parity.meanOf
import com.chesslab.engine.parity.toTrackerConfig
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Configs from `meta.effectiveConfig`, never `TRACK_DEFAULTS`. */
class SquareDiffParityTest {
    @Serializable
    private data class GeoRegionSet(
        val boardSize: Int,
        val whitePov: Boolean,
        val extendUp: Double,
        val inset: Double,
        val regions: Map<String, List<Int>>,
        val centers: Map<String, List<Int>>,
    )

    @Serializable
    private data class GeoMeta(
        val squareRegions: List<GeoRegionSet>,
    )

    @Test
    fun squareRegionMatchesPython() {
        val sets = geometry().squareRegions
        assertConsumed(sets, "_geometry/meta.json squareRegions")
        var checked = 0
        for (set in sets) {
            assertEquals(SQUARES, set.regions.size, "region count for $set")
            for (square in Squares.ALL) {
                val expected = set.regions.getValue(square)
                val actual =
                    squareRegion(
                        Squares.index(square),
                        set.boardSize,
                        set.whitePov,
                        inset = set.inset,
                        extendUp = set.extendUp,
                    )
                assertEquals(
                    expected,
                    actual.toList(),
                    "squareRegion($square, ${set.boardSize}, ${set.whitePov}, ${set.extendUp})",
                )
                checked++
            }
            val boxes = squareBoxes(set.boardSize, set.whitePov, set.extendUp)
            for (i in 0 until SQUARES) {
                val expected = set.regions.getValue(Squares.ALL[i])
                assertEquals(
                    expected,
                    listOf(boxes.x0[i], boxes.y0[i], boxes.x1[i], boxes.y1[i]),
                    "squareBoxes[${Squares.ALL[i]}] @ ${set.boardSize}/${set.extendUp}",
                )
            }
        }
        assertEquals(sets.size * SQUARES, checked)
    }

    @Test
    fun squareCenterMatchesPython() {
        var checked = 0
        for (set in geometry().squareRegions) {
            for (square in Squares.ALL) {
                assertEquals(
                    set.centers.getValue(square),
                    squareCenter(square, set.boardSize, set.whitePov).toList(),
                    "squareCenter($square, ${set.boardSize}, ${set.whitePov})",
                )
                checked++
            }
        }
        assertConsumed(checked, "squareCenter comparisons")
    }

    @Test
    fun squareRegionMatchesTheClipNativeFixture() {
        var checked = 0
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            val cfg = clip.meta.effectiveConfig.toTrackerConfig()
            for (frame in clip.tierAFrames()) {
                val regions = frame.tierA?.squareRegion ?: continue
                for ((square, expected) in regions) {
                    assertEquals(
                        expected,
                        squareRegion(Squares.index(square), cfg.detSize, clip.meta.whitePov, extendUp = cfg.overhang).toList(),
                        "$name/${frame.frame}: tierA.squareRegion[$square]",
                    )
                    checked++
                }
            }
        }
        assertConsumed(checked, "tierA.squareRegion comparisons")
    }

    @Test
    fun perSquareDiffMatchesPython() {
        var checked = 0
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            val cfg = clip.meta.effectiveConfig.toTrackerConfig()
            val size = clip.meta.detSize
            assertEquals(cfg.detSize, size, "$name: meta.detSize vs effectiveConfig")
            val boxes = squareBoxes(size, clip.meta.whitePov, cfg.overhang)
            val planes = clip.grayPlanes()
            val out = DoubleArray(SQUARES)
            // `refFrames` is null where `_maybe_patch_anomaly` mutated `ref_gray` in place: not reconstructable.
            for (frame in clip.tierAFrames().filter { it.tierA?.refFrames != null }) {
                val tierA = requireNotNull(frame.tierA)
                val refFrames = requireNotNull(tierA.refFrames)
                val cur = GrayImage(size, size, planes.meanOf(tierA.curFrames))
                val ref = GrayImage(size, size, planes.meanOf(refFrames))
                perSquareDiff(ref, cur, boxes, out)
                assertCloseMap(
                    tierA.perSquareDiff,
                    out.asSquareMap(),
                    "$name/${frame.frame}: perSquareDiff",
                )
                checked++
            }
        }
        assertConsumed(checked, "perSquareDiff frames")
    }

    @Test
    fun normalizeDiffsMatchesPython() {
        var checked = 0
        val raw = DoubleArray(SQUARES)
        val out = DoubleArray(SQUARES)
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            for (frame in clip.tierAFrames()) {
                val tierA = frame.tierA ?: continue
                for (i in 0 until SQUARES) {
                    raw[i] = tierA.perSquareDiff.getValue(Squares.ALL[i])
                }
                val before = raw.copyOf()
                normalizeDiffs(raw, out)
                for (i in 0 until SQUARES) {
                    assertEquals(before[i], raw[i], "$name/${frame.frame}: input mutated")
                    assertClose(
                        tierA.normalizedDiffs.getValue(Squares.ALL[i]),
                        out[i],
                        "$name/${frame.frame}: normalizeDiffs[${Squares.ALL[i]}]",
                    )
                }
                checked++
            }
        }
        assertConsumed(checked, "normalizeDiffs frames")
    }

    private fun geometry(): GeoMeta = json.decodeFromString(ParityFixtures.geometryMeta())

    private companion object {
        const val SQUARES = 64
        val json = Json { ignoreUnknownKeys = true }
    }
}
