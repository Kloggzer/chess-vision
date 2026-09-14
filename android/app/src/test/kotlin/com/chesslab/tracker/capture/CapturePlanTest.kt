package com.chesslab.tracker.capture

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class CapturePlanTest {
    @Test
    fun aKeyThePlannerAddsLaterIsReadPastRatherThanThrown() {
        val answer = planAnswer(HTTP_OK, PLAN_WITH_EXTRA_KEYS)
        val plan = (answer as PlanAnswer.Loaded).plan
        assertEquals("2026-09-12T10:00:00Z", plan.generatedAt)
        assertEquals(listOf("wq-light-sehr-hell"), plan.shots.map { it.id })
        val shot = plan.shots.first()
        assertEquals(listOf("g4"), shot.place.map { it.square })
        assertEquals(174, shot.closes.first().corpusInBand)
    }

    @Test
    fun anUnpairedPhoneSeesThePairingSentenceAndNotAnEmptyList() {
        val answer = planAnswer(HTTP_UNAUTHORIZED, """{"error":"unpaired"}""")
        val message = (answer as PlanAnswer.Refused).message
        assertTrue(message.contains("pair", ignoreCase = true), message)
    }

    @Test
    fun aRouteThatNeverRanThePlannerSaysTheCommand() {
        val answer = planAnswer(HTTP_OK, """{"shots":[],"why":"uv run chesslab capture plan"}""")
        assertEquals("uv run chesslab capture plan", (answer as PlanAnswer.Loaded).plan.why)
    }

    @Test
    fun eightTurnsPutPlyThreeAtOneHundredAndThirtyFiveDegrees() {
        val shot = (planAnswer(HTTP_OK, PLAN_WITH_EXTRA_KEYS) as PlanAnswer.Loaded).plan.shots.first()
        assertEquals(0, shot.orientationDeg(0))
        assertEquals(135, shot.orientationDeg(3))
        assertEquals(315, shot.orientationDeg(7))
    }
}

private val PLAN_WITH_EXTRA_KEYS =
    """
    {"generated_at":"2026-09-12T10:00:00Z","dataset":"real13-mix-v7-128",
     "gaps_from":"data/reports/coverage-gaps.json","planner_version":3,
     "shots":[{"id":"wq-light-sehr-hell","reason":"nur 12 Belege",
               "place":[{"square":"g4","piece":"wQ","band":"sehr hell","lo":180,"hi":256}],
               "height":"normal","orientations":8,"note_for_a_later_phase":"ignored",
               "closes":[{"piece":"wQ","square_color":"light","band":"sehr hell","have":12,
                          "fix":"Licht","corpus_in_band":174}]}]}
    """.trimIndent()
