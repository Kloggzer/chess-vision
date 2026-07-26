package com.chesslab.tracker.ui

import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.SurfaceRaised

private val TAB_HEIGHT = 52.dp

/**
 * The app's navigation row.
 *
 * As bare text on the game background it was unreadable against the status-bar clock and — once
 * Android 16 forced the window under the system bars — its entire touch area sat inside the status
 * bar, so nothing was tappable. A `TabRow` also answers "where am I": the board tab is selected
 * here, and every other destination announces itself with its own title bar.
 */
@Composable
fun TopNav(
    destinations: List<NavDestination>,
    selected: Int,
    modifier: Modifier = Modifier,
) {
    TabRow(
        selectedTabIndex = selected,
        modifier = modifier,
        containerColor = SurfaceRaised,
        contentColor = Accent,
    ) {
        destinations.forEachIndexed { index, destination ->
            Tab(
                selected = index == selected,
                onClick = destination.onClick,
                modifier = Modifier.heightIn(min = TAB_HEIGHT),
                selectedContentColor = OnSurface,
                unselectedContentColor = OnSurfaceMuted,
            ) {
                Text(destination.label, style = MaterialTheme.typography.labelSmall, maxLines = 1)
            }
        }
    }
}
