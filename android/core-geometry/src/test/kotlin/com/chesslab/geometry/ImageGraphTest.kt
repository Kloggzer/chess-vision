package com.chesslab.geometry

import com.chesslab.geometry.testutil.SyntheticBoard
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import org.opencv.core.Core
import org.opencv.core.Mat

/**
 * Die Knotenschicht: gleicher Praefix heisst eine Rechnung, und der Pool waechst nicht.
 *
 * Die zwei Zusagen, an denen alles Weitere haengt — ohne sie ist ein Cache entweder falsch oder
 * teurer als das, was er spart.
 */
@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")
class ImageGraphTest {
    private val geom = BoardGeometry(boardSize = 640, padSide = 0.10)

    private fun <T> scope(
        pool: MatPool,
        seq: Long = 1L,
        body: (FrameScope) -> T,
    ): T {
        val frame = SyntheticBoard.frame()
        return FrameScope(frame, geom, SyntheticBoard.CORNERS, seq, pool).use(body)
    }

    @Test
    fun `a shared prefix is computed once`() {
        val warp = BoardWarpNode(320)
        val gray = ToGrayNode(warp)
        val blurred = BlurNode(ClaheNode(gray, clip = 2.0))
        MatPool().use { pool ->
            scope(pool) { s ->
                // Genau der Doppelgaenger aus dem Ist-Zustand: `lumaPreClahe` und die Graustufe
                // vor CLAHE sind derselbe Knoten.
                assertSame(s.get(gray), s.get(gray))
                s.get(blurred)
                // warp + gray + clahe + blur, und der Warp NICHT zweimal.
                assertEquals(4, s.computed)
            }
        }
    }

    @Test
    fun `two nodes with the same parameters share one entry`() {
        val warp = BoardWarpNode(320)
        MatPool().use { pool ->
            scope(pool) { s ->
                assertSame(s.get(ToGrayNode(warp)), s.get(ToGrayNode(warp)))
                assertEquals(2, s.computed)
            }
        }
    }

    @Test
    fun `different parameters do not collide`() {
        val warp = BoardWarpNode(320)
        assertNotEquals(ClaheNode(warp, 2.0).key, ClaheNode(warp, 4.0).key)
        assertNotEquals(BlurNode(warp, 5).key, BlurNode(warp, 3).key)
        assertNotEquals(BoardWarpNode(320).key, BoardWarpNode(160).key)
        assertNotEquals(ToGrayNode(warp).key, BlurNode(warp).key)
    }

    @Test
    fun `the pool stops allocating after the first frame`() {
        val warp = BoardWarpNode(320)
        val chain = BlurNode(ClaheNode(ToGrayNode(warp), clip = 2.0))
        MatPool().use { pool ->
            scope(pool, seq = 1L) { it.get(chain) }
            val afterWarmup = pool.allocated
            assertTrue(afterWarmup > 0, "der erste Frame muss Puffer anlegen")
            for (seq in 2L..8L) scope(pool, seq) { it.get(chain) }
            assertEquals(afterWarmup, pool.allocated, "spaetere Frames duerfen nichts nachlegen")
        }
    }

    @Test
    fun `the scope hands every buffer back`() {
        val chain = ToGrayNode(BoardWarpNode(320))
        MatPool().use { pool ->
            val borrowed = mutableListOf<Mat>()
            scope(pool) { s -> borrowed += s.get(chain) }
            // Zurueckgegebene Puffer sind wieder ausleihbar, also nicht verloren.
            val reused = pool.borrow(MatShape(borrowed[0].rows(), borrowed[0].cols(), borrowed[0].type()))
            assertSame(borrowed[0], reused)
        }
    }

    @Test
    fun `the chain produces the same pixels as the hand written stage`() {
        val warp = BoardWarpNode(320)
        val chain = BlurNode(ClaheNode(ToGrayNode(warp), clip = 2.0))
        MatPool().use { pool ->
            val frame = SyntheticBoard.frame()
            val viaStage =
                GrayPipeline(claheClip = 2.0).use { gp ->
                    gp.toGray(warpFromCorners(frame, geom, SyntheticBoard.CORNERS, 320))
                }
            FrameScope(frame, geom, SyntheticBoard.CORNERS, 1L, pool).use { s ->
                val diff = Mat()
                Core.absdiff(viaStage, s.get(chain), diff)
                assertEquals(0.0, Core.norm(diff), "die Kette muss bitgleich zur Stage sein")
            }
        }
    }
}
