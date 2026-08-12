package com.chesslab.tracker.ui.camera

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlin.math.abs
import kotlin.math.roundToInt

private val TICK_PITCH = 10.dp
private val RULER_HEIGHT = 78.dp

/**
 * A controlled horizontal wheel picker for focus. It follows the interaction model of a wheel
 * picker (scrolling marks through a fixed centre) but retains camera-specific 0.1-percent steps
 * and reports each selected step while the list is moving.
 */
@Composable
fun FocusRuler(
    caption: String,
    reading: String,
    value: Float,
    range: ClosedFloatingPointRange<Float>,
    step: Float,
    onValue: (Float) -> Unit,
) {
    val itemCount = ((range.endInclusive - range.start) / step).roundToInt() + 1
    val selected = ((value - range.start) / step).roundToInt().coerceIn(0, itemCount - 1)
    val latestOnValue by rememberUpdatedState(onValue)
    val listState = rememberLazyListState(initialFirstVisibleItemIndex = selected)

    // A focus setting can also change through Auto/Manual or saved-state restore. Re-centre only
    // while idle, so an immediate camera update never fights the user's drag.
    LaunchedEffect(selected, listState.isScrollInProgress) {
        if (!listState.isScrollInProgress) listState.scrollToItem(selected)
    }
    LaunchedEffect(listState, itemCount) {
        snapshotFlow {
            val info = listState.layoutInfo
            val centre = (info.viewportStartOffset + info.viewportEndOffset) / 2
            info.visibleItemsInfo.minByOrNull { abs((it.offset + it.size / 2) - centre) }?.index
        }.distinctUntilChanged().collect { index ->
            index ?: return@collect
            latestOnValue(snapDialValue(range.start + index * step, range, step))
        }
    }

    DialReading(caption, reading)
    BoxWithConstraints(Modifier.fillMaxWidth()) {
        val sidePadding = ((maxWidth - TICK_PITCH) / 2).coerceAtLeast(0.dp)
        LazyRow(
            modifier = Modifier.fillMaxWidth().height(RULER_HEIGHT),
            state = listState,
            contentPadding = PaddingValues(horizontal = sidePadding),
            flingBehavior = rememberSnapFlingBehavior(lazyListState = listState),
        ) {
            items(itemCount, key = { it }) { index ->
                FocusTick(
                    index = index,
                    selected = index == selected,
                    edgeDistance = minOf(index, itemCount - 1 - index),
                )
            }
        }
    }
}

@Composable
private fun FocusTick(
    index: Int,
    selected: Boolean,
    edgeDistance: Int,
) {
    val major = index % 10 == 0
    val medium = index % 5 == 0
    val height =
        when {
            selected -> 56.dp
            major -> 42.dp
            medium -> 30.dp
            else -> 20.dp
        }
    val alpha = if (edgeDistance < 4) 0.35f + edgeDistance * 0.16f else 1f
    Canvas(Modifier.width(TICK_PITCH).height(RULER_HEIGHT).alpha(alpha)) {
        val x = size.width / 2f
        val lineHeight = height.toPx()
        drawLine(
            color = if (selected) Chrome.accent else Chrome.onSurface,
            start = Offset(x, 0f),
            end = Offset(x, lineHeight),
            strokeWidth = if (selected || major) 2f else 1f,
        )
    }
}
