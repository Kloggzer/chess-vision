# Phase 00 — One handle registry

## Why

The app has **six byte-identical global objects** whose entire content is "a nullable handle a
screen picks up once the service binds":

| object | file | published from |
|---|---|---|
| `SettingsHost` | `app/.../settings/SettingsRepository.kt:107` | `TrackerService` |
| `TrackerSessionHost` | `app/.../ui/tracking/TrackerSession.kt:74` | `TrackerServiceBinding.kt:97` |
| `DebugSessionHost` | `app/.../ui/debug/DebugSession.kt:48` | `TrackerService` |
| `TrackerRestartHost` | `app/.../service/TrackerStack.kt:171` | `TrackerService` |
| `GameSessionHost` | `app/.../ui/games/GameSessionHost.kt:21` | `GameSessionWiring` |
| `CameraLookHost` | `app/.../ui/camera/CameraLookHost.kt:16` | `TrackerServiceBinding.kt:100` |

Each is:

```kotlin
object XHost {
    private val current = MutableStateFlow<X?>(null)
    val x: StateFlow<X?> = current
    fun publish(x: X?) { current.value = x }
}
```

Six copies is not a maintenance emergency; it is a **template that grows**, and it grew again on
this branch. `CameraLookHost` is the sixth, added hours after `torchOn`/`hasTorch`/`setTorchOn` were
added to `TrackerSession` (`TrackerSession.kt:43-53`) — two different answers to *"how does the
camera screen reach the bound service?"*, taken the same day. `CameraRoute` now collects **both**:
`CameraLookHost.port` (`CameraRoute.kt:83`) and `TrackerSessionHost.session` (`CameraRoute.kt:85`),
to render one screen.

The library that normally owns this is a DI container (Hilt/Koin). **The verdict is still no** — it
would add an annotation processor to `:app` for six eight-line objects, against a stack the project
deliberately keeps lean. The duplication is removable without any dependency at all.

## Design (decided — do not redesign)

### Step 1: one generic holder

New file `app/src/main/kotlin/com/chesslab/tracker/service/ServiceHandle.kt`:

```kotlin
/**
 * A handle the service publishes and screens pick up — null while nothing is bound.
 *
 * One class rather than six identical objects. It is a global on purpose: the publisher is a
 * foreground Service with a lifetime longer than any composition, and the alternative that would
 * remove the global (a DI graph) costs an annotation processor for eight lines of logic.
 *
 * Null is a rendered state, never a placeholder — every screen that reads one of these says "the
 * tracker service is not running yet" rather than showing dead controls.
 */
class ServiceHandle<T : Any> {
    private val current = MutableStateFlow<T?>(null)
    val flow: StateFlow<T?> = current.asStateFlow()
    fun publish(value: T?) { current.value = value }
}
```

The six objects become six `val`s. Keep them where they are — a handle belongs beside the type it
carries, and moving them all into one file would trade six small couplings for one big one:

```kotlin
// in SettingsRepository.kt, replacing object SettingsHost
val settingsHandle = ServiceHandle<SettingsRepository>()
```

Call sites go `SettingsHost.repository` → `settingsHandle.flow`, `SettingsHost.publish(x)` →
`settingsHandle.publish(x)`.

**Naming:** lowerCamelCase `val`s, not `object`s. That is the point — a reader who sees
`settingsHandle.flow` knows it is a handle; a reader who sees `SettingsHost.repository` has to open
the file to find out whether `Host` means "holder", "server" or "hosting environment".

### Step 2: `CameraLookHost` is deleted, not converted

The camera screen already holds a `TrackerSession`. Add one member to that interface, beside the
torch members added on this branch:

```kotlin
// TrackerSession.kt, next to torchOn / hasTorch / setTorchOn
/** The camera's picture controls — see `CameraLookPort`. */
val cameraLook: CameraLookPort
```

