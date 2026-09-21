package com.chesslab.desktop

import com.chesslab.tracker.cnn.ModelSpec
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Das Banner sagt, was ein Lauf gemessen hat. Es druckte `prior=0.0`, waehrend
 * `CnnObserver.priorFor` den Wert aus der `config.json` des Modells nimmt (5,04-7,02).
 */
class PriorBannerTest {
    @Test
    fun `ohne prior-Angabe nennt das Banner das Modell, nicht die Null`() {
        val banner = ReplayOptions().toString()

        assertTrue(banner.contains("prior=modell"), banner)
        assertTrue(!banner.contains("prior=0.0"), banner)
    }

    @Test
    fun `eine ausdrueckliche Angabe steht als Zahl da`() {
        val banner = ReplayOptions(priorLambda = 5.0).toString()

        assertTrue(banner.contains("prior=5.0"), banner)
    }

    @Test
    fun `gegen das Modell verliert die Angabe, und der Lauf sagt es`() {
        val warnings = mutableListOf<String>()

        val banner = ReplayOptions(priorLambda = 5.0).withPriorOf(spec(6.0)) { warnings += it }.toString()

        assertTrue(banner.contains("prior=6.0(modell)"), "das Banner muss den WIRKSAMEN Wert nennen: $banner")
        assertTrue(!banner.contains("prior=5.0"), banner)
        assertTrue(warnings.any { "prior=5.0" in it && "6.0" in it }, "die verworfene Angabe muss gesagt werden: $warnings")
    }

    @Test
    fun `ein Modell ohne prior_lambda laesst die Angabe gelten`() {
        val warnings = mutableListOf<String>()

        val banner = ReplayOptions(priorLambda = 5.0).withPriorOf(spec(null)) { warnings += it }.toString()

        assertTrue(banner.contains("prior=5.0"), banner)
        assertTrue(warnings.isEmpty(), "Gegenprobe: sonst warnt jeder Lauf grundlos — $warnings")
    }

    private fun spec(priorLambda: Double?): ModelSpec {
        val classes = listOf("empty", "wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK")
        return ModelSpec.parse(
            """{"backbone":"x","classes":${classes.joinToString(",", "[", "]") { "\"$it\"" }},
               "out_size":[80,80],"normalize":{"mean":[0.485,0.456,0.406],"std":[0.229,0.224,0.225]}
               ${priorLambda?.let { ",\"prior_lambda\":$it" } ?: ""}}""",
        )
    }
}
