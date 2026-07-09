package com.chesslab.tracker.cnn

import java.io.ByteArrayOutputStream
import java.io.File

/**
 * Generates a tiny valid ONNX model in the test (no vendored binary, no protobuf
 * dependency): a single `Flatten` node mapping input `[batch, 3, H, W]` to
 * logits `[batch, 3*H*W]` with a symbolic (dynamic) batch dimension — enough to
 * exercise dynamic-batch inference and the preprocessing/softmax path end to end.
 *
 * Hand-encodes the protobuf wire format of the few ModelProto fields ONNX
 * Runtime requires (ir_version, opset_import, graph with node/input/output).
 */
object OnnxModelFixture {
    const val HEIGHT = 2
    const val WIDTH = 2
    const val CLASSES = 3 * HEIGHT * WIDTH

    /** Write `model.onnx` + a matching run `config.json` into [dir]. */
    fun install(dir: File) {
        dir.mkdirs()
        File(dir, "model.onnx").writeBytes(modelBytes())
        val classes = (0 until CLASSES).map { "c$it" }
        File(dir, "config.json").writeText(
            """{"classes": [${classes.joinToString(", ") { "\"$it\"" }}], """ +
                """"out_size": [$WIDTH, $HEIGHT], "backbone": "fixture"}""",
        )
    }

    private fun modelBytes(): ByteArray {
        val node =
            message {
                string(1, "input") // NodeProto.input
                string(2, "logits") // NodeProto.output
                string(4, "Flatten") // NodeProto.op_type
            }
        val graph =
            message {
                bytes(1, node) // GraphProto.node
                string(2, "fixture") // GraphProto.name
                bytes(11, valueInfo("input", longArrayOf(-1, 3, HEIGHT.toLong(), WIDTH.toLong())))
                bytes(12, valueInfo("logits", longArrayOf(-1, CLASSES.toLong())))
            }
        val opset =
            message {
                varint(2, 17) // OperatorSetIdProto.version (opset 17, evaluate.py:143)
            }
        return message {
            varint(1, 8) // ModelProto.ir_version
            bytes(7, graph) // ModelProto.graph
            bytes(8, opset) // ModelProto.opset_import
        }
    }

    /** ValueInfoProto with float tensor type; dim -1 encodes a symbolic "batch". */
    private fun valueInfo(
        name: String,
        dims: LongArray,
    ): ByteArray {
        val shape =
            message {
                for (d in dims) {
                    val dim =
                        message {
                            if (d < 0) string(3, "batch") else varint(2, d) // dim_param | dim_value
                        }
                    bytes(1, dim) // TensorShapeProto.dim
                }
            }
        val tensorType =
            message {
                varint(1, 1) // elem_type = FLOAT
                bytes(2, shape)
            }
        val type = message { bytes(1, tensorType) } // TypeProto.tensor_type
        return message {
            string(1, name)
            bytes(2, type)
        }
    }

    // -- minimal protobuf wire-format writer --

    private class MessageWriter {
        val out = ByteArrayOutputStream()

        fun varint(
            field: Int,
            value: Long,
        ) {
            writeVarint((field shl 3).toLong()) // wire type 0
            writeVarint(value)
        }

        fun bytes(
            field: Int,
            value: ByteArray,
        ) {
            writeVarint(((field shl 3) or 2).toLong()) // wire type 2
            writeVarint(value.size.toLong())
            out.write(value)
        }

        fun string(
            field: Int,
            value: String,
        ) = bytes(field, value.toByteArray(Charsets.UTF_8))

        private fun writeVarint(v: Long) {
            var value = v
            while (true) {
                val bits = (value and 0x7F).toInt()
                value = value ushr 7
                if (value == 0L) {
                    out.write(bits)
                    return
                }
                out.write(bits or 0x80)
            }
        }
    }

    private fun message(build: MessageWriter.() -> Unit): ByteArray = MessageWriter().apply(build).out.toByteArray()
}
