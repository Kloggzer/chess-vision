@file:Suppress("TooManyFunctions")

package com.chesslab.desktop

import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.cnn.expectedLabels
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.GRID_LINES_PER_AXIS
import com.chesslab.geometry.GridMesh
import com.chesslab.geometry.MESH_CURV_LIMIT
import com.chesslab.geometry.MESH_TILT_LIMIT
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.cropBorderPx
import com.chesslab.geometry.cropSquare
import com.chesslab.geometry.gridOccludedSquares
import com.chesslab.geometry.margins4
import com.chesslab.geometry.smoothMeshCurvature
import com.chesslab.geometry.straightenBoard
import com.chesslab.geometry.warpBoardForCrops
import com.chesslab.tracker.geometry.boardGeometryFor
import com.chesslab.tracker.geometry.measuredBoardSize
import com.chesslab.tracker.io.Jsonl
import com.github.bhlangonijr.chesslib.Board
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.double
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import org.opencv.imgcodecs.Imgcodecs
import java.io.File
import java.io.FileOutputStream
import java.nio.charset.StandardCharsets.UTF_8
import java.security.MessageDigest
import kotlin.math.abs

private const val LABELED_EVERY = 8

private const val QUAD_FIT_NAME = "quad-fit.json"

/** One frame's re-fitted quad: the PLAYING FIELD's corners, at the margin the sidecar states,
 *  plus the measured 18-line mesh when the fit could locate every line. */
internal class FittedQuad(
    val corners: FloatArray,
    val margin: Double,
    val mesh: GridMesh? = null,
)

/**
 * `<sessionDir>/quad-fit.json`, written by `chesslab fit-stored` (`realgames/stored.py`): the PC's re-fit
 * of the quads the phone logged. No file, no entry or a failed frame — the caller keeps the logged
 * marker quad, which is what every pack before this one cut with.
 */
internal fun storedQuadFit(sessionDir: File): Map<String, FittedQuad> {
    val file = File(sessionDir, QUAD_FIT_NAME)
    if (!file.isFile) return emptyMap()
    val root = Json.parseToJsonElement(file.readText()) as JsonObject
    val margin = root.getValue("margin").jsonPrimitive.double
    val frames = root["frames"] as? JsonObject ?: return emptyMap()
    return frames.mapValues { (_, entry) ->
        FittedQuad((entry as JsonObject).corners(), margin, entry.meshOrNull()?.let(::smoothMeshCurvature))
    }
}

/** `grid_lines` is additive: absent, short, non-numeric, non-finite or non-monotone reads as
 *  "no mesh", never as an error — a bad sidecar must not take the whole pack down. A malformed
 *  pair drops exactly ONE stage (curved -> linear -> scalar), never half an axis pair. */
private fun JsonObject.meshOrNull(): GridMesh? {
    val lines = this["grid_lines"] as? JsonObject
    val xs = lines?.axisOrNull("x")
    val ys = lines?.axisOrNull("y")
    if (lines == null || xs == null || ys == null) return null
    val tx = lines.boundedOrNull("tx", MESH_TILT_LIMIT)
    val ty = lines.boundedOrNull("ty", MESH_TILT_LIMIT)
    if (tx == null || ty == null) return GridMesh(xs, ys)
    val cx = lines.boundedOrNull("cx", MESH_CURV_LIMIT)
    val cy = lines.boundedOrNull("cy", MESH_CURV_LIMIT)
    return if (cx != null && cy != null) GridMesh(xs, ys, tx, ty, cx, cy) else GridMesh(xs, ys, tx, ty)
}

private fun JsonObject.axisOrNull(name: String): DoubleArray? {
    val values = valuesOrNull(name) ?: return null
    val monotone =
        values.all { it.isFinite() } && (1 until values.size).all { values[it] > values[it - 1] }
    return if (monotone) values.toDoubleArray() else null
}

private fun JsonObject.boundedOrNull(
    name: String,
    limit: Double,
): DoubleArray? {
    val values = valuesOrNull(name) ?: return null
    return if (values.all { it.isFinite() && abs(it) < limit }) values.toDoubleArray() else null
}

