package com.chesslab.tracker.record

import java.io.File

data class SessionInfo(
    val id: String,
    val frames: Int,
    val bytes: Long,
)

/** Recording is the only feature that grows without bound, so size and delete are part of it. [totalBytes]
 *  walks the tree: on screen entry, cached, never per frame. */
class SessionStore(
    private val root: File,
) {
    fun dir(id: String): File = File(root, id)

    fun list(): List<SessionInfo> =
        (root.listFiles { f: File -> f.isDirectory }?.toList() ?: emptyList())
            .map { SessionInfo(it.name, File(it, "frames").list()?.size ?: 0, it.walkBottomUp().sumOf(File::length)) }
            .sortedByDescending { it.id }

    fun totalBytes(): Long = root.walkBottomUp().sumOf(File::length)

    /** ONE session's cost; the size cap adds finished games this way. */
    fun bytesOf(id: String): Long = dir(id).walkBottomUp().sumOf(File::length)

    /** Von der PLATTE: jeder Bildschirm baut seinen eigenen Store, eine Loeschung erreichte den Etat sonst nie. */
    fun count(): Int = root.list()?.size ?: 0

    fun delete(id: String): Boolean = dir(id).deleteRecursively()

    /** `collect.py::generate_session_id` is `%Y%m%d-%H%M%S`. */
    fun create(sessionId: String): File = dir(sessionId).also { it.mkdirs() }
}

private const val KB: Double = 1024.0

fun formatBytes(bytes: Long): String {
    val mb = bytes / (KB * KB)
    return if (mb >= KB) "%.1f GB".format(mb / KB) else "%.0f MB".format(mb)
}
