package com.chesslab.tracker.ui

import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.R
import com.chesslab.tracker.camera.Resolution
import com.chesslab.tracker.cnn.CnnModelStore
import com.chesslab.tracker.cnn.OnnxClassifier
import com.chesslab.tracker.service.TrackerSettings
import kotlin.math.roundToInt

@Suppress("ktlint:standard:function-naming", "FunctionNaming", "LongMethod")
@Composable
fun SettingsScreen(
    settings: TrackerSettings,
    onUpdate: ((TrackerSettings) -> TrackerSettings) -> Unit,
    modifier: Modifier = Modifier,
    modelStore: CnnModelStore? = null,
    spectatorUrl: String? = null,
) {
    Column(
        modifier = modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(16.dp),
    ) {
        Text(stringResource(R.string.settings_title), style = MaterialTheme.typography.headlineSmall)
        Text(
            stringResource(R.string.settings_subtitle),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 4.dp, bottom = 8.dp),
        )
        SectionHeader(stringResource(R.string.settings_game))
        SettingSwitch(stringResource(R.string.setting_look_forward), settings.pairLookAhead) { v ->
            onUpdate { it.copy(pairLookAhead = v) }
        }
        SettingSlider(
            label = stringResource(R.string.setting_ambiguity_margin),
            value = settings.ambiguityMargin,
            range = 0.5f..5.0f,
            default = 2.0,
            onChange = { v -> onUpdate { it.copy(ambiguityMargin = v) } },
        )
        SettingSwitch(stringResource(R.string.setting_move_prior), settings.usePrior) { v ->
            onUpdate { it.copy(usePrior = v) }
        }

        SectionHeader(stringResource(R.string.settings_camera))
        ResolutionRow(settings.resolution) { r -> onUpdate { it.copy(resolution = r) } }
        SettingSwitch(stringResource(R.string.setting_dynamic_resolution), settings.dynamicResolution) { v ->
            onUpdate { it.copy(dynamicResolution = v) }
        }
        // Warp: how far the ArUco markers sit outside the playing field. Adjust until the
        // debug grid overlay lines up with the physical squares (0 = markers at field corners).
        SettingSlider(stringResource(R.string.setting_aruco_margin), settings.arucoMargin, 0f..0.15f, 0.06) { v ->
            onUpdate { it.copy(arucoMargin = v) }
        }

        var advanced by remember { mutableStateOf(false) }
        SectionHeader(stringResource(R.string.settings_detection))
        Text(
            stringResource(R.string.settings_detection_description),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 4.dp),
        )
        SettingSwitch(stringResource(R.string.settings_detection_advanced), advanced) { advanced = it }
        if (advanced) {
            SettingSlider(stringResource(R.string.setting_motion_thr), settings.motionThr, 0f..2f, 0.25) { v ->
                onUpdate { it.copy(motionThr = v) }
            }
            SettingSlider(stringResource(R.string.setting_z_thr), settings.zThr, 0f..8f, 3.0) { v ->
                onUpdate { it.copy(zThr = v) }
            }
            SettingSlider(
                stringResource(R.string.setting_census_thr),
                settings.censusThr,
                0f..400f,
                TrackerConfig.DEFAULT_CENSUS_THR,
            ) { v ->
                onUpdate { it.copy(censusThr = v) }
            }
            SettingSlider(stringResource(R.string.setting_census_z_weight), settings.censusZWeight, 0f..2f, 1.0) { v ->
                onUpdate { it.copy(censusZWeight = v) }
            }
            SettingSlider(
                label = stringResource(R.string.setting_max_changed),
                value = settings.maxChanged.toDouble(),
                range = 2f..12f,
                default = 6.0,
                steps = 9,
                onChange = { v -> onUpdate { it.copy(maxChanged = v.roundToInt()) } },
            )
            SettingSlider(
                stringResource(R.string.setting_occlusion_thr),
                settings.occlusionColorThr,
                0f..5f,
                TrackerConfig.DEFAULT_OCCLUSION_COLOR_THR,
            ) { v ->
                onUpdate { it.copy(occlusionColorThr = v) }
            }
            SettingSlider(stringResource(R.string.setting_overhang), settings.overhang, 0f..1f, 0.25) { v ->
                onUpdate { it.copy(overhang = v) }
            }
            SettingSlider(stringResource(R.string.setting_motion_hold), settings.motionHoldS, 0f..2f, 0.4) { v ->
                onUpdate { it.copy(motionHoldS = v) }
            }
            SettingSlider(stringResource(R.string.setting_clahe_clip), settings.claheClip, 0f..8f, 2.0) { v ->
                onUpdate { it.copy(claheClip = v) }
            }
            SettingSlider(
                stringResource(R.string.setting_dark_luma_thr),
                settings.darkLumaThr,
                0f..60f,
                TrackerSettings.DEFAULT_DARK_LUMA_THR,
            ) { v ->
                onUpdate { it.copy(darkLumaThr = v) }
            }
            SettingSlider(
                label = stringResource(R.string.setting_diff_jitter),
                value = settings.diffJitterPx.toDouble(),
                range = 0f..3f,
                default = TrackerSettings.DEFAULT_DIFF_JITTER_PX.toDouble(),
                steps = 2,
                onChange = { v -> onUpdate { it.copy(diffJitterPx = v.roundToInt()) } },
            )
            SettingSwitch(stringResource(R.string.setting_lighting_robust), settings.lightingRobust) { v ->
                onUpdate { it.copy(lightingRobust = v) }
            }
            SettingSlider(
                stringResource(R.string.setting_commit_floor),
                settings.commitFloor,
                0f..10f,
                TrackerSettings.DEFAULT_COMMIT_FLOOR,
            ) { v ->
                onUpdate { it.copy(commitFloor = v) }
            }
        }
        // Reset game + detection tunables to the code defaults. Deliberately preserves
        // camera/warp (resolution, arucoMargin), recording, CNN, analysis and debug prefs —
        // persisted old values otherwise shadow improved defaults forever (censusThr 160 lesson).
        GhostButton(onClick = {
            onUpdate { current ->
                val d = TrackerSettings()
                current.copy(
                    pairLookAhead = d.pairLookAhead,
                    ambiguityMargin = d.ambiguityMargin,
                    usePrior = d.usePrior,
                    motionThr = d.motionThr,
                    zThr = d.zThr,
                    censusThr = d.censusThr,
                    censusZWeight = d.censusZWeight,
                    maxChanged = d.maxChanged,
                    occlusionColorThr = d.occlusionColorThr,
                    motionMargin = d.motionMargin,
                    overhang = d.overhang,
                    motionHoldS = d.motionHoldS,
                    claheClip = d.claheClip,
                    darkLumaThr = d.darkLumaThr,
                    diffJitterPx = d.diffJitterPx,
                    lightingRobust = d.lightingRobust,
                    commitFloor = d.commitFloor,
                )
            }
        }) { Text(stringResource(R.string.setting_reset_detection)) }

        SectionHeader(stringResource(R.string.settings_recording))
        SettingSwitch(stringResource(R.string.setting_auto_record), settings.autoRecord) { v ->
            onUpdate { it.copy(autoRecord = v) }
        }
        SettingSwitch(stringResource(R.string.setting_spectator_enabled), settings.spectatorEnabled) { v ->
            onUpdate { it.copy(spectatorEnabled = v) }
        }
        if (settings.spectatorEnabled) {
            Text(
                spectatorUrl ?: stringResource(R.string.setting_spectator_starting),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        SectionHeader(stringResource(R.string.settings_experimental))
        SettingSwitch(stringResource(R.string.setting_experimental_detection), settings.experimentalDetection) { v ->
            onUpdate { it.copy(experimentalDetection = v) }
        }
        // AE/AWB lock + manual focus moved to the CALIBRATION screen (live preview there).
        SettingSwitch(stringResource(R.string.setting_grad_dir_veto), settings.gradDirVeto) { v ->
            onUpdate { it.copy(gradDirVeto = v) }
        }
        // specs/14: intrinsic shadow-free channel. Toggle only — theta/lo/hi are the
        // service-owned calibration cache, never user-tunable.
        SettingSwitch(stringResource(R.string.setting_intrinsic_gray), settings.intrinsicGray) { v ->
            onUpdate { it.copy(intrinsicGray = v) }
        }

        SectionHeader(stringResource(R.string.settings_cnn_safeguard))
        SettingSwitch(stringResource(R.string.setting_cnn_enabled), settings.cnnEnabled) { v ->
            onUpdate { it.copy(cnnEnabled = v) }
        }
        SettingSlider(
            label = stringResource(R.string.setting_cnn_conf_thr),
            value = settings.cnnConfThr,
            range = 0.0f..1.0f,
            default = TrackerSettings.DEFAULT_CNN_CONF_THR,
            steps = 19,
            onChange = { v -> onUpdate { it.copy(cnnConfThr = v) } },
        )
        CnnModelSection(modelStore = modelStore)

        SectionHeader(stringResource(R.string.settings_analysis))
        SettingSlider(
            label = stringResource(R.string.setting_analysis_depth),
            value = settings.analysisDepth.toDouble(),
            range = 4f..20f,
            default = TrackerSettings.DEFAULT_ANALYSIS_DEPTH.toDouble(),
            steps = 15,
            onChange = { v -> onUpdate { it.copy(analysisDepth = v.roundToInt()) } },
        )

        SectionHeader(stringResource(R.string.settings_debug))
        Text(
            stringResource(R.string.settings_debug_board_views_caption),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 4.dp),
        )
        SettingSwitch(stringResource(R.string.setting_debug_card), settings.debugCard) { v ->
            onUpdate { it.copy(debugCard = v) }
        }
    }
}

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun ResolutionRow(
    selected: Resolution,
    onSelect: (Resolution) -> Unit,
) {
    Row(modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        for (r in Resolution.entries) {
            val label = resolutionLabel(r)
            val chipSelected = r == selected
            FilterChip(
                selected = chipSelected,
                onClick = { onSelect(r) },
                label = { Text(label) },
                shape = MaterialTheme.shapes.small,
                colors =
                    FilterChipDefaults.filterChipColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                        labelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                        selectedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                        selectedLabelColor = MaterialTheme.colorScheme.primary,
                    ),
                border =
                    FilterChipDefaults.filterChipBorder(
                        enabled = true,
                        selected = chipSelected,
                        borderColor = MaterialTheme.colorScheme.outline,
                        selectedBorderColor = MaterialTheme.colorScheme.primary,
                    ),
                modifier = Modifier.heightIn(min = 48.dp).semantics { contentDescription = label },
            )
        }
    }
}

