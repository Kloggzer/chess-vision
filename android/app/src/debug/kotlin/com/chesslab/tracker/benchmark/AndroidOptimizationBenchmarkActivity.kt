package com.chesslab.tracker.benchmark

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import ai.onnxruntime.providers.NNAPIFlags
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Rect
import android.media.Image
import android.os.Bundle
import android.util.Log
import androidx.camera.core.ImageInfo
import androidx.camera.core.ImageProxy
import androidx.camera.core.impl.TagBundle
import androidx.camera.core.impl.utils.ExifData
import com.chesslab.cnn.preprocessInto
import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.BoardMarkerDetector
import com.chesslab.geometry.GridCoverage
import com.chesslab.geometry.HomographyCache
import com.chesslab.geometry.SquareCropper
import com.chesslab.geometry.allSquares
import com.chesslab.geometry.cropBorderPx
import com.chesslab.geometry.gridOccludedSquares
import com.chesslab.geometry.toBgrImage
import com.chesslab.geometry.warpBoardForCrops
import com.chesslab.geometry.warpFromCorners
import com.chesslab.tracker.perf.RecordingWorkProbe
import com.chesslab.tracker.pipeline.YuvToBgr
import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Scalar
import org.opencv.imgproc.Imgproc
import org.opencv.objdetect.Objdetect
import java.io.File
import java.nio.ByteBuffer
import java.nio.FloatBuffer
import java.util.EnumSet
import java.util.Locale
import kotlin.math.max
import kotlin.math.min
import kotlin.random.Random

/**
 * Debug-only, repeatable device benchmark for the optimisations shared with the Android tracker.
 *
 * It is an activity instead of an instrumentation test because HyperOS may reject installation of
 * a second test APK. Launching it force-stops the normal tracker first; it writes only logcat and a
 * temporary model copy below `filesDir/android-perf-bench`, which it removes before returning.
 */
class AndroidOptimizationBenchmarkActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val only = intent?.getStringExtra("only")
        val soak = intent?.getIntExtra("soak", 0) ?: 0
        val secs = intent?.getIntExtra("secs", SOAK_SECONDS) ?: SOAK_SECONDS
        val rounds = intent?.getIntExtra("rounds", ARCH_ROUNDS) ?: ARCH_ROUNDS
        val threads = intent?.getIntExtra("threads", CNN_BENCH_THREADS) ?: CNN_BENCH_THREADS
        Thread({ runBenchmark(only, soak, secs, rounds, threads) }, "chesslab-android-benchmark").start()
    }

    private fun runBenchmark(
        only: String?,
        soak: Int,
        secs: Int,
        rounds: Int,
        threads: Int,
    ) {
        val runner = AndroidOptimizationBenchmark(this)
        Log.i(TAG, "START device=${android.os.Build.MODEL} battery=${runner.batteryLine()}")
        val work = {
            when {
                soak > 0 -> runner.cnnSoak(soak, secs)
                only == "cnnsize" -> runner.cnnInputSize()
                only == "arch" -> runner.archBench(rounds, threads)
                else -> runner.run()
            }
        }
        runCatching(work)
            .onFailure { Log.e(TAG, "FAILED", it) }
            .onSuccess { Log.i(TAG, "DONE battery=${runner.batteryLine()}") }
        runOnUiThread(::finish)
    }
}

