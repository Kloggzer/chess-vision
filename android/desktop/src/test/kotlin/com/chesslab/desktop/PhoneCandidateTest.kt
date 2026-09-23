package com.chesslab.desktop

import com.chesslab.geometry.cornersFromFlat
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.geometry.DEFAULT_MARKER_MARGIN
import com.chesslab.tracker.geometry.Distribution
import com.chesslab.tracker.geometry.ScannedGeometry
import com.chesslab.tracker.settings.CONFIG_SCHEMA_VERSION
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Point
import org.opencv.core.Scalar
import org.opencv.imgproc.Imgproc
import java.io.File

private const val START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
private const val AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
private const val AFTER_E4E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2"
private const val E4E5_PLACEMENT = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR"

/** videoMs = elapsedMs - 1000. */
private const val SYNC_NS = 1_000_000_000L

private fun rowsOf(
    frames: List<FrameRow> = emptyList(),
    decisions: List<DecisionRow> = emptyList(),
    events: List<Pair<Long, Long>> = emptyList(),
) = TimelineRows(listOf(SYNC_NS to 0L), frames, decisions, events)

class PhoneCandidateTest {
    @Test
    fun `the frame rule takes the first frame row showing the position`() {
        val rows =
            rowsOf(
                frames = listOf(FrameRow(10L, 0L, START), FrameRow(20L, 0L, AFTER_E4), FrameRow(30L, 0L, AFTER_E4)),
            )

        val hit = PhoneClock(rows).elapsedNs(1, AFTER_E4, 0L, Long.MIN_VALUE)

        assertEquals(20L to TimeRule.FRAME, hit)
    }

    /** A transposition repeats a placement; the bound keeps the second visit from the first. */
    @Test
    fun `a repeated placement after the bound is found again, an earlier one is not`() {
        val rows =
            rowsOf(
                frames = listOf(FrameRow(10L, 0L, AFTER_E4), FrameRow(20L, 0L, AFTER_E4E5), FrameRow(30L, 0L, AFTER_E4)),
            )
        val clock = PhoneClock(rows)

        assertEquals(10L, clock.elapsedNs(1, AFTER_E4, 0L, Long.MIN_VALUE)?.first)
        assertEquals(30L, clock.elapsedNs(3, AFTER_E4, 0L, 20L)?.first)
    }

    @Test
    fun `the decision rule is used when no frame row shows the position`() {
        val rows =
            rowsOf(
                frames = listOf(FrameRow(10L, 0L, START), FrameRow(20L, 0L, START)),
                decisions = listOf(DecisionRow(2, 50L)),
            )

        assertEquals(50L to TimeRule.DECISION, PhoneClock(rows).elapsedNs(2, AFTER_E4E5, 0L, Long.MIN_VALUE))
    }

    @Test
    fun `the wall rule is the last resort`() {
        val rows = rowsOf(frames = listOf(FrameRow(1_000_000_000L, 1000L, null), FrameRow(2_000_000_000L, 2000L, null)))

        assertEquals(1_400_000_000L to TimeRule.WALL, PhoneClock(rows).elapsedNs(1, AFTER_E4, 1400L, Long.MIN_VALUE))
    }

    /** Der NAECHSTE Ankerpunkt: bei sauberen Zeilen dasselbe wie der erste. Hier driftet die zweite Zeile um 100 ms. */
    @Test
    fun `die Wanduhr ankert am naechsten Punkt, auch wenn die Zeilen zittern`() {
        val rows = rowsOf(frames = listOf(FrameRow(1_000_000_000L, 1000L, null), FrameRow(2_000_000_000L, 2100L, null)))

        val hit = PhoneClock(rows).elapsedNs(1, AFTER_E4, 2050L, Long.MIN_VALUE)

        assertEquals(1_950_000_000L to TimeRule.WALL, hit, "der erste Punkt haette 2_050_000_000 gesagt")
    }

    /** Ohne den Rueckfall traegt ein Halbzug ohne Ecken gar keinen Quad, und die Herkunft der Geometrie faellt weg. */
    @Test
    fun `cornersAt faellt auf die letzte Zeile davor zurueck`() {
        val quad = FloatArray(8) { it.toFloat() }
        val rows = rowsOf(frames = listOf(FrameRow(10L, 0L, null, quad), FrameRow(20L, 0L, null), FrameRow(30L, 0L, null)))

        assertEquals(quad, rows.cornersAt(10L), "die Zeile bei der Zeit selbst")
        assertEquals(quad, rows.cornersAt(25L), "keine Ecken mehr voraus, also die letzte davor")
        assertNull(rowsOf(frames = listOf(FrameRow(10L, 0L, null))).cornersAt(25L), "Gegenprobe: gibt es keine, ist es null")
    }

