package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage

/**
 * Deterministic procedural test images. The pixel formulas are duplicated verbatim in the
 * Python golden-value harness (specs/08-android-tracker/01-engine.md) — do not change one
 * side without re-harvesting the expected values.
 */
object TestImages {
    const val BS = 64

    fun grayA(): GrayImage {
        val d = ByteArray(BS * BS)
        for (y in 0 until BS) for (x in 0 until BS) d[y * BS + x] = ((x * 7 + y * 13) % 256).toByte()
        return GrayImage(BS, BS, d)
    }

    /** grayA with +60 (clipped) inside the full e4 and e2 cells (white POV). */
    fun grayB(): GrayImage {
        val img = grayA()
        for ((col, row) in listOf(4 to 4, 4 to 6)) {
            for (y in row * 8 until (row + 1) * 8) {
                for (x in col * 8 until (col + 1) * 8) {
                    img.data[y * BS + x] = minOf(255, img.data[y * BS + x].px() + 60).toByte()
                }
            }
        }
        return img
    }

    /** Rainbow-gradient BGR reference. */
    fun bgrRef(): BgrImage {
        val d = ByteArray(BS * BS * 3)
        for (y in 0 until BS) {
            for (x in 0 until BS) {
                val i = (y * BS + x) * 3
                d[i] = ((x * 5 + y * 3) % 200 + 20).toByte()
                d[i + 1] = ((x * 11 + y * 7) % 200 + 20).toByte()
                d[i + 2] = ((x * 13 + y * 17) % 200 + 20).toByte()
            }
        }
        return BgrImage(BS, BS, d)
    }

    /** bgrRef darkened to 60% (cast shadow). */
    fun bgrShadow(): BgrImage {
        val src = bgrRef()
        val d = ByteArray(src.data.size)
        for (i in d.indices) d[i] = (src.data[i].px() * 0.6f).toInt().toByte()
        return BgrImage(BS, BS, d)
    }

    /** Near-neutral board: slight per-pixel tint (for the color-gamut golden test). */
    fun bgrNeutral(): BgrImage {
        val d = ByteArray(BS * BS * 3)
        for (y in 0 until BS) {
            for (x in 0 until BS) {
                val i = (y * BS + x) * 3
                val base = (x * 3 + y * 5) % 60 + 90
                d[i] = base.toByte()
                d[i + 1] = (base + (x % 5)).toByte()
                d[i + 2] = (base + (y % 7)).toByte()
            }
        }
        return BgrImage(BS, BS, d)
    }

    /** bgrNeutral with a saturated skin/orange patch (BGR 60,180,210) over the d5 cell. */
    fun bgrNeutralOccluded(): BgrImage {
        val img = bgrNeutral()
        for (y in 24 until 32) {
            for (x in 24 until 32) {
                val i = (y * BS + x) * 3
                img.data[i] = 60.toByte()
                img.data[i + 1] = 180.toByte()
                img.data[i + 2] = 210.toByte()
            }
        }
        return img
    }
}
