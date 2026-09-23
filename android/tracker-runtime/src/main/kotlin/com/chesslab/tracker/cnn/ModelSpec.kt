package com.chesslab.tracker.cnn

import com.chesslab.cnn.IMAGENET_MEAN
import com.chesslab.cnn.IMAGENET_STD
import com.chesslab.cnn.InputRepr
import com.chesslab.cnn.requireExpectedClasses
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.double
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** Plausibility only: an *untrained* size inside the band fails silently (`occ-v4-f3e20` read 133 occupied
 *  squares as empty at 80 px against 19 at 96). The app checks the graph against the config instead. */

private const val MIN_INPUT_SIZE = 32
private const val MAX_INPUT_SIZE = 512

// Der einzige `clahe_denoise`-Wert, den `CropClahe` reproduziert; der `--clahe-tile`-Default; die Bandgrenze.
private const val DENOISE_OFF = "off"
private const val DEFAULT_CLAHE_TILE = 8
private const val MAX_LEVEL = 255.0

/** Everything here is READ from the asset — a classifier once hardcoded the ImageNet stats while every run
 *  writes its real ones. The only literals below are the assertions. */
data class ModelSpec(
    val classes: List<String>,
    /** `infer_size` when declared, else `out_size`. NOT necessarily the size the training crops on disk had:
     *  the right input size is a property of the model. */
    val outWidth: Int,
    val outHeight: Int,
    /** How much of the square's SURROUNDINGS one crop carries, in cells. Null = LEGACY, never a default:
     *  guessing a pad is the failure the key exists to end ([declaresCrop]). */
    val padSide: Double? = null,
    val mean: List<Float>,
    val std: List<Float>,
    /** `"per_crop"` standardises EACH crop by its own statistics and ignores [mean]/[std]. */
    val perCrop: Boolean = false,
    /** Wrong here feeds the graph a tensor of the wrong width, which is why it is read rather than assumed. */
    val repr: InputRepr = InputRepr.RGB,
    /** ONE sigmoid BESIDE the classes. A 13-class coverage run and the old 14-class run are both 14 wide, so the
     *  width comes only from this: softmaxing all 14 turns coverage into a class and bends every other one. */
    val coverageOutput: Boolean = false,
    /** Je Modell verschieden, weil die Schwelle aus seiner Guete folgt (`docs/occlusion-gate.md`). */
    val coverageGate: Double? = null,
    /** Alle sieben Modelle liegen ueber 1: ungelesen sah `cnnConfThr` schaerfere Werte als seine Eichung. */
    val temperature: Double = 1.0,
    /** Die Legalitaets-Staerke auf den ROHEN Logits, je Modell. */
    val priorLambda: Double? = null,
    /** VOR der Normalisierung, wie im Training. Das Fenster ist ein BAND und kein Schwellwert; 0 heisst aus. */
    val claheClip: Double = 0.0,
    val claheTile: Int = DEFAULT_CLAHE_TILE,
    val claheMinMean: Double = 0.0,
    val claheMaxMean: Double = MAX_LEVEL,
) {
    val channels: Int get() = repr.channels

    val outputWidth: Int get() = classes.size + if (coverageOutput) 1 else 0

    /** Decides whether the pixels about to be cut are what this model was trained on. */
    val declaresCrop: Boolean get() = padSide != null

    companion object {
        /** Throws when the class list is not a canonical order: a reordered list silently relabels every piece. */
        fun parse(json: String): ModelSpec {
            val root = Json.parseToJsonElement(json).jsonObject
            // Absent `infer_size` means both are the same — a live path, not a legacy one.
            val size = root["infer_size"]?.jsonArray ?: root.getValue("out_size").jsonArray
            val outWidth = size[0].jsonPrimitive.content.toInt()
            val outHeight = size[1].jsonPrimitive.content.toInt()
            require(outWidth in MIN_INPUT_SIZE..MAX_INPUT_SIZE && outHeight in MIN_INPUT_SIZE..MAX_INPUT_SIZE) {
                "model input size ${outWidth}x$outHeight is outside the plausible range " +
                    "$MIN_INPUT_SIZE..$MAX_INPUT_SIZE"
            }
            // Old configs predate `normalize` and were trained on the ImageNet stats. Nothing else may fall back.
            val normalize = root["normalize"]?.jsonObject
            // Both pads or neither: the missing half would be filled from the profile — a box nobody chose.
            // Verlangte Vorverarbeitung, die diese Seite nicht kann, wird abgelehnt: sonst kostet sie still Punkte.
            val denoise = root["clahe_denoise"]?.jsonPrimitive?.content ?: DENOISE_OFF
            require(denoise == DENOISE_OFF) {
                "model asks for clahe_denoise=$denoise, which this runtime does not implement — " +
                    "serving it without would feed it crops it was never trained on"
            }
            val padSide = root["pad_side"]?.jsonPrimitive?.content?.toDouble()
            return ModelSpec(
                classes = requireExpectedClasses(root.getValue("classes").jsonArray.map { it.jsonPrimitive.content }),
                outWidth = outWidth,
                outHeight = outHeight,
                padSide = padSide,
                mean = normalize.statsOr("mean", IMAGENET_MEAN),
                std = normalize.statsOr("std", IMAGENET_STD).onEach { require(it > 0f && it.isFinite()) { "std $it is no spread" } },
                perCrop = normalize?.get("mode")?.jsonPrimitive?.content == "per_crop",
                repr = root["input_repr"]?.jsonPrimitive?.content?.let(InputRepr::of) ?: InputRepr.RGB,
                coverageOutput = root["coverage_output"]?.jsonPrimitive?.boolean ?: false,
                coverageGate = root.measured("coverage_gate") { it in 0.0..1.0 },
                temperature = root.measured("temperature") { it > 0.0 && it.isFinite() } ?: 1.0,
                priorLambda = root.measured("prior_lambda") { it >= 0.0 && it.isFinite() },
                claheClip = root["clahe_clip"]?.jsonPrimitive?.double ?: 0.0,
                claheTile = root["clahe_tile"]?.jsonPrimitive?.content?.toInt() ?: DEFAULT_CLAHE_TILE,
                claheMinMean = root["clahe_min_mean"]?.jsonPrimitive?.double ?: 0.0,
                claheMaxMean = root["clahe_max_mean"]?.jsonPrimitive?.double ?: MAX_LEVEL,
            )
        }

        /** An EINER Stelle geprueft, nicht je Leser (die Temperatur fiel dreimal). */
        private fun JsonObject.measured(
            key: String,
            valid: (Double) -> Boolean,
        ): Double? = this[key]?.jsonPrimitive?.double?.also { require(valid(it)) { "model declares $key=$it, outside its range" } }

        /** Der Alt-Pfad ist das FEHLENDE `normalize`, nicht ein halbes: sonst still mit ImageNet bedient. */
        private fun JsonObject?.statsOr(
            key: String,
            legacy: List<Float>,
        ): List<Float> {
            if (this == null) return legacy
            val raw = get(key)
            require(raw != null) { "normalize declares no \"$key\" — ImageNet is not what such a run trained on" }
            return raw.jsonArray.map { it.jsonPrimitive.content.toFloat() }
        }
    }
}
