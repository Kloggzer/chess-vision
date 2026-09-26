package com.chesslab.desktop

import com.chesslab.tracker.games.fensAfterSans
import com.chesslab.tracker.games.pgnSans
import com.chesslab.tracker.games.readCandidate
import com.github.bhlangonijr.chesslib.Board
import java.io.File

// found / missed / invented / beyond, NEVER folded into one accuracy: phantoms disqualify while misses are
// negotiable. Measurement only, forbidden from fixing what it finds.

internal class ScoredPly(
    val san: String,
    val frame: Int,
    val decider: String,
)

internal class ReorderedStretch(
    val label: List<ScoredPly>,
    val run: List<ScoredPly>,
)

internal class MoveScore(
    val found: List<Pair<ScoredPly, ScoredPly>>,
    val missed: List<ScoredPly>,
    /** The phantoms. */
    val invented: List<ScoredPly>,
    /** Unjudged, because the label stops before them. */
    val beyond: List<ScoredPly>,
    val reordered: List<ReorderedStretch>,
) {
    val reorderedPlies: Int get() = reordered.sumOf { it.label.size }
}

/** A still frame cannot prove an ORDER: sides meeting on the same board within [REORDER_LOOKAHEAD] plies count
 *  as found, reordered. Otherwise LCS. Only past the last found ply AND the last label frame is a commit beyond. */
internal fun scoreMoves(
    label: List<ScoredPly>,
    run: List<ScoredPly>,
    startFen: String = Board().fen,
): MoveScore {
    val found = mutableListOf<Pair<ScoredPly, ScoredPly>>()
    val reordered = mutableListOf<ReorderedStretch>()
    var fen: String? = startFen
    var i = 0
    var j = 0
    while (i < label.size && j < run.size) {
        val here = fen
        val same = label[i].san == run[j].san
        val len =
            if (same) 1 else here?.let { reorderedLength(it, label.subList(i, label.size), run.subList(j, run.size)) }
        if (len == null) break
        val labelStretch = label.subList(i, i + len)
        val runStretch = run.subList(j, j + len)
        for (k in 0 until len) found += labelStretch[k] to runStretch[k]
        if (!same) reordered += ReorderedStretch(labelStretch, runStretch)
        fen = here?.let { fensAfterSans(it, labelStretch.map { ply -> ply.san }).lastOrNull() }
        i += len
        j += len
    }
    return lcsRest(label, run, i, j, found, reordered)
}

private fun lcsRest(
    label: List<ScoredPly>,
    run: List<ScoredPly>,
    fromLabel: Int,
    fromRun: Int,
    found: MutableList<Pair<ScoredPly, ScoredPly>>,
    reordered: List<ReorderedStretch>,
): MoveScore {
    val lcs = Array(label.size + 1) { IntArray(run.size + 1) }
    for (i in (fromLabel until label.size).reversed()) {
        for (j in (fromRun until run.size).reversed()) {
            lcs[i][j] =
                if (label[i].san == run[j].san) {
                    1 + lcs[i + 1][j + 1]
                } else {
                    maxOf(lcs[i + 1][j], lcs[i][j + 1])
                }
        }
    }
    val missed = mutableListOf<ScoredPly>()
    val unmatched = mutableListOf<IndexedValue<ScoredPly>>()
    var lastFound = fromRun - 1
    var i = fromLabel
    var j = fromRun
    while (i < label.size && j < run.size) {
        when {
            label[i].san == run[j].san -> {
                found += label[i] to run[j]
                lastFound = j
                i += 1
                j += 1
            }
            lcs[i + 1][j] >= lcs[i][j + 1] -> missed += label[i++]
            else -> unmatched += IndexedValue(j, run[j++])
        }
    }
    while (i < label.size) missed += label[i++]
    while (j < run.size) unmatched += IndexedValue(j, run[j++])
    // Nur ein Lauf, der das Label bis zum Ende ging, hat einen Nachlauf: sonst schob ein Label ohne Frames
    // (`frame = -1`) jedes Phantom nach `beyond`. Dieselbe Regel wie im Arena-Zwilling.
    val referenceEnd = label.maxOfOrNull { it.frame } ?: -1
    val (beyond, invented) =
        if (missed.isEmpty()) {
            unmatched.partition { it.index > lastFound && it.value.frame > referenceEnd }
        } else {
            emptyList<IndexedValue<ScoredPly>>() to unmatched
        }
    return MoveScore(found, missed, invented.map { it.value }, beyond.map { it.value }, reordered)
}

