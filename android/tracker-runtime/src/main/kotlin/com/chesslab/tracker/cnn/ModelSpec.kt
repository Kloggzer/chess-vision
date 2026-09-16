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

/**
 * Plausibility band for a parsed input size — a typo or a truncated config must not reach the
 * network. It is deliberately NOT the safety story: an *untrained* size inside the band fails
 * silently (measured, specs/22 phase 00: `occ-v4-f3e20` reads 133 occupied squares as empty at
 * 80 px against 19 at 96 px), and only the exporter knows a run's trained `scales`, so that guard
 * lives there. What the app can check is that the graph it is about to run agrees with the config
 * beside it — see [OnnxSquareClassifier].
 */

private const val MIN_INPUT_SIZE = 32
private const val MAX_INPUT_SIZE = 512

// Der einzige `clahe_denoise`-Wert, den `CropClahe` reproduziert; der `--clahe-tile`-Default aus
// `training/torch_data.py`; und die Obergrenze, bei der das Band keins mehr ist.
private const val DENOISE_OFF = "off"
private const val DEFAULT_CLAHE_TILE = 8
private const val MAX_LEVEL = 255.0

/**
 * The subset of a run's `config.json` the tracker needs. Everything here is READ from the
 * asset — commit `ee7c83c` had to fix a classifier that hardcoded the ImageNet stats while
 * every run writes its real ones. The only literals below are the assertions.
 */
