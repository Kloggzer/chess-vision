package com.chesslab.tracker.games

import com.chesslab.tracker.io.writeAtomic
import kotlinx.serialization.builtins.ListSerializer
import java.io.File
import java.io.IOException

private const val INDEX = "index.json"

/** Sie ist der EINZIGE Partienachweis, also darf sie nicht als `null` auftreten. */
class GameUnreadable(
    file: File,
    cause: Throwable,
) : IOException("$file ist nicht als Partie zu lesen", cause)

private val JSON = GAMES_JSON

/** The index exists so [list] never parses a game; it is derived, so a lost index costs the listing, never a
 *  game. Every write is atomic: a half-written index is indistinguishable from a corrupt one. */
class GameStore(
    private val root: File,
) {
    private val indexFile get() = File(root, INDEX)

    /** Newest first. */
    fun list(): List<GameSummary> = rows().sortedByDescending { it.startedAtEpochMs }

    /** VEREINIGT mit jedem `<id>.json`, das der Index nicht nennt: ein alter Index verbarg sonst eine Partie,
     *  und `save` schreibt ihn aus DIESER Liste neu. */
    private fun rows(): List<GameSummary> {
        val indexed =
            runCatching { JSON.decodeFromString(ListSerializer(GameSummary.serializer()), indexFile.readText()) }
                .getOrNull()
        val known = indexed.orEmpty().mapTo(HashSet()) { it.id }
        val loose =
            (root.listFiles { f -> f.isFile && f.name.endsWith(".json") && f.name != INDEX } ?: emptyArray())
                .filterNot { it.nameWithoutExtension in known }
                .mapNotNull { f -> runCatching { decodeStoredGame(f.readText()).summary() }.getOrNull() }
        return indexed.orEmpty() + loose
    }

    /** Closable seams are closed and written back, once per game: [list] never opens a game, so a stale
     *  `seams: 1` in the index would otherwise stay forever. */
    fun open(id: String): StoredGame? {
        val file = File(root, "$id.json")
        // `null` heisst ab hier NUR "gibt es nicht": die Datei ist der einzige Nachweis der Partie.
        if (!file.isFile) return null
        val stored = runCatching { decodeStoredGame(file.readText()) }.getOrElse { throw GameUnreadable(file, it) }
        val closed = stored.closeSeams()
        if (closed !== stored) runCatching { save(closed) }
        return closed
    }

    /** Null for an empty game: the tracker produces one every time it is started and stopped. */
    fun save(game: StoredGame): GameSummary? {
        if (game.moves.isEmpty()) return null
        root.mkdirs()
        writeAtomic(File(root, "${game.id}.json"), JSON.encodeToString(StoredGame.serializer(), game))
        writeAtomic(File(root, "${game.id}.pgn"), buildPgn(game))
        val row = game.summary()
        writeIndex(list().filterNot { it.id == game.id } + row)
        return row
    }

    /** Never the id. The RESULT is here because the end-game dialog may default to "unfinished": a default is
     *  only safe where it can be fixed later. */
    fun updateDetails(
        id: String,
        white: String,
        black: String,
        event: String,
        result: GameResult,
    ): GameSummary? =
        open(id)
            ?.copy(
                white = white.trim().ifBlank { UNKNOWN },
                black = black.trim().ifBlank { UNKNOWN },
                event = event.trim().ifBlank { "chesslab" },
                result = result.tag,
            )?.let(::save)

    fun delete(id: String) {
        File(root, "$id.json").delete()
        File(root, "$id.pgn").delete()
        writeIndex(list().filterNot { it.id == id })
    }

    fun pgn(id: String): String? = File(root, "$id.pgn").takeIf { it.isFile }?.readText()

    private fun writeIndex(rows: List<GameSummary>) {
        root.mkdirs()
        writeAtomic(
            indexFile,
            JSON.encodeToString(ListSerializer(GameSummary.serializer()), rows.sortedByDescending { it.startedAtEpochMs }),
        )
    }
}
