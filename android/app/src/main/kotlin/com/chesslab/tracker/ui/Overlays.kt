package com.chesslab.tracker.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp

/**
 * Floating overlay layer. Each composable is `BoxScope`-scoped and positions itself with
 * `Modifier.align`, so it is dropped **inside a `Box`** (the screen root or `BoardFrame`)
 * and floats over content without participating in column layout — the board never
 * reflows when transient messaging appears. Compose has no backdrop blur, so translucency
 * is approximated with ~0.94 alpha plus a hairline border / shadow.
 */

private const val OVERLAY_BG_ALPHA = 0.94f
private const val CARD_BG_ALPHA = 0.96f

/**
 * Centered pill near the top of the board announcing a move; the optional [san] is shown
 * in monospace accent. A polite live region. Auto-dismiss is the caller's state concern.
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun BoxScope.OverlayToast(
    text: String,
    san: String? = null,
    modifier: Modifier = Modifier,
) {
    val spoken = if (san != null) "$text $san" else text
    Row(
        modifier =
            modifier
                .align(Alignment.TopCenter)
                .padding(top = 12.dp)
                .clip(MaterialTheme.shapes.large)
                .background(MaterialTheme.colorScheme.surface.copy(alpha = OVERLAY_BG_ALPHA))
                .border(1.dp, MaterialTheme.colorScheme.outline, MaterialTheme.shapes.large)
                .padding(horizontal = 16.dp, vertical = 10.dp)
                .semantics {
                    liveRegion = LiveRegionMode.Polite
                    contentDescription = spoken
                },
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
        if (san != null) {
            Text(
                san,
                style = MaterialTheme.typography.bodyLarge,
                fontFamily = FontFamily.Monospace,
                color = MaterialTheme.colorScheme.primary,
            )
        }
    }
}

/**
 * Red banner pinned to the top of the board frame — an assertive live region, mirroring
 * the `contentDescription` + `Assertive` contract the former `AlarmBanner` carried.
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun BoxScope.OverlayBanner(
    text: String,
    modifier: Modifier = Modifier,
) {
    Text(
        text = text,
        color = MaterialTheme.colorScheme.onError,
        style = MaterialTheme.typography.titleSmall,
        modifier =
            modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.error.copy(alpha = OVERLAY_BG_ALPHA))
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .semantics {
                    liveRegion = LiveRegionMode.Assertive
                    contentDescription = text
                },
    )
}

/**
 * Action card anchored above the bottom nav (`Align.BottomCenter`): translucent surface
 * with a shadow. [attn] switches it to an error-tinted, assertive live region (recovery
 * prompt). [actions] fills a trailing button row.
 */
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun BoxScope.OverlayCard(
    title: String,
    body: String,
    attn: Boolean = false,
    actions: @Composable RowScope.() -> Unit,
    modifier: Modifier = Modifier,
) {
    val container = if (attn) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.surface
    val onContainer = if (attn) MaterialTheme.colorScheme.onErrorContainer else MaterialTheme.colorScheme.onSurface
    val borderColor = if (attn) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.outline
    Column(
        modifier =
            modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(16.dp)
                .shadow(8.dp, MaterialTheme.shapes.large)
                .clip(MaterialTheme.shapes.large)
                .background(container.copy(alpha = CARD_BG_ALPHA))
                .border(1.dp, borderColor, MaterialTheme.shapes.large)
                .padding(16.dp)
                .then(
                    if (attn) {
                        Modifier.semantics {
                            liveRegion = LiveRegionMode.Assertive
                            contentDescription = "$title. $body"
                        }
                    } else {
                        Modifier
                    },
                ),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(title, style = MaterialTheme.typography.titleMedium, color = onContainer)
        Text(body, style = MaterialTheme.typography.bodyMedium, color = onContainer)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), content = actions)
    }
}
