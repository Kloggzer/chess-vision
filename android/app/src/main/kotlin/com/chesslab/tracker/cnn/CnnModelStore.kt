package com.chesslab.tracker.cnn

import android.content.ContentResolver
import android.content.res.AssetManager
import android.net.Uri
import java.io.File

/**
 * App-files home of the model run (`model.onnx` + its `config.json`,
 * `05-cnn.md` design). Two sources, imported wins over bundled:
 *
 *  1. **SAF import** — the user picks the files via the settings-screen import
 *     button (a newer run than the bundled one).
 *  2. **Bundled assets** (`assets/cnn_model/`, 2026-07-21: `tiny-p3` —
 *     mobilenetv4_conv_small_035, 0.64M params, real-test occ_board 0.800 —
 *     fp32 ONNX + INT8/QDQ for the Hexagon NPU): [installBundledIfMissing]
 *     copies them into [modelDir] on first access, so the app works
 *     out-of-the-box without an import.
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

    /**
     * Install the bundled model into [modelDir] unless a model is already
     * installed (an explicit SAF import must never be overwritten by the
     * bundle). Returns true when the store is installed afterwards. Safe to
     * call on every service start — it is a no-op after the first run.
     */
    fun installBundledIfMissing(assets: AssetManager): Boolean =
        installBundledIfMissing(
            list = { dir -> assets.list(dir)?.toList().orEmpty() },
            open = { path -> assets.open(path) },
        )

    /** Testable core of [installBundledIfMissing] (AssetManager has no JVM impl). */
    fun installBundledIfMissing(
        list: (String) -> List<String>,
        open: (String) -> java.io.InputStream,
    ): Boolean {
        if (!isInstalled()) {
            val names = list(MODEL_DIR_NAME)
            val complete = OnnxClassifier.MODEL_FILE in names && OnnxClassifier.CONFIG_FILE in names
            if (complete) {
                modelDir.mkdirs()
                for (name in names) {
                    open("$MODEL_DIR_NAME/$name").use { input ->
                        File(modelDir, name).outputStream().use { output -> input.copyTo(output) }
                    }
                }
            }
        }
        return isInstalled()
    }

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
