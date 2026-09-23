package com.chesslab.desktop.testutil

import com.chesslab.desktop.PACK_CROP_BYTES
import com.chesslab.desktop.PACK_CROP_SIDE
import com.chesslab.desktop.digestHex
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import java.io.File
import java.security.MessageDigest

internal fun packManifest(out: File): List<JsonObject> =
    File(out, "manifest.jsonl").readLines().filter { it.isNotBlank() }.map { Json.parseToJsonElement(it).jsonObject }

/** Prints a hash of the whole pack with [root] masked, so two builds of one fixture can be compared. */
internal fun assertPackConsistent(
    out: File,
    root: File,
    tag: String,
): Int {
    val rows = packManifest(out)
    val meta = Json.parseToJsonElement(File(out, "packed_meta.json").readText()) as JsonObject
    assertEquals(rows.size, meta.getValue("n").jsonPrimitive.int)
    assertEquals(rows.size.toLong() * PACK_CROP_BYTES, File(out, "packed_images.u8").length())
    assertEquals(
        rows.map { it.getValue("path").jsonPrimitive.content },
        meta.getValue("paths").jsonArray.map { it.jsonPrimitive.content },
    )
    val digest = MessageDigest.getInstance("SHA-256")
    for (row in rows) {
        val path = row.getValue("path").jsonPrimitive.content
        val label = row.getValue("label").jsonPrimitive.content
        digest.update("$path\u0000$label\u0000[$PACK_CROP_SIDE, $PACK_CROP_SIDE]\n".toByteArray())
    }
    assertEquals(digestHex(digest), meta.getValue("digest").jsonPrimitive.content)
    val whole = MessageDigest.getInstance("SHA-256")
    val masked = root.absolutePath.replace("\\", "\\\\")
    out.walkTopDown().filter { it.isFile }.sortedBy { it.name }.forEach {
        whole.update(it.name.toByteArray())
        whole.update(if (it.extension == "u8") it.readBytes() else it.readText().replace(masked, "ROOT").toByteArray())
    }
    println("PACKHASH $tag ${digestHex(whole)}")
    return rows.size
}
