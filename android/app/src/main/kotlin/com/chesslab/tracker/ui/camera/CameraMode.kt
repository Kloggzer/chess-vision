package com.chesslab.tracker.ui.camera

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp

/**
 * What the camera screen is being used FOR right now.
 *
 * The two modes share one viewfinder and one camera binding, which is the whole reason they are
 * modes and not screens. They used to be two nav destinations, and the cost was structural: leaving
 * one to reach the other tore down a composition that owns the picture, and the two grew separate
 * answers to the same questions — two viewfinders, two "no camera frame yet" strings, and three
 * different ways to save a board quad.
 *
 * The split that survives is by LIFETIME, and it is real: [LOOK] is a property of the room and the
 * lamp, [BOARD] is a property of where the board sits. Changing one should not re-ask the other.
 * Modes keep that distinction while sharing the instrument both are judged by — the picture.
 */
enum class CameraMode(
    val label: String,
    /** What this mode is for, in the fewest words that still say it. */
    val hint: String,
) {
    LOOK("Look", "focus · zoom · brightness · colour"),
    BOARD("Board", "where the squares are"),
}

/**
 * The mode strip: a camera app's Photo | Video, in the same place and for the same reason.
 *
 * Directly above the deck rather than in a title bar, because it belongs to the controls it swaps
 * and because a thumb is already there. It is chrome — it hides with everything else when the
 * picture is asked for alone.
 */
@Composable
fun ModeStrip(
    selected: CameraMode,
    onSelect: (CameraMode) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier
            .clip(RoundedCornerShape(STRIP_CORNER.dp))
            .background(ChromeScrim)
            .padding(STRIP_PAD.dp),
        horizontalArrangement = Arrangement.spacedBy(STRIP_PAD.dp),
    ) {
        CameraMode.entries.forEach { mode ->
            val on = mode == selected
            Text(
                text = mode.label,
                style = MaterialTheme.typography.labelLarge,
                color = if (on) Chrome.accent else Chrome.onSurfaceMuted,
                modifier =
                    Modifier
                        .clip(RoundedCornerShape(STRIP_CORNER.dp))
                        .background(if (on) Chrome.selection else androidx.compose.ui.graphics.Color.Transparent)
                        .clickable { onSelect(mode) }
                        .padding(horizontal = STRIP_TEXT_PAD.dp, vertical = STRIP_PAD.dp),
            )
        }
    }
}

private const val STRIP_CORNER = 14
private const val STRIP_PAD = 6
private const val STRIP_TEXT_PAD = 16
