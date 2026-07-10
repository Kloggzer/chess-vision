package com.chesslab.tracker.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

/** Shapes matching the mockup: board frame (12 dp) and cards/sheets (18 dp). */
val ChesslabShapes =
    Shapes(
        small = RoundedCornerShape(8.dp),
        medium = RoundedCornerShape(12.dp),
        large = RoundedCornerShape(18.dp),
    )
