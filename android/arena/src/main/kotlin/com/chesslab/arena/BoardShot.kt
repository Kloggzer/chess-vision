package com.chesslab.arena

import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.allSquares
import com.chesslab.geometry.squareToCropBox
import org.opencv.core.Mat
import org.opencv.core.Point
import org.opencv.core.Scalar
import org.opencv.imgproc.Imgproc

/**
 * The board as the arena hands it over, with the square grid drawn on top.
 *
 * Written because a coordinate system described in prose is a coordinate system half the readers
 * get backwards: whether `a1` sits bottom-left or top-left decides every index in a tracker, and
 * one look at the picture settles it.
 */
fun annotate(
    board: Mat,
    geom: BoardGeometry,
): Mat {
    val shot = board.clone()
    val scale = shot.cols().toDouble() / geom.boardSize
    for (square in allSquares()) {
        val box = squareToCropBox(square, geom.copy(padSide = 0.0), clamp = true)
        val topLeft = Point(box[0] * scale, box[1] * scale)
        val bottomRight = Point(box[2] * scale, box[3] * scale)
        Imgproc.rectangle(shot, topLeft, bottomRight, GRID, 1)
        if (square in LABELLED) {
            Imgproc.putText(shot, square, Point(topLeft.x + INSET, bottomRight.y - INSET), FONT, FONT_SCALE, LABEL, 2)
        }
    }
    return shot
}

/** The four corners plus one middle square — enough to fix the orientation without hiding the board. */
private val LABELLED = setOf("a1", "h1", "a8", "h8", "e4")

private val GRID = Scalar(0.0, 255.0, 0.0)
private val LABEL = Scalar(0.0, 0.0, 255.0)

private const val FONT = Imgproc.FONT_HERSHEY_SIMPLEX
private const val FONT_SCALE = 0.9
private const val INSET = 6.0