    @Test
    fun `the frame clock takes the first decoded frame at or after the video time`() {
        val clock = PhoneFrameClock(listOf(0.0, 33.3, 66.7))

        assertEquals(2, clock.indexAt(40.0))
        assertNull(clock.indexAt(120.0))
    }

    @Test
    fun `the last frame stands for a ply within one interval past the end, further plies are omitted`() {
        val clock = PhoneFrameClock(listOf(0.0, 33.3, 66.7))
        assertEquals(2, clock.indexAt(90.0), "one interval past the last frame is still that frame")
        assertNull(clock.indexAt(120.0), "further out there is no frame")

        val dir = bundle("after-end", games = emptyMap())
        File(dir, "files/sessions/x/timeline.jsonl").writeText(TIMELINE + DECISIONS + LATE_DECISION)
        val candidate = Json.parseToJsonElement(buildPhoneCandidate(dir, false, SPEC, SCAN, FRAMES).readText()).jsonObject
        assertEquals(3, candidate.getValue("moves").jsonArray.size, "the ply after the video's end is not a frame")
        assertTrue(
            candidate
                .getValue("note")
                .jsonPrimitive.content
                .contains("1 plies after the video's end omitted"),
        )
    }

    @Test
    fun `the verb refuses a bundle without a record naming its session`() {
        val dir = bundle("no-record", games = emptyMap())

        val refusal = assertThrows(PhoneRefusal::class.java) { buildPhoneCandidate(dir, false, SPEC, SCAN, FRAMES) }

        assertTrue(refusal.message!!.contains("no game record"), refusal.message)
    }

    @Test
    fun `without a record the timeline's decisions are the record, a skipped ply is derived`() {
        val dir = bundle("decisions", games = emptyMap())
        File(dir, "files/sessions/x/timeline.jsonl").writeText(TIMELINE + DECISIONS)

        val candidate = Json.parseToJsonElement(buildPhoneCandidate(dir, false, SPEC, SCAN, FRAMES).readText()).jsonObject
        val moves = candidate.getValue("moves").jsonArray.map { it.jsonObject }

        assertEquals(listOf("e4", "e5", "Nf3"), moves.map { it.getValue("san").jsonPrimitive.content })
        assertEquals(listOf(1, 3, 4), moves.map { it.int("frame") }, "the derived ply lands on the frame that first shows it")
        assertEquals(
            "timeline",
            candidate
                .getValue("source")
                .jsonObject
                .getValue("record")
                .jsonPrimitive.content,
        )
        assertEquals("phone_log", moves[1].getValue("decider").jsonPrimitive.content)
    }

    @Test
    fun `the review writer sees the placed plies and its count lands in the candidate`() {
        val dir = bundle("review", games = emptyMap())
        File(dir, "files/sessions/x/timeline.jsonl").writeText(TIMELINE + DECISIONS)
        var seen = emptyList<Int>()

        val written =
            buildPhoneCandidate(dir, false, SPEC, SCAN, FRAMES) { plies ->
                seen = plies.map { it.frame }
                plies.size * 3
            }
        val candidate = Json.parseToJsonElement(written.readText()).jsonObject

        assertEquals(listOf(1, 3, 4), seen)
        assertEquals(9, candidate.int("frames_written"))
    }

    @Test
    fun `the quad on the grooves wins, whichever measured it`() {
        val board = Mat(SIDE, SIDE, CvType.CV_8UC3, Scalar(200.0, 200.0, 200.0))
        for (k in 0..8) {
            val p = (k * SIDE / 8).toDouble()
            Imgproc.line(board, Point(p, 0.0), Point(p, SIDE - 1.0), Scalar(20.0, 20.0, 20.0), 1)
            Imgproc.line(board, Point(0.0, p), Point(SIDE - 1.0, p), Scalar(20.0, 20.0, 20.0), 1)
        }
        val m = (DEFAULT_MARKER_MARGIN * SIDE).toFloat()
        val onGrooves = floatArrayOf(-m, -m, SIDE + m, -m, SIDE + m, SIDE + m, -m, SIDE + m)
        val nudged = FloatArray(8) { onGrooves[it] + if (it % 2 == 0) 14f else 0f }

        val (chosen, note) = chooseQuad(SCAN.copy(corners = cornersFromFlat(nudged), boardSize = SIDE), onGrooves, listOf(board))
        board.release()

        assertEquals("phone-log", note.getValue("chosen").jsonPrimitive.content)
        assertEquals(cornersFromFlat(onGrooves).map { it.toList() }, chosen.corners.map { it.toList() })
        val (kept, _) = chooseQuad(SCAN.copy(corners = cornersFromFlat(onGrooves), boardSize = SIDE), nudged, emptyList())
        assertEquals(cornersFromFlat(onGrooves).map { it.toList() }, kept.corners.map { it.toList() }, "no sample: the scan stands")
    }

