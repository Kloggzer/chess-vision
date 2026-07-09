package com.chesslab.tracker.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.chesslab.tracker.R
import com.chesslab.tracker.camera.Resolution
import com.chesslab.tracker.service.OverlayView
import com.chesslab.tracker.service.TrackerSettings

@Suppress("ktlint:standard:function-naming", "FunctionNaming", "LongMethod")
@Composable
fun SettingsScreen(
    settings: TrackerSettings,
    onUpdate: ((TrackerSettings) -> TrackerSettings) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(16.dp),
    ) {
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

        var advanced by remember { mutableStateOf(false) }
        SettingSwitch(stringResource(R.string.settings_detection_advanced), advanced) { advanced = it }
        if (advanced) {
            SettingSlider(stringResource(R.string.setting_motion_thr), settings.motionThr, 0f..2f, 0.25) { v ->
                onUpdate { it.copy(motionThr = v) }
            }
            SettingSlider(stringResource(R.string.setting_z_thr), settings.zThr, 0f..8f, 3.0) { v ->
                onUpdate { it.copy(zThr = v) }
            }
            SettingSlider(stringResource(R.string.setting_census_thr), settings.censusThr, 0f..400f, 160.0) { v ->
                onUpdate { it.copy(censusThr = v) }
            }
            SettingSlider(stringResource(R.string.setting_occlusion_thr), settings.occlusionColorThr, 0f..5f, 1.5) { v ->
                onUpdate { it.copy(occlusionColorThr = v) }
            }
            SettingSlider(stringResource(R.string.setting_motion_margin), settings.motionMargin, 0f..0.5f, 0.10) { v ->
                onUpdate { it.copy(motionMargin = v) }
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
        }

        SectionHeader(stringResource(R.string.settings_recording))
        SettingSwitch(stringResource(R.string.setting_auto_record), settings.autoRecord) { v ->
            onUpdate { it.copy(autoRecord = v) }
        }

        SectionHeader(stringResource(R.string.settings_experimental))
        SettingSwitch(stringResource(R.string.setting_experimental_detection), settings.experimentalDetection) { v ->
            onUpdate { it.copy(experimentalDetection = v) }
        }

        SectionHeader(stringResource(R.string.settings_debug))
        SettingSwitch(stringResource(R.string.setting_debug_card), settings.debugCard) { v ->
            onUpdate { it.copy(debugCard = v) }
        }
        OverlayRow(settings.overlayView) { o -> onUpdate { it.copy(overlayView = o) } }
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
            FilterChip(
                selected = r == selected,
                onClick = { onSelect(r) },
                label = { Text(label) },
                modifier = Modifier.semantics { contentDescription = label },
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
private fun OverlayRow(
    selected: OverlayView,
    onSelect: (OverlayView) -> Unit,
) {
    Text(stringResource(R.string.setting_overlay_view), style = MaterialTheme.typography.bodyLarge)
    Row(modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        for (o in OverlayView.entries) {
            val label = overlayLabel(o)
            FilterChip(
                selected = o == selected,
                onClick = { onSelect(o) },
                label = { Text(label) },
                modifier = Modifier.semantics { contentDescription = label },
            )
        }
    }
}

@Composable
private fun overlayLabel(o: OverlayView): String =
    when (o) {
        OverlayView.BOARD -> stringResource(R.string.overlay_board)
        OverlayView.DIFF -> stringResource(R.string.overlay_diff)
        OverlayView.SHADOW -> stringResource(R.string.overlay_shadow)
        OverlayView.OCCLUSION -> stringResource(R.string.overlay_occlusion)
        OverlayView.MOTION -> stringResource(R.string.overlay_motion)
    }
