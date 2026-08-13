@file:Suppress("MagicNumber")

package com.chesslab.desktop

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.opencv.imgcodecs.Imgcodecs
import java.io.File
import java.io.FileOutputStream
import java.nio.charset.StandardCharsets.UTF_8
import java.security.MessageDigest
import java.util.Locale

private val LEGACY_CLASSES =
    listOf("empty", "wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK")

/**
 * `legacy-synth-dataset <legacyRoot> <manifest> <outDir> [prefix=pretrain-synth__]`.
 *
 * Reclaims the project's own parked synthetic crops without letting Python ingest them. PNG pixels
 * are decoded once, resized to the deployment crop size, and written directly into the final RGB
 * memmap. Whole pseudo-sessions form train/val/test, so nearby renders cannot cross split borders.
 */
@Suppress("LongMethod", "NestedBlockDepth")
fun buildLegacySynthDataset(args: List<String>) {
    require(args.size >= 3) { legacyUsage() }
    val root = File(args[0].replace('~', ' '))
    val sourceManifest = File(args[1].replace('~', ' '))
    val outDir = File(args[2].replace('~', ' '))
    val prefix = args.firstOrNull { it.startsWith("prefix=") }?.substringAfter('=') ?: "pretrain-synth__"
    require(root.isDirectory && sourceManifest.isFile) { "legacy root and manifest must exist" }
    require(!outDir.exists()) { "refusing to overwrite existing dataset: ${outDir.absolutePath}" }

    val sessions = linkedSetOf<String>()
    sourceManifest.forEachLine { line ->
        val row = Json.parseToJsonElement(line) as JsonObject
        row["session_id"]
            ?.jsonPrimitive
            ?.content
            ?.takeIf { it.startsWith(prefix) }
            ?.let(sessions::add)
    }
    require(sessions.size >= 3) { "need at least three matching synth sessions, found ${sessions.size}" }
    val ordered = sessions.sorted()
    val test = ordered.last()
    val validation = ordered[ordered.lastIndex - 1]
    val training = ordered.dropLast(2).toSet()
    outDir.mkdirs()

    val digest = MessageDigest.getInstance("SHA-256")
    val paths = StringBuilder("[")
    val counts = mutableMapOf<String, Int>()
    val roleCounts = mutableMapOf("train" to 0, "val" to 0, "test" to 0)
    var total = 0
    File(outDir, "manifest.jsonl").bufferedWriter().use { rowsOut ->
        FileOutputStream(File(outDir, "packed_images.u8.partial")).use { imageOut ->
            listOf("train", "val", "test").forEach { role ->
                sourceManifest.forEachLine { line ->
                    val row = Json.parseToJsonElement(line) as JsonObject
                    val session = row["session_id"]?.jsonPrimitive?.content ?: return@forEachLine
                    if (!session.startsWith(prefix) || roleOf(session, training, validation, test) != role) {
                        return@forEachLine
                    }
                    val label = row.getValue("label").jsonPrimitive.content
                    if (label !in LEGACY_CLASSES) return@forEachLine
                    val input = resolveLegacyPath(root, row.getValue("path").jsonPrimitive.content)
                    val image = Imgcodecs.imread(input.absolutePath)
                    require(!image.empty()) { "could not decode ${input.absolutePath}" }
                    try {
                        val packed = resizeForPacking(image)
                        try {
                            val data = ByteArray(PACK_CROP_BYTES)
                            packed.get(0, 0, data)
                            bgrToRgbInPlace(data)
                            imageOut.write(data)
                        } finally {
                            packed.release()
                        }
                    } finally {
                        image.release()
                    }
                    val frame = row.getValue("frame").jsonPrimitive.content
                    val square = row.getValue("square").jsonPrimitive.content
                    val path = "mm://$session/$frame/$square"
                    rowsOut.append(legacyManifestRow(path, session, frame, square, label)).append('\n')
                    if (paths.length > 1) paths.append(',')
                    paths.append('"').append(json(path)).append('"')
                    updateLegacyDigest(digest, path, label)
                    if (role == "train") counts[label] = counts.getOrDefault(label, 0) + 1
                    roleCounts[role] = roleCounts.getValue(role) + 1
                    total++
                    if (total % 10_000 == 0) println("legacy synth: packed $total crops")
                }
            }
        }
    }
    val partial = File(outDir, "packed_images.u8.partial")
    val packedFile = File(outDir, "packed_images.u8")
    check(partial.renameTo(packedFile)) { "could not finalize ${packedFile.absolutePath}" }
    paths.append(']')
    File(outDir, "packed_meta.json").writeText(
        "{\"n\":$total,\"h\":$PACK_CROP_SIDE,\"w\":$PACK_CROP_SIDE," +
            "\"digest\":\"${digestHex(digest)}\",\"paths\":$paths}\n",
    )
    writeLegacySplit(outDir, training.sorted(), validation, test, roleCounts, counts)
    File(outDir, "dataset.yaml").writeText(
        "name: ${outDir.name}\nclass_mode: pieces13\nfused_turntable: true\nrotations: []\n" +
            "session_ids:\n" + ordered.joinToString("") { "  - $it\n" },
    )
    println("assembled legacy synth: train=${roleCounts["train"]}, val=${roleCounts["val"]}, test=${roleCounts["test"]}")
}

