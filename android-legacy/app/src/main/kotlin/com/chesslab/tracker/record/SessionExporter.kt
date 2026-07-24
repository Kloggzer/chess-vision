package com.chesslab.tracker.record

import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/**
 * Exports a session directory as a ZIP file (via SAF `ACTION_CREATE_DOCUMENT`)
 * or shares the PGN text via `ACTION_SEND`.
 *
 * No broad storage permission required — SAF intents use the system file picker
 * and `ACTION_SEND` hands off to a share-sheet. The ZIP includes only the
 * session's `frames/` JPEGs and `log.jsonl`; metadata (`session.yaml`) is
 * generated on the desktop side.
 *
 * Consumed by phase 07.
 */
object SessionExporter {
    /**
     * ZIP the session directory [dir] into [outFile].
     *
     * Includes all files under `frames/` and `log.jsonl`. Sub-directories
     * inside `frames/` are traversed recursively. On error, the output file
     * is deleted and the exception is rethrown.
     */
    fun zipSession(
        dir: File,
        outFile: File,
    ) {
        val files =
            dir
                .walkTopDown()
                .filter { it.isFile }
                .toList()

        ZipOutputStream(FileOutputStream(outFile)).use { zos ->
            for (file in files) {
                val relative = file.relativeTo(dir).invariantSeparatorsPath
                zos.putNextEntry(ZipEntry(relative))
                FileInputStream(file).use { it.copyTo(zos) }
                zos.closeEntry()
            }
        }
    }
}
