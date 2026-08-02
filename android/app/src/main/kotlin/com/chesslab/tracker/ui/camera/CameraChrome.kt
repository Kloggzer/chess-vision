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

/**
 * The camera screen's chrome is ALWAYS the ink palette, in both app themes.
 *
 * Every other screen follows the system light/dark setting, because every other screen is paper.
 * This one is drawn on a PHOTOGRAPH of a dark wooden board under a desk lamp, where the paper
 * theme's sepia ink is unreadable and its olive accent disappears into the grain. Camera chrome is
 * light-on-dark everywhere for the same reason, and this is not the screen to be original on.
 *
 * The palette object itself rather than eight copied literals: the colours stay whatever the theme
 * says they are, they are simply not chosen by the system here.
 */
internal val Chrome = InkPalette

/** What chrome sits on when it overlaps the picture. Dark enough for AA text over pale wood. */
internal val ChromeScrim = Color(0xCC141110)

/** Top and bottom fades, so a tile at the screen edge never floats on bare image. */
internal val TopFade = Brush.verticalGradient(listOf(Color(0xB3000000), Color.Transparent))
internal val BottomFade = Brush.verticalGradient(listOf(Color.Transparent, Color(0xB3000000)))

/**
 * The thin strip at the top: out of here, what state the settings are in, and the way to an empty
 * screen.
 *
 * It is not a `TopAppBar` and the screen does not wear `ChesslabScaffold`. That bar is a solid
 * 64 dp band of `SurfaceRaised` — on a camera screen it is 64 dp of picture traded for a title
 * nobody needs, and the app bar's whole job (pushing scrolling content out from under itself) is
 * a job this screen does not have.
 */
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
        Modifier.fillMaxWidth().background(TopFade).padding(horizontal = 4.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Chrome.onSurface)
        }
        // Calibrating is no longer a button up here. It is the screen's other MODE, reached from
        // the strip above the deck — the one-press version could only ever do the half that needs
        // no judgement, and it sat next to a viewfinder that was already showing the board.
        Box(Modifier.weight(1f))
        if (unsaved) {
            TextButton(onClick = onSave) {
                Text("Save", style = MaterialTheme.typography.labelLarge, color = Chrome.accent)
            }
        }
        // Labelled with what it DOES, not with the state it is in: on a picture that fills the
        // screen edge to edge there is no visual cue which of the two you are looking at, and a
        // button that names the state would be the only thing saying so.
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

/**
 * Undo and back-to-automatic, folded away.
 *
 * They were two full-width buttons at the bottom of the old deck, permanently occupying the most
 * reachable part of the screen for two acts that are taken once a session at most. Save stays out
 * in the open because it is the one that is taken often, and only when there is something to save.
 */
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

/**
 * A line of chrome text over the viewfinder, always on its own scrim.
 *
 * Measured on the phone: the same line without one, laid over pale boxwood in the screen-filling
 * view, was a grey sentence on a cream board and could not be read at all. Chrome that sits on the
 * picture carries its own background or it does not carry text.
 */
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
                    .padding(horizontal = 10.dp, vertical = 4.dp),
        )
    }
}

/**
 * What is applied but not stored, said once and only while it is true.
 *
 * The old screen carried three sentences of save state permanently; this one carries the single
 * sentence that is ever surprising — that the picture on screen is not what the app will come back
 * to. Saving is one tap away in the strip above.
 */
@Composable
fun UnsavedHint() {
    ChromeBanner("Not saved — a restart would undo this.", Chrome.busy)
}

private const val BANNER_CORNER = 8
