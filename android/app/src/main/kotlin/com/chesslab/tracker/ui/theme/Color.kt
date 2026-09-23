package com.chesslab.tracker.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

// Paper and ink, read at arm's length across a board for hours: no pure white or black. Text pairs clear
// WCAG AA; the overlay colours differ by HUE, not lightness. Containers are separated by a 1 px RULE
// ([ChesslabPalette.outline]), not by fill — do not reach for a brighter surface.

interface ChesslabPalette {
    val background: Color
    val surface: Color
    val surfaceRaised: Color
    val onSurface: Color
    val onSurfaceMuted: Color

    val outline: Color

    /** **The one accent**: anything the user can act on, and the tracker being live. */
    val accent: Color

    val busy: Color

    val danger: Color
    val onAccent: Color
    val onDanger: Color

    /** Furniture only — never a call to action. Material's `primary` role is [accent]; the furniture
     *  components name this explicitly (`chesslabSwitchColors`, `chesslabChipColors`). */
    val primary: Color
    val onPrimary: Color

    /** Must differ from [surfaceRaised]: chips sit ON cards, and equal the selection had no visible container. */
    val selection: Color

    val boardLight: Color
    val boardDark: Color
    val pieceWhite: Color
    val pieceBlack: Color
    val lastMoveTint: Color

    /** Python's overlay colours verbatim, identical in both palettes: the same colour must mean the same thing
     *  in both tools — orange once meant "shadow" here and "hand" there. */
    val overlayChanged: Color
    val overlayShadow: Color
    val overlayOcclusion: Color
    val overlayGrid: Color

    val overlayConflict: Color
}

private val PyChanged = Color(0xFFFF2FFF)
private val PyShadow = Color(0xFF00FFFF)
private val PyOcclusion = Color(0xFFFF8C00)
private val PyGrid = Color(0xFF00B400)
private val ConflictRed = Color(0xFFFF2B2B)

/** The ground moved AWAY from the cards and the rule TOWARD the ink: a light theme cannot buy edge
 *  contrast from its ground the way a dark one can. */
internal object PaperPalette : ChesslabPalette {
    override val background = Color(0xFFEAE3D5)
    override val surface = Color(0xFFF4EFE4)
    override val surfaceRaised = Color(0xFFEBE3D4)
    override val onSurface = Color(0xFF2B2620)
    override val onSurfaceMuted = Color(0xFF726A5D)
    override val outline = Color(0xFFD9D0BF)
    override val accent = Color(0xFF43602F)
    override val busy = Color(0xFF7E5106)
    override val danger = Color(0xFF9B4131)
    override val onAccent = Color(0xFFF4EFE4)
    override val onDanger = Color(0xFFF4EFE4)
    override val primary = Color(0xFF6B4A30)
    override val onPrimary = Color(0xFFFAF6EF)
    override val selection = Color(0xFFD7C3A5)
    override val boardLight = Color(0xFFE9DCC1)
    override val boardDark = Color(0xFFB58F63)
    override val pieceWhite = Color(0xFFFCF8F0)
    override val pieceBlack = Color(0xFF241F19)
    override val lastMoveTint = Color(0x66C79A3B)
    override val overlayChanged = PyChanged
    override val overlayShadow = PyShadow
    override val overlayOcclusion = PyOcclusion
    override val overlayGrid = PyGrid
    override val overlayConflict = ConflictRed
}

internal object InkPalette : ChesslabPalette {
    override val background = Color(0xFF100E0C)
    override val surface = Color(0xFF1B1815)
    override val surfaceRaised = Color(0xFF232019)
    override val onSurface = Color(0xFFEDE3D2)
    override val onSurfaceMuted = Color(0xFFA69C8B)
    override val outline = Color(0xFF2F2A23)
    override val accent = Color(0xFFB3CC84)
    override val busy = Color(0xFFE5A85C)
    override val danger = Color(0xFFD08B7C)
    override val onAccent = Color(0xFF1F2415)
    override val onDanger = Color(0xFF2A100E)
    override val primary = Color(0xFFDEA76A)
    override val onPrimary = Color(0xFF2A1D0F)
    override val selection = Color(0xFF453729)
    override val boardLight = Color(0xFFC9B392)
    override val boardDark = Color(0xFF6E5340)
    override val pieceWhite = Color(0xFFFCF8F0)
    override val pieceBlack = Color(0xFF241F19)
    override val lastMoveTint = Color(0x66DEA76A)
    override val overlayChanged = PyChanged
    override val overlayShadow = PyShadow
    override val overlayOcclusion = PyOcclusion
    override val overlayGrid = PyGrid
    override val overlayConflict = ConflictRed
}

val LocalChesslabPalette = staticCompositionLocalOf<ChesslabPalette> { InkPalette }

// Top-level on purpose: a composable getter makes `color = OnSurfaceMuted` follow light/dark unchanged.

val Background: Color
    @Composable @ReadOnlyComposable
    get() = LocalChesslabPalette.current.background
val Surface: Color
    @Composable @ReadOnlyComposable
    get() = LocalChesslabPalette.current.surface
val SurfaceRaised: Color
    @Composable @ReadOnlyComposable
    get() = LocalChesslabPalette.current.surfaceRaised
val OnSurface: Color
    @Composable @ReadOnlyComposable
    get() = LocalChesslabPalette.current.onSurface
val OnSurfaceMuted: Color
    @Composable @ReadOnlyComposable
    get() = LocalChesslabPalette.current.onSurfaceMuted
val Outline: Color
    @Composable @ReadOnlyComposable
    get() = LocalChesslabPalette.current.outline
val Accent: Color
    @Composable @ReadOnlyComposable
    get() = LocalChesslabPalette.current.accent

val Busy: Color
    @Composable @ReadOnlyComposable
    get() = LocalChesslabPalette.current.busy
val Danger: Color
    @Composable @ReadOnlyComposable
    get() = LocalChesslabPalette.current.danger
val OnAccent: Color
    @Composable @ReadOnlyComposable
    get() = LocalChesslabPalette.current.onAccent
val OnDanger: Color
    @Composable @ReadOnlyComposable
    get() = LocalChesslabPalette.current.onDanger
val BoardDark: Color
    @Composable @ReadOnlyComposable
    get() = LocalChesslabPalette.current.boardDark
val PieceWhite: Color
    @Composable @ReadOnlyComposable
    get() = LocalChesslabPalette.current.pieceWhite
val PieceBlack: Color
    @Composable @ReadOnlyComposable
    get() = LocalChesslabPalette.current.pieceBlack
val OverlayChanged: Color
    @Composable @ReadOnlyComposable
    get() = LocalChesslabPalette.current.overlayChanged
val OverlayShadow: Color
    @Composable @ReadOnlyComposable
    get() = LocalChesslabPalette.current.overlayShadow
val OverlayOcclusion: Color
    @Composable @ReadOnlyComposable
    get() = LocalChesslabPalette.current.overlayOcclusion

/** While the alarm is latched the rendered FEN is fiction. */
const val ALARM_SCRIM_ALPHA = 0.34f
