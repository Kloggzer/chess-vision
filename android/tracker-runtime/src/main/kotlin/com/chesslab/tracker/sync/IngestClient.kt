package com.chesslab.tracker.sync

/**
 * The platform app's ingest API, as the phone needs it — a seam, so the whole transfer (resume,
 * offset correction, the order of the three calls) is testable on the desktop JVM without a server.
 *
 * Every method returns a value or throws [IngestException]; there is no silent failure, because a
 * transfer that quietly did nothing is indistinguishable from a phone that was never on the network.
 */
interface IngestClient {
    /** Is a chesslab platform answering here, and does it accept our token? */
    fun hello(base: String): Hello?

    /** Declare the bundle; the answer says how much of each file the server already holds. */
    fun declare(
        base: String,
        plan: UploadPlan,
        device: String,
    ): Declared

    /** Append one chunk. Returns what the server holds afterwards. */
    fun putChunk(
        base: String,
        name: String,
        file: UploadFile,
        offset: Long,
        length: Int,
    ): Long

    /** Seal the transfer. Returns the server's status (`landed` / `held`). */
    fun complete(
        base: String,
        name: String,
    ): String

    /**
     * Why the last probe failed, if it did.
     *
     * [hello] answers `null` for every kind of "not it" — wrong host, no route, and, on
     * 2026-08-13, `targetSdk = 35` refusing cleartext HTTP for the whole app. A sweep that reports
     * only "found nothing" cannot tell those apart, and the third one is not something a user can
     * guess from an empty result.
     */
    fun lastFailure(): String? = null
}

data class Hello(
    val paired: Boolean,
    val chunk: Int,
)

data class Declared(
    /** The server's directory name for this session — every later call is keyed by it. */
    val name: String,
    val have: Map<String, Long>,
    val chunk: Int,
)

/** [have] is the server's own count on a 409, i.e. the offset to resume from. */
class IngestException(
    message: String,
    val status: Int = 0,
    val have: Long? = null,
    cause: Throwable? = null,
) : Exception(message, cause)

/** A file slice, read straight off storage — the phone never holds a chunk in memory twice. */
internal fun UploadFile.slice(
    offset: Long,
    length: Int,
): ByteArray {
    val buffer = ByteArray(length)
    java.io.RandomAccessFile(source, "r").use { raf ->
        raf.seek(offset)
        raf.readFully(buffer)
    }
    return buffer
}
