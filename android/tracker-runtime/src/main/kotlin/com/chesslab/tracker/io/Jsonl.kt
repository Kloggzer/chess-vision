package com.chesslab.tracker.io

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import java.io.File
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.util.UUID
import java.util.concurrent.atomic.AtomicLong

private val NEWLINE = Regex("\r?\n")

/** Eine kaputte Zeile, die ein laufender Schreiber NICHT erklaert. */
class JsonlCorrupt(
    file: File,
    line: Int,
    cause: Throwable,
) : RuntimeException("$file: Zeile $line ist kaputt und nicht die letzte", cause)

/** Dieselbe Politik wie `chesslab.ioutil` und `lib/jsonl.ts`: der ZEILENUMBRUCH entscheidet, ob eine kaputte
 *  Zeile ein Schreiber oder Beschaedigung ist. */
object Jsonl {
    fun rows(file: File): List<JsonObject> = if (file.isFile) parse(file, file.readText()) else emptyList()

    fun strictRows(file: File): List<JsonObject> = parse(file, file.readText(), false)

    fun appendEncoded(
        file: File,
        row: String,
    ) = file.appendText("$row\n")

    fun replaceEncoded(
        file: File,
        rows: Iterable<String>,
    ) = file.writeText(rows.joinToString("") { "$it\n" })

    internal fun parse(
        file: File,
        text: String,
        liveWriter: Boolean = true,
    ): List<JsonObject> {
        // Fuehrendes BOM weg: PowerShells `Out-File` stempelt eines, und der Desktop liest dieselben Dateien wie Python.
        val lines = text.removePrefix("\uFEFF").split(NEWLINE)
        // Ein erschlagener Schreiber hat den Umbruch nicht mehr geschrieben: die kaputte Zeile ist dann die LETZTE.
        val rows = ArrayList<JsonObject>(lines.size)
        lines.forEachIndexed { index, line ->
            if (line.isBlank()) return@forEachIndexed
            val parsed = runCatching { Json.parseToJsonElement(line) }
            val element: JsonElement? = parsed.getOrNull()
            when {
                element != null -> (element as? JsonObject)?.let { rows += it }
                liveWriter && index == lines.lastIndex -> Unit
                liveWriter -> throw JsonlCorrupt(file, index + 1, parsed.exceptionOrNull()!!)
                else -> throw parsed.exceptionOrNull()!!
            }
        }
        return rows
    }
}

/** Eigene Nebendatei je Schreibvorgang: unter EINEM `<name>.tmp` bekaeme das Ziel den Mischmasch zweier Vorgaenge. */
internal fun sideFile(file: File): File = sideFiles(file)

val defaultSideFiles: (File) -> File = { File(it.parentFile, "${it.name}.$SIDE_TAG-${SIDE_SEQ.incrementAndGet()}.tmp") }

/** Nur Tests hebeln das aus. Oeffentlich, weil `:app` seine eigenen Schreiber prueft. */
var sideFiles: (File) -> File = defaultSideFiles

private val SIDE_TAG = UUID.randomUUID().toString().take(8)
private val SIDE_SEQ = AtomicLong()

/** Never truncates the destination first: if the move cannot be atomic, a copy over a complete temp file. */
fun writeAtomic(
    file: File,
    text: String,
) {
    val tmp = sideFile(file)
    // Das Umhaengen gehoert MIT in die Klammer: scheitert es, bliebe die Nebendatei sonst liegen.
    runCatching {
        tmp.writeText(text)
        runCatching {
            Files.move(tmp.toPath(), file.toPath(), StandardCopyOption.ATOMIC_MOVE)
        }.recoverCatching { error ->
            if (error !is AtomicMoveNotSupportedException) throw error
            Files.move(tmp.toPath(), file.toPath(), StandardCopyOption.REPLACE_EXISTING)
        }.getOrThrow()
    }.onFailure {
        if (tmp.isFile) tmp.delete()
        throw it
    }
}
