package com.chesslab.tracker.ui.debug

import android.app.Application
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelStore
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.cnn.CnnState
import com.chesslab.tracker.service.CnnRuntimeInfo
import com.chesslab.tracker.service.DebugCrops
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

private class FixedCropSession : DebugSession {
    override val status = MutableStateFlow<TrackerStatus?>(null)
    override val cnnState = MutableStateFlow<CnnState>(CnnState.Off)
    override val config = MutableStateFlow(TrackerConfig())
    override val debugPinned = MutableStateFlow(false)
    override val workProfilingAvailable = false
    override val workProfilingEnabled = MutableStateFlow(false)

    private val crops = DebugCrops(listOf(BgrImage(1, 1, ByteArray(3))), seq = 7L, tsMs = 0L)

    override fun setDebugEnabled(on: Boolean) = Unit

    override fun setWorkProfilingEnabled(on: Boolean) = Unit

    override fun workProfileReport(): String? = null

    override fun latestCrops(): DebugCrops = crops

    override fun cnnRuntime() = CnnRuntimeInfo(null, null, null, null, null, null, 0.0, 0)

    override fun retryCnnAttach() = Unit
}

/** Tiles dropped but their sequence kept: coming back rendered nothing until the next glance — on a paused
 *  tracker, never. */
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, application = Application::class)
class CropTabReturnTest {
    private val store = ViewModelStore()

    /** Real time: the poll loop never ends, and `runTest` walks such a loop forever. */
    @Before
    fun setUp() = Dispatchers.setMain(Dispatchers.Default)

    @After
    fun tearDown() {
        store.clear()
        Dispatchers.resetMain()
    }

    @Test
    fun `reopening the crops tab redraws the observation it already had`() {
        val viewModel = ViewModelProvider(store, ViewModelProvider.NewInstanceFactory())[DebugViewModel::class.java]
        viewModel.attach(FixedCropSession())

        viewModel.onTabSelected(DebugTab.CROPS)
        assertEquals("the first visit decodes the observation", 1, viewModel.tiles())

        viewModel.onTabSelected(DebugTab.TIMINGS)
        Thread.sleep(POLL_WAIT_MS)
        viewModel.onTabSelected(DebugTab.CROPS)

        assertEquals("the same observation must come back", 1, viewModel.tiles())
    }
}

/** Two poll periods, checked ten times each, so a slow machine is patience and not a failure. */
private fun DebugViewModel.tiles(): Int {
    repeat(TILE_TRIES) {
        if (crops.value.isNotEmpty()) return crops.value.size
        Thread.sleep(TILE_SLEEP_MS)
    }
    return 0
}

private const val POLL_WAIT_MS = 700L

private const val TILE_TRIES = 40

private const val TILE_SLEEP_MS = 50L
