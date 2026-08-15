package com.chesslab.desktop

import com.chesslab.geometry.margins4
import com.chesslab.tracker.geometry.boardGeometryFor
import com.chesslab.tracker.geometry.measuredBoardSize
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Scalar
import org.opencv.core.Size
import org.opencv.imgcodecs.Imgcodecs
import org.opencv.imgproc.Imgproc
import java.io.File

/**
 * `quad-fit.json` decides which quad a stored session is packed with. The fixture's logged quad is
 * deliberately off, so preferring the sidecar shows in the packed BYTES and not only in the counts.
 */
class LabeledSessionPackTest {
    @TempDir
    lateinit var dir: File

    @Test
    fun `the sidecar's field quad is preferred and counted per packed frame`() {
        val session = session(fitted = listOf("0000", "0001"))
        val out = File(dir, "fitted")

        packLabeledSession(listOf(session.absolutePath, out.absolutePath, "id=phone-fixture"))

        val meta = meta(out)
        assertEquals("grid-fit", meta.getValue("quad_source").jsonPrimitive.content)
        assertEquals(2, meta.getValue("fitted_frames").jsonPrimitive.int)
        assertEquals(0, meta.getValue("marker_frames").jsonPrimitive.int)
        assertEquals(2, meta.getValue("accepted_frames").jsonPrimitive.int)
    }

    /** No file: exactly the pack that ran before the fit existed, and other pixels for it. */
    @Test
    fun `without the sidecar the logged marker quad still cuts the crops`() {
        val session = session(fitted = listOf("0000", "0001"))
        val fitted = File(dir, "fitted")
        packLabeledSession(listOf(session.absolutePath, fitted.absolutePath, "id=phone-fixture"))
        File(session, "quad-fit.json").delete()
        val marker = File(dir, "marker")

        packLabeledSession(listOf(session.absolutePath, marker.absolutePath, "id=phone-fixture"))

        val meta = meta(marker)
        assertEquals("marker", meta.getValue("quad_source").jsonPrimitive.content)
        assertEquals(0, meta.getValue("fitted_frames").jsonPrimitive.int)
        assertEquals(2, meta.getValue("marker_frames").jsonPrimitive.int)
        assertFalse(
            File(fitted, "packed_images.u8").readBytes().contentEquals(File(marker, "packed_images.u8").readBytes()),
            "the two quads must not produce the same crops, or the fixture proves nothing",
        )
    }

    /** A frame the fit gave up on is absent from `frames`, and falls back on its own. */
    @Test
    fun `a session the fit only partly covered is packed both ways`() {
        val session = session(fitted = listOf("0000"))
        val out = File(dir, "mixed")

        packLabeledSession(listOf(session.absolutePath, out.absolutePath, "id=phone-fixture"))

        val meta = meta(out)
        assertEquals("grid-fit", meta.getValue("quad_source").jsonPrimitive.content)
        assertEquals(1, meta.getValue("fitted_frames").jsonPrimitive.int)
        assertEquals(1, meta.getValue("marker_frames").jsonPrimitive.int)
    }

    @Test
    fun `a fitted quad is warped at the file's margin, an unfitted one at the marker outset`() {
        val session = session(fitted = listOf("0000"))
        val fit = storedQuadFit(session)

        val fitted = fit.getValue("0000")
        assertArrayEquals(FIELD, fitted.corners)
        assertEquals(
            margins4(0.0),
            storedGeometry(fitted, fitted.corners).margin,
            "the sidecar's corners ARE the playing field",
        )
        assertEquals(measuredBoardSize(FIELD), storedGeometry(fitted, fitted.corners).boardSize)
        assertEquals(boardGeometryFor(MARKER), storedGeometry(fit["0001"], MARKER))
        assertEquals(emptyMap<String, FittedQuad>(), storedQuadFit(File(dir, "nowhere")))
    }

    /** The mesh cut must show in the BYTES, not only in the count — else the wire is decorative. */
    @Test
    fun `grid lines in the sidecar move the packed bytes and are counted`() {
        val quadOut = File(dir, "quad")
        packLabeledSession(listOf(session(fitted = listOf("0000", "0001")).absolutePath, quadOut.absolutePath, "id=phone-fixture"))
        val meshed = session(fitted = listOf("0000", "0001"), mesh = MESH)
        val meshOut = File(dir, "mesh")

        packLabeledSession(listOf(meshed.absolutePath, meshOut.absolutePath, "id=phone-fixture"))

        assertEquals(0, meta(quadOut).getValue("mesh_frames").jsonPrimitive.int)
        assertEquals(2, meta(meshOut).getValue("mesh_frames").jsonPrimitive.int)
        assertFalse(
            File(quadOut, "packed_images.u8").readBytes().contentEquals(File(meshOut, "packed_images.u8").readBytes()),
            "a shifted mesh must cut other pixels than the nominal grid, or the fixture proves nothing",
        )
    }

