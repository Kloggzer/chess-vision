package com.chesslab.tracker.service

import android.os.SystemClock

/** Bewusst NICHT die Wanduhr: jede Frist ist ein Alter gegen `FrameInput.timestampMs`, und eine
 *  Zeitsynchronisierung verschiebt `System.currentTimeMillis` — dann springen sie alle mit. */
internal val phoneEngineClock: () -> Long = SystemClock::elapsedRealtime
