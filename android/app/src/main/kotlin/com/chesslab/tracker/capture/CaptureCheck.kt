package com.chesslab.tracker.capture

import com.chesslab.engine.api.DebugCnnRead

// Die CNN-Kontrolle beim Aufbau: sie hilft dem Menschen, sie ersetzt ihn nicht.
//
// Ein Veto waere hier falsch herum. Aufgenommen wird GENAU auf den Kombinationen, die dem Modell
// fehlen — 16 der 46 Luecken haben null Belege, seine Zuverlaessigkeit ist dort nicht einmal
// messbar. Ein Widerspruch kann also der Aufbau sein oder die Luecke selbst. Deshalb gibt es hier
// nur Zustaende und einen Satz; gesperrt wird nichts.

/** Was das Modell auf einem Zielfeld sieht. `OFF` heisst kein Read, nicht „leer". */
enum class Check { AGREES, OTHER_PIECE, EMPTY, UNSURE, OFF }

/**
 * Je Zielfeld ein Zustand. [EMPTY] ist die Meldung, die sich lohnt — bei 19 Figuren ist eine
 * vergessene oder danebengestellte der haeufigste Fehler, und sie haengt nicht an der Figurklasse.
 */
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

/**
 * Felder, die kein Ziel sind, auf denen das Modell aber sicher eine Figur sieht.
 *
 * Sie sind der teuerste Aufbaufehler: die FEN fuehrt sie als `empty`, also ist jedes solche Label
 * in jedem Frame des Laufs falsch — und niemand sieht es dem Bild spaeter an.
 */
fun strayPieces(
    targets: List<Target>,
    reads: List<DebugCnnRead>,
): List<String> {
    val wanted = targets.map { it.square }.toSet()
    return reads.filter { it.square !in wanted && it.occupied && it.confident }.map { it.square }
}

/**
 * Das Schachzeichen einer Figur. Ein Kuerzel in der Feldecke sah aus wie ein Befund des Modells —
 * dieselbe Sprache, die das Tracking-Overlay fuer ERKANNTES benutzt. Eine Figur, die im Feld
 * steht, liest dagegen jeder als „hierhin damit".
 */
fun pieceSymbol(piece: String): String = SYMBOLS[piece] ?: piece

/**
 * Wie weit der Aufbau ist. Ohne Modell zaehlt sie die Aufgabe, nicht den Fortschritt: null von
 * vier gestellt waere gelogen, solange niemand hinsieht.
 */
fun progressLine(checks: Map<String, Check>): String {
    if (checks.isEmpty()) return ""
    if (checks.values.all { it == Check.OFF }) return "${checks.size} Figuren aufstellen"
    val standing = checks.count { it.value != Check.EMPTY && it.value != Check.OFF }
    return "$standing von ${checks.size} stehen"
}

/**
 * Die Belegung als Text: `wQ c8 · bK a1`.
 *
 * Ohne Kamerabild zeichnet der Schirm kein Brett, und dann ist diese Zeile das Einzige, was sagt,
 * was aufzubauen ist — sie darf die Felder deshalb nie weglassen, auch wenn das Overlay sie zeigt.
 */
fun orderLine(targets: List<Target>): String =
    if (targets.isEmpty()) {
        "nichts aufzubauen — leeres Brett"
    } else {
        targets.joinToString(" · ") { "${it.piece} ${it.square}" }
    }

/** Ein Satz, der zaehlt und benennt — nie ein Urteil ueber den Aufbau. */
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

/** Die Figuren als Zeichen. Weiss und schwarz getrennt, damit auch die FARBE ohne Text liest. */
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
