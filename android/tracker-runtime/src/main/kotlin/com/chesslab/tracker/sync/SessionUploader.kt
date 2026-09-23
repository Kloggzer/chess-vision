package com.chesslab.tracker.sync

import java.io.File

/** Until the server states its own. */
const val DEFAULT_CHUNK = 8 * 1024 * 1024

private const val STALL_LIMIT = 3

/** A failure carries its REASON, which is the point of the type. */
sealed interface Outcome {
    data class Sent(
        val sessionId: String,
        val bytes: Long,
        val status: String,
    ) : Outcome

    data class Failed(
        val sessionId: String,
        val reason: String,
    ) : Outcome
}

/** The server is the only bookkeeping: a phone-side "sent so far" goes stale when a transfer dies between the
 *  last chunk and the acknowledgement. */
class SessionUploader(
    private val client: IngestClient,
    private val device: String,
    private val now: () -> Long = System::currentTimeMillis,
) {
    fun upload(
        base: String,
        sessionDir: File,
        plan: UploadPlan,
        onProgress: (sent: Long, total: Long) -> Unit = { _, _ -> },
    ): Outcome =
        runCatching { send(base, sessionDir, plan, onProgress) }
            .getOrElse { error -> Outcome.Failed(plan.sessionId, error.message ?: error.javaClass.simpleName) }

    private fun send(
        base: String,
        sessionDir: File,
        plan: UploadPlan,
        onProgress: (Long, Long) -> Unit,
    ): Outcome {
        val declared = client.declare(base, plan, device)
        var done = 0L
        onProgress(plan.files.sumOf { declared.have[it.path] ?: 0L }, plan.bytes)

        for (file in plan.files) {
            sendFile(base, declared, file) { sent -> onProgress(done + sent, plan.bytes) }
            done += file.bytes
            onProgress(done, plan.bytes)
        }

        val status = client.complete(base, declared.name)
        writeMark(sessionDir, TransferMark(base, now(), plan.bytes, plan.files.size, status))
        return Outcome.Sent(plan.sessionId, plan.bytes, status)
    }

    /** An EMPTY file still gets one zero-length PUT: the server seals only when every DECLARED file is there, and
     *  a 0-byte `log.jsonl` failed `complete` on every retry, forever. */
    private fun sendFile(
        base: String,
        declared: Declared,
        file: UploadFile,
        onSent: (Long) -> Unit,
    ) {
        var offset = declared.have[file.path] ?: 0L
        if (file.bytes == 0L) {
            if (offset == 0L) client.putChunk(base, declared.name, file, 0L, 0)
            return
        }
        val chunk = declared.chunk.coerceAtLeast(1)
        var stalls = 0
        // As declared: the server checks the DECLARED length, and a longer file would never seal.
        while (offset < file.bytes) {
            val length = minOf(chunk.toLong(), file.bytes - offset).toInt()
            val next =
                try {
                    client.putChunk(base, declared.name, file, offset, length)
                } catch (error: IngestException) {
                    // The server's count wins — a resume that argues with it never converges.
                    error.have ?: throw error
                }
            // Without progress a loop would sit on the radio until the battery decides.
            stalls = if (next > offset) 0 else stalls + 1
            if (stalls > STALL_LIMIT) throw IngestException("no progress on ${file.path} at $offset")
            offset = next
            onSent(offset)
        }
    }
}