private class AndroidOptimizationBenchmark(
    private val context: Context,
) {
    fun run() {
        qhdYuvConversion()
        markerDetectorReuse()
        medianKernel()
        gridOcclusion()
        trackerHotPaths()
        cnnThreads()
    }

    /**
     * What an input size costs, weights held constant: the SAME untrained
     * `mobilenetv4_conv_small_035` exported at 80 and at 128, one batch of 64 crops each. Compute
     * only — the graphs carry no training, so accuracy is not the question here.
     */
    fun cnnInputSize() {
        // Pushed, not bundled: two graphs of the same run exported at both sizes are 5 MB of
        // artefact that belongs to the measurement, not to the APK.
        //   chesslab export --run <run> --format onnx --infer-size 80x80   (and 128x128)
        //   adb push model.onnx /sdcard/Android/data/com.chesslab.tracker/files/cnn_bench/model80.onnx
        val sizes = listOf(CNN_SIZE, CNN_SIZE_LARGE)
        // Zwei Orte, weil HyperOS der App nicht zeigt, was `adb push` in ihr EXTERNES
        // Datenverzeichnis legt (2026-08-27: Datei da, Rechte und SELinux stimmen, App sieht
        // nichts). Der interne Pfad ist ueber `run-as` befuellbar und immer sichtbar.
        val directory = benchModelDir(sizes) ?: return
        run {
            val environment = OrtEnvironment.getEnvironment()
            val sessions = sizes.associateWith { sessionAt(environment, File(directory, "model$it.onnx"), CNN_BENCH_THREADS) }
            val inputs = sizes.associateWith { cnnInput(environment, it) }
            try {
                repeat(CNN_WARMUP) {
                    for (size in sizes) {
                        sessions.getValue(size).run(mapOf("input" to inputs.getValue(size))).close()
                    }
                }
                val samples = sizes.associateWith { ArrayList<Double>(CNN_ROUNDS) }
                repeat(CNN_ROUNDS) { round ->
                    // Alternate the order so thermal drift lands on both, not on the second one.
                    for (size in if (round % 2 == 0) sizes else sizes.reversed()) {
                        samples.getValue(size) +=
                            elapsedMs { sessions.getValue(size).run(mapOf("input" to inputs.getValue(size))).close() }
                    }
                }
                for (size in sizes) report("mnv4-small-035 ${size}px batch=$CNN_BATCH threads=$CNN_BENCH_THREADS", samples.getValue(size))
                comparison("128px against 80px", samples.getValue(CNN_SIZE), samples.getValue(CNN_SIZE_LARGE))
            } finally {
                inputs.values.forEach(OnnxTensor::close)
                sessions.values.forEach(OrtSession::close)
            }
        }
    }

    /**
     * Was eine ARCHITEKTUR je Brett kostet, ohne Training: jedes `*.onnx` aus `cnn_bench/` gegen
     * dieselbe Batch von 64 Zufalls-Crops. Zwei Durchgaenge, weil der zweite die Drift-Probe ist —
     * liegt er neben dem ersten, hat das Telefon waehrend der Messung nicht gedrosselt.
     */
    fun archBench(
        rounds: Int,
        threads: Int,
    ) {
        val directory = archModelDir() ?: return
        val models = directory.listFiles { file: File -> file.name.endsWith(".onnx") }?.sortedBy { it.name }.orEmpty()
        if (models.isEmpty()) {
            Log.i(TAG, "arch bench skipped — kein *.onnx in $directory")
            return
        }
        val environment = OrtEnvironment.getEnvironment()
        Log.i(TAG, "arch bench: ${models.size} Graphen, $ARCH_PASSES Durchgaenge, $rounds Runden, $threads Threads")
        for (pass in 1..ARCH_PASSES) {
            for (model in models) {
                for (ep in if (model.name.endsWith(INT8_SUFFIX)) INT8_EPS else FP32_EPS) {
                    archOne(environment, model, ep, rounds, pass, threads)
                }
            }
        }
    }

    private fun archOne(
        environment: OrtEnvironment,
        model: File,
        ep: String,
        rounds: Int,
        pass: Int,
        threads: Int,
    ) {
        val label = "arch ${model.name.removeSuffix(".onnx")} $ep pass$pass"
        val session =
            try {
                archSession(environment, model, ep, threads)
            } catch (e: Exception) {
                Log.i(TAG, "$label: Sitzung nicht erstellt — ${e.javaClass.simpleName}: ${e.message}")
                return
            }
        val input = cnnInput(environment, archSize(model))
        try {
            val name = session.inputNames.first()
            repeat(CNN_WARMUP) { session.run(mapOf(name to input)).close() }
            val samples = List(rounds) { elapsedMs { session.run(mapOf(name to input)).close() } }
            report("$label batch=$CNN_BATCH threads=$threads [${batteryLine()}]", samples)
        } catch (e: Exception) {
            Log.i(TAG, "$label: Lauf gescheitert — ${e.javaClass.simpleName}: ${e.message}")
        } finally {
            input.close()
            session.close()
        }
    }

    private fun archSession(
        environment: OrtEnvironment,
        model: File,
        ep: String,
        threads: Int,
    ): OrtSession {
        val options = OrtSession.SessionOptions()
        options.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
        options.setExecutionMode(OrtSession.SessionOptions.ExecutionMode.SEQUENTIAL)
        options.setIntraOpNumThreads(threads)
        when (ep) {
            "nnapi" -> options.addNnapi(EnumSet.of(NNAPIFlags.USE_FP16))
            "cpu" -> Unit
            else -> options.addXnnpack(mapOf("intra_op_num_threads" to threads.toString()))
        }
        return environment.createSession(model.absolutePath, options)
    }

    /** Die Kantenlaenge steht im Dateinamen (`<arch>-80.onnx`), nicht in einer zweiten Liste. */
    private fun archSize(model: File): Int {
        val match = ARCH_SIZE_PATTERN.find(model.name) ?: return CNN_SIZE
        return match.groupValues[1].toInt()
    }

    private fun archModelDir(): File? {
        val places = listOf(File(context.getExternalFilesDir(null), BENCH_MODELS), File(context.filesDir, BENCH_MODELS))
        val directory = places.firstOrNull { it.isDirectory && it.listFiles().orEmpty().isNotEmpty() }
        if (directory == null) Log.i(TAG, "arch bench skipped — push *.onnx to ${places.joinToString(" or ")}")
        return directory
    }

    private fun sessionAt(
        environment: OrtEnvironment,
        model: File,
        threads: Int,
    ): OrtSession {
        val options = OrtSession.SessionOptions()
        options.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
        options.setExecutionMode(OrtSession.SessionOptions.ExecutionMode.SEQUENTIAL)
        options.setIntraOpNumThreads(threads)
        options.addXnnpack(mapOf("intra_op_num_threads" to threads.toString()))
        return environment.createSession(model.absolutePath, options)
    }

    fun batteryLine(): String {
        val state = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level = state?.getIntExtra("level", -1) ?: -1
        val temperature = (state?.getIntExtra("temperature", -1) ?: -1) / 10.0
        return "$level%/${"%.1f".format(Locale.US, temperature)}C"
    }

    private fun qhdYuvConversion() {
        val image = qhdImage()
        val converter = YuvToBgr()
        try {
            report("QHD YUV->BGR direct", samples(warmup = 8, rounds = 40) { converter.convert(image) })
        } finally {
            converter.close()
            image.close()
        }
    }

    private fun markerDetectorReuse() {
        val frame = markerFrame(FRAME_WIDTH, FRAME_HEIGHT)
        val reused = BoardMarkerDetector()
        try {
            repeat(4) { check(reused.detectBoardMarkers(frame, detectScale = ALIGN_SCALE).keys == MARKER_IDS) }
            val fresh = ArrayList<Double>(ARUCO_ROUNDS)
            val retained = ArrayList<Double>(ARUCO_ROUNDS)
            repeat(ARUCO_ROUNDS) { round ->
                val runFresh = {
                    elapsedMs {
                        BoardMarkerDetector().use { detector ->
                            check(detector.detectBoardMarkers(frame, detectScale = ALIGN_SCALE).keys == MARKER_IDS)
                        }
                    }
                }
                val runReused = {
                    elapsedMs { check(reused.detectBoardMarkers(frame, detectScale = ALIGN_SCALE).keys == MARKER_IDS) }
                }
                if (round % 2 == 0) {
                    fresh += runFresh()
                    retained += runReused()
                } else {
                    retained += runReused()
                    fresh += runFresh()
                }
            }
            report("ArUco fresh detector", fresh)
            report("ArUco reused detector", retained)
            comparison("ArUco reuse", fresh, retained)
        } finally {
            reused.close()
            frame.release()
        }
    }

    private fun medianKernel() {
        val bytes = ByteArray(GRID_SIDE * GRID_SIDE).also(Random(42)::nextBytes)
        val frame = Mat(GRID_SIDE, GRID_SIDE, CvType.CV_8UC1)
        frame.put(0, 0, bytes)
        try {
            assertProfilesEqual(LegacyBoardGray(frame), ReflectedBoardGray(frame), GRID_SIDE)
            repeat(3) {
                sweepProfiles(LegacyBoardGray(frame), GRID_SIDE)
                sweepProfiles(ReflectedBoardGray(frame), GRID_SIDE)
            }
            val legacy = ArrayList<Double>(MEDIAN_ROUNDS)
            val current = ArrayList<Double>(MEDIAN_ROUNDS)
            repeat(MEDIAN_ROUNDS) { round ->
                val old = { elapsedMs { sweepProfiles(LegacyBoardGray(frame), GRID_SIDE) } }
                val new = { elapsedMs { sweepProfiles(ReflectedBoardGray(frame), GRID_SIDE) } }
                if (round % 2 == 0) {
                    legacy += old()
                    current += new()
                } else {
                    current += new()
                    legacy += old()
                }
            }
            report("grid median sweep legacy sort", legacy)
            report("grid median sweep histogram+transpose", current)
            comparison("grid median", legacy, current)
        } finally {
            frame.release()
        }
    }

    private fun gridOcclusion() {
        val geometry = BoardGeometry(boardSize = BOARD_SIZE)
        val pad = cropBorderPx(geometry)
        val side = geometry.boardSize + 2 * pad
        val frame = Mat(side, side, CvType.CV_8UC3)
        val probe = RecordingWorkProbe()
        Core.randu(frame, 0.0, 255.0)
        try {
            WorkProfiler.install(probe).use {
                report(
                    "full grid occlusion sequential",
                    samples(warmup = 3, rounds = 20) { gridOccludedSquares(frame, geometry, pad) },
                )
                report(
                    "full grid occlusion parallel",
                    samples(warmup = 3, rounds = 20) {
                        gridOccludedSquares(frame, geometry, pad, parallel = true)
                    },
                )
            }
            logSourceReport("GRID", probe)
        } finally {
            frame.release()
        }
    }

    /** The expensive shared tracker path, driven without CameraX or a physical board. */
    private fun trackerHotPaths() {
        val probe = RecordingWorkProbe()
        WorkProfiler.install(probe).use { measuredTrackerHotPaths() }
        logSourceReport("TRACKER", probe)
    }

    private fun logSourceReport(
        prefix: String,
        probe: RecordingWorkProbe,
    ) {
        probe
            .snapshot()
            .report()
            .lineSequence()
            .forEach { Log.i(TAG, "$prefix SOURCE $it") }
    }

    private fun measuredTrackerHotPaths() {
        val geometry = BoardGeometry(boardSize = BOARD_SIZE, outW = CNN_SIZE, outH = CNN_SIZE)
        val corners =
            listOf(
                doubleArrayOf(640.0, 180.0),
                doubleArrayOf(1_760.0, 150.0),
                doubleArrayOf(1_820.0, 1_270.0),
                doubleArrayOf(600.0, 1_300.0),
            )
        val frame = Mat(FRAME_HEIGHT, FRAME_WIDTH, CvType.CV_8UC3)
        val detection = Mat()
        val detectionGray = Mat()
        val cropWarp = Mat()
        val gridCoverage = GridCoverage()
        val homographies = HomographyCache()
        Core.randu(frame, 0.0, 255.0)
        try {
            report(
                "tracker detection warp ${DETECTION_SIZE}x$DETECTION_SIZE",
                samples(warmup = 5, rounds = 40) {
                    warpFromCorners(frame, geometry, corners, DETECTION_SIZE, detection, homographies)
                },
            )
            Imgproc.cvtColor(detection, detectionGray, Imgproc.COLOR_BGR2GRAY)
            report(
                "tracker grid-line coverage ${DETECTION_SIZE}x$DETECTION_SIZE",
                samples(warmup = 5, rounds = 40) { gridCoverage.of(detectionGray) },
            )
            report(
                "tracker full crop warp",
                samples(warmup = 4, rounds = 30) {
                    warpBoardForCrops(frame, geometry, corners, cropWarp, homographies)
                },
            )
            // Leave one valid warp for crop and preprocess measurements after the timed warp loop.
            warpBoardForCrops(frame, geometry, corners, cropWarp, homographies)
            report(
                "tracker 64 crop extraction",
                samples(warmup = 3, rounds = 20) {
                    WorkProfiler.span(WorkOperation.CNN_CROP) {
                        SquareCropper().use { cropper ->
                            allSquares().forEach { square -> cropper.crop(cropWarp, square, geometry) }
                        }
                    }
                },
            )
            val crops =
                SquareCropper().use { cropper ->
                    allSquares().map { square -> toBgrImage(cropper.crop(cropWarp, square, geometry)) }
                }
            val staging = FloatArray(crops.size * CNN_CHANNELS * CNN_SIZE * CNN_SIZE)
            report(
                "tracker CNN preprocess 64x${CNN_SIZE}",
                samples(warmup = 5, rounds = 40) {
                    WorkProfiler.span(WorkOperation.CNN_PREPROCESS) {
                        preprocessInto(crops, CNN_SIZE, CNN_SIZE, staging)
                    }
                },
            )
        } finally {
            gridCoverage.close()
            cropWarp.release()
            detectionGray.release()
            detection.release()
            frame.release()
        }
    }

    private fun cnnThreads() {
        val directory = File(context.filesDir, BENCH_DIR).apply { mkdirs() }
        try {
            for (name in listOf("model.onnx", "config.json")) {
                context.assets.open("cnn_model/$MODEL/$name").use { input ->
                    File(directory, name).outputStream().use(input::copyTo)
                }
            }
            val environment = OrtEnvironment.getEnvironment()
            val sessions = THREAD_COUNTS.associateWith { session(environment, directory, it) }
            val inputName = sessions.getValue(1).inputNames.first()
            val input = cnnInput(environment)
            try {
                repeat(CNN_WARMUP) {
                    for (threads in THREAD_COUNTS) sessions.getValue(threads).run(mapOf(inputName to input)).close()
                }
                val one = ArrayList<Double>(CNN_ROUNDS)
                val four = ArrayList<Double>(CNN_ROUNDS)
                repeat(CNN_ROUNDS) { round ->
                    val first = if (round % 2 == 0) THREAD_COUNTS else THREAD_COUNTS.reversed()
                    for (threads in first) {
                        val elapsed = elapsedMs { sessions.getValue(threads).run(mapOf(inputName to input)).close() }
                        if (threads == 1) one += elapsed else four += elapsed
                    }
                }
                report("$MODEL ONNX/XNNPACK threads=1", one)
                report("$MODEL ONNX/XNNPACK threads=4", four)
                comparison("ONNX four threads", one, four)
            } finally {
                input.close()
                sessions.values.forEach(OrtSession::close)
            }
        } finally {
            directory.deleteRecursively()
        }
    }

    private fun session(
        environment: OrtEnvironment,
        directory: File,
        threads: Int,
    ): OrtSession {
        val options = OrtSession.SessionOptions()
        options.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
        options.setExecutionMode(OrtSession.SessionOptions.ExecutionMode.SEQUENTIAL)
        options.setIntraOpNumThreads(threads)
        options.addXnnpack(mapOf("intra_op_num_threads" to threads.toString()))
        return environment.createSession(File(directory, "model.onnx").absolutePath, options)
    }

    private fun cnnInput(
        environment: OrtEnvironment,
        size: Int = CNN_SIZE,
    ): OnnxTensor {
        val buffer = FloatBuffer.allocate(CNN_BATCH * CNN_CHANNELS * size * size)
        val random = Random(42)
        repeat(buffer.capacity()) { buffer.put(random.nextFloat()) }
        buffer.rewind()
        return OnnxTensor.createTensor(
            environment,
            buffer,
            longArrayOf(CNN_BATCH.toLong(), CNN_CHANNELS.toLong(), size.toLong(), size.toLong()),
        )
    }

    /** Zwei Orte, weil HyperOS der App nicht zeigt, was `adb push` in ihr EXTERNES Datenverzeichnis
     * legt (2026-08-27: Datei da, Rechte und SELinux stimmen, App sieht nichts). Der interne Pfad
     * ist ueber `run-as` befuellbar und immer sichtbar. */
    private fun benchModelDir(sizes: List<Int>): File? {
        val places = listOf(File(context.getExternalFilesDir(null), BENCH_MODELS), File(context.filesDir, BENCH_MODELS))
        val directory = places.firstOrNull { dir -> sizes.all { File(dir, "model$it.onnx").isFile } }
        if (directory == null) {
            Log.i(TAG, "cnn bench skipped — push ${sizes.joinToString { "model$it.onnx" }} to ${places.joinToString(" or ")}")
        }
        return directory
    }

    /** Dauerlast fuer die Strommessung: `cmd battery get -f current_now` braucht Sekunden, der
     * Zeitvergleich braucht Millisekunden. Deshalb hier EINE Groesse, so lange am Stueck, dass
     * der Zaehler den Unterschied traegt — siehe `docs/battery.md`. */
    fun cnnSoak(
        size: Int,
        seconds: Int,
    ) {
        val directory = benchModelDir(listOf(size)) ?: return
        val environment = OrtEnvironment.getEnvironment()
        val session = sessionAt(environment, File(directory, "model$size.onnx"), CNN_BENCH_THREADS)
        val input = cnnInput(environment, size)
        try {
            repeat(CNN_WARMUP) { session.run(mapOf("input" to input)).close() }
            Log.i(TAG, "soak ${size}px begin battery=${batteryLine()}")
            val deadline = System.nanoTime() + seconds * NANOS_PER_S
            var runs = 0L
            val started = System.nanoTime()
            while (System.nanoTime() < deadline) {
                session.run(mapOf("input" to input)).close()
                runs++
            }
            val elapsed = (System.nanoTime() - started) / NANOS_PER_MS
            Log.i(
                TAG,
                "soak ${size}px batch=$CNN_BATCH threads=$CNN_BENCH_THREADS: %d boards in %.0f ms (%.2f ms/board) battery=%s"
                    .format(Locale.US, runs, elapsed, elapsed / runs, batteryLine()),
            )
        } finally {
            input.close()
            session.close()
        }
    }

    private fun samples(
        warmup: Int,
        rounds: Int,
        block: () -> Unit,
    ): List<Double> {
        repeat(warmup) { block() }
        return List(rounds) { elapsedMs(block) }
    }

    private fun elapsedMs(block: () -> Unit): Double {
        val before = System.nanoTime()
        block()
        return (System.nanoTime() - before) / NANOS_PER_MS
    }

    private fun report(
        label: String,
        raw: List<Double>,
    ) {
        val values = raw.sorted()
        val safe = label.replace("%", "%%")

        fun pct(p: Double) = values[(p * (values.size - 1)).toInt()]
        Log.i(
            TAG,
            "$safe: median %.2f ms p10 %.2f p90 %.2f min %.2f max %.2f n=%d".format(
                Locale.US,
                pct(0.5),
                pct(0.1),
                pct(0.9),
                values.first(),
                values.last(),
                values.size,
            ),
        )
    }

    private fun comparison(
        label: String,
        baseline: List<Double>,
        current: List<Double>,
    ) {
        val before = median(baseline)
        val after = median(current)
        Log.i(TAG, "$label: %.2fx; saves %.2f ms".format(Locale.US, before / after, before - after))
    }

    private fun median(values: List<Double>): Double = values.sorted()[values.size / 2]

    private fun qhdImage(): ImageProxy {
        val y = ByteBuffer.allocateDirect(FRAME_WIDTH * FRAME_HEIGHT)
        val chroma = ByteBuffer.allocateDirect(FRAME_WIDTH * FRAME_HEIGHT / 2 + 1)
        for (i in 0 until y.capacity()) y.put(i, (i * 17 + 31).toByte())
        for (i in 0 until chroma.capacity()) chroma.put(i, (i * 29 + 7).toByte())
        val v = chroma.duplicate().apply { position(0) }.slice()
        val u = chroma.duplicate().apply { position(1) }.slice()
        return FakeImageProxy(
            FRAME_WIDTH,
            FRAME_HEIGHT,
            arrayOf(
                FakePlane(y, FRAME_WIDTH, 1),
                FakePlane(u, FRAME_WIDTH, 2),
                FakePlane(v, FRAME_WIDTH, 2),
            ),
        )
    }

    private fun markerFrame(
        width: Int,
        height: Int,
    ): Mat {
        val frame = Mat(height, width, CvType.CV_8UC3, Scalar(255.0, 255.0, 255.0))
        val dictionary = Objdetect.getPredefinedDictionary(Objdetect.DICT_4X4_50)
        val origins =
            listOf(
                MARKER_INSET to MARKER_INSET,
                width - MARKER_INSET - MARKER_SIZE to MARKER_INSET,
                width - MARKER_INSET - MARKER_SIZE to height - MARKER_INSET - MARKER_SIZE,
                MARKER_INSET to height - MARKER_INSET - MARKER_SIZE,
            )
        for ((id, origin) in origins.withIndex()) {
            val marker = Mat()
            val bgr = Mat()
            try {
                Objdetect.generateImageMarker(dictionary, id, MARKER_SIZE, marker)
                Imgproc.cvtColor(marker, bgr, Imgproc.COLOR_GRAY2BGR)
                val (x, y) = origin
                val target = frame.submat(y, y + MARKER_SIZE, x, x + MARKER_SIZE)
                try {
                    bgr.copyTo(target)
                } finally {
                    target.release()
                }
            } finally {
                bgr.release()
                marker.release()
            }
        }
        return frame
    }

    private fun assertProfilesEqual(
        legacy: BandProfiles,
        current: BandProfiles,
        side: Int,
    ) {
        for (band in 0 until BOARD_CELLS) {
            val lo = band * side / BOARD_CELLS
            val hi = (band + 1) * side / BOARD_CELLS
            check(legacy.columnMedians(lo, hi).contentEquals(current.columnMedians(lo, hi)))
            check(legacy.rowMedians(lo, hi).contentEquals(current.rowMedians(lo, hi)))
        }
    }

    private fun sweepProfiles(
        profiles: BandProfiles,
        side: Int,
    ) {
        for (band in 0 until BOARD_CELLS) {
            val lo = band * side / BOARD_CELLS
            val hi = (band + 1) * side / BOARD_CELLS
            profiles.columnMedians(lo, hi)
            profiles.rowMedians(lo, hi)
        }
    }
}

