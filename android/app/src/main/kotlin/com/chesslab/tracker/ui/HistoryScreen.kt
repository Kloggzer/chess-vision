package com.chesslab.tracker.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
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

@OptIn(ExperimentalMaterial3Api::class)
@Suppress("ktlint:standard:function-naming", "FunctionNaming")
@Composable
fun HistoryScreen(
    moves: List<MoveEntry>,
    onExport: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var selected by remember { mutableStateOf<MoveEntry?>(null) }

    Column(modifier = modifier.fillMaxWidth().padding(16.dp)) {
        OutlinedButton(
            onClick = onExport,
            modifier = Modifier.heightIn(min = 48.dp),
        ) { Text(stringResource(R.string.history_export)) }

        if (moves.isEmpty()) {
            Text(stringResource(R.string.moves_empty), style = MaterialTheme.typography.bodyLarge)
        }

        LazyColumn(modifier = Modifier.fillMaxWidth()) {
            itemsIndexed(moves) { index, entry ->
                val label = "${index + 1}. ${entry.san}"
                Row(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .heightIn(min = 48.dp)
                            .clickable { selected = entry }
                            .padding(vertical = 8.dp)
                            .semantics { contentDescription = label },
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(label, style = MaterialTheme.typography.bodyLarge)
                    entry.decision?.let { Text(it.decider, style = MaterialTheme.typography.bodySmall) }
                }
                Divider()
            }
        }
    }

    val entry = selected
    if (entry != null) {
        ModalBottomSheet(onDismissRequest = { selected = null }) {
            Column(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(entry.san, style = MaterialTheme.typography.titleLarge)
                val d = entry.decision
                if (d == null) {
                    Text(stringResource(R.string.history_no_provenance))
                } else {
                    Text(stringResource(R.string.history_decider, d.decider))
                    Text(stringResource(R.string.history_reason, d.reason))
                    Text(stringResource(R.string.history_margin, d.margin, d.best, d.second))
                    Text(stringResource(R.string.history_changed, d.changed.joinToString(" ").ifEmpty { "-" }))
                    Text(stringResource(R.string.history_vetoed, d.shadowVeto.joinToString(" ").ifEmpty { "-" }))
                    Text(stringResource(R.string.history_prior, d.priorUsed.toString()))
                }
            }
        }
    }
}
