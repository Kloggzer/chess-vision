package com.chesslab.desktop

import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.CropClahe
import com.chesslab.geometry.Undistorter
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.cnn.Attached
import com.chesslab.tracker.cnn.cropClaheFor
import com.chesslab.tracker.geometry.cropLine
import com.chesslab.tracker.geometry.withCropOf
import com.chesslab.tracker.log.TrackerLog
import com.chesslab.tracker.log.TrackerLogs
import com.chesslab.tracker.pipeline.OpenCvStages
import com.chesslab.tracker.pipeline.StageTimings
import com.chesslab.tracker.pipeline.usableFrameRate
import com.chesslab.tracker.service.CameraFrameBus
import com.chesslab.tracker.service.StagesFactory
import com.chesslab.tracker.service.StatusPublisher
import com.chesslab.tracker.service.TrackerSeed
import com.chesslab.tracker.service.TrackerStack
import com.chesslab.tracker.settings.ConfigStore
import com.chesslab.tracker.settings.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import org.opencv.core.Mat
import java.awt.image.BufferedImage
import java.io.File
import java.util.Locale

@Suppress("LongMethod", "CyclomaticComplexMethod")
internal fun replayRun(
    source: FrameSource,
    name: String,
    options: ReplayOptions,
    camera: String? = null,
    video: File? = null,
    training: ReplayTrainingSink? = null,
    trace: ReplayTrace? = null,
) {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    val console: TrackerLogs = { tag -> ConsoleLog(tag) }
    // `label` refuses footage that cannot carry one; `score` replays through the LABEL's stored quad.
    val plan = replayPlanFor(options, video)
    source.use { source ->
        val fittedLens = plan?.lens() ?: if (options.lens) fitLensFrom(source) else null
        if (options.lens && video != null && fittedLens == null) {
            error("no accepted lens fit for ${video.name} — refusing to replay raw frames as corrected")
        }
        val optics = fittedLens?.let { Undistorter(it, source.delivered.width, source.delivered.height) }
        val corrected = { source.next()?.let { frame -> optics?.apply(frame) ?: frame } }
        // Skipped BEFORE the board is located, so the quad is measured on the game, not the setup.
        skipPreRoll(source, video, options)?.let { println(it) }
        // Which quad a run stood on is provenance: the sources are ±6-25 plies apart.
        val quad =
            plan?.quad()?.also { println("quad: from the label plan's geometry scan") }
                ?: recordingDirOf(options, video)?.let(::loggedQuad)?.also {
                    println("quad: from the recording's log.jsonl — what the phone stood on")
                }
                ?: locateBoard(corrected)?.also { println("quad: located on the first decoded frames") }
        if (quad == null) {
            println("no board found: the markers never decoded")
            optics?.close()
            return
        }
        // Off the source itself: the `VideoFileSource` cast fell through to 0 on segmented recordings.
        val replayStartFrame = source.currentDecodedIndex + 1
        // The MODEL owns the crop composition, read even under `nocnn` so that isolates only the classifier.
        val spec = desktopModelSpec(options.model)
        val geometry =
            replayBoardGeometry(quad, recordingDirOf(options, video), options.configFile?.let(::File)).withCropOf(spec)
        // Before the config: `motionThr` is a per-frame-period percent, scaled by the rate frames REACH the engine.
        val recorded = recordedFrameGate(options, video)
        val stride = if (recorded != null) 1 else strideOf(options.fps, source.fps, live = camera != null)
        // The coverage gate rides in the MODEL (`docs/occlusion-gate.md`).
        if (camera == null && usableFrameRate(source.fps) == null) {
            println("warn: the video declares no frame rate — motionThr stays at the 30 fps reference")
        }
        val configFor = { extra: Map<String, Double> ->
            val alle = options.overrides + extra
            options
                .copy(overrides = alle)
                .trackerConfig(geometry, live = camera != null, replayEngineFps(source.fps, stride, live = camera != null), spec)
        }
        val config = configFor(emptyMap())
        println("board located from its markers: ${geometry.boardSize} px warp  ·  ${options.withPriorOf(spec)}")
        println("crops: ${cropLine(spec, geometry)}")
        if (camera == null) println("observer: synchronous and free-running on video time — runs repeat")
        val publisher = StatusPublisher(scope)
        val cnn =
            if (options.cnn) {
                openDesktopCnn(
                    options.model,
                    console("chesslabCnn"),
                    cache = options.observationCache,
                    recording = options.name ?: video?.nameWithoutExtension ?: "unbenannt",
                )
            } else {
                null
            }
        if (!options.cnn) println("cnn: off — the engine uses its no-observation occlusion fallback")
        val frameClock = FrameClock(source, live = camera != null)
        val session = plan?.session(quad, geometry.boardSize, source.fps, { source.currentDecodedIndex.toInt() }) { publisher.status.value }
        training?.configure(geometry, quad, source.fps)
        // On the engine's clock: its 200 ms tap would otherwise follow this host's decode speed.
        val needsPreview = camera != null || options.watch || options.dumpEvery > 0
        val bus =
            CameraFrameBus(
                MutableStateFlow(CameraHealth.Up),
                scope,
                ::matToImage,
                nowMs = frameClock::now,
                publishPreviews = needsPreview,
            )
        val view = openView(options, name)
        // NOT seeded with this run's config: that collapsed rec-20260808 from 67 plies to 26. It holds codec
        // defaults, so nothing may READ it for a knob the run owns.
        val settings = SettingsRepository(MemoryConfigStore, scope)
        val visualCache =
            options.visualCache?.let { path ->
                require(video != null && camera == null) { "visualcache= is only valid for a recorded video" }
                VisualObservationCache.open(
                    path.fileArg(),
                    video,
                    options.model,
                    visualCacheSignature(
                        config,
                        geometry,
                        quad,
                        source,
                        stride,
                        options.lens,
                        desktopModelSignature(options.model),
                        replayStartFrame,
                        options.limitFrames,
                        recorded?.size,
                        spec?.priorLambda ?: options.priorLambda,
                        options.priorSafety,
                    ),
                    tolerant = options.visualCachePartial,
                )
            }
        val parallelVisual =
            if (options.visualWorkers > 0) {
                require(video != null && camera == null && !options.lens) {
                    "visualworkers= requires a recorded replay without lens correction"
                }
                require(options.cnn) { "visualworkers= requires the CNN" }
                val sequences =
                    requireNotNull(visualCache?.observationSequences) {
                        "visualworkers= currently requires an existing visualcache= as its parity oracle"
                    }
                val alignment =
                    requireNotNull(visualCache.alignmentLookup) {
                        "visualworkers= requires a current visual cache with an alignment stream"
                    }
                val workerClassifier =
                    requireNotNull(
                        openDesktopCnn(
                            options.model,
                            console("chesslabParallelCnn"),
                            cache = false,
                            intraOpThreads = 1,
                        ),
                    ) { "visualworkers= could not open the CNN" }
                ParallelVisualPrepass.build(
                    requireNotNull(video),
                    replayStartFrame,
                    stride,
                    geometry,
                    quad,
                    sequences,
                    alignment,
                    requireNotNull(visualCache.expectedObservation),
                    options.visualWorkers,
                    workerClassifier,
                )
            } else {
                null
            }
        // Der Prepass schneidet nach `stride`, die aufgezeichnete Auswahl nach Zeitstempeln: dann rechnet LiveAlign selbst.
        val canPrecomputeMarkers = video != null && !options.lens && recorded == null && options.limitFrames == null
        // The RUN's config: a prepass on a different cadence than LiveAlign is "marker prepass has no frame N".
        val needsMarkerDetections = visualCache?.alignmentLookup == null && config.liveAlign && config.alignEvery > 0
        val markerPrepass =
            if (canPrecomputeMarkers && needsMarkerDetections) {
                AlignmentMarkerPrepass.build(
                    requireNotNull(video),
                    replayStartFrame,
                    stride,
                    config.alignEvery,
                    config.alignScale,
                    geometry.markerDict,
                )
            } else {
                null
            }
        val rig =
            ReplayRig(
                geometry,
                frameClock::now,
                optics,
                bus,
                publisher,
                cnn,
                console,
                scope,
                settings,
                indexNow = { source.currentDecodedIndex },
                live = camera != null,
                visualCache = visualCache,
                markerPrepass = markerPrepass,
                parallelVisual = parallelVisual,
                priorLambda = options.priorLambda,
                priorSafety = options.priorSafety,
                startFen = recordedStartFen(options, video),
                cropClahe = cropClaheFor(spec),
            )
        val stack = rig.mainStack(config, session?.collector, options.motionDump, trace)
        stack.coordinator.applyCalibration(geometry, quad, "desktop", source.delivered)
        // Ohne `configs=` entsteht hier nichts, und der Lauf ist Anweisung fuer Anweisung der alte.
        val extras =
            options.extraConfigs?.let { pfad ->
                ExtraEngines
                    .open(readExtraConfigs(File(pfad), configFor), rig)
                    ?.also { it.calibrate(geometry, quad, source.delivered) }
            }
        if (trace != null) {
            stack.host.submit(
                com.chesslab.engine.api.EngineAction
                    .SetDebugEnabled(true),
            )
        }
        val frameHook: ((Int, Mat, Double) -> Unit)? =
            if (session == null && training == null) {
                null
            } else {
                { index, frame, timeMs ->
                    session?.frameHook?.invoke(index, frame, timeMs)
                    training?.frame(index, frame, publisher.status.value, timeMs)
                }
            }
        val statusDump =
            options.motionDump?.let {
                File(
                    "$it.status.csv",
                ).bufferedWriter().apply { write("frame,index,state,motion,stuck\n") }
            }
        val frames =
            drive(
                source,
                stack,
                bus,
                publisher,
                view,
                options.dumpEvery,
                frameHook,
                stride,
                recorded,
                statusDump,
                options.limitFrames,
                extras,
                trace,
            )
        statusDump?.close()
        println("tracked $frames frames of $name at ${"%.2f".format(source.fps)} fps")
        // `observations` counts snapshots the observer EMITTED, the engine's `cnnSnaps` what arrived.
        println("cnn: state=${stack.observer.state.value} observations=${stack.observations} ${stack.observer.counters}")
        println(stack.dropLine())
        extras?.let { e -> e.tags.indices.forEach { println(e.cnnLine(it)) } }
        val totals = RunTotals(publisher.status.value?.note, stack.observations.toInt(), frames, stack.dropLine())
        session?.finish(video, options, config, geometry, totals)
        extras?.let { e ->
            recordingDirOf(options, video)?.let { dir -> File(dir, "candidate.json").takeIf(File::isFile) }?.let { cand ->
                val label = labelPlies(cand)
                e.tags.forEachIndexed { i, tag ->
                    println("===== $tag")
                    printScore(cand, label, e.plies[i], options.model)
                }
            }
            e.close()
        }
        training?.finish()
        stack.close()
        visualCache?.close()
        view?.close()
    }
    scope.cancel()
}

