package com.chesslab.tracker.ui.tracking

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.hints.DEFAULT_HINT_QUOTA
import com.chesslab.tracker.hints.HintController
import com.chesslab.tracker.hints.HintOutcome
import com.chesslab.tracker.hints.HintPhrase
import com.chesslab.tracker.hints.HintPlan
import com.chesslab.tracker.hints.HintSide
import com.chesslab.tracker.ui.FilledAction
import com.chesslab.tracker.ui.OutlineAction
import com.chesslab.tracker.ui.TextAction
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.theme.Radius
import com.chesslab.tracker.ui.theme.Space
import com.chesslab.tracker.ui.theme.Stroke

/** Hoechstens so viele Hilfen sind einstellbar — darueber ist es kein Handicap mehr. */
private const val MAX_HINT_QUOTA = 9

private const val CARD_TINT = 0.12f

/** Was ein Nutzer, der den Knopf nicht sieht, ueber ihn sagen kann — `tap-description` findet ihn
 *  darueber, waehrend die Beschriftung mit dem Restkontingent staendig wechselt. */
const val HINT_BUTTON_DESCRIPTION = "Ask for help"

/** Die Startauswahl: EINE Seite darf Hilfe anfordern, und wie oft. Bewusst neutral von "Hilfe" und
 *  nicht von einem Kindermodus — das Feature gilt allen Spielern, die die Hilfe anhaben. */
@Composable
fun HintSetupDialog(
    onStart: (HintPlan) -> Unit,
    onDismiss: () -> Unit,
) {
    var side by remember { mutableStateOf<HintSide?>(null) }
    var quota by remember { mutableIntStateOf(DEFAULT_HINT_QUOTA) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Help in this game", style = MaterialTheme.typography.titleMedium, color = OnSurface) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(Space.sm)) {
                Text(
                    "One side may ask for a tip. The number of tips is the handicap — like giving " +
                        "a knight. The phone never offers one by itself.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = OnSurfaceMuted,
                )
                HintSideChoice(side) { side = it }
                if (side != null) HintQuotaStepper(quota) { quota = it }
            }
        },
        confirmButton = { FilledAction("Start", { onStart(HintPlan(side, quota)) }) },
        dismissButton = { TextAction("Cancel", onDismiss) },
    )
}

@Composable
private fun HintSideChoice(
    selected: HintSide?,
    onSelect: (HintSide?) -> Unit,
) {
    Column(Modifier.fillMaxWidth()) {
        HINT_SIDES.forEach { (value, label) ->
            Row(
                Modifier.fillMaxWidth().clickable { onSelect(value) }.padding(vertical = Space.xs),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                RadioButton(selected = value == selected, onClick = { onSelect(value) })
                Text(label, modifier = Modifier.padding(start = Space.xs), color = OnSurface)
            }
        }
    }
}

private val HINT_SIDES =
    listOf(
        null to "Nobody",
        HintSide.WHITE to "White",
        HintSide.BLACK to "Black",
    )

/** Das Kontingent gilt pro PARTIE, nicht pro Phase — deshalb steht hier eine Zahl und kein Takt. */
@Composable
private fun HintQuotaStepper(
    quota: Int,
    onChange: (Int) -> Unit,
) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(Space.sm),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        OutlineAction("−", { onChange((quota - 1).coerceAtLeast(1)) })
        Text("$quota tips this game", style = MaterialTheme.typography.bodyLarge, color = OnSurface)
        OutlineAction("+", { onChange((quota + 1).coerceAtMost(MAX_HINT_QUOTA)) })
    }
}

/** Der Knopf erscheint nur fuer die unterstuetzte Seite, an ihrem Zug und mit Kontingent — und
 *  nie unter stehendem Alarm, wo die Alarmkarte der Job des Schirms ist (Regel 3). */
@Composable
fun HintSlot(
    controller: HintController,
    fen: String,
    alarmed: Boolean,
    running: Boolean,
    onHint: () -> Unit,
) {
    val state by controller.state.collectAsStateWithLifecycle()
    if (!running || alarmed || !controller.offered(fen)) return
    HintButton(state.remaining, onHint)
}

/** Der einzige Ausloeser: von sich aus bietet das Telefon nie einen Tipp an. */
@Composable
fun HintButton(
    remaining: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    FilledAction(
        "Help ($remaining)",
        onClick,
        modifier.fillMaxWidth().semantics { contentDescription = HINT_BUTTON_DESCRIPTION },
    )
}

/** Tipp UND Absage stehen hier, weil `AndroidSilence.silenced()` die Stimme bei Klingelton-aus
 *  abschaltet — ein nur gesprochener Tipp verschwaende das Kontingent wortlos. */
@Composable
fun HintCard(
    outcome: HintOutcome,
    language: String,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val refused = outcome is HintOutcome.Refused
    val tone = if (refused) OnSurfaceMuted else Accent
    Column(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Radius.md))
            .background(tone.copy(alpha = CARD_TINT))
            .border(Stroke.hairline, tone, RoundedCornerShape(Radius.md))
            .padding(Space.md),
        verticalArrangement = Arrangement.spacedBy(Space.sm),
    ) {
        Text(
            HintPhrase.of(outcome, language),
            style = if (refused) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.titleMedium,
            color = if (refused) OnSurfaceMuted else OnSurface,
            maxLines = HINT_CARD_LINES,
            overflow = TextOverflow.Ellipsis,
        )
        TextAction("Got it", onDismiss)
    }
}

/** Genug fuer "Du hast Matt in 3" und den Weg dorthin, ohne dem Brett die Hoehe zu nehmen. */
private const val HINT_CARD_LINES = 4