    @Test
    fun `a malformed grid_lines entry reads as no mesh, never as an error`() {
        val session = session(fitted = listOf("0000"))
        val bad =
            listOf(
                """{"x":[0,1],"y":[0,1]}""",
                """{"x":[0,null,0.25,0.375,0.5,0.625,0.75,0.875,1],"y":$NOMINAL}""",
                """{"x":[0,"kaputt",0.25,0.375,0.5,0.625,0.75,0.875,1],"y":$NOMINAL}""",
                """{"x":[0,"0.125",0.25,0.375,0.5,0.625,0.75,0.875,1],"y":$NOMINAL}""",
                """{"x":[0,0.25,0.125,0.375,0.5,0.625,0.75,0.875,1],"y":$NOMINAL}""",
            )
        for (mesh in bad) {
            writeFit(session, mesh)
            assertEquals(null, storedQuadFit(session).getValue("0000").mesh, mesh)
        }
        val out = File(dir, "bad-mesh-pack")

        packLabeledSession(listOf(session.absolutePath, out.absolutePath, "id=phone-fixture"))

        assertEquals(0, meta(out).getValue("mesh_frames").jsonPrimitive.int)
        assertEquals(1, meta(out).getValue("fitted_frames").jsonPrimitive.int)
    }

    /** Malformed tilts drop exactly ONE stage: the offsets survive, no half axis pair ever does. */
    @Test
    fun `malformed tilts fall back to the scalar mesh, valid ones ride along`() {
        val session = session(fitted = listOf("0000"))
        val scalarOnly =
            listOf(
                """{"x":$NOMINAL,"y":$NOMINAL,"tx":[0,0,0,0,0,0,0,0],"ty":$ZEROS}""",
                """{"x":$NOMINAL,"y":$NOMINAL,"tx":[0,0,0,0.06,0,0,0,0,0],"ty":$ZEROS}""",
                """{"x":$NOMINAL,"y":$NOMINAL,"tx":[0,0,0,"kaputt",0,0,0,0,0],"ty":$ZEROS}""",
                """{"x":$NOMINAL,"y":$NOMINAL,"tx":[0,"0.01",0,0,0,0,0,0,0],"ty":$ZEROS}""",
                """{"x":$NOMINAL,"y":$NOMINAL,"tx":$ZEROS}""",
            )
        for (mesh in scalarOnly) {
            writeFit(session, mesh)
            val got = storedQuadFit(session).getValue("0000").mesh
            assertNotNull(got, mesh)
            assertEquals(null, got?.tx, mesh)
        }
        writeFit(session, """{"x":$NOMINAL,"y":$NOMINAL,"tx":$ZEROS,"ty":$ZEROS}""")
        assertNotNull(storedQuadFit(session).getValue("0000").mesh?.tx)
    }

    /** Same ladder one rung up: a bad curvature pair costs the curved stage, never the tilts. */
    @Test
    fun `malformed curvature falls back to the linear mesh, valid pairs ride along`() {
        val session = session(fitted = listOf("0000"))
        val tilted = """"tx":$ZEROS,"ty":$ZEROS"""
        val linearOnly =
            listOf(
                """{"x":$NOMINAL,"y":$NOMINAL,$tilted,"cx":[0,0,0,0,0,0,0,0],"cy":$ZEROS}""",
                """{"x":$NOMINAL,"y":$NOMINAL,$tilted,"cx":[0,0,0,0.08,0,0,0,0,0],"cy":$ZEROS}""",
                """{"x":$NOMINAL,"y":$NOMINAL,$tilted,"cx":[0,0,0,"kaputt",0,0,0,0,0],"cy":$ZEROS}""",
                """{"x":$NOMINAL,"y":$NOMINAL,$tilted,"cx":$ZEROS}""",
            )
        for (mesh in linearOnly) {
            writeFit(session, mesh)
            val got = storedQuadFit(session).getValue("0000").mesh
            assertNotNull(got?.tx, mesh)
            assertEquals(null, got?.cx, mesh)
        }
        writeFit(session, """{"x":$NOMINAL,"y":$NOMINAL,$tilted,"cx":$ZEROS,"cy":$ZEROS}""")
        assertNotNull(storedQuadFit(session).getValue("0000").mesh?.cx)
    }

    /** A silent revert of the limit to 0.02 must fail HERE: 004251's real outer lines carry 0.046. */
    @Test
    fun `a real-magnitude curvature is accepted and moves the packed bytes`() {
        val session = session(fitted = listOf("0000", "0001"))
        val tilted = """"tx":$ZEROS,"ty":$ZEROS"""
        writeFit(session, """{"x":$NOMINAL,"y":$NOMINAL,$tilted}""")
        val linear = File(dir, "curv-linear")
        packLabeledSession(listOf(session.absolutePath, linear.absolutePath, "id=phone-fixture"))

        writeFit(session, """{"x":$NOMINAL,"y":$NOMINAL,$tilted,"cx":$REAL_CURV,"cy":$ZEROS}""")
        val mesh = storedQuadFit(session).getValue("0000").mesh
        assertArrayEquals(doubleArrayOf(0.046, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.046), mesh?.cx)
        val curved = File(dir, "curv-curved")

        packLabeledSession(listOf(session.absolutePath, curved.absolutePath, "id=phone-fixture"))

        assertFalse(
            File(linear, "packed_images.u8").readBytes().contentEquals(File(curved, "packed_images.u8").readBytes()),
            "a 0.046 bow must cut other pixels than the straight lines, or the limit is decorative",
        )
    }

