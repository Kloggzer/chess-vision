package com.chesslab.cnn

import com.chesslab.engine.api.STARTPOS
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ObservationTest {
    @Test
    fun `observation_from_probs matches every golden row`() {
        val rows = CnnFixtures.rows(CnnFixtures.OBSERVATION)
        assertEquals(7, rows.size, "row count")
        for (row in rows) {
            val name = row.str("name")
            val obs = row.observation()
            assertCloseMap(row.numberMap("pOcc"), obs.pOcc, "$name pOcc")
            assertCloseMap(row.numberMap("pEmpty"), obs.pEmpty, "$name pEmpty")
            assertCloseMap(row.numberMap("pOccluded"), obs.pOccluded, "$name pOccluded")
            assertCloseMap(row.numberMap("conf"), obs.conf!!, "$name conf")
            assertEquals(row.stringMap("label"), obs.label, "$name label")
            val thr = row.num("confThr")
            assertEquals(row.boolMap("confident"), obs.confident(thr), "$name confident")
            assertEquals(row.boolMap("labelConfident"), obs.labelConfident(thr), "$name labelConfident")
            assertEquals(row.boolMap("occupied"), ALL_SQUARES.associateWith { obs.occupied(it) }, "$name occupied")
        }
    }

    @Test
    fun `13-class run has no occluded mass`() {
        val classes = CnnFixtures.meta().strings("classes13")
        assertEquals(13, classes.size)
        val fake = FakeSquareClassifier(STARTPOS, conf = 0.99, classes = classes)
        val obs = fake.observe()
        assertTrue(obs.pOccluded.values.all { it == 0.0 }, "pOccluded must be 0 without the class")
        assertTrue(obs.labelConfident(THR).values.all { it }, "labelConfident still works on 13 classes")
        assertEquals("wP", obs.label("e2"))
    }

    /** The CNN arm of the hand veto was blind until this column existed. Not a class: neither argmax nor runner-up. */
    @Test
    fun `the coverage column past the classes feeds pOccluded`() {
        val row = DoubleArray(PIECES13_CLASSES.size + 1)
        row[PIECES13_CLASSES.indexOf("wN")] = 1.0
        row[PIECES13_CLASSES.size] = 0.8
        val obs = observationFromProbs(mapOf("e4" to row), PIECES13_CLASSES)
        assertClose(0.8, obs.pOccluded.getValue("e4"), "coverage")
        assertEquals("wN", obs.label("e4"))
        assertClose(1.0, obs.conf("e4"), "the coverage must not win the argmax")
        assertClose(0.0, obs.runnerUpConf("e4"), "nor be the runner-up")
        assertFalse(obs.confident("e4", THR), "a covered square is never confident")
    }

    @Test
    fun `confident gates on both the occupancy peak and the occluded mass`() {
        assertTrue(single(pEmpty = 0.9, pOccluded = 0.05).confident("e4", THR))
        assertFalse(single(pEmpty = 0.9, pOccluded = 0.20).confident("e4", THR), "pOccluded >= 1 - thr")
        assertFalse(single(pOcc = 0.84, pEmpty = 0.16).confident("e4", THR), "peak below thr")
    }

    /** `coverage_gate` is MEASURED per model and used to hang on `1.0 - thr`: lowering `cnnConfThr` loosened it. */
    @Test
    fun `the measured gate replaces the class threshold, in both directions`() {
        val square = labelled(pOccluded = 0.20)

        assertTrue(square.withCoverageThr(0.35).confident("e4", THR), "das 128er Modell misst 0,35")
        assertFalse(square.withCoverageThr(0.05).confident("e4", THR), "die drei p4-Laeufe messen 0,05")
    }

    @Test
    fun `lowering the class threshold no longer loosens the coverage gate`() {
        val square = labelled(pOccluded = 0.20).withCoverageThr(0.25)

        assertTrue(square.confident("e4", THR))
        assertTrue(square.confident("e4", 0.60), "0,60 wuerde als 1 - thr = 0,40 durchlassen")
    }

    @Test
    fun `labelConfident carries the same gate`() {
        assertFalse(labelled(pOccluded = 0.30).withCoverageThr(0.25).labelConfident("e4", THR))
        assertTrue(labelled(pOccluded = 0.20).withCoverageThr(0.25).labelConfident("e4", THR))
    }

    @Test
    fun `a square exactly at the measured gate is already covered`() {
        assertFalse(labelled(pOccluded = 0.25).withCoverageThr(0.25).confident("e4", THR))
        assertTrue(labelled(pOccluded = 0.24).withCoverageThr(0.25).confident("e4", THR))
    }

    /** Die Wiederherstellung liest ueber `rawObservation()` an der bedingten Sicht vorbei; dort galt sonst `1.0 - thr`. */
    @Test
    fun `the measured gate reaches the raw observation too`() {
        val conditioned = priored().withCoverageThr(0.05)
        val raw = conditioned.rawObservation()

        assertNotNull(conditioned.raw, "der Vorflug braucht eine rohe Zeile")
        assertFalse(raw.confident("e4", THR), "0,10 liegt ueber dem gemessenen Tor 0,05")
        assertTrue(priored().rawObservation().confident("e4", THR), "unter `1 - thr` waere sie sicher")
    }

    /** `runnerUpConf` exists to REJECT an automatic promotion, and whoever knows nothing rejects. */
    @Test
    fun `a missing runner-up rejects rather than waves through`() {
        assertEquals(1.0, single().runnerUpConf("e4"), EXACT)
        assertEquals(0.0, single().conf("e4"), EXACT)
    }

    @Test
    fun `occupied is a strict greater-than`() {
        assertFalse(single(pOcc = 0.5, pEmpty = 0.5).occupied("e4"), "a tie is NOT occupied")
        assertTrue(single(pOcc = 0.51, pEmpty = 0.49).occupied("e4"))
    }

    @Test
    fun `the piece mass is clamped against float drift`() {
        val row = DoubleArray(EXPECTED_CLASSES.size)
        row[EXPECTED_CLASSES.indexOf("empty")] = 0.6
        row[EXPECTED_CLASSES.indexOf("occluded")] = 0.6
        val obs = observationFromProbs(mapOf("e4" to row), EXPECTED_CLASSES)

        assertEquals(0.0, obs.pOcc.getValue("e4"), EXACT)
    }

    @Test
    fun `labelConfident rejects occluded and is all-false without identity`() {
        val occluded = single(pEmpty = 0.01, pOccluded = 0.99, label = "occluded", conf = 0.99)
        assertFalse(occluded.labelConfident("e4", THR))
        val stripped = FakeSquareClassifier(STARTPOS).observe().occupancyOnly()
        val flags = stripped.labelConfident(THR)
        assertEquals(ALL_SQUARES.size, flags.size, "all 64 keys are present")
        assertTrue(flags.values.none { it })
    }

    /** On a coverage model the label is never `occluded`, so a covered square's guess reached identity checks. */
    @Test
    fun `labelConfident gates on the coverage column as well`() {
        assertFalse(covered(0.9).labelConfident("e4", THR), "a covered square states no identity")
        assertTrue(covered(0.05).labelConfident("e4", THR), "a clear one still does")

        val softmax = DoubleArray(EXPECTED_CLASSES.size)
        softmax[EXPECTED_CLASSES.indexOf("occluded")] = 0.99
        val fourteen = observationFromProbs(mapOf("e4" to softmax), EXPECTED_CLASSES)
        assertFalse(fourteen.labelConfident("e4", THR), "the 14-class softmax stays false as before")
    }

    @Test
    fun `coverage mass does not leave the occupancy denominator`() {
        assertClose(1.0, covered(0.14).pOcc.getValue("e4"), "13 classes + coverage: 1 − pEmpty")
        assertTrue(covered(0.14).confident("e4", THR), "a surely occupied square stays confident")

        val softmax = DoubleArray(EXPECTED_CLASSES.size)
        softmax[EXPECTED_CLASSES.indexOf("wQ")] = 0.86
        softmax[EXPECTED_CLASSES.indexOf("occluded")] = 0.14
        val fourteen = observationFromProbs(mapOf("e4" to softmax), EXPECTED_CLASSES)
        assertClose(0.86, fourteen.pOcc.getValue("e4"), "an occluded CLASS still shares the denominator")
    }

    @Test
    fun `argmax ties go to the lowest class index`() {
        val tied = DoubleArray(EXPECTED_CLASSES.size)
        tied[EXPECTED_CLASSES.indexOf("wN")] = 0.5
        tied[EXPECTED_CLASSES.indexOf("wB")] = 0.5
        val obs = observationFromProbs(mapOf("e4" to tied), EXPECTED_CLASSES)
        assertEquals("wN", obs.label("e4"))
        assertClose(0.5, obs.conf("e4"), "tie conf")
        assertClose(0.5, obs.runnerUpConf("e4"), "tie runner-up")
    }

    private fun covered(coverage: Double): OccupancyObservation {
        val row = DoubleArray(PIECES13_CLASSES.size + 1)
        row[PIECES13_CLASSES.indexOf("wQ")] = 0.99
        row[PIECES13_CLASSES.size] = coverage
        return observationFromProbs(mapOf("e4" to row), PIECES13_CLASSES)
    }

    private fun priored(): OccupancyObservation {
        val row = DoubleArray(PIECES13_CLASSES.size + 1)
        row[PIECES13_CLASSES.indexOf("wQ")] = 0.99
        row[PIECES13_CLASSES.size] = 0.10
        return observationFromProbs(
            mapOf("e4" to row),
            PIECES13_CLASSES,
            possible = mapOf("e4" to setOf("wQ", "empty")),
            priorLambda = 4.0,
        )
    }

    private fun labelled(pOccluded: Double) = single(pOcc = 0.95, pEmpty = 0.05, pOccluded = pOccluded, label = "wP", conf = 0.95)

    private fun single(
        pOcc: Double = 0.0,
        pEmpty: Double = 0.0,
        pOccluded: Double = 0.0,
        label: String? = null,
        conf: Double? = null,
    ) = OccupancyObservation(
        pOcc = mapOf("e4" to pOcc),
        pEmpty = mapOf("e4" to pEmpty),
        pOccluded = mapOf("e4" to pOccluded),
        label = label?.let { mapOf("e4" to it) },
        conf = conf?.let { mapOf("e4" to it) },
    )

    private companion object {
        const val THR = 0.85
        const val EXACT = 1e-12
    }
}
