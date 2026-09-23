package com.chesslab.tracker.capture

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Ohne Bitmap: `Bitmap.createBitmap` ist im JVM-Test nicht gemockt, die Annahme steckt in der Boxwahl. */
class CaptureMeasureTest {
    /** Der Warp kennt kein `whitePov`, `squareToColRow` dreht 180 Grad: bei BLACK_BOTTOM liegt `a8`, wo sonst
     *  `h1` liegt, und ein fest verdrahtetes `whitePov = true` misst das gespiegelte Feld. */
    @Test
    fun blackBottomPutsA8WhereWhiteBottomHasH1() {
        val white = squareBoxes(SIZE, whitePov = true)
        val black = squareBoxes(SIZE, whitePov = false)

        assertArrayEquals(white.getValue("h1"), black.getValue("a8"))
        assertArrayEquals(white.getValue("a8"), black.getValue("h1"))
    }

    @Test
    fun everySquareGetsItsOwnBox() {
        val boxes = squareBoxes(SIZE, whitePov = true)

        assertEquals(SQUARES, boxes.size)
        assertEquals(
            SQUARES,
            boxes.values
                .map { it.toList() }
                .toSet()
                .size,
        )
    }

    @Test
    fun a8IsTopLeftUnderWhitePov() {
        val box = squareBoxes(SIZE, whitePov = true).getValue("a8")

        assertEquals(0, box[0], "a8 beginnt am linken Rand")
        assertEquals(0, box[1], "a8 beginnt am oberen Rand")
        assertTrue(box[2] > box[0] && box[3] > box[1], box.toList().toString())
    }

    @Test
    fun theBoxIsWiderThanACellBecauseTheCropCarriesItsPadding() {
        """`padSide` 0.05 — dieselbe Box, aus der das Training seine Crops schnitt."""
        val box = squareBoxes(SIZE, whitePov = true).getValue("d4")

        assertTrue(box[2] - box[0] > SIZE / BOARD_SIDE, "Breite ${box[2] - box[0]} <= Zelle ${SIZE / BOARD_SIDE}")
    }
}

private const val SIZE = 256
private const val SQUARES = 64
private const val BOARD_SIDE = 8
