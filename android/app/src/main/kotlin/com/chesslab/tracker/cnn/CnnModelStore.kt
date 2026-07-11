package com.chesslab.tracker.cnn

import android.content.ContentResolver
import android.net.Uri
import java.io.File

/**
 * App-files home of the imported model run (`model.onnx` + its `config.json`,
 * `05-cnn.md` design). The user picks both files via a SAF file picker; a
 * settings-screen import button is the intended caller (UI wiring is owned by
 * the UI phase — see STATUS.md).
 */
class CnnModelStore(
    filesDir: File,
) {
    /** Directory the classifier loads from. */
    val modelDir: File = File(filesDir, MODEL_DIR_NAME)

    /** True when both model files are present. */
    fun isInstalled(): Boolean =
        File(modelDir, OnnxClassifier.MODEL_FILE).isFile &&
            File(modelDir, OnnxClassifier.CONFIG_FILE).isFile

    /** Copy a picked SAF document into the model dir under [targetName]. */
    fun install(
        resolver: ContentResolver,
        source: Uri,
        targetName: String,
    ) {
        require(
            targetName == OnnxClassifier.MODEL_FILE ||
                targetName == OnnxClassifier.MODEL_QNN_FILE ||
                targetName == OnnxClassifier.CONFIG_FILE,
        ) {
            "unexpected model file name: $targetName"
        }
        modelDir.mkdirs()
        val target = File(modelDir, targetName)
        resolver.openInputStream(source).use { input ->
            requireNotNull(input) { "cannot open $source" }
            target.outputStream().use { output -> input.copyTo(output) }
        }
    }

    /** Remove the installed model (frees storage; safeguard detaches). */
    fun uninstall() {
        modelDir.deleteRecursively()
    }

    private companion object {
        const val MODEL_DIR_NAME = "cnn_model"
    }
}
