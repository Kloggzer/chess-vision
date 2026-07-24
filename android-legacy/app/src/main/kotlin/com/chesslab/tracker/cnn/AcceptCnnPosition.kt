package com.chesslab.tracker.cnn

import com.chesslab.engine.Game

/** One would-be edit of the accept-CNN correction, rendered by the preview dialog. */
data class SquareChange(
    val square: String,
    val from: String,
    val to: String,
    val conf: Double,
)

/** Result of the minimal-edit adoption of the CNN view (pure — mutates nothing). */
sealed interface AcceptOutcome {
    val changes: List<SquareChange>

    /** The would-be FEN plus every per-square edit; the caller applies it on confirm. */
    data class Accepted(
        val fen: String,
        override val changes: List<SquareChange>,
    ) : AcceptOutcome

    /** Adoption refused (kings-guard) — the alarm latch must stay. */
    data class Rejected(
        val reason: String,
        override val changes: List<SquareChange>,
    ) : AcceptOutcome
}

/**
 * Manual "adopt what the CNN sees" correction (illegal-move alarm UI) — the pure core of
 * `tracker.py::accept_cnn_position` (ports 779fb86): label-confident squares take the
 * observed piece, unconfident/occluded squares keep the current game-state piece
 * (identity precision is limited — minimal edit, not a blind FEN rebuild). Side to move
 * is preserved; castling rights are pruned to what the new position still supports;
 * en passant is cleared. Kings-guard: without exactly one king per colour the adoption
 * is [AcceptOutcome.Rejected] and the latch stays. This function changes NOTHING — the
 * identical call serves both the preview dialog and the apply path; the caller adopts
 * [AcceptOutcome.Accepted.fen] (reset clears history + latch, then a baseline re-capture).
 */
fun acceptCnnPosition(
    game: Game,
    obs: OccupancyObservation,
    confThr: Double,
): AcceptOutcome {
    val labelOk = obs.labelConfident(confThr)
    val pieces = mutableMapOf<String, Char>()
    for (sq in ALL_SQUARES) game.pieceCharAt(sq)?.let { pieces[sq] = it }
    val changes = mutableListOf<SquareChange>()
    for (sq in ALL_SQUARES) {
        if (labelOk[sq] != true) continue // unsure/occluded -> keep game-state piece
        val lab = obs.label.getValue(sq)
        val oldLab = expectedLabel(game, sq)
        if (lab != oldLab) changes.add(SquareChange(sq, oldLab, lab, obs.conf.getValue(sq)))
        if (lab == OccupancyObservation.EMPTY) pieces.remove(sq) else pieces[sq] = fenCharOf(lab)
    }
    if (pieces.values.count { it == 'K' } != 1 || pieces.values.count { it == 'k' } != 1) {
        return AcceptOutcome.Rejected(
            "CNN position has missing/extra kings — correct via Undo or an explicit reset",
            changes,
        )
    }
    return AcceptOutcome.Accepted(buildFen(pieces, game.fen()), changes)
}

/** "wN" -> 'N', "bN" -> 'n' (model vocabulary uses an uppercase piece letter for both colours). */
private fun fenCharOf(label: String): Char = if (label[0] == 'w') label[1].uppercaseChar() else label[1].lowercaseChar()

/** Serialize [pieces] keeping side-to-move/fullmove of [fen0]; castling pruned, ep cleared. */
private fun buildFen(
    pieces: Map<String, Char>,
    fen0: String,
): String {
    val placement =
        (8 downTo 1).joinToString("/") { rank ->
            val sb = StringBuilder()
            var run = 0
            for (f in 'a'..'h') {
                val c = pieces["$f$rank"]
                if (c == null) {
                    run++
                } else {
                    if (run > 0) {
                        sb.append(run)
                        run = 0
                    }
                    sb.append(c)
                }
            }
            if (run > 0) sb.append(run)
            sb.toString()
        }
    val parts = fen0.split(" ")
    val side = parts.getOrElse(1) { "w" }
    val fullmove = parts.getOrElse(FEN_FULLMOVE_IDX) { "1" }
    return "$placement $side ${prunedCastling(parts.getOrElse(2) { "-" }, pieces)} - 0 $fullmove"
}

/** Keep only the castling rights the edited position still supports (`clean_castling_rights`). */
private fun prunedCastling(
    rights: String,
    pieces: Map<String, Char>,
): String {
    if (rights == "-") return "-"
    val keep =
        rights.filter { r ->
            when (r) {
                'K' -> pieces["e1"] == 'K' && pieces["h1"] == 'R'
                'Q' -> pieces["e1"] == 'K' && pieces["a1"] == 'R'
                'k' -> pieces["e8"] == 'k' && pieces["h8"] == 'r'
                'q' -> pieces["e8"] == 'k' && pieces["a8"] == 'r'
                else -> false
            }
        }
    return keep.ifEmpty { "-" }
}

private const val FEN_FULLMOVE_IDX = 5
