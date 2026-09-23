package com.chesslab.tracker.ui.analysis

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.PowerManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.platform.LocalContext
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.analysis.AnalysisSettings
import com.chesslab.tracker.analysis.AnalysisSettingsHost
import com.chesslab.tracker.analysis.AnalysisState
import com.chesslab.tracker.analysis.EngineService
import com.chesslab.tracker.analysis.GateBlock
import com.chesslab.tracker.analysis.GateInputs
import com.chesslab.tracker.analysis.RollingMedian
import com.chesslab.tracker.analysis.StockfishAnalyzer
import com.chesslab.tracker.analysis.UciEngine
import com.chesslab.tracker.analysis.gateBlock
import com.chesslab.tracker.ui.tracking.TrackerSessionHost
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File

private const val ENGINE_BINARY = "libstockfish.so"

private const val TOTAL_STAGE = "total"

/** An unreadable battery must not gate analysis off. */
private const val BATTERY_UNKNOWN = 100

interface PowerProbe {
    fun thermalStatus(): Int

    fun powerSaveMode(): Boolean

    fun batteryPercent(): Int

    fun charging(): Boolean
}

/** Stopped outright, not throttled, whenever [gateBlock] objects: an idle Stockfish still holds hash and threads. */
class AnalysisHost(
    private val analyzer: StockfishAnalyzer,
    val engines: EngineService,
    private val probe: PowerProbe,
    private val scope: CoroutineScope,
    private val now: () -> Long = System::currentTimeMillis,
    /** Hebt nur `enabled` auf; Hitze, Akku und Bildrate sperren weiter (`gateBlock`). */
    private val demand: () -> Boolean = { false },
) {
    val settings: StateFlow<AnalysisSettings> = AnalysisSettingsHost.settings
    val state: StateFlow<AnalysisState> = analyzer.state
    val result = analyzer.result

    private val blockFlow = MutableStateFlow<GateBlock?>(GateBlock.OFF)
    val block: StateFlow<GateBlock?> = blockFlow.asStateFlow()

    private val frameTimes = RollingMedian()
    private var trackingSince = 0L
    private var appliedOptions = AnalysisSettingsHost.settings.value.options

    // FOLLOWS the flow: Settings writes it without holding this host, and a change there did nothing to the engine.
    init {
        scope.launch {
            AnalysisSettingsHost.settings.collect { new ->
                if (new.options != appliedOptions) {
                    appliedOptions = new.options
                    analyzer.stop()
                }
                evaluate()
            }
        }
    }

    fun onStatus(status: TrackerStatus?) {
        if (status == null) {
            trackingSince = 0L
        } else if (trackingSince == 0L) {
            trackingSince = now()
        }
        status?.stageTimingsMs?.get(TOTAL_STAGE)?.let { frameTimes.add(it) }
        evaluate()
    }

    fun update(new: AnalysisSettings) = AnalysisSettingsHost.update(new)

    fun stop() = analyzer.stop()

    private fun evaluate() {
        val inputs =
            GateInputs(
                thermalStatus = probe.thermalStatus(),
                powerSaveMode = probe.powerSaveMode(),
                batteryPercent = probe.batteryPercent(),
                charging = probe.charging(),
                trackingStableMs = if (trackingSince == 0L) 0L else now() - trackingSince,
                medianFrameMs = frameTimes.median,
            )
        val wanted = AnalysisSettingsHost.settings.value.let { if (demand()) it.copy(enabled = true) else it }
        val blocked = gateBlock(inputs, wanted)
        blockFlow.value = blocked
        engines.updateGate(blocked)
        if (blocked == null) analyzer.start(scope) else analyzer.stop()
    }
}

class AndroidPowerProbe(
    private val context: Context,
) : PowerProbe {
    private val power = context.getSystemService(PowerManager::class.java)

    override fun thermalStatus(): Int = power?.currentThermalStatus ?: 0

    override fun powerSaveMode(): Boolean = power?.isPowerSaveMode ?: false

    override fun batteryPercent(): Int =
        // `getIntProperty` liefert ein PRIMITIVES int: "nicht unterstuetzt" kam als `Integer.MIN_VALUE` durch und
        // sperrte die Analyse dauerhaft.
        context
            .getSystemService(BatteryManager::class.java)
            ?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
            ?.takeIf { it in 0..100 }
            ?: BATTERY_UNKNOWN

    override fun charging(): Boolean {
        val status = batteryIntent()?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        return status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
    }

    private fun batteryIntent(): Intent? = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
}

/** One [EngineService] per process: bar, hint and review must self-disable on the same answer and never
 *  race two processes. */
object EngineServiceHost {
    private var instance: EngineService? = null

    @Synchronized
    fun of(context: Context): EngineService = instance ?: build(context.applicationContext).also { instance = it }

    private fun build(context: Context): EngineService {
        val path = File(context.applicationInfo.nativeLibraryDir, ENGINE_BINARY)
        return EngineService { if (path.canExecute()) UciEngine(path.absolutePath) else null }
    }
}

/** Read-only on the position: never a reference to the engine or the game. */
@Composable
fun rememberAnalysisHost(demand: () -> Boolean = { false }): AnalysisHost {
    val context = LocalContext.current.applicationContext
    val scope = rememberCoroutineScope()
    val engines = remember(context) { EngineServiceHost.of(context) }
    // `remember` haelt die ERSTE Lambda-Instanz; spaetere sieht der Host nur ueber `rememberUpdatedState`.
    val wanted by rememberUpdatedState(demand)
    return remember(context) {
        AnalysisHost(
            analyzer =
                StockfishAnalyzer(
                    fenProvider = {
                        TrackerSessionHost.session.value
                            ?.status
                            ?.value
                            ?.fen
                    },
                    engines = engines,
                    options = { AnalysisSettingsHost.settings.value.options },
                ),
            engines = engines,
            probe = AndroidPowerProbe(context),
            scope = scope,
            demand = { wanted() },
        )
    }
}
