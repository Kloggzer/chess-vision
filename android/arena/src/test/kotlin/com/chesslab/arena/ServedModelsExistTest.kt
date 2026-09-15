package com.chesslab.arena

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.io.File

/**
 * `COVERAGE_MODELS` is the arena's allowlist AND the only name `Models.served` accepts, but the
 * names in it are not the ones the APK carries — so every verb dies before it decodes a frame.
 */
class ServedModelsExistTest {
    @Test
    fun `every served model is a directory under the asset root`() {
        val root = File(ASSET_SOURCE)
        val missing = COVERAGE_MODELS.filterNot { File(root, it).isDirectory }
        assertEquals(emptyList<String>(), missing, "on disk: ${root.list()?.sorted()}")
    }
}
