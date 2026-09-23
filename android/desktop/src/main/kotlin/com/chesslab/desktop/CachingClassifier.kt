package com.chesslab.desktop

import com.chesslab.cnn.SquareClassifier
import com.chesslab.engine.api.BgrImage
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.EOFException
import java.io.File
import java.security.MessageDigest

/** Keyed by a digest of the CROPS THEMSELVES, so it is stale-proof; only the MODEL is not in the pixels, so
 *  the directory is per model. Sound only because replays are deterministic end to end. One file PER
 *  RECORDING, read once into RAM: 655 588 single files made up to 70 % of a replay disk waits. */
internal class CachingClassifier(
    private val inner: SquareClassifier,
    private val dir: File,
    private val recording: String,
) : SquareClassifier {
    override val classes: List<String> get() = inner.classes

    private var hits = 0
    private var misses = 0
    private val memo: MutableMap<String, Array<FloatArray>> = HashMap()
    private val shard = File(dir, "$recording.${ProcessHandle.current().pid()}.bin")
    private var sink: DataOutputStream? = null

    init {
        // Doppelte Schluessel sind harmlos — der Wert ist eine reine Funktion des Schluessels.
        dir
            .listFiles { f -> f.name.startsWith("$recording.") && f.name.endsWith(".bin") }
            ?.sortedBy { it.name }
            ?.forEach { load(it) }
    }

    override fun classify(crops: List<BgrImage>): Array<FloatArray> {
        val key = keyOf(crops)
        memo[key]?.takeIf { it.size == crops.size }?.let {
            hits += 1
            return it
        }
        val probs = inner.classify(crops)
        memo[key] = probs
        append(key, probs)
        misses += 1
        return probs
    }

    override fun close() {
        sink?.let { runCatching { it.flush() } }
        sink?.let { runCatching { it.close() } }
        println("obs-cache: $hits hits, $misses misses (${shard.path}, ${memo.size} im Speicher)")
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

    /** Ein abgerissener letzter Satz faellt weg — dieselbe Regel wie bei `Jsonl` und `read_jsonl`. */
    private fun load(file: File) {
        runCatching {
            DataInputStream(file.inputStream().buffered()).use { input ->
                while (true) {
                    val key = ByteArray(KEY_BYTES)
                    try {
                        input.readFully(key)
                    } catch (_: EOFException) {
                        return
                    }
                    val rows = input.readInt()
                    val width = input.readInt()
                    if (rows !in 1..MAX_ROWS || width !in classes.size..classes.size + 1) return
                    val probs = Array(rows) { FloatArray(width) { input.readFloat() } }
                    memo[key.joinToString("") { "%02x".format(it) }] = probs
                }
            }
        }
    }

    private fun append(
        key: String,
        probs: Array<FloatArray>,
    ) {
        val out =
            sink ?: run {
                dir.mkdirs()
                DataOutputStream(java.io.FileOutputStream(shard, true).buffered()).also { sink = it }
            }
        runCatching {
            out.write(ByteArray(KEY_BYTES) { key.substring(it * 2, it * 2 + 2).toInt(RADIX).toByte() })
            out.writeInt(probs.size)
            out.writeInt(probs.firstOrNull()?.size ?: classes.size)
            for (row in probs) for (p in row) out.writeFloat(p)
            out.flush()
        }
    }
}

private const val BYTE_BITS = 8
private const val KEY_BYTES = 16
private const val RADIX = 16

private const val MAX_ROWS = 64
