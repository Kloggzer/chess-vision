package com.chesslab.tracker.diagnostics

import com.chesslab.engine.api.DebugDecision
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import java.io.File
import java.io.IOException
import java.util.concurrent.atomic.AtomicLong
import kotlin.coroutines.CoroutineContext

/** File name shape: `diag-0.ndjson`, `diag-1.ndjson`, … The index only ever grows within a run. */
private const val FILE_PREFIX = "diag-"

private const val FILE_SUFFIX = ".ndjson"

/**
 * A decision row is ~700 bytes of text, so 512 kB is roughly 700 rows and four files are a long
 * evening. The whole point is a file somebody can attach to a message; a cap that produced tens of
 * megabytes would be a file nobody sends.
 */
private const val MAX_FILE_BYTES = 512L * 1024L

private const val MAX_FILES = 4

/**
 * Deep enough that a burst of stuck-reason transitions cannot reach it, shallow enough that a
 * stalled consumer shows up as a seq gap within seconds rather than as unbounded memory.
 */
private const val QUEUE_CAPACITY = 256

/** What crossed the queue. The analyzer thread must not build JSON, so the record travels raw. */
private sealed interface Entry {
    class Start(
        val row: RunStart,
    ) : Entry

    class Row(
        val seq: Long,
        val decision: DebugDecision,
    ) : Entry
}

/**
 * The decision rows and the run header, as rotating NDJSON in `filesDir/diagnostics/`.
 *
 * **Rotation, not a spool.** The predecessor design was `append` / `readBatch` / `truncatePrefix`,
 * a hand-written durable queue whose prefix truncation rewrites the file its own appender is
 * writing to — which is why that design then had to tolerate torn last lines. A rotating file is
 * either whole or being appended to, and deleting one is a single atomic call.
 *
 * **Nothing here runs on the analyzer thread.** [offer] is called from the engine's sink, on a
 * thread whose measured budget is 23.1 ms median / 32.4 p90 / 89.1 max for a whole frame at
 * 26–28 fps. It takes one atomic increment and one non-blocking channel send; the file handle, the
 * serialisation and the rotation all live on the consumer. `:app` may use `Atomic*` — the purity
 * rule that forbids it binds `:core-engine` only.
 *
 * **[seq] is assigned at OFFER time, deliberately.** The queue drops its oldest entry rather than
 * blocking the analyzer thread, and a counter assigned by the consumer would make that drop
 * invisible. Assigned here, a dropped row leaves a hole in the numbering, which is the difference
 * between "nothing happened" and "the log could not keep up".
 */
class DiagnosticsLog(
    private val dir: File,
    scope: CoroutineScope,
    private val maxFileBytes: Long = MAX_FILE_BYTES,
    private val maxFiles: Int = MAX_FILES,
    context: CoroutineContext = Dispatchers.IO,
) : AutoCloseable {
    private val seq = AtomicLong()

    private val queue = Channel<Entry>(QUEUE_CAPACITY, BufferOverflow.DROP_OLDEST)

    /** Consumer-thread state: the file being appended to and the header to repeat into the next. */
    private var current: File? = null

    private var header: RunStart? = null

    init {
        scope.launch(context) {
            for (entry in queue) write(entry)
        }
    }

    /** From the engine's sink, on the analyzer thread. Allocates one small wrapper and returns. */
    fun offer(decision: DebugDecision) {
        queue.trySend(Entry.Row(seq.getAndIncrement(), decision))
    }

    /** Once per built tracker stack, from whichever thread learns the execution provider. */
    fun runStart(row: RunStart) {
        queue.trySend(Entry.Start(row.copy(seq = seq.getAndIncrement())))
    }

    override fun close() {
        queue.close()
    }

    private fun write(entry: Entry) {
        val line =
            when (entry) {
                is Entry.Start -> DIAGNOSTICS_JSON.encodeToString(RunStart.serializer(), entry.row)
                is Entry.Row -> DIAGNOSTICS_JSON.encodeToString(DecisionRow.serializer(), entry.decision.toRow(entry.seq))
            }
        // A full disk, a revoked directory, a device that unmounted mid-game: none of them are
        // worth taking the tracker down for. The gap in `seq` records that something was lost.
        try {
            target().appendText(line + "\n")
        } catch (_: IOException) {
            return
        }
        if (entry is Entry.Start) header = entry.row
    }

    /**
     * The file to append to, rotating when the current one is full.
     *
     * A fresh process always starts a new file rather than topping up the newest existing one, so
     * a file never straddles two runs with two different configs — which is the one thing this log
     * exists to make legible.
     */
    private fun target(): File {
        val open = current
        if (open != null && open.length() < maxFileBytes) return open
        dir.mkdirs()
        val next = File(dir, "$FILE_PREFIX${(files().lastOrNull()?.index() ?: -1) + 1}$FILE_SUFFIX")
        current = next
        // `next` is about to exist, so the survivors may occupy at most one slot less.
        files().dropLast(maxFiles - 1).forEach { it.delete() }
        // Every file repeats the header, because rotation deletes the OLDEST — i.e. exactly the
        // file that carried the run header — and an export whose config block just aged out is an
        // export of anonymous numbers. The repeat keeps the ORIGINAL `seq`: it is the same record
        // written twice, not a second event, and a fresh number would break the one property the
        // counter has, that the decision rows read in file order only ever count up.
        header?.let { next.appendText(DIAGNOSTICS_JSON.encodeToString(RunStart.serializer(), it) + "\n") }
        return next
    }

    private fun files(): List<File> =
        dir
            .listFiles { file: File -> file.name.startsWith(FILE_PREFIX) && file.name.endsWith(FILE_SUFFIX) }
            ?.sortedBy { it.index() }
            .orEmpty()
}

private fun File.index(): Int = name.removePrefix(FILE_PREFIX).removeSuffix(FILE_SUFFIX).toIntOrNull() ?: 0

/** The one place the directory is named, so the writer and the export button cannot disagree. */
fun diagnosticsDir(filesDir: File): File = File(filesDir, "diagnostics")
