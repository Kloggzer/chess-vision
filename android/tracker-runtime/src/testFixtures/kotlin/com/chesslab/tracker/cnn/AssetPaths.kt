package com.chesslab.tracker.cnn

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File

/** A fixture because two modules read them, and a second definition could assert against an unshipped model. */
fun androidRoot(): File {
    var dir = File(System.getProperty("user.dir")!!).absoluteFile
    while (!File(dir, "app/src/main/assets/cnn_model").isDirectory) {
        dir = dir.parentFile ?: error("cnn_model assets not found above ${System.getProperty("user.dir")}")
    }
    return dir
}

fun assetDirOf(model: String): File = File(androidRoot(), "app/src/main/assets/cnn_model/$model")

fun assetDir(): File = assetDirOf(DEFAULT_MODEL)

fun assetClasses(): List<String> =
    Json
        .parseToJsonElement(File(assetDir(), MODEL_CONFIG_FILE).readText())
        .jsonObject
        .getValue("classes")
        .jsonArray
        .map { it.jsonPrimitive.content }
