package com.chesslab.tracker.service

import android.os.SystemClock

/**
 * Die Uhr der Engine auf dem Handy — bewusst NICHT die Wanduhr. Jede Frist ist ein Alter gegen
 * `FrameInput.timestampMs` (Bewegung, Taint-Halt, Verify-Timeout, CNN-Cooldowns, `alarmMinS`), und
 * eine Zeitsynchronisierung verschiebt `System.currentTimeMillis` — dann springen sie alle mit.
 */
internal val phoneEngineClock: () -> Long = SystemClock::elapsedRealtime
