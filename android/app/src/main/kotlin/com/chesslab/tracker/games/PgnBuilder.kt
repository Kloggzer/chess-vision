package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private const val WRAP_COLUMNS = 80

/**
 * Standard PGN.
 *
 * The one export bug that matters is a mid-game start without `SetUp`/`FEN`: the file parses, the
 * moves are legal-looking, and every reader replays them from the wrong position. So those two tags
 * are emitted whenever [StoredGame.startFen] is not the standard start position.
 *
 * With [provenance] off the output is a plain PGN, byte for byte — the comments are a debugging
 * aid, and a game full of `{cl: diff_after_verify}` is not something anyone sends to anyone.
 */
fun buildPgn(
    game: StoredGame,
    provenance: Boolean = false,
): String {
    val tags =
        buildString {
            appendLine("[Event \"${escapeTag(game.event)}\"]")
            appendLine("[Site \"$UNKNOWN\"]")
            appendLine("[Date \"${pgnDate(game.startedAtEpochMs)}\"]")
            appendLine("[Round \"$UNKNOWN\"]")
            appendLine("[White \"${escapeTag(game.white)}\"]")
            appendLine("[Black \"${escapeTag(game.black)}\"]")
            appendLine("[Result \"${game.result}\"]")
            if (game.startFen != STARTPOS) {
                appendLine("[SetUp \"1\"]")
                appendLine("[FEN \"${game.startFen}\"]")
            }
        }
    return tags + "\n" + wrap(tokens(game, provenance) + game.result) + "\n"
}

/** `yyyy.MM.dd` in local time — the PGN date is the date the game was played, not a UTC instant. */
private fun pgnDate(epochMs: Long): String = SimpleDateFormat("yyyy.MM.dd", Locale.US).format(Date(epochMs))

/**
 * Move tokens with their numbers. A game that starts from a FEN starts at that FEN's move number,
 * and a black-to-move start gets the `12... e5` ellipsis form — without it the numbering silently
 * shifts every later move by half a ply.
 */
private fun tokens(
    game: StoredGame,
    provenance: Boolean,
): List<String> {
    val fields = game.startFen.split(" ")
    var number = fields.getOrNull(5)?.toIntOrNull() ?: 1
    var whiteToMove = fields.getOrNull(1) != "b"
    val out = mutableListOf<String>()
    game.moves.forEach { move ->
        when {
            whiteToMove -> out += "$number."
            out.isEmpty() -> out += "$number..."
        }
        out += move.san
        if (provenance) move.provenance?.let { out += comment(it) }
        if (!whiteToMove) number++
        whiteToMove = !whiteToMove
    }
    return out
}

/** `{cl: decider; LL best/second (m margin); changed e2,e4}` — one brace-form comment, no nesting. */
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

/**
 * Braces cannot appear inside a brace comment (PGN has no escape and no nesting), and a newline
 * would end the token stream mid-comment. Both come from free text the tracker wrote.
 */
private fun sanitize(text: String): String =
    text
        .replace('{', '(')
        .replace('}', ')')
        .replace(Regex("\\s+"), " ")
        .trim()

/** Tag values are quoted C-style: backslash and quote must be escaped, nothing else. */
private fun escapeTag(text: String): String = text.replace("\\", "\\\\").replace("\"", "\\\"")

/** Wrapped at 80 columns, never inside a token — a split `{`-comment is an unparseable file. */
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
