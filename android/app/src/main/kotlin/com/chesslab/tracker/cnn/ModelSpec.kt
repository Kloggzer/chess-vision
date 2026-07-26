package com.chesslab.tracker.cnn

import com.chesslab.cnn.IMAGENET_MEAN
import com.chesslab.cnn.IMAGENET_STD
import com.chesslab.cnn.requireExpectedClasses
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** The one crop size this app ships a model for; asserted, never assumed. */
private const val CROP_SIZE = 128

/**
 * The subset of a run's `config.json` the tracker needs. Everything here is READ from the
 * asset — commit `ee7c83c` had to fix a classifier that hardcoded the ImageNet stats while
 * every run writes its real ones. The only literals below are the assertions.
 */
data class ModelSpec(
    val classes: List<String>,
    val outWidth: Int,
    val outHeight: Int,
    val mean: List<Float>,
    val std: List<Float>,
) {
    companion object {
        /**
         * Unknown keys are ignored. Throws (loudly, with a named reason) when the class list
         * is neither the canonical 14-class order nor the 2-class occupancy order
         * (`requireExpectedClasses`), or the crop size is not the one the app crops for: a
         * reordered list silently relabels every piece, so refusing to load is the only safe
         * answer.
         */
        fun parse(json: String): ModelSpec {
            val root = Json.parseToJsonElement(json).jsonObject
            val outSize = root.getValue("out_size").jsonArray
            val outWidth = outSize[0].jsonPrimitive.content.toInt()
            val outHeight = outSize[1].jsonPrimitive.content.toInt()
            require(outWidth == CROP_SIZE && outHeight == CROP_SIZE) {
                "model out_size is ${outWidth}x$outHeight, this app crops ${CROP_SIZE}x$CROP_SIZE"
            }
            // Old configs predate the `normalize` key and were trained on the ImageNet stats
            // (`quantize.py:172-174`). Nothing else may fall back.
            val normalize = root["normalize"]?.jsonObject
            return ModelSpec(
                classes = requireExpectedClasses(root.getValue("classes").jsonArray.map { it.jsonPrimitive.content }),
                outWidth = outWidth,
                outHeight = outHeight,
                mean = normalize.floats("mean") ?: IMAGENET_MEAN,
                std = normalize.floats("std") ?: IMAGENET_STD,
            )
        }

        private fun JsonObject?.floats(key: String): List<Float>? = this?.get(key)?.jsonArray?.map { it.jsonPrimitive.content.toFloat() }
    }
}
