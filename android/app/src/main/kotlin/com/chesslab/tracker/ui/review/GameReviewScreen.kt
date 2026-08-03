package com.chesslab.tracker.ui.review

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.analysis.GameGrade
import com.chesslab.tracker.analysis.MoveQuality
import com.chesslab.tracker.analysis.PlyGrade
import com.chesslab.tracker.analysis.ReviewStore
import com.chesslab.tracker.analysis.SideSummary
import com.chesslab.tracker.games.GameSessionState
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.analysis.EvalBarSlot
import com.chesslab.tracker.ui.analysis.stockfishEngineFactory
import com.chesslab.tracker.ui.games.GameSessionHost
import com.chesslab.tracker.ui.games.gamesDir
import com.chesslab.tracker.ui.settings.Card
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Busy
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.tracking.BoardCanvas
import kotlinx.coroutines.flow.MutableStateFlow
import kotlin.math.roundToInt

/** The screen renders before the service is bound; an unbound live game is simply an empty one. */
private val NO_LIVE_GAME = MutableStateFlow(GameSessionState())

/**
 * The LIVE source. The spectator view is this screen with the game still running — "die spectator
 * view kann basically dieselbe view sein wie die nach dem spiel nur halt live" (2026-08-02).
 *
 * The Wi-Fi share card lives here rather than on a screen of its own, because what it shares IS
 * this board and this move list.
 */
@Composable
fun LiveReviewRoute(onBack: () -> Unit) {
    val controller by GameSessionHost.controller.collectAsStateWithLifecycle()
    val live by (controller?.state ?: NO_LIVE_GAME).collectAsStateWithLifecycle()
    GameReviewScreen(title = "Live game", game = live.game, onBack = onBack) { SpectatorShareCard() }
}

/** A screen with no engine review has nothing to seek to and nothing to report a focus for. */
@Composable
private fun GameReviewScreen(
    title: String,
    game: GameView,
    onBack: () -> Unit,
    extra: @Composable () -> Unit,
) {
    GameReviewScreen(title, game, onBack, grade = null, onFocus = {}) { extra() }
}

/** The ARCHIVE source. Same screen, same board, same list — a stored game instead of a running one. */
@Composable
fun ArchiveReviewRoute(
    id: String,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val model =
        remember(context) {
            val dir = gamesDir(context)
            ReviewViewModel(GameStore(dir), ReviewStore(dir), stockfishEngineFactory(context.applicationContext), scope)
        }
    LaunchedEffect(id) { model.load(id) }
    val ui by model.ui.collectAsStateWithLifecycle()
    val game = ui.game
    if (game == null) {
        ChesslabScaffold(id, onBack) { bars -> Text("Game not found.", Modifier.padding(bars), color = OnSurfaceMuted) }
        return
    }
    GameReviewScreen(title = game.id, game = game, grade = ui.grade, onBack = onBack, onFocus = model::focus) { seek ->
        ReviewCard(ui, onReview = model::review, onDiscard = model::discard, onSeek = seek)
        PgnRow(ui.pgn, game.id)
    }
}

/**
 * ONE board, ONE move list, ONE evaluation. Live or archived is [GameView.live] and nothing else.
 *
 * [extra] is the only difference the two callers get: the Wi-Fi share card while the game runs, the
 * engine review and the PGN once it is over. It is handed the board's own seek so a tapped finding
 * moves THIS board — there is no second ply number anywhere.
 *
 * [onFocus] reports where the reader is, so the engine can grade outward from it.
 *
 * A `Column`, never `verticalScroll`: the move list below is a `LazyColumn`, and a lazy list inside
 * a scrolling parent throws at runtime (it happened, and it crashed the app).
 */
