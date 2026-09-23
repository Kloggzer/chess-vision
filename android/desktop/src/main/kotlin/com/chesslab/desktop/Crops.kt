@file:Suppress("TooManyFunctions")

package com.chesslab.desktop

import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.cnn.expectedLabels
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.cropBorderPx
import com.chesslab.geometry.cropSquare
import com.chesslab.geometry.gridOccludedSquares
import com.chesslab.geometry.straightenBoard
import com.chesslab.geometry.warpBoardForCrops
import com.chesslab.tracker.geometry.boardGeometryFor
import com.chesslab.tracker.geometry.quadOf
import com.chesslab.tracker.io.Jsonl
import com.github.bhlangonijr.chesslib.Board
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgcodecs.Imgcodecs
import org.opencv.imgproc.Imgproc
import java.awt.image.BufferedImage
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.nio.charset.StandardCharsets.UTF_8
import java.security.MessageDigest
import javax.imageio.ImageIO

/** `crops <video> <outDir> [frames=<file>|every=N] [out=WxH]` — for PARITY with `labeling.py`: a crop box of
 *  120 px against the served 110 once invalidated a whole measurement. The QUAD goes into the receipt so both
 *  sides cut with the same corners. */
fun cropsOfVideo(args: List<String>) {
    val video = File(args.getOrNull(0) ?: error("usage: crops <video> <outDir> [frames=<f>|every=N] [out=WxH]"))
    val outDir = File(args.getOrNull(1) ?: error("usage: crops <video> <outDir> [frames=<f>|every=N] [out=WxH]"))
    val rest = args.drop(2)
    val every = rest.intOption("every", CROPS_EVERY)
    val out = rest.stringOption("out")?.split("x")
    val wanted = frameList(rest)
    check(video.isFile) { "no such video: ${video.absolutePath}" }
    outDir.mkdirs()

    val quads = StringBuilder()
    val written = openRecording(video).use { cutEach(it, outDir, every, wanted, out, quads) }

    File(outDir, "crops.jsonl").writeText(quads.toString())
    println("cut ${written * ALL_SQUARES.size} crops from $written frames -> ${outDir.absolutePath}")
}

private fun cutEach(
    source: FrameSource,
    outDir: File,
    every: Int,
    wanted: Set<Int>?,
    out: List<String>?,
    quads: StringBuilder,
): Int {
    var index = 0
    var written = 0
    while (true) {
        val frame = source.next() ?: break
        val at = index
        index += 1
        val due = if (wanted != null) at in wanted else at % every == 0
        val quad = if (due) quadOf(frame) else null
        if (quad != null) {
            val base = boardGeometryFor(quad)
            val geom = if (out == null) base else base.copy(outW = out[0].toInt(), outH = out[1].toInt())
            val warped = warpBoardForCrops(frame, geom, cornersFromFlat(quad))
            val stem = at.toString().padStart(STEM_DIGITS, '0')
            for (square in ALL_SQUARES) {
                Imgcodecs.imwrite(File(outDir, "${stem}_$square.png").path, cropSquare(warped, square, geom))
            }
            quads.append("{\"frame\": $at, \"quad\": ${quad.joinToString(",", "[", "]")}, ")
            quads.append("\"boardSize\": ${geom.boardSize}, \"padSide\": ${geom.padSide}, ")
            quads.append("\"outW\": ${geom.outW}, \"outH\": ${geom.outH}}")
            quads.append(System.lineSeparator())
            written += 1
        }
    }
    return written
}

private const val CROPS_EVERY = 400

private const val PROBE_ARGS = 5

/** `probe-crop <log.jsonl> <framesDir> <stem> <square> <outDir>` — the pack's own warp and cut, so a probe
 *  shows TRAINING pixels, never a Python approximation. */
