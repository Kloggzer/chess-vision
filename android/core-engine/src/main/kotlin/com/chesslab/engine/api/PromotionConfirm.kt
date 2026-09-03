package com.chesslab.engine.api

import com.chesslab.engine.EngineState

internal val PROMO_PIECES = setOf('q', 'r', 'b', 'n')

private const val PROMO_CNN_CONFIDENCE = 0.90

private const val PROMO_CNN_MARGIN = 0.20

private const val PROMO_CNN_VOTES = 2

private const val PROMO_CNN_MAX_OCCLUDED = 0.10

/** Two distinct decisive identity reads provide the same Q/R/B/N choice as the user. */
internal fun confirmPromotionFromCnn(
    state: EngineState,
    snap: CnnSnapshot,
    choosePromotion: (Char) -> List<TrackerEvent>,
): List<TrackerEvent> {
    val pending = requireNotNull(state.promoPending)
    if (snap.fen != pending.fen || snap.seq <= pending.lastCnnSeq) return emptyList()
    pending.lastCnnSeq = snap.seq
    val obs = snap.obs
    val label = obs.label(pending.to)
    val expectedColour = if (pending.fen.split(' ').getOrNull(1) == "b") 'b' else 'w'
    val piece =
        label
            ?.takeIf { it.length == 2 && it[0] == expectedColour }
            ?.get(1)
            ?.lowercaseChar()
            ?.takeIf { it in PROMO_PIECES }
            ?.takeIf { obs.labelConfident(pending.to, PROMO_CNN_CONFIDENCE) }
            ?.takeIf { obs.conf(pending.to) - obs.runnerUpConf(pending.to) >= PROMO_CNN_MARGIN }
            ?.takeIf { obs.pOccluded(pending.to) <= PROMO_CNN_MAX_OCCLUDED }
    if (piece == null) {
        pending.cnnPiece = null
        pending.cnnVotes = 0
        return emptyList()
    }
    if (pending.cnnPiece == piece) {
        pending.cnnVotes += 1
    } else {
        pending.cnnPiece = piece
        pending.cnnVotes = 1
    }
    return if (pending.cnnVotes >= PROMO_CNN_VOTES) choosePromotion(piece) else emptyList()
}
