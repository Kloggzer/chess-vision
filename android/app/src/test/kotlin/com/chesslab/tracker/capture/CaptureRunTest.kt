package com.chesslab.tracker.capture

import com.chesslab.tracker.camera.CaptureObserved
import com.chesslab.tracker.camera.CaptureProfile
import com.chesslab.tracker.camera.DeliveredSize
import com.chesslab.tracker.camera.bitRateFor
import com.chesslab.tracker.record.CaptureFrame
import com.chesslab.tracker.record.CaptureSource
import com.chesslab.tracker.record.FrameWriter
import com.chesslab.tracker.record.SessionMeta
import com.chesslab.tracker.record.SessionRecorder
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/**
 * Against the REAL `SessionRecorder`, not a double: what the import reads is the bundle on disk,
 * and a fake recorder would prove nothing about `log.jsonl` or `session.yaml`.
 */
class CaptureRunTest {
    @TempDir
    lateinit var dir: File

    private var now = 1_000_000L

    @Test
    fun eightTurnsLeaveEightRowsEightStepsAndACaptureBundle() {
        val run = newRun(SHOT)
        repeat(SHOT.stepCount) { ply -> assertTrue(run.step(ply, SHOT.orientationDeg(ply), SHOT.boardFen(), tick())) }
        val session = finish(run)

        assertEquals(listOf(0, 1, 2, 3, 4, 5, 6, 7), log().map { it.getValue("ply").jsonPrimitive.int })
        assertTrue(File(dir, "session.yaml").readText().contains("mode: capture"))
        assertEquals(8, session.steps.size)
        assertEquals("wq-light-sehr-hell", session.shotId)
        assertEquals("normal", session.height)
        assertEquals("g4", session.referenceSquare)
        assertEquals(listOf(0, 45, 90, 135, 180, 225, 270, 315), session.steps.map { it.orientationDeg })
    }

    @Test
    fun everyStepCarriesAClockAndTheWindowsNeverOverlap() {
        val run = newRun(SHOT)
        repeat(SHOT.stepCount) { ply -> run.step(ply, SHOT.orientationDeg(ply), SHOT.boardFen(), tick()) }
        val steps = finish(run).steps

        val starts = steps.map { it.elapsedNs }
        assertTrue(starts.all { it > 0L }, "$starts")
        assertEquals(starts.sorted(), starts)
        assertEquals(starts.distinct(), starts)
        steps.zipWithNext { step, next ->
            val end = requireNotNull(step.elapsedNsEnd)
            assertTrue(end > step.elapsedNs && end < next.elapsedNs, "step ${step.ply}: $end outside ${step.elapsedNs}..${next.elapsedNs}")
        }
    }

    /** `fix = "Licht"` places nothing, and an empty board is still eight labelled turns. */
    @Test
    fun aLightShotRecordsTheEmptyBoardEightTimes() {
        val shot = SHOT.copy(fix = "Licht", place = emptyList())
        val run = newRun(shot)
        repeat(shot.stepCount) { ply -> run.step(ply, shot.orientationDeg(ply), shot.boardFen(), tick()) }
        run.finish()

        val fens = log().map { it.getValue("fen").jsonPrimitive.content }
        assertEquals(8, fens.size)
        assertEquals(setOf("8/8/8/8/8/8/8/8 w - - 0 1"), fens.toSet())
    }

    /** The profile the device really ran goes into the bundle, fallbacks and all. */
    @Test
    fun theRecordingStatesWhatTheDeviceActuallyDid() {
        val run = newRun(SHOT, observed = { FELL_BACK })
        run.step(0, 0, SHOT.boardFen(), tick())
        val recording = requireNotNull(finish(run).recording)

        assertEquals("3840x2160", recording.requestedSize)
        assertEquals("2560x1440", recording.deliveredSize)
        assertEquals(15, recording.requestedFps)
        assertNull(recording.aeFpsRange)
        assertEquals(bitRateFor(3840, 2160, 15), recording.requestedBitRate)
        assertEquals(24_000_000, recording.bitRate)
        assertEquals(listOf("bit rate clamped 40000000 -> 24000000"), recording.notes)
    }

    /** Nothing armed, nothing claimed: no `recording` key rather than a block of zeroes. */
    @Test
    fun anUnmeasuredRunClaimsNoProfile() {
        val run = newRun(SHOT)
        run.step(0, 0, SHOT.boardFen(), tick())
        assertNull(finish(run).recording)
    }

    /** A frame the writer could not produce writes no row at all — `steps` never outruns `log.jsonl`. */
    @Test
    fun aLostFrameLeavesNoStep() {
        val run = newRun(SHOT, source = DeadSource)
        assertTrue(!run.step(0, 0, SHOT.boardFen(), tick()))
        assertNull(run.finish())
        assertEquals(0, log().size)
    }

    /** The step's START — the turning the human does between two taps. */
    private fun tick(): Long {
        now += STEP_NS
        return now
    }

    /** The run's own clock, read when the frame is grabbed: the step's END is strictly later. */
    private fun grabbed(): Long {
        now += GRAB_NS
        return now
    }

    private fun log() = File(dir, "log.jsonl").readLines().filter { it.isNotBlank() }.map { Json.parseToJsonElement(it).jsonObject }

    private fun finish(run: BundleCaptureRun): CaptureSession =
        Json.decodeFromString(CaptureSession.serializer(), requireNotNull(run.finish()).readText())

    private fun newRun(
        shot: Shot,
        source: CaptureSource = FakeSource,
        observed: () -> CaptureObserved? = { null },
    ): BundleCaptureRun {
        val recorder = SessionRecorder(dir, SessionMeta("20260913-120000", "default", 2560, 1440, shot.id, CAPTURE_MODE))
        return BundleCaptureRun(shot, recorder, source, ::grabbed, observed)
    }
}

/** 4K asked for, 1440p delivered, no AE range pinned, the encoder clamped the rate. */
private val FELL_BACK =
    CaptureObserved(
        requested = CaptureProfile(3840, 2160, 15),
        delivered = DeliveredSize(2560, 1440, 0),
        aeFpsRange = null,
        bitRate = 24_000_000,
        notes = listOf("bit rate clamped 40000000 -> 24000000"),
    )

private const val STEP_NS = 3_000_000_000L
private const val GRAB_NS = 1_000_000L

private val SHOT =
    Shot(
        id = "wq-light-sehr-hell",
        fix = "Stellung",
        reason = "nur 12 Belege",
        place = listOf(Placement("g4", "wQ")),
        light = null,
        referenceSquare = "g4",
        height = "normal",
        orientations = 8,
    )

private object FakeSource : CaptureSource {
    override fun grab(): CaptureFrame =
        CaptureFrame(
            2560,
            1440,
            FloatArray(8) { it.toFloat() },
            FrameWriter { dest ->
                dest.writeBytes(ByteArray(1))
                1L
            },
        )

    override fun geometryNote(): String? = null
}

private object DeadSource : CaptureSource {
    override fun grab(): CaptureFrame? = null

    override fun geometryNote(): String? = null
}
