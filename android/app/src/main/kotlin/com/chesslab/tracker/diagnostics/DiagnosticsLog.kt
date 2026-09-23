package com.chesslab.tracker.diagnostics

import com.chesslab.engine.api.DebugDecision
import com.chesslab.tracker.io.Jsonl
import com.chesslab.tracker.record.zipSession
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import java.io.File
import java.io.IOException
import java.io.OutputStream
import java.util.concurrent.atomic.AtomicLong
import kotlin.coroutines.CoroutineContext

private const val FILE_PREFIX = "diag-"

private const val FILE_SUFFIX = ".ndjson"

/** ~700 rows per file, four files a long evening: the point is a file somebody can attach to a message. */
private const val MAX_FILE_BYTES = 512L * 1024L

private const val MAX_FILES = 4

/** Deep enough for a burst of transitions, shallow enough that a stalled consumer shows as a seq gap. */
private const val QUEUE_CAPACITY = 256

/** The analyzer thread must not build JSON, so the record travels raw. */
private sealed interface Entry {
    class Start(
        val row: RunStart,
    ) : Entry

    class Row(
        val seq: Long,
        val decision: DebugDecision,
    ) : Entry

    class State(
        val row: StateRow,
    ) : Entry
}

/** Rotation, not a spool: prefix truncation rewrote the file its own appender wrote to. [offer] runs on
 *  the analyzer thread (23 ms median frame budget): one increment, one non-blocking send. [seq] is
 *  assigned at OFFER time, so a row dropped by the queue leaves a visible hole in the numbering. */
class DiagnosticsLog(
    private val dir: File,
    scope: CoroutineScope,
    private val maxFileBytes: Long = MAX_FILE_BYTES,
    private val maxFiles: Int = MAX_FILES,
    context: CoroutineContext = Dispatchers.IO,
) : AutoCloseable {
    private val seq = AtomicLong()

    private val queue = Channel<Entry>(QUEUE_CAPACITY, BufferOverflow.DROP_OLDEST)

    private var current: File? = null

    private var header: RunStart? = null

    /** Produzentenseite: der Kopf ist der aelteste Eintrag der Schlange und faellt als erster. */
    @Volatile
    private var announced: RunStart? = null

    init {
        scope.launch(context) {
            for (entry in queue) write(entry)
        }
    }

    fun offer(decision: DebugDecision) {
        queue.trySend(Entry.Row(seq.getAndIncrement(), decision))
    }

    fun state(
        from: String,
        to: String,
        tsS: Double,
    ) {
        queue.trySend(Entry.State(StateRow(seq.getAndIncrement(), tsS, from, to)))
    }

    fun runStart(row: RunStart) {
        val stamped = row.copy(seq = seq.getAndIncrement())
        announced = stamped
        queue.trySend(Entry.Start(stamped))
    }

    override fun close() {
        queue.close()
    }

    private fun write(entry: Entry) {
        val line =
            when (entry) {
                is Entry.Start -> DIAGNOSTICS_JSON.encodeToString(RunStart.serializer(), entry.row)
                is Entry.Row -> DIAGNOSTICS_JSON.encodeToString(DecisionRow.serializer(), entry.decision.toRow(entry.seq))
                is Entry.State -> DIAGNOSTICS_JSON.encodeToString(StateRow.serializer(), entry.row)
            }
        // A full disk, a revoked directory, a device that unmounted mid-game: none of them are
        // worth taking the tracker down for. The gap in `seq` records that something was lost.
        try {
            val file = target()
            if (entry !is Entry.Start) restoreHeaderInto(file)
            Jsonl.appendEncoded(file, line)
        } catch (_: IOException) {
            return
        }
        if (entry is Entry.Start) header = entry.row
    }

    /** Der Kopf fiel aus der Schlange, bevor ihn jemand schrieb — sonst traegt ihn keine Datei. */
    private fun restoreHeaderInto(file: File) {
        val start = announced ?: return
        if (header != null) return
        Jsonl.appendEncoded(file, DIAGNOSTICS_JSON.encodeToString(RunStart.serializer(), start))
        header = start
    }

    /** A fresh process always starts a new file: a file never straddles two runs with two configs. */
    private fun target(): File {
        val open = current
        if (open != null && open.length() < maxFileBytes) return open
        dir.mkdirs()
        val next = File(dir, "$FILE_PREFIX${(files().lastOrNull()?.index() ?: -1) + 1}$FILE_SUFFIX")
        current = next
        // `next` is about to exist, so the survivors may occupy at most one slot less.
        files().dropLast(maxFiles - 1).forEach { it.delete() }
        // Every file repeats the header, because rotation deletes the OLDEST — the one that carried it. The
        // repeat keeps the ORIGINAL `seq`: the same record twice, and decision rows only ever count up.
        header?.let { Jsonl.appendEncoded(next, DIAGNOSTICS_JSON.encodeToString(RunStart.serializer(), it)) }
        return next
    }

    private fun files(): List<File> =
        dir
            .listFiles { file: File -> file.name.startsWith(FILE_PREFIX) && file.name.endsWith(FILE_SUFFIX) }
            ?.sortedBy { it.index() }
            .orEmpty()
}

private fun File.index(): Int = name.removePrefix(FILE_PREFIX).removeSuffix(FILE_SUFFIX).toIntOrNull() ?: 0

fun diagnosticsDir(filesDir: File): File = File(filesDir, "diagnostics")

/** The whole directory: the interesting file is rarely the newest, and each starts with a run header. */
fun zipDiagnostics(
    filesDir: File,
    out: OutputStream,
): Int = zipSession(diagnosticsDir(filesDir), out)
