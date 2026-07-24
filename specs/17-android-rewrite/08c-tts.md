# Phase 08c — spoken move announcement (TextToSpeech)

> Module `:app`, package `com.chesslab.tracker.speech`. No Python counterpart.
> Runs in parallel with 08a and 08b — file ownership is strictly disjoint.
> You MAY read `android-legacy/**` for **Android API usage only**:
> `service/MoveSpeech.kt` (SAN → phrase: castling, check/checkmate suffixes, promotion,
> piece names, side from ply parity) is a decent *string* reference and its phrasing rules
> may be reused. You MUST NOT copy its architecture — it was an accessibility LiveRegion
> string helper with no engine, no queue, no lifecycle, and no interaction with the alarm.

## Files you own

| File | Contains |
|---|---|
| `android/app/src/main/kotlin/com/chesslab/tracker/speech/MovePhrase.kt` | SAN → spoken text, per verbosity |
| `.../speech/SpeechEngine.kt` | `TextToSpeech` lifecycle, queueing, silence policy |
| `.../speech/MoveAnnouncer.kt` | subscribes to tracker events, decides what gets spoken |
| `.../speech/ui/SpeechSettingsScreen.kt` | on/off, language, verbosity, test button |
| `.../service/TrackerService.kt` | **one** registration line for `MoveAnnouncer` |
| `android/app/src/test/kotlin/com/chesslab/tracker/speech/*Test.kt` | tests |

You own **nothing else**. `games/**`, `record/**`, `ui/Nav.kt`,
`ui/settings/SettingsScreen.kt`, `AndroidManifest.xml` belong to 08a; `spectate/**` and
`android/app/build.gradle.kts` to 08b. You need no new dependency (`TextToSpeech` is
platform) — if you think you do, **STOP** and record a blocker.

08a routes to your screen by the exact name
`com.chesslab.tracker.speech.ui.SpeechSettingsScreen`. Keep that fully-qualified name.

You own `service/TrackerService.kt` this phase, but the edit is **one registration** —
constructing `MoveAnnouncer` with the service's existing `events`/`uiState` flow and
tearing it down in `onDestroy`. Any other change to that file is out of scope.

## Why

The phone sits on a stand above the board. Announcing each detected move out loud is the
cheapest possible confirmation that the tracker and reality agree — the user hears "Knight
f3" and knows, without looking at the screen, whether to intervene. It is also the only
accessible output the app has.

The failure mode to design against is noise: a tracker that talks over an alarm, or that
narrates a burst of corrections, is worse than a silent one.

## Design (decided — do not redesign)

### 1. Off by default

Persisted through 07a's `SettingsRepository` (keys `speechEnabled`, `speechLanguage`,
`speechVerbosity`, `speechAnnounceAlarms`). Do not create a second store. `speechEnabled`
defaults to **false**; `speechAnnounceAlarms` defaults to **true** but is only consulted
when speech is enabled at all.

### 2. `SpeechEngine`

```kotlin
class SpeechEngine(context: Context) : Closeable {
    val state: StateFlow<SpeechState>   // Uninitialised | Ready(locale) | LanguageMissing(locale) | Failed(reason)
    fun setLanguage(tag: String)        // BCP-47; falls back to Locale.US on MISSING_DATA / NOT_SUPPORTED
    fun say(text: String, flush: Boolean = false)
    override fun close()
}
```

- `TextToSpeech` is initialised lazily on the **first enabled** announcement, never at app
  start, and shut down when speech is disabled or the service dies.
- `AudioAttributes`: `USAGE_ASSISTANCE_ACCESSIBILITY`, `CONTENT_TYPE_SPEECH`.
- **Queue policy**: `QUEUE_ADD` for moves — a burst of two moves must both be heard in
  order; `QUEUE_FLUSH` only for the alarm announcement, which is the one thing allowed to
  interrupt.
- **Bounded queue**: at most 3 pending utterances. On overflow, drop the oldest *move*
  utterances and speak "…and <n> more moves" once. A recovery that commits four plies must
  not produce forty seconds of speech.
