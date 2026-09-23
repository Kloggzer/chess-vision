package com.chesslab.tracker.settings

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.Json

/** A slot that does not decode loads [defaults], never a partial value. */
open class JsonPrefs<T>(
    private val store: ConfigStore,
    private val slot: String,
    private val serializer: KSerializer<T>,
    private val defaults: T,
    private val json: Json,
) {
    private val cache = MutableStateFlow(defaults)

    val prefs: StateFlow<T> = cache

    suspend fun load(): T {
        val loaded = store.read(slot)?.let { runCatching { json.decodeFromString(serializer, it) }.getOrNull() }
        return (loaded ?: defaults).also { cache.value = it }
    }

    suspend fun save(prefs: T) {
        cache.value = prefs
        store.write(slot, json.encodeToString(serializer, prefs))
    }
}
