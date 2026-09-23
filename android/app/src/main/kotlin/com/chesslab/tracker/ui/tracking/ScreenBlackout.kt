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

/** How long the board waits for a touch before it goes black. One tap brings it back. */
private const val BLACKOUT_AFTER_MS = 60_000L

/**
 * Blacks the tracking screen out after a minute without a touch.
 *
 * Only the PICTURE goes: camera, engine, recorder and the spoken moves live in `TrackerService`,
 * which owns the camera on its own lifecycle and never sees this. The display measured 25-71 mA of
 * ~740 mA, so this is for not having a lit phone beside the board (`docs/android-performance.md`).
 */
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
        // The INITIAL pass: a touch is only counted here, never taken from the control under the
        // finger. Presses only — a drag would otherwise restart the timer on every move event.
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
                    // Consumed, so the tap that wakes the screen cannot also hit the board under it.
                    .pointerInput(Unit) { detectTapGestures { touches += 1 } }
                    .semantics { contentDescription = wake },
            )
        }
    }
}