/** Equal counts only: the same board after a DIFFERENT number of half-moves is a disagreement about what
 *  happened. */
private fun reorderedLength(
    fen: String,
    label: List<ScoredPly>,
    run: List<ScoredPly>,
): Int? {
    val a = fensAfterSans(fen, label.take(REORDER_LOOKAHEAD).map { it.san })
    val b = fensAfterSans(fen, run.take(REORDER_LOOKAHEAD).map { it.san })
    return (1..minOf(a.size, b.size)).firstOrNull { position(a[it - 1]) == position(b[it - 1]) }
}

/** Castling and clocks are not what the camera sees. */
private fun position(fen: String): String = fen.split(' ').take(2).joinToString(" ")

// 12, not 6: on 2026-08-08-11-59-12 the boards met again only ten plies later.
private const val REORDER_LOOKAHEAD = 12

/** The `reference.pgn` where one exists: the candidate guesses the order of a bundle committed on one frame,
 *  wrong on `VID_20260726_233432`. */
internal fun labelPlies(candidate: File): List<ScoredPly> {
    val fromCandidate = candidatePlies(candidate)
    val start = startFenOf(candidate)
    val pgn = File(candidate.parentFile, "reference.pgn")
    if (!pgn.isFile) return fromCandidate
    // Eine vorhandene, aber unlesbare Referenz ist NICHT "keine Referenz": sonst found = alles.
    val sans = runCatching { pgnSans(pgn.readText(), start) }.getOrDefault(emptyList())
    check(sans.isNotEmpty()) { "$pgn liegt da, ergibt aber keinen Zug — Referenz reparieren oder entfernen" }
    return sans.mapIndexed { i, san ->
        val same = fromCandidate.getOrNull(i)?.takeIf { it.san == san }
        ScoredPly(san, same?.frame ?: -1, same?.decider ?: "reference")
    }
}

/** Ohne sie faellt `fensAfterSans` schon auf dem ersten SAN aus, und ein vertauschter Abtausch zaehlt als Phantom. */
internal fun startFenOf(candidate: File): String = readCandidate(candidate).startFen

private fun candidatePlies(candidate: File): List<ScoredPly> =
    readCandidate(candidate).moves.map { ScoredPly(it.san, it.frame, it.decider ?: "candidate") }

/** Three numbers, three lists, no average — und das MODELL: ohne den Namen ist die Zahl nicht zuzuordnen. */
internal fun printScore(
    candidate: File,
    label: List<ScoredPly>,
    run: List<ScoredPly>,
    model: String,
) {
    val score = scoreMoves(label, run, startFenOf(candidate))
    println("score vs ${candidate.path} — model $model, label ${label.size} plies, run ${run.size} plies")
    println("  found ${score.found.size}:")
    for ((ply, committed) in score.found) {
        println("    %-8s label frame %6d   run frame %6d  (%s)".format(ply.san, ply.frame, committed.frame, committed.decider))
    }
    println("  reordered ${score.reorderedPlies} (same end position, order unprovable):")
    for (stretch in score.reordered) {
        println("    label %-32s run %s".format(stretch.label.joinToString(" ") { it.san }, stretch.run.joinToString(" ") { it.san }))
    }
    println("  missed ${score.missed.size}:")
    for (ply in score.missed) println("    %-8s label frame %6d".format(ply.san, ply.frame))
    println("  invented ${score.invented.size} (phantoms — the veto):")
    for (ply in score.invented) println("    %-8s run frame %6d  (%s)".format(ply.san, ply.frame, ply.decider))
    println("  beyond ${score.beyond.size} (after the reference end):")
    for (ply in score.beyond) println("    %-8s run frame %6d  (%s)".format(ply.san, ply.frame, ply.decider))
}