@Composable
private fun GameReviewScreen(
    title: String,
    game: GameView,
    onBack: () -> Unit,
    grade: GameGrade?,
    onFocus: (Int) -> Unit,
    extra: @Composable ((Int) -> Unit) -> Unit,
) {
    // The live board follows the game; the archived one follows the finger. Both are a PLY NUMBER,
    // so the two modes differ in where that number comes from and in nothing else.
    var seek by remember(game.id) { mutableIntStateOf(game.plies.size) }
    val selected = if (game.live) game.plies.size else seek
    LaunchedEffect(selected) { onFocus(selected) }
    val ply = grade?.of(selected)

    ChesslabScaffold(title, onBack) { bars ->
        Column(
            Modifier.fillMaxSize().padding(bars).padding(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                "${game.white} vs ${game.black} · ${game.result} · ${game.plies.size} plies",
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceMuted,
            )
            // `IntrinsicSize.Min` is load-bearing: the eval bar fills the row's height, so without
            // an intrinsic the row claims the whole column and the move list collapses to zero.
            Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                // The live board gets the running eval bar. An archived game's evaluation is the
                // verdict below, not a bar fed by the tracker's current position.
                if (game.live) EvalBarSlot()
                BoardCanvas(
                    fen = game.fenAt(selected),
                    modifier = Modifier.weight(1f),
                    lastMoveUci = game.plies.getOrNull(selected - 1)?.uci,
                    // Only where it is advice. On a move the player already found, an arrow over
                    // their own move says nothing and clutters the position they are reading.
                    suggestedUci = ply?.takeIf { it.quality != MoveQuality.BEST }?.bestUci,
                )
            }
            if (!game.live) {
                PlyVerdict(ply, game.plies.getOrNull(selected - 1)?.san, selected, grade)
                PlyNav(selected, game.plies.size) { seek = it }
            }
            Box(Modifier.fillMaxWidth().weight(1f)) {
                MoveList(
                    game = game,
                    modifier = Modifier.fillMaxSize(),
                    grade = grade,
                    selected = selected,
                    onSelect = if (game.live) null else ({ seek = it }),
                    follow = game.live,
                )
            }
            extra { seek = it }
        }
    }
}

/**
 * The one ply the user is looking at, in words rather than in units.
 *
 * This is the answer to "it requires too much knowledge": a win-expectancy pair is a sentence
 * anybody can read, and the engine's own move is the only "what would have been better" that costs
 * nothing — `multiPv` already computed it and specs/42 threw it away.
 */
@Composable
private fun PlyVerdict(
    ply: PlyGrade?,
    san: String?,
    selected: Int,
    grade: GameGrade?,
) {
    if (selected == 0 || san == null) {
        Text("Starting position.", style = MaterialTheme.typography.bodyMedium, color = OnSurfaceMuted)
        return
    }
    if (ply == null) {
        val waiting = if (grade == null) "Not reviewed yet." else "Working on this move…"
        Text("$san · $waiting", style = MaterialTheme.typography.bodyMedium, color = OnSurfaceMuted)
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Bottom) {
            Text(san, style = MaterialTheme.typography.titleMedium, color = OnSurface, fontWeight = FontWeight.Bold)
            Text(label(ply.quality), style = MaterialTheme.typography.titleMedium, color = badgeColor(ply.quality))
        }
        if (!ply.played) {
            // The rule this project cannot bend: the tracker's own mistakes are not the player's.
            Text(
                "The app lost the board here and rebuilt this move — it may not be what was played, " +
                    "so it is not counted against anyone.",
                style = MaterialTheme.typography.bodySmall,
                color = Danger,
            )
        }
        Text(
            "Winning chances ${percent(ply.winBefore)} → ${percent(ply.winAfter)} for the player who moved.",
            style = MaterialTheme.typography.bodyMedium,
            color = OnSurface,
        )
        ply.bestSan?.takeIf { ply.quality != MoveQuality.BEST }?.let {
            Text("The engine would have played $it (arrow).", style = MaterialTheme.typography.bodyMedium, color = Accent)
        }
        if (ply.quality == MoveQuality.BEST) {
            Text("This was the engine's own move.", style = MaterialTheme.typography.bodyMedium, color = Accent)
        }
        Text(
            "Searched to depth ${ply.depth}." +
                if (ply.decided) " The game was already decided here, so this move is not counted." else "",
            style = MaterialTheme.typography.labelSmall,
            color = OnSurfaceMuted,
        )
    }
}

