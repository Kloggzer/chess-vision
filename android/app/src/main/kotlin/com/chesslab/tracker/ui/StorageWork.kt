package com.chesslab.tracker.ui

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.io.IOException
import kotlin.coroutines.CoroutineContext

/** Background file work whose failure reaches the screen WITH its reason instead of the crash handler. */
internal fun CoroutineScope.launchStorageWork(
    context: CoroutineContext,
    onFailure: (String) -> Unit,
    block: suspend () -> Unit,
    start: CoroutineStart = CoroutineStart.DEFAULT,
): Job =
    launch(context, start) {
        try {
            block()
        } catch (e: IOException) {
            onFailure("Storage error: ${e.message}")
        }
    }

internal fun notSaved(e: IOException): String = "Not saved (${e.message}) — lost on restart"
