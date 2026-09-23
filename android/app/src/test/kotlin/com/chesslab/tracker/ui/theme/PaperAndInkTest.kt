package com.chesslab.tracker.ui.theme

import androidx.compose.ui.text.font.FontFamily
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Theme rules that drift back silently: a palette edited one hex at a time, `labelMedium` reached for its SIZE. */
class PaperAndInkTest {
    /** **Containers are separated by a RULE**, not a fill gap: the answer to a flat screen is a hairline, not
     *  more contrast. Pinned: the rule itself and the ORDER of the stack. */
    @Test
    fun theRuleIsVisibleAndTheSurfaceStackIsInOrder() {
        listOf(InkPalette, PaperPalette).forEach { palette ->
            val ground = steps(palette.background)
            val card = steps(palette.surface)
            val rule = steps(palette.outline)
            // `PaperPalette` had `surfaceRaised` BELOW `surface`: its stack was inverted and nowhere else's was.
            assertTrue(
                palette.surfaceRaised != palette.background,
                "$palette: surfaceRaised vanishes into the ground",
            )
            // A line against BOTH the card it edges and the ground it sits on, or it is decoration on one of them.
            assertTrue(rule != card, "$palette: the rule vanishes on a card")
            assertTrue(rule != ground, "$palette: the rule vanishes on the ground")
        }
    }

    /** **One accent**: Material colours its buttons from `primary`; Home's Resume was amber, the banner's green. */
    @Test
    fun materialsPrimaryRoleIsTheOneAccent() {
        listOf(InkPalette to true, PaperPalette to false).forEach { (palette, dark) ->
            val scheme = palette.scheme(dark)
            assertEquals(palette.accent, scheme.primary, "$palette: Material's primary must be the accent")
            assertNotEquals(palette.primary, scheme.primary, "$palette: the furniture colour is not a call to action")
        }
    }

    /** **Monospace is for figures that align.** [FiguresDisplay] is NOT monospace: large numbers align on `tnum`. */
    @Test
    fun theOnlyMonospaceStyleIsTheOneNamedAfterFigures() {
        assertEquals(FontFamily.Monospace, Figures.fontFamily)
        assertEquals("tnum", FiguresDisplay.fontFeatureSettings)
        assertNotEquals(FontFamily.Monospace, FiguresDisplay.fontFamily)
        val slots =
            with(ChesslabTypography) {
                listOf(displayMedium, titleLarge, bodyLarge, bodyMedium, labelLarge, labelMedium, labelSmall, bodySmall)
            }
        slots.forEach { assertNotEquals(FontFamily.Monospace, it.fontFamily, "a Typography slot went monospace: $it") }
    }
}

/** The unit specs/48 measured the palette in, and the one the hexes are edited in. */
private fun steps(color: androidx.compose.ui.graphics.Color): Int = ((color.red + color.green + color.blue) / 3f * 255f).toInt()
