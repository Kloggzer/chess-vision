package com.chesslab.tracker.cnn

import android.content.Context
import java.io.File

/**
 * The Android binding for [CnnModelAssets]: models come out of the APK and stage into `filesDir`.
 *
 * Stays with the app deliberately. `CnnModelAssets` itself takes an `open: (String) -> InputStream?`
 * supplier precisely so the staging rules can be exercised on a desktop JVM against plain files —
 * this is the one place that knows an APK exists.
 *
 * ONE staged directory PER model, mirroring the asset layout. They cannot share a directory:
 * `stageFile` recognises an already-staged file by its LENGTH, and two models of the same
 * architecture produce graphs within bytes of each other — a shared directory would occasionally
 * decide the wrong graph was already there. Separate directories also keep each model's compiled
 * QNN context with the graph it was compiled from, and make switching back a no-copy operation.
 */
fun cnnAssetsFrom(
    context: Context,
    model: String = DEFAULT_MODEL,
    graph: String = MODEL_FP32_FILE,
): CnnModelAssets =
    bundledModelOrDefault(model).let { dir ->
        CnnModelAssets(
            open = { name -> runCatching { context.assets.open("$ASSET_ROOT_DIR/$dir/$name") }.getOrNull() },
            dir = File(File(context.filesDir, ASSET_ROOT_DIR), dir),
            graph = graph,
        )
    }
