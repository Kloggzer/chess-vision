package com.chesslab.tracker.settings

import com.chesslab.tracker.cnn.DEFAULT_MODEL
import com.chesslab.tracker.cnn.bundledModelOrDefault
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * Die zwei Sonderzweige in `decodeAppSettings` sind wirkungslos, solange beide Mengen disjunkt zu
 * `BUNDLED_MODELS` sind; gepinnt, weil ein kuenftiges APK sie wieder scharf machen kann.
 */
class RetiredModelBranchesTest {
    @Test
    fun `no retired or legacy-default name is bundled, so every branch answers the same`() {
        for (name in RETIRED_MODELS + LEGACY_DEFAULT_MODELS) {
            assertEquals(
                DEFAULT_MODEL,
                bundledModelOrDefault(name),
                "$name ist wieder gebuendelt — die Sonderzweige in decodeAppSettings sind jetzt scharf",
            )
        }
    }
}
