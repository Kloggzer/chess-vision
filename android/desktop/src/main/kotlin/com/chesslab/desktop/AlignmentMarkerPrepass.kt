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
            fps: Double,
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
                measureNanoTime {
                    val selector = PublishedFrameSelector(skipDecoded, stride, fps)
                    VideoFileSource(video, selector::keep).use { source ->
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
            executor.shutdown()
            detectors.forEach(BoardMarkerDetector::close)
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

/** Exact copy of CameraFrameBus's video-time publish gate, without materializing skipped frames. */
internal class PublishedFrameSelector(
    private val skipDecoded: Long,
    private val stride: Int,
    private val fps: Double,
) {
    private var lastPublishedMs = 0L

    fun keep(decodedIndex: Long): Boolean {
        if (decodedIndex < skipDecoded || (decodedIndex - skipDecoded) % stride != 0L) return false
        val relative = decodedIndex - skipDecoded
        val nowMs = (((relative + 1) * MILLIS_PER_SECOND) / fps).toLong()
        val due = nowMs - lastPublishedMs >= PREVIEW_INTERVAL_MS
        if (due) lastPublishedMs = nowMs
        return due
    }
}

private const val MIN_WORKERS = 2
private const val MAX_WORKERS = 8
private const val QUEUE_PER_WORKER = 2
private const val NANOS_PER_SECOND = 1_000_000_000.0
private const val MILLIS_PER_SECOND = 1000.0
private const val PREVIEW_INTERVAL_MS = 200L
