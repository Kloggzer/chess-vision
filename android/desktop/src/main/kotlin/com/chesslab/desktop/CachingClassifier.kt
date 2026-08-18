package com.chesslab.desktop

import com.chesslab.cnn.SquareClassifier
import com.chesslab.engine.api.BgrImage
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.File
import java.security.MessageDigest

/**
 * A [SquareClassifier] that remembers what the model said about pixels it has seen before.
 *
 * The key is a digest of the CROPS THEMSELVES (dimensions + BGR bytes), which makes it
 * self-validating: a different video, quad, crop geometry or observation cadence produces
 * different pixels and simply misses — the cache can be stale-proof without knowing why the
 * pixels changed. What the pixels cannot encode is the MODEL, so the cache directory is per
 * model and the engine changes nothing here: gates, alarms and recovery never feed back into
 * what the observer is shown, which is exactly why every engine experiment can replay one
 * recorded observation stream.
 *
 * Only sound because replays are deterministic end to end (one clock, inline inference, one
 * intra-op thread, the seed-synchronous cadence): the same file cuts byte-identical crops at the
 * same video times, run after run. Hashing 64 crops costs ~2 ms against the 47 ms it saves.
 */
internal class CachingClassifier(
    private val inner: SquareClassifier,
    private val dir: File,
) : SquareClassifier {
    override val classes: List<String> get() = inner.classes

    private var hits = 0
    private var misses = 0

    override fun classify(crops: List<BgrImage>): Array<FloatArray> {
        val file = File(dir, "${keyOf(crops)}.bin")
        readProbs(file, crops.size)?.let {
            hits += 1
            return it
        }
        val probs = inner.classify(crops)
        writeProbs(file, probs)
        misses += 1
        return probs
    }

    override fun close() {
        println("obs-cache: $hits hits, $misses misses (${dir.path})")
        inner.close()
    }

    private fun keyOf(crops: List<BgrImage>): String {
        val digest = MessageDigest.getInstance("MD5")
        for (crop in crops) {
            digest.update(byteArrayOf(crop.width.toByte(), (crop.width shr BYTE_BITS).toByte()))
            digest.update(byteArrayOf(crop.height.toByte(), (crop.height shr BYTE_BITS).toByte()))
            digest.update(crop.data)
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    /** `null` on absence or any shape mismatch — a broken file is a miss, never a wrong answer. */
    private fun readProbs(
        file: File,
        rows: Int,
    ): Array<FloatArray>? {
        if (!file.isFile) return null
        return runCatching {
            DataInputStream(file.inputStream().buffered()).use { input ->
                val n = input.readInt()
                val width = input.readInt()
                // A coverage row is one wider than `classes`; the width is the file's, never
                // `classes.size`, or a cached coverage column reads back as the next row's class.
                if (n != rows || width !in classes.size..classes.size + 1) return null
                Array(n) { FloatArray(width) { input.readFloat() } }
            }
        }.getOrNull()
    }

    private fun writeProbs(
        file: File,
        probs: Array<FloatArray>,
    ) {
        dir.mkdirs()
        val tmp = File(dir, "${file.name}.tmp")
        DataOutputStream(tmp.outputStream().buffered()).use { output ->
            output.writeInt(probs.size)
            output.writeInt(probs.firstOrNull()?.size ?: classes.size)
            for (row in probs) for (p in row) output.writeFloat(p)
        }
        if (!tmp.renameTo(file)) tmp.delete()
    }
}

private const val BYTE_BITS = 8
