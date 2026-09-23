package com.chesslab.arena

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Eine ungemessene Klasse darf nicht als 0,000 unter den schwaechsten stehen. */
class ModelCardTest {
    private fun card(body: String) = ModelCard(Json.parseToJsonElement(body).jsonObject)

    @Test
    fun `an unmeasured class is left out of the lowest recall line`() {
        val lines = card("""{"recall": {"wP": 0.99, "wN": null, "bK": 0.42}}""").lines(WORST)
        assertEquals(listOf("lowest recall (covered cells INCLUDED — partly a map of where the hand is): bK 0.420 · wP 0.990"), lines)
    }

    @Test
    fun `measured classes still sort weakest first`() {
        val lines = card("""{"recall": {"wP": 0.99, "wN": 0.10, "bK": 0.42}}""").lines(WORST)
        assertEquals(1, lines.size)
        assertEquals(true, lines[0].endsWith("wN 0.100 · bK 0.420 · wP 0.990"))
    }

    private companion object {
        const val WORST = 4
    }
}
