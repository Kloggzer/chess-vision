package com.chesslab.tracker.record

import java.io.File

internal const val FEN_AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"

internal fun stubWriter(bytes: Int = 16) =
    FrameWriter { dest ->
        dest.writeBytes(ByteArray(bytes))
        bytes.toLong()
    }

internal class StubCaptureSource(
    private val bytes: Int = 16,
) : CaptureSource {
    override fun grab() = CaptureFrame(1920, 1080, floatArrayOf(0f, 0f, 100f, 0f, 100f, 100f, 0f, 100f), stubWriter(bytes))

    override fun geometryNote(): String? = null
}

/** The camera has not delivered a frame yet: no recorder can open. */
internal object NoFrameCaptureSource : CaptureSource {
    override fun grab(): CaptureFrame? = null

    override fun geometryNote(): String? = null
}

/** One session `s` under [dir], every gate at its default. */
internal fun captureUnder(
    dir: File,
    enabled: Boolean = true,
) = SessionCaptureController(
    source = StubCaptureSource(),
    open = { SessionRecorder(File(dir, "s").also(File::mkdirs), SessionMeta("s", "default", it.width, it.height)) },
    gates = RecordingGates(),
    prefs = { RecordingPrefs(enabled = enabled) },
    existingBytes = { 0L },
)
