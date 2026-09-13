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

/** The minimum useful recording size. Smaller video is never silently accepted as training input. */
const val MIN_VIDEO_WIDTH = 2560
const val MIN_VIDEO_HEIGHT = 1440

private const val VIDEO_MIME = MediaFormat.MIMETYPE_VIDEO_AVC

/**
 * What a GAME records at: 30 Mbit/s since 2026-09-13, up from 20.
 *
 * The corpus was never uniform — the recordings on disk measure 8,1 to 19,6 Mbit/s and nothing
 * wrote the number down. 30 Mbit/s at 1440p and the 15 fps the device really runs is 0,543 bit/px;
 * `session.yaml` now states what a run got. Capture asks its own rate via [CameraVideo.bitRate].
 */
const val DEFAULT_VIDEO_BIT_RATE = 30_000_000

/** Only the fallback for [CameraVideo.frameRate] — the camera request sets the real one. */
private const val VIDEO_FRAME_RATE = 30

private const val VIDEO_I_FRAME_SECONDS = 1

/**
 * How much footage a killed process may cost.
 *
 * An MP4's index (`moov`) is written when the muxer is CLOSED, so a recording that is still running
 * is a file no decoder can open. Measured 2026-08-13: four of eleven transferred recordings — 1.99 GB
 * — had `ftyp` and `mdat` and no `moov`, and Android's own exit log names the killer:
 * `reason=16 (PACKAGE UPDATED)`, i.e. installing a new build over a running recording. A SIGKILL
 * from the package manager runs no callback, so nothing can be finalised on the way out; the only
 * defence is to have finalised already. One minute of QHD is ~150 MB, and the muxer swap happens on
 * an encoder sync frame, so nothing is re-encoded and no frame is lost between segments.
 */
private const val SEGMENT_SECONDS = 60L
private const val US_PER_SECOND = 1_000_000L
private const val STOP_TIMEOUT_MS = 1500L
private const val CODEC_TIMEOUT_US = 100_000L
private const val NANOS_PER_US = 1000L
private const val TAG = "chesslabVideo"
private const val BYTES_PER_MB = 1024L * 1024L

/**
 * How often the ARMED ring reports its depth to logcat.
 *
 * The armed phase has no session, so `RecordingBundleHost`'s progress rows are dropped on a null
 * timeline and no file records them: between the arm and the first commit the pre-roll is
 * invisible. Measured on the phone 2026-08-14 (session `20260814-142947`): the finished recording
 * carried ~1.4 s ahead of the commit where 20 were due, and nothing in it could say WHEN the
 * encoder was armed. This line is what makes the next run answer that without forensics.
 */
private const val ARMED_LOG_INTERVAL_MS = 5000L
private const val YUV_BYTES_NUMERATOR = 3
private const val YUV_BYTES_DENOMINATOR = 2

data class VideoProgress(
    val durationNs: Long,
    val bytes: Long,
    val final: Boolean = false,
    val error: String? = null,
)

/**
 * The video seam, as its ONE consumer (`RecordingBundleHost`) sees it.
 *
 * Arming has an owner, and it is the recorder — not the encoder's own callbacks (double "armed",
 * 2026-08-14). Naming the seam is what lets that be driven on the JVM, against a fake that counts
 * who armed what.
 */
interface VideoRecorderPort {
    val videoResolution: DeliveredSize?

    val videoFailure: String?

    val videoSegments: Int

    val videoPreRollNs: Long

    /** bit/s asked for, and what the encoder took — `session.yaml` states both. */
    val videoBitRateRequested: Int

    val videoBitRate: Int

    fun startVideo(
        maxBytes: Long,
        onProgress: (VideoProgress) -> Unit,
    ): Boolean

    fun keepVideo(file: File)

    fun stopVideo()
}