private interface BandProfiles {
    fun columnMedians(
        y0: Int,
        y1: Int,
    ): DoubleArray

    fun rowMedians(
        x0: Int,
        x1: Int,
    ): DoubleArray
}

/** Exact pre-optimisation implementation from `BoardGray.kt`. */
private class LegacyBoardGray(
    gray: Mat,
) : BandProfiles {
    private val width = gray.cols()
    private val height = gray.rows()
    private val data = ByteArray(width * height).also { gray.get(0, 0, it) }

    override fun columnMedians(
        y0: Int,
        y1: Int,
    ): DoubleArray {
        val lo = max(0, y0)
        val hi = min(height, y1)
        val out = DoubleArray(width)
        if (hi <= lo) return out
        val buffer = DoubleArray(hi - lo)
        for (x in 0 until width) {
            for (y in lo until hi) buffer[y - lo] = (data[y * width + x].toInt() and BYTE_MASK).toDouble()
            out[x] = sortedMedian(buffer)
        }
        return out
    }

    override fun rowMedians(
        x0: Int,
        x1: Int,
    ): DoubleArray {
        val lo = max(0, x0)
        val hi = min(width, x1)
        val out = DoubleArray(height)
        if (hi <= lo) return out
        val buffer = DoubleArray(hi - lo)
        for (y in 0 until height) {
            val row = y * width
            for (x in lo until hi) buffer[x - lo] = (data[row + x].toInt() and BYTE_MASK).toDouble()
            out[y] = sortedMedian(buffer)
        }
        return out
    }

    private fun sortedMedian(values: DoubleArray): Double {
        val sorted = values.sortedArray()
        val middle = sorted.size / 2
        return if (sorted.size % 2 == 1) sorted[middle] else (sorted[middle - 1] + sorted[middle]) / 2.0
    }
}

