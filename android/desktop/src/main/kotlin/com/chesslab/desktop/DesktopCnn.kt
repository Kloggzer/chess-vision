package com.chesslab.desktop

import com.chesslab.tracker.cnn.ASSET_ROOT_DIR
import com.chesslab.tracker.cnn.Attached
import com.chesslab.tracker.cnn.CnnModelAssets
import com.chesslab.tracker.cnn.DEFAULT_MODEL
import com.chesslab.tracker.cnn.MODEL_FP32_FILE
import com.chesslab.tracker.log.TrackerLog
import com.chesslab.tracker.service.CnnRuntimeProbe
import com.chesslab.tracker.service.openClassifier
import com.chesslab.tracker.settings.AppSettings
import java.io.File
import java.io.InputStream

/**
 * The same classifier the phone runs, loaded from the repo instead of from an APK.
 *
 * Everything that decides was already shared: `openClassifier` lives in `:tracker-runtime`, the
 * `ai.onnxruntime` API is identical between the Android and JVM artifacts, and `:desktop` already
 * had the JVM one on its classpath. The only Android-shaped piece was `cnnAssetsFrom`, which
 * reads through `Context.assets` — so this is its twin over `File`, and nothing else changes.
 *
 * That it was missing was not cosmetic. `Taint.cnnOcclusionFilter` degrades to a
 * ">2 changed squares = a hand" heuristic when no observation is available, so every desktop
 * replay so far ran the engine's fallback path — and the Python reference it was being compared
 * against made 958 CNN observations on the same video. The comparison was never like for like.
 *
 * The models are the ones the app bundles, read where they already live rather than copied:
 * `android/app/src/main/assets/cnn_model/<name>/`. [stagingRoot] is where the staged copies go,
 * because `CnnModelAssets` stages before it opens — the phone needs that (assets are not files)
 * and here it costs one copy per model per run.
 */
fun desktopCnnAssets(
    model: String = DEFAULT_MODEL,
    graph: String = MODEL_FP32_FILE,
    assetRoot: File = File(ASSET_SOURCE),
    stagingRoot: File = File(STAGING),
): CnnModelAssets {
    val source = File(assetRoot, model)
    check(source.isDirectory) {
        "no bundled model '$model' at ${source.absolutePath} — " +
            "available: ${assetRoot.list()?.sorted()?.joinToString() ?: "none"}"
    }
    return CnnModelAssets(
        open = { name -> File(source, name).takeIf { it.isFile }?.inputStream() as InputStream? },
        dir = File(stagingRoot, model),
        graph = graph,
    )
}

/**
 * `openClassifier`, or a loud null.
 *
 * Attaching is allowed to fail — a machine without the ONNX natives is a real case — but it must
 * never fail QUIETLY: an engine silently running its no-CNN fallback looks like an engine with a
 * bad threshold, and that mistake is what this whole investigation started as.
 */
fun openDesktopCnn(
    model: String,
    log: TrackerLog,
): (() -> Attached)? =
    runCatching { desktopCnnAssets(model) }
        .onFailure { println("no CNN: ${it.message}") }
        .getOrNull()
        ?.let { assets -> { openClassifier(assets, AppSettings(), CnnRuntimeProbe(), log) } }

/** The app's bundled models, read where they live. `:desktop`'s working directory is `android/desktop`. */
private const val ASSET_SOURCE = "../app/src/main/assets/$ASSET_ROOT_DIR"

/** Staged copies. Under tmp/, which is not the corpus. */
private const val STAGING = "../../tmp/cnn-staging"
