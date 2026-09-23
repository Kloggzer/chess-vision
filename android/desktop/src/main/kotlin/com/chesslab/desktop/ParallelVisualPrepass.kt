package com.chesslab.desktop

import com.chesslab.cnn.OccupancyObservation
import com.chesslab.cnn.observationFromProbs
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.allSquares
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.cropBorderPx
import com.chesslab.geometry.cropSquare
import com.chesslab.geometry.gridOccludedSquares
import com.chesslab.geometry.toBgrImage
import com.chesslab.geometry.warpBoardForCrops
import com.chesslab.tracker.cnn.Attached
import com.chesslab.tracker.pipeline.CropFrameStore
import org.opencv.core.Mat
import java.io.File
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.ExecutorCompletionService
import java.util.concurrent.Executors
import kotlin.system.measureNanoTime

/** One FFmpeg producer, bounded workers for crop warp, crops, grid read and ONNX; the tracker consumes rows in
 *  order, so no engine state is speculated. Needs an existing visual cache as the oracle that refuses a result
 *  differing by one probability bit. */
internal class ParallelVisualPrepass private constructor(
    rows: Map<Long, CropFrameStore.CachedVisual>,
) {
    val lookup: (Long) -> CropFrameStore.CachedVisual = { seq -> rows[seq] ?: error("parallel visual prepass has no seq $seq") }

    companion object {
        @Suppress("LongParameterList")
        fun build(
            video: File,
            skipDecoded: Long,
            stride: Int,
            geometry: BoardGeometry,
            initialCorners: FloatArray,
            observationSequences: Set<Long>?,
            alignment: (Long) -> FloatArray?,
            expected: ((Long) -> CropFrameStore.CachedVisual?)?,
            workers: Int,
            openClassifier: () -> Attached,
        ): ParallelVisualPrepass {
            val executor = Executors.newFixedThreadPool(workers)
            val completed = ExecutorCompletionService<VisualRow>(executor)
            val attached = ConcurrentLinkedQueue<Attached>()
            val classifierByThread =
                ThreadLocal.withInitial {
                    openClassifier().also(attached::add)
                }
            val rows = HashMap<Long, CropFrameStore.CachedVisual>(observationSequences?.size ?: DEFAULT_ROW_CAPACITY)
            var submitted = 0
            var received = 0
            var corners = initialCorners.copyOf()
            var lastProcessed = 0L
            val selectedSequences = observationSequences?.toHashSet()
            val selector = ObservationFrameSelector(skipDecoded, stride, selectedSequences)
            val elapsed =
                try {
                    measureNanoTime {
                        // The whole recording: a bare `VideoFileSource` sees only its first segment.
                        openRecording(video) { index, _ -> selector.keep(index) }.use { source ->
                            while (true) {
                                val frame = source.next() ?: break
                                val processed = (source.currentDecodedIndex - skipDecoded) / stride + 1
                                while (lastProcessed < processed - 1) {
                                    lastProcessed += 1
                                    alignment(lastProcessed)?.let { corners = it }
                                }
                                while (submitted - received >= workers * QUEUE_FACTOR) {
                                    accept(completed.take().get(), rows, expected)
                                    received += 1
                                }
                                submit(completed, classifierByThread, frame.clone(), processed, geometry, corners.copyOf())
                                submitted += 1
                                lastProcessed = processed
                                alignment(processed)?.let { corners = it }
                            }
                        }
                        while (received < submitted) {
                            accept(completed.take().get(), rows, expected)
                            received += 1
                        }
                    }
                } finally {
                    executor.shutdownNow()
                    attached.forEach { it.classifier.close() }
                }
            observationSequences?.let {
                check(rows.keys == it) {
                    "parallel visual prepass produced ${rows.size} rows for ${it.size} expected sequences"
                }
            }
            System.err.println(
                "parallel-visual: ${rows.size} observations on $workers workers in " +
                    "${"%.1f".format(elapsed / NANOS_PER_SECOND)} s (bounded queue ${workers * QUEUE_FACTOR})",
            )
            return ParallelVisualPrepass(rows)
        }

        private fun submit(
            completed: ExecutorCompletionService<VisualRow>,
            classifierByThread: ThreadLocal<Attached>,
            owned: Mat,
            seq: Long,
            geometry: BoardGeometry,
            corners: FloatArray,
        ) {
            completed.submit {
                try {
                    val warp = warpBoardForCrops(owned, geometry, cornersFromFlat(corners))
                    try {
                        val crops =
                            allSquares().map { square ->
                                val crop = cropSquare(warp, square, geometry)
                                try {
                                    toBgrImage(crop)
                                } finally {
                                    crop.release()
                                }
                            }
                        val classifier = classifierByThread.get().classifier
                        val observation = observationFromProbs(classifier.classify(crops), classifier.classes)
                        val grid = gridOccludedSquares(warp, geometry, cropBorderPx(geometry), parallel = false)
                        VisualRow(seq, CropFrameStore.CachedVisual(observation, grid))
                    } finally {
                        warp.release()
                    }
                } finally {
                    owned.release()
                }
            }
        }

        private fun accept(
            row: VisualRow,
            rows: MutableMap<Long, CropFrameStore.CachedVisual>,
            expected: ((Long) -> CropFrameStore.CachedVisual?)?,
        ) {
            expected?.let { oracle ->
                val baseline = requireNotNull(oracle(row.seq)) { "baseline visual cache has no seq ${row.seq}" }
                check(sameVisual(row.visual, baseline)) { "parallel visual result differs from baseline at seq ${row.seq}" }
            }
            check(rows.put(row.seq, row.visual) == null) { "duplicate parallel visual seq ${row.seq}" }
        }
    }
}

internal class ObservationFrameSelector(
    private val skipDecoded: Long,
    private val stride: Int,
    private val observations: Set<Long>?,
) {
    fun keep(decodedIndex: Long): Boolean {
        if (decodedIndex < skipDecoded || (decodedIndex - skipDecoded) % stride != 0L) return false
        val processed = (decodedIndex - skipDecoded) / stride + 1
        return if (observations == null) processed % OBSERVATION_STRIDE == 0L else observations.contains(processed)
    }
}

private data class VisualRow(
    val seq: Long,
    val visual: CropFrameStore.CachedVisual,
)

@Suppress("ReturnCount")
private fun sameVisual(
    actual: CropFrameStore.CachedVisual,
    expected: CropFrameStore.CachedVisual,
): Boolean {
    if (actual.gridOccluded != expected.gridOccluded) return false
    val a = actual.observation as? OccupancyObservation ?: return false
    val e = expected.observation as? OccupancyObservation ?: return false
    return allSquares().all { square ->
        a.pOcc.getValue(square).toRawBits() == e.pOcc.getValue(square).toRawBits() &&
            a.pEmpty.getValue(square).toRawBits() == e.pEmpty.getValue(square).toRawBits() &&
            a.pOccluded.getValue(square).toRawBits() == e.pOccluded.getValue(square).toRawBits() &&
            a.label?.get(square) == e.label?.get(square) &&
            a.conf?.get(square)?.toRawBits() == e.conf?.get(square)?.toRawBits() &&
            a.runnerUpConf?.get(square)?.toRawBits() == e.runnerUpConf?.get(square)?.toRawBits()
    }
}

private const val QUEUE_FACTOR = 2
private const val NANOS_PER_SECOND = 1_000_000_000.0
private const val OBSERVATION_STRIDE = 2L
private const val DEFAULT_ROW_CAPACITY = 4096
