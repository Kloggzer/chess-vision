package com.chesslab.desktop

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest

private val CANONICAL_CLASSES =
    listOf("empty", "wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK", "occluded")

/**
 * Join Kotlin-ingested video packs into one training dataset without decoding or rewriting them in
 * Python. The split roles are explicit so the reserved test video can never drift into training.
 */
@Suppress("MagicNumber")
fun assembleTurntableDataset(args: List<String>) {
    require(args.size >= 4) {
        "usage: turntable-dataset <outDir> <testPack> <valPack> <trainPack> [trainPack...]"
    }
    val outDir = args[0].asFileArg()
    val test = args[1].asFileArg()
    val validation = args[2].asFileArg()
    val emptyRatio = args.firstOrNull { it.startsWith("emptyRatio=") }?.substringAfter('=')?.toDouble()
    val training = args.drop(3).filterNot { '=' in it }.map(String::asFileArg)
    require(!outDir.exists()) { "refusing to overwrite existing dataset: ${outDir.absolutePath}" }
    val packs = training.map { Pack(it, "train") } + Pack(validation, "val") + Pack(test, "test")
    require(packs.map { it.session }.distinct().size == packs.size) { "every pack must have a unique session_id" }
    require(packs.map { it.side }.distinct().size == 1) { "all packs must use the same crop dimensions" }

    outDir.mkdirs()
    val rows = mutableListOf<JsonObject>()
    FileOutputStream(File(outDir, "packed_images.u8")).use { output ->
        packs.forEach { pack ->
            require(pack.file.length() == pack.rows.size.toLong() * pack.side * pack.side * 3) {
                "${pack.dir.name}: memmap byte count does not match manifest"
            }
            pack.file.inputStream().use { it.transferTo(output) }
            rows += pack.rows
        }
    }
    File(outDir, "manifest.jsonl").bufferedWriter().use { writer ->
        rows.forEach { writer.append(it.toString()).append('\n') }
    }
    writePackedMeta(outDir, rows)
    writeSplit(outDir, packs, emptyRatio)
    writeDatasetYaml(outDir, packs)
    println(
        "assembled ${rows.size} crops: " +
            "train=${packs.filter { it.role == "train" }.sumOf { it.rows.size }}, " +
            "val=${packs.single { it.role == "val" }.rows.size}, " +
            "test=${packs.single { it.role == "test" }.rows.size} -> ${outDir.absolutePath}",
    )
}

private class Pack(
    val dir: File,
    val role: String,
) {
    val file = File(dir, "packed_images.u8")
    val rows =
        File(dir, "manifest.jsonl").readLines().filter(String::isNotBlank).map {
            Json.parseToJsonElement(it) as JsonObject
        }
    val session = rows.first()["session_id"]!!.jsonPrimitive.content
    val side =
        rows
            .first()["out_size"]!!
            .jsonArray
            .first()
            .jsonPrimitive.content
            .toInt()

    init {
        require(file.isFile && rows.isNotEmpty()) { "not a packed dataset: ${dir.absolutePath}" }
        require(rows.all { it["session_id"]!!.jsonPrimitive.content == session }) {
            "${dir.name}: a source pack must contain exactly one session"
        }
    }
}

private fun writePackedMeta(
    outDir: File,
    rows: List<JsonObject>,
) {
    val digest = MessageDigest.getInstance("SHA-256")
    val paths = rows.map { it["path"]!!.jsonPrimitive.content }
    rows.forEach { row ->
        digest.update(row["path"]!!.jsonPrimitive.content.toByteArray())
        digest.update(byteArrayOf(0))
        digest.update(row["label"]!!.jsonPrimitive.content.toByteArray())
        digest.update(byteArrayOf(0))
        val size = row["out_size"]!!.jsonArray.joinToString(prefix = "[", postfix = "]") { it.toString() }
        digest.update(size.toByteArray())
        digest.update(byteArrayOf('\n'.code.toByte()))
    }
    val hash = digest.digest().joinToString("") { "%02x".format(it.toInt() and 0xff) }.take(32)
    val side =
        rows
            .first()["out_size"]!!
            .jsonArray
            .first()
            .jsonPrimitive.content
            .toInt()
    File(outDir, "packed_meta.json").writeText(
        "{\"n\":${rows.size},\"h\":$side,\"w\":$side,\"digest\":\"$hash\",\"paths\":" +
            paths.joinToString(prefix = "[\"", separator = "\",\"", postfix = "\"]") + "}\n",
    )
}

private fun writeSplit(
    outDir: File,
    packs: List<Pack>,
    emptyRatio: Double?,
) {
    val trainPacks = packs.filter { it.role == "train" }
    val counts = trainPacks.flatMap { it.rows }.groupingBy { it["label"]!!.jsonPrimitive.content }.eachCount()
    require(counts.keys.all { it in CANONICAL_CLASSES }) { "unsupported labels: ${counts.keys - CANONICAL_CLASSES.toSet()}" }
    val classes = CANONICAL_CLASSES.filter { it in counts }
    val total = counts.values.sum()
    val present = counts.count { it.value > 0 }
    val weights =
        classes.associateWith { label ->
            counts[label]?.let { "%.4f".format(java.util.Locale.ROOT, total.toDouble() / (present * it)) }
                ?: "0.0"
        }

    fun sessions(role: String) = packs.filter { it.role == role }.joinToString { "\"${it.session}\"" }

    fun cropCount(role: String) = packs.filter { it.role == role }.sumOf { it.rows.size }

    File(outDir, "split.json").writeText(
        """{
  "seed": 42,
  "classes": [${classes.joinToString { "\"$it\"" }}],
  "class_weights": {${weights.entries.joinToString { "\"${it.key}\":${it.value}" }}},
  "splits": {"train":[${sessions("train")}],"val":[${sessions("val")}],"test":[${sessions("test")}]},
  "counts": {"train":${cropCount("train")},"val":${cropCount("val")},"test":${cropCount("test")}},
  "train_class_counts": {${classes.joinToString { "\"$it\":${counts[it] ?: 0}" }}},
  "train_subsample": {"max_empty_ratio":${emptyRatio ?: "null"},"max_class_ratio":null,"seed":42},
  "warnings": []
}
""",
    )
}

private fun writeDatasetYaml(
    outDir: File,
    packs: List<Pack>,
) {
    File(outDir, "dataset.yaml").writeText(
        "name: ${outDir.name}\n" +
            "class_mode: pieces${packs.flatMap { it.rows }.map { it["label"]!!.jsonPrimitive.content }.toSet().size}\n" +
            "fused_turntable: true\nrotations: []\n" +
            "session_ids:\n" + packs.joinToString("") { "  - ${it.session}\n" },
    )
}

private fun String.asFileArg(): File = File(replace('~', ' '))
