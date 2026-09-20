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

/**
 * N zusaetzliche Konfigurationen im SELBEN Bilddurchgang — sie teilen sich eine Pixel-Bahn.
 *
 * Gemessen lohnt es doppelt: 57 % eines Laufs sind fester Aufwand (JVM, Modell, Vorlauf), und der
 * Frame-Durchgang haengt von den Engine-Knoepfen gar nicht ab. Der HAUPTstack bleibt unangetastet
 * — er faehrt seinen eigenen Weg wie bisher, die Zusatz-Engines teilen sich eine zweite Bahn. Bei
 * zehn Konfigurationen sind das zwei Durchgaenge statt elf.
 *
 * Bewusst KEIN Umbau von `buildStack`: der Hauptpfad traegt Regressionssatz, Clips und die
 * Paritaetstests, und eine Aenderung dort ist mit nichts zu belegen, was nicht selbst durch ihn
 * laeuft. Der Nachweis ist stattdessen: dieselbe Konfiguration hier und dort muss Ziffer fuer
 * Ziffer dasselbe liefern.
 */
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

/**
 * Die Datei hinter `configs=`: je Zeile ein Name und die Knoepfe, die er gegen [base] aendert.
 *
 * ```
 * t000 motionThr=0.31 commitHoldS=0.042
 * t001 motionThr=0.44
 * ```
 * Leerzeilen und `#`-Zeilen fallen weg. Die Knopfnamen laufen durch denselben Katalog wie `set:`,
 * ein Tippfehler bricht also hier ab und nicht erst nach zwanzig Minuten Rechnung.
 */
internal fun readExtraConfigs(
    file: java.io.File,
    base: TrackerConfig,
): List<Pair<String, TrackerConfig>> =
    file.readLines()
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
            worte.first() to base.withOverrides(overrides)
        }
