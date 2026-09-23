package com.chesslab.tracker.ui.theme

import androidx.compose.ui.unit.dp

/* Plain objects, not a `CompositionLocal`: spacing changes with nothing. A `.dp` literal in `ui/` is a named
 * component SIZE or a bug — `DpLiteralGuardTest` enforces it. */

object Space {
    val hair = 2.dp

    val xs = 4.dp

    val sm = 8.dp

    /** Applied by `ChesslabScaffold`, not by screens. */
    val md = 12.dp

    val lg = 16.dp

    val xl = 24.dp
}

object Radius {
    val sm = 8.dp

    val md = 12.dp

    val lg = 16.dp
}

/** Line weights: NOT spacing, never drawn from [Space]. */
object Stroke {
    val hairline = 1.dp
    val thick = 3.dp
}

object Touch {
    val min = 48.dp
}
