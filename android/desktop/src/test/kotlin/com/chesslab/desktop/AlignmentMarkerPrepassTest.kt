package com.chesslab.desktop

import org.bytedeco.ffmpeg.global.avcodec
import org.bytedeco.ffmpeg.global.avutil
import org.bytedeco.javacv.FFmpegFrameRecorder
import org.bytedeco.javacv.Frame
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Scalar
import org.opencv.imgproc.Imgproc
import org.opencv.objdetect.Objdetect
import java.io.File
import java.nio.ByteBuffer

/** Broke twice: only `video.mp4` of a segmented recording was decoded, and the publish gate ran on the
 *  nominal rate instead of PTS. */
class AlignmentMarkerPrepassTest {
    @TempDir
    lateinit var dir: File

    @Test
    fun `the publish gate opens on video time and only for the run's own frames`() {
        val selector = PublishedFrameSelector(skipDecoded = 5, stride = 2)

        assertTrue(selector.keep(5, 300.0), "the first frame of the run publishes: nothing has yet")
        assertFalse(selector.keep(6, 999.0), "off-stride, whatever the clock says")
        assertFalse(selector.keep(9, 499.0), "199 ms after the last publish")
        assertTrue(selector.keep(11, 500.0), "200 ms after it")
    }

    @Test
    fun `every alignment of a labelled two-segment recording is answered`() {
        assertPrepassAnswersEveryAlignment(skipDecoded = 0)
    }

    @Test
    fun `every alignment is answered when a locate run consumed frames first`() {
        assertPrepassAnswersEveryAlignment(skipDecoded = 3)
    }

    /** `fps=` becomes a stride: aligns on a subset while the clock still comes off each decoded PTS. */
    @Test
    fun `every alignment is answered when the run replays at a reduced frame rate`() {
        assertPrepassAnswersEveryAlignment(skipDecoded = 2, stride = 2)
    }

    /** Segment two carries a different marker id, so a row keyed past the boundary can only be from file two. */
    private fun assertPrepassAnswersEveryAlignment(
        skipDecoded: Long,
        stride: Int = 1,
    ) {
        val video = twoSegmentRecording()
        val asked = alignmentRequests(video, skipDecoded, stride)

        val prepass =
            AlignmentMarkerPrepass.build(
                video,
                skipDecoded,
                stride,
                alignEvery = ALIGN_EVERY,
                detectScale = 1.0,
                dictionary = "DICT_4X4_50",
            )

        assertTrue(asked.isNotEmpty(), "the fixture must ask for alignments at all")
        assertTrue(asked.values.any { it >= FIRST_SEGMENT_FRAMES }, "and for some of them past the segment boundary")
        asked.forEach { (frame, decodedIndex) ->
            val marker = if (decodedIndex < FIRST_SEGMENT_FRAMES) FIRST_SEGMENT_MARKER else SECOND_SEGMENT_MARKER
            assertEquals(setOf(marker), prepass.lookup(frame).keys, "align at frame $frame reads the publish at $decodedIndex")
        }
    }

    @Test
    fun `a segmented recording is decoded as one continuous stream`() {
        val video = twoSegmentRecording()

        val seen = ArrayList<Long>()
        val stamps = ArrayList<Double>()
        openRecording(video).use { source ->
            while (source.next() != null) {
                seen.add(source.currentDecodedIndex)
                stamps.add(source.timestampMs)
            }
        }

        assertEquals((0L until TOTAL_FRAMES).toList(), seen)
        assertEquals(stamps.sorted(), stamps, "video time never goes backwards at the swap")
        val gaps = stamps.zipWithNext { a, b -> b - a }
        assertTrue(gaps.max() - gaps.min() > VFR_GAP_SPREAD_MS, "the fixture must be variable-rate or it proves nothing")
    }

    @Test
    fun `the clock carries one frame interval across the seam`() {
        val video = twoSegmentRecording()
        val stamps = ArrayList<Double>()
        openRecording(video).use { source ->
            while (source.next() != null) stamps.add(source.timestampMs)
        }

        val seam = FIRST_SEGMENT_FRAMES
        val lastInterval = stamps[seam - 1] - stamps[seam - 2]
        assertEquals(lastInterval, stamps[seam] - stamps[seam - 1], SEAM_TOLERANCE_MS, "seam gap at $seam: $stamps")
    }

    @Test
    fun `a filtering selector sees the recording's own index and clock`() {
        val video = twoSegmentRecording()
        val unfiltered = ArrayList<Double>()
        openRecording(video).use { source ->
            while (source.next() != null) unfiltered.add(source.timestampMs)
        }

        val asked = LinkedHashMap<Long, Double>()
        val kept = ArrayList<Long>()
        val select = { index: Long, timestampMs: Double ->
            asked[index] = timestampMs
            index % SELECT_EVERY == 0L
        }
        openRecording(video, select).use { source ->
            while (source.next() != null) kept.add(source.currentDecodedIndex)
        }

        assertEquals((0L until TOTAL_FRAMES).toList(), asked.keys.sorted())
        assertEquals(unfiltered, asked.entries.sortedBy { it.key }.map { it.value }, "the same clock the replay reads")
        assertEquals((0L until TOTAL_FRAMES).filter { it % SELECT_EVERY == 0L }, kept)
    }

    @Test
    fun `a failing worker still takes the pool down with it`() {
        val video = twoSegmentRecording()
        val before = poolThreads()

        assertThrows(Exception::class.java) {
            AlignmentMarkerPrepass.build(video, 0, 1, ALIGN_EVERY, 1.0, "DICT_NOT_A_DICTIONARY")
        }

        val deadline = System.nanoTime() + SHUTDOWN_WAIT_MS * 1_000_000L
        while (System.nanoTime() < deadline && (poolThreads() - before).isNotEmpty()) Thread.sleep(SHUTDOWN_POLL_MS)
        assertEquals(emptySet<String>(), poolThreads() - before, "the worker pool outlived the failure")
    }