- `setLanguage` returning `LANG_MISSING_DATA` / `LANG_NOT_SUPPORTED` is surfaced as
  `LanguageMissing` in the settings UI (with the system TTS-data settings intent) and falls
  back to `Locale.US` rather than going silent.

### 3. Respect the device's silence

Speech is suppressed — the utterance is dropped, not queued — when any of:

- `AudioManager.ringerMode` is `RINGER_MODE_SILENT` or `RINGER_MODE_VIBRATE`;
- `NotificationManager.currentInterruptionFilter` is anything other than
  `INTERRUPTION_FILTER_ALL` (DND active) — no `ACCESS_NOTIFICATION_POLICY` permission is
  needed to *read* this;
- an audio focus request of type `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK` is denied.

Request transient-may-duck focus around each utterance and abandon it after; never hold
focus while idle.

### 4. Alarm interaction (binding)

`entry.md` invariant 9: the alarm freezes everything and is released only by explicit user
correction or a verified restore. Speech follows:

- While `alarm != null`, **no move is spoken** — not the pending candidate, not a queued
  backlog. Any queued move utterances are dropped at latch time.
- The alarm itself **is** announced, once per latch, with `QUEUE_FLUSH`:
  `"Position mismatch: <n> squares disagree"` plus, when `alarm.guessSan != null`,
  `"possible move <phrase(guessSan)>"`.
- `AlarmCleared` announces once: `"Position restored"`.
- Re-latching the same alarm kind without an intervening clear does **not** re-announce.

### 5. Verbosity

| Mode | "Nf3" | "exd5" | "O-O" | "e8=Q+" |
|---|---|---|---|---|
| `LETTERS` (SAN read out) | "N f 3" | "e takes d 5" | "castles kingside" | "e 8 promotes queen, check" |
| `WORDS` (default) | "Knight f3" | "e takes d5" | "castles kingside" | "e8 promotes to queen, check" |
| `WORDS_WITH_SIDE` | "White plays knight f3" | … | … | … |

Rules (reusable from the legacy string helper): strip trailing `+`/`#` and re-append
", check" / ", checkmate"; `O-O`/`0-0` → "castles kingside", `O-O-O`/`0-0-0` → "castles
queenside"; a leading uppercase letter is the piece name, otherwise "pawn"; `x` → "takes";
`=X` → "promotes to <piece>"; side derived from ply parity (1-based: odd = White).
Disambiguated SAN (`Nbd2`, `R1e2`, `Qh4xe1`) must speak the disambiguator ("knight b d2"),
not swallow it.

