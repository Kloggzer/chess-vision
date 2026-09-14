package com.chesslab.tracker.record

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/** After 1. e4 — a perfectly ordinary position, so nothing about ply 1 is unrecordable. */
private const val AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"

/** Three white bishops: `physicalInventoryViolations` refuses it, which is what a promotion looks like. */
private const val THREE_BISHOPS = "rnbqkbnr/pppppppp/8/8/8/5B2/PPPPPPPP/RNBQKB1R w KQkq - 0 1"

private val CORNERS = floatArrayOf(0f, 0f, 100f, 0f, 100f, 100f, 0f, 100f)

private class StillSource : CaptureSource {
    override fun grab(): CaptureFrame = CaptureFrame(1920, 1080, CORNERS, FrameWriter { dest -> writeStub(dest) })

    override fun geometryNote(): String? = null
}

private fun writeStub(dest: File): Long {
    dest.writeBytes(ByteArray(STUB_BYTES.toInt()))
    return STUB_BYTES
}

private const val STUB_BYTES = 16L

/**
 * A deferred move photo that a LATER ply's gate throws away.
 *
 * `queue` evaluates both gates against the NEW ply's FEN and, when either blocks, clears `pending`
 * — which is the EARLIER ply's photo, taken under its own FEN and never gated. It disappears with
 * no counter and no reason, which is exactly what `supersededFrames` was added for on 2026-08-14.
 */
class PendingCapturePhotoLossTest {
    @TempDir
    lateinit var dir: File

    private var opened = 0
    private val gates = RecordingGates()

    private fun controller() =
        SessionCaptureController(
            source = StillSource(),
            open = {
                opened++
                SessionRecorder(File(dir, "s$opened").also(File::mkdirs), SessionMeta("s$opened", "default", it.width, it.height))
            },
            gates = gates,
            prefs = { RecordingPrefs(enabled = true) },
            existingBytes = { 0L },
        )

    @Test
    fun aGatedPlyDropsTheEarlierPlysDeferredPhotoWithoutCountingIt() {
        val controller = controller()
        // Ply 1 commits with a hand still over the board: the photo is deferred, not written.
        controller.queue(1, AFTER_E4, "e4", clean = false)
        assertEquals(0, controller.recorder?.count, "an unclean commit must defer, not capture")

        // Ply 2 commits into a position the inventory filter refuses. That is a verdict about ply 2.
        controller.queue(2, THREE_BISHOPS, "e5", clean = true)

        assertNull(controller.flush(), "ply 1's deferred photo is gone — nothing is left to flush")
        assertEquals(0, controller.recorder?.count, "neither ply reached log.jsonl")
        assertEquals(
            1,
            controller.supersededFrames,
            "ply 1's deferred photo was destroyed by a gate that judged ply 2's FEN, and nothing counted it: " +
                "supersededFrames=${controller.supersededFrames}, reason=${controller.reason}. " +
                "The next clean ply clears gates.reason too, so the loss leaves no trace at all — " +
                "the silent-data-loss case SessionCapture.kt:113 exists to make visible.",
        )
    }
}
