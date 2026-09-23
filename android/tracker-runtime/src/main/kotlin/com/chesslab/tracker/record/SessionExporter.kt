package com.chesslab.tracker.record

import java.io.File
import java.io.OutputStream
import java.util.zip.Deflater
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/** Laid out to drop into `data/sessions/`. `ACTION_CREATE_DOCUMENT`: no storage permission on either side. */
fun zipSession(
    dir: File,
    out: OutputStream,
): Int {
    var entries = 0
    ZipOutputStream(out.buffered()).use { zip ->
        dir.walkTopDown().filter(File::isFile).forEach { file ->
            // MP4 is already compressed: deflating gigabytes again buys nothing and costs minutes of CPU.
            zip.setLevel(if (file.extension.equals("mp4", ignoreCase = true)) Deflater.NO_COMPRESSION else Deflater.DEFAULT_COMPRESSION)
            zip.putNextEntry(ZipEntry("${dir.name}/${file.relativeTo(dir).invariantSeparatorsPath}"))
            file.inputStream().use { it.copyTo(zip) }
            zip.closeEntry()
            entries++
        }
    }
    return entries
}
