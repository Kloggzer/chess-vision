package com.chesslab.tracker.ui.theme

import androidx.compose.ui.unit.dp

/*
 * The app's spacing scale.
 *
 * Plain objects, not a `CompositionLocal`: colour is a local because it changes with the theme, and
 * spacing changes with nothing. A local would cost a composition read at every one of ~195 call
 * sites for a constant.
 *
 * Before this file the tree held **26 distinct `dp` literals over 195 uses** and no token to name
 * any of them — the horizontal screen margin alone was 12 on Games/Settings/Speech/Debug, 14 on the
 * board and 0 on the camera. Seven values covered 80 % of the uses, which is what made the
 * collapse cheap.
 *
 * The one rule: **a `.dp` literal in a `ui/` file is either a component SIZE with a name, or it is
 * a bug.** `DpLiteralGuardTest` enforces it — see there for what a named size looks like and why a
 * token file that swallowed `POSITION_COLUMN_WIDTH` would become a dumping ground.
 */

/** Gaps and padding. One 4 dp grid, with a 2 dp half-step for optical pairs inside one text block. */
object Space {
    /** Title ↔ subtitle inside the same block; nothing else. */
    val hair = 2.dp

    /** Icon ↔ label, chips in a row. */
    val xs = 4.dp

    /** Siblings inside a card. Took the 24 uses of 6 dp with it — decided 2026-08-03. */
    val sm = 8.dp

    /** Screen side margin and card inner padding. Applied by `ChesslabScaffold`, not by screens. */
    val md = 12.dp

    /** Between sections. */
    val lg = 16.dp

    /** Above a new block on a long page. */
    val xl = 24.dp
}

/** Corner radii. Three, and they are a function of the element's size. */
object Radius {
    /** Chips and inline blocks. */
    val sm = 8.dp

    /** Cards and panels. */
    val md = 12.dp

    /** Sheets and dialogs. */
    val lg = 16.dp
}

/** Line weights. These are NOT spacing and must never be drawn from [Space]. */
object Stroke {
    val hairline = 1.dp
    val thick = 3.dp
}

/** The one size that is a rule rather than a layout choice: Material's minimum touch target. */
object Touch {
    /** 48, so the 44 dp tracking chips stop sitting below Material's floor. */
    val min = 48.dp
}