fun probeCrop(args: List<String>) {
    require(args.size >= PROBE_ARGS) { "usage: probe-crop <log.jsonl> <framesDir> <stem> <square> <outDir>" }
    val log = args[0].fileArg()
    val framesDir = args[1].fileArg()
    val stem = args[2]
    val square = args[3]
    val outDir = args[4].fileArg().apply { mkdirs() }
    val row = Jsonl.rows(log).first { File(it.getValue("frame").jsonPrimitive.content).nameWithoutExtension == stem }
    val logged =
        row
            .getValue("corners")
            .jsonArray
            .flatMap { point -> point.jsonArray.map { it.jsonPrimitive.content.toFloat() } }
            .toFloatArray()
    val frameFile =
        listOf("png", "jpg").map { File(framesDir, "$stem.$it") }.firstOrNull { it.isFile }
            ?: error("no frame $stem under $framesDir")
    val frame = Imgcodecs.imread(frameFile.absolutePath)
    require(!frame.empty()) { "no frame $stem under $framesDir" }
    val fitted = storedQuadFit(log.absoluteFile.parentFile)[stem]
    val quad = fitted?.corners ?: logged
    val geometry = storedGeometry(fitted, quad)
    val mesh = fitted?.mesh
    val stage =
        when {
            mesh == null -> "none"
            mesh.tx == null -> "scalar"
            mesh.cx == null -> "perspective"
            else -> "curved"
        }
    val warped = warpBoardForCrops(frame, geometry, cornersFromFlat(quad))
    Imgcodecs.imwrite(File(outDir, "warped.png").path, warped)
    Imgcodecs.imwrite(File(outDir, "cell.png").path, cropSquare(warped, square, geometry))
    mesh?.let {
        val pulled = straightenBoard(warped, it, geometry.boardSize, cropBorderPx(geometry))
        Imgcodecs.imwrite(File(outDir, "cell-mesh.png").path, cropSquare(pulled, square, geometry))
        pulled.release()
    }
    File(outDir, "probe.json").writeText(
        "{\"boardSize\":${geometry.boardSize},\"outW\":${geometry.outW},\"outH\":${geometry.outH}," +
            "\"padSide\":${geometry.padSide}," +
            "\"border\":${cropBorderPx(geometry)}," +
            "\"quad\":\"${if (fitted == null) "marker" else "grid-fit"}\"," +
            "\"mesh\":\"$stage\"}\n",
    )
    println(
        "probe-crop $stem/$square: quad=${if (fitted == null) "marker" else "grid-fit"} " +
            "mesh=$stage boardSize=${geometry.boardSize} " +
            "out=${geometry.outW}x${geometry.outH} -> ${outDir.absolutePath}",
    )
}

/** `turntable-preview <packDir> <out.png>` — an 8x8 contact sheet of the pack's first clean board. */
fun previewTurntablePack(args: List<String>) {
    val pack = File(args.getOrNull(0) ?: previewUsage())
    val out = File(args.getOrNull(1) ?: previewUsage())
    val data = File(pack, "packed_images.u8")
    require(data.isFile) { "no packed memmap: ${data.absolutePath}" }
    require(!out.exists()) { "refusing to overwrite preview: ${out.absolutePath}" }
    val image = BufferedImage(PREVIEW_SIDE, PREVIEW_SIDE, BufferedImage.TYPE_INT_RGB)
    val crop = ByteArray(PACK_CROP_BYTES)
    FileInputStream(data).use { input ->
        for (index in ALL_SQUARES.indices) {
            require(input.readNBytes(crop, 0, crop.size) == crop.size) { "pack ends before first board" }
            putRgbCrop(image, crop, index)
        }
    }
    out.parentFile?.mkdirs()
    check(ImageIO.write(image, "png", out)) { "no PNG writer available" }
    println("previewed first clean board -> ${out.absolutePath}")
}

private fun previewUsage(): Nothing = error("usage: turntable-preview <packDir> <out.png>")

private fun putRgbCrop(
    sheet: BufferedImage,
    data: ByteArray,
    index: Int,
) {
    val col = index % BOARD_SIDE
    val row = BOARD_SIDE - 1 - index / BOARD_SIDE
    for (y in 0 until PACK_CROP_SIDE) {
        for (x in 0 until PACK_CROP_SIDE) {
            val at = (y * PACK_CROP_SIDE + x) * BGR_CHANNELS
            val rgb =
                ((data[at].toInt() and 0xff) shl 16) or
                    ((data[at + 1].toInt() and 0xff) shl 8) or
                    (data[at + 2].toInt() and 0xff)
            sheet.setRGB(col * PACK_CROP_SIDE + x, row * PACK_CROP_SIDE + y, rgb)
        }
    }
}

