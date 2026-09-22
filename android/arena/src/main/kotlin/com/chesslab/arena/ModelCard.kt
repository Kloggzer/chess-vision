package com.chesslab.arena

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File

/**
 * What a model's own training run measured about it — its test split, not this arena's footage.
 *
 * Only the VISIBLE figures are headlined. A covered cell keeps its FEN label but is masked out of
 * the classification loss, so the model never learns it and a metric that counts it measures the
 * hand, not the classifier (`TODO.md`, measured 2026-08-25).
 */
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

    /** The headline plus the weakest [worst] classes, as printable lines. */
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

/**
 * `model_card.json` beside the run, or null.
 *
 * Deliberately not fatal: the card is documentation, and a missing one may not stop a measurement
 * from running.
 */
fun modelCard(model: String): ModelCard? =
    runCatching {
        val dir = File(MODEL_CARDS, model)
        val card = Json.parseToJsonElement(File(dir, "model_card.json").readText()).jsonObject
        val metrics = card["metrics"]?.jsonObject?.takeIf { it.isNotEmpty() } ?: evaluation(dir)
        ModelCard(metrics ?: card)
    }.getOrNull()

/** Some runs leave `metrics` empty and write the numbers to `eval_<split>.json` beside it. */
private fun evaluation(dir: File): JsonObject? =
    dir
        .listFiles { file -> file.name.startsWith("eval_") && file.extension == "json" }
        ?.sortedBy { it.name }
        ?.lastOrNull()
        ?.let { Json.parseToJsonElement(it.readText()).jsonObject }

/** Where the training runs live. Not in the APK: the card is for a reader, not for the phone. */
val MODEL_CARDS = File("../../data/models")

/**
 * `board_acc` is deliberately absent: it demands all 64 cells at once, covered ones included, so
 * it is capped at 54 % by coverage alone and is `piece_acc` to the 32nd besides. A number that is
 * almost always zero cannot separate two models.
 */
private val HEADLINE =
    listOf(
        "visible piece" to "visible_piece_acc",
        "visible occupied" to "visible_occupied_acc",
        "square (covered included)" to "square_acc",
    )

private const val DIGITS = 3
