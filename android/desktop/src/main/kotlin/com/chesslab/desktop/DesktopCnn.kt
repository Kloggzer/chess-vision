package com.chesslab.desktop

import com.chesslab.cnn.calibratedConfThr
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.cnn.ASSET_ROOT_DIR
import com.chesslab.tracker.cnn.Attached
import com.chesslab.tracker.cnn.CnnModelAssets
import com.chesslab.tracker.cnn.DEFAULT_MODEL
import com.chesslab.tracker.cnn.MODEL_CONFIG_FILE
import com.chesslab.tracker.cnn.MODEL_FP32_FILE
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.log.TrackerLog
import com.chesslab.tracker.service.CnnRuntimeProbe
import com.chesslab.tracker.service.openClassifier
import com.chesslab.tracker.settings.AppSettings
import java.io.File
import java.io.InputStream
import java.security.MessageDigest

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
    recording: String = "unbenannt",
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
                val assetDir = File(ASSET_SOURCE, model)
                val cacheDir =
                    obsCacheDir(File(OBS_CACHE), model, File(assetDir, MODEL_FP32_FILE), File(assetDir, MODEL_CONFIG_FILE))
                Attached(
                    if (cache) CachingClassifier(attached.classifier, cacheDir, recording) else attached.classifier,
                    attached.backend,
                    attached.model,
                    attached.spec,
                )
            }
        }

/** The app's bundled models, read where they live. `:desktop`'s working directory is `android/desktop`. */
private const val ASSET_SOURCE = "../app/src/main/assets/$ASSET_ROOT_DIR"

/** Staged copies. Under tmp/, which is not the corpus. */
private const val STAGING = "../../tmp/cnn-staging"

/** Der Ordner traegt alles, was die WAHRSCHEINLICHKEITEN formt: Gewichte und `config.json`
 *  (temperature, normalize, clahe_*, input_repr). Nur der Name war ein stilles A/B
 *  (`ObsCacheKeyTest`), nur die Gewichte auch — ein Temperatur-Lauf las 41 168 alte Antworten. */
internal fun obsCacheDir(
    root: File,
    model: String,
    graph: File,
    config: File,
): File = File(root, "$model-${stampOf(graph, config)}")

private fun stampOf(vararg files: File): String {
    val digest = MessageDigest.getInstance("MD5")
    var seen = false
    for (file in files) {
        if (!file.isFile) continue
        seen = true
        val buffer = ByteArray(STAMP_CHUNK)
        file.inputStream().buffered().use { input ->
            while (true) {
                val read = input.read(buffer)
                if (read <= 0) break
                digest.update(buffer, 0, read)
            }
        }
    }
    if (!seen) return NO_GRAPH_STAMP
    return digest.digest().joinToString("") { "%02x".format(it) }.take(STAMP_CHARS)
}

/** Ohne eine einzige lesbare Datei ist nichts zu schluesseln — der Ordner sagt das dann. */
private const val NO_GRAPH_STAMP = "nograph"

private const val STAMP_CHUNK = 64 * 1024

private const val STAMP_CHARS = 12

/** What the model said about crops it has seen, per model. Under tmp/, not the corpus. */
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
fun TrackerConfig.withCoverageGateOf(
    spec: ModelSpec?,
    overridden: Set<String> = emptySet(),
    warn: (String) -> Unit = { println("warn: $it") },
): TrackerConfig {
    if (spec?.coverageOutput == true && spec.coverageGate == null) {
        warn(
            "model declares coverage_output but no measured coverage_gate — " +
                "pOccludedThr falls back to the legacy default 0.5 (docs/occlusion-gate.md)",
        )
    }
    // Sonst misst ein A/B auf diesem Knopf zweimal dasselbe und nennt die Schwelle folgenlos.
    if ("pOccludedThr" in overridden && spec?.coverageGate != null) {
        warn("set:pOccludedThr wird vom coverage_gate des Modells (${spec.coverageGate}) verworfen")
    }
    if (spec == null) return this
    // Dieselbe Bewegung wie oben, eine Achse weiter: die Konfidenz-Huerde bedeutete je Modell
    // etwas anderes, weil jedes anders ueberkonfident ist (`calibratedConfThr`).
    val gated = spec.coverageGate?.let { copy(pOccludedThr = it) } ?: this
    return gated.copy(cnnConfThr = calibratedConfThr(cnnConfThr, spec.temperature, spec.classes.size))
}
