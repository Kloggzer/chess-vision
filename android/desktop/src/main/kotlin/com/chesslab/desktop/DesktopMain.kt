package com.chesslab.desktop

import com.chesslab.engine.api.DebugDecision
import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.CropClahe
import com.chesslab.geometry.LensFit
import com.chesslab.geometry.Undistorter
import com.chesslab.geometry.alignmentOf
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.toModel
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.cnn.Attached
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.geometry.boardGeometryFor
import com.chesslab.tracker.geometry.calibrateFromBoard
import com.chesslab.tracker.geometry.cropLine
import com.chesslab.tracker.geometry.model
import com.chesslab.tracker.geometry.quadOf
import com.chesslab.tracker.geometry.rawQuadOf
import com.chesslab.tracker.geometry.refinedQuad
import com.chesslab.tracker.geometry.squareOffsetOf
import com.chesslab.tracker.geometry.withCropOf
import com.chesslab.tracker.io.Jsonl
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
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import org.opencv.core.Mat
import java.awt.image.BufferedImage
import java.io.File
import java.util.Locale
import kotlin.system.exitProcess

/**
 * The tracker on a PC, running the code the phone runs — one object graph, no second pipeline and
 * no second clock. Why it is built this way, and what each decision cost: `docs/desktop-replay.md`.
 */
fun main(args: Array<String>) {
    NativeCv.require()
    when (args.firstOrNull()) {
        in FILE_TOOLS -> FILE_TOOLS.getValue(args.first())(args.drop(1))
        "cameras" -> probeCameras().ifEmpty { listOf("no camera answered on indices 0..3") }.forEach(::println)
        "replay" -> {
            val video = File(args.getOrNull(1) ?: usage())
            check(video.isFile) { "no such video: ${video.absolutePath}" }
            replay(openRecording(video), video.name, ReplayOptions.parse(args.drop(2)), video = video)
        }
        "calibrate" -> {
            val index = args.getOrNull(1)?.toIntOrNull() ?: usage()
            WebcamSource(index).use { calibrate(it) }
        }
        "align" -> alignCamera(args.getOrNull(1)?.toIntOrNull() ?: usage())
        "track" -> {
            val index = args.getOrNull(1)?.toIntOrNull() ?: usage()
            replay(WebcamSource(index), "camera $index", ReplayOptions.parse(args.drop(2)), "webcam:$index")
        }
        else -> usage()
    }
}

/**
 * `align <n>` — the board against its own grid, as the frames arrive. The `raw` toggle that used to
 * sit here died with the stored calibration; `undistort` answers that now (`docs/desktop-replay.md`).
 */
private fun alignCamera(index: Int) {
    val cost = Cost()
    WebcamSource(index).use { source ->
        measureAlignment(timedFrames(source, null, cost), cost)
    }
    cost.report("what each frame cost:")
}

/** The camera's frames, corrected if a lens is in play, with both halves on the clock. */
private fun timedFrames(
    source: FrameSource,
    optics: Undistorter?,
    cost: Cost,
): () -> Mat? =
    {
        cost.of("camera grab") { source.next() }?.let { frame ->
            if (optics == null) frame else cost.of("lens remap") { optics.apply(frame) }
        }
    }

/**
 * The board's own markers, before anything else is built — the quad decides the board size, which
 * decides the warp, so it cannot be a stage in the loop (`docs/desktop-replay.md`).
 */
private fun locateBoard(
    next: () -> Mat?,
    cost: Cost = Cost(),
    attempts: Int = LOCATE_ATTEMPTS,
): FloatArray? {
    repeat(attempts) {
        val frame = next() ?: return null
        // The two halves of `quadOf`, timed separately: each carries its own unverified ms claim,
        // and one combined number could check neither (`docs/desktop-replay.md`).
        val markers = cost.of("aruco") { rawQuadOf(frame) } ?: return@repeat
        return cost.of("grid refit") { refinedQuad(frame, markers) }
    }
    return null
}

/**
 * What the STORED marker margin (0.045, hand-glued) costs here, measured absolutely by `alignmentOf`.
 * Changes nothing: a per-corner margin waits until this says by how much (`docs/desktop-replay.md`).
 */
