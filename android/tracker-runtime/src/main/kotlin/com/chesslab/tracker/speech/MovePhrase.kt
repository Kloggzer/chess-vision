package com.chesslab.tracker.speech

/** Persisted, so the names are part of the format. */
enum class SpeechVerbosity(
    val label: String,
) {
    LETTERS("SAN letters"),
    WORDS("Words"),
    WORDS_WITH_SIDE("Words with side"),
}

/** `MORE` carries an `%s` for the count. */
private enum class Term { TAKES, PLAYS, CHECK, MATE, PROMOTES, PROMOTES_TO, KINGSIDE, QUEENSIDE, WHITE, BLACK, MORE, AND }

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

/** The side comes from the ply index. Never touches a board: re-deriving the move would be a second opinion. */
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
        return if (castle != null) "$side $body$suffix" else "$side ${w[Term.PLAYS]} $body$suffix"
    }

    /** Ein Bruecken-Commit spricht zwei Zuege in einem Satz. */
    fun and(language: String): String = table(language)[Term.AND]

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
        // The disambiguator ("Nbd2", "R1e2") or a pawn's file: swallowing it makes two legal moves sound alike.
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
        // Deliberate: a promotion is rare, and the user wants to hear the piece named outright.
        val verb = if (verbosity == SpeechVerbosity.LETTERS) w[Term.PROMOTES] else w[Term.PROMOTES_TO]
        return "$verb $name"
    }

    private fun spell(
        text: String,
        verbosity: SpeechVerbosity,
    ): String = if (verbosity == SpeechVerbosity.LETTERS) text.toCharArray().joinToString(" ") else text

    /** An unsupported language keeps the English words rather than going silent. */
    private fun table(language: String): Words = if (speaksGerman(language)) GERMAN else ENGLISH
}

/** Eine BCP-47-Sprache wie `de-DE`: alles, was mit `de` beginnt, ist Deutsch; sonst Englisch. */
fun speaksGerman(language: String): Boolean = language.substringBefore('-').lowercase() == "de"
