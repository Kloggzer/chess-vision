package com.chesslab.arena

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.io.File

/** `COVERAGE_MODELS` is the only name `Models.served` accepts; stale names killed every verb. */
class ServedModelsExistTest {
    @Test
    fun `every served model is a directory under the asset root`() {
        val root = File(ASSET_SOURCE)
        val missing = COVERAGE_MODELS.filterNot { File(root, it).isDirectory }
        assertEquals(emptyList<String>(), missing, "on disk: ${root.list()?.sorted()}")
    }
}
