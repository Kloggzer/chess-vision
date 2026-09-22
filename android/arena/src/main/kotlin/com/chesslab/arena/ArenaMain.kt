package com.chesslab.arena

import com.chesslab.tracker.io.Jsonl
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import org.opencv.imgcodecs.Imgcodecs
import java.io.File
import java.util.Locale

/**
 * `arena <verb> …` — the whole environment.
 *
 *   arena list
 *   arena models
 *   arena run <recording> [tracker=<fqcn>] [model=<name>] [align=N] [limit=N] [out=<file>]
 *   arena score <plies.jsonl> <recording>
 *   arena dump <recording> [every=N] [model=<name>] [out=<file>]
 */
fun main(args: Array<String>) {
    NativeCv.require()
    val rest = args.drop(1)
    when (args.firstOrNull()) {
        "list" -> listRecordings()
        "models" -> listModels()
        "run" -> runVerb(rest)
        "score" -> scoreVerb(rest)
        "dump" -> dumpVerb(rest)
        "board" -> boardVerb(rest)
        else -> error("usage: arena list | models | board <rec> | run <rec> [tracker=…] | score <plies> <rec> | dump <rec>")
    }
}

/** Everything the arena can play, and whether it has a reference to be judged against. */
private fun listRecordings() {
    val dirs =
        RECORDINGS
            .listFiles()
            ?.filter { File(it, "video.mp4").isFile }
            ?.sortedBy { it.name }
            .orEmpty()
    check(dirs.isNotEmpty()) { "no recordings under ${RECORDINGS.absolutePath}" }
    for (dir in dirs) {
        val truth = runCatching { truthOf(dir).size }.getOrNull()
        val mb = File(dir, "video.mp4").length() / BYTES_PER_MB
        println("%-24s %5d MB  %s".format(dir.name, mb, truth?.let { "$it plies" } ?: "NO REFERENCE"))
    }
}

/**
 * The models on offer, each with what its OWN evaluation says about it — measured on that run's
 * test split, so it describes the classifier and never a tracker built on it.
 */
private fun listModels() {
    for (name in COVERAGE_MODELS) {
        println(name + if (name == DEFAULT_MODEL) "  (default)" else "")
        val card = modelCard(name)
        if (card == null) {
            println("    no card under ${MODEL_CARDS.path}/$name — copy it in to read the numbers here")
            continue
        }
        for (line in card.lines(WEAKEST_SHOWN)) println("    $line")
    }
}

private fun runVerb(args: List<String>) {
    val name = args.firstOrNull() ?: error("usage: arena run <recording> [tracker=…] [model=…] [align=N] [limit=N]")
    val opts = options(args.drop(1))
    val dir = recordingDir(name)
    val out = File(opts["out"] ?: "../../tmp/arena/$name/plies.jsonl")
    val models = Models(opts["model"] ?: DEFAULT_MODEL)

    val result =
        models.use {
            newTracker(opts["tracker"] ?: DEFAULT_TRACKER).use { tracker ->
                runTracker(
                    video = File(dir, "video.mp4"),
                    tracker = tracker,
                    models = models,
                    alignEvery = opts["align"]?.toIntOrNull() ?: DEFAULT_ALIGN,
                    limit = opts["limit"]?.toLongOrNull() ?: Long.MAX_VALUE,
                    onProgress = { if (it % PROGRESS_EVERY == 0L) println("  frame $it") },
                )
            }
        }
    writePlies(out, result)
    println(
        "$name · ${result.frames} frames in ${fixed(result.seconds, SECONDS_DIGITS)}s · " +
            "reads: ${models.summary()} · ${result.plies.size} plies -> ${out.path}",
    )
    if (result.illegal.isNotEmpty()) {
        println("REFUSED ${result.illegal.size} illegal moves: ${result.illegal.take(ILLEGAL_SHOWN)}")
    }
    report(truthOf(dir), result.plies)
}

/** Score a ply list produced anywhere — including by a tracker written outside this JVM. */
private fun scoreVerb(args: List<String>) {
    require(args.size >= 2) { "usage: arena score <plies.jsonl> <recording>" }
    report(truthOf(recordingDir(args[1])), readPlies(File(args[0])))
}

/**
 * Durch [Jsonl], nicht durch eine Regex auf rohen Zeilen: dort wurde eine kaputte Zeile MITTENDRIN
 * zu einem Ply mit `frame = -1` — dem Wert, der sonst "nicht gemessen" heisst.
 */
internal fun readPlies(file: File): List<RunPly> =
    Jsonl.rows(file).map { row ->
        RunPly(
            san = row["san"]?.jsonPrimitive?.contentOrNull ?: error("no san in: $row"),
            frame = row["frame"]?.jsonPrimitive?.longOrNull ?: -1,
            tsMs = 0.0,
        )
    }

/**
 * `dump` — the model's per-frame reading of the board as text, for a tracker that is not written
 * in Kotlin. One row per sampled frame: index, timestamp, and 64 rows of probabilities.
 */
private fun dumpVerb(args: List<String>) {
    val name = args.firstOrNull() ?: error("usage: arena dump <recording> [every=N] [model=…] [out=<file>]")
    val opts = options(args.drop(1))
    val every = opts["every"]?.toIntOrNull() ?: DEFAULT_DUMP_EVERY
    val out = File(opts["out"] ?: "../../tmp/arena/$name/reads.jsonl")
    out.parentFile?.mkdirs()
    val models = Models(opts["model"] ?: DEFAULT_MODEL)

    models.use {
        out.bufferedWriter().use { writer ->
            writer.write(header(models.of(models.default), every))
            writer.newLine()
            val result =
                runTracker(
                    video = File(recordingDir(name), "video.mp4"),
                    tracker =
                        DumpTracker(every) { frame, rows ->
                            writer.write(row(frame, rows))
                            writer.newLine()
                        },
                    models = models,
                    limit = opts["limit"]?.toLongOrNull() ?: Long.MAX_VALUE,
                    onProgress = { if (it % PROGRESS_EVERY == 0L) println("  frame $it") },
                )
            println("dumped ${result.reads} reads of ${result.frames} frames -> ${out.path}")
        }
    }
}