/** Null when nothing is skipped, the DEFAULT: the old two-second lead cost a run 2 of its 4 moves. */
private fun skipPreRoll(
    source: FrameSource,
    video: File?,
    options: ReplayOptions,
): String? {
    val target = options.startSeconds?.times(1000.0)
    if (target == null || target <= 0.0) return null
    var skipped = 0
    while (source.timestampMs < target && source.next() != null) skipped++
    return "pre-roll: $skipped frames skipped, tracking starts at ${"%.1f".format(source.timestampMs / 1000)}s"
}

/** Without a window, break-on-stuck would wait forever for a key nobody presses. */
private fun openView(
    options: ReplayOptions,
    name: String,
): TrackerView? {
    val view = if (options.watch) TrackerView.openOrNull("chesslab — $name") else null
    if (options.watch && view == null) println("no display: running without the board view")
    return view
}

/** They do not separate fabrications from hits (`docs/commit-latency.md`): a diagnostic. */
private fun DebugDecision.confidenceLine(): String =
    (
        "ply=%d best=%.4f second=%.4f margin=%.4f agree=%.4f " +
            "prior=%b cov=%.4f motion=%.4f changed=%d verify=%s accepted=%b refProvisional=%b"
    ).format(
        Locale.ROOT,
        ply,
        bestScore,
        secondScore,
        margin,
        cnnAgreement,
        priorUsed,
        gridCoverage,
        motion,
        changed.size,
        verifyOutcome ?: "-",
        accepted,
        refProvisional,
    )

