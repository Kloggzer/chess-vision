package com.chesslab.tracker.ui

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.ui.theme.Background
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.SurfaceRaised

/**
 * The frame every screen except the board wears.
 *
 * It exists because Back used to be a differently placed, differently styled control on every
 * screen — an outlined pill on the right here, green text on the left there — and because a
 * hand-rolled header row does not push scrolling content out from under itself, so the settings
 * list scrolled straight under its own title.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChesslabScaffold(
    title: String,
    onBack: () -> Unit,
    content: @Composable (PaddingValues) -> Unit,
) {
    Scaffold(
        // The root already consumed `safeDrawing` (MainActivity), so a Scaffold that inset again
        // would leave a second, doubled system-bar gap on every screen.
        contentWindowInsets = WindowInsets(0),
        containerColor = Background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleLarge,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                },
                navigationIcon = {
                    // The platform affordance, and the ONLY one: it calls the same `onBack` the
                    // system back button reaches, so the two can never diverge. `AutoMirrored`
                    // flips it for RTL locales.
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors =
                    TopAppBarDefaults.topAppBarColors(
                        containerColor = SurfaceRaised,
                        titleContentColor = OnSurface,
                    ),
            )
        },
        content = content,
    )
}

/** Screens breathe at the same margin; only the board screen sets its own. */
val ScreenPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp)

/** A destination [TopNav] can reach. The first one is where the row itself lives. */
data class NavDestination(
    val label: String,
    val onClick: () -> Unit,
)
