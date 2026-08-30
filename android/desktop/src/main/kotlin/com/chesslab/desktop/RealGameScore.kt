package com.chesslab.desktop

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.MoveList
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File

// One run against one label: found / missed / invented, each with frame indices.
//
// Deliberately NEVER folded into a single accuracy. The project rule (2026-07-30) is that
// phantoms disqualify while misses are negotiable, so a number that averages the two directions
// hides exactly the distinction every decision downstream is made on. specs/52 phase 04:
// measurement only, forbidden from fixing what it finds.

/** One ply as the comparison sees it — a SAN, the frame it landed on, who decided it. */
internal class ScoredPly(
    val san: String,
    val frame: Int,
    val decider: String,
)

internal class MoveScore(
    /** Label ply matched to the run ply that found it, in game order. */
    val found: List<Pair<ScoredPly, ScoredPly>>,
    /** Label plies the run never committed. */
    val missed: List<ScoredPly>,
    /** Run commits that are not in the label — the phantoms. */
    val invented: List<ScoredPly>,
)

/**
 * Longest common subsequence over the SAN sequences — order-preserving, so a move the run commits
 * out of order counts as invented rather than silently matching a later identical SAN backwards.
 */
internal fun scoreMoves(
    label: List<ScoredPly>,
    run: List<ScoredPly>,
): MoveScore {
    val lcs = Array(label.size + 1) { IntArray(run.size + 1) }
    for (i in label.indices.reversed()) {
        for (j in run.indices.reversed()) {
            lcs[i][j] =
                if (label[i].san == run[j].san) {
                    1 + lcs[i + 1][j + 1]
                } else {
                    maxOf(lcs[i + 1][j], lcs[i][j + 1])
                }
        }
    }
    val found = mutableListOf<Pair<ScoredPly, ScoredPly>>()
    val missed = mutableListOf<ScoredPly>()
    val invented = mutableListOf<ScoredPly>()
    var i = 0
    var j = 0
    while (i < label.size && j < run.size) {
        when {
            label[i].san == run[j].san -> {
                found += label[i] to run[j]
                i += 1
                j += 1
            }
            lcs[i + 1][j] >= lcs[i][j + 1] -> missed += label[i++]
            else -> invented += run[j++]
        }
    }
    while (i < label.size) missed += label[i++]
    while (j < run.size) invented += run[j++]
    return MoveScore(found, missed, invented)
}

/**
 * The label's plies: the `reference.pgn` where one exists, with the candidate's frames alongside.
 *
 * The PGN is the checked source and the candidate is a tracker artefact — and the two can disagree
 * about ORDER. A run that commits a backlog puts several plies on one frame and guesses their
 * sequence; 51 of 606 label plies across the corpus sit in such a bundle, and on
 * `VID_20260726_233432` the guess is demonstrably wrong (the pictures show e4 at frame 240, the
 * label calls it ply 3). Scoring against the guess makes a tracker that reads the video correctly
 * look worse than the one that wrote the label.
 */
internal fun labelPlies(candidate: File): List<ScoredPly> {
    val fromCandidate = candidatePlies(candidate)
    val pgn = File(candidate.parentFile, "reference.pgn")
    if (!pgn.isFile) return fromCandidate
    val sans = runCatching { pgnSans(pgn.readText()) }.getOrDefault(emptyList())
    if (sans.isEmpty()) return fromCandidate
    return sans.mapIndexed { i, san ->
        val same = fromCandidate.getOrNull(i)?.takeIf { it.san == san }
        ScoredPly(san, same?.frame ?: -1, same?.decider ?: "reference")
    }
}

private fun candidatePlies(candidate: File): List<ScoredPly> {
    val root = Json.parseToJsonElement(candidate.readText()).jsonObject
    return root.getValue("moves").jsonArray.map { row ->
        val move = row.jsonObject
        ScoredPly(
            san = move.getValue("san").jsonPrimitive.content,
            frame = move.getValue("frame").jsonPrimitive.int,
            decider = move.getValue("decider").jsonPrimitive.content,
        )
    }
}

/** The mainline SANs, normalised through chesslib so they compare against a run's. */
private fun pgnSans(text: String): List<String> {
    val body =
        text
            .lineSequence()
            .filterNot { it.startsWith("[") }
            .joinToString(" ")
            .replace(PGN_COMMENT, " ")
            .replace(PGN_NUMBER, " ")
            .replace(PGN_RESULT, " ")
    val board = Board()
    val out = mutableListOf<String>()
    for (token in body.split(PGN_SPACE).filter { it.isNotBlank() }) {
        val list = MoveList(board.fen)
        list.loadFromSan(token)
        out += list.toSanArray().first()
        board.doMove(list.first())
    }
    return out
}

private val PGN_COMMENT = Regex("""\{[^}]*\}""")
private val PGN_NUMBER = Regex("""\d+\.(\.\.)?""")
private val PGN_RESULT = Regex("""(1-0|0-1|1/2-1/2|\*)""")
private val PGN_SPACE = Regex("""\s+""")

/**
 * Three numbers, three lists, no average — und das MODELL, mit dem sie entstanden sind.
 *
 * Ohne den Namen ist die Zahl nicht zuzuordnen, und das Label ist ein historischer App-Stand
 * statt einer Wahrheit ueber das Brett: `docs/engine-changeset.md`, "Was der Score misst".
 */
internal fun printScore(
    candidate: File,
    label: List<ScoredPly>,
    run: List<ScoredPly>,
    model: String,
) {
    val score = scoreMoves(label, run)
    println("score vs ${candidate.path} — model $model, label ${label.size} plies, run ${run.size} plies")
    println("  found ${score.found.size}:")
    for ((ply, committed) in score.found) {
        println("    %-8s label frame %6d   run frame %6d  (%s)".format(ply.san, ply.frame, committed.frame, committed.decider))
    }
    println("  missed ${score.missed.size}:")
    for (ply in score.missed) println("    %-8s label frame %6d".format(ply.san, ply.frame))
    println("  invented ${score.invented.size} (phantoms — the veto):")
    for (ply in score.invented) println("    %-8s run frame %6d  (%s)".format(ply.san, ply.frame, ply.decider))
}
