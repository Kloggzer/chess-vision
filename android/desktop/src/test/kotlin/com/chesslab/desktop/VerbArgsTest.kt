package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

class VerbArgsTest {
    @TempDir
    lateinit var temp: File

    @Test
    fun `an option is the first word carrying its name and keeps any later equals sign`() {
        val words = listOf("in.mp4", "id=a=b", "every=5", "every=9", "everything=3")
        assertEquals("a=b", words.stringOption("id"))
        assertEquals("5", words.stringOption("every"))
        assertNull(words.stringOption("ever"))
        assertNull(words.stringOption("max"))
        assertEquals("", listOf("id=").stringOption("id"))
    }

    @Test
    fun `numbers fall back on absence and on garbage`() {
        assertEquals(5, listOf("every=5").intOption("every", 7))
        assertEquals(7, listOf("every=x").intOption("every", 7))
        assertEquals(7, emptyList<String>().intOption("every", 7))
        assertEquals(2.5, listOf("fps=2.5").doubleOption("fps"))
        assertNull(listOf("fps=0").doubleOption("fps"))
        assertNull(listOf("fps=-1").doubleOption("fps"))
        assertNull(listOf("fps=x").doubleOption("fps"))
    }

    @Test
    fun `a tilde in a path argument stands for a space`() {
        assertEquals(File("data/my recording/video.mp4"), "data/my~recording/video.mp4".fileArg())
    }

    @Test
    fun `json escapes backslash before quote`() {
        assertEquals("""a\\b\"c""", json("a\\b\"c"))
    }

    @Test
    fun `a frame list is read from the frames option`() {
        val list = File(temp, "f.txt").apply { writeText("3\n 5 \nx\n3\n") }
        assertEquals(setOf(3, 5), frameList(listOf("every=2", "frames=${list.path}")))
        assertNull(frameList(listOf("every=2")))
    }
}
