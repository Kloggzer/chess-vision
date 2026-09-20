package com.chesslab.desktop

import com.chesslab.cnn.SquareClassifier
import com.chesslab.engine.api.BgrImage
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.EOFException
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
 *
 * **Eine Datei JE AUFNAHME, nicht je Eintrag** (2026-09-20). Vorher lagen 655 588 Dateien zu
 * 3,5 KB in einem Verzeichnis: ein zufaelliger Zugriff kostete unter Last 10–13 ms, und bis zu
 * 70 % eines Replays waren Warten auf die Platte. Jetzt liest der Konstruktor die Scherben der
 * Aufnahme EINMAL sequenziell in eine Map, und jeder Treffer ist eine Suche im RAM.
 * `docs/obs-cache-architektur-2026-09-20.md`.
 */
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
        // Alle Scherben der Aufnahme: der eigene Prozess schreibt in seine, liest aber jede.
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

/** Ein Brett hat 64 Felder; alles darueber ist ein kaputter Satz, kein Eintrag. */
private const val MAX_ROWS = 64
