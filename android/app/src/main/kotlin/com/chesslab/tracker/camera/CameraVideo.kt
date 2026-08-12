package com.chesslab.tracker.camera

import android.media.Image
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMuxer
import android.os.SystemClock
import android.util.Size
import androidx.camera.core.ImageProxy
import java.io.File
import java.nio.ByteBuffer

/** The minimum useful recording size. Smaller video is never silently accepted as training input. */
const val MIN_VIDEO_WIDTH = 2560
const val MIN_VIDEO_HEIGHT = 1440

private const val VIDEO_MIME = MediaFormat.MIMETYPE_VIDEO_AVC
private const val VIDEO_BIT_RATE = 20_000_000
private const val VIDEO_FRAME_RATE = 30
private const val VIDEO_I_FRAME_SECONDS = 1
private const val STOP_TIMEOUT_MS = 1500L
private const val CODEC_TIMEOUT_US = 100_000L
private const val NANOS_PER_US = 1000L
private const val YUV_BYTES_NUMERATOR = 3
private const val YUV_BYTES_DENOMINATOR = 2

data class VideoProgress(
    val durationNs: Long,
    val bytes: Long,
    val final: Boolean = false,
    val error: String? = null,
)

/**
 * Encodes the same QHD YUV frames that feed the tracker.
 *
 * This phone exposes no CameraX QHD Recorder profile and cannot bind VideoCapture beside
 * ImageAnalysis. A second camera owner would be incorrect, so the one analyzer stream is copied
 * into a hardware AVC encoder. `MediaCodec.getInputImage()` exposes the encoder's actual plane
 * layout, avoiding assumptions about planar versus semi-planar chroma.
 */
class CameraVideo : AutoCloseable {
    private var codec: MediaCodec? = null
    private var muxer: MediaMuxer? = null
    private var track = -1
    private var muxerStarted = false
    private var listener: (VideoProgress) -> Unit = {}
    private var outputFile: File? = null
    private var maxBytes = 0L
    private var encodedBytes = 0L
    private var startSensorNs = 0L
    private var lastPtsUs = 0L
    private var rotationDegrees = 0

    @Volatile
    var resolution: Size? = null
        private set

    @Volatile
    var failure: String? = null
        private set

    /** Returns true only when a newly available source size should be published to the session. */
    @Suppress("ReturnCount")
    fun sourceAvailable(
        size: Size,
        rotation: Int,
    ): Boolean {
        val enough = maxOf(size.width, size.height) >= MIN_VIDEO_WIDTH && minOf(size.width, size.height) >= MIN_VIDEO_HEIGHT
        if (!enough) {
            val error = "QHD video unavailable (CameraX delivered ${size.width}x${size.height})"
            if (failure == error && resolution == null) return false
            failure = error
            resolution = null
            return true
        }
        rotationDegrees = rotation
        if (resolution == size && failure == null) return false
        resolution = size
        failure = null
        return true
    }

