package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.cnn.ASSET_ROOT_DIR
import com.chesslab.tracker.cnn.Attached
import com.chesslab.tracker.cnn.CnnModelAssets
import com.chesslab.tracker.cnn.DEFAULT_MODEL
import com.chesslab.tracker.cnn.MODEL_FP32_FILE
import com.chesslab.tracker.cnn.ModelSpec
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
    cache: Boolean = true,
    intraOpThreads: Int = DESKTOP_INTRA_OP_THREADS,
): (() -> Attached)? =
    runCatching { desktopCnnAssets(model) }
        .onFailure { println("no CNN: ${it.message}") }
        .getOrNull()
        // The shared four-thread budget is bit-exact for this graph: all 2,575 probability rows
        // matched the former single-thread run on the full reference video, while a fully cold
        // replay dropped from 101.0 to 87.1 seconds. The cache
        // in front remembers what this model said about pixels it has seen (keyed by the crops
        // themselves, per model) — deterministic replays cut identical crops, so every re-run of
        // a known video answers from disk instead of the graph.
        ?.let { assets ->
            {
                val attached = openClassifier(assets, AppSettings(), CnnRuntimeProbe(), log, intraOpThreads)
                Attached(
                    if (cache) CachingClassifier(attached.classifier, File(OBS_CACHE, model)) else attached.classifier,
                    attached.backend,
                    attached.model,
                )
            }
        }

/** The app's bundled models, read where they live. `:desktop`'s working directory is `android/desktop`. */
private const val ASSET_SOURCE = "../app/src/main/assets/$ASSET_ROOT_DIR"

/** Staged copies. Under tmp/, which is not the corpus. */
private const val STAGING = "../../tmp/cnn-staging"

/** What the model said about crops it has seen, per model. Under tmp/, which is not the corpus. */
private const val OBS_CACHE = "../../tmp/obs-cache"

private const val DESKTOP_INTRA_OP_THREADS = 4

/**
 * What the chosen model declares its crops must be, or null when it cannot be read.
 *
 * The phone applies this through `BoardGeometry.withCropOf` and the desktop did not, so every
 * crop here was cut at `BoardGeometry`'s own 128x128 while `id35-80` takes 80x80 — the classifier
 * threw on all 127 observations it was handed, `CnnObserver` caught it, and the run reported
 * `cnn=run` with zero snapshots. `CLAUDE.md` names this exact failure for the clip harness:
 * a harness that invents profile fields is a silent domain shift.
 *
 * Read whether or not the CNN is switched on, so that `nocnn` isolates the classifier and not the
 * geometry: two runs that differ in one flag have to differ in one thing.
 */
fun desktopModelSpec(model: String): ModelSpec? =
    runCatching { ModelSpec.parse(desktopCnnAssets(model).stage().configJson) }
        .onFailure { println("no model spec for '$model' — crops keep the geometry's defaults (${it.message})") }
        .getOrNull()

/**
 * The coverage gate rides in the MODEL, not in the engine (`docs/occlusion-gate.md`): it follows
 * from that run's accuracy and differs by a factor of seven between families.
 *
 * `:app` has applied it on attach since it was measured; the replay did not, so every measurement
 * here ran at the 0.5 default while the phone ran the model's own — and a square covered between
 * the two counted as a witness in one and not in the other.
 */
fun TrackerConfig.withCoverageGateOf(spec: ModelSpec?): TrackerConfig = spec?.coverageGate?.let { copy(pOccludedThr = it) } ?: this