data class ModelSpec(
    val classes: List<String>,
    /**
     * The size crops are resized to and the size the graph takes — `infer_size` when the run
     * declares one, else `out_size` (specs/22). NOT necessarily the size the training crops on
     * disk were built at: what a crop actually carries is `board_size / 8 * (1 + 2 * padSide)` px,
     * 240 on this app's default geometry, so the right input size is a property of the model.
     */
    val outWidth: Int,
    val outHeight: Int,
    /**
     * `pad_side` — how much of the square's SURROUNDINGS one crop carries, in cells
     * (specs/45). [outWidth] says the picture is 80 px; this says whether those 80 px hold 1.10
     * or 1.20 of a cell, which is a different photograph of the same square and is what the
     * network was trained on.
     *
     * Null = the run declares none. That is LEGACY and never a default: guessing a pad here is
     * the exact failure the key exists to end, so the geometry keeps the calibration profile's
     * value and every path that can say so says so ([declaresCrop]).
     */
    val padSide: Double? = null,
    val mean: List<Float>,
    val std: List<Float>,
    /**
     * `normalize.mode` — `"per_crop"` standardises EACH crop by its own statistics and ignores
     * [mean]/[std] entirely. Serving MUST reproduce what training did; reading it from the run's
     * own config is what keeps the two from drifting apart silently.
     */
    val perCrop: Boolean = false,
    /**
     * `input_repr` — the channel stack the run's stem was BUILT for. Runs predating the flag have
     * no key and were plain RGB. Getting this wrong does not misclassify subtly; it feeds the graph
     * a tensor of the wrong width, which is why it is read rather than assumed.
     */
    val repr: InputRepr = InputRepr.RGB,
    /**
     * `coverage_output` — the graph carries ONE sigmoid unit BESIDE the classes (`head: occlusion`,
     * `training/occlusion.py`). A 13-class coverage run and the old 14-class run are both 14 columns
     * wide, so the width may only ever come from this declaration: a reader that softmaxes all 14
     * turns the coverage into a class probability and bends every other one. Absent = false, which
     * is what every model shipped before the occlusion head declares.
     */
    val coverageOutput: Boolean = false,
    /**
     * `coverage_gate` — ab welcher Verdeckung ein Feld dieses Modells nicht mehr zaehlt. Je Modell
     * verschieden, weil die Schwelle aus seiner Guete folgt (`docs/occlusion-gate.md`).
     */
    val coverageGate: Double? = null,
    /**
     * `clahe_*` — lokaler Kontrast je Crop, VOR der Normalisierung, wie im Training.
     *
     * Wer das ignoriert, fuettert ein Modell mit rohen Crops, das auf behandelten trainiert
     * wurde. Das Fenster ist ein BAND und kein Schwellwert (`docs/clahe-band.md`); 0 heisst aus.
     */
    val claheClip: Double = 0.0,
    val claheTile: Int = DEFAULT_CLAHE_TILE,
    val claheMinMean: Double = 0.0,
    val claheMaxMean: Double = MAX_LEVEL,
) {
    /** Channels the ONNX input expects — [repr]'s, never a literal 3. */
    val channels: Int get() = repr.channels

    /** Columns the graph emits: the classes, plus the coverage unit when the run declares one. */
    val outputWidth: Int get() = classes.size + if (coverageOutput) 1 else 0

    /**
     * False for a run that names no crop — the one thing every consumer has to be able to ASK,
     * because the answer decides whether the pixels it is about to cut are the pixels this model
     * was trained on or merely the ones its calibration profile happens to produce.
     */
    val declaresCrop: Boolean get() = padSide != null

    companion object {
        /**
         * Unknown keys are ignored. Throws (loudly, with a named reason) when the class list
         * is neither the canonical 14-class order nor the 2-class occupancy order
         * (`requireExpectedClasses`), or the declared input size is implausible: a reordered list
         * silently relabels every piece, so refusing to load is the only safe answer.
         */
        fun parse(json: String): ModelSpec {
            val root = Json.parseToJsonElement(json).jsonObject
            // `infer_size` is the size the exported graph TAKES; `out_size` is the size the crops
            // on disk were built at (specs/22). Absent means the two are the same, which is what
            // every model shipped before specs/22 — and every freshly trained run — declares, so
            // the fallback is a live path and not a legacy one.
            val size = root["infer_size"]?.jsonArray ?: root.getValue("out_size").jsonArray
            val outWidth = size[0].jsonPrimitive.content.toInt()
            val outHeight = size[1].jsonPrimitive.content.toInt()
            require(outWidth in MIN_INPUT_SIZE..MAX_INPUT_SIZE && outHeight in MIN_INPUT_SIZE..MAX_INPUT_SIZE) {
                "model input size ${outWidth}x$outHeight is outside the plausible range " +
                    "$MIN_INPUT_SIZE..$MAX_INPUT_SIZE"
            }
            // Old configs predate the `normalize` key and were trained on the ImageNet stats
            // (`quantize.py`). Nothing else may fall back.
            val normalize = root["normalize"]?.jsonObject
            // Both pads or neither: half a crop declaration is not one, and the half that is
            // missing would be filled from the profile — a box nobody chose.
            // Was der Lauf an Vorverarbeitung VERLANGT, muss diese Seite auch koennen. Sonst
            // bekommt ein Modell Pixel, die es nie gesehen hat — und nichts sagt es: kein
            // Absturz, keine Warnung, nur ein paar Punkte weniger, die niemand einem Schalter
            // zuordnet. Deshalb wird hier abgelehnt statt ignoriert.
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
                std = normalize.statsOr("std", IMAGENET_STD),
                perCrop = normalize?.get("mode")?.jsonPrimitive?.content == "per_crop",
                repr = root["input_repr"]?.jsonPrimitive?.content?.let(InputRepr::of) ?: InputRepr.RGB,
                coverageOutput = root["coverage_output"]?.jsonPrimitive?.boolean ?: false,
                // TODO(C3): `temperature` bleibt ungelesen — jede Konfidenzschwelle sieht schaerfere
                // Werte als die Kalibrierung, gegen die sie geeicht wurde (`ModelSpecTemperatureBugTest`).
                coverageGate = root["coverage_gate"]?.jsonPrimitive?.double,
                claheClip = root["clahe_clip"]?.jsonPrimitive?.double ?: 0.0,
                claheTile = root["clahe_tile"]?.jsonPrimitive?.content?.toInt() ?: DEFAULT_CLAHE_TILE,
                claheMinMean = root["clahe_min_mean"]?.jsonPrimitive?.double ?: 0.0,
                claheMaxMean = root["clahe_max_mean"]?.jsonPrimitive?.double ?: MAX_LEVEL,
            )
        }

        /**
         * Der Alt-Pfad ist das FEHLENDE `normalize`, nicht ein halbes. Ein Block, der den Schluessel
         * schreibt und einen Wert vergisst, wurde sonst still mit ImageNet bedient.
         */
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
