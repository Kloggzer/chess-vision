package com.chesslab.tracker.ui.analysis

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.PowerManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.analysis.AnalysisSettings
import com.chesslab.tracker.analysis.AnalysisState
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
import java.io.File

private const val ENGINE_BINARY = "libstockfish.so"

private const val TOTAL_STAGE = "total"

/** An unreadable battery must not gate analysis off, so the fallback is "full". */
private const val BATTERY_UNKNOWN = 100

/** Survives navigation away from the tracking screen; the analyzer itself does not. */
private val storedSettings = MutableStateFlow(AnalysisSettings())

/** The Android half of the gate, behind an interface so [AnalysisHost] is testable on a plain JVM. */
interface PowerProbe {
    fun thermalStatus(): Int

    fun powerSaveMode(): Boolean

    fun batteryPercent(): Int

    fun charging(): Boolean
}

/**
 * Owns the analyzer while the tracking screen is composed and is the only place that reads
 * Android's power state.
 *
 * Analysis is subordinate: whenever [gateBlock] objects the engine is stopped outright rather than
 * throttled, because a Stockfish process that merely idles still holds its hash and its threads.
 */
class AnalysisHost(
    private val analyzer: StockfishAnalyzer,
    private val probe: PowerProbe,
    private val scope: CoroutineScope,
    private val now: () -> Long = System::currentTimeMillis,
) {
    val settings: StateFlow<AnalysisSettings> = storedSettings.asStateFlow()
    val state: StateFlow<AnalysisState> = analyzer.state
    val result = analyzer.result

    private val blockFlow = MutableStateFlow<GateBlock?>(GateBlock.OFF)
    val block: StateFlow<GateBlock?> = blockFlow.asStateFlow()

    private val frameTimes = RollingMedian()
    private var trackingSince = 0L

    /** Re-evaluates the gate on every published status. Cheap: four probe reads and a median. */
    fun onStatus(status: TrackerStatus?) {
        if (status == null) {
            trackingSince = 0L
        } else if (trackingSince == 0L) {
            trackingSince = now()
        }
        status?.stageTimingsMs?.get(TOTAL_STAGE)?.let { frameTimes.add(it) }
        evaluate()
    }

    /** A changed engine option only reaches Stockfish through a relaunch, so stop first. */
    fun update(new: AnalysisSettings) {
        val restart = new.options != storedSettings.value.options
        storedSettings.value = new
        if (restart) analyzer.stop()
        evaluate()
    }

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
        val blocked = gateBlock(inputs, storedSettings.value)
        blockFlow.value = blocked
        if (blocked == null) analyzer.start(scope) else analyzer.stop()
    }
}

/** Reads the live device state on each call; all four are cheap system-service lookups. */
class AndroidPowerProbe(
    private val context: Context,
) : PowerProbe {
    private val power = context.getSystemService(PowerManager::class.java)

    override fun thermalStatus(): Int = power?.currentThermalStatus ?: 0

    override fun powerSaveMode(): Boolean = power?.isPowerSaveMode ?: false

    override fun batteryPercent(): Int =
        context.getSystemService(BatteryManager::class.java)?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
            ?: BATTERY_UNKNOWN

    override fun charging(): Boolean {
        val status = batteryIntent()?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        return status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
    }

    private fun batteryIntent(): Intent? = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
}

/**
 * The FEN comes straight off the published status: analysis is strictly read-only on the position
 * and must never hold a reference to the engine or the game.
 */
@Composable
fun rememberAnalysisHost(): AnalysisHost {
    val context = LocalContext.current.applicationContext
    val scope = rememberCoroutineScope()
    return remember(context) {
        val path = File(context.applicationInfo.nativeLibraryDir, ENGINE_BINARY)
        AnalysisHost(
            analyzer =
                StockfishAnalyzer(
                    fenProvider = {
                        TrackerSessionHost.session.value
                            ?.status
                            ?.value
                            ?.fen
                    },
                    engineFactory = { if (path.canExecute()) UciEngine(path.absolutePath) else null },
                    options = { storedSettings.value.options },
                ),
            probe = AndroidPowerProbe(context),
            scope = scope,
        )
    }
}
