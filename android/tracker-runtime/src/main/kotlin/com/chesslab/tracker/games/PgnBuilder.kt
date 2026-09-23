package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.fenFullmove
import com.chesslab.engine.api.fenWhiteToMove
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private const val WRAP_COLUMNS = 80
private const val UNFINISHED = "*"

/** **One PGN game per [GameSegment]**: one main line across a seam would parse and replay wrongly. `SetUp`/`FEN`
 *  whenever a segment starts elsewhere than the standard position. With [provenance] off the output is a plain
 *  PGN; the seam comment stays, it is why the moves after it do not follow. */
fun buildPgn(
    game: StoredGame,
    provenance: Boolean = false,
): String {
    val segments = game.segmentsOrOne()
    return segments
        .mapIndexed { index, segment -> pgnGame(game, segment, provenance, last = index == segments.lastIndex) }
        .joinToString("\n")
}

/** Only the last segment can carry the game's result. */
private fun pgnGame(
    game: StoredGame,
    segment: GameSegment,
    provenance: Boolean,
    last: Boolean,
): String {
    val result = if (last) game.result else UNFINISHED
    val tags =
        buildString {
            appendLine("[Event \"${escapeTag(game.event)}\"]")
            appendLine("[Site \"$UNKNOWN\"]")
            appendLine("[Date \"${pgnDate(game.startedAtEpochMs)}\"]")
            appendLine("[Round \"$UNKNOWN\"]")
            appendLine("[White \"${escapeTag(game.white)}\"]")
            appendLine("[Black \"${escapeTag(game.black)}\"]")
            appendLine("[Result \"$result\"]")
            if (segment.startFen != STARTPOS) {
                appendLine("[SetUp \"1\"]")
                appendLine("[FEN \"${segment.startFen}\"]")
            }
        }
    return tags + "\n" + wrap(tokens(segment, provenance) + result) + "\n"
}

/** The plies it names are in no move list: this comment is the only place they exist in the PGN. */
private fun seamComment(seam: SeamOrigin): String =
    "{${sanitize("position rebuilt by ${seam.decider}: ${seam.sans.joinToString(" ")} — the app lost the board here")}}"

/** Local time — the date the game was played, not a UTC instant. */
private fun pgnDate(epochMs: Long): String = SimpleDateFormat("yyyy.MM.dd", Locale.US).format(Date(epochMs))

/** A black-to-move start gets `12... e5`; without it every later move shifts by half a ply. */
private fun tokens(
    segment: GameSegment,
    provenance: Boolean,
): List<String> {
    var number = fenFullmove(segment.startFen) ?: 1
    var whiteToMove = fenWhiteToMove(segment.startFen) != false
    val seam = segment.enteredBy?.let(::seamComment)
    // A segment can be empty; dropping the comment would lose the only record of the plies that caused it.
    if (segment.moves.isEmpty()) return listOfNotNull(seam)
    val out = mutableListOf<String>()
    segment.moves.forEachIndexed { index, move ->
        when {
            whiteToMove -> out += "$number."
            out.isEmpty() -> out += "$number..."
        }
        out += move.san
        if (index == 0 && seam != null) out += seam
        if (provenance) move.provenance?.let { out += comment(it) }
        if (!whiteToMove) number++
        whiteToMove = !whiteToMove
    }
    return out
}

private fun comment(p: MoveProvenance): String {
    val ll = "LL %.2f/%.2f (m %.2f)".format(Locale.US, p.best, p.second, p.margin)
    val parts =
        listOfNotNull(
            p.decider,
            ll,
            "changed ${p.changed.joinToString(",")}".takeIf { p.changed.isNotEmpty() },
            "prior".takeIf { p.priorUsed },
            "cnn ${"%.2f".format(Locale.US, p.cnnAgreement)}".takeIf { p.cnnAgreement > 0.0 },
        )
    return "{cl: ${sanitize(parts.joinToString("; "))}}"
}

/** PGN brace comments have no escape and no nesting, and a newline would end the token stream. */
private fun sanitize(text: String): String =
    text
        .replace('{', '(')
        .replace('}', ')')
        .replace(Regex("\\s+"), " ")
        .trim()

private fun escapeTag(text: String): String = text.replace("\\", "\\\\").replace("\"", "\\\"")

/** Never inside a token — a split `{`-comment is an unparseable file. */
private fun wrap(tokens: List<String>): String {
    val lines = mutableListOf<String>()
    var line = StringBuilder()
    tokens.forEach { token ->
        if (line.isNotEmpty() && line.length + 1 + token.length > WRAP_COLUMNS) {
            lines += line.toString()
            line = StringBuilder()
        }
        if (line.isNotEmpty()) line.append(' ')
        line.append(token)
    }
    if (line.isNotEmpty()) lines += line.toString()
    return lines.joinToString("\n")
}