    @Test
    fun `every ply carries the phone's quad at its commit`() {
        val dir = bundle("ply-corners", games = emptyMap())
        File(dir, "files/sessions/x/timeline.jsonl").writeText(TIMELINE + DECISIONS)

        val candidate = Json.parseToJsonElement(buildPhoneCandidate(dir, false, SPEC, SCAN, FRAMES).readText()).jsonObject
        val corners =
            candidate.getValue("moves").jsonArray.map { m ->
                m.jsonObject["corners"]?.jsonArray?.map { p -> p.jsonArray.map { it.jsonPrimitive.content.toFloat() } }
            }

        assertEquals(listOf(listOf(1f, 2f), listOf(3f, 4f), listOf(5f, 6f), listOf(7f, 8f)), corners[0])
        assertEquals(listOf(listOf(11f, 12f), listOf(13f, 14f), listOf(15f, 16f), listOf(17f, 18f)), corners[1])
    }

    @Test
    fun `a two-segment record yields the first segment and a note`() {
        val dir = bundle("two-segments", games = mapOf("g.json" to twoSegmentRecord()))

        val candidate = Json.parseToJsonElement(buildPhoneCandidate(dir, false, SPEC, SCAN, FRAMES).readText()).jsonObject

        assertEquals(2, candidate.getValue("moves").jsonArray.size)
        assertEquals("2 plies after a seam omitted", candidate.getValue("note").jsonPrimitive.content)
    }

    @Test
    fun `the verb writes an unconfirmed candidate whose plies replay to the record's last position`() {
        val dir = bundle("one-game", games = mapOf("g.json" to oneSegmentRecord()))

        val candidate = Json.parseToJsonElement(buildPhoneCandidate(dir, false, SPEC, SCAN, FRAMES).readText()).jsonObject
        val moves = candidate.getValue("moves").jsonArray.map { it.jsonObject }

        assertEquals(2, moves.size)
        assertTrue(moves[0].int("frame") != moves[1].int("frame"), "both plies landed on one frame")
        assertEquals(
            E4E5_PLACEMENT,
            moves[1]
                .getValue("fen_after")
                .jsonPrimitive.content
                .substringBefore(' '),
        )
        assertFalse(
            candidate
                .getValue("confirmed")
                .jsonPrimitive.content
                .toBoolean(),
        )
        assertEquals("phone_log", moves[1].getValue("decider").jsonPrimitive.content)
        val source = candidate.getValue("source").jsonObject
        assertEquals("phone", source.getValue("kind").jsonPrimitive.content)
        assertNotNull(source.getValue("crop").jsonObject["pad_side"])
    }

    /** Ein fremdes Schema dekodiert zu VORGABEN — die durften nicht als gemessene Konfiguration landen. */
    @Test
    fun `settings json unter fremdem Schema wird als unbekannt vermerkt, nicht als Vorgabe`() {
        val dir = bundle("old-schema", games = mapOf("g.json" to oneSegmentRecord()))
        File(dir, "files/sessions/x/settings.json").writeText("""{"version":4,"values":{"boardSize":992,"pOccludedThr":0.15}}""")

        val config = effectiveConfig(buildPhoneCandidate(dir, false, SPEC, SCAN, FRAMES))

        assertEquals(setOf("unknown"), config.keys, "keine Knoepfe erfinden: $config")
        assertTrue("schema 4" in config.getValue("unknown").jsonPrimitive.content)
    }

    @Test
    fun `settings json unter dem eigenen Schema traegt die gespeicherten Werte`() {
        val dir = bundle("own-schema", games = mapOf("g.json" to oneSegmentRecord()))
        File(dir, "files/sessions/x/settings.json")
            .writeText("""{"version":$CONFIG_SCHEMA_VERSION,"values":{"boardSize":992,"pOccludedThr":0.15}}""")

        val config = effectiveConfig(buildPhoneCandidate(dir, false, SPEC, SCAN, FRAMES))

        assertEquals(992, config.int("boardSize"))
        assertEquals(
            0.15,
            config
                .getValue("pOccludedThr")
                .jsonPrimitive.content
                .toDouble(),
        )
    }

    private fun effectiveConfig(candidate: File): JsonObject =
        Json
            .parseToJsonElement(candidate.readText())
            .jsonObject
            .getValue("effective_config")
            .jsonObject

    @AfterEach
    fun clean() {
        ROOT.deleteRecursively()
    }