private fun measureAlignment(
    next: () -> Mat?,
    cost: Cost = Cost(),
    frames: Int = ALIGN_FRAMES,
) {
    val quad =
        locateBoard(next, cost) ?: run {
            println("no board found: the markers never decoded")
            return
        }
    val geometry = boardGeometryFor(quad)
    val corners = cornersFromFlat(quad)
    println("board ${geometry.boardSize} px, margin ${geometry.margin.joinToString { "%.3f".format(it) }} (the stored constant)")
    val worst = mutableListOf<Double>()
    var unread = 0
    var read = 0
    repeat(frames) {
        val frame = next() ?: return@repeat
        val verdict = cost.of("alignmentOf") { alignmentOf(frame, corners, geometry) }
        if (verdict.worst.isFinite()) worst += verdict.worst
        unread += verdict.unread
        read += 1
        if (read == 1) println("first verdict: ${verdict.reason} (limit ${"%.2f".format(verdict.limit)} px)")
    }
    if (worst.isEmpty()) {
        println("no frame could be measured at all")
        return
    }
    val sorted = worst.sorted()
    println(
        "worst square offset over $read frames: " +
            "median ${"%.2f".format(sorted[sorted.size / 2])} px, " +
            "p90 ${"%.2f".format(sorted[(sorted.size * P90_NUM) / P90_DEN])} px, " +
            "max ${"%.2f".format(sorted.last())} px",
    )
    println("grid lines that could not be located: $unread over ${read * GRID_LINES_PER_FRAME}")
    next()?.let { frame ->
        rawQuadOf(frame)?.let { raw ->
            writeQuadProbe(frame, raw, File(QUAD_PROBE_PATH))?.let { println("probe: ${it.absolutePath}") }
        }
    }
}

/**
 * Calibrate the lens from the board, and say plainly whether it worked. Writes nothing on its own:
 * a calibration that misses the limit is a finding, not a file (`docs/desktop-replay.md`).
 */
private fun calibrate(source: FrameSource) {
    // A LOAN, not a getter: `next()` hands back a Mat the source still owns and will overwrite
    // (`docs/desktop-replay.md`).
    val fit =
        calibrateFromBoard(
            { use -> source.next()?.also(use) != null },
            source.delivered.width,
            source.delivered.height,
        ) { println("  $it") }
    when {
        fit == null -> println("no board found: the markers never decoded")
        fit.rejected != null -> println("evidence: ${fit.evidence} — refused: ${fit.rejected}")
        else -> report(source, fit)
    }
}

private fun report(
    source: FrameSource,
    fit: LensFit,
) {
    println("evidence: ${fit.evidence}")
    println(
        "bow ${"%.5f".format(fit.bowBefore)} → ${"%.5f".format(fit.bowAfter)}  " +
            "k1=${"%.4f".format(fit.k1)} k2=${"%.4f".format(fit.k2)} " +
            "centre=(${"%.0f".format(fit.cx)}, ${"%.0f".format(fit.cy)})",
    )
    if (!fit.ok) {
        println("not accepted: the bow did not improve by the required margin")
        return
    }
    // The verdict the fit does not control. A model that flattens its own objective and leaves the
    // squares where they were has explained nothing — which is a finding, not a calibration.
    val size = source.delivered
    val raw = medianOffset(source::next)
    val corrected =
        Undistorter(fit.toModel(), size.width, size.height).use { undistorter ->
            medianOffset(next = { source.next()?.let(undistorter::apply) })
        }
    println(
        "worst square offset: ${raw?.let { "%.2f".format(it) } ?: "unmeasurable"} px raw → " +
            "${corrected?.let { "%.2f".format(it) } ?: "unmeasurable"} px corrected",
    )
    writeLensProbe(source, fit, File(PROBE_PATH))?.let { println("probe: ${it.absolutePath}") }
}

/**
 * Median worst square offset over [frames], the only form these numbers may be compared in. Per-run
 * spread is <= 0.07 px over sixty frames — measured, not assumed (`docs/desktop-replay.md`).
 */
private fun medianOffset(
    next: () -> Mat?,
    frames: Int = ALIGN_FRAMES,
): Double? {
    val seen = mutableListOf<Double>()
    repeat(frames) {
        val frame = next() ?: return@repeat
        quadOf(frame)?.let { quad -> squareOffsetOf(frame, quad).takeIf { it.isFinite() }?.let(seen::add) }
    }
    return seen.sorted().getOrNull(seen.size / 2)
}

