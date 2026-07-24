package com.chesslab.tracker.cnn

import com.chesslab.engine.Game

/**
 * Observation fixtures: occupancy derived from a position, with optional
 * occluded (unreadable) squares and forced occupancy overrides.
 */
object ObservationFixtures {
    const val CONF_HI = 0.99
    const val CONF_LO = 0.4

    fun obsOf(
        game: Game,
        occluded: Set<String> = emptySet(),
        overrides: Map<String, Boolean> = emptyMap(),
        labelOverrides: Map<String, String> = emptyMap(),
    ): OccupancyObservation {
        val pOcc = mutableMapOf<String, Double>()
        val pEmpty = mutableMapOf<String, Double>()
        val pOccluded = mutableMapOf<String, Double>()
        val label = mutableMapOf<String, String>()
        val conf = mutableMapOf<String, Double>()
        for (sq in ALL_SQUARES) {
            val occ = overrides[sq] ?: (game.pieceCharAt(sq) != null)
            if (sq in occluded) {
                pOcc[sq] = (1 - CONF_HI) / 2
                pEmpty[sq] = (1 - CONF_HI) / 2
                pOccluded[sq] = CONF_HI
                label[sq] = OccupancyObservation.OCCLUDED
                conf[sq] = CONF_LO
            } else {
                pOcc[sq] = if (occ) CONF_HI else 1 - CONF_HI
                pEmpty[sq] = if (occ) 1 - CONF_HI else CONF_HI
                pOccluded[sq] = 0.0
                label[sq] = labelOverrides[sq]
                    ?: if (occ) (expectedLabel(game, sq).takeIf { it != "empty" } ?: "wP") else "empty"
                conf[sq] = CONF_HI
            }
        }
        return OccupancyObservation(pOcc, pEmpty, pOccluded, label, conf)
    }
}