    private fun writeFit(
        session: File,
        mesh: String,
    ) {
        File(session, "quad-fit.json").writeText(
            """{"margin":0.0,"frames":{"0000":{"corners":${points(FIELD)},""" +
                """"align_worst_px":2.7,"grid_lines":$mesh}},"failed":[],"source_margin":0.045}""" + "\n",
        )
    }

    // --- the fixture ------------------------------------------------------------------------------

    /** A stored session of two frames of the same board, with a sidecar covering [fitted]. */
    private fun session(
        fitted: List<String>,
        mesh: String? = null,
    ): File {
        NativeCv.require()
        val name = "session-${fitted.size}${if (mesh == null) "" else "-mesh"}"
        val session = File(dir, name).apply { File(this, "frames").mkdirs() }
        val board = board()
        val stems = listOf("0000", "0001")
        try {
            for (stem in stems) Imgcodecs.imwrite(File(session, "frames/$stem.jpg").absolutePath, board)
        } finally {
            board.release()
        }
        File(session, "log.jsonl").writeText(
            stems.joinToString("\n", postfix = "\n") { stem ->
                """{"frame":"frames/$stem.jpg","ply":${stem.toInt() + 2},"fen":"$FEN","corners":${points(MARKER)}}"""
            },
        )
        val extra = if (mesh == null) "" else ""","grid_lines":$mesh"""
        val frames = fitted.joinToString(",") { """"$it":{"corners":${points(FIELD)},"align_worst_px":2.7$extra}""" }
        File(session, "quad-fit.json").writeText(
            """{"margin":0.0,"frames":{$frames},"failed":[],"source_margin":0.045}""" + "\n",
        )
        return session
    }

    private fun points(quad: FloatArray): String = (0 until 4).joinToString(",", "[", "]") { i -> "[${quad[i * 2]},${quad[i * 2 + 1]}]" }

    private fun meta(out: File): JsonObject = Json.parseToJsonElement(File(out, "packed_meta.json").readText()) as JsonObject

    /** A rectified board with a surround: alternating cells and a dark groove on every boundary. */
    private fun board(): Mat {
        val n = BS + 2 * BORDER
        val img = Mat(n, n, CvType.CV_8UC3, Scalar(SURROUND, SURROUND, SURROUND))
        img.submat(BORDER, BORDER + BS, BORDER, BORDER + BS).setTo(Scalar(LIGHT, LIGHT, LIGHT))
        for (f in 0 until 8) {
            for (r in 0 until 8) {
                if ((f + r) % 2 != 0) continue
                val x = BORDER + f * CELL
                val y = BORDER + r * CELL
                img.submat(y, y + CELL, x, x + CELL).setTo(Scalar(DARK, DARK, DARK))
            }
        }
        for (k in 0..8) {
            val p = BORDER + k * CELL
            img.rowRange(p - GROOVE, p + GROOVE + 1).setTo(Scalar(GROOVE_V, GROOVE_V, GROOVE_V))
            img.colRange(p - GROOVE, p + GROOVE + 1).setTo(Scalar(GROOVE_V, GROOVE_V, GROOVE_V))
        }
        Imgproc.GaussianBlur(img, img, Size(0.0, 0.0), 1.0)
        return img
    }

    private companion object {
        const val BS = 640
        const val CELL = BS / 8
        const val BORDER = 64
        const val GROOVE = 2
        const val LIGHT = 205.0
        const val DARK = 70.0
        const val SURROUND = 175.0
        const val GROOVE_V = 20.0
        const val FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

        /** The playing field itself, [a8, h8, h1, a1] — what the fit measures and writes. */
        val FIELD = floatArrayOf(64f, 64f, 704f, 64f, 704f, 704f, 64f, 704f)

        /** What the phone logged: the field plus the 4.5 % outset, off by the drift the fit removes. */
        val MARKER = floatArrayOf(41.2f, 39.2f, 738.8f, 39.2f, 738.8f, 736.8f, 41.2f, 736.8f)

        /** Interior lines shifted a hundredth of the field — enough to move every crop's pixels. */
        const val MESH =
            """{"x":[0.0,0.115,0.24,0.365,0.49,0.615,0.74,0.865,1.0],""" +
                """"y":[0.0,0.115,0.24,0.365,0.49,0.615,0.74,0.865,1.0]}"""

        /** A well-formed axis, so each malformed variant differs in exactly one way. */
        const val NOMINAL = """[0,0.125,0.25,0.375,0.5,0.625,0.75,0.875,1]"""

        const val ZEROS = """[0,0,0,0,0,0,0,0,0]"""

        /** The measured 004251 magnitude: outer lines bowed, |c| = 0.046 — inside 0.08, over 0.02. */
        const val REAL_CURV = """[0.046,0,0,0,0,0,0,0,-0.046]"""
    }
}
