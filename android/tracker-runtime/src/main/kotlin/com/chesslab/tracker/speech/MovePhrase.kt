package com.chesslab.tracker.speech

/** How much of a move is spoken. Persisted in `AppSettings`, so the names are part of the format. */
enum class SpeechVerbosity(
    val label: String,
) {
    LETTERS("SAN letters"),
    WORDS("Words"),
    WORDS_WITH_SIDE("Words with side"),
}

/** Everything a spoken move needs beyond the piece names. `MORE` carries an `%s` for the count. */
private enum class Term { TAKES, PLAYS, CHECK, MATE, PROMOTES, PROMOTES_TO, KINGSIDE, QUEENSIDE, WHITE, BLACK, MORE, AND }

/**
 * The vocabulary of one language: a table, because the only thing that varies between languages is
 * the words — the parse of SAN is identical everywhere.
 */
private class Words(
    val pieces: Map<Char, String>,
    private val terms: Map<Term, String>,
) {
    operator fun get(term: Term): String = terms.getValue(term)
}

private val ENGLISH =
    Words(
        mapOf('N' to "knight", 'B' to "bishop", 'R' to "rook", 'Q' to "queen", 'K' to "king"),
        mapOf(
            Term.TAKES to "takes",
            Term.PLAYS to "plays",
            Term.CHECK to "check",
            Term.MATE to "checkmate",
            Term.PROMOTES to "promotes",
            Term.PROMOTES_TO to "promotes to",
            Term.KINGSIDE to "castles kingside",
            Term.QUEENSIDE to "castles queenside",
            Term.WHITE to "White",
            Term.BLACK to "Black",
            Term.MORE to "and %s more moves",
            Term.AND to "and",
        ),
    )

private val GERMAN =
    Words(
        mapOf('N' to "Springer", 'B' to "Läufer", 'R' to "Turm", 'Q' to "Dame", 'K' to "König"),
        mapOf(
            Term.TAKES to "schlägt",
            Term.PLAYS to "zieht",
            Term.CHECK to "Schach",
            Term.MATE to "Schachmatt",
            Term.PROMOTES to "verwandelt",
            Term.PROMOTES_TO to "verwandelt in",
            Term.KINGSIDE to "kurze Rochade",
            Term.QUEENSIDE to "lange Rochade",
            Term.WHITE to "Weiß",
            Term.BLACK to "Schwarz",
            Term.MORE to "und %s weitere Züge",
            Term.AND to "und",
        ),
    )

/**
 * SAN in, spoken text out.
 *
 * SAN carries no colour, so the side comes from the ply index (1-based, odd = White). Everything
 * else is read straight off the notation: this never touches a board, because the engine already
 * decided what was played and re-deriving it would be a second, disagreeing opinion.
 */
object MovePhrase {
    fun of(
        san: String,
        ply: Int,
        verbosity: SpeechVerbosity,
        language: String = "en",
    ): String {
        val w = table(language)
        val core = san.trimEnd('+', '#')
        val suffix =
            when {
                san.endsWith('#') -> ", ${w[Term.MATE]}"
                san.endsWith('+') -> ", ${w[Term.CHECK]}"
                else -> ""
            }
        val castle =
            when (core) {
                "O-O", "0-0" -> w[Term.KINGSIDE]
                "O-O-O", "0-0-0" -> w[Term.QUEENSIDE]
                else -> null
            }
        val body = castle ?: move(core, verbosity, w)
        if (verbosity != SpeechVerbosity.WORDS_WITH_SIDE) return body + suffix
        val side = if (ply % 2 == 1) w[Term.WHITE] else w[Term.BLACK]
        // "White castles kingside", not "White plays castles kingside".
        return if (castle != null) "$side $body$suffix" else "$side ${w[Term.PLAYS]} $body$suffix"
    }

    /** Was zwei Zuege einer Sequenz verbindet — ein Bruecken-Commit spricht sie in einem Satz. */
    fun and(language: String): String = table(language)[Term.AND]

    /** The overflow announcement, in the speaking language — see `UtteranceQueue`. */
    fun moreMoves(
        dropped: Int,
        language: String,
    ): String = table(language)[Term.MORE].replace("%s", dropped.toString())

    private fun move(
        core: String,
        verbosity: SpeechVerbosity,
        w: Words,
    ): String {
        val promotion = core.substringAfter('=', "").firstOrNull()
        val notation = core.substringBefore('=')
        val piece = notation.firstOrNull()?.takeIf { it.isUpperCase() }
        val rest = if (piece != null) notation.drop(1) else notation
        val target = rest.takeLast(2)
        // Whatever is left in front of the target square is the disambiguator ("Nbd2", "R1e2",
        // "Qh4xe1") — or, for a pawn, its file. Swallowing it makes two legal moves sound alike.
        val disambiguation = rest.dropLast(2).filter { it != 'x' }
        return listOfNotNull(
            piece?.let { pieceWord(it, verbosity, w) },
            disambiguation.ifEmpty { null }?.let { spell(it, verbosity) },
            if ('x' in rest) w[Term.TAKES] else null,
            spell(target, verbosity),
            promotion?.let { promotionWord(it, verbosity, w) },
        ).joinToString(" ")
    }

    private fun pieceWord(
        letter: Char,
        verbosity: SpeechVerbosity,
        w: Words,
    ): String {
        val name = w.pieces[letter.uppercaseChar()] ?: letter.toString()
        return when (verbosity) {
            SpeechVerbosity.LETTERS -> letter.uppercaseChar().toString()
            SpeechVerbosity.WORDS -> name.replaceFirstChar { it.uppercaseChar() }
            SpeechVerbosity.WORDS_WITH_SIDE -> name
        }
    }

    private fun promotionWord(
        letter: Char,
        verbosity: SpeechVerbosity,
        w: Words,
    ): String {
        val name = w.pieces[letter.uppercaseChar()] ?: letter.toString()
        val verb = if (verbosity == SpeechVerbosity.LETTERS) w[Term.PROMOTES] else w[Term.PROMOTES_TO]
        return "$verb $name"
    }

    /** In LETTERS mode a square is read out character by character: "d5" -> "d 5". */
    private fun spell(
        text: String,
        verbosity: SpeechVerbosity,
    ): String = if (verbosity == SpeechVerbosity.LETTERS) text.toCharArray().joinToString(" ") else text

    /** An unsupported language keeps the English words rather than going silent or crashing. */
    private fun table(language: String): Words = if (language.substringBefore('-').lowercase() == "de") GERMAN else ENGLISH
}
