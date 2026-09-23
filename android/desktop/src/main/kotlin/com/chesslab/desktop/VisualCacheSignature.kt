package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import java.io.File
import java.util.zip.CRC32

/** Only inputs that can change cached observations or LiveAlign outputs — der Legalitaets-Prior gehoert dazu.
 *  ONE config, the run's: a settings-repository read signed a `config=` cache as a defaults run. */
internal fun visualCacheSignature(
    config: TrackerConfig,
    geometry: BoardGeometry,
    quad: FloatArray,
    source: FrameSource,
    stride: Int,
    lens: Boolean,
    model: String,
    startFrame: Long,
    limitFrames: Int?,
    recordedFrames: Int?,
    priorLambda: Double,
    priorSafety: Boolean,
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
        // Die Zeilen haengen an der RELATIVEN Sequenznummer: ein Cache aus `start=0` antwortete `start=5`
        // mit den Beobachtungen fremder Bilder.
        "start=$startFrame",
        "limit=${limitFrames ?: -1}",
        "recorded=${recordedFrames ?: -1}",
        // Die Zeilen tragen PRIOR-KONDITIONIERTE Wahrscheinlichkeiten, und die Maske haengt an der Stellungsfolge.
        "prior=$priorLambda",
        // `withoutPriorSafety` laeuft HINTER dem Cache: ohne `invalidMass`/`raw` faehrt ein `prior-mode=new`-Lauf
        // still den alten Weg.
        "prior-safety=$priorSafety",
    ).joinToString("|")

/** What the model IS, not what it is called: keyed by the name, a new `model.onnx` went on answering with the
 *  old graph's numbers. */
internal fun modelSignature(
    model: String,
    configJson: String,
    graph: File?,
): String = "$model,config=${crc32(configJson)},graph=${graph?.length() ?: -1}@${graph?.lastModified() ?: -1}"

/** A model that cannot be read must say so. */
internal fun desktopModelSignature(model: String): String =
    runCatching { desktopCnnAssets(model).stage().let { modelSignature(model, it.configJson, it.fp32) } }
        .getOrElse {
            println("model signature: '$model' could not be staged (${it.message}) — the visual cache keys on the name alone")
            model
        }

private fun crc32(text: String): Long = CRC32().apply { update(text.toByteArray()) }.value
