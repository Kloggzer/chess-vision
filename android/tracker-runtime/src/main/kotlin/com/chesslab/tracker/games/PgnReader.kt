package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.MoveList

private val PGN_COMMENT = Regex("""\{[^}]*\}""")
private val PGN_NUMBER = Regex("""\d+\.(\.\.)?""")
private val PGN_RESULT = Regex("""(1-0|0-1|1/2-1/2|\*)""")
private val PGN_SPACE = Regex("""\s+""")

/** Die Hauptlinie EINES Spiels, durch chesslib normalisiert, damit sie gegen einen Lauf vergleicht. Ohne den
 *  [startFen] einer Aufnahme faellt schon der erste SAN aus. Ein unspielbarer Zug wirft. */
fun pgnSans(
    text: String,
    startFen: String = STARTPOS,
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

/** Die FEN nach jedem Halbzug; am ersten unspielbaren SAN ist Schluss statt eines Wurfs. */
fun fensAfterSans(
    startFen: String,
    sans: List<String>,
): List<String> {
    val board = Board().apply { loadFromFen(startFen) }
    val out = mutableListOf<String>()
    for (san in sans) {
        val list = MoveList(board.fen)
        if (!runCatching { list.loadFromSan(san) }.isSuccess || list.isEmpty()) break
        board.doMove(list.first())
        out += board.fen
    }
    return out
}
