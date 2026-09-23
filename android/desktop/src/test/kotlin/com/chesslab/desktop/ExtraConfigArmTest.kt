package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.cnn.ModelSpec
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/** Mit dem FERTIGEN `base` umging `configs=` `atFrameRate` und `coverage_gate`: ein A/B verglich zwei Skalen. */
class ExtraConfigArmTest {
    @TempDir
    lateinit var dir: File

    private val geometry = BoardGeometry(boardSize = 928)

    private val classes =
        listOf("empty", "wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK")

    private val spec: ModelSpec =
        ModelSpec.parse(
            """{"backbone":"x","classes":${classes.joinToString(",", "[", "]") { "\"$it\"" }},
               "out_size":[80,80],"normalize":{"mean":[0.485,0.456,0.406],"std":[0.229,0.224,0.225]},
               "coverage_output":true,"coverage_gate":0.25,"temperature":1.42}""",
        )

    private fun baue(extra: Map<String, Double>): TrackerConfig =
        ReplayOptions(fps = 15.0, overrides = extra)
            .trackerConfig(geometry, live = false)
            .withCoverageGateOf(spec, extra.keys) { }

    private fun arm(line: String): TrackerConfig {
        val file = File(dir, "configs.txt").apply { writeText(line + "\n") }
        return readExtraConfigs(file, ::baue).single().second
    }

    @Test
    fun `motionThr im Zusatz-Arm wird auf die emulierte Rate skaliert wie im Hauptlauf`() {
        assertEquals(baue(mapOf("motionThr" to 0.6)).motionThr, arm("a motionThr=0.6").motionThr, TOLERANCE)
        assertEquals(0.6 * 2.0, arm("a motionThr=0.6").motionThr, TOLERANCE, "fps=15 gegen 30: mal zwei")
    }

    @Test
    fun `cnnConfThr im Zusatz-Arm laeuft durch die Temperatur des Modells`() {
        val out = arm("a cnnConfThr=0.85").cnnConfThr
        assertEquals(baue(mapOf("cnnConfThr" to 0.85)).cnnConfThr, out, TOLERANCE)
        assert(out < 0.85) { "T=1,42 macht aus der Huerde eine kleinere echte Wahrscheinlichkeit, war $out" }
    }

    @Test
    fun `eine Zeile ohne die drei Knoepfe bleibt verhaltensgleich`() {
        assertEquals(baue(emptyMap()).copy(recoveryMaxPlies = 6), arm("a recoveryMaxPlies=6"))
    }

    @Test
    fun `ein Tippfehler im Knopfnamen bricht ab, statt die Vorgabe zu messen`() {
        assertThrows(IllegalStateException::class.java) { arm("a motionThrr=0.6") }
        assertThrows(IllegalStateException::class.java) { TrackerConfig().withOverrides(mapOf("gibtsNicht" to 1.0)) }
    }

    @Test
    fun `configs= und set lesen dieselben Werte, auch true und false`() {
        val set = ReplayOptions.parse(listOf("set:cnnVerify=false", "set:recoveryMaxPlies=6", "set:usePrior=true")).overrides
        assertEquals(mapOf("cnnVerify" to 0.0, "recoveryMaxPlies" to 6.0, "usePrior" to 1.0), set)
        assertEquals(baue(set), arm("a cnnVerify=false recoveryMaxPlies=6 usePrior=true"))
        assertEquals(false, arm("a cnnVerify=false").cnnVerify)
    }

    @Test
    fun `ein Wert, der weder Zahl noch true oder false ist, bricht in beiden Formen ab`() {
        assertThrows(IllegalStateException::class.java) { ReplayOptions.parse(listOf("set:cnnVerify=nein")) }
        assertThrows(IllegalStateException::class.java) { arm("a cnnVerify=nein") }
        assertThrows(IllegalStateException::class.java) { arm("a cnnVerify") }
    }

    private companion object {
        const val TOLERANCE = 1e-9
    }
}
