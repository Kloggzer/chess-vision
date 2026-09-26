package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.move.MoveList
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File

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

/** Ein Zug der `candidate.json`: `frame` -1 und `decider` null, wo die Datei sie nicht nennt. */
data class CandidateMove(
    val san: String,
    val frame: Int,
    val decider: String?,
)

class Candidate(
    val startFen: String,
    val moves: List<CandidateMove>,
)

/** Arena und Desktop lesen dieselbe Datei: ohne `start_fen` einer Aufnahme aus laufender Partie ist schon der
 *  erste SAN unspielbar. Keine Datei heisst Grundstellung ohne Zuege. */
fun readCandidate(file: File): Candidate {
    if (!file.isFile) return Candidate(STARTPOS, emptyList())
    val root = Json.parseToJsonElement(file.readText()).jsonObject
    val moves =
        root["moves"]?.jsonArray.orEmpty().map { it.jsonObject }.map { row: JsonObject ->
            CandidateMove(
                san = row.getValue("san").jsonPrimitive.content,
                frame = row["frame"]?.jsonPrimitive?.content?.toIntOrNull() ?: -1,
                decider = row["decider"]?.jsonPrimitive?.content,
            )
        }
    return Candidate(root["start_fen"]?.jsonPrimitive?.content ?: STARTPOS, moves)
}