/** Haupt- und Zusatz-Engines entstehen ueber [stack], also unterscheiden sich zwei Arme nur in ihrer Konfig. */
internal class ReplayRig(
    val geometry: BoardGeometry,
    val nowMs: () -> Long,
    val optics: Undistorter?,
    val bus: CameraFrameBus<BufferedImage>,
    val publisher: StatusPublisher,
    val cnn: (() -> Attached)?,
    val logs: TrackerLogs,
    val scope: CoroutineScope,
    val settings: SettingsRepository,
    val indexNow: () -> Long = { -1L },
    val live: Boolean = false,
    val visualCache: VisualObservationCache? = null,
    val markerPrepass: AlignmentMarkerPrepass? = null,
    val parallelVisual: ParallelVisualPrepass? = null,
    val priorLambda: Double = 0.0,
    val priorSafety: Boolean = true,
    // Eine Aufnahme beginnt mitten im Spiel.
    val startFen: String = STARTPOS,
    val cropClahe: CropClahe? = null,
) {
    /** Only the engine that [writes] feeds the caches' sinks. */
    @Suppress("LongParameterList")
    fun stack(
        // Passed whole: a label records it as `effective_config`, and two constructions drift.
        config: TrackerConfig,
        stages: StagesFactory<Mat>,
        onDecision: (DebugDecision) -> Unit,
        stateTag: String,
        writes: Boolean,
        logs: TrackerLogs = this.logs,
        timings: StageTimings = StageTimings(logLine = {}),
        // `nocnn` runs the ">2 changed squares = a hand" fallback ON PURPOSE — a different tracker.
        classifier: () -> Attached = cnn ?: { error("running without a CNN — the engine uses its occlusion fallback") },
    ): TrackerStack<Mat> =
        TrackerStack(
            TrackerSeed<Mat>(
                // `measuredBoardSize` clamps to 320..1280: a 1600 placeholder would make `FrameLoop.step`
                // refuse every plane, one silently dropped frame at a time.
                config = config,
                geometry = { geometry },
                corners = null,
                startFen = startFen,
                onDecision = onDecision,
                onState = { from, to, tsS ->
                    val index = indexNow()
                    println("$stateTag: %s -> %s at %.2fs".format(from, to, tsS) + if (index >= 0) " frame=$index" else "")
                },
                logs = logs,
                stages = stages,
                nowMs = nowMs,
                // Inline inference so the snapshot lands before the next decode — else 54-vs-39-ply runs of
                // one unchanged file. Live keeps the phone's dedicated observer thread.
                observerDispatcher = if (live) null else Dispatchers.Unconfined,
                parallelCrops = !live,
                cachedVisual = parallelVisual?.lookup ?: visualCache?.lookup,
                observationSink = visualCache?.sink?.takeIf { writes },
                priorLambda = priorLambda,
                priorSafety = priorSafety,
                cachedAlignment = visualCache?.alignmentLookup,
                alignmentSink = visualCache?.alignmentSink?.takeIf { writes },
                cachedMarkerDetections = markerPrepass?.lookup,
                cropClahe = cropClahe,
            ),
            settings,
            publisher,
            bus,
            timings,
            scope,
            classifier,
        )
}