@Composable
private fun PlyNav(
    selected: Int,
    plies: Int,
    onSeek: (Int) -> Unit,
) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        TextButton(onClick = { onSeek(0) }) { Text("|<", color = Accent) }
        TextButton(onClick = { onSeek((selected - 1).coerceAtLeast(0)) }) { Text("<", color = Accent) }
        Text(
            if (selected == 0) "start" else "ply $selected / $plies",
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceMuted,
        )
        TextButton(onClick = { onSeek((selected + 1).coerceAtMost(plies)) }) { Text(">", color = Accent) }
        TextButton(onClick = { onSeek(plies) }) { Text(">|", color = Accent) }
    }
}

@Composable
private fun PgnRow(
    pgn: String,
    id: String,
) {
    val context = LocalContext.current
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        TextButton(onClick = { share(context, pgn, id) }) { Text("Share PGN", color = Accent) }
        TextButton(onClick = { copy(context, pgn) }) { Text("Copy", color = Accent) }
    }
}

/**
 * `EXTRA_TEXT`, not a `FileProvider` URI: a provider needs a manifest entry, and a PGN is a few kB
 * of text.
 */
private fun share(
    context: Context,
    pgn: String,
    id: String,
) {
    val send =
        Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, "$id.pgn")
            putExtra(Intent.EXTRA_TEXT, pgn)
        }
    context.startActivity(Intent.createChooser(send, "Share PGN"))
}

private fun copy(
    context: Context,
    pgn: String,
) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText("PGN", pgn))
}

/** Kept out of [GameReviewScreen] so the screen reads as a layout rather than as a wall. */
@Composable
private fun ReviewCard(
    ui: ReviewUi,
    onReview: () -> Unit,
    onDiscard: () -> Unit,
    onSeek: (Int) -> Unit,
) {
    Card {
        val grade = ui.grade
        when {
            ui.engineMissing -> Text("No engine on this device.", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
            grade != null -> GradeSummary(grade, ui.running, onDiscard, onSeek)
            ui.running -> Text("Starting the engine…", style = MaterialTheme.typography.bodyMedium, color = OnSurface)
            else -> TextButton(onClick = onReview) { Text("Review with engine", color = Accent) }
        }
    }
}

/**
 * Accuracy first and everything else behind a tap.
 *
 * The card this replaced led with `84 cp average loss over 42 plies · best 26 good 2 inaccuracy 3
 * mistake 6 blunder 5`, which is a unit and a histogram. A percentage is the thing a weak player can
 * act on, and the bands are still one tap away for anyone who wants them.
 */
@Composable
private fun GradeSummary(
    grade: GameGrade,
    running: Boolean,
    onDiscard: () -> Unit,
    onSeek: (Int) -> Unit,
) {
    var open by remember { mutableStateOf(false) }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        AccuracyBlock("White", grade.white)
        AccuracyBlock("Black", grade.black)
    }
    if (running) {
        // Not a spinner over an empty screen: what is already graded stays readable underneath, and
        // this only says how much more is coming.
        LinearProgressIndicator({ grade.scored.toFloat() / grade.positions }, Modifier.fillMaxWidth(), color = Accent)
        Text(
            "Reading the game around the move you are on · ${grade.scored} / ${grade.positions} positions",
            style = MaterialTheme.typography.bodySmall,
            color = OnSurfaceMuted,
        )
    }
    val findings = grade.findings()
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        TextButton(onClick = { open = !open }) {
            Text(if (open) "Hide details" else "Key moments (${findings.size})", color = Accent)
        }
        if (grade.complete) TextButton(onClick = onDiscard) { Text("Re-analyse", color = OnSurfaceMuted) }
    }
    if (open) Details(grade, findings, onSeek)
}

