package com.chesslab.desktop

import com.chesslab.geometry.BoardMarkerDetector
import org.opencv.core.Mat
import java.io.File
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.ExecutorCompletionService
import java.util.concurrent.Executors
import kotlin.math.max
import kotlin.math.min
import kotlin.system.measureNanoTime

/** Raw ArUco detections calculated ahead; smoothing and correction remain ordered in LiveAlign. */
internal class AlignmentMarkerPrepass private constructor(
    private val rows: Map<Long, Map<Int, DoubleArray>>,
) {
    val lookup: (Long) -> Map<Int, DoubleArray> = { frame -> rows[frame] ?: error("marker prepass has no frame $frame") }

    companion object {
        @Suppress("LongMethod", "LongParameterList")
        fun build(
            video: File,
            skipDecoded: Long,
            stride: Int,
            alignEvery: Int,
            detectScale: Double,
            dictionary: String,
        ): AlignmentMarkerPrepass {
            val workers = min(MAX_WORKERS, max(MIN_WORKERS, Runtime.getRuntime().availableProcessors() / 2))
            val executor = Executors.newFixedThreadPool(workers)
            val completed = ExecutorCompletionService<DetectedMarkers>(executor)
            val detectors = ConcurrentLinkedQueue<BoardMarkerDetector>()
            val detectorByThread =
                ThreadLocal.withInitial {
                    BoardMarkerDetector().also(detectors::add)
                }
            val detected = LinkedHashMap<Long, DetectedMarkers>()
            var submitted = 0
            var received = 0
            val elapsed =
                try {
                    measureNanoTime {
                        val selector = PublishedFrameSelector(skipDecoded, stride)
                        // The WHOLE recording, exactly what the replay drives. Opened as a single
                        // `VideoFileSource` this stopped at `video.mp4` and every replay of a
                        // segmented recording died at the first swap: "marker prepass has no frame
                        // 1596" on 2026-08-14, 265 detected frames for a 68 s video.
                        openRecording(video, selector::keep).use { source ->
                            while (true) {
                                val frame = source.next() ?: break
                                while (submitted - received >= workers * QUEUE_PER_WORKER) {
                                    accept(completed.take().get(), detected)
                                    received += 1
                                }
                                val relative = source.currentDecodedIndex - skipDecoded
                                val processed = relative / stride + 1
                                val alignFrame = ((processed + alignEvery - 1) / alignEvery) * alignEvery
                                submit(
                                    completed,
                                    detectorByThread,
                                    frame.clone(),
                                    alignFrame,
                                    source.currentDecodedIndex,
                                    detectScale,
                                    dictionary,
                                )
                                submitted += 1
                            }
                        }
                        while (received < submitted) {
                            accept(completed.take().get(), detected)
                            received += 1
                        }
                    }
                } finally {
                    // A worker that throws must not leave the pool's threads and the native ArUco
                    // detectors standing — `ParallelVisualPrepass` closes the same way.
                    executor.shutdown()
                    detectors.forEach(BoardMarkerDetector::close)
                }
            println(
                "alignment-prepass: ${detected.size} frames on $workers workers in " +
                    "${"%.1f".format(elapsed / NANOS_PER_SECOND)} s",
            )
            return AlignmentMarkerPrepass(detected.mapValues { it.value.markers })
        }

        private fun submit(
            completed: ExecutorCompletionService<DetectedMarkers>,
            detectorByThread: ThreadLocal<BoardMarkerDetector>,
            owned: Mat,
            frame: Long,
            decodedIndex: Long,
            detectScale: Double,
            dictionary: String,
        ) {
            completed.submit {
                try {
                    val markers = detectorByThread.get().detectBoardMarkers(owned, dictionary, detectScale = detectScale)
                    DetectedMarkers(frame, decodedIndex, markers)
                } finally {
                    owned.release()
                }
            }
        }

        private fun accept(
            result: DetectedMarkers,
            rows: MutableMap<Long, DetectedMarkers>,
        ) {
            val previous = rows[result.frame]
            if (previous == null || result.decodedIndex > previous.decodedIndex) rows[result.frame] = result
        }
    }
}

private data class DetectedMarkers(
    val frame: Long,
    val decodedIndex: Long,
    val markers: Map<Int, DoubleArray>,
)

/**
 * Exact copy of CameraFrameBus's publish gate, without materializing skipped frames. It runs on
 * each frame's own PTS (`FrameClock`), NOT `frames x 1000/fps`: against VFR footage the counted
 * model publishes on other frames than the bus does, and LiveAlign then asks for one the prepass
 * never detected — "marker prepass has no frame 9", labelling 143233 on 2026-08-14.
 */
internal class PublishedFrameSelector(
    private val skipDecoded: Long,
    private val stride: Int,
) {
    private var lastPublishedMs = 0L

    fun keep(
        decodedIndex: Long,
        timestampMs: Double,
    ): Boolean {
        if (decodedIndex < skipDecoded || (decodedIndex - skipDecoded) % stride != 0L) return false
        val nowMs = timestampMs.toLong()
        if (nowMs - lastPublishedMs < PREVIEW_INTERVAL_MS) return false
        lastPublishedMs = nowMs
        return true
    }
}

private const val MIN_WORKERS = 2
private const val MAX_WORKERS = 8
private const val QUEUE_PER_WORKER = 2
private const val NANOS_PER_SECOND = 1_000_000_000.0
private const val PREVIEW_INTERVAL_MS = 200L
