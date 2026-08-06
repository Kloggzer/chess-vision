package com.chesslab.tracker.record

import java.io.File
import java.io.OutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/**
 * A recorded session as a ZIP, laid out so it can be dropped straight into `data/sessions/` on the
 * desktop: `<sessionId>/session.yaml`, `<sessionId>/log.jsonl` and the `<sessionId>/frames` directory.
 *
 * The destination stream comes from `ACTION_CREATE_DOCUMENT` — the user picks the file, so no
 * storage permission is involved on either side.
 */
fun zipSession(
    dir: File,
    out: OutputStream,
): Int {
    var entries = 0
    ZipOutputStream(out.buffered()).use { zip ->
        dir.walkTopDown().filter(File::isFile).forEach { file ->
            zip.putNextEntry(ZipEntry("${dir.name}/${file.relativeTo(dir).invariantSeparatorsPath}"))
            file.inputStream().use { it.copyTo(zip) }
            zip.closeEntry()
            entries++
        }
    }
    return entries
}