/** Calls the shipped internal class without widening its production visibility for a benchmark. */
private class ReflectedBoardGray(
    gray: Mat,
) : BandProfiles {
    private val type = Class.forName("com.chesslab.geometry.BoardGray")
    private val instance = type.getDeclaredConstructor(Mat::class.java).apply { isAccessible = true }.newInstance(gray)
    private val columns = type.getDeclaredMethod("columnMedians", Int::class.java, Int::class.java).apply { isAccessible = true }
    private val rows = type.getDeclaredMethod("rowMedians", Int::class.java, Int::class.java).apply { isAccessible = true }

    override fun columnMedians(
        y0: Int,
        y1: Int,
    ): DoubleArray = columns.invoke(instance, y0, y1) as DoubleArray

    override fun rowMedians(
        x0: Int,
        x1: Int,
    ): DoubleArray = rows.invoke(instance, x0, x1) as DoubleArray
}

private class FakePlane(
    private val data: ByteBuffer,
    private val rowStride: Int,
    private val pixelStride: Int,
) : ImageProxy.PlaneProxy {
    override fun getBuffer(): ByteBuffer = data

    override fun getRowStride(): Int = rowStride

    override fun getPixelStride(): Int = pixelStride
}

private class FakeImageProxy(
    private val width: Int,
    private val height: Int,
    private val planes: Array<ImageProxy.PlaneProxy>,
) : ImageProxy {
    override fun getWidth(): Int = width

    override fun getHeight(): Int = height

    override fun getImageInfo(): ImageInfo = FakeImageInfo

    override fun getFormat(): Int = 0x23

    override fun getPlanes(): Array<ImageProxy.PlaneProxy> = planes

    override fun getImage(): Image? = null

    override fun close() = Unit

    override fun getCropRect(): Rect = Rect(0, 0, width, height)

    override fun setCropRect(rect: Rect?) = Unit
}

