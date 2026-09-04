package com.chesslab.desktop

import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.margins4
import com.chesslab.tracker.geometry.boardGeometryFor
import com.chesslab.tracker.settings.BoardOrientation
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.double
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File

/**
 * The board as the RECORDING describes it: `boardGeometryFor` knows only the quad and stamps
 * white POV and `margins4(0.045)` over the rest, so a black-side game was cut 180 degrees around.
 * `candidate.json` carries the margin, `settings.json` the orientation; where neither is stored
 * the printed line says the POV is assumed rather than measured.
 */
internal fun replayBoardGeometry(
    quad: FloatArray,
    dir: File?,
    settings: File?,
): BoardGeometry {
    val base = boardGeometryFor(quad)
    val margin = dir?.let { marginFromCandidate(File(it, "candidate.json")) }
    val recorded = recordedWhitePov(settings) ?: dir?.let { recordedWhitePov(File(it, "settings.json")) }
    val pov =
        when (recorded) {
            null -> "white POV ASSUMED — the recording stored no orientation"
            true -> "white POV"
            false -> "BLACK POV"
        }
    println("geometry: margin ${margin ?: base.margin.first()} · $pov")
    return base.copy(margin = margin?.let(::margins4) ?: base.margin, whitePov = recorded ?: true)
}

private fun marginFromCandidate(candidate: File): Double? =
    runCatching {
        Json
            .parseToJsonElement(candidate.readText())
            .jsonObject
            .getValue("geometry")
            .jsonObject
            .getValue("margin")
            .jsonPrimitive.double
    }.getOrNull()

/** `AppSettings.orientation` out of a session's `settings.json`, or null where none was written. */
private fun recordedWhitePov(file: File?): Boolean? {
    val name =
        runCatching {
            Json
                .parseToJsonElement(file?.takeIf(File::isFile)?.readText() ?: return null)
                .jsonObject["app"]
                ?.jsonObject
                ?.get("orientation")
                ?.jsonPrimitive
                ?.contentOrNull
        }.getOrNull() ?: return null
    return BoardOrientation.entries.firstOrNull { it.name == name }?.whitePov
}
