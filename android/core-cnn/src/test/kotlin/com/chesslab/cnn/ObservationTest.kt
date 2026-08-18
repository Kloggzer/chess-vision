package com.chesslab.cnn

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
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
        val fake = FakeSquareClassifier(START_FEN, conf = 0.99, classes = classes)
        val obs = fake.observe()
        assertTrue(obs.pOccluded.values.all { it == 0.0 }, "pOccluded must be 0 without the class")
        assertTrue(obs.labelConfident(THR).values.all { it }, "labelConfident still works on 13 classes")
        assertEquals("wP", obs.label("e2"))
    }

    /**
     * The occlusion head parks ONE coverage value past the classes, and that is what `pOccluded`
     * reads on a 13-class run — the CNN arm of the hand veto was blind until this column existed
     * (CLAUDE.md pitfall). It is not a class: it may neither win the argmax nor be the runner-up.
     */
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

    @Test
    fun `occupied is a strict greater-than`() {
        assertFalse(single(pOcc = 0.5, pEmpty = 0.5).occupied("e4"), "a tie is NOT occupied")
        assertTrue(single(pOcc = 0.51, pEmpty = 0.49).occupied("e4"))
    }

    @Test
    fun `labelConfident rejects occluded and is all-false without identity`() {
        val occluded =
            OccupancyObservation(
                pOcc = mapOf("e4" to 0.0),
                pEmpty = mapOf("e4" to 0.01),
                pOccluded = mapOf("e4" to 0.99),
                label = mapOf("e4" to "occluded"),
                conf = mapOf("e4" to 0.99),
            )
        assertFalse(occluded.labelConfident("e4", THR))
        val stripped = FakeSquareClassifier(START_FEN).observe().occupancyOnly()
        val flags = stripped.labelConfident(THR)
        assertEquals(ALL_SQUARES.size, flags.size, "all 64 keys are present")
        assertTrue(flags.values.none { it })
    }

    @Test
    fun `argmax ties go to the lowest class index`() {
        val classes = EXPECTED_CLASSES
        val tied = DoubleArray(classes.size)
        tied[classes.indexOf("wN")] = 0.5
        tied[classes.indexOf("wB")] = 0.5
        val obs = observationFromProbs(mapOf("e4" to tied), classes)
        assertEquals("wN", obs.label("e4"))
        assertClose(0.5, obs.conf("e4"), "tie conf")
        assertClose(0.5, obs.runnerUpConf("e4"), "tie runner-up")
    }

    @Test
    fun `a 2-class occupancy run reports occupancy but NO identity`() {
        // specs/18-occupancy-model: the argmax label of a 2-class run is "occupied", which is not
        // an identity — `hasIdentity` must stay false so the engine takes the occupancy-only path.
        assertFalse(classesHaveIdentity(OCCUPANCY_CLASSES))
        assertTrue(classesHaveIdentity(EXPECTED_CLASSES))
        val obs =
            observationFromProbs(
                mapOf("e4" to doubleArrayOf(0.1, 0.9), "d4" to doubleArrayOf(0.95, 0.05)),
                OCCUPANCY_CLASSES,
            )
        assertEquals(null, obs.label)
        assertEquals(null, obs.conf)
        assertEquals(null, obs.runnerUpConf)
        assertEquals(null, obs.label("e4"))
        assertClose(0.9, obs.pOcc.getValue("e4"), "pOcc e4")
        assertClose(0.0, obs.pOccluded.getValue("e4"), "pOccluded e4")
        assertTrue(obs.occupied("e4"))
        assertFalse(obs.occupied("d4"))
        assertTrue(obs.confident("e4", THR))
        assertFalse(obs.labelConfident("e4", THR))
    }

    private fun single(
        pOcc: Double = 0.0,
        pEmpty: Double = 0.0,
        pOccluded: Double = 0.0,
    ) = OccupancyObservation(
        pOcc = mapOf("e4" to pOcc),
        pEmpty = mapOf("e4" to pEmpty),
        pOccluded = mapOf("e4" to pOccluded),
    )

    private companion object {
        const val THR = 0.85
        const val START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    }
}
