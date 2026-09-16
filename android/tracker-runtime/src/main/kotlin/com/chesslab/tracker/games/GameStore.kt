package com.chesslab.tracker.games

import com.chesslab.tracker.io.writeAtomic
import kotlinx.serialization.builtins.ListSerializer
import java.io.File

private const val INDEX = "index.json"

private val JSON = GAMES_JSON

/**
 * The app-private game library: `games/index.json` + one `<id>.json` and one `<id>.pgn` per game.
 *
 * The index exists so [list] never parses a game — the same rule the repo's `manifest_cache.py`
 * states for the web read paths ("never re-read whole manifests per request"). It is a derived
 * file: a lost index costs the library listing, never a game.
 *
 * Every write goes through [writeAtomic]. A half-written index is indistinguishable from a corrupt
 * one, and it would be read on the next app start.
 */
class GameStore(
    private val root: File,
) {
    private val indexFile get() = File(root, INDEX)

    /** Newest first. Unreadable index = empty library, never a crash on the games screen. */
    fun list(): List<GameSummary> = rows().sortedByDescending { it.startedAtEpochMs }

    /**
     * Die Zeilen des Index — und wo der nicht zu lesen ist, aus den Spielen selbst.
     *
     * Nur auf diesem Pfad wird ein Spiel geoeffnet, denn `save` und `delete` schreiben den Index
     * aus DIESER Liste neu: aus einer fehlgeschlagenen Lesung heraus haetten sie jedes bestehende
     * `<id>.json` verwaist, was das KDoc oben ausdruecklich ausschliesst.
     */
    private fun rows(): List<GameSummary> =
        runCatching { JSON.decodeFromString(ListSerializer(GameSummary.serializer()), indexFile.readText()) }
            .getOrNull()
            ?: (root.listFiles { f -> f.isFile && f.name.endsWith(".json") && f.name != INDEX } ?: emptyArray())
                .mapNotNull { f -> runCatching { decodeStoredGame(f.readText()).summary() }.getOrNull() }

    /**
     * One game, with the seams that CAN be closed already closed — and written back when any were.
     *
     * The rewrite is a migration and it runs at most once per game: the games recorded before
     * `closeSeams` existed were split wherever a CNN recovery committed from ahead of the record,
     * and the split is in three places at once. The move list is the visible one; the stored PGN and
     * the index row are the other two, and [list] never opens a game, so a stale `seams: 1` would go
     * on calling a continuous game rebuilt for as long as the file existed.
     */
    fun open(id: String): StoredGame? {
        val stored = runCatching { decodeStoredGame(File(root, "$id.json").readText()) }.getOrNull() ?: return null
        val closed = stored.closeSeams()
        if (closed !== stored) runCatching { save(closed) }
        return closed
    }

    /**
     * Persists the game and its PGN. Returns `null` for an empty game: a library row for zero moves
     * is noise, and the tracker produces one every time it is started and stopped again.
     *
     * The stored PGN carries no provenance comments — that is an export-time choice ([buildPgn]),
     * and the file on disk is the shareable form.
     */
    fun save(game: StoredGame): GameSummary? {
        if (game.moves.isEmpty()) return null
        root.mkdirs()
        writeAtomic(File(root, "${game.id}.json"), JSON.encodeToString(StoredGame.serializer(), game))
        writeAtomic(File(root, "${game.id}.pgn"), buildPgn(game))
        val row = game.summary()
        writeIndex(list().filterNot { it.id == game.id } + row)
        return row
    }

    /**
     * Everything a stored game can be corrected about — never the id, which is its identity and
     * that of its files.
     *
     * The RESULT is in here because the end-game dialog is allowed to default to "unfinished"
     * without asking twice: a default is only safe where it can be fixed later, and this is later.
     * Rewriting it re-renders the PGN and the index row, which is what `save` already does.
     */
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

    /** The PGN as stored; regenerated when the caller wants provenance comments. */
    fun pgn(id: String): String? = File(root, "$id.pgn").takeIf { it.isFile }?.readText()

    private fun writeIndex(rows: List<GameSummary>) {
        root.mkdirs()
        writeAtomic(
            indexFile,
            JSON.encodeToString(ListSerializer(GameSummary.serializer()), rows.sortedByDescending { it.startedAtEpochMs }),
        )
    }
}
