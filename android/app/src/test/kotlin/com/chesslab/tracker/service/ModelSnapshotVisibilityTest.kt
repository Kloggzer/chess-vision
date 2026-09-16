package com.chesslab.tracker.service

import android.app.Application
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.lang.reflect.Modifier

/** Ein veralteter `modelChoice` faellt auf die AKTUELLEN Einstellungen zurueck: der Klassifizierer
 *  oeffnet dann ein anderes Modell als die Spec daneben, mit der die Crops geschnitten werden. */
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, application = Application::class)
class ModelSnapshotVisibilityTest {
    @Test
    fun `both halves of the model snapshot are published across threads`() {
        listOf("modelSpec", "modelChoice").forEach { name ->
            val field = TrackerService::class.java.getDeclaredField(name)
            assertTrue("$name is read off the thread that writes it", Modifier.isVolatile(field.modifiers))
        }
    }
}
