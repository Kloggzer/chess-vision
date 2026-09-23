package com.chesslab.engine

import com.chesslab.engine.api.TrackerConfig

const val TEST_BOARD_SIZE: Int = 400

/** Zwei erzwungene Abweichungen vom Geraet: die Warps sind schon in Zielgroesse und tragen keine Brettlinien. */
val RIG_CONFIG: TrackerConfig =
    TrackerConfig(boardSize = TEST_BOARD_SIZE, detectScale = 1.0, minGridLineCoverage = 0.0)

/** Diese Fixtures reichen Snapshots ohne Zeitfortschritt herein; `AlarmDurationTest` setzt die Dauer-Sperre selbst. */
val STOPPED_CLOCK_RIG: TrackerConfig = RIG_CONFIG.copy(alarmMinS = 0.0)
