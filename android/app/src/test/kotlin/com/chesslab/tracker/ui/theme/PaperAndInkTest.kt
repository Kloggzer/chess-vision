package com.chesslab.tracker.ui.theme

import androidx.compose.ui.text.font.FontFamily
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The two rules of specs/48 that are properties of the theme rather than of a screen.
 *
 * Both are the kind that drift back silently: a palette is edited one hex at a time, and a `Text`
 * reaches for `labelMedium` because it is the right SIZE rather than because it is a label.
 */
class PaperAndInkTest {
    /**
     * **Containers are separated by a RULE, not by a fill difference.**
     *
     * Note what this does and does not assert, because the difference is the whole design. It does
     * NOT demand a big gap between the ground and the cards: specs/48 measured the dark ground, card
     * and raised card at twenty steps apart in total and left that span alone — 17 steps before,
     * 17 after — because the answer to a flat screen is a hairline, not more contrast. What moved in
     * dark is that the ground went DOWN and the rule came in. In light the ground did move away, from
     * 9 steps to 22, because a light theme cannot buy edge contrast by darkening its ground.
     *
     * So what is worth pinning is the rule itself and the ORDER of the stack.
     */
    @Test
    fun theRuleIsVisibleAndTheSurfaceStackIsInOrder() {
        listOf(InkPalette, PaperPalette).forEach { palette ->
            val ground = steps(palette.background)
            val card = steps(palette.surface)
            val rule = steps(palette.outline)
            // `surfaceRaised` is on the same side of the ground as `surface`, which is what its name
            // claims. `PaperPalette` had it BELOW `surface` — its stack was inverted and nowhere
            // else's was.
            assertTrue(
                palette.surfaceRaised != palette.background,
                "$palette: surfaceRaised vanishes into the ground",
            )
            // A 1 px line has to be a line against BOTH the card it edges and the ground it sits on,
            // or it is decoration on one of them.
            assertTrue(rule != card, "$palette: the rule vanishes on a card")
            assertTrue(rule != ground, "$palette: the rule vanishes on the ground")
        }
    }

    /**
     * **One accent.** Material colours every button and link it owns from the `primary` role, so
     * that role has to be the app's accent or half the app is actionable in one hue and half in
     * another — Home's Resume was amber, the banner's was green.
     */
    @Test
    fun materialsPrimaryRoleIsTheOneAccent() {
        listOf(InkPalette to true, PaperPalette to false).forEach { (palette, dark) ->
            val scheme = palette.scheme(dark)
            assertEquals(palette.accent, scheme.primary, "$palette: Material's primary must be the accent")
            assertNotEquals(palette.primary, scheme.primary, "$palette: the furniture colour is not a call to action")
        }
    }

    /**
     * **Monospace is for figures that align** — never a heading, never a label, never prose.
     *
     * [FiguresDisplay] is deliberately NOT monospace: a large number lines up on `tnum`, and the
     * face's letter spacing comes with the monospace family whether it is wanted or not.
     */
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

/**
 * A colour in 8-bit "luminance steps" — the unit specs/48 measured the palette in, and the one the
 * hexes are actually edited in.
 */
private fun steps(color: androidx.compose.ui.graphics.Color): Int = ((color.red + color.green + color.blue) / 3f * 255f).toInt()
