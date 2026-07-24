package com.chesslab.tracker.cnn

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.io.InputStream

/** Bundled-model install (2026-07-21, tiny-p3 baked into assets/cnn_model). */
class CnnModelStoreTest {
    @TempDir
    lateinit var tmp: File

    private fun bundle(vararg names: String): Pair<(String) -> List<String>, (String) -> InputStream> {
        val list = { dir: String -> if (dir == "cnn_model") names.toList() else emptyList() }
        val open = { path: String -> "content-of-$path".byteInputStream() }
        return list to open
    }

    @Test
    fun `installs the complete bundle when nothing is installed`() {
        val store = CnnModelStore(tmp)
        val (list, open) = bundle(OnnxClassifier.MODEL_FILE, OnnxClassifier.CONFIG_FILE, OnnxClassifier.MODEL_QNN_FILE)
        assertTrue(store.installBundledIfMissing(list, open))
        assertTrue(store.isInstalled())
        assertTrue(File(store.modelDir, OnnxClassifier.MODEL_QNN_FILE).isFile)
    }

    @Test
    fun `never overwrites an explicitly imported model`() {
        val store = CnnModelStore(tmp)
        store.modelDir.mkdirs()
        File(store.modelDir, OnnxClassifier.MODEL_FILE).writeText("imported-model")
        File(store.modelDir, OnnxClassifier.CONFIG_FILE).writeText("imported-config")
        val (list, open) = bundle(OnnxClassifier.MODEL_FILE, OnnxClassifier.CONFIG_FILE)
        assertTrue(store.installBundledIfMissing(list, open))
        assertEquals("imported-model", File(store.modelDir, OnnxClassifier.MODEL_FILE).readText())
    }

    @Test
    fun `incomplete bundle installs nothing`() {
        val store = CnnModelStore(tmp)
        val (list, open) = bundle(OnnxClassifier.MODEL_FILE) // config.json missing
        assertFalse(store.installBundledIfMissing(list, open))
        assertFalse(store.isInstalled())
    }
}
