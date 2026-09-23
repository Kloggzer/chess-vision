package com.chesslab.tracker.ui.tracking

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.PointerEventType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.chesslab.tracker.R
import kotlinx.coroutines.delay

private const val BLACKOUT_AFTER_MS = 60_000L

/** Only the PICTURE goes: camera, engine, recorder and speech live in `TrackerService`, which never sees this. */
@Composable
fun ScreenBlackout(content: @Composable () -> Unit) {
    var touches by remember { mutableIntStateOf(0) }
    var black by remember { mutableStateOf(false) }
    val wake = LocalContext.current.getString(R.string.tracking_blackout)
    LaunchedEffect(touches) {
        black = false
        delay(BLACKOUT_AFTER_MS)
        black = true
    }
    Box(
        // The INITIAL pass counts a touch without taking it from the control; presses only, or a drag resets per move.
        Modifier.pointerInput(Unit) {
            awaitPointerEventScope {
                while (true) {
                    if (awaitPointerEvent(PointerEventPass.Initial).type == PointerEventType.Press) touches += 1
                }
            }
        },
    ) {
        content()
        if (black) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(Color.Black)
                    // Consumed, so the waking tap cannot also hit the board under it.
                    .pointerInput(Unit) { detectTapGestures { touches += 1 } }
                    .semantics { contentDescription = wake },
            )
        }
    }
}
