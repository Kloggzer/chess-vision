package com.chesslab.tracker.ui.review

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chesslab.tracker.analysis.GameGrade
import com.chesslab.tracker.analysis.MoveQuality
import com.chesslab.tracker.analysis.PlyGrade
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.GameView
import com.chesslab.tracker.ui.ChesslabScaffold
import com.chesslab.tracker.ui.analysis.EvalBarSlot
import com.chesslab.tracker.ui.analysis.stockfishEngineFactory
import com.chesslab.tracker.ui.games.GameSessionHost
import com.chesslab.tracker.ui.games.gamesDir
import com.chesslab.tracker.ui.settings.Card
import com.chesslab.tracker.ui.theme.Accent
import com.chesslab.tracker.ui.theme.Danger
import com.chesslab.tracker.ui.theme.OnSurface
import com.chesslab.tracker.ui.theme.OnSurfaceMuted
import com.chesslab.tracker.ui.tracking.BoardCanvas

/**
 * The LIVE source. The spectator view is this screen with the game still running — "die spectator
 * view kann basically dieselbe view sein wie die nach dem spiel nur halt live" (2026-08-02).
 *
 * The Wi-Fi share card lives here rather than on a screen of its own, because what it shares IS
 * this board and this move list.
 *
 * With no tracker there is no live game, and this says so. It used to fall back to an empty
 * `GameView` — a start position rendered as if it were the state of a board somebody was playing on.
 */
@Composable
fun LiveReviewRoute(onBack: () -> Unit) {
    val controller by GameSessionHost.controller.collectAsStateWithLifecycle()
    val session = controller
    if (session == null) {
        ChesslabScaffold("Live game", onBack) { bars ->
            Text(
                "No game running. Start tracking on the Board tab to play one.",
                Modifier.padding(bars).padding(12.dp),
                color = OnSurfaceMuted,
            )
        }
        return
    }
    val live by session.state.collectAsStateWithLifecycle()
    GameReviewScreen(title = "Live game", game = live.game, onBack = onBack) { SpectatorShareCard() }
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
            ReviewViewModel(GameStore(gamesDir(context)), stockfishEngineFactory(context.applicationContext), scope)
        }
    LaunchedEffect(id) { model.load(id) }
    val ui by model.ui.collectAsStateWithLifecycle()
    val game = ui.game
    if (game == null) {
        ChesslabScaffold(id, onBack) { bars -> Text("Game not found.", Modifier.padding(bars), color = OnSurfaceMuted) }
        return
    }
    GameReviewScreen(title = game.id, game = game, grade = ui.grade, onBack = onBack) {
        ReviewCard(ui, seams = game.segments.count { it.enteredBy != null }, onReview = model::review)
        PgnRow(ui.pgn, game.id)
    }
}

/**
 * ONE board, ONE move list, ONE evaluation. Live or archived is [GameView.live] and nothing else —
 * a reader can see that from this signature, which is the point of the merge.
 *
 * [extra] is the only difference the two callers get: the Wi-Fi share card while the game runs, the
 * engine review and the PGN once it is over.
 *
 * A `Column`, never `verticalScroll`: the move list below is a `LazyColumn`, and a lazy list inside
 * a scrolling parent throws at runtime (it happened, and it crashed the app).
 */
@Composable
private fun GameReviewScreen(
    title: String,
    game: GameView,
    onBack: () -> Unit,
    grade: GameGrade? = null,
    extra: @Composable () -> Unit,
) {
    // The live board follows the game; the archived one follows the finger. Both are a PLY NUMBER,
    // so the two modes differ in where that number comes from and in nothing else.
    var seek by remember(game.id) { mutableIntStateOf(game.plies.size) }
    val selected = if (game.live) game.plies.size else seek
    val fen = game.fenAt(selected)

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
                // grade below, not a bar fed by the tracker's current position.
                if (game.live) EvalBarSlot()
                BoardCanvas(
                    fen = fen,
                    modifier = Modifier.weight(1f),
                    lastMoveUci = game.plies.getOrNull(selected - 1)?.uci,
                )
            }
            if (!game.live) PlyNav(selected, game.plies.size) { seek = it }
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
            extra()
        }
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
    seams: Int,
    onReview: () -> Unit,
) {
    var open by remember { mutableStateOf(false) }
    Card {
        val progress = ui.progress
        val grade = ui.grade
        when {
            ui.engineMissing -> Text("No engine on this device.", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMuted)
            progress != null -> ReviewProgressLine(progress.done, progress.total)
            grade != null -> GradeSummary(grade, seams, open) { open = !open }
            else -> TextButton(onClick = onReview) { Text("Review with engine", color = Accent) }
        }
    }
}

