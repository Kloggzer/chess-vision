package com.chesslab.tracker.settings

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/** The PROCESS's repository, not the tracker's: a second one over the same DataStore is a truth the engine
 *  never sees. [repository] stays null until the store is read, so no screen renders defaults then jumps. */
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
