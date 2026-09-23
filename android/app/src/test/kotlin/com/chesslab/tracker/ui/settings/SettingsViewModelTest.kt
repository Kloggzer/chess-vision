package com.chesslab.tracker.ui.settings

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.ConfigStore
import com.chesslab.tracker.settings.EpRequest
import com.chesslab.tracker.settings.MemoryStore
import com.chesslab.tracker.settings.NOTE_TUNED_LIVE
import com.chesslab.tracker.settings.SLOT_CONFIG
import com.chesslab.tracker.settings.SettingsRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private fun knob(key: String) = KNOB_CATALOG.first { it.key == key }

@OptIn(ExperimentalCoroutinesApi::class)
class SettingsViewModelTest {
    @Test
    fun aLiveKnobAppliesImmediatelyAndSaysSo() =
        runTest {
            val applied = mutableListOf<TrackerConfig>()
            val vm = viewModel(MemoryStore(), applied)
            vm.setKnob(knob("censusThr"), 55.0)
            advanceUntilIdle()
            assertEquals(NOTE_TUNED_LIVE, vm.note.value)
            assertEquals(55.0, applied.single().censusThr)
            assertTrue(vm.restartRequired.value.isEmpty())
        }

    @Test
    fun aRestartOnlyKnobIsFlaggedNeverSilentlyAccepted() =
        runTest {
            val applied = mutableListOf<TrackerConfig>()
            val vm = viewModel(MemoryStore(), applied)
            vm.setKnob(knob("alignEvery"), 5.0)
            advanceUntilIdle()
            assertNull(vm.note.value)
            assertEquals(setOf("alignEvery"), vm.restartRequired.value)
            // Persisted and forwarded all the same: only the EFFECT waits for the restart.
            assertEquals(5, applied.single().alignEvery)
        }

    @Test
    fun aRestartOnlyEditSurvivesAReload() =
        runTest {
            val store = MemoryStore()
            viewModel(store, mutableListOf()).setKnob(knob("alignEvery"), 5.0)
            advanceUntilIdle()
            val reloaded = SettingsRepository(store, this) {}
            reloaded.load()
            assertEquals(5, reloaded.config.value.alignEvery)
        }

    @Test
    fun resetGroupOnlyTouchesItsOwnGroup() =
        runTest {
            val vm = viewModel(MemoryStore(), mutableListOf())
            vm.setKnob(knob("censusThr"), 55.0)
            vm.setKnob(knob("cnnConfThr"), 0.5)
            vm.resetGroup(KnobGroup.EVIDENCE)
            advanceUntilIdle()
            assertEquals(TrackerConfig().censusThr, vm.config.value.censusThr)
            assertEquals(0.5, vm.config.value.cnnConfThr)
            assertEquals(0, modifiedCount(KnobGroup.EVIDENCE, vm.config.value))
            assertEquals(1, modifiedCount(KnobGroup.CNN, vm.config.value))
        }

    @Test
    fun resetAllRestoresThePythonDefaults() =
        runTest {
            val store = MemoryStore()
            val vm = viewModel(store, mutableListOf())
            vm.setKnob(knob("censusThr"), 55.0)
            vm.setKnob(knob("alignEvery"), 5.0)
            vm.resetAll()
            advanceUntilIdle()
            assertEquals(TrackerConfig(), vm.config.value)
            assertTrue(store.slots.getValue(SLOT_CONFIG).isNotBlank())
        }

    @Test
    fun appSettingsPersistAndNeedARestart() =
        runTest {
            val store = MemoryStore()
            val vm = viewModel(store, mutableListOf())
            vm.setApp(AppSettings(epRequest = EpRequest.CPU))
            vm.setDebugEnabled(true)
            advanceUntilIdle()
            assertTrue(vm.restartRequired.value.isNotEmpty())
            val reloaded = SettingsRepository(store, this) {}
            reloaded.load()
            assertEquals(EpRequest.CPU, reloaded.appSettings.value.epRequest)
            assertTrue(reloaded.debugEnabled.value)
        }
}

// The TestScope itself, not `backgroundScope`: `advanceUntilIdle` stops when the FOREGROUND is idle, so a
// persist launched into the background scope would never run.
private fun TestScope.viewModel(
    store: ConfigStore,
    applied: MutableList<TrackerConfig>,
): SettingsViewModel = SettingsViewModel(SettingsRepository(store, this) { applied += it })
