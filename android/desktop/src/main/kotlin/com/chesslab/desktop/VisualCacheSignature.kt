package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import java.io.File
import java.util.zip.CRC32

/**
 * Only inputs that can change cached observations or LiveAlign outputs.
 * Engine thresholds consume these observations but cannot change them.
 *
 * ONE config, the run's: the second `alignConfig` parameter read the settings repository, so a
 * cache built under a `config=` recording's alignment knobs signed itself as a defaults run.
 */
internal fun visualCacheSignature(
    config: TrackerConfig,
    geometry: BoardGeometry,
    quad: FloatArray,
    source: FrameSource,
    stride: Int,
    lens: Boolean,
    model: String,
): String =
    listOf(
        "observer=${config.cnnVerify},${config.observerIntervalS}",
        "align=${config.liveAlign},${config.alignEvery},${config.alignScale}",
        "geometry=$geometry",
        "quad=${quad.joinToString(",")}",
        "delivered=${source.delivered}",
        "fps=${source.fps}",
        "stride=$stride",
        "lens=$lens",
        "model=$model",
        // TODO: `replayStartFrame`, `limitFrames` und das Recorded-Frame-Gate fehlen hier,
        //  obwohl die Cache-Zeilen an der RELATIVEN Sequenznummer haengen. Ein Cache aus
        //  `start=0` wird von `start=5` akzeptiert und liefert die Beobachtungen fremder Bilder.
    ).joinToString("|")

/**
 * What the model IS, not what it is called. The cache was keyed by the DIRECTORY NAME, so a new
 * `model.onnx` or a retuned `config.json` under that name left every cached probability valid and
 * a replay went on answering with the old graph's numbers.
 */
internal fun modelSignature(
    model: String,
    configJson: String,
    graph: File?,
): String = "$model,config=${crc32(configJson)},graph=${graph?.length() ?: -1}@${graph?.lastModified() ?: -1}"

/** The staged model's fingerprint, or a loud fallback — a model that cannot be read must say so. */
internal fun desktopModelSignature(model: String): String =
    runCatching { desktopCnnAssets(model).stage().let { modelSignature(model, it.configJson, it.fp32) } }
        .getOrElse {
            println("model signature: '$model' could not be staged (${it.message}) — the visual cache keys on the name alone")
            model
        }

private fun crc32(text: String): Long = CRC32().apply { update(text.toByteArray()) }.value