private fun usage(): Nothing {
    listOf(
        "usage: chesslab-desktop <command>",
        "  cameras                    what is attached, as the driver reports it",
        "  calibrate <camera-index>   fit the lens from the board's own grid lines",
        "  align <camera-index>       measure the board against its own grid",
        "  undistort <video> <outDir> [every=N]  write the frames with the barrel taken out",
        "  rectify <video> <outDir> [frames=<f>|every=N] [size=N] [lens]  the straightened board, per frame",
        "  crops <video> <outDir> [frames=<f>|every=N] [out=WxH]  the 64 square crops, as the device cuts them",
        "  turntable-pack <video> <fen> <outDir> [every=N] [max=N] [id=name]  clean video -> RGB memmap",
        "  turntable-preview <packDir> <out.png>  contact sheet of the first clean packed board",
        "  turntable-dataset <outDir> <testPack> <valPack> <trainPack>... [emptyRatio=N]  fixed roles",
        "  labeled-video-pack <video> <log> <corrections> <outDir> [every=N] [id=name]  labels -> 80px memmap",
        "  occlusion-video-pack <video> <log> <corrections> <outDir> [session=name] [id=name]  manual occlusions -> 80px memmap",
        "  training-video-pack <video> <game.json> <outDir> [every=N] [stable=N] [fps=N] [model=name]",
        "                       [visualcache=file] [id=name]  visual packs; id keys the manifest rows",
        "  labeled-session-pack <sessionDir> <outDir> [corrections=file] [id=name]  stored frames -> memmap",
        "  legacy-synth-dataset <root> <manifest> <outDir> [prefix=x]  parked crops -> 80px memmap",
        "  repair-recording <broken.mp4> <reference.mp4> <out.mp4>  rebuild an index a kill never wrote",
        "  phone-candidate <recordingDir> [force=1] [model=name]  the phone's own plies as candidate.json",
        "  replay <video.mp4> [options]  drive a recorded clip through the shipping tracker",
        "  track <camera-index> [options]  the same, live",
        "",
        "  options (order-free): quiet  no window, for scripted runs",
        "                        dump   write the annotated board every 150 frames to tmp/",
        "                        lens   fit the optics from the board in the footage first",
        "                        nocnn  run the engine's no-observation occlusion fallback",
        "                        label  measure the geometry, replay, and write the tracker's",
        "                               PROPOSAL to data/recordings/<name>/candidate.json",
        "                        score  compare a run against an existing candidate.json:",
        "                               found / missed / invented, never one merged accuracy",
        "                        frames write the DECISIVE frames (every decision row, ±2) as the",
        "                               normalised labeled board to data/recordings/<name>/frames-decisive/",
        "                        name=<x>  the candidate's directory name (default: video stem)",
        "                        cleanonly  EXPERIMENT: commit and vote only on a hand-free board",
        "                        model=<name>  one of the bundled graphs",
        "                        prior=<lambda>  legal-placement prior weight; 0 is off",
        "                        prior-mode=old|new  conditioned-everywhere vs raw/invalid safety",
        "                        fps=<n>  process every k-th frame (realtime emulation, counted",
        "                               as dropped(stride); the clock still ticks every frame)",
        "                        visualcache=<file>  build once when absent, then replay cached",
        "                               visual observations while still processing every frame",
        "                        visualworkers=<n>  EXPERIMENT: regenerate cached visual rows",
        "                               through a bounded cross-frame worker pipeline",
        "                        workprofile  report exact source calls, semantic repeats,",
        "                               copied bytes, cache hits and the instrumented call graph",
        "",
        "  The board view opens unless 'quiet' or 'dump': it shows the rectified warp the engine",
        "  reasons about with its per-square verdicts, and STOPS when the engine gets stuck",
        "  (space steps, c continues, s disarms).",
    ).forEach(::println)
    exitProcess(2)
}

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
                ?: recordedQuad(options, video)?.also { println("quad: from the recording's log.jsonl — what the phone stood on") }
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
            replayBoardGeometry(quad, sessionDirOf(options, video), options.configFile?.let(::File)).withCropOf(spec)
        // Before the config, because the config depends on it: `motionThr` is a per-frame-period
        // percent, so the rate frames REACH the engine at scales it — as `TrackerService` does live.
        val recorded = recordedFrameGate(options, video)
        val stride = if (recorded != null) 1 else strideOf(options.fps, source.fps, live = camera != null)
        // The coverage gate rides in the MODEL, not in the engine (`docs/occlusion-gate.md`). The
        // replay did not apply it, so it measured at 0.5 while the phone ran the model's own 0.15.
        val config =
            options
                .trackerConfig(geometry, live = camera != null, emulatedFps = (source.fps / stride).takeIf { stride > 1 })
                .withCoverageGateOf(spec, options.overrides.keys)
        println("board located from its markers: ${geometry.boardSize} px warp  ·  $options")
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
                    File(path.replace('~', ' ')),
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
                    ),
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
                trace,
            )
        statusDump?.close()
        println("tracked $frames frames of $name at ${"%.2f".format(source.fps)} fps")
        // Where the CNN chain stopped. `observations` counts snapshots the observer EMITTED;
        // the engine's own `cnnSnaps` counts what arrived. Two numbers, one seam between them.
        println("cnn: state=${stack.observer.state.value} observations=${stack.observations} ${stack.observer.counters}")
        println(stack.dropLine())
        val totals = RunTotals(publisher.status.value?.note, stack.observations.toInt(), frames, stack.dropLine())
        session?.finish(video, options, config, geometry, totals)
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
 * from hits (`docs/commit-calibration.md`), so this stays a diagnostic.
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

