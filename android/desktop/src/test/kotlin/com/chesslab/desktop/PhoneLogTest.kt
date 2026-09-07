package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

private const val FEN1 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR"
private const val FEN2 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR"

class PhoneLogTest {
    @Test
    fun `reads the ply timeline off log jsonl, anchored at the pre-roll`(
        @TempDir dir: File,
    ) {
        val log = File(dir, "log.jsonl")
        log.writeText(
            """
            {"frame":"frames/0000.jpg","ply":1,"fen":"rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1","ts":"2026-08-15T20:48:15.000Z"}
            {"frame":"frames/0001.jpg","ply":2,"fen":"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2","ts":"2026-08-15T20:48:28.170Z"}
            """.trimIndent() + "\n",
        )
        File(dir, "session.yaml").writeText("session_id: x\nvideo_pre_roll_ns: 11523338000\n")

        val marks = logMarks(log, preRollMs(File(dir, "session.yaml"))!!)

        assertEquals(listOf(1, 2), marks.map { it.ply })
        assertEquals(11523.338, marks[0].videoMs, 0.001)
        assertEquals(24693.338, marks[1].videoMs, 0.001)
        assertEquals("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR", marks[0].placement)
    }

    @Test
    fun `the time axis names the position and keeps the moves themselves out`() {
        val timeline =
            PlyTimeline(
                listOf(
                    PlyMark(1, "e4", "e2e4", "$FEN1 b", 10_000.0),
                    PlyMark(2, "e5", "e7e5", "$FEN2 w", 20_000.0),
                ),
                afterMs = 250.0,
                beforeMs = 2000.0,
            )

        assertEquals(0, timeline.plyAt(5_000.0))
        assertNull(timeline.plyAt(9_000.0))
        assertNull(timeline.plyAt(10_100.0))
        assertEquals(1, timeline.plyAt(12_000.0))
        assertNull(timeline.plyAt(18_500.0))
        assertEquals(2, timeline.plyAt(30_000.0))
    }

    @Test
    fun `derives the uci a candidate needs from the placements alone`(
        @TempDir dir: File,
    ) {
        val log = File(dir, "log.jsonl")
        log.writeText(
            """
            {"ply":1,"fen":"$FEN1 b KQkq - 0 1","ts":"2026-08-15T20:48:15.000Z","move_san":"e4"}
            {"ply":2,"fen":"$FEN2 w KQkq - 0 2","ts":"2026-08-15T20:48:28.000Z","move_san":"e5"}
            """.trimIndent() + "\n",
        )

        val marks = logMarks(log, 0.0)

        assertEquals(listOf("e2e4", "e7e5"), marks.map { it.uci })
        assertEquals(listOf("e4", "e5"), marks.map { it.san })
    }

    /** 16-20-19: the record restarts after a seam; the marks must follow the second segment's start. */
    @Test
    fun `a record with a seam is walked segment by segment`(
        @TempDir dir: File,
    ) {
        val start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        val rebuilt = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
        val file = File(dir, "g.json")
        file.writeText(
            """{"id":"g","startFen":"$start","startedAtEpochMs":0,"finishedAtEpochMs":0,"profileName":"p","result":"*","sessionId":"x",""" +
                """"moves":[{"ply":1,"san":"e4","uci":"e2e4","tsEpochMs":1000},{"ply":3,"san":"Nf3","uci":"g1f3","tsEpochMs":3000}],""" +
                """"segments":[{"startFen":"$start","moves":[{"ply":1,"san":"e4","uci":"e2e4","tsEpochMs":1000}]},""" +
                """{"startFen":"$rebuilt","moves":[{"ply":3,"san":"Nf3","uci":"g1f3","tsEpochMs":3000}]}]}""",
        )

        val marks = gameMarks(file, preRollMs = 500.0)!!

        assertEquals(listOf(1, 3), marks.map { it.ply })
        assertEquals(listOf(500.0, 2500.0), marks.map { it.videoMs })
        assertEquals("rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2", marks[1].fen)
    }

    @Test
    fun `prefers the game record, which keeps the ply whose photo was superseded`(
        @TempDir dir: File,
    ) {
        val sessions = File(dir, "files/sessions/20260815-224804").apply { mkdirs() }
        val games = File(dir, "files/games").apply { mkdirs() }
        File(sessions, "session.yaml").writeText("video_pre_roll_ns: 1000000000\n")
        // The photo log lost ply 2 — `SessionCapture.supersededFrames`.
        File(sessions, "log.jsonl").writeText(
            """{"ply":1,"fen":"$FEN1 b KQkq - 0 1","ts":"2026-08-15T20:48:15.000Z","move_san":"e4"}""" + "\n",
        )
        File(games, "2026-08-15_2250.json").writeText(
            """
            {"sessionId":"20260815-224804","startFen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
             "moves":[{"ply":1,"san":"e4","uci":"e2e4","tsEpochMs":1786827098000},
                      {"ply":2,"san":"e5","uci":"e7e5","tsEpochMs":1786827111000}]}
            """.trimIndent(),
        )

        val timeline = sessionTimeline(File(sessions, "video.mp4"), emptyList())!!

        assertEquals(listOf(1, 2), timeline.marks.map { it.ply })
        assertEquals(listOf("e2e4", "e7e5"), timeline.marks.map { it.uci })
        assertEquals(1000.0, timeline.marks[0].videoMs, 0.001)
        assertEquals(14000.0, timeline.marks[1].videoMs, 0.001)
    }
}