@Composable
private fun resolutionLabel(r: Resolution): String =
    when (r) {
        Resolution.R720P -> stringResource(R.string.res_720p)
        Resolution.R1080P -> stringResource(R.string.res_1080p)
        Resolution.R4K -> stringResource(R.string.res_4k)
    }

@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
private fun CnnModelSection(modelStore: CnnModelStore?) {
    val context = LocalContext.current
    var importVersion by remember { mutableIntStateOf(0) }
    val modelInstalled = remember(modelStore, importVersion) { modelStore?.isInstalled() ?: false }

    Column(
        modifier =
            Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp)
                .clip(MaterialTheme.shapes.medium)
                .background(MaterialTheme.colorScheme.surface)
                .border(1.dp, MaterialTheme.colorScheme.outline, MaterialTheme.shapes.medium)
                .padding(horizontal = 14.dp, vertical = 10.dp),
    ) {
        Text(
            text =
                if (modelInstalled) {
                    stringResource(R.string.setting_cnn_model_installed)
                } else {
                    stringResource(R.string.setting_cnn_model_not_installed)
                },
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(bottom = 8.dp),
        )

        val importLauncher =
            rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
                if (uri == null || modelStore == null) return@rememberLauncherForActivityResult
                val targetName = resolveModelTargetName(context, uri)
                if (targetName != null) {
                    modelStore.install(context.contentResolver, uri, targetName)
                    importVersion++
                }
            }

        val importLabel = stringResource(R.string.setting_import_model)
        GhostButton(
            onClick = { importLauncher.launch(arrayOf("application/octet-stream", "*/*")) },
            modifier = Modifier.semantics { contentDescription = importLabel },
        ) {
            Text(importLabel)
        }
    }
}

private fun resolveModelTargetName(
    context: android.content.Context,
    uri: Uri,
): String? {
    val displayName =
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (idx >= 0) cursor.getString(idx) else null
            } else {
                null
            }
        }
    val name = displayName ?: uri.lastPathSegment ?: return null
    return when {
        // Quantized NPU model — check first (".qnn.onnx" also ends with ".onnx").
        name.endsWith(".qnn.onnx") -> OnnxClassifier.MODEL_QNN_FILE
        name.endsWith(".onnx") -> OnnxClassifier.MODEL_FILE
        name.endsWith(".json") -> OnnxClassifier.CONFIG_FILE
        else -> null
    }
}
