package com.chesslab.engine

import com.chesslab.engine.api.TrackerConfig

/** Das Brett jeder synthetischen Engine-Probe: 400 px, ein Feld also 50 px. */
const val TEST_BOARD_SIZE: Int = 400

/**
 * Das Rig der Engine-Unit-Tests. Zwei erzwungene Abweichungen vom Geraet: die synthetischen Warps
 * sind schon in Zielgroesse, und sie tragen keine Brettlinien. Sonst faehrt es, was ausgeliefert wird.
 */
val RIG_CONFIG: TrackerConfig =
    TrackerConfig(boardSize = TEST_BOARD_SIZE, detectScale = 1.0, minGridLineCoverage = 0.0)

/**
 * Dasselbe Rig mit stehender Uhr: diese Fixtures reichen Snapshots ohne Zeitfortschritt herein,
 * also darf die DAUER-Sperre des Latchs nicht mitzaehlen. `AlarmDurationTest` setzt sie selbst.
 */
val STOPPED_CLOCK_RIG: TrackerConfig = RIG_CONFIG.copy(alarmMinS = 0.0)
