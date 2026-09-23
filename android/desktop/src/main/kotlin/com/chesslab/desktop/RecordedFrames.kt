package com.chesslab.desktop

import com.chesslab.tracker.io.Jsonl
import kotlinx.serialization.json.jsonPrimitive
import java.io.File

/** Die Frames, die das TELEFON verarbeitet hat: `fps=<n>` trifft die Anzahl, aber nicht dieselben Bilder. */
internal object RecordedFrames {
    /** Null, wenn die Aufnahme keine `video_sync`-Messung mitbringt. */
    fun times(timeline: File): List<Double>? {
        if (!timeline.isFile) return null
        val syncs = ArrayList<Pair<Long, Long>>()
        val frames = ArrayList<Long>()
        Jsonl.rows(timeline).forEach { row ->
            val elapsed = row["elapsedNs"]?.jsonPrimitive?.longOrNull() ?: return@forEach
            when (row["kind"]?.jsonPrimitive?.content) {
                "video_sync" -> row["durationNs"]?.jsonPrimitive?.longOrNull()?.let { syncs += elapsed to it }
                "frame" -> frames += elapsed
                else -> Unit
            }
        }
        if (syncs.isEmpty() || frames.isEmpty()) return null
        syncs.sortBy { it.first }
        val out = frames.sorted().map { videoNsAt(it, syncs) / NS_PER_MS }
        return out.filter { it >= 0.0 }.takeIf { it.isNotEmpty() }
    }

    /** Steigung 1: 85 ms Drift auf 25,3 s. Aus zwei BENACHBARTEN Punkten geschaetzt las sie 2,36 (Callback-Jitter),
     *  und der Vorlauf landete bei -8,5 s. */
    internal fun videoNsAt(
        elapsedNs: Long,
        syncs: List<Pair<Long, Long>>,
    ): Double {
        val after = syncs.indexOfFirst { it.first >= elapsedNs }
        val anchor =
            when {
                after < 0 -> syncs.last()
                after == 0 -> syncs.first()
                else -> listOf(syncs[after - 1], syncs[after]).minBy { kotlin.math.abs(it.first - elapsedNs) }
            }
        return anchor.second + (elapsedNs - anchor.first).toDouble()
    }

    /** Bei Aufnahmen von vor dem 2026-08-30 beginnt die Zeitleiste am ersten Commit, nicht in der Grundstellung. */
    fun startFen(timeline: File): String? {
        if (!timeline.isFile) return null
        return Jsonl
            .rows(timeline)
            .firstOrNull { it["kind"]?.jsonPrimitive?.content == "frame" && it["fen"] != null }
            ?.get("fen")
            ?.jsonPrimitive
            ?.content
    }

    private const val NS_PER_MS = 1_000_000.0
}

/** Greedy und einmal vorwaerts: der erste dekodierte Frame, der eine Zielzeit erreicht, nimmt sie ein; ueberholte
 *  Zielzeiten verfallen. Deterministisch, und das Video wird nicht zweimal gelesen. */
internal class RecordedFrameGate(
    private val targetsMs: List<Double>,
) {
    private var next = 0

    /** Die Zahl gehoert in den Lauf, nicht in einen Verdacht. */
    var taken = 0
        private set

    val size: Int get() = targetsMs.size

    fun accept(tsMs: Double): Boolean {
        if (next >= targetsMs.size) return false
        if (tsMs < targetsMs[next]) return false
        next++
        taken++
        while (next < targetsMs.size && targetsMs[next] <= tsMs) next++
        return true
    }
}

private fun kotlinx.serialization.json.JsonPrimitive.longOrNull(): Long? = content.toLongOrNull()
