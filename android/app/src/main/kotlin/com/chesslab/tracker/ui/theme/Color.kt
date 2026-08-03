package com.chesslab.tracker.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

// Paper and ink. The screen is read at arm's length across a physical board, in room light, for
// hours — so the reference is chess furniture, not a dashboard: aged paper, sepia ink, boxwood and
// walnut. Nothing here is pure white or pure black; both are harsh under a desk lamp and neither
// occurs in the material the app is imitating.
//
// Every pair that carries text clears WCAG AA (4.5:1) against the surface it is actually drawn on,
// and the three evidence-overlay colours are separated by HUE (blue / ochre / magenta), not by
// lightness, so red-green colour vision deficiency cannot collapse them into one another.
//
// **Containers are separated by a RULE, not by a fill difference** (specs/48). Until 2026-08-03 the
// dark ground, cards and raised cards sat within twenty luminance steps of each other and the light
// ones within seven, so a screen made of containers read as one flat field. Printed matter — which
// is what this palette imitates — separates blocks with a line. The ground moved down, the cards
// stayed near it, and [ChesslabPalette.outline] is now drawn as a 1 px edge on every card and tile.
// Elevation by fill is retired; do not reach for a brighter surface to make something stand out.

/** One scheme's worth of colour. Two implementations: [PaperPalette] and [InkPalette]. */
interface ChesslabPalette {
    val background: Color
    val surface: Color
    val surfaceRaised: Color
    val onSurface: Color
    val onSurfaceMuted: Color

    /** The rule. Every card and tile is drawn with a 1 px edge of it — see the note at the top. */
    val outline: Color

    /**
     * **The one accent.** Anything the user can act on, and the tracker being live.
     *
     * It was two: this and [primary] were used for the same act, so Home's *Resume* was amber and
     * the in-progress banner's *Resume* one screen away was green. Nothing decided which meant what.
     */
    val accent: Color

    /** A hand is over the board, or an edit is waiting on a restart — expected, not a problem. */
    val busy: Color

    /** The illegal-move latch. Also the board scrim while alarmed. */
    val danger: Color
    val onAccent: Color
    val onDanger: Color

    /**
     * Furniture only — the selected chip, the switch track. **Never a call to action.**
     *
     * Material's `primary` role is [accent] since specs/48, so every button and link the framework
     * colours for itself lands on the one accent. The two places that are furniture rather than
     * action state this colour explicitly (`chesslabSwitchColors`, `chesslabChipColors`).
     */
    val primary: Color
    val onPrimary: Color

    /**
     * The fill of a chosen chip. It has to differ from [surfaceRaised]: chips sit ON cards, and
     * with the two equal the selected option was the only one with no visible container at all.
     */
    val selection: Color

    val boardLight: Color
    val boardDark: Color
    val pieceWhite: Color
    val pieceBlack: Color
    val lastMoveTint: Color

    /**
     * The diagnostic overlay. These four are NOT theme colours and are identical in both
     * palettes on purpose.
     *
     * They are Python's, verbatim from `tracker.py::_encode_overlay` and the web legend
     * (`static/index.html:133-136`): changed magenta, shadow cyan, occlusion/hand orange, grid
     * green. The same colour has to mean the same thing in both tools, because the whole point of
     * looking at this overlay is comparing what the two see. Android had picked its own set, and
     * ORANGE meant "shadow" here and "hand" there — the one mismatch that reads as a real finding
     * rather than a palette difference.
     */
    val overlayChanged: Color
    val overlayShadow: Color
    val overlayOcclusion: Color
    val overlayGrid: Color

    /** No Python counterpart: where the CNN contradicts the believed position. It means STOP. */
    val overlayConflict: Color
}

// Python's overlay, shared by both themes. See [ChesslabPalette.overlayChanged].
private val PyChanged = Color(0xFFFF2FFF)
private val PyShadow = Color(0xFF00FFFF)
private val PyOcclusion = Color(0xFFFF8C00)
private val PyGrid = Color(0xFF00B400)
private val ConflictRed = Color(0xFFFF2B2B)

/**
 * Light: warm paper with sepia ink.
 *
 * The same arithmetic as [InkPalette], in the direction light has available: the ground moved
 * **away** from the cards (10 luminance steps between them, now 24) and the rule moved **toward**
 * the ink, because a light theme cannot buy edge contrast from its ground the way a dark one can.
 * `surfaceRaised` used to be darker than `surface`, i.e. the stack was inverted here and nowhere
 * else; it now sits between the ground and the card, as its name says.
 */
internal object PaperPalette : ChesslabPalette {
    override val background = Color(0xFFEAE3D5)
    override val surface = Color(0xFFFBF8F2)
    override val surfaceRaised = Color(0xFFF2ECE1)
    override val onSurface = Color(0xFF2B2620)
    override val onSurfaceMuted = Color(0xFF5E5347)
    override val outline = Color(0xFFB9A88E)
    override val accent = Color(0xFF43602F)
    override val busy = Color(0xFF7E5106)
    override val danger = Color(0xFF93231D)
    override val onAccent = Color(0xFFFAF6EF)
    override val onDanger = Color(0xFFFAF6EF)
    override val primary = Color(0xFF6B4A30)
    override val onPrimary = Color(0xFFFAF6EF)
    override val selection = Color(0xFFD7C3A5)
    override val boardLight = Color(0xFFE9DCC4)
    override val boardDark = Color(0xFFB08968)
    override val pieceWhite = Color(0xFFFCF8F0)
    override val pieceBlack = Color(0xFF241F19)
    override val lastMoveTint = Color(0x66C79A3B)
    override val overlayChanged = PyChanged
    override val overlayShadow = PyShadow
    override val overlayOcclusion = PyOcclusion
    override val overlayGrid = PyGrid
    override val overlayConflict = ConflictRed
}

/** Dark: ink-stained walnut, never a black void. The same material at night. */
internal object InkPalette : ChesslabPalette {
    override val background = Color(0xFF100E0C)
    override val surface = Color(0xFF1B1713)
    override val surfaceRaised = Color(0xFF241F1A)
    override val onSurface = Color(0xFFEDE3D2)
    override val onSurfaceMuted = Color(0xFFB0A28F)
    override val outline = Color(0xFF453B31)
    override val accent = Color(0xFFB3CC84)
    override val busy = Color(0xFFE5A85C)
    override val danger = Color(0xFFF0827A)
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

// The tokens the whole app reads. They stayed top-level properties on purpose: every call site
// already said `color = OnSurfaceMuted`, and a composable getter makes the same expression follow
// the system light/dark setting without a single call site changing.

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

/** Furniture, never a call to action — see [ChesslabPalette.primary]. */
val Primary: Color
    @Composable @ReadOnlyComposable
    get() = LocalChesslabPalette.current.primary
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
val BoardLight: Color
    @Composable @ReadOnlyComposable
    get() = LocalChesslabPalette.current.boardLight
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

/** Scrim laid over the whole board while the alarm is latched: the rendered FEN is fiction. */
const val ALARM_SCRIM_ALPHA = 0.34f
