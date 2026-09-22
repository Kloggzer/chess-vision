package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import java.io.File
import java.util.zip.CRC32

/**
 * Only inputs that can change cached observations or LiveAlign outputs — der Legalitaets-Prior
 * gehoert dazu, er wird VOR dem Ablegen gerechnet (`docs/visual-cache-2026-09-20.md`).
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
        // Die Cache-Zeilen haengen an der RELATIVEN Sequenznummer, also gehoert der
        // Ausschnitt in die Signatur: ein Cache aus `start=0` wurde von `start=5` akzeptiert
        // und antwortete mit den Beobachtungen fremder Bilder — still, in einer Messung.
        "start=$startFrame",
        "limit=${limitFrames ?: -1}",
        "recorded=${recordedFrames ?: -1}",
        // Die Zeilen tragen die PRIOR-KONDITIONIERTEN Wahrscheinlichkeiten (`CnnObserver` reicht
        // `possibleFor(fen)` und die Staerke durch), und die Maske haengt an der Stellungsfolge
        // der Engine — ein A/B auf einem Knopf, der einen Ply verschiebt, liest sonst fremde.
        "prior=$priorLambda",
        // `withoutPriorSafety` laeuft HINTER dem Cache: die geschriebenen Zeilen tragen dann
        // weder `invalidMass` noch `raw`, und ein `prior-mode=new`-Lauf, der sie liest, faehrt
        // still den alten Weg. Der Verlust steht in der Datei, er ist nicht rueckrechenbar.
        "prior-safety=$priorSafety",
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
