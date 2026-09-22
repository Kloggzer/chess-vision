package com.chesslab.tracker.settings

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Ein umbenannter Knopf muss unter dem ALTEN Schluessel ankommen: der steht in der
 *  DataStore-Huelle des Telefons und in jeder Replay-Config. Still fallen lassen hiesse,
 *  eine gesetzte Einstellung wirkt nicht mehr und niemand erfaehrt es. */
class LegacyKnobKeyTest {
    @Test
    fun `der alte Schluessel modelHandGate setzt weiter den Formfilter`() {
        val json = """{"version":$CONFIG_SCHEMA_VERSION,"values":{"modelHandGate":0.0}}"""

        val decoded = ConfigCodec.decode(json)

        assertFalse(decoded.config.modelHandShapeFilter, "ein gespeichertes modelHandGate=0 muss ankommen")
        assertTrue(decoded.config.modelHandArm, "der Altname hat nie den ARM abgeschaltet")
    }

    @Test
    fun `der neue Schluessel setzt denselben Knopf`() {
        val json = """{"version":$CONFIG_SCHEMA_VERSION,"values":{"modelHandShapeFilter":0.0,"modelHandArm":0.0}}"""

        val decoded = ConfigCodec.decode(json)

        assertFalse(decoded.config.modelHandShapeFilter)
        assertFalse(decoded.config.modelHandArm)
    }

    @Test
    fun `knobFor findet den Knopf unter beiden Namen`() {
        assertSame(knobFor("modelHandShapeFilter"), knobFor("modelHandGate"), "Altname und neuer Name sind EIN Knopf")
        assertEquals(null, knobFor("modelHandGateTypo"), "ein Tippfehler bleibt unbekannt")
    }

    @Test
    fun `geschrieben wird nur der heutige Name`() {
        val text = ConfigCodec.encode(ConfigCodec.defaults)

        assertTrue("modelHandShapeFilter" in text, "der Kanon-Schluessel gehoert in die Datei")
        assertFalse("\"modelHandGate\"" in text, "Altnamen werden gelesen, nicht geschrieben")
    }

    @Test
    fun `kein Altname kollidiert mit einem lebenden Schluessel`() {
        val canonical = KNOBS.map { it.key }.toSet()
        val aliases = KNOBS.flatMap { it.aliases }

        assertEquals(emptyList<String>(), aliases.filter { it in canonical }, "ein Altname darf kein anderer Knopf sein")
        assertEquals(aliases.size, aliases.toSet().size, "ein Altname gehoert zu genau einem Knopf")
    }
}