// `takeIf { !it.isString }`: kotlinx parses "0.01" as a number, `Number.isFinite` in the TS
// twin refuses it — the two consumers must land on the SAME stage for the same sidecar.
private fun JsonObject.valuesOrNull(name: String): List<Double>? =
    (this[name] as? JsonArray)
        ?.mapNotNull { element -> (element as? JsonPrimitive)?.takeIf { !it.isString }?.doubleOrNull }
        ?.takeIf { it.size == GRID_LINES_PER_AXIS }

/** A fitted quad IS the field, so it is warped at the file's margin — never at the marker outset. */
internal fun storedGeometry(
    fitted: FittedQuad?,
    quad: FloatArray,
): BoardGeometry =
    if (fitted == null) {
        boardGeometryFor(quad)
    } else {
        BoardGeometry(boardSize = measuredBoardSize(quad), margin = margins4(fitted.margin))
    }

/**
 * `labeled-video-pack <video> <log.jsonl> <corrections.jsonl> <outDir> [every=N] [id=name]`.
 *
 * Confirmed real-game labels travel from the session log into an 80 px memmap without Python
 * ingest. Dirty frames, FEN-lag cells and every frame carrying a manual occlusion are excluded.
 */
@Suppress(
    "LongMethod",
    "NestedBlockDepth",
    "CyclomaticComplexMethod",
    "LoopWithTooManyJumpStatements",
    "MagicNumber",
)
fun packLabeledVideo(args: List<String>) {
    require(args.size >= 4) { labeledUsage() }
    val video = args[0].fileArg()
    val log = args[1].fileArg()
    val corrections = args[2].fileArg()
    val outDir = args[3].fileArg()
    val every = args.optionInt("every", LABELED_EVERY)
    val id = args.option("id") ?: log.parentFile.name
    require(video.isFile && log.isFile && corrections.isFile) { "video, log and corrections must exist" }
    require(!outDir.exists()) { "refusing to overwrite existing pack: ${outDir.absolutePath}" }

    val overrides = correctionMap(corrections, id)
    val occludedFrames = overrides.filterValues { values -> values.values.any { it == "occluded" } }.keys
    val rows = selectRows(log, every, occludedFrames)
    require(rows.isNotEmpty()) { "no clean labeled rows selected from ${log.absolutePath}" }
    val labelsByFen = mutableMapOf<String, Map<String, String>>()
    outDir.mkdirs()
    val manifest = File(outDir, "manifest.jsonl")
    val partial = File(outDir, "packed_images.u8.partial")
    val paths = StringBuilder("[")
    val digest = MessageDigest.getInstance("SHA-256")
    var crops = 0
    var acceptedFrames = 0
    var handFrames = 0
    var decoded = 0
    manifest.bufferedWriter().use { rowsOut ->
        FileOutputStream(partial).use { imageOut ->
            openRecording(video).use { source ->
                for ((frameNo, row) in rows) {
                    var frame = source.next()
                    while (frame != null && decoded < frameNo) {
                        decoded++
                        frame = source.next()
                    }
                    require(frame != null && decoded == frameNo) { "video ended before labeled frame $frameNo" }
                    decoded++
                    val quad = row.corners()
                    val geometry = boardGeometryFor(quad)
                    val warped = warpBoardForCrops(frame, geometry, cornersFromFlat(quad))
                    try {
                        if (isHandShape(gridOccludedSquares(warped, geometry, cropBorderPx(geometry)))) {
                            handFrames++
                            continue
                        }
                        val fen = row["fen"]!!.jsonPrimitive.content
                        val labels = labelsByFen.getOrPut(fen) { expectedLabels(Board().apply { loadFromFen(fen) }) }
                        val unknown = row.stringSet("unknown_squares")
                        val frameOverrides = overrides[row.frameStem()].orEmpty()
                        for (square in ALL_SQUARES) {
                            if (square in unknown) continue
                            val label = frameOverrides[square] ?: labels.getValue(square)
                            if (label == "occluded") continue
                            val crop = cropSquare(warped, square, geometry)
                            try {
                                val packed = resizeForPacking(crop)
                                try {
                                    val data = ByteArray(PACK_CROP_BYTES)
                                    packed.get(0, 0, data)
                                    bgrToRgbInPlace(data)
                                    imageOut.write(data)
                                } finally {
                                    packed.release()
                                }
                            } finally {
                                crop.release()
                            }
                            val stem = row.frameStem()
                            val path = "mm://$id/$stem/$square"
                            rowsOut.append(manifestRow(path, id, stem, square, label)).append('\n')
                            if (paths.length > 1) paths.append(',')
                            paths.append('"').append(json(path)).append('"')
                            digest.update(path.toByteArray(UTF_8))
                            digest.update(byteArrayOf(0))
                            digest.update(label.toByteArray(UTF_8))
                            digest.update(byteArrayOf(0))
                            digest.update("[$PACK_CROP_SIDE, $PACK_CROP_SIDE]".toByteArray(UTF_8))
                            digest.update(byteArrayOf('\n'.code.toByte()))
                            crops++
                        }
                        acceptedFrames++
                    } finally {
                        warped.release()
                    }
                }
            }
        }
    }
    val image = File(outDir, "packed_images.u8")
    check(partial.renameTo(image)) { "could not finalize ${image.absolutePath}" }
    paths.append(']')
    File(outDir, "packed_meta.json").writeText(
        "{\"n\":$crops,\"h\":$PACK_CROP_SIDE,\"w\":$PACK_CROP_SIDE," +
            "\"source\":\"${json(video.absolutePath)}\",\"session_id\":\"${json(id)}\"," +
            "\"every\":$every,\"accepted_frames\":$acceptedFrames," +
            "\"grid_hand_rejected\":$handFrames," +
            "\"occluded_frames_excluded\":${occludedFrames.size}," +
            "\"digest\":\"${digestHex(digest)}\",\"paths\":$paths}\n",
    )
    println("packed $crops labeled 13-class crops from $acceptedFrames clean frames -> ${outDir.absolutePath}")
}

