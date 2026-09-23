package com.chesslab.cnn

internal fun FixtureRow.str(key: String): String = this[key] as String

internal fun FixtureRow.strOrNull(key: String): String? = this[key] as String?

internal fun FixtureRow.num(key: String): Double = (this[key] as Number).toDouble()

internal fun FixtureRow.int(key: String): Int = (this[key] as Number).toInt()

internal fun FixtureRow.bool(key: String): Boolean = this[key] as Boolean

internal fun FixtureRow.strings(key: String): List<String> = (this[key] as List<*>).map { it as String }

internal fun FixtureRow.numberMap(key: String): Map<String, Double> =
    (this[key] as Map<*, *>).entries.associate { (k, v) -> k as String to (v as Number).toDouble() }

internal fun FixtureRow.stringMap(key: String): Map<String, String> =
    (this[key] as Map<*, *>).entries.associate { (k, v) -> k as String to v as String }

internal fun FixtureRow.boolMap(key: String): Map<String, Boolean> =
    (this[key] as Map<*, *>).entries.associate { (k, v) -> k as String to v as Boolean }