private fun roleOf(
    session: String,
    training: Set<String>,
    validation: String,
    test: String,
): String =
    when (session) {
        in training -> "train"
        validation -> "val"
        test -> "test"
        else -> error("unassigned session $session")
    }

private fun resolveLegacyPath(
    root: File,
    raw: String,
): File {
    val direct = File(root, raw)
    if (direct.isFile) return direct
    return File(root, raw.replace('\\', '/').removePrefix("data/"))
}

private fun legacyManifestRow(
    path: String,
    session: String,
    frame: String,
    square: String,
    label: String,
): String =
    "{\"path\":\"${json(path)}\",\"session_id\":\"${json(session)}\",\"frame\":\"${json(frame)}\"," +
        "\"square\":\"$square\",\"label\":\"$label\",\"out_size\":[$PACK_CROP_SIDE,$PACK_CROP_SIDE]," +
        "\"pad_side\":0.05,\"pad_up\":0.0}"

private fun updateLegacyDigest(
    digest: MessageDigest,
    path: String,
    label: String,
) {
    digest.update(path.toByteArray(UTF_8))
    digest.update(byteArrayOf(0))
    digest.update(label.toByteArray(UTF_8))
    digest.update(byteArrayOf(0))
    digest.update("[$PACK_CROP_SIDE, $PACK_CROP_SIDE]".toByteArray(UTF_8))
    digest.update(byteArrayOf('\n'.code.toByte()))
}

private fun writeLegacySplit(
    outDir: File,
    training: List<String>,
    validation: String,
    test: String,
    roleCounts: Map<String, Int>,
    counts: Map<String, Int>,
) {
    val total = counts.values.sum()
    val present = counts.count { it.value > 0 }
    val weights = LEGACY_CLASSES.associateWith { label -> total.toDouble() / (present * (counts[label] ?: 1)) }

    fun quoted(values: List<String>) = values.joinToString { "\"$it\"" }
    File(outDir, "split.json").writeText(
        "{\n  \"seed\": 42,\n  \"classes\": [${quoted(LEGACY_CLASSES)}],\n" +
            "  \"class_weights\": {${weights.entries.joinToString { "\"${it.key}\":${"%.6f".format(Locale.ROOT, it.value)}" }}},\n" +
            "  \"splits\": {\"train\":[${quoted(training)}],\"val\":[\"$validation\"],\"test\":[\"$test\"]},\n" +
            "  \"counts\": {\"train\":${roleCounts["train"]},\"val\":${roleCounts["val"]},\"test\":${roleCounts["test"]}},\n" +
            "  \"train_class_counts\": {${LEGACY_CLASSES.joinToString { "\"$it\":${counts[it] ?: 0}" }}},\n" +
            "  \"train_subsample\": {\"max_empty_ratio\":null,\"max_class_ratio\":null,\"seed\":42},\n" +
            "  \"warnings\": []\n}\n",
    )
}

private fun legacyUsage(): Nothing = error("usage: legacy-synth-dataset <legacyRoot> <manifest.jsonl> <outDir> [prefix=pretrain-synth__]")
