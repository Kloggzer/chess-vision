package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.CropClahe
import com.chesslab.geometry.Undistorter
import com.chesslab.tracker.camera.DeliveredSize
import com.chesslab.tracker.cnn.Attached
import com.chesslab.tracker.pipeline.OpenCvStages
import com.chesslab.tracker.pipeline.StageTimings
import com.chesslab.tracker.service.CameraFrameBus
import com.chesslab.tracker.service.StatusPublisher
import com.chesslab.tracker.service.TrackerSeed
import com.chesslab.tracker.service.TrackerStack
import com.chesslab.tracker.settings.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import org.opencv.core.Mat
import java.awt.image.BufferedImage

/** N Konfigurationen im SELBEN Bilddurchgang, gemessen 1,8x. Der Hauptstack bleibt unangetastet;
 *  die Zusatz-Engines teilen sich eine zweite Bahn (`docs/multireplay-2026-09-20.md`). */
internal class ExtraEngines private constructor(
    private val stacks: List<TrackerStack<Mat>>,
    private val shared: SharedFrameWork,
    val plies: List<MutableList<ScoredPly>>,
    val tags: List<String>,
) : AutoCloseable {
    /** Vor dem Hauptstack gerufen: jede Zusatz-Engine sieht denselben Frame. */
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

    override fun close() {
        for (stack in stacks) runCatching { stack.close() }
        runCatching { shared.close() }
    }

    companion object {
        @Suppress("LongParameterList")
        fun open(
            configs: List<Pair<String, TrackerConfig>>,
            geometry: BoardGeometry,
            optics: Undistorter?,
            bus: CameraFrameBus<BufferedImage>,
            publisher: StatusPublisher,
            cnn: (() -> Attached)?,
            scope: CoroutineScope,
            settings: SettingsRepository,
            indexNow: () -> Long,
            nowMs: () -> Long,
            startFen: String,
            cropClahe: CropClahe?,
        ): ExtraEngines? {
            if (configs.isEmpty()) return null
            // EINE ONNX-Sitzung fuer alle: je Engine eine eigene kostete elf Sitzungen mit je vier
            // Threads, und elf getrennte Memos drueckten die Cache-Trefferquote von 100 auf 72 %.
            // Gefahrlos, weil die Inferenz inline liegt und die Engines je Frame nacheinander laufen.
            val einer = requireNotNull(cnn) { "multireplay braucht die CNN" }()
            var shared: SharedFrameWork? = null
            val plies = configs.map { mutableListOf<ScoredPly>() }
            val stacks =
                configs.mapIndexed { i, (_, cfg) ->
                    TrackerStack(
                        TrackerSeed<Mat>(
                            config = cfg,
                            geometry = { geometry },
                            corners = null,
                            startFen = startFen,
                            onDecision = { d ->
                                d.san?.let { plies[i] += ScoredPly(it, indexNow().toInt(), d.decider) }
                            },
                            stages = { geo, c, store, frameBus, boardBus ->
                                val work =
                                    shared ?: SharedFrameWork(
                                        OpenCvStages({ it }, {}, geo, c, store, frameBus, boardBus, optics),
                                    ).also { shared = it }
                                SharedStages(work, c)
                            },
                            nowMs = nowMs,
                            // Wie im Hauptlauf: die Inferenz liegt INLINE, damit der Schnappschuss
                            // vor dem naechsten Frame ankommt (`docs/desktop-replay.md`).
                            observerDispatcher = Dispatchers.Unconfined,
                            parallelCrops = true,
                            cropClahe = cropClahe,
                        ),
                        settings,
                        publisher,
                        bus,
                        StageTimings(logLine = {}),
                        scope,
                        { einer },
                    )
                }
            return ExtraEngines(stacks, requireNotNull(shared), plies, configs.map { it.first })
        }
    }
}

/** `configs=`: je Zeile `<name> <knopf>=<wert> ...`, Leerzeilen und `#` fallen weg. Die Namen
 *  laufen durch denselben Katalog wie `set:` — ein Tippfehler bricht hier ab, nicht nach 20 min.
 *  [baue] ist die GANZE Kette des Hauptlaufs, nicht der fertige `base`: sonst landen die Knoepfe
 *  hinter `atFrameRate` und `coverage_gate` und heissen in den zwei Armen Verschiedenes. */
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
            val overrides =
                worte.drop(1).associate { wort ->
                    val key = wort.substringBefore('=')
                    val raw = wort.substringAfter('=', "")
                    key to (raw.toDoubleOrNull() ?: error("configs=: '$wort' ist kein <knopf>=<zahl>"))
                }
            worte.first() to baue(overrides)
        }
