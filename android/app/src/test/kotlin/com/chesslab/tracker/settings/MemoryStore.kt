package com.chesslab.tracker.settings

internal class MemoryStore(
    text: String? = null,
) : ConfigStore {
    val slots = mutableMapOf<String, String>().apply { text?.let { put(SLOT_CONFIG, it) } }
    var writes = 0

    override suspend fun read(slot: String): String? = slots[slot]

    override suspend fun write(
        slot: String,
        text: String,
    ) {
        slots[slot] = text
        writes += 1
    }
}
