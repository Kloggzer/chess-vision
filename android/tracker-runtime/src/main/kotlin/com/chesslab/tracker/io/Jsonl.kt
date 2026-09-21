package com.chesslab.tracker.io

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import java.io.File
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.StandardCopyOption

private val NEWLINE = Regex("\r?\n")

/** Eine kaputte Zeile, die ein laufender Schreiber NICHT erklaert — die letzte war sie nicht. */
class JsonlCorrupt(
    file: File,
    line: Int,
    cause: Throwable,
) : RuntimeException("$file: Zeile $line ist kaputt und nicht die letzte", cause)

/**
 * Der eine Leser fuer `.jsonl` — dieselbe Politik wie `chesslab.ioutil` und `lib/jsonl.ts`:
 * der ZEILENUMBRUCH entscheidet, ob eine kaputte Zeile ein Schreiber oder Beschaedigung ist.
 */
object Jsonl {
    fun rows(file: File): List<JsonObject> = if (file.isFile) parse(file, file.readText()) else emptyList()

    internal fun parse(
        file: File,
        text: String,
    ): List<JsonObject> {
        // Fuehrendes BOM weg, wie `utf-8-sig` in `chesslab.ioutil` und `stripBom` in `lib/jsonl.ts`:
        // PowerShells `Out-File` stempelt eines, und der Desktop liest dieselben Dateien wie Python.
        val lines = text.removePrefix("\uFEFF").split(NEWLINE)
        // Wer mitten in einer Zeile erschlagen wurde, hat den Umbruch dahinter nicht mehr
        // geschrieben — die kaputte Zeile ist dann die LETZTE. Steht dort einer, war der
        // Schreiber fertig, und eine kaputte Zeile davor ist Beschaedigung.
        val rows = ArrayList<JsonObject>(lines.size)
        lines.forEachIndexed { index, line ->
            if (line.isBlank()) return@forEachIndexed
            val parsed = runCatching { Json.parseToJsonElement(line) }
            val element: JsonElement? = parsed.getOrNull()
            when {
                element != null -> (element as? JsonObject)?.let { rows += it }
                index == lines.lastIndex -> Unit
                else -> throw JsonlCorrupt(file, index + 1, parsed.exceptionOrNull()!!)
            }
        }
        return rows
    }
}

/**
 * Temp file + move. If the move cannot be atomic on this filesystem we still never truncate the
 * destination first — a copy over a complete temp file is the next best guarantee.
 */
fun writeAtomic(
    file: File,
    text: String,
) {
    val tmp = File(file.parentFile, "${file.name}.tmp")
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
