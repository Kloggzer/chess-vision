package com.chesslab.desktop.testutil

import com.chesslab.desktop.FrameSource
import com.chesslab.tracker.camera.DeliveredSize
import org.opencv.core.Mat

/** Fuer Tests, die nur METADATEN brauchen (die Cache-Signatur etwa). */
internal object StillSource : FrameSource {
    override fun next(): Mat? = null

    override val delivered = DeliveredSize(1920, 1080, 0)

    override val fps = 30.0

    override fun close() = Unit
}
