package com.chesslab.tracker.diagnostics

import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.debugDecision
import com.chesslab.tracker.service.CnnRuntimeInfo
import com.chesslab.tracker.settings.AppSettings
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.coroutines.EmptyCoroutineContext

/** NaN is a legal value here — three `Int?` knobs encode "no override" as one. */
private val PARSER = Json { allowSpecialFloatingPointValues = true }

private fun JsonObject.str(key: String): String = getValue(key).jsonPrimitive.content

private fun JsonObject.obj(key: String): JsonObject = getValue(key).jsonObject

@OptIn(ExperimentalCoroutinesApi::class)
class DiagnosticsLogTest {
    @TempDir
    lateinit var tmp: File

    private fun dir() = diagnosticsDir(tmp)

    private fun TestScope.log(
        maxFileBytes: Long = 1024L * 1024L,
        maxFiles: Int = 4,
    ) = DiagnosticsLog(dir(), this, maxFileBytes, maxFiles, EmptyCoroutineContext)

    private fun lines(): List<JsonObject> =
        dir()
            .listFiles()
            .orEmpty()
            .sortedBy { it.name.filter(Char::isDigit).toInt() }
            .flatMap { file -> file.readLines().filter(String::isNotBlank).map { PARSER.parseToJsonElement(it).jsonObject } }

    /** The sink runs on the analyzer thread: 23.1 ms median whole-frame budget. */
    @Test
    fun offerTouchesNoFile() =
        runTest {
            val log = log()
            log.offer(debugDecision())
            assertFalse(dir().exists(), "offer opened a file on the calling thread")
            runCurrent()
            assertEquals(1, dir().listFiles()?.size, "the consumer never wrote")
            log.close()
            advanceUntilIdle()
        }

    @Test
    fun rotationDropsTheOldestFileAndLeavesTheNewestWhole() =
        runTest {
            val log = log(maxFileBytes = 900L, maxFiles = 2)
            repeat(20) { log.offer(debugDecision(ply = it)) }
            runCurrent()
            log.close()
            advanceUntilIdle()

            val files = dir().listFiles().orEmpty().sortedBy { it.name }
            assertEquals(2, files.size, "the cap did not hold: ${files.map(File::getName)}")
            assertFalse(File(dir(), "diag-0.ndjson").exists(), "the oldest file survived the cap")
            val newest = files.last().readLines().filter(String::isNotBlank)
            assertTrue(newest.isNotEmpty())
            newest.forEach { PARSER.parseToJsonElement(it) }
        }

    /** Rotation deletes the file the header was written into: a header written once leaves anonymous numbers. */
    @Test
    fun aRotationKeepsSeqOrderAndEveryFileRepeatsTheRunHeader() =
        runTest {
            val log = log(maxFileBytes = 900L, maxFiles = 4)
            log.runStart(runStart())
            repeat(20) { log.offer(debugDecision(ply = it)) }
            runCurrent()
            log.close()
            advanceUntilIdle()

            val files = dir().listFiles().orEmpty()
            assertTrue(files.size > 1, "the test never rotated")
            val seqs =
                lines()
                    .filter { it.str("kind") == KIND_DECISION }
                    .map { it.str("seq").toLong() }
            assertEquals(seqs.sorted(), seqs, "the rows are out of order")
            assertEquals(seqs.toSet().size, seqs.size, "a seq repeats")
            files.forEach { file ->
                val first = PARSER.parseToJsonElement(file.readLines().first()).jsonObject
                assertEquals(KIND_RUN_START, first.str("kind"), file.name)
            }
        }

    /** Der Kopf ist der AELTESTE Eintrag der DROP_OLDEST-Schlange: ein Rueckstand wirft ihn zuerst weg. */
    @Test
    fun theRunHeaderSurvivesAFullQueue() =
        runTest {
            val log = log()
            log.runStart(runStart())
            repeat(300) { log.offer(debugDecision(ply = it)) }
            runCurrent()
            log.close()
            advanceUntilIdle()

            assertEquals(KIND_RUN_START, lines().first().str("kind"), "der Lauf-Kopf fiel aus der Schlange")
        }

    @Test
    fun runStartCarriesTheConfigInForceAndTheModelIdentity() =
        runTest {
            val log = log()
            log.runStart(runStart())
            runCurrent()
            log.close()
            advanceUntilIdle()

            val row = lines().single()
            assertEquals(KIND_RUN_START, row.str("kind"))
            val values = row.obj("config").obj("values")
            assertEquals(
                TrackerConfig().motionRecencyS,
                values.str("motionRecencyS").toDouble(),
            )
            val model = row.obj("model")
            assertEquals("occ-v6-f5nd", model.str("loadedDir"))
            assertEquals("80x80", model.str("inferSize"))
            assertEquals("0.05", model.str("declaredPads"))
            assertEquals("side=0.050", model.str("servedPads"))
            assertEquals("XNNPACK", model.str("actualEp"))
        }

    /** The surrogate mirrors a `:core-engine` type it cannot annotate; only this test connects the two. */
    @Test
    fun theSurrogateCarriesEveryFieldOfDebugDecision() =
        runTest {
            val log = log()
            log.offer(debugDecision())
            runCurrent()
            log.close()
            advanceUntilIdle()

            val row = lines().single()
            val engineFields =
                DebugDecision::class.java.declaredFields
                    .map { it.name }
                    .toSet()
            assertEquals(engineFields + setOf("kind", "seq"), row.keys, "the wire shape drifted from the engine's")
            assertEquals(9.25, row.obj("changedVals").str("f4").toDouble())
            assertEquals(4.5, row.obj("changedVals").str("d4").toDouble())
            assertEquals("e2e4", row.str("uci"))
            assertEquals("rejected", row.str("decider"))
            assertFalse(row.str("accepted").toBoolean())
            assertTrue(row.str("cnnRun").toBoolean())
            assertNotNull(row["fenAfter"])
        }

    @Test
    fun noPixelsReachTheFile() =
        runTest {
            val log = log()
            log.offer(debugDecision())
            log.runStart(runStart())
            runCurrent()
            log.close()
            advanceUntilIdle()

            val forbidden = listOf("byte[]", "crop", "bitmap", "image", "pixel")
            val text =
                dir()
                    .listFiles()
                    .orEmpty()
                    .joinToString("\n") { it.readText() }
                    .lowercase()
            forbidden.forEach { assertFalse(text.contains(it), "the file mentions '$it'") }
        }
}

private fun runStart() =
    runStartOf(
        app = AppSettings(),
        config = TrackerConfig(),
        spec =
            ModelSpec(
                classes = listOf("empty", "piece"),
                outWidth = 80,
                outHeight = 80,
                padSide = 0.05,
                mean = listOf(0f),
                std = listOf(1f),
            ),
        servedPads = "side=0.050",
        cnn = CnnRuntimeInfo("QNN-HTP(NPU)", "XNNPACK", "occ-v6-f5nd", "model.onnx", "64x3x80x80", "side=0.050", 9.0, 3),
        host = HostIdentity(AppVersion("0.1.0", 1L), "samsung SM-S921B", 35),
        now = { "2026-08-02T12:00:00Z" },
    )