/** `turntable-pack <video> <fen> <outDir> [every=N] [max=N] [id=name]` — a frame is admitted only when the
 *  per-frame quad and the grid-groove hand sensor both say it is clean. */
@Suppress("LongMethod", "CyclomaticComplexMethod", "NestedBlockDepth", "LoopWithTooManyJumpStatements")
fun packTurntableVideo(args: List<String>) {
    // Gradle's `--args` tokenizes on spaces: `~` spells a space in paths.
    val video = (args.getOrNull(0) ?: packUsage()).fileArg()
    // `_` spells a FEN field separator; the metadata records the canonical FEN.
    val fen = (args.getOrNull(1) ?: packUsage()).replace('_', ' ')
    val outDir = File(args.getOrNull(2) ?: packUsage())
    val rest = args.drop(3)
    val every = rest.intOption("every", TURN_TABLE_EVERY)
    val maxFrames = rest.intOption("max", TURN_TABLE_MAX_FRAMES)
    val id = rest.stringOption("id") ?: video.nameWithoutExtension
    require(video.isFile) { "no such video: ${video.absolutePath}" }
    require(every >= 1 && maxFrames >= 1) { "every and max must both be at least 1" }
    require(!outDir.exists()) { "refusing to overwrite existing pack: ${outDir.absolutePath}" }
    val labels = expectedLabels(Board().apply { loadFromFen(fen) })
    outDir.mkdirs()
    val partial = File(outDir, "packed_images.u8.partial")
    val manifest = StringBuilder()
    val paths = StringBuilder("[")
    val digest = MessageDigest.getInstance("SHA-256")
    var decoded = 0
    var noBoard = 0
    var hand = 0
    var accepted = 0
    FileOutputStream(partial).use { bytes ->
        openRecording(video).use { source ->
            while (accepted < maxFrames) {
                val frame = source.next() ?: break
                val frameNo = decoded++
                if (frameNo % every != 0) continue
                val quad = quadOf(frame)
                if (quad == null) {
                    noBoard++
                    continue
                }
                val geom = boardGeometryFor(quad)
                val warped = warpBoardForCrops(frame, geom, cornersFromFlat(quad))
                try {
                    if (isHandShape(gridOccludedSquares(warped, geom, cropBorderPx(geom)))) {
                        hand++
                        continue
                    }
                    val stem = frameNo.toString().padStart(STEM_DIGITS, '0')
                    for (square in ALL_SQUARES) {
                        val crop = cropSquare(warped, square, geom)
                        try {
                            val packed = resizeForPacking(crop)
                            try {
                                val data = ByteArray(PACK_CROP_BYTES)
                                packed.get(0, 0, data)
                                bgrToRgbInPlace(data)
                                bytes.write(data)
                            } finally {
                                packed.release()
                            }
                        } finally {
                            crop.release()
                        }
                        val path = "mm://$id/$stem/$square"
                        manifest.append(turntableRow(path, id, stem, square, labels.getValue(square), geom)).append('\n')
                        if (paths.length > 1) paths.append(',')
                        paths.append('"').append(json(path)).append('"')
                        digest.update(path.toByteArray(UTF_8))
                        digest.update(NUL)
                        digest.update(labels.getValue(square).toByteArray(UTF_8))
                        digest.update(NUL)
                        digest.update("[$PACK_CROP_SIDE, $PACK_CROP_SIDE]".toByteArray(UTF_8))
                        digest.update(NEWLINE)
                    }
                    accepted++
                } finally {
                    warped.release()
                }
            }
        }
    }
    require(accepted > 0) { "no clean frame: board missed=$noBoard, grid-hand=$hand" }
    val image = File(outDir, "packed_images.u8")
    check(partial.renameTo(image)) { "could not finalize ${image.absolutePath}" }
    File(outDir, "manifest.jsonl").writeText(manifest.toString())
    paths.append(']')
    File(outDir, "packed_meta.json").writeText(
        "{\"n\":${accepted * ALL_SQUARES.size},\"h\":$PACK_CROP_SIDE,\"w\":$PACK_CROP_SIDE," +
            "\"source\":\"${json(video.absolutePath)}\",\"session_id\":\"${json(id)}\"," +
            "\"fen\":\"${json(fen)}\",\"every\":$every,\"max\":$maxFrames," +
            "\"decoded\":$decoded,\"board_missed\":$noBoard,\"grid_hand_rejected\":$hand," +
            "\"accepted_frames\":$accepted,\"digest\":\"${digestHex(digest)}\",\"paths\":$paths}\n",
    )
    println(
        "packed ${accepted * ALL_SQUARES.size} crops from $accepted clean frames " +
            "(board missed $noBoard, grid-hand rejected $hand) -> ${outDir.absolutePath}",
    )
}

