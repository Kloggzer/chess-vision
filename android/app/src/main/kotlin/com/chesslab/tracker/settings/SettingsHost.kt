package com.chesslab.tracker.settings

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * The ONE repository, and where the UI picks it up.
 *
 * It belongs to the PROCESS, not to the tracker. The service used to build it, so with the camera
 * no longer starting on launch the settings screen would have been dead until somebody started a
 * game — and a second repository over the same DataStore is a second source of truth the engine
 * never sees the edits of.
 *
 * [repository] stays null until the store has been read, so no screen renders the defaults and then
 * jumps; [get] returns the instance immediately, because the service needs the handle before it
 * needs the values (it waits on `awaitLoaded`).
 */
object SettingsHost {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private var instance: SettingsRepository? = null

    private val current = MutableStateFlow<SettingsRepository?>(null)

    val repository: StateFlow<SettingsRepository?> = current

    @Synchronized
    fun get(context: Context): SettingsRepository =
        instance ?: SettingsRepository(DataStoreConfigStore(context.applicationContext), scope).also {
            instance = it
            scope.launch {
                it.load()
                current.value = it
            }
        }
}
