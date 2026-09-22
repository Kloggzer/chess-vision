package com.chesslab.desktop

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.MoveList
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File

// One run against one label: found / missed / invented / beyond, each with frame indices.
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

/** One stretch both sides walked differently and ended on the same board. */
internal class ReorderedStretch(
    val label: List<ScoredPly>,
    val run: List<ScoredPly>,
)

internal class MoveScore(
    /** Label ply matched to the run ply that found it, in game order. */
    val found: List<Pair<ScoredPly, ScoredPly>>,
    /** Label plies the run never committed. */
    val missed: List<ScoredPly>,
    /** Run commits inside the reference that are not in it — the phantoms. */
    val invented: List<ScoredPly>,
    /** Run commits past the reference's end — unjudged, because the label stops before them. */
    val beyond: List<ScoredPly>,
    /** Found stretches whose ORDER the two sides disagree on — see [scoreMoves]. */
    val reordered: List<ReorderedStretch>,
) {
    val reorderedPlies: Int get() = reordered.sumOf { it.label.size }
}

/**
 * A still frame cannot prove an ORDER: where the two sides disagree but meet on the same board again
 * within [REORDER_LOOKAHEAD] plies, the stretch counts as found and is reported as reordered. Where
 * they never meet, the rest falls to a longest common subsequence and a run off the line keeps its
 * phantoms. Only past the last found ply AND the last label frame is a commit beyond, not invented.
 */
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
        fen = here?.let { fensAfter(it, labelStretch.map { ply -> ply.san }).lastOrNull() }
        i += len
        j += len
    }
    return lcsRest(label, run, i, j, found, reordered)
}

/** Longest common subsequence over what the parallel walk could not align. */
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
    // Nur ein Lauf, der das Label bis zum Ende gegangen ist, hat einen Nachlauf. Wer Plies
    // uebersprungen hat und dann weiterlief, hat Phantome — und die bleiben Phantome. Ohne das
    // Gate reichte ein Label ohne Frames (`frame = -1`, der Normalfall bei Ply-Versatz), um
    // jedes Phantom nach `beyond` zu schieben. Dieselbe Regel wie im Arena-Zwilling.
    val referenceEnd = label.maxOfOrNull { it.frame } ?: -1
    val (beyond, invented) =
        if (missed.isEmpty()) {
            unmatched.partition { it.index > lastFound && it.value.frame > referenceEnd }
        } else {
            emptyList<IndexedValue<ScoredPly>>() to unmatched
        }
    return MoveScore(found, missed, invented.map { it.value }, beyond.map { it.value }, reordered)
}

/**
 * Plies until the two lines stand on the same board again, null when they do not.
 *
 * Equal counts only: with the same side to move, a board reached in a DIFFERENT number of
 * half-moves is a disagreement about what happened, not about an order the frames cannot show.
 */
private fun reorderedLength(
    fen: String,
    label: List<ScoredPly>,
    run: List<ScoredPly>,
): Int? {
    val a = fensAfter(fen, label.take(REORDER_LOOKAHEAD).map { it.san })
    val b = fensAfter(fen, run.take(REORDER_LOOKAHEAD).map { it.san })
    return (1..minOf(a.size, b.size)).firstOrNull { position(a[it - 1]) == position(b[it - 1]) }
}

private fun fensAfter(
    fen: String,
    sans: List<String>,
): List<String> {
    val board = Board()
    board.loadFromFen(fen)
    val out = mutableListOf<String>()
    for (san in sans) {
        val list = MoveList(board.fen)
        if (!runCatching { list.loadFromSan(san) }.isSuccess || list.isEmpty()) break
        board.doMove(list.first())
        out += board.fen
    }
    return out
}

/** Placement plus side to move — castling and clocks are not what the camera sees. */
private fun position(fen: String): String = fen.split(' ').take(2).joinToString(" ")

// 12, not 6: on 2026-08-08-11-59-12 the tracker took the b8 exchange 27 s before the label's
// bundle and the boards met again only ten plies later, at Raxd4.
private const val REORDER_LOOKAHEAD = 12

/**
 * The label's plies: the `reference.pgn` where one exists, with the candidate's frames alongside.
 * The PGN is the checked source; the candidate is a tracker artefact that guesses the order of a
 * bundle it committed on one frame — demonstrably wrong on `VID_20260726_233432` (e4 sits at frame
 * 240, the label calls it ply 3). Scoring against the guess punishes the tracker that read it right.
 */
internal fun labelPlies(candidate: File): List<ScoredPly> {
    val fromCandidate = candidatePlies(candidate)
    val start = startFenOf(candidate)
    val pgn = File(candidate.parentFile, "reference.pgn")
    if (!pgn.isFile) return fromCandidate
    // Eine vorhandene, aber unlesbare Referenz ist NICHT "keine Referenz": der Rueckfall benotet
    // den Tracker gegen seine eigene Ausgabe und meldet dann found = alles.
    val sans = runCatching { pgnSans(pgn.readText(), start) }.getOrDefault(emptyList())
    check(sans.isNotEmpty()) { "$pgn liegt da, ergibt aber keinen Zug — Referenz reparieren oder entfernen" }
    return sans.mapIndexed { i, san ->
        val same = fromCandidate.getOrNull(i)?.takeIf { it.san == san }
        ScoredPly(san, same?.frame ?: -1, same?.decider ?: "reference")
    }
}

/** Wo die Aufnahme ANFAENGT (`rxr-c8-20260919`: Zug 26). Ohne sie faellt `fensAfter` schon auf
 *  dem ersten SAN aus und mit ihm die Reorder-Erkennung — ein vertauschter Abtausch zaehlt dann
 *  als `missed` PLUS `invented`, also als Phantom. */
internal fun startFenOf(candidate: File): String =
    Json
        .parseToJsonElement(candidate.readText())
        .jsonObject["start_fen"]
        ?.jsonPrimitive
        ?.content ?: Board().fen

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
private fun pgnSans(
    text: String,
    startFen: String,
): List<String> {
    val body =
        text
            .lineSequence()
            .filterNot { it.startsWith("[") }
            .joinToString(" ")
            .replace(PGN_COMMENT, " ")
            .replace(PGN_NUMBER, " ")
            .replace(PGN_RESULT, " ")
    val board = Board().apply { loadFromFen(startFen) }
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
 * statt einer Wahrheit ueber das Brett.
 */
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
