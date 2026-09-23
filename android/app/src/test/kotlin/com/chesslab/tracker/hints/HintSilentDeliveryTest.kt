package com.chesslab.tracker.hints

import com.chesslab.tracker.speech.Silence
import com.chesslab.tracker.speech.SpeechEngine
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Bei Klingelton-aus verwirft `SpeechEngine` die Ansage, ohne es dem Aufrufer zu sagen — ein nur
 *  gesprochener Tipp verschwaende das Kontingent wortlos. Deshalb IMMER auch die Karte. */
class HintSilentDeliveryTest {
    @Test
    fun aSilencedPhoneNeverReachesTheTextToSpeechEngine() {
        var opens = 0
        val engine =
            SpeechEngine(SilentDevice) {
                opens++
                null
            }
        engine.say(TIP_TEXT, flush = true)
        assertEquals(0, opens)
    }

    /** Die Karte kommt trotzdem, und das Kontingent geht GENAU EINMAL ab. */
    @Test
    fun theCardStillArrivesAndCostsExactlyOne() =
        runTest {
            val controller = HintController()
            controller.startGame(HintPlan(HintSide.BLACK, quota = 3))
            val outcome = controller.request({ moment() })
            assertTrue(outcome is HintOutcome.Tip)
            assertEquals(outcome, controller.state.value.outcome)
            assertEquals(2, controller.state.value.remaining)
        }

    /** Auch die ABSAGE ist zweifach: die Karte traegt sie, wenn die Stimme sie verschluckt. */
    @Test
    fun aRefusalIsAlsoPutOnTheCard() =
        runTest {
            val controller = HintController()
            controller.startGame(HintPlan(HintSide.BLACK, quota = 3))
            controller.request({ moment(alarmed = true) })
            assertEquals(HintOutcome.Refused(HintRefusal.UNSETTLED), controller.state.value.outcome)
        }
}

private const val TIP_TEXT = "Play e5"

private object SilentDevice : Silence {
    override fun silenced() = true

    override fun requestFocus() = true

    override fun abandonFocus() = Unit
}
