package com.chesslab.tracker.sync

/** A seam so resume and call order are testable without a server. No silent failure: a transfer that did nothing
 *  looks like a phone that was never on the network. */
interface IngestClient {
    fun hello(base: String): Hello?

    fun declare(
        base: String,
        plan: UploadPlan,
        device: String,
    ): Declared

    fun putChunk(
        base: String,
        name: String,
        file: UploadFile,
        offset: Long,
        length: Int,
    ): Long

    /** `landed` / `held`. */
    fun complete(
        base: String,
        name: String,
    ): String

    /** [hello] answers `null` for every "not it" — wrong host, no route, or `targetSdk = 35` refusing cleartext
     *  HTTP for the whole app. Only this tells them apart. */
    fun lastFailure(): String? = null
}

data class Hello(
    val paired: Boolean,
    val chunk: Int,
)

data class Declared(
    /** Every later call is keyed by it. */
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

/** Straight off storage — never a chunk in memory twice. */
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