internal fun ReplayRig.mainStack(
    config: TrackerConfig,
    collector: DecisionCollector? = null,
    motionDump: String? = null,
    trace: ReplayTrace? = null,
): TrackerStack<Mat> =
    stack(
        config,
        stages = { geo, cfg, store, frameBus, boardBus ->
            motionDumped(OpenCvStages({ it }, {}, geo, cfg, store, frameBus, boardBus, optics), motionDump)
        },
        onDecision = {
            println("decision: ply=${it.ply} ${it.san ?: "-"} decider=${it.decider}")
            println("decision-conf: " + it.confidenceLine())
            collector?.offer(it)
            trace?.decision(it, indexNow())
        },
        stateTag = "state",
        writes = true,
        timings = StageTimings(logLine = { println("chesslabPerf: $it") }),
    )

/** The view is consulted BEFORE the next frame is pulled, so a stop shows the state that caused it. */
@Suppress("LongParameterList")
private fun drive(
    source: FrameSource,
    stack: TrackerStack<Mat>,
    bus: CameraFrameBus<BufferedImage>,
    publisher: StatusPublisher,
    view: TrackerView?,
    dumpEvery: Int = 0,
    // Fired AFTER the engine saw the frame, index and picture in one call.
    frameHook: ((Int, Mat, Double) -> Unit)? = null,
    stride: Int = 1,
    // Ist sie da, ruht [stride]: ein Replay, der andere Bilder waehlt als die Messung, ist keine Reproduktion.
    recorded: RecordedFrameGate? = null,
    statusDump: java.io.Writer? = null,
    limitFrames: Int? = null,
    extras: ExtraEngines? = null,
    trace: ReplayTrace? = null,
): Int {
    var frames = 0
    var strideDropped = 0
    while (true) {
        val open = (limitFrames == null || frames < limitFrames) && (view?.awaitStep(publisher.status.value) ?: true)
        val frame = if (open) source.next() else null
        if (frame == null) {
            if (strideDropped > 0) {
                val how = if (recorded != null) "recorded list (${recorded.taken} taken)" else "stride $stride"
                println("$how: dropped $strideDropped of $frames decoded frames, by design")
            }
            return frames
        }
        // No clock tick: a stride-skipped frame still advances the PTS clock by itself.
        val take = recorded?.accept(source.timestampMs) ?: (frames % stride == 0)
        if (!take) {
            strideDropped += 1
            frames += 1
            continue
        }
        extras?.onFrame(frame, source.delivered)
        stack.coordinator.onFrame(frame, source.delivered)
        trace?.frame(source.currentDecodedIndex, source.timestampMs, stack.host.status())
        frameHook?.invoke(hookIndex(source.currentDecodedIndex, frames), frame, source.timestampMs)
        frames += 1
        statusDump?.let { out ->
            val st = publisher.status.value
            out.write("$frames,${source.currentDecodedIndex},${st?.state},${st?.motion},${st?.stuckReason ?: ""}\n")
        }
        view?.show(bus.boardPreview.value, publisher.status.value)
        if (dumpEvery > 0 && frames % dumpEvery == 0) {
            dumpBoard(frames, bus.boardPreview.value, publisher.status.value)
        }
    }
}

