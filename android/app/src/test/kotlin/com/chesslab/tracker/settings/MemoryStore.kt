package com.chesslab.tracker.settings

/** DataStore needs a Context and a real file; the repository's decisions do not. */
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