private fun packUsage(): Nothing = error("usage: turntable-pack <video> <fen> <outDir> [every=N] [max=N] [id=name]")

/** Grid flags are a hand only when at least two orthogonally neighbouring cells are flagged. */
@Suppress("MagicNumber")
internal fun isHandShape(bits: Long): Boolean =
    ALL_SQUARES.anyIndexed { index, square ->
        if ((bits and (1L shl index)) == 0L) return@anyIndexed false
        val file = square[0] - 'a'
        val rank = square[1] - '1'
        listOf(file - 1 to rank, file + 1 to rank, file to rank - 1, file to rank + 1).any { (f, r) ->
            f in 0..7 && r in 0..7 && (bits and (1L shl (r * 8 + f))) != 0L
        }
    }

private inline fun <T> Iterable<T>.anyIndexed(predicate: (Int, T) -> Boolean): Boolean {
    forEachIndexed { index, value -> if (predicate(index, value)) return true }
    return false
}

internal fun bgrToRgbInPlace(data: ByteArray) {
    for (i in data.indices step BGR_CHANNELS) {
        val blue = data[i]
        data[i] = data[i + 2]
        data[i + 2] = blue
    }
}

internal fun resizeForPacking(crop: Mat): Mat =
    Mat().also {
        Imgproc.resize(crop, it, Size(PACK_CROP_SIDE.toDouble(), PACK_CROP_SIDE.toDouble()), 0.0, 0.0, Imgproc.INTER_AREA)
    }

private fun turntableRow(
    path: String,
    id: String,
    frame: String,
    square: String,
    label: String,
    geom: com.chesslab.geometry.BoardGeometry,
): String =
    "{\"path\":\"${json(path)}\",\"session_id\":\"${json(id)}\",\"frame\":\"$frame\"," +
        "\"square\":\"$square\",\"label\":\"$label\",\"out_size\":[$PACK_CROP_SIDE,$PACK_CROP_SIDE]," +
        "\"pad_side\":${geom.padSide}}"

internal fun json(value: String): String = value.replace("\\", "\\\\").replace("\"", "\\\"")

@Suppress("MagicNumber")
internal fun digestHex(digest: MessageDigest): String =
    digest.digest().joinToString("") { "%02x".format(it.toInt() and 0xff) }.take(DIGEST_CHARS)

private const val TURN_TABLE_EVERY = 150

private const val TURN_TABLE_MAX_FRAMES = 32

private const val BGR_CHANNELS = 3

private const val BOARD_SIDE = 8

internal const val PACK_CROP_SIDE = 80

internal const val PACK_CROP_BYTES = PACK_CROP_SIDE * PACK_CROP_SIDE * BGR_CHANNELS

private const val PREVIEW_SIDE = PACK_CROP_SIDE * BOARD_SIDE

private const val DIGEST_CHARS = 32

private val NUL = byteArrayOf(0)

private val NEWLINE = byteArrayOf('\n'.code.toByte())
