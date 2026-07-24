package com.chesslab.tracker.geometry

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File

/**
 * Persists one [CalibrationProfile] per camera id as kotlinx-serialization JSON
 * in the given directory (the app files dir in production, a temp dir in tests).
 *
 * Consumed by phase 04 (calibration UI) and phase 03 (camera setup).
 */
class CalibrationStore(
    private val dir: File,
) {
    private val json = Json { prettyPrint = true }

    /** Write (or overwrite) the profile for [cameraId]. */
    fun save(
        cameraId: String,
        profile: CalibrationProfile,
    ) {
        dir.mkdirs()
        fileFor(cameraId).writeText(json.encodeToString(profile))
    }

    /** Load the profile for [cameraId], or null if none is stored. */
    fun load(cameraId: String): CalibrationProfile? {
        val file = fileFor(cameraId)
        if (!file.exists()) return null
        return json.decodeFromString<CalibrationProfile>(file.readText())
    }

    /** Remove the stored profile for [cameraId]; returns true if a file was deleted. */
    fun delete(cameraId: String): Boolean = fileFor(cameraId).delete()

    private fun fileFor(cameraId: String): File = File(dir, "$cameraId.json")
}
