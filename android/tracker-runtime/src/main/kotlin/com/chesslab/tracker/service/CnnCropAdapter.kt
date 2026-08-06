package com.chesslab.tracker.service

import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.allSquares
import com.chesslab.geometry.cropSquare
import com.chesslab.geometry.toBgrImage
import com.chesslab.tracker.cnn.CnnFrame
import com.chesslab.tracker.cnn.CnnFrameSource
import com.chesslab.tracker.pipeline.CropFrameStore

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
    geometry: () -> BoardGeometry,
): CnnFrameSource =
    CnnFrameSource {
        val pending = store.take()
        if (pending == null) {
            store.request()
            null
        } else {
            val geom = geometry()
            val crops =
                allSquares().map { square ->
                    val crop = cropSquare(pending.cropWarp, square, geom)
                    val image = toBgrImage(crop)
                    crop.release()
                    image
                }
            pending.cropWarp.release()
            CnnFrame(crops, pending.seq, pending.tsMs, pending.bgrDet, pending.grayDet)
        }
    }
