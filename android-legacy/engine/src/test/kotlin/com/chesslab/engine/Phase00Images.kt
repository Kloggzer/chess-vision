package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import kotlin.random.Random

/**
 * Procedural 400x400 (50 px cells) boards for the 2026-07-09 parity regression tests —
 * mirrors the image constructions of tests/test_move_tracker.py (TestStructuralEvidence,
 * TestBaselineOcclusionClassifier, shadow-destination tests).
 */
internal object Phase00Images {
    const val BS = 400

    fun flatGray(v: Int): GrayImage = GrayImage(BS, BS, ByteArray(BS * BS) { v.toByte() })

    fun flatBgr(
        b: Int,
        g: Int,
        r: Int,
    ): BgrImage {
        val d = ByteArray(BS * BS * 3)
        for (i in 0 until BS * BS) {
            d[i * 3] = b.toByte()
            d[i * 3 + 1] = g.toByte()
            d[i * 3 + 2] = r.toByte()
        }
        return BgrImage(BS, BS, d)
    }

    /** Smooth deterministic texture (sinusoidal, ~60..200) — census codes are nontrivial. */
    fun texturedBoard(): GrayImage {
        val d = ByteArray(BS * BS)
        for (y in 0 until BS) {
            for (x in 0 until BS) {
                val v = 130.0 + 60.0 * kotlin.math.sin(x / 13.0) * kotlin.math.sin(y / 17.0)
                d[y * BS + x] = v.toInt().coerceIn(0, 255).toByte()
            }
        }
        return GrayImage(BS, BS, d)
    }

    fun copyOf(img: GrayImage): GrayImage = GrayImage(img.width, img.height, img.data.copyOf())

    /** Gray view of a BGR image (BT.601 like cv2.cvtColor BGR2GRAY). */
    fun toGray(bgr: BgrImage): GrayImage {
        val d = ByteArray(bgr.width * bgr.height)
        for (i in d.indices) {
            val b = bgr.data[i * 3].px()
            val g = bgr.data[i * 3 + 1].px()
            val r = bgr.data[i * 3 + 2].px()
            d[i] = (0.114 * b + 0.587 * g + 0.299 * r).toInt().coerceIn(0, 255).toByte()
        }
        return GrayImage(bgr.width, bgr.height, d)
    }

    /** Textured disc (a "piece") covering ~half of `sq`'s inset box, random values from `values`. */
    fun texturedPiece(
        img: GrayImage,
        sq: String,
        values: IntRange,
        rng: Random,
        radius: Int? = null,
    ) {
        val box = Squares.region(sq, BoardGeometry(BS))
        val cx = (box.x0 + box.x1) / 2
        val cy = (box.y0 + box.y1) / 2
        val r = radius ?: ((box.x1 - box.x0) / 3)
        for (y in cy - r..cy + r) {
            for (x in cx - r..cx + r) {
                if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) {
                    img.data[y * BS + x] = rng.nextInt(values.first, values.last + 1).toByte()
                }
            }
        }
    }

    /** Multiply the pixels of `sq`'s cell (+`pad` px margin) by `factor` (cast shadow). */
    fun darkenRegion(
        img: GrayImage,
        sq: String,
        factor: Double,
        pad: Int = 8,
    ) {
        val box = Squares.region(sq, BoardGeometry(BS))
        for (y in (box.y0 - pad).coerceAtLeast(0) until (box.y1 + pad).coerceAtMost(BS)) {
            for (x in (box.x0 - pad).coerceAtLeast(0) until (box.x1 + pad).coerceAtMost(BS)) {
                img.data[y * BS + x] = (img.data[y * BS + x].px() * factor).toInt().coerceIn(0, 255).toByte()
            }
        }
    }

    /** Fill the FULL cell of `sq` with a constant gray value. */
    fun fillCellGray(
        img: GrayImage,
        sq: String,
        v: Int,
    ) {
        val (col, row) = Squares.colRow(sq, true)
        val cell = BS / 8
        for (y in row * cell until (row + 1) * cell) {
            for (x in col * cell until (col + 1) * cell) img.data[y * BS + x] = v.toByte()
        }
    }

    /** Fill the FULL cell of `sq` with a constant BGR value. */
    fun fillCellBgr(
        img: BgrImage,
        sq: String,
        b: Int,
        g: Int,
        r: Int,
    ) {
        val (col, row) = Squares.colRow(sq, true)
        val cell = BS / 8
        for (y in row * cell until (row + 1) * cell) {
            for (x in col * cell until (col + 1) * cell) {
                val i = (y * BS + x) * 3
                img.data[i] = b.toByte()
                img.data[i + 1] = g.toByte()
                img.data[i + 2] = r.toByte()
            }
        }
    }

    /** Fill `sq`'s inset box (+pad margin) with a flat BGR value (`color` = [b, g, r]). */
    fun fillRegionBgr(
        bgr: BgrImage,
        sq: String,
        color: IntArray,
        pad: Int = 8,
    ) {
        val box = Squares.region(sq, BoardGeometry(BS))
        for (y in (box.y0 - pad).coerceAtLeast(0) until (box.y1 + pad).coerceAtMost(BS)) {
            for (x in (box.x0 - pad).coerceAtLeast(0) until (box.x1 + pad).coerceAtMost(BS)) {
                val i = (y * BS + x) * 3
                for (c in 0 until 3) bgr.data[i + c] = color[c].toByte()
            }
        }
    }

    /** Horizontal 1 px roll (table wobble) of the whole image. */
    fun rolled(img: GrayImage): GrayImage {
        val d = ByteArray(img.data.size)
        for (y in 0 until img.height) {
            for (x in 0 until img.width) {
                d[y * img.width + x] = img.data[y * img.width + ((x - 1 + img.width) % img.width)]
            }
        }
        return GrayImage(img.width, img.height, d)
    }
}
