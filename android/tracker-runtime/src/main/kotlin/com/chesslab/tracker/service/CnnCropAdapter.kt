package com.chesslab.tracker.service

import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import com.chesslab.geometry.BoardGeometry
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
    geometry: () -> BoardGeometry,
): CnnFrameSource =
    CnnFrameSource {
        val pending = store.take()
        if (pending == null) {
            store.request()
            null
        } else {
            WorkProfiler.span(WorkOperation.CNN_CROP, pending.seq) {
                pending.cached?.let { cached ->
                    WorkProfiler.cache(WorkOperation.CNN_CROP, hit = true, input = pending.seq)
                    return@span CnnFrame(
                        emptyList(),
                        pending.seq,
                        pending.tsMs,
                        pending.bgrDet,
                        pending.grayDet,
                        cached.gridOccluded,
                        cached.observation,
                    )
                }
                WorkProfiler.cache(WorkOperation.CNN_CROP, hit = false, input = pending.seq)
                val geom = geometry()
                val cropWarp = requireNotNull(pending.cropWarp)
                val squares = allSquares()
                val cropOne = { square: String ->
                    val crop = cropSquare(cropWarp, square, geom)
                    try {
                        toBgrImage(crop)
                    } finally {
                        crop.release()
                    }
                }
                val visual =
                    if (parallel) {
                        val grid =
                            CompletableFuture.supplyAsync {
                                gridOccludedSquares(cropWarp, geom, cropBorderPx(geom), parallel = true)
                            }
                        // Each task reads the immutable board warp and owns its output Mat. The
                        // ordered stream collector keeps a1..h8 byte-for-byte aligned with the
                        // phone even though independent squares are resized on separate PC cores.
                        squares.parallelStream().map(cropOne).toList() to grid.join()
                    } else {
                        val crops =
                            SquareCropper().use { cropper ->
                                squares.map { square -> toBgrImage(cropper.crop(cropWarp, square, geom)) }
                            }
                        crops to
                            gridOccludedSquares(
                                cropWarp,
                                geom,
                                cropBorderPx(geom),
                                parallel = true,
                            )
                    }
                WorkProfiler.bytes(WorkOperation.CNN_CROP, visual.first.sumOf { it.data.size }.toLong(), pending.seq)
                // The model-free hand read, on the SAME full-resolution warp the crops came from —
                // at detSize the grooves are 1-2 px and the read drowns in noise (GridOcclusion.kt).
                cropWarp.release()
                CnnFrame(visual.first, pending.seq, pending.tsMs, pending.bgrDet, pending.grayDet, visual.second)
            }
        }
    }
