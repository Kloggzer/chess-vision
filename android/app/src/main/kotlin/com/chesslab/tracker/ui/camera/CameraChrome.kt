package com.chesslab.tracker.ui.camera

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.ui.theme.InkPalette
import com.chesslab.tracker.ui.theme.Space

/** ALWAYS the ink palette: this screen is drawn on a PHOTOGRAPH of a dark board, where the paper theme's
 *  ink is unreadable and its accent disappears into the grain. */
internal val Chrome = InkPalette

internal val ChromeScrim = Color(0xCC141110)

internal val TopFade = Brush.verticalGradient(listOf(Color(0xB3000000), Color.Transparent))
internal val BottomFade = Brush.verticalGradient(listOf(Color.Transparent, Color(0xB3000000)))

/** Not a `TopAppBar`: 64 dp of solid band is picture traded for a title nobody needs. */
@Composable
fun CameraTopBar(
    unsaved: Boolean,
    canReset: Boolean,
    fill: Boolean,
    onBack: () -> Unit,
    onSave: () -> Unit,
    onUndo: () -> Unit,
    onAuto: () -> Unit,
    onFill: () -> Unit,
    onHide: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().background(TopFade).padding(horizontal = Space.xs, vertical = Space.hair),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Chrome.onSurface)
        }
        Box(Modifier.weight(1f))
        if (unsaved) {
            TextButton(onClick = onSave) {
                Text("Save", style = MaterialTheme.typography.labelLarge, color = Chrome.accent)
            }
        }
        // Labelled with what it DOES: edge to edge, nothing else says which of the two views is showing.
        TextButton(onClick = onFill) {
            Text(
                text = if (fill) "Fit" else "Fill",
                style = MaterialTheme.typography.labelLarge,
                color = if (fill) Chrome.busy else Chrome.onSurfaceMuted,
            )
        }
        TextButton(onClick = onHide) {
            Text("Hide", style = MaterialTheme.typography.labelLarge, color = Chrome.onSurfaceMuted)
        }
        CameraOverflow(unsaved = unsaved, canReset = canReset, onUndo = onUndo, onAuto = onAuto)
    }
}

@Composable
private fun CameraOverflow(
    unsaved: Boolean,
    canReset: Boolean,
    onUndo: () -> Unit,
    onAuto: () -> Unit,
) {
    var open by remember { mutableStateOf(false) }
    Box {
        IconButton(onClick = { open = true }) {
            Icon(Icons.Filled.MoreVert, contentDescription = "More camera actions", tint = Chrome.onSurface)
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            OverflowItem("Undo changes", unsaved) {
                open = false
                onUndo()
            }
            OverflowItem("Everything back to automatic", canReset) {
                open = false
                onAuto()
            }
        }
    }
}

@Composable
private fun OverflowItem(
    label: String,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    DropdownMenuItem(
        text = { Text(label, style = MaterialTheme.typography.bodyMedium) },
        enabled = enabled,
        onClick = onClick,
    )
}

/** Always on its own scrim: without one, over pale boxwood, the line could not be read at all. */
@Composable
fun ChromeBanner(
    text: String,
    color: Color = Chrome.onSurfaceMuted,
) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
        Text(
            text = text,
            style = MaterialTheme.typography.bodySmall,
            color = color,
            textAlign = TextAlign.Center,
            modifier =
                Modifier
                    .clip(RoundedCornerShape(BANNER_CORNER.dp))
                    .background(ChromeScrim)
                    .padding(horizontal = Space.md, vertical = Space.xs),
        )
    }
}

@Composable
fun UnsavedHint() {
    ChromeBanner("Not saved — a restart would undo this.", Chrome.busy)
}

private const val BANNER_CORNER = 8
