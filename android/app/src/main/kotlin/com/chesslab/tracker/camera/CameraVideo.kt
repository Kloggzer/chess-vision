package com.chesslab.tracker.camera

import android.media.Image
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMuxer
import android.os.SystemClock
import android.util.Log
import androidx.camera.core.ImageProxy
import java.io.File
import java.nio.ByteBuffer
import java.util.Locale
import kotlin.math.roundToInt

const val MIN_VIDEO_WIDTH = 2560
const val MIN_VIDEO_HEIGHT = 1440

private const val VIDEO_MIME = MediaFormat.MIMETYPE_VIDEO_AVC

/** ONE decision for both paths: 1.5x the corpus's 0.362, so 1440p/15 lands on 29.9 Mbit/s (`docs/camera.md`). */
const val BITS_PER_PIXEL = 0.54

private const val MB_BYTES = 1024L * 1024L

/** The floor, where the weakest usable recording on disk already sits (`docs/camera.md`). */
const val MIN_VIDEO_BIT_RATE = 8_000_000

internal fun rawBitRateFor(
    width: Int,
    height: Int,
    fps: Int,
): Int = (width.toDouble() * height * fps * BITS_PER_PIXEL).roundToInt()

/** On the DELIVERED size: asking for 4K on a 1440p stream would buy three times the rate for nothing. */
fun bitRateFor(
    width: Int,
    height: Int,
    fps: Int,
): Int = maxOf(rawBitRateFor(width, height, fps), MIN_VIDEO_BIT_RATE)

private const val VIDEO_FRAME_RATE = 30

private const val VIDEO_I_FRAME_SECONDS = 1

/** An MP4's index is written when the muxer CLOSES: 1.99 GB of recordings once had none (`docs/camera.md`). */
private const val SEGMENT_SECONDS = 60L
private const val US_PER_SECOND = 1_000_000L
private const val STOP_TIMEOUT_MS = 1500L
private const val CODEC_TIMEOUT_US = 100_000L
private const val NANOS_PER_US = 1000L
private const val TAG = "chesslabVideo"
private const val BYTES_PER_MB = 1024L * 1024L

/** The ARMED phase has no session, so without this a short pre-roll could not say when it was armed. */
private const val ARMED_LOG_INTERVAL_MS = 5000L

private const val MAX_REARMS = 3

private const val YUV_BYTES_NUMERATOR = 3
private const val YUV_BYTES_DENOMINATOR = 2

data class VideoProgress(
    val durationNs: Long,
    val bytes: Long,
    val final: Boolean = false,
    val error: String? = null,
)

interface VideoRecorderPort {
    val videoResolution: DeliveredSize?

    val videoFailure: String?

    val videoSegments: Int

    val videoPreRollNs: Long

    val videoBitRateRequested: Int

    val videoBitRate: Int

    fun startVideo(
        maxBytes: Long,
        onProgress: (VideoProgress) -> Unit,
    ): Boolean

    fun keepVideo(file: File)

    fun stopVideo()
}

