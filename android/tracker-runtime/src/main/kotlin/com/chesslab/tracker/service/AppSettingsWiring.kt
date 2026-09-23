package com.chesslab.tracker.service

import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.cnn.Attached
import com.chesslab.tracker.cnn.CnnModelAssets
import com.chesslab.tracker.cnn.OnnxSquareClassifier
import com.chesslab.tracker.cnn.SessionTuning
import com.chesslab.tracker.cnn.requestedBackend
import com.chesslab.tracker.geometry.CalibrationStore
import com.chesslab.tracker.log.NoopTrackerLog
import com.chesslab.tracker.log.TrackerLog
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.BoardOrientation
import com.chesslab.tracker.settings.SettingsRepository

// Each is consumed at tracker CONSTRUCTION, which is why all four settings are restart-required.

/** [Attached] carries the MEASURED backend, never the request: an NPU-to-CPU fall-through is same fps, ten times
 *  the latency. `staged.dir.name` names the model really staged — an A/B is worthless if the panel echoes. */
fun openClassifier(
    assets: CnnModelAssets,
    app: AppSettings,
    probe: CnnRuntimeProbe,
    log: TrackerLog = NoopTrackerLog,
    /** A replay passes 1 for bit-exact runs. */
    intraOpThreads: Int = SessionTuning.THREADS,
): Attached {
    val staged = assets.stage()
    val classifier = OnnxSquareClassifier.open(staged, log, app.epRequest, intraOpThreads)
    probe.requestedEp = requestedBackend(staged, app.epRequest)
    probe.actualEp = classifier.backend
    probe.modelDir = staged.dir.name
    probe.model = classifier.model
    probe.inputShape = classifier.inputShape
    probe.lastRunMs = classifier::lastRunMs
    return Attached(classifier, classifier.backend, classifier.model, classifier.spec)
}

/** At startup the stored profile wins: a stale setting must not transpose the board behind the user's back. */
suspend fun adoptStoredOrientation(
    calibration: CalibrationStore,
    settings: SettingsRepository,
): BoardGeometry {
    calibration.load()
    val stored = calibration.geometry
    val app = settings.appSettings.value
    val fromProfile = BoardOrientation.entries.first { it.whitePov == stored.whitePov }
    if (fromProfile != app.orientation) settings.updateApp(app.copy(orientation = fromProfile))
    return stored
}
