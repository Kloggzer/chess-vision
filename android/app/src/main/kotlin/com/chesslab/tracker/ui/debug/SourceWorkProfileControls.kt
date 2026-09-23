package com.chesslab.tracker.ui.debug

import android.content.Context
import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space

/** Explicit: profiling never starts merely because the debug screen opened. */
@Composable
internal fun SourceWorkProfileControls(viewModel: DebugViewModel) {
    val available by viewModel.workProfilingAvailable.collectAsStateWithLifecycle()
    if (!available) return
    val enabled by viewModel.workProfiling.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var hasReport by rememberSaveable { mutableStateOf(enabled) }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Space.xs)) {
        TextButton(onClick = {
            if (!enabled) hasReport = true
            viewModel.onWorkProfilingEnabled(!enabled)
        }) {
            Text(if (enabled) "Stop source profile" else "Start source profile", color = Accent)
        }
        TextButton(
            enabled = hasReport,
            onClick = { viewModel.workProfileReport()?.let { shareWorkProfile(context, it) } },
        ) {
            Text("Share snapshot", color = if (hasReport) Accent else OnSurfaceMuted)
        }
    }
}

private fun shareWorkProfile(
    context: Context,
    text: String,
) {
    val send =
        Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, "chesslab Android source-work profile")
            putExtra(Intent.EXTRA_TEXT, text)
        }
    context.startActivity(Intent.createChooser(send, "Share source-work profile"))
}
