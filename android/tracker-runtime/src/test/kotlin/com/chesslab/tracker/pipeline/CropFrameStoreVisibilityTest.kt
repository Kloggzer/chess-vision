package com.chesslab.tracker.pipeline

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.lang.reflect.Modifier

/**
 * `pending` wechselt den Besitzer zwischen zwei Threads: der Analyzer schreibt es (`update`), der
 * Observer raeumt es (`take`) — beide unter der Sperre. Gelesen wird es aber OHNE sie.
 */
class CropFrameStoreVisibilityTest {
    @Test
    fun pendingIsPublishedToTheThreadThatOnlyReadsIt() {
        val field = CropFrameStore::class.java.getDeclaredField("pending")
        assertTrue(
            Modifier.isVolatile(field.modifiers),
            "wantsFrame() und idle lesen 'pending' ausserhalb der Sperre, die update()/take() halten — " +
                "ohne volatile sieht der Analyzer-Thread die Null des Observer-Threads moeglicherweise nie " +
                "und der Crop-Warp wird nie wieder gebaut",
        )
    }
}
