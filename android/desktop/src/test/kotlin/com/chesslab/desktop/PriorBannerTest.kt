package com.chesslab.desktop

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
}
