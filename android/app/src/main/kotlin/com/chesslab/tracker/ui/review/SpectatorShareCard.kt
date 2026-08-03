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
import com.chesslab.tracker.ui.settings.Card
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.OnSurfaceMuted

private const val QR_PX = 512

/**
 * Putting the board on the Wi-Fi, on the screen that IS the board.
 *
 * This used to be a nav destination of its own — a switch and a QR code with no board anywhere near
 * it, while the thing it shared lived two screens away. What the LAN page renders is exactly the
 * game above this card, from the same `GameView`, so this is where the switch belongs.
 *
 * The QR is collapsed by default: it is 240dp of the one screen whose job is to show a board, and
 * the URL beside it is readable and copyable without it. QR scanning fails often enough that the
 * plain text is the fallback, not the nicety.
 */
@Composable
fun SpectatorShareCard() {
    val context = LocalContext.current
    val controller = remember(context) { SpectatorHost.get(context) }
    val state by controller.state.collectAsStateWithLifecycle()
    val enabled by controller.enabled.collectAsStateWithLifecycle()
    var showQr by remember { mutableStateOf(false) }

    Card {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            // The switch is laid out FIRST so the text takes what is left: with the text measured
            // first its second line ran straight under the switch.
            Text(
                "Share this board on Wi-Fi",
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.weight(1f).padding(end = 12.dp),
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
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        // The theme's "it is running" colour, not a hard-coded green: this dot sits on paper in the
        // light scheme, where a saturated web green is the one thing on the card that is not legible.
        Spacer(Modifier.size(10.dp).clip(CircleShape).background(Accent))
        Text(url, style = MaterialTheme.typography.bodyMedium)
    }
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        TextButton(onClick = { clipboard.setText(AnnotatedString(url)) }) { Text("Copy URL", color = Accent) }
        TextButton(onClick = onToggleQr) { Text(if (showQr) "Hide QR" else "Show QR", color = Accent) }
    }
    if (showQr) {
        val qr = remember(url) { QrCode.forUrl(url, QR_PX).asImageBitmap() }
        Image(bitmap = qr, contentDescription = "QR code for $url", modifier = Modifier.size(200.dp))
    }
}
