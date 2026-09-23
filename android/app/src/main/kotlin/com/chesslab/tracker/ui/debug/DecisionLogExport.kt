package com.chesslab.tracker.ui.debug

import android.content.Context
import android.content.Intent
import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.service.CnnRuntimeInfo
import com.chesslab.tracker.settings.KNOBS

private const val COLUMNS =
    "ts\tply\tuci\tsan\tdecider\treason\tprior\tbest\tsecond\tmargin\tchanged\tshadow\toccluded" +
        "\tgrid\tzThr\tmotion\tcnnAgreement\tcnnBest\tstuck\tverify\taccepted"

/** The header block is not decoration: a log without its thresholds, model and provider compares with nothing. */
fun exportDecisionLog(
    decisions: List<DebugDecision>,
    config: TrackerConfig,
    cnn: CnnRuntimeInfo,
    appVersion: String,
): String {
    val header =
        buildString {
            appendLine("# chesslab decision log")
            appendLine("# app: $appVersion")
            // The model DIRECTORY: several models ship side by side and "model.onnx" names them all.
            appendLine(
                "# model: ${cnn.modelDir ?: "none"}/${cnn.model ?: "none"} @ ${cnn.inputShape ?: "none"}  " +
                    "ep: ${cnn.actualEp ?: "none"} (requested ${cnn.requestedEp ?: "none"})",
            )
            appendLine("# config:")
            KNOBS.forEach { appendLine("#   ${it.key} = ${it.get(config)}") }
            appendLine(COLUMNS)
        }
    return header + decisions.joinToString("") { it.toLine() + "\n" }
}

private fun DebugDecision.toLine(): String =
    listOf(
        tsS.toString(),
        ply.toString(),
        uci.orEmpty(),
        san.orEmpty(),
        decider,
        reason,
        priorUsed.toString(),
        bestScore.toString(),
        secondScore.toString(),
        margin.toString(),
        changed.joinToString(","),
        shadowVetoed.joinToString(","),
        occludedVetoed.joinToString(","),
        gridCoverage.toString(),
        zThr.toString(),
        motion.toString(),
        cnnAgreement.toString(),
        cnnBestMove.orEmpty(),
        stuckReason.orEmpty(),
        verifyOutcome.orEmpty(),
        accepted.toString(),
    ).joinToString("\t")

/** `EXTRA_TEXT`, not a `FileProvider` file: that needs a manifest entry, and a few kB fit an intent extra. */
fun shareDecisionLog(
    context: Context,
    text: String,
) {
    val send =
        Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, "chesslab decision log")
            putExtra(Intent.EXTRA_TEXT, text)
        }
    context.startActivity(Intent.createChooser(send, "Share decision log").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
}