/** `drive`'s own count sat 878 frames off and put every label 29 s ahead of its picture. */
internal fun hookIndex(
    decoded: Long,
    counted: Int,
): Int = if (decoded >= 0) decoded.toInt() else counted

/** Refused live: a camera already drops what the pipeline cannot take. */
private fun strideOf(
    targetFps: Double?,
    sourceFps: Double,
    live: Boolean,
): Int {
    if (targetFps == null) return 1
    require(!live) { "fps= is a replay instrument — a live camera already drops what it cannot take" }
    val stride = Math.round(sourceFps / targetFps).toInt().coerceAtLeast(1)
    println("stride: every $stride. frame -> ${"%.1f".format(sourceFps / stride)} of ${"%.1f".format(sourceFps)} fps")
    return stride
}

/** Rounded like the phone's rate modes: a 15 fps session's container says 14.97, the phone scaled by 15. Null
 *  without a usable container rate: `motionThr` then stays at the 30 fps reference, and the run says so. */
internal fun replayEngineFps(
    sourceFps: Double,
    stride: Int,
    live: Boolean,
): Double? = if (live) null else usableFrameRate(Math.round(sourceFps) / stride.toDouble())

/** NOT `frames x 1000/fps` — that assumed CFR, which the phone never delivers. */
private class FrameClock(
    private val source: FrameSource,
    private val live: Boolean,
) {
    fun now(): Long = if (live) System.currentTimeMillis() else source.timestampMs.toLong()
}

private class ConsoleLog(
    private val tag: String,
) : TrackerLog {
    override fun debug(message: String) = Unit

    override fun info(message: String) = println("$tag: $message")

    override fun warn(
        message: String,
        error: Throwable?,
    ) = println("$tag: WARN $message${error?.let { " (${it.message})" }.orEmpty()}")

    override fun error(
        message: String,
        error: Throwable?,
    ) = println("$tag: ERROR $message${error?.let { " (${it.message})" }.orEmpty()}")
}

/** Settings a replay does not persist. */
private object MemoryConfigStore : ConfigStore {
    private val slots = mutableMapOf<String, String>()

    override suspend fun read(slot: String): String? = slots[slot]

    override suspend fun write(
        slot: String,
        text: String,
    ) {
        slots[slot] = text
    }
}

private fun recordedStartFen(
    options: ReplayOptions,
    video: File?,
): String {
    val dir = recordingDirOf(options, video) ?: return STARTPOS
    val fen = RecordedFrames.startFen(File(dir, "timeline.jsonl")) ?: return STARTPOS
    if (fen != STARTPOS) println("start: $fen — where the recording begins, not the initial position")
    return fen
}

/** `fps=<n>` trifft die Anzahl der Frames, aber nicht die Bilder, die CameraX durchliess. */
private fun recordedFrameGate(
    options: ReplayOptions,
    video: File?,
): RecordedFrameGate? {
    val dir = recordingDirOf(options, video) ?: return null
    val times = RecordedFrames.times(File(dir, "timeline.jsonl")) ?: return null
    println("frames: replaying the ${times.size} the phone processed, from its timeline.jsonl")
    if (options.fps != null) println("  fps=${options.fps} ignored — the recording's own measurement wins")
    return RecordedFrameGate(times)
}
