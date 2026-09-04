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

/**
 * 05b's `CropFrameStore` as 05c's `CnnFrameSource`.
 *
 * `take()` runs on the OBSERVER thread, so cutting 64 crops out of the bordered warp costs the
 * analyzer nothing; the pipeline only produced the warp because [CropFrameStore.wantsFrame] said
 * so. When there is nothing pending the adapter asks for one and returns null — that request is
 * what makes the next frame do the expensive full-resolution warp, once.
 *
 * The warp is released here: ownership transfers out of the store with `take()`.
 */
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
            // Der Release gehoert ins finally: wirft eine der Stufen, faengt `CnnObserver.observe`
            // sie und macht weiter — beide nativen Warps blieben je Fehlschlag liegen.
            try {
                cropFrame(pending, parallel, runGridOcclusion, clahe)
            } finally {
                pending.release()
            }
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
        val visual =
            // `clahe == null` ist die Bedingung und keine Vorsicht: [CropClahe] haelt
            // Scratch-Mats und einen CLAHE-Handle, beides Ein-Besitzer. Der parallele Pfad
            // ist ohnehin Desktop-only, also kostet der sequentielle Rueckfall dort Zeit
            // und hier nichts.
            if (parallel && clahe == null) {
                val grid =
                    if (runGridOcclusion) {
                        CompletableFuture.supplyAsync {
                            gridOccludedSquares(gridWarp, gridGeom, cropBorderPx(gridGeom), parallel = true)
                        }
                    } else {
                        null
                    }
                // Each task reads the immutable board warp and owns its output Mat. The
                // ordered stream collector keeps a1..h8 byte-for-byte aligned with the
                // phone even though independent squares are resized on separate PC cores.
                squares.parallelStream().map(cropOne).toList() to (grid?.join() ?: 0L)
            } else {
                val crops =
                    SquareCropper().use { cropper ->
                        squares.map { square ->
                            val crop = cropper.crop(cropWarp, square, geom)
                            clahe?.applyTo(crop)
                            toBgrImage(crop)
                        }
                    }
                val grid =
                    if (runGridOcclusion) {
                        gridOccludedSquares(gridWarp, gridGeom, cropBorderPx(gridGeom), parallel = true)
                    } else {
                        0L
                    }
                crops to grid
            }
        WorkProfiler.bytes(WorkOperation.CNN_CROP, visual.first.sumOf { it.data.size }.toLong(), pending.seq)
        // Models without a coverage output still receive the model-free hand read from
        // this full-resolution warp. Coverage models skip that complete second analysis.
        CnnFrame(visual.first, pending.seq, pending.tsMs, pending.bgrDet, pending.grayDet, visual.second)
    }
