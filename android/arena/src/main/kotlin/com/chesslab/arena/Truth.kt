package com.chesslab.arena

import com.chesslab.tracker.games.pgnSans
import com.chesslab.tracker.games.readCandidate
import java.io.File

/** The LONGER source: `candidate.json` has frames but stops early and GUESSES order on bundled commits
 *  (wrong on `VID_20260726_233432`). The PGN decides the sequence; the candidate lends frames where it agrees. */
fun truthOf(dir: File): List<TruthPly> {
    val candidate = candidatePlies(dir)
    val pgn = pgnPlies(dir)
    check(candidate.isNotEmpty() || pgn.isNotEmpty()) {
        "no reference for ${dir.name} — neither candidate.json with moves nor reference.pgn"
    }
    if (pgn.isEmpty()) return candidate
    return pgn.mapIndexed { i, san -> TruthPly(san, candidate.getOrNull(i)?.takeIf { it.san == san }?.frame ?: -1) }
}

/** A frame with SEVERAL plies is a backlog flush, not a measurement: -1 (54 of 1242). */
private fun candidatePlies(dir: File): List<TruthPly> {
    val raw = readCandidate(File(dir, "candidate.json")).moves.map { TruthPly(it.san, it.frame) }
    val perFrame = raw.filter { it.frame >= 0 }.groupingBy { it.frame }.eachCount()
    val bundled = perFrame.filterValues { it > 1 }.keys
    return raw.map { if (it.frame in bundled) it.copy(frame = -1) else it }
}

/** Normalised through chesslib so they compare against a run's. */
private fun pgnPlies(dir: File): List<String> {
    val file = File(dir, "reference.pgn")
    if (!file.isFile) return emptyList()
    return pgnSans(file.readText(), startFenOf(dir))
}

/** A recording that starts mid-game names its position in `candidate.json`; without it every ply is unplayable. */
fun startFenOf(dir: File): String = readCandidate(File(dir, "candidate.json")).startFen
