package com.chesslab.desktop

import java.io.File
import kotlin.system.exitProcess

/**
 * The tracker on a PC, running the code the phone runs — one object graph, no second pipeline and
 * no second clock. Why it is built this way, and what each decision cost: `docs/desktop-replay.md`.
 */
fun main(args: Array<String>) {
    // Der Fuzzer misst die Bewegung seit 2026-09-20 mit dem ECHTEN `RoiMotion` auf seinen
    // gerenderten Pixeln und braucht die Natives deshalb auch.
    if (args.firstOrNull() == "fuzz") {
        NativeCv.require()
        return when (args.getOrNull(1)) {
            "check" -> fuzzCheck(args.drop(2))
            "ablate" -> fuzzAblate(args.drop(2))
            else -> fuzzVerb(args.drop(1))
        }
    }
    NativeCv.require()
    when (args.firstOrNull()) {
        in FILE_TOOLS -> FILE_TOOLS.getValue(args.first())(args.drop(1))
        "cameras" -> probeCameras().ifEmpty { listOf("no camera answered on indices 0..3") }.forEach(::println)
        "replay" -> {
            val video = File(args.getOrNull(1) ?: usage())
            check(video.isFile) { "no such video: ${video.absolutePath}" }
            replay(openRecording(video), video.name, ReplayOptions.parse(args.drop(2)), video = video)
        }
        "batchreplay" -> batchReplay(args.getOrNull(1) ?: usage(), args.drop(2))
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

/** Mehrere Aufnahmen in EINEM Prozess: JVM-Start und JIT kosten zusammen ~17 s und fielen bisher
 *  je Aufnahme an. Namen loesen nach `data/recordings/<name>/video.mp4` auf. */
private fun batchReplay(
    names: String,
    rest: List<String>,
) {
    val namen = names.split(",").map(String::trim).filter(String::isNotEmpty)
    check(namen.isNotEmpty()) { "batchreplay wants <name1,name2,...>" }
    for (name in namen) {
        val video = File(File(RECORDINGS_DIR, name), "video.mp4")
        check(video.isFile) { "no such recording: ${video.absolutePath}" }
        println("===== $name")
        replay(openRecording(video), video.name, ReplayOptions.parse(rest + "name=$name"), video = video)
    }
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