@Composable
private fun ReviewProgressLine(
    done: Int,
    total: Int,
) {
    Text("Reviewing… $done / $total positions", style = MaterialTheme.typography.bodyMedium, color = OnSurface)
    Text(
        // Up to 3 s a position, so a long game is minutes. Measured on the device: 84 positions in
        // 28 s at the old depth-16 budget, and this one is allowed considerably more per position.
        "Up to a few seconds per position. The engine runs at lowest priority; tracking still has the camera.",
        style = MaterialTheme.typography.bodySmall,
        color = OnSurfaceMuted,
    )
}

/**
 * The summary states its own BUDGET, and that is not decoration.
 *
 * A grade is a claim about a move only as far as the search behind it went. Naming the depth is what
 * stops "blunder" from reading as a verdict when it is a depth-9 opinion.
 */
@Composable
private fun GradeSummary(
    grade: GameGrade,
    seams: Int,
    open: Boolean,
    onToggle: () -> Unit,
) {
    Text("Accuracy", style = MaterialTheme.typography.titleMedium, color = OnSurface)
    SideLine("White", grade, white = true)
    SideLine("Black", grade, white = false)
    Text(
        "Up to ${grade.budget.movetimeMs} ms per position, stopping early at depth ${grade.budget.depth}. " +
            "The live evaluation gets 400 ms, and one ply in six is graded differently at that budget — " +
            "each finding below names the depth it was actually read at.",
        style = MaterialTheme.typography.bodySmall,
        color = OnSurfaceMuted,
    )
    // A tracked game is not a score sheet somebody wrote down: where the app lost the board it
    // invented the moves that got it back, and those plies are graded here exactly like played ones.
    // The move list shows each seam in place; this says how many, beside the numbers they distort.
    if (seams > 0) {
        Text(
            "The app rebuilt the board $seams× in this game. The plies it committed to recover are " +
                "graded here like any other — a blunder around a rebuild may be the tracker's, not a player's.",
            style = MaterialTheme.typography.bodySmall,
            color = Danger,
        )
    }
    val findings = grade.findings()
    TextButton(onClick = onToggle) {
        Text(if (open) "Hide findings" else "Findings (${findings.size})", color = Accent)
    }
    if (open) findings.forEach { FindingLine(it) }
}

@Composable
private fun FindingLine(finding: PlyGrade) {
    Text(
        // A mate-scored ply never shows its centipawns: 10 000 is a flag meaning "forced mate",
        // and printing it as a pawn count is the same confusion the average used to have.
        "ply ${finding.ply} · ${finding.quality.name.lowercase()} · " +
            (if (finding.mateScored) "forced mate" else "${finding.cpLoss} cp") +
            " at depth ${finding.depth}",
        style = MaterialTheme.typography.bodySmall,
        color = OnSurfaceMuted,
    )
}

@Composable
private fun SideLine(
    label: String,
    grade: GameGrade,
    white: Boolean,
) {
    val side = if (white) grade.white else grade.black
    val bands =
        MoveQuality.entries
            .filter { side.count(it) > 0 }
            .joinToString(" ") { "${it.name.lowercase()} ${side.count(it)}" }
    Text(
        "$label · ${side.averageCpLoss} cp average loss over ${side.plies} plies · $bands",
        style = MaterialTheme.typography.bodySmall,
        color = OnSurfaceMuted,
    )
    // Where the average means least, and on a won endgame that is most of it.
    if (side.mateScoredPlies > 0) {
        Text(
            "  ${side.mateScoredPlies} of those were scored against a forced mate, where a centipawn " +
                "average stops measuring anything.",
            style = MaterialTheme.typography.labelSmall,
            color = OnSurfaceMuted,
        )
    }
}
