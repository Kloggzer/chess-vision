package com.chesslab.tracker.spectate.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
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
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.spectate.QrCode
import com.chesslab.tracker.spectate.SpectatorHost
import com.chesslab.tracker.spectate.SpectatorState
import com.chesslab.tracker.ui.theme.OnSurfaceMuted

private const val QR_PX = 512

/**
 * The spectator's only control surface. Off is the resting state and the URL is always readable as
 * plain text — QR scanning fails often enough that a copyable fallback is mandatory, not a nicety.
 */
@Composable
fun SpectatorScreen(onBack: () -> Unit = {}) {
    val context = LocalContext.current
    val controller = remember(context) { SpectatorHost.get(context) }
    val state by controller.state.collectAsStateWithLifecycle()
    val enabled by controller.enabled.collectAsStateWithLifecycle()

    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = onBack) { Text("Back") }
            Text("LAN spectator", style = MaterialTheme.typography.titleMedium)
        }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Share the board on Wi-Fi", style = MaterialTheme.typography.bodyLarge)
                Text(
                    "Read-only. Nothing on the network can change the game.",
                    style = MaterialTheme.typography.bodySmall,
                    color = OnSurfaceMuted,
                )
            }
            Switch(checked = enabled, onCheckedChange = controller::setEnabled)
        }
        SpectatorStateBlock(state)
    }
}

@Composable
private fun SpectatorStateBlock(state: SpectatorState) {
    when (state) {
        is SpectatorState.Running -> RunningBlock(state.url)
        SpectatorState.NoWifi ->
            Text(
                "Connect to Wi-Fi to share the board — mobile data is not used.",
                style = MaterialTheme.typography.bodyMedium,
            )
        is SpectatorState.Error ->
            Text(state.reason, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error)
        SpectatorState.Off -> Text("Off", style = MaterialTheme.typography.bodyMedium, color = OnSurfaceMuted)
    }
}

@Composable
private fun RunningBlock(url: String) {
    val clipboard = LocalClipboardManager.current
    val qr = remember(url) { QrCode.forUrl(url, QR_PX).asImageBitmap() }
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Spacer(Modifier.size(10.dp).clip(CircleShape).background(Color(0xFF22C55E)))
        Text("LAN spectator on · $url", style = MaterialTheme.typography.bodyMedium)
    }
    TextButton(onClick = { clipboard.setText(AnnotatedString(url)) }) { Text("Copy URL") }
    Image(bitmap = qr, contentDescription = "QR code for $url", modifier = Modifier.size(240.dp))
}