@Composable
private fun AccuracyBlock(
    label: String,
    side: SideSummary,
) {
    Column {
        Text(label, style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
        Text(
            side.accuracy?.let { "${it.roundToInt()}%" } ?: "—",
            style = MaterialTheme.typography.headlineMedium,
            // Lichess' own accuracy bands, from `roundTraining.ts`: >=85 good, >=70 inaccuracy,
            // >=55 mistake, else blunder. A number nobody can place is a number nobody can use.
            color = side.accuracy?.let { accuracyColor(it) } ?: OnSurfaceMuted,
        )
        Text(
            // Never silently: the denominator is the honest half of this number.
            "over ${side.scored} of ${side.plies} moves",
            style = MaterialTheme.typography.labelSmall,
            color = OnSurfaceMuted,
        )
    }
}

@Composable
private fun Details(
    grade: GameGrade,
    findings: List<PlyGrade>,
    onSeek: (Int) -> Unit,
) {
    findings.forEach { FindingLine(it, onSeek) }
    if (findings.isEmpty()) {
        Text("Nothing worse than a good move so far.", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
    }
    val rebuilt = grade.rebuilt().size
    if (rebuilt > 0) {
        Text(
            "$rebuilt of the ${grade.byPly.size} graded moves were rebuilt by the app after it lost the board. " +
                "They are shown but never counted — a blunder there may be the tracker's, not a player's.",
            style = MaterialTheme.typography.bodySmall,
            color = Danger,
        )
    }
    Text(
        "Each move is scored by how much winning chance it gave away — lichess' formula, and their " +
            "bands for inaccuracy, mistake and blunder. Combining them into one number is ours: a harmonic " +
            "mean, so one bad move is not averaged away. Moves played after the game was already decided " +
            "score nothing and are left out. Up to ${grade.budget.movetimeMs} ms of engine per position, " +
            "stopping early at depth ${grade.budget.depth}.",
        style = MaterialTheme.typography.labelSmall,
        color = OnSurfaceMuted,
    )
}

/** Lichess' accuracy colour bands, from `ui/analyse/src/view/roundTraining.ts`. */
@Composable
private fun accuracyColor(accuracy: Double) =
    when {
        accuracy >= 85 -> Accent
        accuracy >= 70 -> OnSurface
        accuracy >= 55 -> Busy
        else -> Danger
    }

/** A tapped finding puts the board on that ply — this list is the reason the screen is open. */
@Composable
private fun FindingLine(
    finding: PlyGrade,
    onSeek: (Int) -> Unit,
) {
    Text(
        "ply ${finding.ply} · ${label(finding.quality)} · ${percent(finding.winBefore)} → ${percent(finding.winAfter)}" +
            (finding.bestSan?.let { " · better: $it" } ?: ""),
        style = MaterialTheme.typography.bodySmall,
        color = badgeColor(finding.quality),
        modifier = Modifier.fillMaxWidth().clickable { onSeek(finding.ply) }.padding(vertical = 2.dp),
    )
}

private fun percent(value: Double): String = "${value.roundToInt()}%"

internal fun label(quality: MoveQuality): String =
    when (quality) {
        MoveQuality.BEST -> "Best move"
        MoveQuality.GOOD -> "Good"
        MoveQuality.INACCURACY -> "Inaccuracy"
        MoveQuality.MISTAKE -> "Mistake"
        MoveQuality.BLUNDER -> "Blunder"
    }

@Composable
internal fun badgeColor(quality: MoveQuality) =
    when (quality) {
        MoveQuality.BLUNDER, MoveQuality.MISTAKE -> Danger
        MoveQuality.INACCURACY -> Busy
        MoveQuality.BEST -> Accent
        else -> OnSurfaceMuted
    }
