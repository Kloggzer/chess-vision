package com.chesslab.tracker.sync

import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.util.Collections

/**
 * The transfer's decisions, without a network. What is pending, which host, and what a resume does
 * — the three things a phone in a lift gets wrong.
 */
class SyncRunTest {
    @TempDir
    lateinit var root: File

    private val nowMs = 1_786_000_000_000L

    private fun sessionsDir() = File(root, "sessions").apply { mkdirs() }

    private fun gamesDir() = File(root, "games").apply { mkdirs() }

    private fun session(
        id: String,
        video: String = "video-bytes",
        ageMs: Long = QUIET_MS * 2,
    ): File {
        val dir = File(sessionsDir(), id).apply { mkdirs() }
        File(dir, "session.yaml").writeText("session_id: $id\n")
        File(dir, "video.mp4").writeText(video)
        File(dir, "frames").mkdirs()
        File(dir, "frames/0000.jpg").writeText("jpg")
        dir.walkBottomUp().forEach { it.setLastModified(nowMs - ageMs) }
        return dir
    }

    private fun game(
        stem: String,
        sessionId: String?,
    ) {
        File(gamesDir(), "$stem.json").writeText("""{"id":"$stem","sessionId":${sessionId?.let { "\"$it\"" } ?: "null"},"moves":[]}""")
        File(gamesDir(), "$stem.pgn").writeText("1. e4 e5")
    }

    @Test
    fun `a session that is still being written is not sent`() {
        session("20260813-193423", ageMs = 5_000)
        assertTrue(pendingSessions(sessionsDir(), nowMs).isEmpty())
    }

    @Test
    fun `a recording with nothing to label is never sent, and is named rather than hidden`() =
        runTest {
            // `20260813-011731` off the phone: a diagnostics timeline, an empty log, no frames, no video.
            val dir = File(sessionsDir(), "20260813-011731").apply { mkdirs() }
            File(dir, "log.jsonl").writeText("")
            File(dir, "timeline.jsonl").writeText("{}")
            File(dir, "frames").mkdirs()
            dir.walkBottomUp().forEach { it.setLastModified(nowMs - QUIET_MS * 2) }

            assertTrue(pendingSessions(sessionsDir(), nowMs).isEmpty())
            assertEquals(1, emptyRecordings(sessionsDir()).size)
            val client = FakeIngest()
            assertEquals("nothing to transfer · 1 empty recording", run(client).note)
            assertTrue(client.hellos.isEmpty())
        }

    @Test
    fun `a recording with only a video is sent — its labels come from the game record`() =
        runTest {
            val dir = File(sessionsDir(), "20260813-122407").apply { mkdirs() }
            File(dir, "log.jsonl").writeText("")
            File(dir, "video.mp4").writeText("frames")
            dir.walkBottomUp().forEach { it.setLastModified(nowMs - QUIET_MS * 2) }

            assertEquals(listOf(dir), pendingSessions(sessionsDir(), nowMs))
        }

    @Test
    fun `a transferred session is not sent again`() {
        val dir = session("20260813-193423")
        assertEquals(1, pendingSessions(sessionsDir(), nowMs).size)
        writeMark(dir, TransferMark("http://host:3000", nowMs, 9, 3, "landed"))
        assertTrue(pendingSessions(sessionsDir(), nowMs).isEmpty())
    }

    @Test
    fun `the plan carries the session's files and the game that names it`() {
        val dir = session("20260813-193423")
        game("2026-08-13_1941", "20260813-193423")
        game("2026-08-12_1000", "20260812-100000")

        val plan = planFor(dir, gamesDir())
        assertNotNull(plan)
        assertEquals(
            listOf(
                "games/2026-08-13_1941.json",
                "games/2026-08-13_1941.pgn",
                "sessions/20260813-193423/frames/0000.jpg",
                "sessions/20260813-193423/session.yaml",
                "sessions/20260813-193423/video.mp4",
            ),
            plan!!.files.map { it.path }.sorted(),
        )
    }

    @Test
    fun `the session's settings file travels with the bundle`() {
        // `planFor` walks the directory, so this holds without a dedicated rule — but the whole
        // point of `settings.json` is that the PC can answer "which config recorded this?", and
        // a provenance file that silently stayed on the phone would be the old blindness back.
        val dir = session("20260813-193423")
        File(dir, "settings.json").writeText("""{"recorded_at":"2026-08-14T10:00:00Z"}""")
        val plan = planFor(dir, gamesDir())
        assertTrue(plan!!.files.any { it.path == "sessions/20260813-193423/settings.json" })
    }