/** Frames to spend looking for the markers before giving up. At 30 fps this is two seconds. */
private const val LOCATE_ATTEMPTS = 60

/** Frames to judge the alignment over. Two seconds is enough to see a jitter that matters. */
private const val ALIGN_FRAMES = 60

/** Nine lines per axis, both axes — what `gridLines` reports on every frame. */
private const val GRID_LINES_PER_FRAME = 18

private const val P90_NUM = 9

private const val P90_DEN = 10

/** Where the visual proof lands. Under tmp/, which is not the corpus. */
private const val PROBE_PATH = "../../tmp/lens-probe.png"

/** Where the quad comparison lands. */
private const val QUAD_PROBE_PATH = "../../tmp/quad-probe.png"

/**
 * The verbs that take a FILE and write files — grouped so `main` stays under detekt's complexity
 * cap as they grow. They share a shape the camera verbs do not: no window, no engine, no clock.
 */
private val FILE_TOOLS: Map<String, (List<String>) -> Unit> =
    mapOf(
        "undistort" to ::undistortVideo,
        "rectify" to ::rectifyVideo,
        "crops" to ::cropsOfVideo,
        "probe-crop" to ::probeCrop,
        "turntable-pack" to ::packTurntableVideo,
        "turntable-preview" to ::previewTurntablePack,
        "turntable-dataset" to ::assembleTurntableDataset,
        "labeled-video-pack" to ::packLabeledVideo,
        "occlusion-video-pack" to ::packOcclusionVideo,
        "training-video-pack" to ::packTrainingVideo,
        "repair-recording" to ::repairRecording,
        "labeled-session-pack" to ::packLabeledSession,
        "legacy-synth-dataset" to ::buildLegacySynthDataset,
        "phone-candidate" to ::phoneCandidate,
    )

/**
 * Die Ecken, auf denen das TELEFON stand — aus dem `log.jsonl` der Aufnahme. Die beiden Quellen
 * liegen gemessen 6 bis 25 Plies auseinander (specs/52, `docs/desktop-replay.md`).
 */
private fun recordedQuad(
    options: ReplayOptions,
    video: File?,
): FloatArray? {
    val log = File(sessionDirOf(options, video) ?: return null, "log.jsonl")
    if (!log.isFile) return null
    val first = Jsonl.rows(log).firstOrNull() ?: return null
    return runCatching {
        first
            .getValue("corners")
            .jsonArray
            .flatMap { point -> point.jsonArray.map { it.jsonPrimitive.content.toFloat() } }
            .toFloatArray()
            .takeIf { it.size == QUAD_FLOATS }
    }.getOrNull()
}

/** Vier Ecken zu je x und y. */
private const val QUAD_FLOATS = 8

/** Das Verzeichnis der Aufnahme — dieselbe Namensregel wie ueberall: `name=`, sonst der Videostamm. */
private fun sessionDirOf(
    options: ReplayOptions,
    video: File?,
): File? = (options.name ?: video?.nameWithoutExtension)?.let { File(RECORDINGS_DIR, it) }

/** Die Stellung, auf der die Aufnahme beginnt — sonst die Grundstellung. */
private fun recordedStartFen(
    options: ReplayOptions,
    video: File?,
): String {
    val dir = sessionDirOf(options, video) ?: return STARTPOS
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
    val dir = sessionDirOf(options, video) ?: return null
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
