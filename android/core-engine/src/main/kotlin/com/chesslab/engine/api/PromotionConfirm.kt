package com.chesslab.engine.api

import com.chesslab.engine.EngineState
import com.chesslab.engine.PromoPending

internal val PROMO_PIECES = setOf('q', 'r', 'b', 'n')

private const val PROMO_CNN_CONFIDENCE = 0.90

private const val PROMO_CNN_MARGIN = 0.20

private const val PROMO_CNN_VOTES = 2

private const val PROMO_CNN_MAX_OCCLUDED = 0.10

/**
 * Two distinct decisive identity reads provide the same Q/R/B/N choice as the user — and two reads
 * of a confidently EMPTY target withdraw the question: a prompt raised on residue blocks detection
 * with nobody to answer it (2026-08-08-00-39-57 @6436, 22 plies lost in the replay).
 */
internal fun confirmPromotionFromCnn(
    state: EngineState,
    snap: CnnSnapshot,
    choosePromotion: (Char) -> List<TrackerEvent>,
): List<TrackerEvent> {
    val pending = requireNotNull(state.promoPending)
    if (snap.fen != pending.fen || snap.seq <= pending.lastCnnSeq) return emptyList()
    pending.lastCnnSeq = snap.seq
    val obs = snap.obs
    if (obs.confident(pending.to, state.config.cnnConfThr) && !obs.occupied(pending.to)) return state.withdrawVote(pending)
    pending.emptyVotes = 0
    val piece = decisivePiece(obs, pending)
    if (pending.cnnPiece == piece && piece != null) {
        pending.cnnVotes += 1
    } else {
        pending.cnnPiece = piece
        pending.cnnVotes = if (piece == null) 0 else 1
    }
    return if (piece != null && pending.cnnVotes >= PROMO_CNN_VOTES) choosePromotion(piece) else emptyList()
}

/** The Q/R/B/N the glance names decisively for the side that promoted, or null. */
private fun decisivePiece(
    obs: CnnObservation,
    pending: PromoPending,
): Char? {
    val expectedColour = if (pending.fen.split(' ').getOrNull(1) == "b") 'b' else 'w'
    return obs
        .label(pending.to)
        ?.takeIf { it.length == 2 && it[0] == expectedColour }
        ?.get(1)
        ?.lowercaseChar()
        ?.takeIf { it in PROMO_PIECES }
        ?.takeIf { obs.labelConfident(pending.to, PROMO_CNN_CONFIDENCE) }
        ?.takeIf { obs.conf(pending.to) - obs.runnerUpConf(pending.to) >= PROMO_CNN_MARGIN }
        ?.takeIf { obs.pOccluded(pending.to) <= PROMO_CNN_MAX_OCCLUDED }
}

private fun EngineState.withdrawVote(pending: PromoPending): List<TrackerEvent> {
    pending.emptyVotes += 1
    // Gegenbeweis, nicht Pause: sonst zaehlen `wQ` — leer — `wQ` als zwei Stimmen fuer eine Dame.
    pending.cnnPiece = null
    pending.cnnVotes = 0
    if (pending.emptyVotes < PROMO_CNN_VOTES) return emptyList()
    promoPending = null
    note = "promotion prompt withdrawn (CNN: ${pending.to} empty)"
    return listOf(TrackerEvent.Note(note.orEmpty()))
}