    @Test
    fun `the janitor removes a moveless leftover and touches nothing else`() {
        // The leftover of a killed process or a pre-2026-08-14 build: timeline, empty log, no game.
        val leftover = File(sessionsDir(), "20260813-011731").apply { mkdirs() }
        File(leftover, "log.jsonl").writeText("")
        File(leftover, "timeline.jsonl").writeText("{}")
        leftover.walkBottomUp().forEach { it.setLastModified(nowMs - QUIET_MS * 2) }
        // Same emptiness, but the PC acknowledged it — the mark makes it untouchable.
        val marked = File(sessionsDir(), "20260813-020000").apply { mkdirs() }
        File(marked, "timeline.jsonl").writeText("{}")
        writeMark(marked, TransferMark("http://host:3000", nowMs, 9, 3, "landed"))
        marked.walkBottomUp().forEach { it.setLastModified(nowMs - QUIET_MS * 2) }
        // A real recording: reference frames make it a session with something to label.
        val real = session("20260813-193423")

        assertEquals(listOf("20260813-011731"), sweepEmptyRecordings(sessionsDir(), nowMs))
        assertFalse(File(sessionsDir(), "20260813-011731").exists())
        assertTrue(marked.exists())
        assertTrue(real.exists())
    }

    @Test
    fun `sent recordings leave the phone after the retention window, held and fresh ones stay`() {
        val old = session("20260801-100000")
        writeMark(old, TransferMark("http://host:3000", nowMs - 8 * DAY_MS, 9, 3, "landed"))
        val fresh = session("20260901-100000")
        writeMark(fresh, TransferMark("http://host:3000", nowMs - 2 * DAY_MS, 9, 3, "landed"))
        // `held` means the PC already had a copy and parked this one: not this janitor's call.
        val held = session("20260802-100000")
        writeMark(held, TransferMark("http://host:3000", nowMs - 8 * DAY_MS, 9, 3, "held"))
        val unsent = session("20260803-100000")

        assertEquals(emptyList<String>(), sweepSentRecordings(sessionsDir(), nowMs, 0L), "0 = keep everything")
        assertEquals(listOf("20260801-100000"), sweepSentRecordings(sessionsDir(), nowMs, 7 * DAY_MS))
        assertFalse(old.exists())
        assertTrue(fresh.exists())
        assertTrue(held.exists())
        assertTrue(unsent.exists())
    }

    @Test
    fun `the janitor never races a directory that is still being written`() {
        val young = File(sessionsDir(), "20260814-100000").apply { mkdirs() }
        File(young, "timeline.jsonl").writeText("{}")
        young.walkBottomUp().forEach { it.setLastModified(nowMs - 5_000) }
        assertTrue(sweepEmptyRecordings(sessionsDir(), nowMs).isEmpty())
        assertTrue(young.exists())
    }

    @Test
    fun `the transfer marker is not part of the bundle`() {
        val dir = session("20260813-193423")
        writeMark(dir, TransferMark("http://host:3000", nowMs, 9, 3, "landed"))
        assertTrue(planFor(dir, gamesDir())!!.files.none { it.path.endsWith(TRANSFER_MARK) })
    }

    @Test
    fun `a resume sends only what the server is missing`() =
        runTest {
            val dir = session("20260813-193423", video = "0123456789")
            val client = FakeIngest(chunk = 4, have = mapOf("sessions/20260813-193423/video.mp4" to 6L))
            val report = run(client)

            assertEquals(1, report.sent.size)
            assertEquals(listOf(6L to 4), client.puts.filter { it.first == 6L }.map { it.first to it.second })
            assertEquals("0123456789", client.written["sessions/20260813-193423/video.mp4"])
            assertNotNull(readMark(dir))
        }

    @Test
    fun `a wrong offset is corrected from the server's own count`() =
        runTest {
            session("20260813-193423", video = "0123456789")
            val client = FakeIngest(chunk = 4, rejectFirstPutOf = "sessions/20260813-193423/video.mp4", trueHave = 2L)
            val report = run(client)

            assertEquals(1, report.sent.size)
            assertEquals("0123456789", client.written["sessions/20260813-193423/video.mp4"])
        }

    @Test
    fun `an empty file is still sent, or the server can never seal the transfer`() =
        runTest {
            // `20260813-011731` off the phone: a 0-byte `log.jsonl` beside 4.8 MB of timeline.
            val dir = session("20260813-193423")
            File(dir, "log.jsonl").writeText("")
            dir.walkBottomUp().forEach { it.setLastModified(nowMs - QUIET_MS * 2) }

            val client = FakeIngest()
            val report = run(client)

            assertEquals(1, report.sent.size)
            assertEquals("", client.written["sessions/20260813-193423/log.jsonl"])
            assertNotNull(readMark(dir))
        }

    @Test
    fun `a failure keeps its reason and leaves no marker`() =
        runTest {
            val dir = session("20260813-193423")
            val report = run(FakeIngest(failWith = "connection reset"))

            assertEquals("connection reset", report.failed.single().reason)
            assertNull(readMark(dir))
        }

    @Test
    fun `nothing pending means the network is never touched`() =
        runTest {
            val client = FakeIngest()
            assertEquals("nothing to transfer", run(client).note)
            assertTrue(client.hellos.isEmpty())
        }

    @Test
    fun `an unreachable manual host says so instead of scanning`() =
        runTest {
            session("20260813-193423")
            val client = FakeIngest(paired = false)
            val report = run(client, prefs().copy(host = "192.168.1.9"))

            assertEquals("http://192.168.1.9:3000 does not answer, or the token does not match", report.note)
            assertEquals(listOf("http://192.168.1.9:3000"), client.hellos)
        }

