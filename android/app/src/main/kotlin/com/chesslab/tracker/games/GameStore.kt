package com.chesslab.tracker.games

import com.chesslab.tracker.record.PgnBuilder
import com.chesslab.tracker.ui.MoveEntry
import com.github.bhlangonijr.chesslib.Board
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

/**
 * Persists finished games as a PGN file plus a provenance sidecar JSON under
 * [dir] (`context.filesDir/games` in production, a temp dir in tests), and
 * maintains a small `index.json` so [list] never has to parse every PGN
 * (mirrors the repo's manifest-cache principle).
 */
class GameStore(
    private val dir: File,
) {
    private val json =
        Json {
            prettyPrint = true
            ignoreUnknownKeys = true
        }

    /**
     * Persist a finished game: `<id>.pgn` (via [PgnBuilder.build]) and
     * `<id>.provenance.json`, and append the summary to the index.
     *
     * Returns null (and writes nothing) if [moves] is empty — an empty game
     * is not worth a library entry.
     */
    fun save(
        moves: List<MoveEntry>,
        finalFen: String,
    ): GameSummary? {
        if (moves.isEmpty()) return null
        dir.mkdirs()

        val id = newId()
        val pgn = PgnBuilder.build(moves.map { it.san }, finalFen)
        pgnFile(id).writeText(pgn)

        val provenance =
            moves.mapIndexedNotNull { index, entry ->
                entry.decision?.let { d ->
                    MoveProvenance(
                        ply = index + 1,
                        san = entry.san,
                        decider = d.decider,
                        reason = d.reason,
                        margin = d.margin,
                        best = d.best,
                        second = d.second,
                        changed = d.changed,
                        shadowVeto = d.shadowVeto,
                        priorUsed = d.priorUsed,
                    )
                }
            }
        provenanceFile(id).writeText(json.encodeToString(provenance))

        val board = Board()
        board.loadFromFen(finalFen)
        val summary =
            GameSummary(
                id = id,
                savedAtEpochMs = System.currentTimeMillis(),
                opening = null,
                moveCount = moves.size,
                result = PgnBuilder.resultOf(board),
            )
        writeIndex(readIndex() + summary)
        return summary
    }

    /** Newest-first summaries, read from the index only (no PGN parsing). */
    fun list(): List<GameSummary> = readIndex().sortedByDescending { it.savedAtEpochMs }

    fun loadPgn(id: String): String = pgnFile(id).readText()

    fun loadProvenance(id: String): List<MoveProvenance> {
        val file = provenanceFile(id)
        if (!file.exists()) return emptyList()
        return json.decodeFromString<List<MoveProvenance>>(file.readText())
    }

    /** Remove `<id>.pgn`, `<id>.provenance.json` and the index entry. */
    fun delete(id: String) {
        pgnFile(id).delete()
        provenanceFile(id).delete()
        writeIndex(readIndex().filterNot { it.id == id })
    }

    private fun newId(): String {
        val base = ID_FORMAT.format(ZonedDateTime.now())
        var candidate = base
        var suffix = 1
        while (pgnFile(candidate).exists()) {
            candidate = "$base-$suffix"
            suffix++
        }
        return candidate
    }

    private fun readIndex(): List<GameSummary> {
        val file = indexFile()
        if (!file.exists()) return emptyList()
        return json.decodeFromString<List<GameSummary>>(file.readText())
    }

    private fun writeIndex(summaries: List<GameSummary>) {
        dir.mkdirs()
        indexFile().writeText(json.encodeToString(summaries))
    }

    private fun pgnFile(id: String): File = File(dir, "$id.pgn")

    private fun provenanceFile(id: String): File = File(dir, "$id.provenance.json")

    private fun indexFile(): File = File(dir, "index.json")

    private companion object {
        val ID_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd_HHmm")
    }
}