private object FakeImageInfo : ImageInfo {
    override fun getRotationDegrees(): Int = 0

    override fun getTimestamp(): Long = 0L

    override fun getTagBundle(): TagBundle = TagBundle.emptyBundle()

    override fun populateExifData(builder: ExifData.Builder) = Unit
}

private const val TAG = "AndroidOptimizationBench"
private const val FRAME_WIDTH = 2560
private const val FRAME_HEIGHT = 1440
private const val BOARD_SIZE = 1008
private const val DETECTION_SIZE = 504
private const val GRID_SIDE = 1072
private const val BOARD_CELLS = 8
private const val MARKER_SIZE = 220
private const val MARKER_INSET = 120
private const val ALIGN_SCALE = 0.5
private const val ARUCO_ROUNDS = 30
private const val MEDIAN_ROUNDS = 20
private const val NANOS_PER_MS = 1_000_000.0
private const val BYTE_MASK = 0xFF
private const val BENCH_DIR = "android-perf-bench"
private const val BENCH_MODELS = "cnn_bench"
private const val MODEL = "comp13-occ-bn-lr1e2-bs512"
private const val CNN_BATCH = 64
private const val CNN_CHANNELS = 3
private const val CNN_SIZE = 80
private const val CNN_SIZE_LARGE = 128
private const val CNN_BENCH_THREADS = 4
private const val ARCH_PASSES = 2
private const val ARCH_ROUNDS = 20
private const val INT8_SUFFIX = ".int8.onnx"
private val FP32_EPS = listOf("xnnpack")
private val INT8_EPS = listOf("cpu", "nnapi")
private val ARCH_SIZE_PATTERN = Regex("""-(\d+)(?:\.int8)?\.onnx$""")
private const val CNN_WARMUP = 5
private const val CNN_ROUNDS = 40
private const val SOAK_SECONDS = 120
private const val NANOS_PER_S = 1_000_000_000L
private val MARKER_IDS = setOf(0, 1, 2, 3)
private val THREAD_COUNTS = listOf(1, 4)
