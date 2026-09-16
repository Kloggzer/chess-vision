package com.chesslab.tracker.record

import java.io.File

data class SessionInfo(
    val id: String,
    val frames: Int,
    val bytes: Long,
)

/**
 * `filesDir/sessions` as the games screen sees it: what is there, what it costs, and how to get
 * rid of it. Recording is the only feature in this app that grows without bound, so "how big is it"
 * and "delete it" are part of the feature, not an afterthought.
 *
 * [totalBytes] walks the tree, so it is called on screen entry and cached — never per frame.
 */
class SessionStore(
    private val root: File,
) {
    fun dir(id: String): File = File(root, id)

    fun list(): List<SessionInfo> =
        (root.listFiles { f: File -> f.isDirectory }?.toList() ?: emptyList())
            .map { SessionInfo(it.name, File(it, "frames").list()?.size ?: 0, it.walkBottomUp().sumOf(File::length)) }
            .sortedByDescending { it.id }

    fun totalBytes(): Long = root.walkBottomUp().sumOf(File::length)

    /** ONE session's cost. [totalBytes] walks the whole tree; the size cap adds finished games this way. */
    fun bytesOf(id: String): Long = dir(id).walkBottomUp().sumOf(File::length)

    /** Wie viele Aufnahmen auf der Platte liegen. Von der PLATTE, nicht aus einem Zaehler je
     *  Instanz: jeder Bildschirm baut sich seinen eigenen Store, und der Groessen-Etat haelt
     *  wieder einen anderen — eine Loeschung dort erreichte ihn nie. */
    fun count(): Int = root.list()?.size ?: 0

    fun delete(id: String): Boolean = dir(id).deleteRecursively()

    /** A fresh session directory. `collect.py::generate_session_id` is `%Y%m%d-%H%M%S`. */
    fun create(sessionId: String): File = dir(sessionId).also { it.mkdirs() }
}

private const val KB: Double = 1024.0

fun formatBytes(bytes: Long): String {
    val mb = bytes / (KB * KB)
    return if (mb >= KB) "%.1f GB".format(mb / KB) else "%.0f MB".format(mb)
}
