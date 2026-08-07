package com.chesslab.desktop

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

/** The label's plies out of a `candidate.json`. */
internal fun labelPlies(candidate: File): List<ScoredPly> {
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

/** Three numbers, three lists, no average. */
internal fun printScore(
    candidate: File,
    label: List<ScoredPly>,
    run: List<ScoredPly>,
) {
    val score = scoreMoves(label, run)
    println("score vs ${candidate.path} — label ${label.size} plies, run ${run.size} plies")
    println("  found ${score.found.size}:")
    for ((ply, committed) in score.found) {
        println("    %-8s label frame %6d   run frame %6d  (%s)".format(ply.san, ply.frame, committed.frame, committed.decider))
    }
    println("  missed ${score.missed.size}:")
    for (ply in score.missed) println("    %-8s label frame %6d".format(ply.san, ply.frame))
    println("  invented ${score.invented.size} (phantoms — the veto):")
    for (ply in score.invented) println("    %-8s run frame %6d  (%s)".format(ply.san, ply.frame, ply.decider))
}
