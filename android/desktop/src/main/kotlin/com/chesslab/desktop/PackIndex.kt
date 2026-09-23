package com.chesslab.desktop

import org.opencv.core.Mat
import java.io.OutputStream
import java.nio.charset.StandardCharsets.UTF_8
import java.security.MessageDigest

internal fun writePackedCrop(
    crop: Mat,
    out: OutputStream,
) {
    val packed = resizeForPacking(crop)
    try {
        val data = ByteArray(PACK_CROP_BYTES)
        packed.get(0, 0, data)
        bgrToRgbInPlace(data)
        out.write(data)
    } finally {
        packed.release()
    }
}

internal class PackIndex {
    private val paths = StringBuilder("[")
    private val digest = MessageDigest.getInstance("SHA-256")

    fun add(
        path: String,
        label: String,
    ) {
        if (paths.length > 1) paths.append(',')
        paths.append('"').append(json(path)).append('"')
        digest.update(path.toByteArray(UTF_8))
        digest.update(0)
        digest.update(label.toByteArray(UTF_8))
        digest.update(0)
        digest.update("[$PACK_CROP_SIDE, $PACK_CROP_SIDE]".toByteArray(UTF_8))
        digest.update('\n'.code.toByte())
    }

    fun pathsJson(): String = "$paths]"

    /** Once: reading the digest resets it. */
    fun hex(): String = digestHex(digest)
}