/**
 * `occlusion-video-pack <video> <log.jsonl> <corrections.jsonl> <outDir> [session=name] [id=name]`.
 *
 * Writes only explicitly manually labelled occluded squares. This keeps hands out of the ordinary
 * FEN-labelled corpus while allowing the fourteenth classifier class to learn from their pixels.
 */
@Suppress("LongMethod", "NestedBlockDepth", "CyclomaticComplexMethod", "MagicNumber")
fun packOcclusionVideo(args: List<String>) {
    require(args.size >= 4) { occlusionUsage() }
    val video = args[0].fileArg()
    val log = args[1].fileArg()
    val corrections = args[2].fileArg()
    val outDir = args[3].fileArg()
    val session = args.option("session") ?: log.parentFile.name
    val id = args.option("id") ?: "occ-$session"
    require(video.isFile && log.isFile && corrections.isFile) { "video, log and corrections must exist" }
    require(!outDir.exists()) { "refusing to overwrite existing pack: ${outDir.absolutePath}" }

    val targets =
        correctionMap(corrections, session)
            .mapValues { (_, labels) -> labels.filterValues { it == "occluded" }.keys }
            .filterValues { it.isNotEmpty() }
    require(targets.isNotEmpty()) { "no manually labelled occluded squares for $session" }
    val rows =
        Jsonl
            .rows(log)
            .mapNotNull { row ->
                row
                    .frameStem()
                    .takeIf { it in targets }
                    ?.toInt()
                    ?.let { it to row }
            }.sortedBy { it.first }
    require(rows.isNotEmpty()) { "no correction frames found in ${log.absolutePath}" }

    outDir.mkdirs()
    val partial = File(outDir, "packed_images.u8.partial")
    val digest = MessageDigest.getInstance("SHA-256")
    val paths = StringBuilder("[")
    var crops = 0
    var decoded = 0
    File(outDir, "manifest.jsonl").bufferedWriter().use { rowsOut ->
        FileOutputStream(partial).use { imageOut ->
            openRecording(video).use { source ->
                for ((frameNo, row) in rows) {
                    var frame = source.next()
                    while (frame != null && decoded < frameNo) {
                        decoded++
                        frame = source.next()
                    }
                    require(frame != null && decoded == frameNo) { "video ended before labelled frame $frameNo" }
                    decoded++
                    val geometry = boardGeometryFor(row.corners())
                    val warped = warpBoardForCrops(frame, geometry, cornersFromFlat(row.corners()))
                    try {
                        val stem = row.frameStem()
                        for (square in targets.getValue(stem)) {
                            val crop = cropSquare(warped, square, geometry)
                            try {
                                val packed = resizeForPacking(crop)
                                try {
                                    val data = ByteArray(PACK_CROP_BYTES)
                                    packed.get(0, 0, data)
                                    bgrToRgbInPlace(data)
                                    imageOut.write(data)
                                } finally {
                                    packed.release()
                                }
                            } finally {
                                crop.release()
                            }
                            val path = "mm://$id/$stem/$square"
                            rowsOut.append(manifestRow(path, id, stem, square, "occluded")).append('\n')
                            if (paths.length > 1) paths.append(',')
                            paths.append('"').append(json(path)).append('"')
                            updateDigest(digest, path, "occluded")
                            crops++
                        }
                    } finally {
                        warped.release()
                    }
                }
            }
        }
    }
    val image = File(outDir, "packed_images.u8")
    check(partial.renameTo(image)) { "could not finalize ${image.absolutePath}" }
    paths.append(']')
    File(outDir, "packed_meta.json").writeText(
        "{\"n\":$crops,\"h\":$PACK_CROP_SIDE,\"w\":$PACK_CROP_SIDE," +
            "\"source\":\"${json(video.absolutePath)}\",\"session_id\":\"${json(id)}\"," +
            "\"source_session_id\":\"${json(session)}\",\"label\":\"occluded\"," +
            "\"digest\":\"${digestHex(digest)}\",\"paths\":$paths}\n",
    )
    println("packed $crops manually labelled occluded crops -> ${outDir.absolutePath}")
}

