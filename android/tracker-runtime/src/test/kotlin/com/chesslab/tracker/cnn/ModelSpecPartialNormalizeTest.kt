package com.chesslab.tracker.cnn

import com.chesslab.cnn.PIECES13_CLASSES
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

/**
 * "Old configs predate the `normalize` key … Nothing else may fall back" steht ueber der Stelle,
 * aber `JsonObject?.floats` kann nicht unterscheiden, ob der ganze Block fehlt oder nur ein
 * Schluessel darin. Ein Lauf, der `normalize` schreibt und `mean` vergisst, wird deshalb still mit
 * ImageNet bedient — dieselbe lautlose Train/Serve-Luecke, die `clahe_denoise` daneben laut ablehnt.
 */
class ModelSpecPartialNormalizeTest {
    @Test
    fun `a normalize block missing one of its stats is refused, not filled from ImageNet`() {
        assertThrows(IllegalArgumentException::class.java) {
            ModelSpec.parse(config(""""normalize": {"mode": "fixed", "std": [0.229, 0.224, 0.225]}"""))
        }
    }

    @Test
    fun `a config with no normalize block at all still reads as the legacy ImageNet run`() {
        val spec = ModelSpec.parse(config(null))

        assert(spec.mean.isNotEmpty()) { "der Alt-Pfad muss bleiben" }
    }

    private fun config(normalize: String?): String {
        val classes = PIECES13_CLASSES.joinToString(",", "[", "]") { "\"$it\"" }
        val tail = normalize?.let { ", $it" }.orEmpty()
        return """{"backbone": "x", "classes": $classes, "out_size": [80, 80]$tail}"""
    }
}