    /** Under `data/`: `relativeVideo` refuses a temp directory outside the tree. */
    private fun bundle(
        name: String,
        games: Map<String, String>,
    ): File {
        val dir = File(ROOT, name)
        val session = File(dir, "files/sessions/x")
        session.mkdirs()
        File(session, "video.mp4").writeText("")
        File(session, "timeline.jsonl").writeText(TIMELINE)
        File(dir, "files/games").mkdirs()
        games.forEach { (file, text) -> File(dir, "files/games/$file").writeText(text) }
        return dir
    }

    companion object {
        private val ROOT = File(DATA_DIR, "tmp/phone-candidate-test")
        const val SIDE = 800

        @JvmStatic
        @BeforeAll
        fun natives() = NativeCv.require()

        private val SPEC =
            ModelSpec(
                classes = listOf("empty"),
                outWidth = 80,
                outHeight = 80,
                mean = listOf(0.485f, 0.456f, 0.406f),
                std = listOf(0.229f, 0.224f, 0.225f),
            )

        private val SCAN =
            ScannedGeometry(
                corners =
                    listOf(
                        doubleArrayOf(0.0, 0.0),
                        doubleArrayOf(800.0, 0.0),
                        doubleArrayOf(800.0, 800.0),
                        doubleArrayOf(0.0, 800.0),
                    ),
                boardSize = 800,
                margin = 0.045,
                frameWidth = 1920,
                frameHeight = 1080,
                fps = 30.0,
                alignPassRate = 1.0,
                aligned = 100,
                sampled = 100,
                frames = 5,
                sampleEvery = 1,
                markersSeen = mapOf(4 to 100),
                worstOffsetPx = Distribution(1.0, 1.0, 1.0),
                quadSpreadPx = Distribution(1.0, 1.0, 1.0),
                clockErrorMs = Distribution(0.0, 0.0, 0.0),
            )

        private val FRAMES = PhoneFrameClock(listOf(0.0, 33.3, 66.7, 100.0, 133.3))

        private val TIMELINE =
            listOf(
                """{"kind":"video_sync","elapsedNs":$SYNC_NS,"durationNs":0}""",
                """{"kind":"frame","elapsedNs":1030000000,"wallTsMs":1030,"fen":"$AFTER_E4","corners":[1,2,3,4,5,6,7,8]}""",
                """{"kind":"frame","elapsedNs":1090000000,"wallTsMs":1090,"fen":"$AFTER_E4E5","corners":[11,12,13,14,15,16,17,18]}""",
            ).joinToString("\n") + "\n"

        const val AFTER_NF3 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2"

        private val LATE_DECISION =
            """{"kind":"decision","elapsedNs":21000000000,"ply":4,"accepted":true,"san":"Nc6","uci":"b8c6","fenBefore":"$AFTER_NF3"}""" +
                "\n"

        /** A pair commit writes one row for the second ply only. */
        private val DECISIONS =
            listOf(
                """{"kind":"frame","elapsedNs":1120000000,"wallTsMs":1120,"fen":"$AFTER_NF3"}""",
                """{"kind":"decision","elapsedNs":1030000000,"ply":1,"uci":"e2e4","san":"e4","fenBefore":"$START","fenAfter":"$AFTER_E4","accepted":true}""",
                """{"kind":"decision","elapsedNs":1120000000,"ply":3,"uci":"g1f3","san":"Nf3","fenBefore":"$AFTER_E4E5","fenAfter":"$AFTER_NF3","accepted":true}""",
            ).joinToString("\n") + "\n"

        const val E4 = """{"ply":1,"san":"e4","uci":"e2e4","tsEpochMs":1030}"""
        const val E5 = """{"ply":2,"san":"e5","uci":"e7e5","tsEpochMs":1090}"""

        fun oneSegmentRecord(): String =
            """{"id":"g","startFen":"$START","startedAtEpochMs":0,"finishedAtEpochMs":0,"profileName":"p",""" +
                """"result":"*","sessionId":"x","moves":[$E4,$E5]}"""

        fun twoSegmentRecord(): String {
            val tail = """{"ply":3,"san":"Nf3","uci":"g1f3","tsEpochMs":1200},{"ply":4,"san":"Nc6","uci":"b8c6","tsEpochMs":1300}"""
            return """{"id":"g","startFen":"$START","startedAtEpochMs":0,"finishedAtEpochMs":0,"profileName":"p",""" +
                """"result":"*","sessionId":"x","moves":[$E4,$E5,$tail],""" +
                """"segments":[{"startFen":"$START","moves":[$E4,$E5]},{"startFen":"$AFTER_E4E5","moves":[$tail]}]}"""
        }

        fun JsonObject.int(key: String): Int = getValue(key).jsonPrimitive.content.toInt()
    }
}