    @Test
    fun `the remembered host is tried before the sweep`() =
        runTest {
            session("20260813-193423")
            val client = FakeIngest()
            val report = run(client, prefs().copy(lastHost = "192.168.178.20"))

            assertEquals("http://192.168.178.20:3000", report.base)
            assertEquals(listOf("http://192.168.178.20:3000"), client.hellos)
        }

    @Test
    fun `discovery walks outward from the phone's own address and stops at the answer`() =
        runTest {
            session("20260813-193423")
            val client = FakeIngest(only = "http://192.168.178.22:3000")
            val report = run(client)

            assertEquals("http://192.168.178.22:3000", report.base)
            // One batch, not a whole /24: the neighbour is found in the first 32 probes.
            assertTrue(client.hellos.size <= 32, "swept ${client.hellos.size} addresses for a neighbour")
        }

    @Test
    fun `a sweep that finds nothing reports WHY the probe failed`() =
        runTest {
            session("20260813-193423")
            // Nothing on this /24 answers — the address is not one the sweep can produce.
            val client = FakeIngest(only = "http://10.0.0.1:3000", probeFailure = "Cleartext HTTP traffic not permitted")
            val report = run(client)

            assertEquals(
                "no chesslab server on this Wi-Fi — enter the address in Settings (Cleartext HTTP traffic not permitted)",
                report.note,
            )
        }

    @Test
    fun `a run that is off or unpaired states which`() =
        runTest {
            session("20260813-193423")
            assertEquals("transfer is off", run(FakeIngest(), prefs().copy(enabled = false)).note)
            assertEquals("no token — read it off the server's /transfers page", run(FakeIngest(), prefs().copy(token = "")).note)
        }

    private fun prefs() = SyncPrefs(enabled = true, token = "abc")

    private suspend fun run(
        client: IngestClient,
        prefs: SyncPrefs = prefs(),
    ) = SyncRun(
        sessionsDir = sessionsDir(),
        gamesDir = gamesDir(),
        device = "test",
        clientFor = { client },
        ownAddress = { LanAddress("192.168.178.21", 24) },
        now = { nowMs },
    ).run(prefs)
}

/**
 * A server on a table. It keeps the bytes it was sent so a test can assert the FILE, not the calls:
 * a resume that reports success while writing the wrong range is the failure worth catching.
 */
@Suppress("LongParameterList")
private class FakeIngest(
    private val chunk: Int = DEFAULT_CHUNK,
    private val have: Map<String, Long> = emptyMap(),
    private val paired: Boolean = true,
    private val only: String? = null,
    private val failWith: String? = null,
    private val rejectFirstPutOf: String? = null,
    /** What the server really holds when it rejects the first PUT of [rejectFirstPutOf]. */
    private val trueHave: Long = 0L,
    private val probeFailure: String? = null,
) : IngestClient {
    override fun lastFailure(): String? = probeFailure

    // LAN discovery probes 32 addresses at once, so these are written from many threads.
    val hellos: MutableList<String> = Collections.synchronizedList(mutableListOf())
    private val declaredPaths: MutableList<String> = Collections.synchronizedList(mutableListOf())
    val puts: MutableList<Pair<Long, Int>> = Collections.synchronizedList(mutableListOf())
    val written: MutableMap<String, String> = Collections.synchronizedMap(mutableMapOf())
    private var rejected = false

    override fun hello(base: String): Hello? {
        hellos += base
        if (only != null && base != only) return null
        return Hello(paired, chunk)
    }

    override fun declare(
        base: String,
        plan: UploadPlan,
        device: String,
    ): Declared {
        if (failWith != null) throw IngestException(failWith)
        declaredPaths += plan.files.map { it.path }
        plan.files.forEach { file ->
            val prefix = have[file.path]?.toInt() ?: 0
            if (prefix > 0) written[file.path] = file.source.readText().take(prefix)
        }
        return Declared("2026-08-13-19-34-23", plan.files.associate { it.path to (have[it.path] ?: 0L) }, chunk)
    }

    override fun putChunk(
        base: String,
        name: String,
        file: UploadFile,
        offset: Long,
        length: Int,
    ): Long {
        if (file.path == rejectFirstPutOf && !rejected) {
            rejected = true
            // What this server really holds — the bytes the phone's declare answer did not mention.
            written[file.path] = file.source.readText().take(trueHave.toInt())
            throw IngestException("offset $offset != $trueHave", status = 409, have = trueHave)
        }
        puts += offset to length
        val text = String(file.slice(offset, length))
        written[file.path] = (written[file.path] ?: "") + text
        return offset + length
    }

    override fun complete(
        base: String,
        name: String,
    ): String {
        // The server's rule, in the fake: every declared file exists, or nothing seals.
        declaredPaths.filterNot { written.containsKey(it) }.forEach { throw IngestException("incomplete transfer: $it") }
        return "landed"
    }
}