/**
 * `labeled-session-pack <sessionDir> <outDir> [corrections=file] [id=name]`.
 *
 * Android Stored recordings already contain intentionally sparse JPEG frames. Every logged image
 * is considered exactly once, then rejected when the grid detector sees a hand or metadata marks
 * it unsafe. Pixels go directly from JPEG into the 80 px RGB memmap.
 */
@Suppress("LongMethod", "NestedBlockDepth", "CyclomaticComplexMethod", "LoopWithTooManyJumpStatements")
fun packLabeledSession(args: List<String>) {
    require(args.size >= 2) { labeledSessionUsage() }
    val sessionDir = args[0].fileArg()
    val outDir = args[1].fileArg()
    val log = File(sessionDir, "log.jsonl")
    val id = args.option("id") ?: sessionDir.name
    val correctionFile = args.option("corrections")?.fileArg()
    require(log.isFile) { "missing log: ${log.absolutePath}" }
    require(correctionFile == null || correctionFile.isFile) { "missing corrections file: $correctionFile" }
    require(!outDir.exists()) { "refusing to overwrite existing pack: ${outDir.absolutePath}" }

    val overrides = correctionFile?.let { correctionMap(it, id) }.orEmpty()
    val occludedFrames = overrides.filterValues { values -> values.values.any { it == "occluded" } }.keys
    val rows = selectStoredRows(log, occludedFrames)
    require(rows.isNotEmpty()) { "no clean labeled rows in ${sessionDir.absolutePath}" }
    // Eine EXPORTIERTE Aufnahme traegt `board` in der Zeile und hat kein `frames/` mehr; ohne
    // diese Wache stirbt der Lauf am ersten Bild mit "could not decode .../frames/0000.png".
    require(File(sessionDir, "frames").isDirectory || rows.none { it.containsKey("board") }) {
        "${sessionDir.name} ist eine exportierte Aufnahme (boards/ statt frames/) — dafuer ist " +
            "`chesslab session pack --session ${sessionDir.name}`"
    }
    val fit = storedQuadFit(sessionDir)
    outDir.mkdirs()
    val partial = File(outDir, "packed_images.u8.partial")
    val digest = MessageDigest.getInstance("SHA-256")
    val paths = StringBuilder("[")
    var crops = 0
    var acceptedFrames = 0
    var handFrames = 0
    var fittedFrames = 0
    var meshFrames = 0
    File(outDir, "manifest.jsonl").bufferedWriter().use { rowsOut ->
        FileOutputStream(partial).use { imageOut ->
            for (row in rows) {
                val imageFile = File(sessionDir, row.getValue("frame").jsonPrimitive.content)
                val frame = Imgcodecs.imread(imageFile.absolutePath)
                require(!frame.empty()) { "could not decode ${imageFile.absolutePath}" }
                try {
                    val fitted = fit[row.frameStem()]
                    val quad = fitted?.corners ?: row.corners()
                    val geometry = storedGeometry(fitted, quad)
                    val raw = warpBoardForCrops(frame, geometry, cornersFromFlat(quad))
                    // Straight FIRST, whole raster, exactly as the board store is written: the cuts
                    // below are plain rectangles and cannot take a bow out on their own any more.
                    val warped =
                        fitted?.mesh?.let {
                            straightenBoard(raw, it, geometry.boardSize, cropBorderPx(geometry))
                                .also { raw.release() }
                        } ?: raw
                    try {
                        if (isHandShape(gridOccludedSquares(warped, geometry, cropBorderPx(geometry)))) {
                            handFrames++
                            continue
                        }
                        crops += writeLabeledFrame(imageOut, rowsOut, paths, digest, id, row, warped, geometry, overrides)
                        acceptedFrames++
                        if (fitted != null) fittedFrames++
                        if (fitted?.mesh != null) meshFrames++
                    } finally {
                        warped.release()
                    }
                } finally {
                    frame.release()
                }
            }
        }
    }
    require(acceptedFrames > 0) { "all ${rows.size} stored frames were rejected as occluded" }
    val image = File(outDir, "packed_images.u8")
    check(partial.renameTo(image)) { "could not finalize ${image.absolutePath}" }
    paths.append(']')
    File(outDir, "packed_meta.json").writeText(
        "{\"n\":$crops,\"h\":$PACK_CROP_SIDE,\"w\":$PACK_CROP_SIDE," +
            "\"source\":\"${json(sessionDir.absolutePath)}\",\"session_id\":\"${json(id)}\"," +
            "\"stored_frames\":${rows.size},\"accepted_frames\":$acceptedFrames," +
            "\"grid_hand_rejected\":$handFrames,\"occluded_frames_excluded\":${occludedFrames.size}," +
            // Per PACKED frame, so the sweep report can weigh a run by what its crops were cut with.
            "\"quad_source\":\"${if (fittedFrames > 0) "grid-fit" else "marker"}\"," +
            "\"fitted_frames\":$fittedFrames,\"marker_frames\":${acceptedFrames - fittedFrames}," +
            "\"mesh_frames\":$meshFrames," +
            "\"digest\":\"${digestHex(digest)}\",\"paths\":$paths}\n",
    )
    println(
        "packed $crops labeled 13-class crops from $acceptedFrames stored frames " +
            "(grid-hand $handFrames, quads: $fittedFrames grid-fit / ${acceptedFrames - fittedFrames} marker, " +
            "$meshFrames mesh-cut) -> ${outDir.absolutePath}",
    )
}