/** Starts ARMED: an unkept run writes NOTHING, which kept 4.7 GB of setup footage off the disk (`docs/camera.md`). */
@Suppress("TooManyFunctions")
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

    private var trackFormat: MediaFormat? = null
    private var segment = 0
    private var segmentStartUs = 0L

    private var originUs = 0L

    private var ring: PreRollRing? = null
    private var kept = false

    /** Reused: one `BufferInfo` per sample would be 30 allocations a second for a rebased time. */
    private val segmentInfo = MediaCodec.BufferInfo()

    val segments: Int
        @Synchronized get() = segment + 1

    @Volatile
    var resolution: DeliveredSize? = null
        private set

    @Volatile
    var failure: String? = null
        private set

    /** Reaches `session.yaml` as `video_pre_roll_ns`; zero means armed AT the commit (`docs/camera.md`). */
    @Volatile
    var preRollUs: Long = 0L
        private set

    private var lastArmedLogMs = 0L

    private var rearms = 0

    @Suppress("ReturnCount")
    fun sourceAvailable(delivered: DeliveredSize): Boolean {
        val enough =
            maxOf(delivered.width, delivered.height) >= MIN_VIDEO_WIDTH &&
                minOf(delivered.width, delivered.height) >= MIN_VIDEO_HEIGHT
        if (!enough) {
            val error = "QHD video unavailable (CameraX delivered ${delivered.width}x${delivered.height})"
            if (failure == error && resolution == null) return false
            failure = error
            resolution = null
            return true
        }
        rotationDegrees = delivered.rotationDegrees
        if (resolution == delivered && failure == null) return false
        // Clearing a failure re-arms the encoder, and at an unchanged size that used to happen on
        // every frame: a codec the device refuses was retried thirty times a second, for ever.
        if (resolution == delivered && rearms++ >= MAX_REARMS) return false
        if (resolution != delivered) rearms = 0
        resolution = delivered
        failure = null
        return true
    }

    /** `KEY_BIT_RATE` is per SECOND and spent per FRAME: a 15 fps stream told 30 budgets half of it away. */
    @Volatile
    var frameRate: Int = VIDEO_FRAME_RATE

    @Volatile
    var requestedBitRate: Int = 0
        private set

    @Volatile
    var acceptedBitRate: Int = 0
        private set

    @Volatile
    var profileNotes: List<String> = emptyList()
        private set

    @Synchronized
    fun start(
        maxBytes: Long,
        onProgress: (VideoProgress) -> Unit,
    ): Boolean {
        if (codec != null) return false
        val size = resolution ?: return false
        listener = onProgress
        outputFile = null
        this.maxBytes = maxBytes
        encodedBytes = 0L
        startSensorNs = 0L
        lastPtsUs = 0L
        track = -1
        muxerStarted = false
        trackFormat = null
        segment = 0
        segmentStartUs = 0L
        originUs = 0L
        kept = false
        preRollUs = 0L
        lastArmedLogMs = 0L
        val cap = preRollMaxBytes(size.width, size.height, frameRate)
        ring = PreRollRing(PRE_ROLL_SECONDS * US_PER_SECOND, cap)
        return runCatching {
            val encoder = MediaCodec.createEncoderByType(VIDEO_MIME)
            val agreed = agreedProfile(encoder, size)
            acceptedBitRate = agreed
            val format =
                MediaFormat.createVideoFormat(VIDEO_MIME, size.width, size.height).apply {
                    setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible)
                    setInteger(MediaFormat.KEY_BIT_RATE, agreed)
                    setInteger(MediaFormat.KEY_FRAME_RATE, frameRate)
                    setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, VIDEO_I_FRAME_SECONDS)
                }
            // Assigned BEFORE configure/start, because either can throw and [fail] can only
            // release what `codec` holds — a local would leak its native encoder on every attempt.
            codec = encoder
            encoder.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
            encoder.start()
            rearms = 0
            Log.i(
                TAG,
                "armed at ${size.width}x${size.height} @ $frameRate fps, $agreed bit/s " +
                    "(formula $requestedBitRate): pre-roll ${cap / MB_BYTES} MB = " +
                    "${cap * 8L / maxOf(1, agreed)}s of a ${PRE_ROLL_SECONDS}s window, no file yet",
            )
            true
        }.onFailure { fail("QHD video start failed", it) }.getOrDefault(false)
    }

    /** Said out loud: `configure` silently re-interprets a rate above its range instead of refusing it. */
    private fun agreedProfile(
        encoder: MediaCodec,
        size: DeliveredSize,
    ): Int {
        val notes = mutableListOf<String>()
        val raw = rawBitRateFor(size.width, size.height, frameRate)
        val wanted = bitRateFor(size.width, size.height, frameRate)
        requestedBitRate = wanted
        if (wanted != raw) notes += "bit rate floored $raw -> $wanted: ${size.width}x${size.height} @ $frameRate fps is implausibly small"
        val caps =
            runCatching { encoder.codecInfo.getCapabilitiesForType(VIDEO_MIME).videoCapabilities }
                .getOrElse {
                    notes += "encoder advertises no video capabilities — asking $wanted bit/s unchecked"
                    profileNotes = notes
                    notes.forEach { note -> Log.w(TAG, note) }
                    return wanted
                }
        if (!caps.isSizeSupported(size.width, size.height)) {
            notes += "encoder does not advertise ${size.width}x${size.height} (${caps.supportedWidths} x ${caps.supportedHeights})"
        }
        val rates = runCatching { caps.getSupportedFrameRatesFor(size.width, size.height) }.getOrNull()
        if (rates != null && !rates.contains(frameRate.toDouble())) {
            notes += "encoder does not advertise $frameRate fps at ${size.width}x${size.height} (offers $rates)"
        }
        val agreed = wanted.coerceIn(caps.bitrateRange.lower, caps.bitrateRange.upper)
        if (agreed != wanted) notes += "bit rate clamped $wanted -> $agreed by the encoder's range ${caps.bitrateRange}"
        profileNotes = notes
        notes.forEach { Log.w(TAG, it) }
        return agreed
    }

    /** Idempotent; the decision latches even when [goLive] must wait for the output format. */
    @Synchronized
    fun keep(file: File) {
        if (kept || codec == null) return
        kept = true
        outputFile = file
        if (trackFormat != null) goLive()
    }

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
        val bytes = writtenBytes()
        // The duration of what is ON DISK -- an unkept run reports its buffered span and 0 bytes.
        val durationUs = (lastPtsUs - originUs.coerceAtLeast(0L)).coerceAtLeast(0L)
        listener(VideoProgress(durationUs * NANOS_PER_US, bytes, final = true, error = finalError))
    }

    /** EVERY segment: segment 0 alone reported 76.7 MB where 761 MB lay in 13 files. After [releaseEncoder]. */
    private fun writtenBytes(): Long {
        if (outputFile == null) return encodedBytes
        val onDisk = (0..segment).sumOf { index -> runCatching { segmentFile(index).length() }.getOrDefault(0L) }
        return onDisk.takeIf { it > 0L } ?: encodedBytes
    }

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
                    trackFormat = active.outputFormat
                    // Armed: no muxer yet. If the keep decision already fell, it was waiting here.
                    if (kept) goLive()
                }
                index >= 0 -> {
                    val output = active.getOutputBuffer(index)
                    if (info.size > 0 && output != null) sample(output, info)
                    active.releaseOutputBuffer(index, false)
                    if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) return true
                }
            }
        }
    }

    private fun sample(
        output: ByteBuffer,
        info: MediaCodec.BufferInfo,
    ) {
        val armed = ring
        output.position(info.offset)
        output.limit(info.offset + info.size)
        if (armed != null && !muxerStarted) {
            // Armed: the sample goes to memory. Bytes 0 -- nothing is on disk, the row must not lie.
            val data = ByteArray(info.size)
            output.get(data)
            armed.add(PreRollSample(data, info.presentationTimeUs, info.flags, info.flags and MediaCodec.BUFFER_FLAG_KEY_FRAME != 0))
            listener(VideoProgress(armed.durationUs * NANOS_PER_US, 0L))
            val now = SystemClock.elapsedRealtime()
            if (now - lastArmedLogMs >= ARMED_LOG_INTERVAL_MS) {
                lastArmedLogMs = now
                Log.d(TAG, "pre-roll holds ${armed.durationUs / US_PER_SECOND}s / ${armed.bytes / BYTES_PER_MB} MB")
            }
            return
        }
        if (!muxerStarted) return
        // Kept before any output existed: the first live sample is the rebase origin itself.
        if (originUs < 0L) {
            originUs = info.presentationTimeUs
            segmentStartUs = info.presentationTimeUs
        }
        rotateIfDue(info)
        // Each segment starts at zero: it is a video in its own right, and a file
        // whose first frame claims minute seven is one no player seeks correctly.
        segmentInfo.set(info.offset, info.size, info.presentationTimeUs - segmentStartUs, info.flags)
        requireNotNull(muxer).writeSampleData(track, output, segmentInfo)
        encodedBytes += info.size
        listener(VideoProgress((info.presentationTimeUs - originUs) * NANOS_PER_US, encodedBytes))
    }

    /** Flushed and live samples share one clock, rebased to zero, so nothing overlaps at the seam. */
    private fun goLive() {
        val format = trackFormat ?: return
        val file = requireNotNull(outputFile)
        val armed = ring
        file.parentFile?.mkdirs()
        file.delete()
        originUs = armed?.firstPtsUs ?: -1L
        segmentStartUs = originUs
        muxer =
            MediaMuxer(file.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4).apply {
                setOrientationHint(rotationDegrees)
                track = addTrack(format)
                start()
            }
        muxerStarted = true
        val flushed = armed?.flush().orEmpty()
        preRollUs = if (flushed.size < 2) 0L else flushed.last().ptsUs - flushed.first().ptsUs
        flushed.forEach { sample ->
            segmentInfo.set(0, sample.data.size, sample.ptsUs, sample.flags)
            requireNotNull(muxer).writeSampleData(track, ByteBuffer.wrap(sample.data), segmentInfo)
            encodedBytes += sample.data.size
        }
        Log.i(TAG, "live: ${flushed.size} buffered samples written, ${preRollUs / US_PER_SECOND}s of pre-roll ahead of the commit")
        ring = null
    }

    private fun fail(
        prefix: String,
        cause: Throwable,
    ) {
        failure = "$prefix (${cause.javaClass.simpleName}: ${cause.message.orEmpty()})"
        releaseEncoder()
        listener(VideoProgress(lastPtsUs * NANOS_PER_US, encodedBytes, final = true, error = failure))
    }

    /** At a SYNC frame, hence "at or after the limit": no frame dropped or duplicated (`docs/camera.md`). */
    private fun rotateIfDue(info: MediaCodec.BufferInfo) {
        val sync = info.flags and MediaCodec.BUFFER_FLAG_KEY_FRAME != 0
        if (!sync || info.presentationTimeUs - segmentStartUs < SEGMENT_SECONDS * US_PER_SECOND) return
        val format = trackFormat ?: return
        // `stop()` is what writes the index; without it this file would be exactly the unreadable
        // thing this whole mechanism exists to prevent.
        requireNotNull(muxer).stop()
        requireNotNull(muxer).release()
        segment++
        segmentStartUs = info.presentationTimeUs
        muxer =
            MediaMuxer(segmentFile(segment).absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4).apply {
                setOrientationHint(rotationDegrees)
                track = addTrack(format)
                start()
            }
    }

    private fun segmentFile(index: Int): File {
        val base = requireNotNull(outputFile)
        if (index == 0) return base
        return File(base.parentFile, "%s-%03d.%s".format(Locale.ROOT, base.nameWithoutExtension, index, base.extension))
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
        // An unkept ring dies HERE, with nothing on disk -- the kill semantics, on the orderly path.
        ring = null
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