    private fun poolThreads(): Set<String> =
        Thread
            .getAllStackTraces()
            .keys
            .filter { it.isAlive && it.name.startsWith("pool-") }
            .map { it.name }
            .toSet()

    @Test
    fun `a frame the run never aligns on is not invented`() {
        val video = twoSegmentRecording()
        val prepass =
            AlignmentMarkerPrepass.build(video, 0, 1, ALIGN_EVERY, 1.0, "DICT_4X4_50")

        assertThrows(IllegalStateException::class.java) { prepass.lookup(TOTAL_FRAMES * 2) }
    }

    private fun alignmentRequests(
        video: File,
        skipDecoded: Long,
        stride: Int,
    ): Map<Long, Long> {
        val asks = AlignmentAsks(skipDecoded, stride)
        openRecording(video).use { source ->
            repeat(skipDecoded.toInt()) { source.next() }
            while (source.next() != null) asks.onFrame(source.currentDecodedIndex, source.timestampMs.toLong())
        }
        return asks.asked
    }

    private fun twoSegmentRecording(): File {
        val video = segment("video.mp4", FIRST_SEGMENT_FRAMES, FIRST_SEGMENT_MARKER)
        segment("video-001.mp4", SECOND_SEGMENT_FRAMES, SECOND_SEGMENT_MARKER)
        return video
    }

    /** Losslessly encoded on an IRREGULAR subset of the nominal grid — the only fixture on which a nominal-rate
     *  publish model and a PTS one disagree. */
    private fun segment(
        name: String,
        frames: Int,
        markerId: Int,
    ): File {
        NativeCv.require()
        val file = File(dir, name)
        val frame = markerFrame(markerId)
        val recorder =
            FFmpegFrameRecorder(file, CANVAS_PX, CANVAS_PX).apply {
                format = "mp4"
                videoCodec = avcodec.AV_CODEC_ID_H264
                pixelFormat = avutil.AV_PIX_FMT_YUV420P
                frameRate = NOMINAL_FPS
                videoQuality = 0.0
                start()
            }
        try {
            var slot = 0L
            repeat(frames) { i ->
                recorder.timestamp = slot * MICROS_PER_SLOT
                recorder.record(frame)
                slot += SLOT_GAPS[i % SLOT_GAPS.size]
            }
        } finally {
            recorder.stop()
            recorder.release()
            frame.close()
        }
        return file
    }

    private fun markerFrame(markerId: Int): Frame {
        val canvas = Mat(CANVAS_PX, CANVAS_PX, CvType.CV_8UC3, Scalar(WHITE, WHITE, WHITE))
        val marker = Mat()
        Objdetect.generateImageMarker(Objdetect.getPredefinedDictionary(Objdetect.DICT_4X4_50), markerId, MARKER_PX, marker)
        val bgr = Mat()
        Imgproc.cvtColor(marker, bgr, Imgproc.COLOR_GRAY2BGR)
        bgr.copyTo(canvas.submat(MARKER_INSET, MARKER_INSET + MARKER_PX, MARKER_INSET, MARKER_INSET + MARKER_PX))
        val bytes = ByteArray(CANVAS_PX * CANVAS_PX * BGR_CHANNELS)
        canvas.get(0, 0, bytes)
        marker.release()
        bgr.release()
        canvas.release()
        return Frame(CANVAS_PX, CANVAS_PX, Frame.DEPTH_UBYTE, BGR_CHANNELS).also {
            (it.image[0] as ByteBuffer).put(bytes).rewind()
        }
    }
}

/** [asked] maps the frame an alignment happens on to the decoded index of the publish it reads. An alignment
 *  with no fresh sample since the last one exits early and asks the prepass nothing. */
private class AlignmentAsks(
    private val skipDecoded: Long,
    private val stride: Int,
) {
    val asked = LinkedHashMap<Long, Long>()
    private var lastPublishedMs = 0L
    private var pending: Long? = null
    private var frames = 0L

    fun onFrame(
        decodedIndex: Long,
        nowMs: Long,
    ) {
        if ((decodedIndex - skipDecoded) % stride != 0L) return
        frames += 1
        if (nowMs - lastPublishedMs >= PUBLISH_INTERVAL_MS) {
            lastPublishedMs = nowMs
            pending = decodedIndex
        }
        if (frames % ALIGN_EVERY != 0L) return
        pending?.let { asked[frames] = it }
        pending = null
    }
}

private const val FIRST_SEGMENT_FRAMES = 20
private const val SECOND_SEGMENT_FRAMES = 12
private const val TOTAL_FRAMES = (FIRST_SEGMENT_FRAMES + SECOND_SEGMENT_FRAMES).toLong()
private const val FIRST_SEGMENT_MARKER = 0
private const val SECOND_SEGMENT_MARKER = 1

private const val ALIGN_EVERY = 3

private const val PUBLISH_INTERVAL_MS = 200L
private const val SELECT_EVERY = 4L
private const val NOMINAL_FPS = 30.0
private const val MICROS_PER_SLOT = 33_334L
private val SLOT_GAPS = listOf(1, 1, 2)
private const val VFR_GAP_SPREAD_MS = 20.0
private const val SEAM_TOLERANCE_MS = 1.0
private const val CANVAS_PX = 240
private const val MARKER_PX = 96
private const val MARKER_INSET = 72
private const val BGR_CHANNELS = 3
private const val WHITE = 255.0
private const val SHUTDOWN_WAIT_MS = 5_000L
private const val SHUTDOWN_POLL_MS = 20L
