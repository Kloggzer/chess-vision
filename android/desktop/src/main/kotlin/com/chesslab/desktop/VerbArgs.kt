package com.chesslab.desktop

import java.io.File

/** Gradle's `--args` splits on spaces, so a path spells its spaces as `~`. */
internal fun String.fileArg(): File = File(replace('~', ' '))

internal fun List<String>.stringOption(name: String): String? = firstOrNull { it.startsWith("$name=") }?.substringAfter('=')

internal fun List<String>.intOption(
    name: String,
    fallback: Int,
): Int = stringOption(name)?.toIntOrNull() ?: fallback

internal fun List<String>.doubleOption(name: String): Double? = stringOption(name)?.toDoubleOrNull()?.takeIf { it > 0.0 }