/**
 * Encodes the same QHD YUV frames that feed the tracker.
 *
 * This phone exposes no CameraX QHD Recorder profile and cannot bind VideoCapture beside
 * ImageAnalysis. A second camera owner would be incorrect, so the one analyzer stream is copied
 * into a hardware AVC encoder. `MediaCodec.getInputImage()` exposes the encoder's actual plane
 * layout, avoiding assumptions about planar versus semi-planar chroma.
 *
 * A recording starts ARMED: the encoder runs but the muxer is never opened -- encoded samples go
 * into a [PreRollRing] instead, capped at [PRE_ROLL_SECONDS] and [PRE_ROLL_MAX_BYTES]. Only
 * [keep] (the first committed move) names a file, opens the muxer and writes the buffered
 * samples with their PTS rebased to zero; from there the recording runs live exactly as before,
 * minute-segment rotation included. A run that is never kept writes NOTHING -- board setup,
 * marker taping and calibration were nine of eleven transferred recordings (4.7 GB) on
 * 2026-08-13/14, and this is the mechanism that keeps them off the disk.
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

    /** The encoder's own output format, kept so a NEW muxer can be given the same track. */
    private var trackFormat: MediaFormat? = null
    private var segment = 0
    private var segmentStartUs = 0L

    /** The flush's rebase origin in raw PTS -- every written timestamp and duration subtracts it. */
    private var originUs = 0L

    /** Non-null while ARMED: samples buffer here until [keep] or until the run ends unkept. */
    private var ring: PreRollRing? = null
    private var kept = false

    /** Reused: one `BufferInfo` per sample would be 30 allocations a second for a rebased time. */
    private val segmentInfo = MediaCodec.BufferInfo()

    /** How many files this recording is spread over — 1 until the first rotation. */
    val segments: Int
        @Synchronized get() = segment + 1

    @Volatile
    var resolution: DeliveredSize? = null
        private set

    @Volatile
    var failure: String? = null
        private set

    /**
     * The footage that actually preceded the first committed move, as flushed.
     *
     * The recording's own answer to "did the pre-roll survive?" — it reaches `session.yaml` as
     * `video_pre_roll_ns`. Zero means the ring was armed at the commit, not before it.
     */
    @Volatile
    var preRollUs: Long = 0L
        private set

    private var lastArmedLogMs = 0L

    /** Returns true only when a newly available source size should be published to the session. */
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
        resolution = delivered
        failure = null
        return true
    }

    /**
     * The encoder's rate-control hint, set from the camera request.
     *
     * `KEY_BIT_RATE` is per SECOND and the encoder spends it per FRAME, so a 15 fps stream told 30
     * budgets half of it away — the recording is training material, and half the bits is half the
     * detail the crops are cut from.
     */
    @Volatile
    var frameRate: Int = VIDEO_FRAME_RATE

    /** What the next arm ASKS for. [acceptedBitRate] is what the encoder then agreed to. */
    @Volatile
    var bitRate: Int = DEFAULT_VIDEO_BIT_RATE

    /** What the running encoder was configured with — 0 until an arm succeeded. */
    @Volatile
    var acceptedBitRate: Int = 0
        private set

    /** Every place the device refused what was asked for. Empty means it took it all. */
    @Volatile
    var profileNotes: List<String> = emptyList()
        private set

    /** Arms the encoder. No file and no muxer exist until [keep] -- see the class KDoc. */
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
        ring = PreRollRing(PRE_ROLL_SECONDS * US_PER_SECOND, PRE_ROLL_MAX_BYTES)
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
            codec =
                encoder.apply {
                    configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
                    start()
                }
            Log.i(
                TAG,
                "armed at ${size.width}x${size.height} @ $frameRate fps, $agreed bit/s " +
                    "(asked $bitRate): ${PRE_ROLL_SECONDS}s pre-roll buffering in memory, no file yet",
            )
            true
        }.onFailure { fail("QHD video start failed", it) }.getOrDefault(false)
    }

    /**
     * What this encoder will really do with the asked-for size and rate, and it says so out loud.
     *
     * A rate above the codec's advertised range is not refused by `configure` — it is silently
     * re-interpreted, and the recording then claims a quality it never had. Asking first is what
     * turns that into a line in the log and a note in `capture.json`.
     */
    private fun agreedProfile(
        encoder: MediaCodec,
        size: DeliveredSize,
    ): Int {
        val notes = mutableListOf<String>()
        val caps =
            runCatching { encoder.codecInfo.getCapabilitiesForType(VIDEO_MIME).videoCapabilities }
                .getOrElse {
                    notes += "encoder advertises no video capabilities — asked $bitRate bit/s unchecked"
                    profileNotes = notes
                    return bitRate
                }
        if (!caps.isSizeSupported(size.width, size.height)) {
            notes += "encoder does not advertise ${size.width}x${size.height} (${caps.supportedWidths} x ${caps.supportedHeights})"
        }
        val rates = runCatching { caps.getSupportedFrameRatesFor(size.width, size.height) }.getOrNull()
        if (rates != null && !rates.contains(frameRate.toDouble())) {
            notes += "encoder does not advertise $frameRate fps at ${size.width}x${size.height} (offers $rates)"
        }
        val agreed = bitRate.coerceIn(caps.bitrateRange.lower, caps.bitrateRange.upper)
        if (agreed != bitRate) notes += "bit rate clamped $bitRate -> $agreed by the encoder's range ${caps.bitrateRange}"
        profileNotes = notes
        notes.forEach { Log.w(TAG, it) }
        return agreed
    }

    /**
     * The first committed move: the pre-roll becomes [file] and the recording goes live.
     *
     * Idempotent -- every later commit calls this again and finds it already kept. The muxer may
     * still have to wait for the encoder's output format ([goLive] runs from the format change
     * then), but the decision is latched here.
     */
    @Synchronized
    fun keep(file: File) {
        if (kept || codec == null) return
        kept = true
        outputFile = file
        if (trackFormat != null) goLive()
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
        val bytes = writtenBytes()
        // The duration of what is ON DISK -- an unkept run reports its buffered span and 0 bytes.
        val durationUs = (lastPtsUs - originUs.coerceAtLeast(0L)).coerceAtLeast(0L)
        listener(VideoProgress(durationUs * NANOS_PER_US, bytes, final = true, error = finalError))
    }

    /**
     * EVERY segment, not just `video.mp4`.
     *
     * `outputFile.length()` is segment 0 alone, and it won over the accumulated total — measured on
     * `2026-09-11-20-00-52`: `session.yaml` said 76,7 MB where 761 MB lay on disk in 13 files. Read
     * after [releaseEncoder], so the last muxer has written its index and the lengths are final.
     */
    private fun writtenBytes(): Long {
        if (outputFile == null) return encodedBytes
        val onDisk = (0..segment).sumOf { index -> runCatching { segmentFile(index).length() }.getOrDefault(0L) }
        return onDisk.takeIf { it > 0L } ?: encodedBytes
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

    /** One encoded sample: to the ring while armed, to the muxer once live, dropped in between. */
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

    /**
     * Open the muxer for segment 0 and write the buffered pre-roll, rebased to zero.
     *
     * The flushed samples and the live path share one clock: [originUs] is the ring's first PTS,
     * [segmentStartUs] starts there too, so the first live sample lands exactly one frame after
     * the last buffered one and the minute rotation keeps counting from the file's own zero.
     */
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

    /**
     * Close the current file and open the next one, at a SYNC frame.
     *
     * The swap has to land on a key frame: a segment that begins with a P-frame has nothing to
     * decode against, so its first second would be garbage. The encoder emits one every
     * [VIDEO_I_FRAME_SECONDS], which is why the cut is "at or after the limit" rather than exactly
     * on it — a segment may run up to a second long, and no frame is dropped or duplicated.
     */
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

    /** `video.mp4`, then `video-001.mp4` — the first keeps its name so a short recording is unchanged. */
    private fun segmentFile(index: Int): File {
        val base = requireNotNull(outputFile)
        if (index == 0) return base
        return File(base.parentFile, "%s-%03d.%s".format(base.nameWithoutExtension, index, base.extension))
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
