package com.chesslab.tracker.cnn

import com.chesslab.cnn.IMAGENET_MEAN
import com.chesslab.cnn.IMAGENET_STD
import com.chesslab.cnn.PIECES13_CLASSES

/** `docs/occlusion-gate.md`. */
const val SHIPPED_COVERAGE_GATE: Double = 0.25

/** Die Alt-Form ohne Coverage muss ausdruecklich angefordert werden, sonst schreibt ein Test sie fest. */
fun modelConfigJson(
    classes: List<String> = PIECES13_CLASSES,
    outSize: List<Int> = listOf(128, 128),
    inferSize: List<Int>? = null,
    mean: List<Float>? = IMAGENET_MEAN,
    std: List<Float> = IMAGENET_STD,
    inputRepr: String? = null,
    padSide: Double? = null,
    padUp: Double? = null,
    coverageOutput: Boolean = true,
    coverageGate: Double? = SHIPPED_COVERAGE_GATE,
    claheClip: Double? = null,
    extra: String = "",
): String {
    val ints = { v: List<Int> -> v.joinToString(",", "[", "]") }
    val floats = { v: List<Float> -> v.joinToString(",", "[", "]") }
    return buildString {
        append("""{"backbone": "x", "classes": ${classes.joinToString(",", "[", "]") { "\"$it\"" }}""")
        append(""", "out_size": ${ints(outSize)}""")
        inferSize?.let { append(""", "infer_size": ${ints(it)}""") }
        padSide?.let { append(""", "pad_side": $it""") }
        padUp?.let { append(""", "pad_up": $it""") }
        mean?.let { append(""", "normalize": {"mean": ${floats(it)}, "std": ${floats(std)}}""") }
        inputRepr?.let { append(""", "input_repr": "$it"""") }
        if (coverageOutput) append(""", "coverage_output": true""")
        coverageGate?.let { append(""", "coverage_gate": $it""") }
        claheClip?.let { append(""", "clahe_clip": $it""") }
        append(extra)
        append("}")
    }
}
