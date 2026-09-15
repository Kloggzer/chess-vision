package com.chesslab.tracker.settings

import com.chesslab.tracker.cnn.DEFAULT_MODEL
import com.chesslab.tracker.cnn.bundledModelOrDefault
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * Die zwei Sonderzweige in `decodeAppSettings` sind heute wirkungslos — beide Mengen sind disjunkt
 * zu `BUNDLED_MODELS`. Gepinnt statt geloescht: liefert ein kuenftiges APK einen dieser Namen
 * wieder mit, werden sie scharf und ihre Reihenfolge zaehlt.
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
