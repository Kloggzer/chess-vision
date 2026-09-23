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

/** The phone's classifier, read from `app/src/main/assets/cnn_model/<name>/` instead of an APK. Without it every
 *  desktop replay ran `Taint`'s ">2 changed squares = a hand" fallback while Python made 958 CNN observations. */
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

/** Attaching may fail (no ONNX natives), never QUIETLY: a silent no-CNN fallback looks like a bad threshold. */
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
        // Four intra-op threads are bit-exact for this graph: all 2,575 probability rows matched the single-thread run.
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

private const val ASSET_SOURCE = "../app/src/main/assets/$ASSET_ROOT_DIR"

private const val STAGING = "../../tmp/cnn-staging"

/** Der Ordner traegt alles, was die WAHRSCHEINLICHKEITEN formt: Gewichte und `config.json` (temperature,
 *  normalize, clahe_*, input_repr) — ein Temperatur-Lauf las sonst 41 168 alte Antworten. */
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

private const val NO_GRAPH_STAMP = "nograph"

private const val STAMP_CHUNK = 64 * 1024

private const val STAMP_CHARS = 12

private const val OBS_CACHE = "../../tmp/obs-cache"

private const val DESKTOP_INTRA_OP_THREADS = 4

/** Read whether or not the CNN is on, so `nocnn` isolates the classifier: without it every desktop crop was
 *  128x128 against `id35-80`'s 80x80, all 127 observations threw and the run said `cnn=run`. */
fun desktopModelSpec(model: String): ModelSpec? =
    runCatching { ModelSpec.parse(desktopCnnAssets(model).stage().configJson) }
        .onFailure { println("no model spec for '$model' — crops keep the geometry's defaults (${it.message})") }
        .getOrNull()

/** The coverage gate rides in the MODEL (`docs/occlusion-gate.md`), a factor seven between families. */
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
    // Nur MIT der Spalte, wie `:app`: ohne `coverage_output` ist `pOccluded` immer 0,0.
    if (spec?.coverageOutput != true) return this
    // Die Konfidenz-Huerde bedeutet je Modell etwas anderes, weil jedes anders ueberkonfident ist.
    val gated = spec.coverageGate?.let { copy(pOccludedThr = it) } ?: this
    return gated.copy(cnnConfThr = calibratedConfThr(cnnConfThr, spec.temperature, spec.classes.size))
}
