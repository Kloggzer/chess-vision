package com.chesslab.desktop

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File

/**
 * Die Frames, die das TELEFON verarbeitet hat — aus der `timeline.jsonl` einer Aufnahme.
 *
 * Ein Replay ohne sie ist keine Reproduktion: `fps=<n>` trifft die Anzahl der Frames, aber nicht
 * dieselben Bilder, die CameraX live durchliess, und daran haengt, was der Diff vergleicht
 * (`TODO.md`, 2026-08-30).
 */
internal object RecordedFrames {
    /**
     * Videozeiten in ms, aufsteigend, oder `null` wenn die Aufnahme keine Messung mitbringt.
     *
     * Die Bruecke zwischen Systemuhr und Videozeit sind die `video_sync`-Zeilen: jede sagt, wie
     * lang das Video zu einem `elapsedNs` war. Dazwischen wird linear interpoliert, denn beide
     * Uhren laufen gleich schnell.
     */
    fun times(timeline: File): List<Double>? {
        if (!timeline.isFile) return null
        val syncs = ArrayList<Pair<Long, Long>>()
        val frames = ArrayList<Long>()
        timeline.forEachLine { line ->
            if (line.isBlank()) return@forEachLine
            val row = runCatching { Json.parseToJsonElement(line).jsonObject }.getOrNull() ?: return@forEachLine
            val elapsed = row["elapsedNs"]?.jsonPrimitive?.longOrNull() ?: return@forEachLine
            when (row["kind"]?.jsonPrimitive?.content) {
                "video_sync" -> row["durationNs"]?.jsonPrimitive?.longOrNull()?.let { syncs += elapsed to it }
                "frame" -> frames += elapsed
                else -> Unit
            }
        }
        if (syncs.size < 2 || frames.isEmpty()) return null
        syncs.sortBy { it.first }
        val out = frames.sorted().map { videoNsAt(it, syncs) / NS_PER_MS }
        return out.filter { it >= 0.0 }.takeIf { it.isNotEmpty() }
    }

    /** Lineare Interpolation zwischen den beiden umgebenden Sync-Punkten, ausserhalb extrapoliert. */
    private fun videoNsAt(
        elapsedNs: Long,
        syncs: List<Pair<Long, Long>>,
    ): Double {
        val i = syncs.indexOfFirst { it.first >= elapsedNs }
        val (loWall, loVideo) = if (i <= 0) syncs[0] else syncs[i - 1]
        val (hiWall, hiVideo) = if (i <= 0) syncs[1] else syncs[i]
        if (hiWall == loWall) return loVideo.toDouble()
        val t = (elapsedNs - loWall).toDouble() / (hiWall - loWall)
        return loVideo + t * (hiVideo - loVideo)
    }

    /**
     * Die Stellung, auf der das Telefon beim ERSTEN aufgezeichneten Frame stand.
     *
     * Eine Aufnahme beginnt mitten im Spiel: der Vorlauf-Ring wird beim ersten Commit geleert, und
     * die Engine war da laengst ein paar Halbzuege weit. Ein Replay auf der Grundstellung glaubt
     * an ein Brett, das nie so dastand.
     */
    fun startFen(timeline: File): String? {
        if (!timeline.isFile) return null
        return timeline.useLines { lines ->
            lines
                .mapNotNull { line ->
                    runCatching { Json.parseToJsonElement(line).jsonObject }.getOrNull()
                }.firstOrNull { it["kind"]?.jsonPrimitive?.content == "frame" && it["fen"] != null }
                ?.get("fen")
                ?.jsonPrimitive
                ?.content
        }
    }

    private const val NS_PER_MS = 1_000_000.0
}

/**
 * Laesst genau die Frames durch, die den aufgezeichneten Zeiten am naechsten liegen.
 *
 * Greedy und einmal vorwaerts: der erste dekodierte Frame, der eine Zielzeit erreicht, nimmt sie
 * ein; Zielzeiten, die er dabei ueberholt hat, verfallen. Damit ist die Auswahl deterministisch
 * und braucht das Video nicht zweimal.
 */
internal class RecordedFrameGate(
    private val targetsMs: List<Double>,
) {
    private var next = 0

    /** Wie viele Frames durchgingen — die Zahl gehoert in den Lauf, nicht in einen Verdacht. */
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
