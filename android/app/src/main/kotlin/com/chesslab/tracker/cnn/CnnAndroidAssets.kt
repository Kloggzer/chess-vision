package com.chesslab.tracker.cnn

import android.content.Context
import java.io.File

/** ONE staged directory PER model: `stageFile` recognises a staged file by its LENGTH, and two models of
 *  the same architecture differ by bytes — a shared directory would keep the wrong graph. It also keeps
 *  each compiled QNN context beside its graph. */
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
