package com.chesslab.tracker.service

import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import com.chesslab.geometry.CropClahe
import com.chesslab.geometry.SquareCropper
import com.chesslab.geometry.allSquares
import com.chesslab.geometry.cropBorderPx
import com.chesslab.geometry.cropSquare
import com.chesslab.geometry.gridOccludedSquares
import com.chesslab.geometry.toBgrImage
import com.chesslab.tracker.cnn.CnnFrame
import com.chesslab.tracker.cnn.CnnFrameSource
import com.chesslab.tracker.pipeline.CropFrameStore
import java.util.concurrent.CompletableFuture

/** `take()` runs on the OBSERVER thread, so the 64 crops cost the analyzer nothing. With nothing pending it
 *  requests one and returns null: that makes the next frame do the full warp, once. It releases the warp. */
fun cropFrameSource(
    store: CropFrameStore,
    parallel: Boolean = false,
    runGridOcclusion: Boolean = true,
    clahe: CropClahe? = null,
): CnnFrameSource =
    CnnFrameSource {
        val pending = store.take()
        if (pending == null) {
            store.request()
            null
        } else {
            // Release when the LAST reader is done: the grid read may still run on the warp after the cut.
            val frame =
                try {
                    cropFrame(pending, parallel, runGridOcclusion, clahe)
                } catch (e: Throwable) {
                    pending.release()
                    throw e
                }
            if (frame.gridOccludedAsync == null) pending.release()
            frame
        }
    }

private fun cropFrame(
    pending: CropFrameStore.Pending,
    parallel: Boolean,
    runGridOcclusion: Boolean,
    clahe: CropClahe?,
): CnnFrame =
    WorkProfiler.span(WorkOperation.CNN_CROP, pending.seq) {
        pending.cached?.let { cached ->
            WorkProfiler.cache(WorkOperation.CNN_CROP, hit = true, input = pending.seq)
            return@span CnnFrame(
                emptyList(),
                pending.seq,
                pending.tsMs,
                pending.bgrDet,
                pending.grayDet,
                if (runGridOcclusion) cached.gridOccluded else 0L,
                cached.observation,
            )
        }
        WorkProfiler.cache(WorkOperation.CNN_CROP, hit = false, input = pending.seq)
        val geom = pending.geometry
        val cropWarp = requireNotNull(pending.cropWarp)
        val gridWarp = pending.grid?.warp ?: cropWarp
        val gridGeom = pending.grid?.geometry ?: geom
        val squares = allSquares()
        val cropOne = { square: String ->
            val crop = cropSquare(cropWarp, square, geom)
            try {
                // Vor der Normalisierung und je Zelle — genau die Reihenfolge des Trainings.
                clahe?.applyTo(crop)
                toBgrImage(crop)
            } finally {
                crop.release()
            }
        }
        // Beside the cut and inference; only the CUT stays sequential under CLAHE, whose scratch has one owner.
        val grid =
            if (runGridOcclusion) {
                CompletableFuture.supplyAsync {
                    gridOccludedSquares(gridWarp, gridGeom, cropBorderPx(gridGeom), parallel = true)
                }
            } else {
                null
            }
        val crops =
            if (parallel && clahe == null) {
                // The ordered collector keeps a1..h8 byte-for-byte aligned with the phone.
                squares.parallelStream().map(cropOne).toList()
            } else {
                SquareCropper().use { cropper ->
                    squares.map { square ->
                        val crop = cropper.crop(cropWarp, square, geom)
                        clahe?.applyTo(crop)
                        toBgrImage(crop)
                    }
                }
            }
        WorkProfiler.bytes(WorkOperation.CNN_CROP, crops.sumOf { it.data.size }.toLong(), pending.seq)
        // Coverage models skip this second analysis. The release rides on the future itself.
        val released = grid?.whenComplete { _, _ -> pending.release() }
        CnnFrame(crops, pending.seq, pending.tsMs, pending.bgrDet, pending.grayDet, gridOccludedAsync = released)
    }