`BinderSession` (`TrackerServiceBinding.kt:44`) delegates it to `binder.cameraLook`, exactly as it
already delegates `torchOn`. `NoTrackerSession` (`TrackerSession.kt:119`) needs an inert
implementation — a `CameraLookPort` whose `look` and `abilities` are `MutableStateFlow(CameraLook())`
/ `MutableStateFlow(null)` and whose `setLook` is `Unit`. Put it beside `NoTrackerSession`.

`CameraRoute.kt:83` then drops to one collection:

```kotlin
val session by trackerSessionHandle.flow.collectAsStateWithLifecycle()
val bound = session ?: return CameraUnbound(onBack)
val viewModel = remember(bound, settings) { CameraViewModel(bound.cameraLook, settings) }
```

Delete `CameraLookHost.kt` and its publish call at `TrackerServiceBinding.kt:100`.

### Step 3: leave the other three alone, and say so

Three objects are **not** part of this family and must not be swept in:

- `AnalysisSettingsHost` (`analysis/AnalysisSettingsHost.kt:17`) holds a **value**, not a handle —
  non-null, `update` not `publish`, no service lifetime. Different thing.
- `RecordingSettingsHost` (`ui/games/GameSessionHost.kt:35`) and `SpectatorHost`
  (`spectate/SpectatorController.kt:197`) are **lazy factories taking a `Context`**, a different
  shape again.

But note one real inconsistency while you are there: `RecordingSettingsHost.get` is `@Synchronized`
and `SpectatorHost.get` is not, so two threads calling `SpectatorHost.get` can each build a
`SpectatorController` with its own `CoroutineScope` and one silently wins. **Fix that one line**
(add `@Synchronized`) and say so in `STATUS.md`. Do not restructure either object.

## Steps

1. `ServiceHandle.kt` + convert the six, update every call site —
   commit `refactor(android): one handle type instead of six identical singletons`
2. `TrackerSession.cameraLook`, `NoTrackerSession`'s inert port, `CameraRoute` rewiring, delete
   `CameraLookHost.kt` — commit `refactor(android): the camera screen reads one handle, not two`
3. `@Synchronized` on `SpectatorHost.get` — commit `fix(android): SpectatorHost builds one controller`

## Tests

No new behaviour, so no new behavioural test. What must be proven is **reachability**, and the
existing suite does it: `SettingsNavTest`, `TrackingViewModelTest`, `CalibrationViewModelTest` and
`StatusPublisherTest` all run through the handles.

Add one test, `app/src/test/.../service/ServiceHandleTest.kt`:

1. `aFreshHandleIsNull` — `ServiceHandle<String>().flow.value == null`.
2. `publishingNullReleasesTheHandle` — publish a value, publish `null`, the flow is `null` again.
   This is the disconnect path (`onServiceDisconnected`, `TrackerServiceBinding.kt:104`) and it is
   the only behaviour of the class worth pinning.

```
gradlew.bat :app:ktlintFormat
gradlew.bat :app:testDebugUnitTest :app:ktlintCheck :app:detekt
```

## Acceptance criteria

- [ ] `grep -rn "object .*Host" android/app/src --include=*.kt` returns exactly **three**:
      `AnalysisSettingsHost`, `RecordingSettingsHost`, `SpectatorHost`.
- [ ] `grep -rn "CameraLookHost" android/` returns nothing outside `specs/`.
- [ ] `CameraRoute` collects one service handle, not two.
- [ ] `:app` unit tests green, ktlint and detekt clean, zero new findings.
- [ ] `STATUS.md` records the grep output that justified each deletion.

## Do NOT / Out of scope

- Do **not** add Hilt, Koin, or any DI library. See `entry.md`.
- Do **not** merge `AnalysisSettingsHost`, `RecordingSettingsHost` or `SpectatorHost` into
  `ServiceHandle`. They are different shapes and forcing them in is how the next template starts.
- Do **not** move the handles into one central file. They live beside their types.
- Do **not** change what any screen does when a handle is null. That text is deliberate.
- Do **not** touch `TrackerBinder`'s interface delegation (`TrackerControls by controls`,
  `TorchControl by torch`). That is a separate question and it is not wrong.