private fun selectStoredRows(
    log: File,
    occludedFrames: Set<String>,
): List<JsonObject> =
    Jsonl.rows(log).mapNotNull { row ->
        if (row["dirty"]?.jsonPrimitive?.booleanOrNull == true || row.frameStem() in occludedFrames) null else row
    }

@Suppress("LongParameterList", "NestedBlockDepth", "LoopWithTooManyJumpStatements")
private fun writeLabeledFrame(
    imageOut: FileOutputStream,
    rowsOut: Appendable,
    paths: StringBuilder,
    digest: MessageDigest,
    id: String,
    row: JsonObject,
    warped: org.opencv.core.Mat,
    geometry: BoardGeometry,
    overrides: Map<String, Map<String, String>>,
): Int {
    val fen = row.getValue("fen").jsonPrimitive.content
    val labels = expectedLabels(Board().apply { loadFromFen(fen) })
    val unknown = row.stringSet("unknown_squares")
    val stem = row.frameStem()
    val frameOverrides = overrides[stem].orEmpty()
    var written = 0
    for (square in ALL_SQUARES) {
        if (square in unknown) continue
        val label = frameOverrides[square] ?: labels.getValue(square)
        if (label == "occluded") continue
        val crop = cropSquare(warped, square, geometry)
        try {
            val packed = resizeForPacking(crop)
            try {
                val data = ByteArray(PACK_CROP_BYTES)
                packed.get(0, 0, data)
                bgrToRgbInPlace(data)
                imageOut.write(data)
            } finally {
                packed.release()
            }
        } finally {
            crop.release()
        }
        val path = "mm://$id/$stem/$square"
        rowsOut.append(manifestRow(path, id, stem, square, label)).append('\n')
        if (paths.length > 1) paths.append(',')
        paths.append('"').append(json(path)).append('"')
        updateDigest(digest, path, label)
        written++
    }
    return written
}

