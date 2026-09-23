package com.chesslab.arena

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File

/** Only VISIBLE figures are headlined: a covered cell is masked out of the loss, so a metric counting it
 *  measures the hand, not the classifier. */
class ModelCard(
    private val metrics: JsonObject,
) {
    private fun number(key: String): Double? = metrics[key]?.jsonPrimitive?.doubleOrNull

    /** Was keine Zahl ist, ist NICHT GEMESSEN — als 0.0 stuende es als schwaechste Klasse ganz oben. */
    private val recall: Map<String, Double>
        get() =
            metrics["recall"]
                ?.jsonObject
                ?.mapNotNull { (key, value) -> (value as? JsonPrimitive)?.doubleOrNull?.let { key to it } }
                ?.toMap()
                .orEmpty()

    fun lines(worst: Int): List<String> =
        listOfNotNull(
            HEADLINE
                .mapNotNull { (label, key) -> number(key)?.let { "$label ${fixed(it, DIGITS)}" } }
                .joinToString(" · ")
                .ifEmpty { null },
            recall
                .entries
                .sortedBy { it.value }
                .take(worst)
                .joinToString(" · ") { "${it.key} ${fixed(it.value, DIGITS)}" }
                .ifEmpty { null }
                ?.let { "lowest recall (covered cells INCLUDED — partly a map of where the hand is): $it" },
        )
}

/** Not fatal: the card is documentation and may not stop a measurement. */
fun modelCard(model: String): ModelCard? =
    runCatching {
        val dir = File(MODEL_CARDS, model)
        val card = Json.parseToJsonElement(File(dir, "model_card.json").readText()).jsonObject
        val metrics = card["metrics"]?.jsonObject?.takeIf { it.isNotEmpty() } ?: evaluation(dir)
        ModelCard(metrics ?: card)
    }.getOrNull()

private fun evaluation(dir: File): JsonObject? =
    dir
        .listFiles { file -> file.name.startsWith("eval_") && file.extension == "json" }
        ?.sortedBy { it.name }
        ?.lastOrNull()
        ?.let { Json.parseToJsonElement(it.readText()).jsonObject }

val MODEL_CARDS = File("../../data/models")

/** `board_acc` is absent: coverage alone caps it at 54 %, so it cannot separate two models. */
private val HEADLINE =
    listOf(
        "visible piece" to "visible_piece_acc",
        "visible occupied" to "visible_occupied_acc",
        "square (covered included)" to "square_acc",
    )

private const val DIGITS = 3
