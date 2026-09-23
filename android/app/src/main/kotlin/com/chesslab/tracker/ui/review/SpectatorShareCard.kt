package com.chesslab.tracker.ui.review

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.spectate.QrCode
import com.chesslab.tracker.spectate.SpectatorHost
import com.chesslab.tracker.spectate.SpectatorState
import com.chesslab.tracker.ui.Card
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Space

private val STATUS_DOT = 10.dp
private val QR_SIDE = 200.dp

private const val QR_PX = 512

/** Here, on the screen that IS the board: the LAN page renders this very `GameView`. The QR is collapsed —
 *  240dp of the board's screen — and the plain URL is the fallback when scanning fails. */
@Composable
fun SpectatorShareCard() {
    val context = LocalContext.current
    val controller = remember(context) { SpectatorHost.get(context) }
    val state by controller.state.collectAsStateWithLifecycle()
    val enabled by controller.enabled.collectAsStateWithLifecycle()
    var showQr by remember { mutableStateOf(false) }

    Card {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            // The switch is laid out FIRST: measured after the text, the text's second line ran under it.
            Text(
                "Share this board on Wi-Fi",
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.weight(1f).padding(end = Space.md),
            )
            Switch(checked = enabled, onCheckedChange = controller::setEnabled)
        }
        SpectatorStateBlock(state, showQr) { showQr = !showQr }
    }
}

@Composable
private fun SpectatorStateBlock(
    state: SpectatorState,
    showQr: Boolean,
    onToggleQr: () -> Unit,
) {
    when (state) {
        is SpectatorState.Running -> RunningBlock(state.url, showQr, onToggleQr)
        SpectatorState.NoWifi ->
            Text("Connect to Wi-Fi to share — mobile data is not used.", style = MaterialTheme.typography.bodySmall)
        is SpectatorState.Error ->
            Text(state.reason, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
        SpectatorState.Off ->
            Text(
                "Off. Read-only when on — nothing on the network can change the game.",
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceMuted,
            )
    }
}

@Composable
private fun RunningBlock(
    url: String,
    showQr: Boolean,
    onToggleQr: () -> Unit,
) {
    val clipboard = LocalClipboardManager.current
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Space.sm)) {
        // The theme's colour, not a web green: that is illegible on paper in the light scheme.
        Spacer(Modifier.size(STATUS_DOT).clip(CircleShape).background(Accent))
        Text(url, style = MaterialTheme.typography.bodyMedium)
    }
    Row(horizontalArrangement = Arrangement.spacedBy(Space.xs)) {
        TextButton(onClick = { clipboard.setText(AnnotatedString(url)) }) { Text("Copy URL", color = Accent) }
        TextButton(onClick = onToggleQr) { Text(if (showQr) "Hide QR" else "Show QR", color = Accent) }
    }
    if (showQr) {
        val qr = remember(url) { QrCode.forUrl(url, QR_PX).asImageBitmap() }
        Image(bitmap = qr, contentDescription = "QR code for $url", modifier = Modifier.size(QR_SIDE))
    }
}
