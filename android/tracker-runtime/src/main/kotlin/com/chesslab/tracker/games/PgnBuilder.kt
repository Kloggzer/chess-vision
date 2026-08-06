package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private const val WRAP_COLUMNS = 80
private const val UNFINISHED = "*"

/**
 * Standard PGN — **one PGN game per [GameSegment]**.
 *
 * A PGN file may legitimately hold several games, and that is the honest shape for a record the app
 * lost and rebuilt: the segments do not chain, so writing them as one main line would produce a
 * file that parses, looks legal, and replays wrongly from the seam onwards. Each segment gets its
 * own `[FEN]` and the segment's first move carries a comment naming what happened.
 *
 * The one export bug that matters is a mid-game start without `SetUp`/`FEN`: the file parses, the
 * moves are legal-looking, and every reader replays them from the wrong position. So those two tags
 * are emitted whenever a segment does not start at the standard start position.
 *
 * With [provenance] off the output is a plain PGN, byte for byte — the comments are a debugging
 * aid, and a game full of `{cl: diff_after_verify}` is not something anyone sends to anyone. The
 * seam comment is NOT one of them: it is why the moves after it do not follow the moves before.
 */
fun buildPgn(
    game: StoredGame,
    provenance: Boolean = false,
): String {
    val segments = game.segmentsOrOne()
    return segments
        .mapIndexed { index, segment -> pgnGame(game, segment, provenance, last = index == segments.lastIndex) }
        .joinToString("\n")
}

/** One `[Event]` block. Only the last segment can carry the game's result; the earlier ones ran on. */
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

/**
 * `{position rebuilt by cnn_recovery: Qxd4 — the app lost the board here}`.
 *
 * The plies it names are in no move list of any segment: they are illegal from the line before the
 * seam and they precede this segment's start. This comment is the only place they exist in the PGN.
 */
private fun seamComment(seam: SeamOrigin): String =
    "{${sanitize("position rebuilt by ${seam.decider}: ${seam.sans.joinToString(" ")} — the app lost the board here")}}"

/** `yyyy.MM.dd` in local time — the PGN date is the date the game was played, not a UTC instant. */
private fun pgnDate(epochMs: Long): String = SimpleDateFormat("yyyy.MM.dd", Locale.US).format(Date(epochMs))

/**
 * Move tokens with their numbers. A game that starts from a FEN starts at that FEN's move number,
 * and a black-to-move start gets the `12... e5` ellipsis form — without it the numbering silently
 * shifts every later move by half a ply.
 */
private fun tokens(
    segment: GameSegment,
    provenance: Boolean,
): List<String> {
    val fields = segment.startFen.split(" ")
    var number = fields.getOrNull(5)?.toIntOrNull() ?: 1
    var whiteToMove = fields.getOrNull(1) != "b"
    val seam = segment.enteredBy?.let(::seamComment)
    // A segment can be empty — a seam whose first move was taken back again — and then the comment
    // is the whole movetext. Dropping it would lose the only record of the plies that caused it.
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