    @Synchronized
    fun start(
        file: File,
        maxBytes: Long,
        onProgress: (VideoProgress) -> Unit,
    ): Boolean {
        if (codec != null) return false
        val size = resolution ?: return false
        listener = onProgress
        outputFile = file
        this.maxBytes = maxBytes
        encodedBytes = 0L
        startSensorNs = 0L
        lastPtsUs = 0L
        track = -1
        muxerStarted = false
        file.parentFile?.mkdirs()
        file.delete()
        return runCatching {
            val format =
                MediaFormat.createVideoFormat(VIDEO_MIME, size.width, size.height).apply {
                    setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible)
                    setInteger(MediaFormat.KEY_BIT_RATE, VIDEO_BIT_RATE)
                    setInteger(MediaFormat.KEY_FRAME_RATE, VIDEO_FRAME_RATE)
                    setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, VIDEO_I_FRAME_SECONDS)
                }
            muxer =
                MediaMuxer(file.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4).apply {
                    setOrientationHint(rotationDegrees)
                }
            codec =
                MediaCodec.createEncoderByType(VIDEO_MIME).apply {
                    configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
                    start()
                }
            true
        }.onFailure { fail("QHD video start failed", it) }.getOrDefault(false)
    }

    /** Called before the tracker consumes and closes [frame]. Drops rather than blocking. */
    @Synchronized
    fun encode(frame: ImageProxy) {
        val active = codec ?: return
        runCatching {
            drain(active, 0L)
            val index = active.dequeueInputBuffer(0L)
            if (index < 0) return
            val target = active.getInputImage(index) ?: error("AVC encoder exposes no YUV input image")
            copyImage(frame, target)
            val inputBytes = active.getInputBuffer(index)?.capacity() ?: frameBytes(frame.width, frame.height)
            target.close()
            if (startSensorNs == 0L) startSensorNs = frame.imageInfo.timestamp
            val ptsUs = ((frame.imageInfo.timestamp - startSensorNs).coerceAtLeast(0L)) / 1000L
            lastPtsUs = ptsUs
            active.queueInputBuffer(index, 0, inputBytes, ptsUs, 0)
            drain(active, 0L)
            if (maxBytes > 0L && encodedBytes >= maxBytes) stopInternal(null)
        }.onFailure { fail("QHD video encode failed", it) }
    }

    @Synchronized
    fun stop() {
        stopInternal(null)
    }

    @Synchronized
    override fun close() {
        stopInternal(null)
    }

    private fun stopInternal(error: String?) {
        val active = codec ?: return
        var finalError = error
        runCatching {
            val input = active.dequeueInputBuffer(CODEC_TIMEOUT_US)
            if (input >= 0) active.queueInputBuffer(input, 0, 0, lastPtsUs, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
            val deadline = SystemClock.elapsedRealtime() + STOP_TIMEOUT_MS
            while (SystemClock.elapsedRealtime() < deadline && !drain(active, CODEC_TIMEOUT_US)) Unit
        }.onFailure { finalError = "video finalize failed (${it.javaClass.simpleName}: ${it.message.orEmpty()})" }
        releaseEncoder()
        val bytes = outputFile?.length()?.takeIf { it > 0L } ?: encodedBytes
        listener(VideoProgress(lastPtsUs * NANOS_PER_US, bytes, final = true, error = finalError))
    }

    /** Returns true after the encoder's end-of-stream buffer. */
    private fun drain(
        active: MediaCodec,
        timeoutUs: Long,
    ): Boolean {
        val info = MediaCodec.BufferInfo()
        while (true) {
            val index = active.dequeueOutputBuffer(info, timeoutUs)
            when {
                index == MediaCodec.INFO_TRY_AGAIN_LATER -> return false
                index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                    check(!muxerStarted)
                    track = requireNotNull(muxer).addTrack(active.outputFormat)
                    requireNotNull(muxer).start()
                    muxerStarted = true
                }
                index >= 0 -> {
                    val output = active.getOutputBuffer(index)
                    if (info.size > 0 && muxerStarted && output != null) {
                        output.position(info.offset)
                        output.limit(info.offset + info.size)
                        requireNotNull(muxer).writeSampleData(track, output, info)
                        encodedBytes += info.size
                        listener(VideoProgress(info.presentationTimeUs * NANOS_PER_US, encodedBytes))
                    }
                    active.releaseOutputBuffer(index, false)
                    if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) return true
                }
            }
        }
    }

    private fun fail(
        prefix: String,
        cause: Throwable,
    ) {
        failure = "$prefix (${cause.javaClass.simpleName}: ${cause.message.orEmpty()})"
        releaseEncoder()
        listener(VideoProgress(lastPtsUs * NANOS_PER_US, encodedBytes, final = true, error = failure))
    }

    private fun releaseEncoder() {
        runCatching { codec?.stop() }
        runCatching { codec?.release() }
        if (muxerStarted) runCatching { muxer?.stop() }
        runCatching { muxer?.release() }
        codec = null
        muxer = null
        muxerStarted = false
        track = -1
    }
}

private fun copyImage(
    source: ImageProxy,
    target: Image,
) {
    source.planes.zip(target.planes).forEachIndexed { index, (from, to) ->
        val width = if (index == 0) source.width else (source.width + 1) / 2
        val height = if (index == 0) source.height else (source.height + 1) / 2
        copyPlane(from.buffer, from.rowStride, from.pixelStride, to.buffer, to.rowStride, to.pixelStride, width, height)
    }
}

@Suppress("LongParameterList")
private fun copyPlane(
    sourceBuffer: ByteBuffer,
    sourceRowStride: Int,
    sourcePixelStride: Int,
    targetBuffer: ByteBuffer,
    targetRowStride: Int,
    targetPixelStride: Int,
    width: Int,
    height: Int,
) {
    val source = sourceBuffer.duplicate()
    val target = targetBuffer.duplicate()
    if (sourcePixelStride == targetPixelStride) {
        val span = (width - 1) * sourcePixelStride + 1
        val row = ByteArray(span)
        repeat(height) { y ->
            source.position(y * sourceRowStride)
            source.get(row)
            target.position(y * targetRowStride)
            target.put(row)
        }
        return
    }
    repeat(height) { y ->
        repeat(width) { x ->
            target.put(y * targetRowStride + x * targetPixelStride, source.get(y * sourceRowStride + x * sourcePixelStride))
        }
    }
}

private fun frameBytes(
    width: Int,
    height: Int,
): Int = width * height * YUV_BYTES_NUMERATOR / YUV_BYTES_DENOMINATOR
