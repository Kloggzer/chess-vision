package com.chesslab.tracker.cnn

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File

/**
 * The committed model assets, found from the source tree. A fixture because two modules read them,
 * and a second definition would let one assert against a model the other never ships.
 */
fun androidRoot(): File {
    var dir = File(System.getProperty("user.dir")!!).absoluteFile
    while (!File(dir, "app/src/main/assets/cnn_model").isDirectory) {
        dir = dir.parentFile ?: error("cnn_model assets not found above ${System.getProperty("user.dir")}")
    }
    return dir
}

/** `app/src/main/assets/cnn_model/<model>` — a committed model directory, read from the source tree. */
fun assetDirOf(model: String): File = File(androidRoot(), "app/src/main/assets/cnn_model/$model")

/** The model an install runs until the user picks another one. */
fun assetDir(): File = assetDirOf(DEFAULT_MODEL)

/** The class list the bundled `config.json` literally declares. */
fun assetClasses(): List<String> =
    Json
        .parseToJsonElement(File(assetDir(), MODEL_CONFIG_FILE).readText())
        .jsonObject
        .getValue("classes")
        .jsonArray
        .map { it.jsonPrimitive.content }
