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

/**
 * The decision log as a text file.
 *
 * The header block is not decoration: a log without the thresholds it was produced under cannot be
 * compared against anything, and "which model on which execution provider" is the first question
 * every one of these dumps has raised. One record per line, tab separated, no images (Python's
 * `_recent_decisions` keeps warped frames; the phone does not).
 */
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
            // The model DIRECTORY, not just the graph file: three models ship side by side and
            // "model.onnx" names all three of them.
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

/**
 * Hands the text to `ACTION_SEND` directly.
 *
 * `EXTRA_TEXT` rather than a cache file behind a `FileProvider`: the provider needs a manifest
 * entry, `AndroidManifest.xml` is 06c's file, and 64 tab-separated rows are a few kB — well inside
 * what an intent extra carries. No storage permission either way.
 */
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
