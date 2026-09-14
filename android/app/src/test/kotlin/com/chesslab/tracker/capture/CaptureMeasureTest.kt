package com.chesslab.tracker.capture

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Welches PIXEL zu welchem Feld gehoert. Ohne Bitmap geprueft — `Bitmap.createBitmap` ist im
 * JVM-Test nicht gemockt, und die Annahme, um die es geht, steckt allein in der Boxwahl.
 */
class CaptureMeasureTest {
    /**
     * Der Warp kennt kein `whitePov` (`Warp.kt`: `computeHomography(corners, boardSize, margin)`),
     * die Feldzuordnung schon (`squareToColRow`, 180 Grad gedreht). Steht die Orientierung auf
     * BLACK_BOTTOM, liegt `a8` da, wo bei WHITE_BOTTOM `h1` liegt — eine Messung mit fest
     * verdrahtetem `whitePov = true` misst dann das gespiegelte Feld und labelt die Figur dorthin.
     */
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