/**
 * `board` — one rectified board as a picture, with the grid and the corner squares drawn on it.
 *
 * The plain warp goes beside it, so what the annotation adds is visible and what a tracker
 * actually receives is not confused with it.
 */
private fun boardVerb(args: List<String>) {
    val name = args.firstOrNull() ?: error("usage: arena board <recording> [frame=N] [size=N] [out=<dir>]")
    val opts = options(args.drop(1))
    val at = opts["frame"]?.toLongOrNull() ?: DEFAULT_SHOT_FRAME
    val size = opts["size"]?.toIntOrNull()
    val out = File(opts["out"] ?: "../../tmp/arena/$name").apply { mkdirs() }
    val models = Models(opts["model"] ?: DEFAULT_MODEL)

    models.use {
        runTracker(
            video = File(recordingDir(name), "video.mp4"),
            tracker =
                ShotTracker(at) { frame ->
                    val board = frame.board(size) ?: error("no board on frame $at of $name")
                    val geom = requireNotNull(frame.geometry()) { "no geometry on frame $at" }
                    Imgcodecs.imwrite(File(out, "board-$at.png").path, board)
                    val marked = annotate(board, geom)
                    Imgcodecs.imwrite(File(out, "board-$at-grid.png").path, marked)
                    println(
                        "frame $at · board ${board.cols()}x${board.rows()} px · boardSize ${geom.boardSize} · " +
                            "cell ${fixed(geom.cell, 1)} px · padSide ${geom.padSide} · crop ${geom.outW}x${geom.outH}",
                    )
                    println("wrote ${File(out, "board-$at.png").path} and board-$at-grid.png")
                    board.release()
                    marked.release()
                },
            models = models,
            limit = at + 1,
        )
    }
}

/** Runs to one frame, hands it over, commits nothing. */
private class ShotTracker(
    private val at: Long,
    private val shoot: (FrameView) -> Unit,
) : ArenaTracker {
    override fun onFrame(frame: FrameView): List<String> {
        if (frame.index == at) shoot(frame)
        return emptyList()
    }
}

private fun header(
    vision: Vision,
    every: Int,
): String =
    """{"_model": "${vision.model}", "_classes": ${vision.classes.joinToString(",", "[", "]") { "\"$it\"" }}, """ +
        """"_coverageOutput": ${vision.coverageOutput}, "_coverageGate": ${vision.coverageGate}, "_every": $every}"""

private fun row(
    frame: FrameView,
    rows: Array<FloatArray>,
): String =
    """{"frame": ${frame.index}, "tsMs": ${fixed(frame.tsMs, MS_DIGITS)}, "squares": """ +
        rows.joinToString(",", "[", "]") { r -> r.joinToString(",", "[", "]") { fixed(it.toDouble(), PROB_DIGITS) } } +
        "}"

/** Reads every `every`-th frame and hands the rows to a sink. Commits nothing — it is not a tracker. */
private class DumpTracker(
    private val every: Int,
    private val sink: (FrameView, Array<FloatArray>) -> Unit,
) : ArenaTracker {
    override fun onFrame(frame: FrameView): List<String> {
        if (frame.index % every == 0L) frame.squares()?.let { sink(frame, it) }
        return emptyList()
    }
}

private fun report(
    truth: List<TruthPly>,
    plies: List<RunPly>,
) {
    val scored = score(truth, plies)
    println("score vs ${truth.size} reference plies — $scored")
    for (ply in scored.missed) println("  missed   %-8s reference frame %6d".format(ply.san, ply.frame))
    for (ply in scored.invented) println("  INVENTED %-8s run frame %6d".format(ply.san, ply.frame))
    for (ply in scored.beyond) println("  beyond   %-8s run frame %6d  (reference ends before this)".format(ply.san, ply.frame))
}

private fun options(words: List<String>): Map<String, String> = words.associate { it.substringBefore('=') to it.substringAfter('=', "") }

private fun newTracker(fqcn: String): ArenaTracker = Class.forName(fqcn).getDeclaredConstructor().newInstance() as ArenaTracker

private fun recordingDir(name: String): File =
    File(RECORDINGS, name).also { check(File(it, "video.mp4").isFile) { "no video at ${it.absolutePath}/video.mp4" } }

/** The arena's working directory is `android/arena`; the corpus lives at the repository root. */
private val RECORDINGS = File("../../data/recordings")

/**
 * Numbers in a machine-read file are never locale-formatted: a German JVM writes `0,5` and the row
 * stops being JSON. Measured the hard way on the first dump this arena ever produced.
 */
fun fixed(
    value: Double,
    digits: Int,
): String = String.format(Locale.ROOT, "%.${digits}f", value)

private const val DEFAULT_TRACKER = "com.chesslab.arena.agent.YourTracker"
private const val DEFAULT_ALIGN = 30
private const val DEFAULT_DUMP_EVERY = 3
private const val PROGRESS_EVERY = 1000L
private const val ILLEGAL_SHOWN = 10
private const val DEFAULT_SHOT_FRAME = 60L
private const val WEAKEST_SHOWN = 4
private const val SECONDS_DIGITS = 1
private const val MS_DIGITS = 1
private const val PROB_DIGITS = 4
private const val BYTES_PER_MB = 1024L * 1024L