Language: the phrase builder is table-driven with a piece-name map per supported locale
(`en`, `de` at minimum — the user's locale). Falling back to English piece names in a
German utterance is acceptable and must not crash.

### 6. `MoveAnnouncer` — non-blocking, off the analyzer thread

```kotlin
class MoveAnnouncer(scope: CoroutineScope, engine: SpeechEngine, settings: SettingsRepository)
fun attach(events: Flow<TrackerEvent>)
```

- Collects on a dedicated coroutine on `Dispatchers.Default` inside the service scope.
  **Never** on the camera analyzer thread, the frame pipeline, or the ONNX observer thread.
- `TextToSpeech.speak` is called from that coroutine only; nothing on the frame path may
  ever touch `SpeechEngine`. A test asserts the announcer's collection thread is not the
  analyzer thread name.
- Event mapping: `MoveCommitted` → one utterance; `SequenceCommitted` → one utterance with
  both SANs joined by "and"; `Alarm` / `AlarmCleared` → §4; everything else (`Stuck`,
  `Note`, `ReAnchored`, `PromotionPending`) → silent.
- Speaks the SAN the engine committed. It never re-derives a move from the board.

## Steps

### 1. `MovePhrase` + tests — commit `feat(android-speech): SAN to spoken phrase — verbosity modes, castling, promotion, disambiguation`

### 2. `SpeechEngine` — commit `feat(android-speech): TextToSpeech lifecycle with bounded queue, audio focus and silent/DND suppression`

### 3. `MoveAnnouncer` + service registration — commit `feat(android-speech): announce committed moves off the analyzer thread; silent while alarmed`

### 4. `SpeechSettingsScreen` — commit `feat(android-ui): speech settings — on/off, language, verbosity, test utterance`

Run once:
`.\gradlew.bat :app:testDebugUnitTest --tests "com.chesslab.tracker.speech.*"`

## Tests

| Kotlin test | Guards |
|---|---|
| `phraseWordsMode` | "Nf3" → "Knight f3"; "exd5" → "e takes d5" |
| `phraseCastling` | both notations, both sides |
| `phraseCheckAndMate` | ", check" / ", checkmate" appended after the body |
| `phrasePromotion` | "e8=Q+" → "e8 promotes to queen, check" |
| `phraseDisambiguation` | "Nbd2" keeps the `b`; "R1e2" keeps the `1` |
| `phraseSideFromPlyParity` | ply 1 → White, ply 2 → Black (`WORDS_WITH_SIDE`) |
| `phraseUnknownLocaleFallsBackToEnglish` | no crash, English piece names |
| `speechIsOffByDefault` | default settings → `TextToSpeech` never constructed |
| `silentModeDropsUtterance` | fake `AudioManager` in `RINGER_MODE_SILENT` |
| `dndDropsUtterance` | interruption filter ≠ ALL |
| `deniedAudioFocusDropsUtterance` | |
| `queueIsBoundedToThree` | 10 rapid moves → 3 spoken + one "and 7 more moves" |
| `movesAreNotSpokenWhileAlarmed` | latch → queued moves dropped, no `speak` for moves |
| `alarmIsAnnouncedOnceWithFlush` | one `speak(FLUSH)` per latch; a re-latch of the same kind is silent |
| `alarmClearedIsAnnounced` | "Position restored" |
| `sequenceCommittedIsOneUtterance` | "…and…" joined, one `speak` call |
| `announcerDoesNotRunOnAnalyzerThread` | recorded thread name ≠ the analyzer's |
| `languageMissingFallsBackToUs` | `LANG_MISSING_DATA` → `Locale.US`, state surfaced |

## Acceptance criteria

- `grep -rn "QUEUE_FLUSH" android/app/src/main/kotlin/com/chesslab/tracker/speech/` hits
  only in the alarm path.
- `grep -rn "alarm" .../speech/MoveAnnouncer.kt` shows the move-suppression branch.
- `grep -rn "RINGER_MODE_SILENT\|INTERRUPTION_FILTER" .../speech/SpeechEngine.kt` hits both.
- `grep -rn "speechEnabled" .../speech/` reads the shared `SettingsRepository`, default `false`.
- `git diff --stat android/app/src/main/kotlin/com/chesslab/tracker/service/TrackerService.kt`
  shows only the announcer registration/teardown.
- `grep -rn "TextToSpeech" android/app/src/main/kotlin/com/chesslab/tracker/ | grep -v "/speech/"`
  returns **nothing** — TTS is confined to this package.
- All 18 tests green; `:app:ktlintFormat` then `:app:detekt` clean.
- `STATUS.md` row 08c `done`.

## Do NOT

- Do NOT default speech on.
- Do NOT speak moves while the alarm is latched; the alarm announcement is the only
  exception, and it is the only utterance allowed to flush the queue.
- Do NOT call `TextToSpeech` from the analyzer thread, the frame pipeline, or the ONNX
  observer thread, and do NOT block any of them waiting for speech.
- Do NOT speak while the device is silent, on vibrate, or in DND.
- Do NOT hold audio focus between utterances.
- Do NOT let the queue grow without bound during a multi-ply recovery.
- Do NOT re-derive moves from the board — announce what the engine committed.
- Do NOT edit `ui/Nav.kt`, `ui/settings/SettingsScreen.kt`, `AndroidManifest.xml`,
  `games/**`, `record/**`, `spectate/**`, or `android/app/build.gradle.kts`.
- Do NOT change anything in `service/TrackerService.kt` beyond the registration line.
