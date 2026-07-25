package com.chesslab.tracker.record

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

/**
 * Session recording writes only app-private files. The moment a storage permission appears here,
 * something started writing outside `filesDir` — and that is a user-visible permission prompt for
 * a feature that must not need one.
 */
class ManifestPermissionsTest {
    private val manifest = File("src/main/AndroidManifest.xml").readText()

    @Test
    fun noExternalStoragePermissionInManifest() {
        listOf("WRITE_EXTERNAL_STORAGE", "READ_EXTERNAL_STORAGE", "MANAGE_EXTERNAL_STORAGE").forEach {
            assertFalse(manifest.contains(it), "$it must not be requested")
        }
    }

    @Test
    fun networkPermissionsForTheSpectatorAreDeclared() {
        assertTrue(manifest.contains("android.permission.INTERNET"))
        assertTrue(manifest.contains("android.permission.ACCESS_NETWORK_STATE"))
    }
}
