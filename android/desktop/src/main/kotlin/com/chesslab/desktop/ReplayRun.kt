package com.chesslab.desktop

import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.CropClahe
import com.chesslab.geometry.Undistorter
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.cnn.Attached
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.geometry.cropLine
import com.chesslab.tracker.geometry.withCropOf
import com.chesslab.tracker.log.TrackerLog
import com.chesslab.tracker.log.TrackerLogs
import com.chesslab.tracker.pipeline.OpenCvStages
import com.chesslab.tracker.pipeline.StageTimings
import com.chesslab.tracker.service.CameraFrameBus
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
    // `label` measures the footage FIRST and refuses footage that cannot carry one — a label on
    // crooked geometry is worse than none. `score` replays through the LABEL's stored quad, so
    // the comparison and the label share their geometry by construction.
    val plan = replayPlanFor(options, video)
    source.use { source ->
        // Fitted from the board in THIS footage, not from a file, and built once for the stages
        // that own and close it. Why, and what the board size is measured from rather than
        // configured: `docs/desktop-replay.md`.
        val fittedLens = plan?.lens() ?: if (options.lens) fitLensFrom(source) else null
        if (options.lens && video != null && fittedLens == null) {
            error("no accepted lens fit for ${video.name} — refusing to replay raw frames as corrected")
        }
        val optics = fittedLens?.let { Undistorter(it, source.delivered.width, source.delivered.height) }
        val corrected = { source.next()?.let { frame -> optics?.apply(frame) ?: frame } }
        // Skipped BEFORE the board is located, so the quad is measured on the game and not on the
        // setup — it cost `2026-08-15-22-48-04` all 19 plies (`docs/desktop-replay.md`).
        skipPreRoll(source, video, options)?.let { println(it) }
        // Which quad a run stood on is part of its provenance: the sources are a measured ±6-25
        // plies apart (specs/52, still open; `docs/desktop-replay.md`).
        val quad =
            plan?.quad()?.also { println("quad: from the label plan's geometry scan") }
                ?: recordingDirOf(options, video)?.let(::loggedQuad)?.also {
                    println("quad: from the recording's log.jsonl — what the phone stood on")
                }
                ?: locateBoard(corrected)?.also { println("quad: located on the first decoded frames") }
        if (quad == null) {
            println("no board found: the markers never decoded")
            // Nothing takes ownership on this path, because the stages that would are never built.
            optics?.close()
            return
        }
        // Where locating the board left the decoder — read off the source itself, because the
        // `VideoFileSource` cast fell through to 0 on segmented recordings
        // (`docs/desktop-replay.md`).
        val replayStartFrame = source.currentDecodedIndex + 1
        // The MODEL owns the crop composition (specs/45), and the desktop was not asking it. Read
        // whether or not the CNN is on, so `nocnn` isolates the classifier and not the geometry
        // (`docs/desktop-replay.md`).
        val spec = desktopModelSpec(options.model)
        val geometry =
            replayBoardGeometry(quad, recordingDirOf(options, video), options.configFile?.let(::File)).withCropOf(spec)
        // Before the config, because the config depends on it: `motionThr` is a per-frame-period
        // percent, so the rate frames REACH the engine at scales it — as `TrackerService` does live.
        val recorded = recordedFrameGate(options, video)
        val stride = if (recorded != null) 1 else strideOf(options.fps, source.fps, live = camera != null)
        // The coverage gate rides in the MODEL, not in the engine (`docs/occlusion-gate.md`). The
        // replay did not apply it, so it measured at 0.5 while the phone ran the model's own 0.15.
        val configFor = { extra: Map<String, Double> ->
            val alle = options.overrides + extra
            options
                .copy(overrides = alle)
                .trackerConfig(geometry, live = camera != null, emulatedFps = (source.fps / stride).takeIf { stride > 1 })
                .withCoverageGateOf(spec, alle.keys)
        }
        val config = configFor(emptyMap())
        // Der Prior des Modells verwirft ein `prior=` still; das Banner nennt den WIRKSAMEN Wert.
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
        // The label's plies and the score's run come off the decision sink — streaming, one row
        // per move (a recovery bridge writes per-move rows), so collecting rows collects plies.
        val session = plan?.session(quad, geometry.boardSize, source.fps, { source.currentDecodedIndex.toInt() }) { publisher.status.value }
        training?.configure(geometry, quad, source.fps)
        // Held here rather than read back off the stack, and on the engine's clock like everything
        // else in a replay — its 200 ms tap would otherwise follow this host's decode speed
        // (`docs/desktop-replay.md`).
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
        // NOT seeded with this run's config, deliberately: seeding it collapsed rec-20260808 from
        // 67 plies to 26 (2026-08-08). It holds the codec defaults, so nothing here may READ it for
        // a knob the run owns (`docs/desktop-replay.md`).
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
        // Der Prepass schneidet nach `stride`; die aufgezeichnete Auswahl folgt Zeitstempeln. Zwei
        // Kadenzen, und der Docstring unten sagt, was das kostet — also rechnet LiveAlign dann
        // selbst. Langsamer, aber es ist dieselbe Rechnung.
        val canPrecomputeMarkers = video != null && !options.lens && recorded == null && options.limitFrames == null
        // The RUN's config, the same one `LiveAlign` obeys inside the stack: the prepass answers
        // the alignments LiveAlign will ask for, so a prepass cut on a different cadence than the
        // asker is a "marker prepass has no frame N" away from stopping the replay.
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
        val stack =
            buildStack(
                config,
                geometry,
                frameClock,
                optics,
                bus,
                publisher,
                cnn,
                console,
                scope,
                settings,
                session?.collector,
                indexNow = { source.currentDecodedIndex },
                live = camera != null,
                visualCache = visualCache,
                markerPrepass = markerPrepass,
                parallelVisual = parallelVisual,
                priorLambda = options.priorLambda,
                priorSafety = options.priorSafety,
                motionDump = options.motionDump,
                startFen = recordedStartFen(options, video),
                cropClahe = cropClaheOf(spec),
                trace = trace,
            )
        stack.coordinator.applyCalibration(geometry, quad, "desktop", source.delivered)
        // N weitere Konfigurationen im SELBEN Bilddurchgang; ohne `configs=` entsteht hier nichts
        // und der Lauf ist Anweisung fuer Anweisung der alte (`MultiReplay.kt`).
        val extras =
            options.extraConfigs?.let { pfad ->
                ExtraEngines
                    .open(
                        readExtraConfigs(File(pfad), configFor),
                        geometry,
                        optics,
                        bus,
                        publisher,
                        cnn,
                        scope,
                        settings,
                        { source.currentDecodedIndex },
                        frameClock::now,
                        recordedStartFen(options, video),
                        cropClaheOf(spec),
                    )?.also { it.calibrate(geometry, quad, source.delivered) }
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
        // Beside the ROI dump: the engine's own verdict per frame, so a settle delay can be read off.
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
        // Where the CNN chain stopped. `observations` counts snapshots the observer EMITTED;
        // the engine's own `cnnSnaps` counts what arrived. Two numbers, one seam between them.
        println("cnn: state=${stack.observer.state.value} observations=${stack.observations} ${stack.observer.counters}")
        println(stack.dropLine())
        extras?.let { e -> e.tags.indices.forEach { println(e.cnnLine(it)) } }
        val totals = RunTotals(publisher.status.value?.note, stack.observations.toInt(), frames, stack.dropLine())
        session?.finish(video, options, config, geometry, totals)
        // Je Zusatz-Engine ein eigener Bewertungsblock, gegen DASSELBE Label wie der Hauptlauf.
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

/**
 * Wind the decoder to where `start=` says; null when nothing is skipped, which is the DEFAULT. The
 * old two-second lead cost a run 2 of its 4 moves (`docs/desktop-replay.md`).
 */
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

/**
 * The board view, unless the run is scripted. `quiet` is what makes a replay scriptable: with no
 * window, break-on-stuck would wait forever for a key nobody presses (`docs/desktop-replay.md`).
 */
private fun openView(
    options: ReplayOptions,
    name: String,
): TrackerView? {
    val view = if (options.watch) TrackerView.openOrNull("chesslab — $name") else null
    if (options.watch && view == null) println("no display: running without the board view")
    return view
}

/**
 * The signals the engine had AT COMMIT TIME. Measured 2026-08-24: they do not separate fabrications
 * from hits (`docs/commit-latency.md`), so this stays a diagnostic.
 */
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

/** The object graph the phone builds too, with this host's frame type and this run's optics. */
@Suppress("LongParameterList")
private fun buildStack(
    // Built by the caller and passed whole, because a label records it as `effective_config` —
    // the config the engine RAN, and two constructions drift (that is how ClipDriver desynced).
    config: TrackerConfig,
    geometry: BoardGeometry,
    clock: FrameClock,
    optics: Undistorter?,
    bus: CameraFrameBus<BufferedImage>,
    publisher: StatusPublisher,
    cnn: (() -> Attached)?,
    logs: TrackerLogs,
    scope: CoroutineScope,
    settings: SettingsRepository,
    collector: DecisionCollector? = null,
    /** The decoded frame under the engine right now (-1 live) — printed beside every state change. */
    indexNow: () -> Long = { -1L },
    live: Boolean = false,
    visualCache: VisualObservationCache? = null,
    markerPrepass: AlignmentMarkerPrepass? = null,
    parallelVisual: ParallelVisualPrepass? = null,
    priorLambda: Double = 0.0,
    priorSafety: Boolean = true,
    /** `motiondump=<file>`, or null. Measurement only — see `MotionDump`. */
    motionDump: String? = null,
    // Die Stellung der Aufnahme beim ersten Frame — eine Aufnahme beginnt mitten im Spiel.
    startFen: String = STARTPOS,
    cropClahe: CropClahe? = null,
    trace: ReplayTrace? = null,
): TrackerStack<Mat> =
    TrackerStack(
        TrackerSeed<Mat>(
            // NOT a preference and not a real default: `measuredBoardSize` clamps to 320..1280, so
            // a config still carrying the 1600 placeholder disagrees with every plane the warp
            // produces and `FrameLoop.step` refuses them, one silently dropped frame at a time.
            config = config,
            geometry = { geometry },
            corners = null,
            startFen = startFen,
            onDecision = {
                println("decision: ply=${it.ply} ${it.san ?: "-"} decider=${it.decider}")
                println("decision-conf: " + it.confidenceLine())
                collector?.offer(it)
                trace?.decision(it, indexNow())
            },
            // The frame loop's own account of where a move's latency went, on the video clock. The
            // phone writes the same transitions into its diagnostics file; here they go to stdout
            // beside the decisions, which is what makes a replay's timeline readable end to end.
            onState = { from, to, tsS ->
                val index = indexNow()
                println("state: %s -> %s at %.2fs".format(from, to, tsS) + if (index >= 0) " frame=$index" else "")
            },
            logs = logs,
            stages = { geo, cfg, store, frameBus, boardBus ->
                motionDumped(OpenCvStages({ it }, {}, geo, cfg, store, frameBus, boardBus, optics), motionDump)
            },
            // The VIDEO's clock, not this machine's — see `FrameClock`.
            nowMs = clock::now,
            // A replay runs its inference inline so the snapshot lands before the next frame is
            // decoded — the last wall-clock dependence, and the source of 54-vs-39-ply runs of
            // one unchanged file. Live keeps the phone's shape: a dedicated observer thread.
            observerDispatcher = if (live) null else Dispatchers.Unconfined,
            parallelCrops = !live,
            cachedVisual = parallelVisual?.lookup ?: visualCache?.lookup,
            observationSink = visualCache?.sink,
            priorLambda = priorLambda,
            priorSafety = priorSafety,
            cachedAlignment = visualCache?.alignmentLookup,
            alignmentSink = visualCache?.alignmentSink,
            cachedMarkerDetections = markerPrepass?.lookup,
            cropClahe = cropClahe,
        ),
        settings,
        publisher,
        bus,
        StageTimings(logLine = { println("chesslabPerf: $it") }),
        scope,
        // `nocnn` runs `Taint.cnnOcclusionFilter`'s ">2 changed squares = a hand" fallback ON
        // PURPOSE — it is a different tracker, and the two have to be comparable.
        cnn ?: { error("running without a CNN — the engine uses its occlusion fallback") },
    )

/**
 * Frames in, until the source runs dry or the viewer's window is closed. The view is consulted
 * BEFORE the next frame is pulled, so a stop shows the state that caused it, not the one after.
 */
@Suppress("LongParameterList")
private fun drive(
    source: FrameSource,
    stack: TrackerStack<Mat>,
    bus: CameraFrameBus<BufferedImage>,
    publisher: StatusPublisher,
    view: TrackerView?,
    dumpEvery: Int = 0,
    // Fired AFTER the engine saw the frame, index and picture in one call — the review-frame
    // writer's correctness rests on that.
    frameHook: ((Int, Mat, Double) -> Unit)? = null,
    // Process every stride-th decoded frame; time comes off each frame's PTS either way.
    stride: Int = 1,
    // Die Frames, die das TELEFON sah. Ist sie da, gilt sie und [stride] ruht — ein Replay, der
    // andere Bilder waehlt als die Messung, ist keine Reproduktion (`docs/desktop-replay.md`).
    recorded: RecordedFrameGate? = null,
    statusDump: java.io.Writer? = null,
    limitFrames: Int? = null,
    // Weitere Engines auf demselben Bild; null ist der gewohnte Lauf.
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

/**
 * What a hooked frame is CALLED over the whole recording. `drive`'s own count sat 878 frames into
 * 2026-08-16-20-41-33 and put every label 29 s ahead of its picture (`docs/desktop-replay.md`).
 */
internal fun hookIndex(
    decoded: Long,
    counted: Int,
): Int = if (decoded >= 0) decoded.toInt() else counted

/**
 * `fps=<n>` -> the frame stride, announced. Refused live: a camera already drops what the pipeline
 * cannot take, and the stride exists to give a replay that same reality, deterministically.
 */
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

/**
 * The engine's clock: wall time [live], else the frame's own PTS ([FrameSource.timestampMs]). NOT
 * `frames x 1000/fps` — that assumed CFR, which the phone never delivers (`docs/desktop-replay.md`).
 */
private class FrameClock(
    private val source: FrameSource,
    private val live: Boolean,
) {
    fun now(): Long = if (live) System.currentTimeMillis() else source.timestampMs.toLong()
}

/** stdout is this host's logcat. The channel names are the shared code's, unchanged. */
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

/** Settings a replay does not persist. The store is a seam precisely so a host can decline one. */
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

/** Die Stellung, auf der die Aufnahme beginnt — sonst die Grundstellung. */
private fun recordedStartFen(
    options: ReplayOptions,
    video: File?,
): String {
    val dir = recordingDirOf(options, video) ?: return STARTPOS
    val fen = RecordedFrames.startFen(File(dir, "timeline.jsonl")) ?: return STARTPOS
    if (fen != STARTPOS) println("start: $fen — where the recording begins, not the initial position")
    return fen
}

/**
 * Die Frame-Auswahl der Aufnahme, oder `null` wo keine gemessen wurde. `fps=<n>` trifft die Anzahl
 * der Frames, aber nicht die Bilder, die CameraX durchliess (`docs/desktop-replay.md`).
 */
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

/**
 * Wie `TrackerService`: die Vorverarbeitung kommt aus der `config.json` des Modells — der Desktop
 * baute sie nie und servierte `p4a-80-clahe` rohe Crops.
 */
private fun cropClaheOf(spec: ModelSpec?): CropClahe? =
    spec?.takeIf { it.claheClip > 0.0 }?.let { CropClahe(it.claheClip, it.claheTile, it.claheMinMean, it.claheMaxMean) }