private fun updateDigest(
    digest: MessageDigest,
    path: String,
    label: String,
) {
    digest.update(path.toByteArray(UTF_8))
    digest.update(byteArrayOf(0))
    digest.update(label.toByteArray(UTF_8))
    digest.update(byteArrayOf(0))
    digest.update("[$PACK_CROP_SIDE, $PACK_CROP_SIDE]".toByteArray(UTF_8))
    digest.update(byteArrayOf('\n'.code.toByte()))
}

private fun selectRows(
    log: File,
    every: Int,
    occludedFrames: Set<String>,
): List<Pair<Int, JsonObject>> {
    var last = -every
    return Jsonl.rows(log).mapNotNull { row ->
        val frame = row.frameStem()
        val number = frame.toInt()
        if (row["dirty"]?.jsonPrimitive?.booleanOrNull == true || frame in occludedFrames || number - last < every) {
            null
        } else {
            last = number
            number to row
        }
    }
}

/**
 * Das Korrekturen-Ledger als `frame -> square -> label`, in Zeilenreihenfolge.
 *
 * `retract: true` ist ein GRABSTEIN und traegt sein altes `label` weiter: wer nur `square -> label`
 * sammelt, packt ein zurueckgenommenes Label ins Trainingsmaterial (`labeling.load_corrections`).
 */
internal fun correctionMap(
    file: File,
    session: String,
): Map<String, Map<String, String>> {
    val out = linkedMapOf<String, MutableMap<String, String>>()
    for (row in Jsonl.rows(file)) {
        if (row["session_id"]?.jsonPrimitive?.content != session) continue
        val frame = row["frame"]!!.jsonPrimitive.content
        val square = row["square"]!!.jsonPrimitive.content
        if (row["retract"]?.jsonPrimitive?.booleanOrNull == true) {
            out[frame]?.remove(square)
        } else {
            out.getOrPut(frame) { linkedMapOf() }[square] = row["label"]!!.jsonPrimitive.content
        }
    }
    out.entries.removeIf { it.value.isEmpty() }
    return out
}

private fun JsonObject.frameStem(): String = File(getValue("frame").jsonPrimitive.content).nameWithoutExtension

private fun JsonObject.corners(): FloatArray =
    getValue("corners").jsonArray.flatMap { point -> point.jsonArray.map { it.jsonPrimitive.content.toFloat() } }.toFloatArray()

private fun JsonObject.stringSet(name: String): Set<String> =
    get(name)
        ?.jsonArray
        ?.map { it.jsonPrimitive.content }
        ?.toSet()
        .orEmpty()

private fun manifestRow(
    path: String,
    id: String,
    frame: String,
    square: String,
    label: String,
): String =
    "{\"path\":\"${json(path)}\",\"session_id\":\"${json(id)}\",\"frame\":\"$frame\"," +
        "\"square\":\"$square\",\"label\":\"$label\",\"out_size\":[$PACK_CROP_SIDE,$PACK_CROP_SIDE]," +
        "\"pad_side\":0.05}"

private fun List<String>.option(name: String): String? = firstOrNull { it.startsWith("$name=") }?.substringAfter('=')

private fun List<String>.optionInt(
    name: String,
    fallback: Int,
): Int = option(name)?.toIntOrNull() ?: fallback

private fun String.fileArg(): File = File(replace('~', ' '))

private fun labeledUsage(): Nothing =
    error("usage: labeled-video-pack <video> <log.jsonl> <corrections.jsonl> <outDir> [every=N] [id=name]")

private fun labeledSessionUsage(): Nothing = error("usage: labeled-session-pack <sessionDir> <outDir> [corrections=file] [id=name]")

private fun occlusionUsage(): Nothing = error("usage: occlusion-video-pack <video> <log> <corrections> <outDir> [session=name] [id=name]")
