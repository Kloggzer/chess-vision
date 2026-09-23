package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.camera.DeliveredSize
import com.chesslab.tracker.log.NoTrackerLogs
import com.chesslab.tracker.pipeline.OpenCvStages
import com.chesslab.tracker.service.TrackerStack
import org.opencv.core.Mat

/** N Konfigurationen im SELBEN Bilddurchgang, gemessen 1,8x. Der Hauptstack bleibt unangetastet;
 *  die Zusatz-Engines teilen sich eine zweite Bahn (`docs/desktop-replay.md`). */
internal class ExtraEngines private constructor(
    val stacks: List<TrackerStack<Mat>>,
    private val shared: SharedFrameWork,
    val plies: List<MutableList<ScoredPly>>,
    val tags: List<String>,
) : AutoCloseable {
    fun onFrame(
        frame: Mat,
        delivered: DeliveredSize,
    ) {
        shared.beginFrame(frame)
        for (stack in stacks) stack.coordinator.onFrame(frame, delivered)
    }

    fun calibrate(
        geometry: BoardGeometry,
        quad: FloatArray,
        delivered: DeliveredSize,
    ) {
        for (stack in stacks) stack.coordinator.applyCalibration(geometry, quad, "desktop", delivered)
    }

    /** Je Arm sichtbar: `k2..k10` standen mit `noCrops` = alle Versuche und niemand sah es. */
    fun cnnLine(i: Int): String = "cnn[${tags[i]}]: observations=${stacks[i].observations} ${stacks[i].observer.counters}"

    override fun close() {
        for (stack in stacks) runCatching { stack.close() }
        runCatching { shared.close() }
    }

    companion object {
        fun open(
            configs: List<Pair<String, TrackerConfig>>,
            rig: ReplayRig,
        ): ExtraEngines? {
            if (configs.isEmpty()) return null
            require(!rig.live) { "configs= ist ein Replay-Instrument: live liefe die geteilte CNN auf N Threads" }
            // Die Bildkette baut EIN Arm fuer alle: Knoepfe, die sie formen, galten sonst still nur fuer ihn.
            val kette = configs.map { (_, c) -> Triple(c.boardSize, c.detectScale, c.diffClaheClip) }.distinct()
            require(kette.size == 1) {
                "configs=: boardSize/detectScale/diffClaheClip formen die geteilte Bildkette, je Lauf EIN Wert: $kette"
            }
            // EINE ONNX-Sitzung fuer alle: elf getrennte Memos drueckten die Cache-Trefferquote von 100 auf 72 %.
            // Gefahrlos, weil die Inferenz inline liegt und die Engines je Frame nacheinander laufen.
            val einer = requireNotNull(rig.cnn) { "multireplay braucht die CNN" }()
            var shared: SharedFrameWork? = null
            val plies = configs.map { mutableListOf<ScoredPly>() }
            val stacks =
                configs.mapIndexed { i, (tag, cfg) ->
                    rig.stack(
                        cfg,
                        stages = { geo, c, store, frameBus, boardBus ->
                            val work =
                                shared ?: SharedFrameWork { cut ->
                                    OpenCvStages({ it }, {}, geo, c, cut, frameBus, boardBus, rig.optics)
                                }.also { shared = it }
                            SharedStages(work, c, store)
                        },
                        onDecision = { d -> d.san?.let { plies[i] += ScoredPly(it, rig.indexNow().toInt(), d.decider) } },
                        stateTag = "state[$tag]",
                        writes = false,
                        logs = NoTrackerLogs,
                        classifier = { einer },
                    )
                }
            return ExtraEngines(stacks, requireNotNull(shared), plies, configs.map { it.first })
        }
    }
}

/** `configs=`: je Zeile `<name> <knopf>=<wert> ...`. Namen laufen durch den Katalog von `set:`. [baue] ist die
 *  GANZE Kette des Hauptlaufs: sonst landen die Knoepfe hinter `atFrameRate` und `coverage_gate`. */
internal fun readExtraConfigs(
    file: java.io.File,
    baue: (Map<String, Double>) -> TrackerConfig,
): List<Pair<String, TrackerConfig>> =
    file
        .readLines()
        .map(String::trim)
        .filter { it.isNotEmpty() && !it.startsWith("#") }
        .map { line ->
            val worte = line.split(Regex("""\s+"""))
            val overrides = worte.drop(1).associate { knobAssignment(it, "configs=") }
            worte.first() to baue(overrides)
        }
