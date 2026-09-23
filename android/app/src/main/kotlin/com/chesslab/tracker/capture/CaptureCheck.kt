package com.chesslab.tracker.capture

import com.chesslab.engine.api.DebugCnnRead

// Hilft dem Menschen, ersetzt ihn nicht: kein Veto, denn aufgenommen wird GENAU dort, wo dem Modell die
// Belege fehlen (16 der 46 Luecken haben null) — ein Widerspruch kann der Aufbau sein oder die Luecke.

/** Was das Modell auf einem Zielfeld sieht. `OFF` heisst kein Read, nicht „leer". */
enum class Check { AGREES, OTHER_PIECE, EMPTY, UNSURE, OFF }

/** [EMPTY] lohnt sich: bei 19 Figuren ist eine vergessene oder danebengestellte der haeufigste Fehler. */
fun checkPlacement(
    targets: List<Target>,
    reads: List<DebugCnnRead>,
): Map<String, Check> {
    val bySquare = reads.associateBy { it.square }
    return targets.associate { target ->
        val read = bySquare[target.square]
        target.square to
            when {
                read == null -> Check.OFF
                !read.occupied -> Check.EMPTY
                !read.confident -> Check.UNSURE
                read.label == target.piece -> Check.AGREES
                else -> Check.OTHER_PIECE
            }
    }
}

/** Der teuerste Aufbaufehler: die FEN fuehrt sie als `empty`, jedes Label des Laufs ist dort falsch. */
fun strayPieces(
    targets: List<Target>,
    reads: List<DebugCnnRead>,
): List<String> {
    val wanted = targets.map { it.square }.toSet()
    return reads.filter { it.square !in wanted && it.occupied && it.confident }.map { it.square }
}

/** Das Schachzeichen, kein Kuerzel: ein Kuerzel in der Feldecke las sich wie ein Befund des Modells. */
fun pieceSymbol(piece: String): String = SYMBOLS[piece] ?: piece

/** Ohne Modell zaehlt sie die Aufgabe: "null von vier gestellt" waere gelogen, solange niemand hinsieht. */
fun progressLine(checks: Map<String, Check>): String {
    if (checks.isEmpty()) return ""
    if (checks.values.all { it == Check.OFF }) return "${checks.size} Figuren aufstellen"
    val standing = checks.count { it.value != Check.EMPTY && it.value != Check.OFF }
    return "$standing von ${checks.size} stehen"
}

/** Ohne Kamerabild ist diese Zeile das Einzige, was sagt, was aufzubauen ist — nie Felder weglassen. */
fun orderLine(targets: List<Target>): String =
    if (targets.isEmpty()) {
        "nichts aufzubauen — leeres Brett"
    } else {
        targets.joinToString(" · ") { "${it.piece} ${it.square}" }
    }

fun checkSummary(
    checks: Map<String, Check>,
    stray: List<String>,
): String {
    // Ein Auftrag ohne Zielfelder labelt jeden Frame als leeres Brett — dort ist eine
    // stehengelassene Figur der teuerste Fehler, also wird `stray` zuerst beantwortet.
    if (checks.isEmpty()) return if (stray.isEmpty()) "" else "steht im Weg: ${stray.joinToString(", ")}"
    if (checks.values.all { it == Check.OFF }) return "CNN: kein Modell angehaengt"
    val agrees = checks.count { it.value == Check.AGREES }
    val empty = checks.filterValues { it == Check.EMPTY }.keys
    val parts = mutableListOf("CNN bestaetigt $agrees von ${checks.size}")
    if (empty.isNotEmpty()) parts += "leer: ${empty.joinToString(", ")}"
    if (stray.isNotEmpty()) parts += "steht im Weg: ${stray.joinToString(", ")}"
    return parts.joinToString(" · ")
}

private val SYMBOLS =
    mapOf(
        "wK" to "♔",
        "wQ" to "♕",
        "wR" to "♖",
        "wB" to "♗",
        "wN" to "♘",
        "wP" to "♙",
        "bK" to "♚",
        "bQ" to "♛",
        "bR" to "♜",
        "bB" to "♝",
        "bN" to "♞",
        "bP" to "♟",
    )
